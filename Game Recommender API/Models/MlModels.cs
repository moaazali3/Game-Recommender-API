using System.Text.Json.Serialization;

namespace Game_Recommender_API.Models
{
    public class MlRecommendationRequest
    {
        [JsonPropertyName("app_id")]
        public long AppId { get; set; }

        [JsonPropertyName("top_n")]
        public int TopN { get; set; } = 10;
    }

    public class MlRecommendationResponse
    {
        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("data")]
        public MlResponseData? Data { get; set; }
    }

    public class MlResponseData
    {
        [JsonPropertyName("recommendations")]
        public MlRecommendationsResult? Recommendations { get; set; }
    }

    public class MlRecommendationsResult
    {
        [JsonPropertyName("total")]
        public int? Total { get; set; }

        [JsonPropertyName("games")]
        public List<MlGamePrediction>? Games { get; set; }

        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }

    public class MlGamePrediction
    {
        [JsonPropertyName("app_id")]
        public long AppId { get; set; }

        [JsonPropertyName("similarity_score")]
        public double SimilarityScore { get; set; }
    }

    public class RecommendedGameDto
    {
        public string Appid { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int matchscore { get; set; }
        public double? SimilarityScore { get; set; }
        public IEnumerable<string> Sharedkeywords { get; set; } = new List<string>();
        public IEnumerable<string> Tags { get; set; } = new List<string>();
        public bool IsMature { get; set; }
        public bool hasseries { get; set; }
        public int? seriesid { get; set; }
    }
}
