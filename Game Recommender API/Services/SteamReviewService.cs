using Game_Recommender_API.Models;
using System.Text.Json;
namespace Game_Recommender_API.Services
{
    public class SteamReviewService
    {
        private readonly HttpClient _httpClient;

        public SteamReviewService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }
        public async Task<Dictionary<string, string>> Gettop1000game()
        {
            string url = "https://steamspy.com/api.php?request=all&page=3";
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            var jsonstring = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<Dictionary<string, SteamSpyGame>>(jsonstring);
            if (result == null) return new Dictionary<string, string>();

            return result.ToDictionary(
                x => x.Key,
                x => x.Value.name
            );
        }
        public async Task<SteamSpyGame> Getgame(string appid)
        {
            string url = $"https://steamspy.com/api.php?request=appdetails&appid={appid}";

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var jsonstring = await response.Content.ReadAsStringAsync();

        
            var game = JsonSerializer.Deserialize<SteamSpyGame>(jsonstring);
            if (game == null)
                return new SteamSpyGame();
            return game;
        }
        public async Task<List<string>> GetTagsForGame(string appid)
        {
            try { 
            string url = $"https://steamspy.com/api.php?request=appdetails&appid={appid}";
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            var jsonstring = await response.Content.ReadAsStringAsync();
            using var document = System.Text.Json.JsonDocument.Parse(jsonstring);
            var root = document.RootElement;
            if (root.TryGetProperty("tags", out var tagsElement) && tagsElement.ValueKind == System.Text.Json.JsonValueKind.Object)
            {

                var tagsList = tagsElement.EnumerateObject()
                                          .Select(t => t.Name)
                                          .ToList();
                return tagsList;
            }

            return new List<string>();
        }
    
    catch
    {
      
        return new List<string>();
    }

}
        public async Task<List<string>> GetGameReviewsforaiAsync(string appId)
        {
            try
            {
                string url = $"https://store.steampowered.com/appreviews/{appId}?json=1&language=english&num_per_page=30"; 

                var response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var jsonString = await response.Content.ReadAsStringAsync();

                // أوبشن مهم جداً عشان الـ C# يقدر يقرأ الـ JSON بتاع ستيم
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<SteamReviewResponse>(jsonString, options);

                return result?.Reviews
                    .Select(r => r.ReviewText) 
                    .ToList() ?? new List<string>();
            }
            catch
            {
            
                return new List<string>();
            }
        }
        public async Task<List<string>> GetGameReviewsAsync(string appId) 
        {
            string url = $"https://store.steampowered.com/appreviews/{appId}?json=1&language=english&num_per_page=100";
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            var jsonString = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<SteamReviewResponse>(jsonString);
            return result?.Reviews
                .Where(r => r.VotedUp)
                .Select(r => r.ReviewText)
                .ToList() ?? new List<string>();
        }
    }
}
