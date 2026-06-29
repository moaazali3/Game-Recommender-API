using System.Text.Json.Serialization;
namespace Game_Recommender_API.Models
{
   
        public class SteamReviewResponse
        {
            [JsonPropertyName("success")]
            public int Success { get; set; }

            [JsonPropertyName("reviews")]
            public List<SteamReview> Reviews { get; set; } = new List<SteamReview>();
        }
     public class RawgResponse
    {
        public List<RawgGame> Results { get; set; } = new();
    }

    public class RawgGame
    {
        public string Name { get; set; } = string.Empty;
        public string Released { get; set; } = string.Empty; // بتيجي بصيغة "YYYY-MM-DD"
        public string Background_image { get; set; } = string.Empty;
    }
    public class SteamReview
        {
            [JsonPropertyName("review")]
            public string ReviewText { get; set; }

            [JsonPropertyName("voted_up")]
            public bool VotedUp { get; set; }
        }
    }

