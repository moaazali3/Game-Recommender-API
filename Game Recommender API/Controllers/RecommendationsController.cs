using Game_Recommender_API.Services;
using Game_Recommender_API.Data;
using Microsoft.AspNetCore.Mvc;
using System.Net.WebSockets;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

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
        public RecommendationsController(SteamReviewService steamService, TextAnalyzerService textAnalyzer,AppDbContext appDbContext)
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
            var result = await _steamService.Gettop100game();
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

                if(review ==null|| review.Count == 0) 
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
        [HttpGet("autocomplete")]
        public async Task<IActionResult> Autocomplete([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            {
                return Ok(new List<object>());
            }
            var suggestion = await _dbContext.Games.
                Where(g => g.Name.ToLower().Contains(q.ToLower())).
                Select(g => new { appid = g.Appid, name = g.Name }).Take(5).ToListAsync();
            return Ok(suggestion);
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
            var targetkeywords = targetgame.keywords.Split(',');
            var allother = await _dbContext.Games.Where(g => g.Appid != appid).ToListAsync();
            var recommend = allother.Select(
                game => new
                {
                    Appid = game.Appid,
                    Name = game.Name,
                    matchscore = game.keywords.Split(',').Intersect(targetkeywords).Count(),
                    Sharedkeywords = game.keywords.Split(',').Intersect(targetkeywords)


                }

                ). Where(x=> x.matchscore>0).
                OrderByDescending(x=> x.matchscore)
                .Take(5)
                .ToList();
            return Ok(new
            {
                TargetGame = targetgame.Name,
                TargetAppId = targetgame.Appid,
                Recommendations = recommend
            });



        }
    }
}