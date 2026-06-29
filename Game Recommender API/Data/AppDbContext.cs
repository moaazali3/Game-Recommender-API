using Microsoft.EntityFrameworkCore;
using Game_Recommender_API.Models; 

namespace Game_Recommender_API.Data
{
    public class AppDbContext : DbContext
    {
      
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }
        public DbSet<Game> Games { get; set; }
        public DbSet<Series> Series { get; set; }
        public DbSet<SeriesGame> SeriesGames { get; set; }
        public DbSet<Feedback> Feedbacks { get; set; }

    }
}