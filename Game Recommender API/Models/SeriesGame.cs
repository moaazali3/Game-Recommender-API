namespace Game_Recommender_API.Models
{
    public class SeriesGame
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime? ReleaseDate { get; set; }
        public string? CoverImageUrl { get; set; }

        public int ReleaseOrder { get; set; }

        public int ChronologicalOrder { get; set; }

        public bool IsMainline { get; set; }
        public int SeriesId { get; set; }
        public Series Series { get; set; } = null!;
    }
}
