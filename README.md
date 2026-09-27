# Game Recommender System 🎮✨

A powerful, intelligent Game Recommendation System that suggests games from Steam review-derived keywords, gameplay tags, and content-based recommendation service. It features a full-stack architecture with an ASP.NET Core backend API and a modern React/Vite frontend.

🌐 **Live Demo:** [http://game-recommender.runasp.net/](http://game-recommender.runasp.net/)

---

## 🚀 Key Features

### 1. Smart Recommendations & Content Matching
- Uses an external TF-IDF-based recommendation engine to identify related games from their tags and review-derived keywords.
- The ASP.NET API uses the Python ML recommender as the primary recommendation engine, with the deterministic C# content-based engine available as a fallback or when `engine=classic` is explicitly requested.
- Displays recommendation scores and related game metadata to provide context for the returned results.
- Supports blending the characteristics of up to four selected games to generate combined recommendations. (Doesn't support ML models yet)

### 2. Bilingual Support (Internationalization)
- Full bilingual translation (Arabic / English) switching dynamically in real time.
- Automatic layout direction switching (RTL for Arabic, LTR for English) for an optimal user experience.

### 3. AI-Powered Reviews Summary
- Integrates with **Groq AI** to analyze and summarize Steam reviews for a game.
- Supports a requested language such as English or Arabic and can cache English summaries.
- Renders key **Pros** and **Cons** in a clean popup summary.

### 4. Interactive Series Timelines
- Explore complete storylines of franchises such as *Resident Evil*, *Dark Souls*, and *Assassin's Creed*.
- Imports series data from an external game-data integration and can use AI to identify junk entries, mark mainline games, and arrange official games by story chronology.
- Toggle between **Mainline Games Only** and the full timeline.
- Search series, view release information, and browse responsive timeline layouts.

### 5. Seamless Navigation, Library & Feedback
- Recommendation cards show a **🔗 Series Badge** when a game belongs to a franchise.
- Autocomplete search supports aliases such as GTA, DS3, RE4, and GoW.
- Browse the saved game library and monitor seeding status and recent activity.
- Submit feedback and retrieve recent feedback through the API.

### 6. Glassmorphic UI Design
- A dark, sleek, responsive UI built with custom background glowing orbs, backdrop filters, and smooth micro-animations.
- Implemented with React components and custom CSS rather than a heavy UI framework.

---

## 🛠️ Tech Stack

- **Frontend:** React, React Router, Vite, and custom CSS/glassmorphism styling.
- **Backend:** C# ASP.NET Core Web API.
- **Database:** Entity Framework Core; the configured runtime provider is SQL Server through `ConnectionStrings:DefaultConnection`. The tracked `games.db` file is also copied to output, but SQLite is not the provider configured in [`Program.cs`](./Game%20Recommender%20API/Program.cs).
- Recommendation engines: Primary Python/scikit-learn TF-IDF recommendation engine, with a deterministic C# content-based fallback.
- **AI Integrations:** Groq AI for review summaries and timeline cleanup.
- **External Data:** Steam, SteamSpy, and related game-data integrations used by the backend services.

---

## 📂 Project Structure

```text
Game-Recommender-API/
├── README.md
│
├── Game Recommender API/              # ASP.NET Core backend and REST API
│   ├── Controllers/                   # API endpoints
│   ├── Data/                          # EF Core database context and data access
│   ├── Migrations/                    # EF Core database migrations
│   ├── Models/                        # Database/domain models
│   ├── Services/                      # Application logic and external integrations
│   ├── Properties/                    # ASP.NET Core launch/development settings
│   ├── Program.cs                     # Application configuration and startup
│   ├── Game Recommender API.csproj    # .NET project configuration
│   └── games.db                       # SQLite database file
│
├── frontend/                          # React/Vite frontend
│   ├── public/                        # Static frontend assets
│   ├── src/
│   │   ├── components/                # Reusable UI components
│   │   ├── context/                   # Shared React state/context
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── pages/                     # Application pages
│   │   ├── services/                  # API communication layer
│   │   ├── App.jsx                    # Main React application
│   │   └── main.jsx                   # Frontend entry point
│   ├── package.json                   # Frontend dependencies and scripts
│   └── vite.config.js                 # Vite configuration
│
└── Recommender Core/                  # Python ML recommendation system
    ├── Local Version/                 # Local recommendation-service implementation
    │   ├── api/                       # FastAPI routes
    │   ├── infrastructure/            # Configuration and infrastructure
    │   ├── lifecycle/                 # Model/artifact lifecycle management
    │   ├── ml/                        # TF-IDF recommendation logic
    │   ├── tests/                     # Recommender tests
    │   ├── app.py                     # FastAPI application entry point
    │   └── requirements.txt            # Python dependencies
    │
    └── Deployability Version/         # Deployment-oriented recommender implementation
        ├── api/                       # FastAPI routes
        ├── infrastructure/            # Deployment/configuration infrastructure
        ├── lifecycle/                 # Model/artifact lifecycle management
        ├── ml/                        # TF-IDF recommendation logic
        ├── app.py                     # FastAPI application entry point
        └── requirements.txt            # Python dependencies

```

## ⚙️ Getting Started

### Prerequisites

- [.NET SDK](https://dotnet.microsoft.com/) compatible with the project target framework
- [Node.js and npm](https://nodejs.org/)
- A reachable SQL Server instance configured for the application
- [Python 3](https://www.python.org/) and the selected recommender variant's dependencies, when running the Python service
- Credentials and endpoint configuration for the external services you enable

### Running the Application Locally

1. Configure `ConnectionStrings:DefaultConnection` for SQL Server and add external-service settings through local or environment-specific configuration. Do not commit credentials.
2. Restore and run the API from the repository root:
   ```bash
   dotnet restore "Game Recommender API/Game Recommender API.csproj"
   dotnet run --project "Game Recommender API/Game Recommender API.csproj"
   ```
3. For frontend development, install dependencies and start Vite:
   ```bash
   cd frontend
   npm ci
   npm run dev
   ```
4. To build the frontend for backend hosting:
   ```bash
   npm run build
   ```
   The Vite configuration writes the build to `Game Recommender API/wwwroot`. The ASP.NET backend serves `wwwroot` and falls back to `index.html`.
5. Open the local URL provided by the API or Vite development server. Swagger/OpenAPI is available in the ASP.NET development environment.

### Running the ML Recommendation Service

The Python ML recommender is the primary recommendation engine. The repository contains both local and deployment-oriented variants under [`Recommender Core/`](./Recommender%20Core/). Each variant includes its own `README.md` with the required installation, configuration, and execution steps.

---

## 🔌 API Endpoints Overview

### Recommendations, Library & Feedback
- `GET /api/Recommendations/all` - Retrieves the saved game list.
- `GET /api/Recommendations/stats` - Returns library count and seeding progress/status.
- `GET /api/Recommendations/autocomplete?q={searchTerm}` - Returns autocomplete suggestions.
- `GET /api/Recommendations/{appId}/style` - Analyzes Steam reviews and returns style keywords.
- `GET /api/Recommendations/{appid}/recommendations` - Returns recommendations, scores, mature tags, and series metadata; accepts `engine=classic`.
- `POST /api/Recommendations/blend` - Blends recommendations for selected games.
- `POST /api/Recommendations/seed?page={page}` - Seeds the database by fetching games and extracting keywords/tags.
- `POST /api/Recommendations/feedback` - Submits user feedback (rating and description).
- `GET /api/Recommendations/feedback` - Retrieves recent feedback.

### Reviews
- `GET /api/reviews/{appid}/ai-summary?lang={en|ar}` - Returns a Groq-generated or cached Steam review summary.

### Series Timeline
- `GET /api/Series/{seriesId}/timeline?onlyMainline={true|false}` - Gets the chronological story timeline.
- `GET /api/Series/autocomplete?q={searchTerm}` - Returns series suggestions.
- `GET /api/Series/all` - Retrieves saved series.
- `POST /api/Series/fix-timeline-with-ai/{seriesId}` - Uses Groq to clean junk data and classify/order entries.
- `POST /api/Series/bulk-import` - Imports the configured set of series from an external source.
- `POST /api/Series/import?seriesName={name}` - Imports one series.

### Python ML Recommendation Service
The separate FastAPI service used by `MlRecommendationService` exposes the ML recommendation endpoint.
- `POST /api/v1/game-details` - Accepts the recommendation request payload and returns the ML recommendation response.

---

## 🤖 Recommendation Engine Details

The application's primary recommendation approach is a Python/scikit-learn content-based recommendation engine built around two separate character-level TF-IDF representations: one for game tags and another for review-derived keywords.

* **Tags:** `char_wb` analyzer with n-grams `(3,5)`
* **Keywords:** `char_wb` analyzer with n-grams `(2,4)`

For each candidate game, the engine calculates cosine similarity independently in both feature spaces and combines the two similarities into the final recommendation score:

```text
score = √(tag_similarity × keyword_similarity)
```

This allows recommendations to balance tag and keyword similarity, so a strong match in one does not completely hide a weak match in the other.

Unlike simple match counting with fixed weights, the ML approach measures how similar games actually are in each feature space.

The Python recommendation service also includes model-artifact generation and loading, validation, versioned manifests, safe publication and rollback, artifact retention, and scheduled update workflows. These components support maintaining and updating the recommendation models as the game catalog changes.

The ASP.NET Core application integrates with this service through `MlRecommendationService`. A deterministic C# content-based engine is maintained as a fallback and can also be explicitly selected with `engine=classic`. Its scoring is based on keyword and tag matches:

```text
score = keyword_matches + 5 × tag_matches
```

The recommendation system is content-based: it does not use collaborative filtering, user-profile learning, or supervised ranking.

---

## 🎨 UI & Responsive Aesthetics

The interface features custom-designed glow orbs, backdrop filters, and smooth card micro-animations built with React and custom CSS, ensuring a fast, premium, bilingual, and fully responsive feel across screen sizes.
