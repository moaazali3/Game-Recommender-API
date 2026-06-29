namespace Game_Recommender_API.Models
{
    public class Series
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? CoverImageUrl { get; set; }
        public string? ThemeMusicUrl { get; set; }

        // Navigation Property: السلسلة الواحدة فيها كذا لعبة
        public ICollection<SeriesGame> Games { get; set; } = new List<SeriesGame>();
    }
}
