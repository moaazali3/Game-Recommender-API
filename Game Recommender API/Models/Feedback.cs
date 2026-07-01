using System.ComponentModel.DataAnnotations;

namespace Game_Recommender_API.Models
{
    public class Feedback
    {
        [Key]
        [MaxLength(100)]
        public int Id { get; set; }
        public int Rating { get; set;  }
        public DateTime dateTime { get; set; }
        public string Description { get; set; } =string.Empty;  
    }
}
