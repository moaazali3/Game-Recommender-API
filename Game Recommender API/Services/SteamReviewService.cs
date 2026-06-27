using System.Text.Json;
using Game_Recommender_API.Models;
namespace Game_Recommender_API.Services
{
    public class SteamReviewService
    {
        private readonly HttpClient _httpClient;

        public SteamReviewService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }
        public async Task<Dictionary<string, string>> Gettop100game() 
        {
            string url = "https://steamspy.com/api.php?request=all&page=0";
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
