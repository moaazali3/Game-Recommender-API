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

        public class SteamReview
        {
            [JsonPropertyName("review")]
            public string ReviewText { get; set; }

            [JsonPropertyName("voted_up")]
            public bool VotedUp { get; set; }
        }
    }

