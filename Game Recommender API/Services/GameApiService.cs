using Game_Recommender_API.Data;
using Game_Recommender_API.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
namespace Game_Recommender_API.Services
{
    public class GameApiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        public GameApiService(HttpClient httpClient, IConfiguration configuration,AppDbContext context) 
        {
            _httpClient=httpClient;
            _apiKey = configuration["ApiKeys:RawgApi"] ?? throw new ArgumentNullException("RawgApi key is missing.");
            _httpClient.BaseAddress = new Uri("https://api.rawg.io/api/");
            _context = context;
            _configuration = configuration;
        }
        public async Task<string> GetGroqSummary(List<string> reviews, string lang = "en")
        {
            if (reviews == null || reviews.Count == 0)
            {
                return lang == "ar" ? "لا توجد مراجعات كافية لهذه اللعبة حتى الآن." : "Not enough reviews available for this game yet.";
            }

            string allReviewsText = string.Join("\n", reviews);

            if (allReviewsText.Length > 6000)
            {
                allReviewsText = allReviewsText.Substring(0, 6000);
            }

            using var client = new HttpClient();
            var groqKey = _configuration["ApiKeys:GroqApi"] ?? throw new ArgumentNullException("GroqApi key is missing.");
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {groqKey}");

            string prompt = lang == "ar" 
                ? $@"أنت ناقد وخبير ألعاب فيديو محترف. اقرأ تقييمات ومراجعات اللاعبين التالية للعبة:
{allReviewsText}

بناءً فقط على هذه المراجعات، اكتب ملخصاً دقيقاً باللغة العربية الفصحى يوضح:
3 مميزات رئيسية
3 عيوب رئيسية

استخدم هذا التنسيق الإلزامي بالضبط وبدون أي مقدمة أو كلام إضافي:
Pros:
- [الميزة 1]
- [الميزة 2]
- [الميزة 3]

Cons:
- [العيب 1]
- [العيب 2]
- [العيب 3]"
                : $@"You are a video game expert. Read the following player reviews for this game:
{allReviewsText}

Based ONLY on these reviews, write a very short summary containing:
3 Pros
3 Cons

Use exactly this format without any introduction or conclusion:
Pros:
- [Pro 1]
- [Pro 2]
- [Pro 3]

Cons:
- [Con 1]
- [Con 2]
- [Con 3]";
            var requestBody = new
            {
                model = "groq/compound-mini", 
                messages = new[] { new { role = "user", content = prompt } },
                temperature = 0.1 
            };
            var response = await client.PostAsJsonAsync("https://api.groq.com/openai/v1/chat/completions", requestBody);
            if (!response.IsSuccessStatusCode)
            {
                var errDetail = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[GROQ ERROR] Status: {response.StatusCode} Details: {errDetail}");
                return lang == "ar" ? "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي لتلخيص المراجعات." : "An error occurred while generating the AI review summary.";
            }
            var jsonResponse = await response.Content.ReadAsStringAsync();
            using var doc = System.Text.Json.JsonDocument.Parse(jsonResponse);

            var summary = doc.RootElement
                             .GetProperty("choices")[0]
                             .GetProperty("message")
                             .GetProperty("content")
                             .GetString();

            return summary ?? (lang == "ar" ? "لم يتمكن الذكاء الاصطناعي من تلخيص المراجعات." : "Unable to generate review summary.");


        }
        public async Task<List<RawgGame>> FetchGamesBySeriesAsync(string query)
        {
            var response = await _httpClient.GetAsync($"games?key={_apiKey}&search={query}&search_exact=true");

            if (!response.IsSuccessStatusCode)
                return new List<RawgGame>();

            var jsonString = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

            var data = JsonSerializer.Deserialize<RawgResponse>(jsonString, options);

            return data?.Results ?? new List<RawgGame>();

        }
        }
}
