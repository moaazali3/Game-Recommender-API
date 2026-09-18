using Game_Recommender_API.Data;
using Game_Recommender_API.Models;
using Game_Recommender_API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.VisualBasic;
using System.Net.WebSockets;

namespace Game_Recommender_API.Controllers
{
    public static class SeedingStatusTracker
    {
        public static bool IsRunning { get; set; } = false;
        public static int CurrentPage { get; set; } = 0;
        public static int ProcessedInPage { get; set; } = 0;
        public static int AddedInPage { get; set; } = 0;
        public static string CurrentGameName { get; set; } = string.Empty;
        public static string CurrentAppId { get; set; } = string.Empty;
        public static DateTime LastActivity { get; set; } = DateTime.Now;
        public static List<string> RecentLogs { get; set; } = new();

        public static void AddLog(string log)
        {
            lock (RecentLogs)
            {
                RecentLogs.Insert(0, $"[{DateTime.Now:HH:mm:ss}] {log}");
                if (RecentLogs.Count > 40) RecentLogs.RemoveAt(RecentLogs.Count - 1);
            }
        }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationsController : ControllerBase
    {
        private readonly SteamReviewService _steamService;
        private readonly TextAnalyzerService _textAnalyzer;
        private readonly AppDbContext _dbContext;
        private readonly MlRecommendationService _mlService;

        public RecommendationsController(
            SteamReviewService steamService,
            TextAnalyzerService textAnalyzer,
            AppDbContext appDbContext,
            MlRecommendationService mlService)
        {
            _steamService = steamService;
            _textAnalyzer = textAnalyzer;
            _dbContext = appDbContext;
            _mlService = mlService;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetLiveStats()
        {
            var totalGames = await _dbContext.Games.CountAsync();
            var latestGames = await _dbContext.Games
                .OrderByDescending(g => g.LastUpdated)
                .Take(12)
                .Select(g => new
                {
                    g.Appid,
                    g.Name,
                    g.Tags,
                    g.keywords,
                    g.LastUpdated
                })
                .ToListAsync();

            return Ok(new
            {
                TotalGamesInDatabase = totalGames,
                IsSeedingRunning = SeedingStatusTracker.IsRunning,
                CurrentPage = SeedingStatusTracker.CurrentPage,
                CurrentGame = SeedingStatusTracker.CurrentGameName,
                CurrentAppId = SeedingStatusTracker.CurrentAppId,
                ProcessedInCurrentPage = SeedingStatusTracker.ProcessedInPage,
                AddedInCurrentPage = SeedingStatusTracker.AddedInPage,
                LastActivity = SeedingStatusTracker.LastActivity,
                RecentLogs = SeedingStatusTracker.RecentLogs,
                LatestSavedGames = latestGames
            });
        }

        [HttpGet("warmup")]
        public IActionResult WarmupMlSpace()
        {
            // Trigger ML Space wake-up in background with 30s timeout without blocking client
            _ = Task.Run(async () =>
            {
                await _mlService.WarmUpAsync();
            });

            return Ok(new { status = "warmup_initiated" });
        }

        [HttpGet("{appId}/style")]
        public async Task<IActionResult> GetGameStyle(string appId)
        {
            // 1. نجيب المراجعات
            var reviews = await _steamService.GetGameReviewsAsync(appId);

            // 2. نستخرج الكلمات المفتاحية (الستايل)
            var styleKeywords = _textAnalyzer.ExtractTopKeywords(reviews, topCount: 15);

            return Ok(new
            {
                AppId = appId,
                TotalReviewsAnalyzed = reviews.Count,
                StyleTags = styleKeywords
            });
        }

        [HttpPost("seed")]
        public async Task<IActionResult> getgamesinfo([FromQuery] int page = 0)
        {
            SeedingStatusTracker.IsRunning = true;
            SeedingStatusTracker.CurrentPage = page;
            SeedingStatusTracker.ProcessedInPage = 0;
            SeedingStatusTracker.AddedInPage = 0;
            SeedingStatusTracker.LastActivity = DateTime.Now;
            SeedingStatusTracker.AddLog($"بدء سحب الصفحة {page} من متجر Steam...");

            Console.WriteLine($"[SEED START] بدء عملية سحب الألعاب وتحليلها للصفحة {page}...");
            var result = await _steamService.Gettop1000game(page);
            int currentIndex = 0;
            int addedInBatch = 0;
            int totalNewAdded = 0;
            int totalGames = result.Count;

            // جلب الألعاب الموجودة مسبقاً في الذاكرة لتسريع الفحص بدون 1000 كويري منفصلة
            var existingAppIds = await _dbContext.Games.Select(g => g.Appid).ToHashSetAsync();

            foreach (var game in result)
            {
                currentIndex++;
                string currappid = game.Key;
                string currappname = game.Value;

                SeedingStatusTracker.ProcessedInPage = currentIndex;
                SeedingStatusTracker.CurrentGameName = currappname;
                SeedingStatusTracker.CurrentAppId = currappid;
                SeedingStatusTracker.LastActivity = DateTime.Now;

                if (existingAppIds.Contains(currappid))
                {
                    continue;
                }

                Console.WriteLine($"[PROCESSING] ({currentIndex}/{totalGames}) جاري سحب وتحليل: {currappname} (ID: {currappid})...");
                SeedingStatusTracker.AddLog($"تحليل مراجعات و Tags: {currappname} (ID: {currappid})");

                var review = await _steamService.GetGameReviewsAsync(currappid);
                if (review == null || review.Count == 0)
                {
                    continue;
                }

                var keywordslist = _textAnalyzer.ExtractTopKeywords(review, 15);
                string keywordstring = string.Join(",", keywordslist);

                var tagsList = await _steamService.GetTagsForGame(currappid);
                string tagstring = string.Join(",", tagsList);

                var newgame = new Models.Game
                {
                    Appid = currappid,
                    Name = currappname,
                    keywords = keywordstring,
                    Tags = tagstring,
                    LastUpdated = DateTime.Now
                };

                _dbContext.Games.Add(newgame);
                existingAppIds.Add(currappid);
                addedInBatch++;
                totalNewAdded++;
                SeedingStatusTracker.AddedInPage = totalNewAdded;

                // حفظ الدفعة في الداتابيز كل 25 لعبة لحماية التقدم بسرعة
                if (addedInBatch >= 25)
                {
                    await _dbContext.SaveChangesAsync();
                    SeedingStatusTracker.AddLog($"✅ تم حفظ دفعة 25 لعبة في قاعدة البيانات! (إجمالي الصفحة: {totalNewAdded})");
                    Console.WriteLine($"[BATCH SAVED] ✅ تم حفظ دفعة من {addedInBatch} لعبة في قاعدة البيانات! (إجمالي المضاف بالصفحة {page}: {totalNewAdded})");
                    addedInBatch = 0;
                }

                await Task.Delay(400);
            }

            if (addedInBatch > 0)
            {
                await _dbContext.SaveChangesAsync();
                Console.WriteLine($"[FINAL SAVED] ✅ تم حفظ آخر {addedInBatch} لعبة بنجاح!");
            }

            SeedingStatusTracker.IsRunning = false;
            SeedingStatusTracker.AddLog($"🎉 اكتملت الصفحة {page} بنجاح! تم إضافة {totalNewAdded} لعبة جديدة.");
            Console.WriteLine($"[SEED COMPLETE] انتهت الصفحة {page} بنجاح. تم إضافة {totalNewAdded} لعبة جديدة إلى قاعدة البيانات.");
            return Ok(new
            {
                Message = $"تم سحب وتحليل الصفحة {page} بنجاح!",
                Page = page,
                TotalNewAdded = totalNewAdded,
                TotalProcessed = currentIndex
            });
        }
        [HttpPost("add-game/{appid}")]
        public async Task<IActionResult> addgame(string appid)
        {
            var game = await _steamService.Getgame(appid);
            if (game == null)
            {
                return NotFound(new { message = "Game not found" });
            }

            var review = await _steamService.GetGameReviewsAsync(appid);
            if (review == null || review.Count == 0)
            {
                return NotFound(new { message = "مش موجوده" });
            }

            var keywordslist = _textAnalyzer.ExtractTopKeywords(review, 15);
            string keywordstring = string.Join(",", keywordslist);

            var newgame = new Models.Game
            {
                Appid = appid,
                Name = game.name,
                keywords = keywordstring,
                LastUpdated = DateTime.Now
            };

            _dbContext.Games.Add(newgame);
            await _dbContext.SaveChangesAsync();
            return Ok(newgame);
    
         }
        [HttpPost("series-patch/{name}")]
        public async Task<IActionResult> addseriesid(string name)
        {
            var steamgame = await _dbContext.Games
                .FirstOrDefaultAsync(g => g.Name != null && g.Name.ToLower() == name.ToLower());

            if (steamgame == null)
            {
                return NotFound(new { message = "اللعبة دي مش موجودة في جدول ستيم الأساسي" });
            }

            var seriesgame = await _dbContext.SeriesGames
                .FirstOrDefaultAsync(g => g.Title != null && g.Title.ToLower() == name.ToLower());

            if (seriesgame == null)
            {
                return NotFound(new { message = "اللعبة دي مش موجودة في جدول السلاسل" });
            }

            seriesgame.SteamId = steamgame.Appid;
            await _dbContext.SaveChangesAsync();
            return Ok(seriesgame);
}
        [HttpPost("series-allpatch")]
        public async Task<IActionResult> addseriesidall()
        {
            var seriesgames = await _dbContext.SeriesGames.ToListAsync();
            int updatedCount = 0;
            foreach (var game in seriesgames)
            {
                if (string.IsNullOrEmpty(game.SteamId))
                {
                    if (string.IsNullOrEmpty(game.Title))
                        continue;

                    var steamGame = await _dbContext.Games
                        .FirstOrDefaultAsync(g => g.Name != null && g.Name.ToLower() == game.Title.ToLower());

                    if (steamGame == null)
                        continue;

                    game.SteamId = steamGame.Appid;
                    updatedCount++;
                }
            }

            await _dbContext.SaveChangesAsync();
            return Ok(new
            {
                Message = "تم الانتهاء من فحص وتحديث السلاسل",
                TotalUpdated = updatedCount
            });
        }
        [HttpGet("feedback")]
        public async Task<IActionResult> GetFeedbacks()
        {
            var feedbacks = await _dbContext.Feedbacks
                .OrderByDescending(f => f.dateTime)
                .Take(50)
                .ToListAsync();
            return Ok(feedbacks);
        }
        [HttpPost("feedback")]
        public async Task<IActionResult> addfeedback([FromBody] FeedbackInputDto input)
        {
            if (input == null)
            {
                return BadRequest(new { message = "Invalid input" });
            }

            var newinput = new Models.Feedback
            {
                Description = input.Message ?? string.Empty,
                Rating = input.Rating ?? 0,
                dateTime = DateTime.Now
            };

            _dbContext.Feedbacks.Add(newinput);
            await _dbContext.SaveChangesAsync();
            return Ok(newinput);
        }
        private static readonly Dictionary<string, string> GameAliases = new(StringComparer.OrdinalIgnoreCase)
        {
            { "gta", "Grand Theft Auto" },
            { "gta v", "Grand Theft Auto V" },
            { "gta 5", "Grand Theft Auto V" },
            { "gta iv", "Grand Theft Auto IV" },
            { "gta 4", "Grand Theft Auto IV" },
            { "gta sa", "Grand Theft Auto: San Andreas" },
            { "rdr", "Red Dead Redemption" },
            { "rdr2", "Red Dead Redemption 2" },
            { "rdr 2", "Red Dead Redemption 2" },
            { "gow", "God of War" },
            { "ds1", "Dark Souls" },
            { "ds2", "Dark Souls II" },
            { "ds3", "Dark Souls III" },
            { "re", "Resident Evil" },
            { "re2", "Resident Evil 2" },
            { "re3", "Resident Evil 3" },
            { "re4", "Resident Evil 4" },
            { "re7", "Resident Evil 7" },
            { "re8", "Resident Evil Village" },
            { "ac", "Assassin's Creed" },
            { "cod", "Call of Duty" },
            { "dmc", "Devil May Cry" },
            { "mgs", "Metal Gear Solid" },
            { "cp2077", "Cyberpunk 2077" },
            { "cyberpunk", "Cyberpunk 2077" },
            { "csgo", "Counter-Strike" },
            { "cs2", "Counter-Strike 2" },
            { "tf2", "Team Fortress 2" },
            { "botw", "Zelda" },
            { "totk", "Zelda" },
            { "ff", "Final Fantasy" },
            { "ff7", "Final Fantasy VII" },
            { "ff14", "Final Fantasy XIV" },
            { "ff15", "Final Fantasy XV" },
            { "ff16", "Final Fantasy XVI" },
            { "tes", "The Elder Scrolls" },
            { "tesv", "Skyrim" },
            { "skyrim", "The Elder Scrolls V: Skyrim" },
            { "fallout nv", "Fallout: New Vegas" },
            { "fonv", "Fallout: New Vegas" },
            { "fo4", "Fallout 4" },
            { "bg3", "Baldur's Gate 3" },
            { "hl", "Half-Life" },
            { "hl2", "Half-Life 2" },
            { "er", "Elden Ring" }
        };

        [HttpGet("autocomplete")]
        public async Task<IActionResult> Autocomplete([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 1)
            {
                return Ok(new List<object>());
            }

            string cleanQ = q.Trim();
            string expandedQ = GameAliases.TryGetValue(cleanQ, out var aliasTarget) ? aliasTarget : cleanQ;

            var nsfwTags = new List<string> { "nsfw", "sexual content", "hentai"};

            try
            {
                var allMatches = await _dbContext.Games
                    .Where(g => g.Name != null && (EF.Functions.Like(g.Name, $"%{cleanQ}%") || EF.Functions.Like(g.Name, $"%{expandedQ}%")))
                    .Take(25)
                    .ToListAsync();
                
                var suggestions = allMatches
                    .Where(g => string.IsNullOrEmpty(g.Tags) || !nsfwTags.Any(badTag => g.Tags.ToLower().Contains(badTag)))
                    .Select(g => new { appid = g.Appid, name = g.Name })
                    .Take(7)
                    .ToList();

                return Ok(suggestions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Error = ex.Message, Inner = ex.InnerException?.Message, StackTrace = ex.StackTrace });
            }
        }
        [HttpGet("all")]
        public async Task<IActionResult> GetAllGames()
        {
            var games = await _dbContext.Games
                .Select(g => new { g.Appid, g.Name })
                .ToListAsync();

            return Ok(new
            {
                TotalSavedGames = games.Count,
                Games = games
            });
        }
        [HttpGet("{appid}/recommendations")]
        public async Task<IActionResult> getrecommedations(string appid, [FromQuery] string? engine = null)
        {
            string cleanAppId = appid.Trim();
            string expandedName = GameAliases.TryGetValue(cleanAppId, out var aliasTarget) ? aliasTarget : cleanAppId;

            var targetgame = await _dbContext.Games.FirstOrDefaultAsync(g => 
                g.Appid == cleanAppId || 
                (g.Name != null && (g.Name.ToLower() == cleanAppId.ToLower() || g.Name.ToLower() == expandedName.ToLower() || g.Name.ToLower().Contains(cleanAppId.ToLower()) || g.Name.ToLower().Contains(expandedName.ToLower()))));
            
            if (targetgame == null)
                return NotFound(new { message = "مش موجوده" });

            var HasSeries = await _dbContext.SeriesGames.AnyAsync(s => s.SteamId == targetgame.Appid);

            var targetseriesid = await _dbContext.SeriesGames
                     .Where(s => s.SteamId == targetgame.Appid)
                     .Select(s => s.SeriesId)
                     .FirstOrDefaultAsync();

            // 1. Try Machine Learning model if not explicitly forced to 'classic'
            if (!string.Equals(engine, "classic", StringComparison.OrdinalIgnoreCase))
            {
                var mlRecommendations = await _mlService.GetRecommendationsAsync(targetgame.Appid, 10);
                if (mlRecommendations != null && mlRecommendations.Count > 0)
                {
                    return Ok(new
                    {
                        TargetGame = targetgame.Name,
                        TargetAppId = targetgame.Appid,
                        Source = "machine_learning",
                        Recommendations = mlRecommendations,
                        HasSeries = HasSeries,
                        SeriesId = targetseriesid
                    });
                }
            }

            // 2. Fallback to heuristic tag & keyword matching
            var targetKeywords = targetgame.keywords != null ? targetgame.keywords.Split(',') : new string[0];
            var targetTags = targetgame.Tags != null ? targetgame.Tags.Split(',') : new string[0];
            var matureTags = new List<string> { "nudity", "sexual content" };

            var allother = await _dbContext.Games.Where(g => g.Appid != targetgame.Appid).ToListAsync();

            allother = allother.Where(g =>
            {
                if (string.IsNullOrEmpty(g.Tags)) return true;
                var gameTagsList = g.Tags.ToLower().Split(',').Select(t => t.Trim()).ToList();
                var hardBannedTags = new List<string> { "hentai", "nsfw", "adult only" };
                var mainstreamTags = new List<string> { "rpg", "action", "adventure", "shooter", "open world", "strategy", "sports", "story rich", "simulation" };

                if (gameTagsList.Any(tag => hardBannedTags.Contains(tag)))
                    return false;

                bool hasMatureContent = gameTagsList.Any(tag => matureTags.Contains(tag));
                if (hasMatureContent)
                {
                    bool hasMainstreamContent = gameTagsList.Any(tag => mainstreamTags.Contains(tag));
                    if (!hasMainstreamContent)
                        return false;
                }
                return true;
            }).ToList();

            var top10Games = allother.Select(game =>
            {
                var gameKeywords = game.keywords != null ? game.keywords.Split(',') : new string[0];
                var gameTags = game.Tags != null ? game.Tags.Split(',') : new string[0];
                bool isMatureContent = gameTags.Any(tag => matureTags.Contains(tag.ToLower().Trim()));

                int keywordMatchCount = gameKeywords.Intersect(targetKeywords, StringComparer.OrdinalIgnoreCase).Count();
                int tagMatchCount = gameTags.Intersect(targetTags, StringComparer.OrdinalIgnoreCase).Count();
                int finalScore = keywordMatchCount + (tagMatchCount * 5);

                return new
                {
                    Appid = game.Appid,
                    Name = game.Name,
                    matchscore = finalScore,
                    Sharedkeywords = gameKeywords.Intersect(targetKeywords, StringComparer.OrdinalIgnoreCase),
                    Tags = gameTags,
                    IsMature = isMatureContent
                };
            })
            .Where(x => x.matchscore > 0)
            .OrderByDescending(x => x.matchscore)
            .Take(10)
            .ToList();

            var top10AppIds = top10Games.Select(g => g.Appid).ToList();
            var seriesData = await _dbContext.SeriesGames
                    .Where(s => s.SteamId != null && top10AppIds.Contains(s.SteamId))
                    .ToDictionaryAsync(s => s.SteamId!, s => s.SeriesId);

            var recommend = top10Games.Select(game => new
            {
                Appid = game.Appid,
                Name = game.Name,
                matchscore = game.matchscore,
                Sharedkeywords = game.Sharedkeywords,
                Tags = game.Tags,
                IsMature = game.IsMature,
                hasseries = seriesData.ContainsKey(game.Appid),
                seriesid = seriesData.ContainsKey(game.Appid) ? seriesData[game.Appid] : (int?)null
            }).ToList();

            return Ok(new
            {
                TargetGame = targetgame.Name,
                TargetAppId = targetgame.Appid,
                Source = "heuristic",
                Recommendations = recommend,
                HasSeries = HasSeries,
                SeriesId = targetseriesid
            });
        }

        [HttpPost("blend")]
        public async Task<IActionResult> BlendRecommendations([FromBody] BlendRequestDto request)
        {
            if (request == null || request.Games == null || request.Games.Count == 0)
            {
                return BadRequest(new { message = "يجب تحديد لعبة واحدة على الأقل لخلط الترشيحات." });
            }

            var targetGames = new List<Models.Game>();
            foreach (var gameInput in request.Games.Take(4))
            {
                string clean = gameInput.Trim();
                string expanded = GameAliases.TryGetValue(clean, out var aliased) ? aliased : clean;

                var g = await _dbContext.Games.FirstOrDefaultAsync(x =>
                    x.Appid == clean ||
                    (x.Name != null && (x.Name.ToLower() == clean.ToLower() || x.Name.ToLower() == expanded.ToLower() || x.Name.ToLower().Contains(clean.ToLower()) || x.Name.ToLower().Contains(expanded.ToLower()))));

                if (g != null && !targetGames.Any(existing => existing.Appid == g.Appid))
                {
                    targetGames.Add(g);
                }
            }

            if (targetGames.Count == 0)
            {
                return NotFound(new { message = "لم يتم العثور على أي من الألعاب المحددة في قاعدة البيانات." });
            }

            var targetAppIds = targetGames.Select(g => g.Appid).ToHashSet();
            var allKeywords = targetGames
                .SelectMany(g => (g.keywords ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries).Select(k => k.Trim()))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var allTags = targetGames
                .SelectMany(g => (g.Tags ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries).Select(t => t.Trim()))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var matureTags = new List<string> { "nudity", "sexual content" };
            var hardBannedTags = new List<string> { "hentai", "nsfw", "adult only" };
            var mainstreamTags = new List<string> { "rpg", "action", "adventure", "shooter", "open world", "strategy", "sports", "story rich", "simulation" };

            var candidates = await _dbContext.Games
                .Where(g => !targetAppIds.Contains(g.Appid))
                .ToListAsync();

            var filteredCandidates = candidates.Where(g =>
            {
                if (string.IsNullOrEmpty(g.Tags)) return true;
                var gameTagsList = g.Tags.ToLower().Split(',').Select(t => t.Trim()).ToList();
                if (gameTagsList.Any(tag => hardBannedTags.Contains(tag))) return false;

                bool hasMature = gameTagsList.Any(tag => matureTags.Contains(tag));
                if (hasMature && !gameTagsList.Any(tag => mainstreamTags.Contains(tag))) return false;

                return true;
            }).ToList();

            var top12Blended = filteredCandidates.Select(game =>
            {
                var gameKeywords = (game.keywords ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries).Select(k => k.Trim()).ToList();
                var gameTags = (game.Tags ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries).Select(t => t.Trim()).ToList();
                bool isMature = gameTags.Any(tag => matureTags.Contains(tag.ToLower()));

                int keywordMatches = gameKeywords.Intersect(allKeywords, StringComparer.OrdinalIgnoreCase).Count();
                int tagMatches = gameTags.Intersect(allTags, StringComparer.OrdinalIgnoreCase).Count();

                int crossGameMatches = targetGames.Count(tg =>
                {
                    var tgKw = (tg.keywords ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries);
                    var tgTg = (tg.Tags ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries);
                    return gameKeywords.Intersect(tgKw, StringComparer.OrdinalIgnoreCase).Any() ||
                           gameTags.Intersect(tgTg, StringComparer.OrdinalIgnoreCase).Any();
                });

                int finalScore = keywordMatches + (tagMatches * 5) + (crossGameMatches * 15);

                return new
                {
                    Appid = game.Appid,
                    Name = game.Name,
                    matchscore = finalScore,
                    Sharedkeywords = gameKeywords.Intersect(allKeywords, StringComparer.OrdinalIgnoreCase),
                    Tags = gameTags,
                    IsMature = isMature,
                    CrossGameMatches = crossGameMatches
                };
            })
            .Where(x => x.matchscore > 0)
            .OrderByDescending(x => x.matchscore)
            .Take(12)
            .ToList();

            var topAppIds = top12Blended.Select(g => g.Appid).ToList();
            var seriesData = await _dbContext.SeriesGames
                .Where(s => s.SteamId != null && topAppIds.Contains(s.SteamId))
                .ToDictionaryAsync(s => s.SteamId!, s => s.SeriesId);

            var recommend = top12Blended.Select(game => new
            {
                Appid = game.Appid,
                Name = game.Name,
                matchscore = game.matchscore,
                Sharedkeywords = game.Sharedkeywords,
                Tags = game.Tags,
                IsMature = game.IsMature,
                hasseries = seriesData.ContainsKey(game.Appid),
                seriesid = seriesData.ContainsKey(game.Appid) ? seriesData[game.Appid] : (int?)null
            }).ToList();

            return Ok(new
            {
                TargetGames = targetGames.Select(g => new { Appid = g.Appid, Name = g.Name }).ToList(),
                Recommendations = recommend
            });
        }

        [HttpPost("patch-existing-tags")]
        public async Task<IActionResult> PatchTags() 
        {
            var gameneed = await _dbContext.Games.Where(g => string.IsNullOrEmpty(g.Tags)).ToListAsync();
            foreach (var game in gameneed) 
            {
                var fetchedTags = await _steamService.GetTagsForGame(game.Appid);
                game.Tags = string.Join(",", fetchedTags);
                _dbContext.Update(game);
                await Task.Delay(1000);
            }
            await _dbContext.SaveChangesAsync();
            return Ok(new { message = $"Successfully updated {gameneed.Count} games with Tags!" });
        }
    }
}