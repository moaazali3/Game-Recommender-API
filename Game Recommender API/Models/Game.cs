using System.ComponentModel.DataAnnotations;

namespace Game_Recommender_API.Models
{
    public class Game
    {  [Key]
        [MaxLength(100)]
        public string Appid { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string keywords { get; set; } = string.Empty;
        public DateTime LastUpdated { get; set; }
        public string? Tags { get; set; }
        public string? AiReviewSummary { get; set; }

    }
}
