const translations = {
    en: {
        // Navigation
        "nav_timeline": "View Series Timeline",
        "nav_feedback": "Feedback",
        "nav_about": "About Site",
        "nav_library": "Library",
        "lang_toggle": "🌐 AR",

        // Index / Search
        "hero_title": "Discover Your Next <span class='highlight'>Favorite Game</span>",
        "search_placeholder": "Enter Game Name (e.g., Dark Souls III)",
        "search_btn": "Search",
        "loading_text": "Scanning the gaming multiverse...",
        "error_title": "Game not found",
        "error_desc": "We couldn't find any recommendations for that game. Try another title.",
        "target_label": "Target Game",
        "top_recommendations": "Top Recommendations",
        "match_label": "Match",
        "view_steam": "View on Steam",
        "find_similar": "Find Similar",
        "view_series": "View Series",

        // About Modal
        "about_title": "About Game Recommender",
        "about_desc": "Welcome to the Game Recommender! Search for a game you love, and we will find similar games for you using Steam data. The <span style='color: var(--accent); font-weight: bold;'>Match</span> score indicates how similar a recommended game is to your search.",
        "about_dev": "Designed & Developed by <br><span class='highlight' style='font-size: 1.5rem; font-weight: 800; margin-top: 0.5rem; display: inline-block;'>Moaaz Ali Ali</span>",

        // Series Page
        "series_timeline_title": "Series Story <span class='highlight'>Timeline</span>",
        "back_to_search": "Back to Search",
        "show_all_games": "Show all games",
        "mainline_only": "Mainline Games Only",
        "mainline": "Mainline",
        "spinoff": "Spin-off",

        // Library Page
        "library_title": "All Games Library",
        "library_desc": "Explore all games available in our database.",
        "total_games": "Total Saved Games:",

        // Tooltips
        "shared_keywords_prefix": "Matches: ",

        // AI Summary
        "ai_summary_btn": "✨ AI Summary",
        "ai_summary_title": "✨ AI Review Summary",
        "ai_loading": "Analyzing thousands of reviews with Groq AI...",
        "ai_pros": "Pros",
        "ai_cons": "Cons",
        "ai_error": "Error loading AI summary.",
        
        // Feedback Page
        "feedback_subtitle": "Help us improve the gaming multiverse.",
        "feedback_rate_label": "Rate your experience",
        "feedback_thoughts_label": "Your Thoughts",
        "feedback_placeholder": "Tell us what you think...",
        "feedback_send_btn": "Send Feedback",
        "feedback_sending": "Sending...",
        "feedback_thanks_title": "Thank You!",
        "feedback_thanks_desc": "Your feedback has been submitted successfully.",
        "feedback_error_title": "Error",
        "feedback_error_desc": "Failed to submit feedback. Please try again."
    },
    ar: {
        // Navigation
        "nav_timeline": "تسلسل السلاسل",
        "nav_feedback": "آراء المستخدمين",
        "nav_about": "عن الموقع",
        "nav_library": "المكتبة",
        "lang_toggle": "🌐 EN",

        // Index / Search
        "hero_title": "اكتشف لعبتك <span class='highlight'>المفضلة القادمة</span>",
        "search_placeholder": "اكتب اسم اللعبة...",
        "search_btn": "بحث",
        "loading_text": "جاري البحث في قاعدة البيانات...",
        "error_title": "لم يتم العثور على اللعبة",
        "error_desc": "لم نتمكن من إيجاد توصيات لهذه اللعبة، جرب اسماً آخر.",
        "target_label": "اللعبة الأساسية",
        "top_recommendations": "أفضل الترشيحات",
        "match_label": "تطابق",
        "view_steam": "شاهد على ستيم",
        "find_similar": "ابحث عن مشابه",
        "view_series": "عرض السلسلة",

        // About Modal
        "about_title": "عن Game Recommender",
        "about_desc": "مرحباً بك! ابحث عن لعبتك المفضلة وسنجد لك ألعاباً مشابهة بناءً على بيانات Steam. نسبة <span style='color: var(--accent); font-weight: bold;'>التطابق</span> توضح مدى تشابه اللعبة المقترحة مع بحثك.",
        "about_dev": "تصميم وتطوير <br><span class='highlight' style='font-size: 1.5rem; font-weight: 800; margin-top: 0.5rem; display: inline-block;'>معاذ علي علي</span>",

        // Series Page
        "series_timeline_title": "التسلسل الزمني <span class='highlight'>للقصة</span>",
        "back_to_search": "العودة للبحث",
        "show_all_games": "عرض كل الألعاب",
        "mainline_only": "ألعاب القصة الأساسية فقط",
        "mainline": "قصة أساسية",
        "spinoff": "لعبة فرعية",

        // Library Page
        "library_title": "مكتبة الألعاب",
        "library_desc": "تصفح جميع الألعاب المتاحة في قاعدة البيانات.",
        "total_games": "إجمالي الألعاب المحفوظة:",

        // Tooltips
        "shared_keywords_prefix": "يتشارك في: ",

        // AI Summary
        "ai_summary_btn": "✨ ملخص الذكاء الاصطناعي",
        "ai_summary_title": "✨ ملخص مراجعات اللعبة",
        "ai_loading": "جاري تحليل آلاف المراجعات باستخدام Groq AI...",
        "ai_pros": "المميزات",
        "ai_cons": "العيوب",
        "ai_error": "حدث خطأ أثناء تحميل الملخص.",
        
        // Feedback Page
        "feedback_subtitle": "ساعدنا في تحسين تجربة استكشاف الألعاب.",
        "feedback_rate_label": "قيّم تجربتك",
        "feedback_thoughts_label": "رأيك وانطباعك",
        "feedback_placeholder": "أخبرنا برأيك في الموقع...",
        "feedback_send_btn": "إرسال التقييم",
        "feedback_sending": "جاري الإرسال...",
        "feedback_thanks_title": "شكراً لك!",
        "feedback_thanks_desc": "تم إرسال تقييمك بنجاح وسنعمل على تحسين الموقع بناءً عليه.",
        "feedback_error_title": "خطأ",
        "feedback_error_desc": "فشل إرسال التقييم، يرجى المحاولة مرة أخرى."
    }
};

let currentLang = localStorage.getItem('site_lang') || 'en';

function applyLanguage() {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                el.placeholder = translations[currentLang][key];
            } else {
                el.innerHTML = translations[currentLang][key];
            }
        }
    });

    // Update body class for specific CSS adjustments if needed
    if (currentLang === 'ar') {
        document.body.classList.add('rtl-mode');
    } else {
        document.body.classList.remove('rtl-mode');
    }
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ar' : 'en';
    localStorage.setItem('site_lang', currentLang);
    applyLanguage();
}

document.addEventListener('DOMContentLoaded', () => {
    applyLanguage();

    // Bind the toggle button if it exists
    const langBtn = document.getElementById('langToggleBtn');
    if (langBtn) {
        langBtn.addEventListener('click', toggleLanguage);
    }
});
