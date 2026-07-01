# Game Recommender System 🎮✨

A powerful, intelligent Game Recommendation System that suggests games based on Steam reviews and shared keyword matching. It features a full-stack architecture with an ASP.NET Core backend API and a beautiful, modern vanilla JavaScript frontend.

🌐 **Live Demo:** [http://game-recommender.runasp.net/](http://game-recommender.runasp.net/)

---

## 🚀 Key Features

### 1. Smart Recommendations & Keyword Matching
- Uses keyword intersection algorithms to suggest the most related games by analyzing Steam reviews.
- Shows similarity scores matching the target game.

### 2. Bilingual Support (Internationalization)
- Full bilingual translation (Arabic / English) switching dynamically in real-time.
- Automatic layout direction switching (RTL for Arabic, LTR for English) for optimal user experience.

### 3. AI-Powered Reviews Summary
- Integrates with **Groq AI** to dynamically analyze and summarize thousands of Steam reviews for any game.
- Renders key **Pros** and **Cons** in a clean popup summary.

### 4. Interactive Series Timelines
- Explore complete storylines of iconic franchises (e.g., *Resident Evil*, *Dark Souls*, *Assassin's Creed*).
- Uses AI to clean up series junk entries and arrange games in true chronological order.
- Toggle between **Mainline Games Only** and full spin-offs.
- Flexible, responsive layout preventing vertical wrapping issues.

### 5. Seamless Navigation & Badging
- Recommendation cards feature a glowing **🔗 Series Badge** if the game belongs to a franchise.
- Click anywhere on the card (or the badge) to immediately jump to the series timeline page.
- Autocomplete search with debounce logic for fluid navigation.

### 6. Glassmorphic UI Design
- A dark, sleek, responsive, and visually stunning UI built with custom background glowing orbs, backdrop-filters, and smooth micro-animations.
- Implemented from scratch without heavy external framework weight.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Vanilla CSS3 (Custom Glassmorphism design), Vanilla JavaScript.
- **Backend:** C# ASP.NET Core Web API.
- **Database:** Entity Framework Core (SQLite `games.db`).
- **AI Integrations:** Groq AI API (for review summaries & timeline optimization).
- **External Data:** Steam Web API.

---

## 📂 Project Structure

- `/Game Recommender API` - Contains the ASP.NET Core backend solution and API controllers.
  - `Controllers/` - Includes `RecommendationsController.cs` and `SeriesController.cs`.
  - `wwwroot/` - The compiled/served frontend web assets (`index.html`, `series.html`, `style.css`, `app.js`, `series.js`, `lang.js`).
- `/frontend` - Contains initial standalone frontend mockups/files.

---

## ⚙️ Getting Started

### Prerequisites
- [.NET SDK](https://dotnet.microsoft.com/)
- A modern Web Browser

### Running the Application Locally

1. **Open your terminal** and navigate to the API directory:
   ```bash
   cd "Game Recommender API/Game Recommender API"
   ```
2. **Run the Application:**
   ```bash
   dotnet run
   ```
3. **Open the App:**
   Once the backend is running, the frontend is automatically served via static files.
   Navigate to the Localhost URL provided in the console (e.g., `http://localhost:7193` in your web browser).

---

## 🔌 API Endpoints Overview

### Recommendations & Feedback
- `GET /api/Recommendations/all` - Retrieves a list of all saved games.
- `GET /api/Recommendations/{appId}/style` - Analyzes Steam reviews and returns style keywords for a specific game.
- `POST /api/Recommendations/seed` - Seeds the database by fetching top games and extracting their keywords.
- `GET /api/Recommendations/{appid}/recommendations` - Returns game recommendations with similarity scores, mature tags, and series metadata.
- `GET /api/Recommendations/autocomplete?q={searchTerm}` - Returns autocomplete suggestions.
- `POST /api/Recommendations/feedback` - Submits user feedback (rating and description).

### Series Timeline
- `GET /api/Series/{seriesId}/timeline?onlyMainline={true|false}` - Gets the chronological story timeline for a game series.
- `POST /api/Series/fix-timeline-with-ai/{seriesId}` - Uses AI (via Groq) to clean up series junk data and arrange them sequentially by story.
- `POST /api/Series/bulk-import` - Fetches and saves raw series games from an external source.

---

## 🎨 UI & Responsive Aesthetics
The interface features custom-designed glow orbs, backdrop-filters, and smooth card micro-animations built from scratch without any external CSS libraries, ensuring a fast, premium, and fully responsive feel across all screen sizes.
