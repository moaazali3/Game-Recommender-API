using Game_Recommender_API.Data;
using Game_Recommender_API.Models;
using Game_Recommender_API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic;
using System.Text;
using System.Text.Json;

namespace Game_Recommender_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SeriesController : Controller
    { private readonly GameApiService _gameApiService;
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        public SeriesController(GameApiService gameApiService, AppDbContext context, IConfiguration configuration)
        {
            _gameApiService = gameApiService;
            _context = context;
            _configuration = configuration;
        }
        [HttpPost("fix-timeline-with-ai/{seriesId}")]
        public async Task<IActionResult> FixTimelineWithAi([FromRoute] int seriesId)
        {
            var series = await _context.Series
                .Include(s => s.Games)
                .FirstOrDefaultAsync(s => s.Id == seriesId);

            if (series == null) return NotFound("السلسلة مش موجودة");

            var gamesListForAi = series.Games.Select(g => new { g.Id, g.Title }).ToList();
            var jsonGamesList = JsonSerializer.Serialize(gamesListForAi);

            string prompt = $@"
        I have a list of video games from the '{series.Name}' franchise. 
        Some are official, and some are fan-made, unreleased, or junk data.
        
        Please review this JSON list of games:
        {jsonGamesList}
        
        Your task is to:
        1. Identify junk, unreleased, or fan-made games (set IsJunk to true).
        2. Identify the official games and major expansions (set IsJunk to false).
        3. For the official games, determine if they are mainline titles (set IsMainline to true or false).
        4. For the official games, assign a ChronologicalOrder based on the STORY timeline (1 being the earliest event in the story).
        
        You must ONLY reply with a valid JSON array matching this exact structure:
        [
            {{ ""Id"": 1, ""ChronologicalOrder"": 1, ""IsMainline"": true, ""IsJunk"": false }}
        ]
        Do not include markdown tags like ```json, just the raw JSON array.
    ";

            // 4. نكلم الـ AI باستخدام Groq (البديل المجاني والسريع)
            using var client = new HttpClient();
            var groqKey = _configuration["ApiKeys:GroqApi"] ?? throw new ArgumentNullException("GroqApi key is missing.");
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {groqKey}"); // حط المفتاح الجديد هنا

            var requestBody = new
            {
                model = "llama-3.1-8b-instant", // موديل ذكي جداً ومجاني من Groq
                messages = new[] { new { role = "user", content = prompt } },
                temperature = 0.1 // عشان نخليه دقيق جداً وميألفش
            };

            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            // التعديل هنا: غيرنا لينك OpenAI بلينك Groq
            var response = await client.PostAsync("https://api.groq.com/openai/v1/chat/completions", content);

            if (!response.IsSuccessStatusCode)
            {
                var errorDetails = await response.Content.ReadAsStringAsync();
                return BadRequest($"فشل الاتصال بـ Groq. تفاصيل الخطأ: {errorDetails}");
            }
            var responseString = await response.Content.ReadAsStringAsync();
            var aiResult = JsonDocument.Parse(responseString);
            var aiJsonText = aiResult.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();

            var updates = JsonSerializer.Deserialize<List<AiGameUpdateDto>>(aiJsonText);

            if (updates == null || !updates.Any()) return BadRequest("الـ AI مرجعش داتا صحيحة");

            int deletedCount = 0;
            int updatedCount = 0;

            // 7. نلف على التعديلات ونطبقها في الداتابيز
            foreach (var update in updates)
            {
                var gameToUpdate = series.Games.FirstOrDefault(g => g.Id == update.Id);
                if (gameToUpdate == null) continue;

                // جوه الـ foreach loop
                if (update.IsJunk ?? false) // التعديل هنا
                {
                    // لو الـ AI قال دي لعبة مضروبة، نمسحها
                    _context.SeriesGames.Remove(gameToUpdate);
                    deletedCount++;
                }
                else
                {
                    // لو لعبة حقيقية، نحدث ترتيب القصة والنوع
                    gameToUpdate.ChronologicalOrder = update.ChronologicalOrder ?? 0;
                    gameToUpdate.IsMainline = update.IsMainline ?? false; // التعديل هنا
                    updatedCount++;
                }
            }

            // 8. نحفظ التغييرات
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "الـ AI نظف ورتب السلسلة بنجاح!",
                DeletedJunkGames = deletedCount,
                UpdatedOfficialGames = updatedCount
            });
        }
        [HttpGet("{seriesId}/timeline")]
        public async Task<IActionResult> GetSeriesTimeline([FromRoute] int seriesId, [FromQuery] bool onlyMainline = false) 
        {
        var series = await _context.Series
                .Include(s=>s.Games)
                .FirstOrDefaultAsync(s=> s.Id == seriesId);
            if (series == null)
                return NotFound("السلسلة دي مش موجودة عندنا.");

            var gamesList = series.Games ?? new List<SeriesGame>();
            var timelineq = gamesList.AsQueryable();

            if (onlyMainline)
            {
                timelineq = timelineq.Where(g => g.IsMainline);
            }

            var timeline = timelineq.OrderBy(g => g.ChronologicalOrder)
                .Select(g => new
                {
                    Id = g.Id,
                    Title = g.Title,
                    ReleaseDate = g.ReleaseDate.HasValue ? g.ReleaseDate.Value.ToString("yyyy-MM-dd") : null,
                    CoverImageUrl = g.CoverImageUrl,
                    ChronologicalOrder = g.ChronologicalOrder,
                    IsMainline = g.IsMainline
                }).ToList();

            return Ok(new
            {
                SeriesName = series.Name,
                TotalGames = timeline.Count,
                Timeline = timeline,
                ThemeMusicUrl = series.ThemeMusicUrl
            });

        }
        [HttpPost("bulk-import")]
        public async Task<IActionResult> BulkImportSeries()
        {
            
            var targetSeriesList = new List<string>
    {
        "Resident Evil",
        "Dark Souls",
        "Assassin's Creed",
        "God of War",
        "Final Fantasy",
        "Metal Gear Solid",
        "Yakuza",
        "Grand Theft Auto"
    };

            var importedCount = 0;
            var failedCount = 0;

            
            foreach (var seriesName in targetSeriesList)
            {
             
                if (_context.Series.Any(s => s.Name.ToLower() == seriesName.ToLower()))
                    continue;

                try
                {
                
                    var rawGames = await _gameApiService.FetchGamesBySeriesAsync(seriesName);

                    if (rawGames.Any())
                    {
                        var newSeries = new Series { Name = seriesName };

                       
                        var orderedRawGames = rawGames
                            .Where(g => !string.IsNullOrEmpty(g.Released))
                            .OrderBy(g => DateTime.Parse(g.Released))
                            .ToList();

                        int releaseOrderCounter = 1;
                        foreach (var rawGame in orderedRawGames)
                        {
                            newSeries.Games.Add(new SeriesGame
                            {
                                Title = rawGame.Name,
                                ReleaseDate = DateTime.Parse(rawGame.Released),
                                CoverImageUrl = rawGame.Background_image,
                                ReleaseOrder = releaseOrderCounter++,
                                ChronologicalOrder = 0 
                            });
                        }

                        _context.Series.Add(newSeries);
                        await _context.SaveChangesAsync();
                        importedCount++;
                    }
                    else
                    {
                        failedCount++;
                    }

                 
                    await Task.Delay(1000);
                }
                catch (Exception ex)
                {
                   
                    failedCount++;
                }
            }

            return Ok(new
            {
                Message = "عملية السحب الأوتوماتيكية خلصت!",
                SuccessfullyImported = importedCount,
                FailedOrSkipped = failedCount
            });
        }
        [HttpPost("import")]
        public async Task<IActionResult> ImportSeries([FromQuery] string seriesName)
        {
            if (_context.Series.Any(s => s.Name.ToLower() == seriesName.ToLower()))
            {
                return BadRequest("موجوده بالفعل ");

            }
            var rawgames= await _gameApiService.FetchGamesBySeriesAsync(seriesName);
            if (!rawgames.Any())
                return NotFound("ملقيناش ألعاب بالاسم ده في الـ API.");
            var newSeries = new Series { Name = seriesName };
            var orderrawgames = rawgames.Where(g => !string.IsNullOrEmpty(g.Released)).
                OrderBy(g => DateTime.Parse(g.Released))
                .ToList();
            int releaseOrderCounter = 1;
            foreach (var rawGame in orderrawgames)
            {
                newSeries.Games.Add(new SeriesGame
                {
                    Title = rawGame.Name,
                    ReleaseDate = DateTime.Parse(rawGame.Released),
                    CoverImageUrl = rawGame.Background_image,
                    ReleaseOrder = releaseOrderCounter++,
                    ChronologicalOrder = 0 
                });
            }
            _context.Series.Add(newSeries);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = $"تم سحب وإضافة سلسلة {seriesName} بنجاح!",
                GamesCount = newSeries.Games.Count
            });
        }
        [HttpGet("autocomplete")]
        public async Task<IActionResult> Autocomplete([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            {
                return Ok(new List<object>());
            }

           


            var allMatches = await _context.Series
                .Where(g => g.Name != null && g.Name.ToLower().Contains(q.ToLower()))
                .Select(g => new { id = g.Id, name = g.Name })
                .Take(10)
                .ToListAsync();

            return Ok(allMatches);
        }
        [HttpGet("all")]
        public async Task<IActionResult> GetAllGames()
        {

            var games = await _context.Series
                .Select(g => new { g.Id, g.Name })
                .ToListAsync();

            return Ok(new
            {
                TotalSavedGames = games.Count,
                Games = games
            });
        }
    }
}
