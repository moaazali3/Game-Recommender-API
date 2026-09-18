using Game_Recommender_API.Data;
using Game_Recommender_API.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Game_Recommender_API.Services
{
    public class MlRecommendationService
    {
        private readonly HttpClient _httpClient;
        private readonly string _endpointUrl;
        private readonly AppDbContext _dbContext;
        private readonly SteamReviewService _steamService;
        private readonly ILogger<MlRecommendationService> _logger;

        public MlRecommendationService(
            HttpClient httpClient,
            IConfiguration configuration,
            AppDbContext dbContext,
            SteamReviewService steamService,
            ILogger<MlRecommendationService> logger)
        {
            _httpClient = httpClient;
            _dbContext = dbContext;
            _steamService = steamService;
            _logger = logger;
            _endpointUrl = configuration["MlApi:BaseUrl"] 
                ?? throw new InvalidOperationException("MlApi:BaseUrl configuration is missing.");

            // Set timeout to 30s to allow Hugging Face cold start container wake-up
            _httpClient.Timeout = TimeSpan.FromSeconds(30);
        }


        public async Task<List<RecommendedGameDto>?> GetRecommendationsAsync(string appId, int topN = 10)
        {
            if (string.IsNullOrWhiteSpace(appId) || !long.TryParse(appId.Trim(), out var numericAppId))
            {
                _logger.LogWarning("[MlRecommendationService] Invalid appId format: {AppId}", appId);
                return null;
            }

            try
            {
                var requestPayload = new MlRecommendationRequest
                {
                    AppId = numericAppId,
                    TopN = topN
                };

                _logger.LogInformation("[MlRecommendationService] Requesting ML recommendations for AppId {AppId}, top_n={TopN}...", numericAppId, topN);

                var response = await _httpClient.PostAsJsonAsync(_endpointUrl, requestPayload);

                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("[MlRecommendationService] ML API returned non-success code: {Status}. Body: {Body}", response.StatusCode, errorBody);
                    return null;
                }

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var mlResponse = await response.Content.ReadFromJsonAsync<MlRecommendationResponse>(options);

                if (mlResponse?.Data?.Recommendations?.Games == null || mlResponse.Data.Recommendations.Games.Count == 0)
                {
                    if (!string.IsNullOrEmpty(mlResponse?.Data?.Recommendations?.Error))
                    {
                        _logger.LogInformation("[MlRecommendationService] Game not found in ML Model: {Error}", mlResponse.Data.Recommendations.Error);
                    }
                    return null;
                }

                var mlGames = mlResponse.Data.Recommendations.Games;
                var appIds = mlGames.Select(g => g.AppId.ToString()).Distinct().ToList();

                // Fetch database games to enrich with tags, keywords, and verified title
                var dbGames = await _dbContext.Games
                    .Where(g => appIds.Contains(g.Appid))
                    .ToDictionaryAsync(g => g.Appid, StringComparer.OrdinalIgnoreCase);

                // Fetch franchise / series connections
                var seriesData = await _dbContext.SeriesGames
                    .Where(s => s.SteamId != null && appIds.Contains(s.SteamId))
                    .ToDictionaryAsync(s => s.SteamId!, s => s.SeriesId, StringComparer.OrdinalIgnoreCase);

                var matureTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "nudity", "sexual content" };
                var hardBannedTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "hentai", "nsfw", "adult only" };

                var results = new List<RecommendedGameDto>();

                foreach (var prediction in mlGames)
                {
                    var predAppId = prediction.AppId.ToString();
                    dbGames.TryGetValue(predAppId, out var existingGame);

                    string title;
                    string[] tags = Array.Empty<string>();
                    string[] keywords = Array.Empty<string>();

                    if (existingGame != null)
                    {
                        title = existingGame.Name;
                        tags = !string.IsNullOrEmpty(existingGame.Tags)
                            ? existingGame.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(t => t.Trim()).ToArray()
                            : Array.Empty<string>();
                        keywords = !string.IsNullOrEmpty(existingGame.keywords)
                            ? existingGame.keywords.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(k => k.Trim()).ToArray()
                            : Array.Empty<string>();
                    }
                    else
                    {
                        // Game returned from ML is not in our database yet: fetch name from Steam/SteamSpy
                        try
                        {
                            var steamGame = await _steamService.Getgame(predAppId);
                            title = !string.IsNullOrWhiteSpace(steamGame?.name) ? steamGame.name : $"Steam Game #{predAppId}";
                        }
                        catch
                        {
                            title = $"Steam Game #{predAppId}";
                        }
                    }

                    // Filter out hard-banned inappropriate games
                    if (tags.Any(t => hardBannedTags.Contains(t)))
                    {
                        continue;
                    }

                    bool isMature = tags.Any(t => matureTags.Contains(t));
                    bool hasSeries = seriesData.ContainsKey(predAppId);
                    int? seriesId = hasSeries ? seriesData[predAppId] : null;

                    double similarity = Math.Round(prediction.SimilarityScore, 2);
                    int roundedScore = (int)Math.Round(prediction.SimilarityScore);

                    results.Add(new RecommendedGameDto
                    {
                        Appid = predAppId,
                        Name = title,
                        matchscore = roundedScore,
                        SimilarityScore = similarity,
                        Sharedkeywords = keywords.Take(5),
                        Tags = tags,
                        IsMature = isMature,
                        hasseries = hasSeries,
                        seriesid = seriesId
                    });
                }

                _logger.LogInformation("[MlRecommendationService] Successfully resolved {Count} ML recommendations for AppId {AppId}", results.Count, appId);
                return results;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[MlRecommendationService] Exception occurred while contacting ML service for AppId {AppId}", appId);
                return null;
            }
        }
    }
}
