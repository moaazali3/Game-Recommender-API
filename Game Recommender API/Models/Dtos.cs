namespace Game_Recommender_API.Models
{
    public class Dtos
    {
    }
    public class AiGameUpdateDto
    {
        public int Id { get; set; } 
        public int ?ChronologicalOrder { get; set; } 
        public bool? IsMainline { get; set; } 
        public bool? IsJunk { get; set; }
    }
    public class FeedbackInputDto
    {
        public string Message { get; set; } = string.Empty;
        public int? Rating { get; set; } 
    }
    public class BlendRequestDto
    {
        public List<string> Games { get; set; } = new();
    }
}
