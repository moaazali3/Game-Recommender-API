using System.Text.Json.Serialization;

namespace Game_Recommender_API.Models
{
    public class SteamSpyGame
    {
        [JsonPropertyName("name")]
        public string name { get; set; } = string.Empty;
       
    }
}
