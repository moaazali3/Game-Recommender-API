using System.ComponentModel.DataAnnotations;

namespace Game_Recommender_API.Models
{
    public class SeriesGame
    {
        [Key]
        [MaxLength(100)]
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime? ReleaseDate { get; set; }
        public string? CoverImageUrl { get; set; }

        public int ReleaseOrder { get; set; }

        public int ChronologicalOrder { get; set; }

        public bool IsMainline { get; set; }
        public int SeriesId { get; set; }
        public string? SteamId { get; set; }
        public Series Series { get; set; } = null!;
    }
}
