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
        public async Task<string> GetGroqSummary(List<string> reviews)
        {
            if (reviews == null || reviews.Count == 0)
            {
                return "لا توجد مراجعات كافية لهذه اللعبة حتى الآن.";
            }

          
            string allReviewsText = string.Join("\n", reviews);

     
            if (allReviewsText.Length > 6000)
            {
                allReviewsText = allReviewsText.Substring(0, 6000);
            }
            using var client = new HttpClient();
            var groqKey = _configuration["ApiKeys:GroqApi"] ?? throw new ArgumentNullException("GroqApi key is missing.");
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {groqKey}");
            string prompt = $@"
You are a video game expert. Read the following player reviews for this game:
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
                model = "llama-3.1-8b-instant", 
                messages = new[] { new { role = "user", content = prompt } },
                temperature = 0.1 
            };
            var response = await client.PostAsJsonAsync("https://api.groq.com/openai/v1/chat/completions", requestBody);
            if (!response.IsSuccessStatusCode)
            {
                return "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي لتلخيص المراجعات.";
            }
            var jsonResponse = await response.Content.ReadAsStringAsync();
            using var doc = System.Text.Json.JsonDocument.Parse(jsonResponse);

            var summary = doc.RootElement
                             .GetProperty("choices")[0]
                             .GetProperty("message")
                             .GetProperty("content")
                             .GetString();

            return summary ?? "لم يتمكن الذكاء الاصطناعي من تلخيص المراجعات.";


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
