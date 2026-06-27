# Game Recommender System

A powerful, intelligent Game Recommendation System that suggests games based on Steam reviews and shared keyword matching. It features a full-stack architecture with an ASP.NET Core backend API and a beautiful, modern vanilla JavaScript frontend.

## 🚀 Features

- **Smart Recommendations:** Uses keyword intersection algorithms to suggest the most related games by analyzing Steam reviews.
- **Autocomplete Search:** Find games quickly with an autocomplete dropdown featuring typing debounce logic.
- **Glassmorphic UI:** A dark, sleek, responsive, and visually stunning user interface with custom background glows and blur effects.
- **Dynamic Content:** Automatically fetches Steam header images, handles game matching scores, and seamlessly integrates with the REST API.
- **Data Seeding:** Built-in backend endpoint to automatically pull, analyze, and seed the top 100 Steam games into a local SQLite database.

## 🛠️ Tech Stack

- **Frontend:** HTML5, Vanilla CSS3 (Custom Glassmorphism design), Vanilla JavaScript
- **Backend:** C# ASP.NET Core Web API
- **Database:** Entity Framework Core (SQLite `games.db`)
- **External Integrations:** Steam API (for fetching game reviews)

## 📂 Project Structure

- `/Game Recommender API` - Contains the ASP.NET Core backend solution and API controllers.
  - `Controllers/` - Includes `RecommendationsController.cs` for managing endpoints.
  - `wwwroot/` - The compiled/served frontend web assets (`index.html`, `style.css`, `app.js`).
- `/frontend` - Contains initial standalone frontend mockups/files.

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
   Navigate to the Localhost URL provided in the console (e.g., `http://localhost:7193` or `http://localhost:5000`) in your web browser.

### API Endpoints Overview

- `GET /api/Recommendations/all` - Retrieves a list of all saved games.
- `GET /api/Recommendations/{appId}/style` - Analyzes Steam reviews and returns style keywords for a specific game.
- `POST /api/Recommendations/seed` - Seeds the database by fetching top games and extracting their keywords.
- `GET /api/Recommendations/{appid}/recommendations` - Returns the top 5 game recommendations based on the target game.
- `GET /api/Recommendations/autocomplete?q={searchTerm}` - Returns autocomplete suggestions matching the search query.

## 🎨 UI Design
The interface features custom-designed glow orbs, backdrop-filters, and smooth card micro-animations built from scratch without any external CSS libraries, ensuring a fast and premium feel.

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).
