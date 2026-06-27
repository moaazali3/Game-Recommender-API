using System.Text.RegularExpressions;

namespace Game_Recommender_API.Services
{
    public class TextAnalyzerService
    {
        // قائمة بكلمات التوقف (Stop Words) اللي مش بتدل على ستايل معين وعايزين نتجاهلها
        private static readonly HashSet<string> _stopWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "the", "and", "a", "to", "of", "is", "it", "in", "for", "this", "that", "you", "on", "with",
            "as", "are", "be", "was", "but", "have", "not", "its", "been", "years", "through", "ever",
            "always", "over", "into", "had", "never", "day", "game", "play", "played", "like", "just",
            "so", "can", "about", "has", "all", "if", "at", "my", "from", "they", "we", "or", "an", "out",
            "some", "more", "there", "their", "what", "up", "get", "time", "one", "do", "would", "very"
        };

        public List<string> ExtractTopKeywords(List<string> reviews, int topCount = 10)
        {
            if (reviews == null || !reviews.Any()) return new List<string>();

           
            string combinedText = string.Join(" ", reviews);

 
            combinedText = Regex.Replace(combinedText, @"\[/?.*?\]", " ");

            combinedText = Regex.Replace(combinedText, @"[^a-zA-Z\s]", " ").ToLower();

         
            var words = combinedText.Split(new[] { ' ', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries);

      
            var topWords = words
                .Where(w => w.Length > 2 && !_stopWords.Contains(w)) 
                .GroupBy(w => w)
                .Select(g => new { Word = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(topCount) 
                .Select(x => x.Word) 
                .ToList();

            return topWords;
        }
    }
}