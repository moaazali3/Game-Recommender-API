using Game_Recommender_API.Data;
using Game_Recommender_API.Models;
using Game_Recommender_API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Net.WebSockets;

namespace Game_Recommender_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationsController : ControllerBase
    {
        private readonly SteamReviewService _steamService;
        private readonly TextAnalyzerService _textAnalyzer;
        private readonly AppDbContext _dbContext;

        // عملنا Inject للخدمتين
        public RecommendationsController(SteamReviewService steamService, TextAnalyzerService textAnalyzer, AppDbContext appDbContext)
        {
            _steamService = steamService;
            _textAnalyzer = textAnalyzer;
            _dbContext = appDbContext;
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
        public async Task<IActionResult> getgamesinfo()
        {
            var result = await _steamService.Gettop1000game();
            int currentIndex = 1;
            int totalGames = result.Count;
            foreach (var game in result)
            {
                string currappid = game.Key;
                string currappname = game.Value;
                Console.WriteLine($" جاري المعالجة ({currentIndex}/{totalGames}): {currappname}...");
                if (_dbContext.Games.Any(g => g.Appid == currappid))
                {
                    continue;
                }
                var review = await _steamService.GetGameReviewsAsync(currappid);

                if (review == null || review.Count == 0)
                {
                    continue;
                }
                var keywordslist = _textAnalyzer.ExtractTopKeywords(review, 15);
                string keywordstring = string.Join(",", keywordslist);

                var newgame = new Models.Game
                {
                    Appid = currappid,
                    Name = currappname,
                    keywords = keywordstring,
                    LastUpdated = DateTime.Now,


                };
                _dbContext.Games.Add(newgame);
                currentIndex++;
                await Task.Delay(2000);

            }
            await _dbContext.SaveChangesAsync();
            return Ok("تم سحب الألعاب وتحليلها وحفظها في قاعدة البيانات بنجاح!");
        }
        [HttpPost("add-game/{appid}")]
        public async Task<IActionResult> addgame(string appid)
        {
            var game = await _steamService.Getgame(appid);
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
        [HttpPost("feedback")]
        public async Task<IActionResult> addfeedback([FromBody] FeedbackInputDto input)
        {

            var newinput = new Models.Feedback
            {
                Description = input.Message,
                Rating = input.Rating ?? 0,
                dateTime= DateTime.Now

            };
            _dbContext.Feedbacks.Add(newinput);
            await _dbContext.SaveChangesAsync();
            return Ok(newinput);

        }
        [HttpGet("autocomplete")]
        public async Task<IActionResult> Autocomplete([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            {
                return Ok(new List<object>());
            }

            var nsfwTags = new List<string> { "nsfw", "sexual content", "hentai"};

            
            var allMatches = await _dbContext.Games
                .Where(g => g.Name != null && g.Name.ToLower().Contains(q.ToLower()))
                .Take(20)
                .ToListAsync();

            
            var suggestions = allMatches
                .Where(g => string.IsNullOrEmpty(g.Tags) || !nsfwTags.Any(badTag => g.Tags.ToLower().Contains(badTag)))
                .Select(g => new { appid = g.Appid, name = g.Name })
                .Take(5)
                .ToList();

            return Ok(suggestions);
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
        public async Task<IActionResult> getrecommedations(string appid) 
        {
            var targetgame = await _dbContext.Games.FirstOrDefaultAsync(g =>
      g.Appid == appid || g.Name.ToLower().Contains(appid.ToLower()));
            if (targetgame == null)
               return NotFound(new { message = "مش موجوده" });
            var targetKeywords = targetgame.keywords != null ? targetgame.keywords.Split(',') : new string[0];
            var targetTags = targetgame.Tags != null ? targetgame.Tags.Split(',') : new string[0];
            var matureTags = new List<string> { "nudity", "sexual content" };
            var allother = await _dbContext.Games.Where(g => g.Appid != targetgame.Appid).ToListAsync();

            // تطبيق الفلتر الذكي
            allother = allother.Where(g =>
            {
                
                if (string.IsNullOrEmpty(g.Tags)) return true;
                var gameTagsList = g.Tags.ToLower().Split(',').Select(t => t.Trim()).ToList();
                var hardBannedTags = new List<string> { "hentai", "nsfw", "adult only" };
                var matureTags = new List<string> { "nudity", "sexual content" };
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

            var recommend = allother.Select(game =>
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
            return Ok(new
            {
                TargetGame = targetgame.Name,
                TargetAppId = targetgame.Appid,
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