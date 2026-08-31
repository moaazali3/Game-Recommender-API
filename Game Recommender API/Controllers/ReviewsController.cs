using Game_Recommender_API.Data;
using Game_Recommender_API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Game_Recommender_API.Controllers
{
    [ApiController]
    [Route("api/reviews")]
    public class ReviewsController : Controller
    {
        
        private readonly SteamReviewService _steamService;
        private readonly TextAnalyzerService _textAnalyzer;
        private readonly AppDbContext _dbContext;
        private readonly GameApiService _GameApi;

        // عملنا Inject للخدمتين
        public ReviewsController(SteamReviewService steamService, TextAnalyzerService textAnalyzer, AppDbContext appDbContext, GameApiService gameApi)
        {
            _steamService = steamService;
            _textAnalyzer = textAnalyzer;
            _dbContext = appDbContext;
            _GameApi = gameApi;
        }
        [HttpGet("{appid}/ai-summary")]
        public async Task<IActionResult> GetAiReviewSummary(string appid, [FromQuery] string lang = "en")
        {
            var game = await _dbContext.Games.FirstOrDefaultAsync(g => g.Appid == appid);

            if (game != null && !string.IsNullOrEmpty(game.AiReviewSummary) && lang == "en")
            {
                return Ok(new { Summary = game.AiReviewSummary, Source = "Database Cache", Lang = "en" });
            }
            
            var steamReviews = await _steamService.GetGameReviewsforaiAsync(appid);
            var aiSummary = await _GameApi.GetGroqSummary(steamReviews, lang);
            
            if (game != null && lang == "en" && !aiSummary.Contains("حدث خطأ") && !aiSummary.Contains("error"))
            {
                game.AiReviewSummary = aiSummary;
                await _dbContext.SaveChangesAsync();
            }
            
            return Ok(new { Summary = aiSummary, Source = "Groq AI", Lang = lang });
        }

        }
}
