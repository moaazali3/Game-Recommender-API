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
        public GameApiService(HttpClient httpClient, IConfiguration configuration) 
        {
            _httpClient=httpClient;
            _apiKey = configuration["ApiKeys:RawgApi"] ?? throw new ArgumentNullException("RawgApi key is missing.");
            _httpClient.BaseAddress = new Uri("https://api.rawg.io/api/");

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
