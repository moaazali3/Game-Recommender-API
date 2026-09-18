import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    // Nav
    brand_name: 'Ludova',
    brand_subtitle: 'Games Discovery',
    nav_ludova_hub: '← Ludova Hub',
    nav_discover: 'Discover',
    nav_series: 'Game Series',
    nav_library: 'All Games',
    nav_feedback: 'Feedback',
    nav_about: 'About',
    lang_btn_text: 'العربية',
    
    // Discover / Home
    hero_badge: 'Smart Game Discovery',
    hero_title_prefix: 'Find Games That Match Your',
    hero_title_highlight: 'Exact Taste',
    hero_subtitle: 'Discover your next favorite game using Steam community reviews, gameplay tags, and story timelines.',
    search_placeholder: 'Search any game (supports GTA, DS3, RE4, GoW)...',
    search_btn: 'Discover',
    recent_searches_title: 'Recent Searches',
    clear_recent: 'Clear',
    
    // Single & Multi-Game Mode
    single_mode_label: 'Single Game',
    blend_mode_label: 'Mix Games (Taste Fusion)',
    blend_mode_hint: 'Add up to 4 games to find titles that combine their gameplay, style, and tone.',
    blend_add_placeholder: 'Add game to mix (e.g. GTA V, Cyberpunk, Witcher 3)...',
    blend_btn: 'Mix & Discover',
    blend_target_title: 'Blended Games',
    blend_selected_games: 'Games in the Mix',
    blend_remove: 'Remove',
    blend_max_reached: 'Maximum 4 games can be mixed',

    // States
    loading_searching: 'Analyzing Steam community reviews and gameplay tags...',
    error_not_found_title: 'Game Not Found in Database',
    error_not_found_desc: 'We couldn’t find recommendations for this title yet. Try another game or check the All Games database.',
    error_generic: 'An unexpected error occurred while communicating with the server.',
    try_again: 'Try Again',
    share_results: 'Share Search',
    link_copied: 'Link Copied to Clipboard!',
    
    // Cards & Badges
    target_badge: 'Selected Game',
    recommendations_title: 'Top Recommended Games',
    recommendations_count: 'matches found',
    match_score: 'Match Score',
    view_steam: 'Steam',
    find_similar: 'Find Similar',
    view_series: 'View Series',
    ai_summary_btn: 'Player Reviews Summary',
    mature_warning: '18+ Mature',
    mainline_badge: 'Mainline',
    spinoff_badge: 'Spin-off',
    
    // AI Summary Modal
    ai_modal_title: 'Steam Player Reviews Summary',
    ai_analyzing: 'Analyzing player reviews from Steam in real time...',
    ai_pros: 'What Players Loved (Pros)',
    ai_cons: 'What Players Disliked (Cons)',
    ai_source: 'Source',
    ai_source_groq: 'Live Review Analysis',
    ai_source_cache: 'Verified Community Summary',
    
    // Series
    series_hero_badge: 'Series & Sequels',
    series_title_prefix: 'Game Series &',
    series_title_highlight: 'Story Order',
    series_subtitle: 'Explore gaming franchises in their true chronological story order and release sequence.',
    series_search_placeholder: 'Search a series (e.g. Dark Souls, Resident Evil, God of War)...',
    mainline_toggle_label: 'Mainline Canon Games Only',
    timeline_chronological_order: 'Story Order #',
    timeline_release_date: 'Release Date',
    series_empty_title: 'Choose a Game Series',
    series_empty_desc: 'Select a series above to see all its games in chronological story order.',
    
    // Library
    library_hero_badge: 'All Games Index',
    library_title_prefix: 'Complete Games',
    library_title_highlight: 'Catalog',
    library_subtitle: 'Browse all games in the database with instant search and pagination.',
    total_games_label: 'Total Indexed Games',
    library_search_placeholder: 'Filter games by name...',
    library_no_match: 'No games matched your query.',
    
    // Feedback
    feedback_hero_badge: 'Community Voice',
    feedback_title_prefix: 'Share Your Experience with',
    feedback_title_highlight: 'Ludova',
    feedback_subtitle: 'Your suggestions help us improve recommendations and add new games and series.',
    feedback_rating_label: 'Your Rating',
    feedback_text_label: 'Your Thoughts & Suggestions',
    feedback_placeholder: 'What did you like? What features or franchises should we add next?',
    feedback_submit_btn: 'Submit Feedback',
    feedback_submitting: 'Submitting...',
    feedback_success_title: 'Thank You for Your Feedback!',
    feedback_success_desc: 'Your review has been recorded and will guide our next updates.',
    feedback_send_another: 'Send Another Note',
    feedback_wall_title: 'Recent Player Reviews',
    feedback_wall_subtitle: 'Real feedback shared by gamers using Ludova.',
    feedback_no_reviews: 'No reviews yet. Be the first to share your thoughts!',
    
    // About Modal
    about_modal_title: 'About Ludova Games',
    about_subtitle: 'v2.5 • AI Neural Recommendation Engine',
    about_p1: 'Ludova Games is an intelligent discovery platform powered by advanced Machine Learning. Instead of relying on generic genres, our neural recommendation engine deeply analyzes Steam community reviews, gameplay tags, and player affinities to deliver spot-on matches for your favorite titles.',
    about_p2: 'Explore single games with fine-tuned affinity tiers, blend multiple games using Taste Fusion, browse complete game series in their true story chronology, or get instant AI-powered Steam review summaries—all wrapped in a fast, fully mobile-responsive interface.',
    about_feat_ml_title: 'Neural ML Recommendation Engine',
    about_feat_ml_desc: 'Powered by Hugging Face deep learning embeddings and cosine similarity across thousands of indexed Steam titles.',
    about_feat_warmup_title: 'Smart In-Memory Caching',
    about_feat_warmup_desc: 'High-performance 24h caching reduces server overhead and delivers instant repeat discoveries.',
    about_feat_fusion_title: 'Taste Fusion & Franchise Timelines',
    about_feat_fusion_desc: 'Blend multiple titles to discover hybrid gems, or navigate iconic franchises in chronological narrative order.',
    about_team_title: 'Project Engineering & Contributors',
    about_dev1_name: 'Moaaz Ali Ali',
    about_dev1_role: 'Lead Developer & Software Engineer',
    about_dev1_desc: 'Full-stack platform architecture, ASP.NET Core APIs, UI/UX design, and database systems.',
    about_dev2_name: 'Abdallah Abukhalil',
    about_dev2_role: 'Machine Learning Engineer & Data Analyst',
    about_dev2_desc: 'Machine Learning recommendation model development, similarity algorithms, and Hugging Face neural inference.',
    about_view_linkedin: 'LinkedIn Profile',

    // 404
    not_found_title: '404 - Page Not Found',
    not_found_desc: 'The page you are looking for does not exist or has moved.',
    back_home: 'Back to Discovery'
  },
  ar: {
    // Nav
    brand_name: 'Ludova',
    brand_subtitle: 'استكشاف الألعاب',
    nav_ludova_hub: '← بوابة Ludova',
    nav_discover: 'الاستكشاف',
    nav_series: 'سلاسل الألعاب',
    nav_library: 'كل الألعاب',
    nav_feedback: 'التقييمات',
    nav_about: 'عن الموقع',
    lang_btn_text: 'English',
    
    // Discover / Home
    hero_badge: 'استكشاف الألعاب الذكي',
    hero_title_prefix: 'اعثر على ألعاب تناسب',
    hero_title_highlight: 'ذوقك الحقيقي',
    hero_subtitle: 'ابحث عن ألعابك القادمة عبر تحليل مراجعات مجتمع Steam الحقيقية، والكلمات المفتاحية، وترتيب قصص السلاسل.',
    search_placeholder: 'ابحث عن أي لعبة (يدعم اختصارات مثل GTA, DS3, RE4, GoW)...',
    search_btn: 'استكشف',
    recent_searches_title: 'عمليات البحث الأخيرة',
    clear_recent: 'مسح',
    
    // Single & Multi-Game Mode
    single_mode_label: 'بحث عن لعبة',
    blend_mode_label: 'دمج ألعاب متعددة (Taste Fusion)',
    blend_mode_hint: 'أضف حتى 4 ألعاب للعثور على ألعاب تجمع بين أساليبها وعوالمها معاً.',
    blend_add_placeholder: 'أضف لعبة للدمج (مثال: GTA V، Cyberpunk، Witcher 3)...',
    blend_btn: 'دمج واكتشاف',
    blend_target_title: 'الألعاب المدمجة',
    blend_selected_games: 'الألعاب المختارة للدمج',
    blend_remove: 'إزالة',
    blend_max_reached: 'الحد الأقصى 4 ألعاب',

    // States
    loading_searching: 'جاري مطابقة الألعاب وتحليل مراجعات Steam...',
    error_not_found_title: 'لم يتم العثور على اللعبة في قاعدة البيانات',
    error_not_found_desc: 'لم نتمكن من إيجاد ترشيحات لهذه اللعبة حتى الآن. جرب اسماً آخر أو تصفح قسم كل الألعاب.',
    error_generic: 'حدث خطأ غير متوقع أثناء الاتصال بالخادم.',
    try_again: 'إعادة المحاولة',
    share_results: 'مشاركة البحث',
    link_copied: 'تم نسخ الرابط إلى الحافظة!',
    
    // Cards & Badges
    target_badge: 'اللعبة المختارة',
    recommendations_title: 'أفضل الألعاب المرشحة',
    recommendations_count: 'ألعاب مطابقة',
    match_score: 'نسبة التطابق',
    view_steam: 'متجر Steam',
    find_similar: 'ألعاب مشابهة',
    view_series: 'عرض السلسلة',
    ai_summary_btn: 'ملخص مراجعات اللاعبين',
    mature_warning: '18+ محتوى للبالغين',
    mainline_badge: 'جزء رئيسي',
    spinoff_badge: 'لعبة فرعية',
    
    // AI Summary Modal
    ai_modal_title: 'ملخص مراجعات مجتمع Steam',
    ai_analyzing: 'جاري استخراج وتحليل مراجعات اللاعبين من Steam...',
    ai_pros: 'أبرز ما أعجب اللاعبين (المميزات)',
    ai_cons: 'أبرز انتقادات اللاعبين (العيوب)',
    ai_source: 'المصدر',
    ai_source_groq: 'تحليل مراجعات فوري',
    ai_source_cache: 'ملخص مجتمعي محفوظ',
    
    // Series
    series_hero_badge: 'سلاسل الألعاب',
    series_title_prefix: 'ترتيب وقصص',
    series_title_highlight: 'سلاسل الألعاب',
    series_subtitle: 'تصفح سلاسل الألعاب بالترتيب الزمني الصحيح للقصة وتاريخ الإصدارات.',
    series_search_placeholder: 'ابحث عن سلسلة (مثال: Dark Souls، Resident Evil، God of War)...',
    mainline_toggle_label: 'الأجزاء الرئيسية للقصة فقط',
    timeline_chronological_order: 'ترتيب القصة #',
    timeline_release_date: 'تاريخ الإصدار',
    series_empty_title: 'اختر سلسلة ألعاب',
    series_empty_desc: 'اختر إحدى السلاسل لعرض جميع أجزائها بالترتيب الزمني الصحيح لأحداث القصة.',
    
    // Library
    library_hero_badge: 'دليل الألعاب',
    library_title_prefix: 'دليل',
    library_title_highlight: 'كل الألعاب',
    library_subtitle: 'تصفح كل الألعاب الموجودة في قاعدة البيانات مع الفلترة اللحظية والتنقل بين الصفحات.',
    total_games_label: 'إجمالي الألعاب',
    library_search_placeholder: 'ابحث عن أي لعبة بالاسم...',
    library_no_match: 'لا توجد ألعاب مطابقة لكلمة البحث.',
    
    // Feedback
    feedback_hero_badge: 'رأي اللاعبين',
    feedback_title_prefix: 'شارك برأيك في تطوير',
    feedback_title_highlight: 'Ludova',
    feedback_subtitle: 'رأيك واقتراحاتك تساعدنا على تحسين الترشيحات وإضافة سلاسل وألعاب جديدة.',
    feedback_rating_label: 'تقييمك للتجربة',
    feedback_text_label: 'رأيك واقتراحاتك',
    feedback_placeholder: 'ما الذي أعجبك؟ وما هي الميزات أو الألعاب التي تحب إضافتها؟',
    feedback_submit_btn: 'إرسال التقييم',
    feedback_submitting: 'جاري الإرسال...',
    feedback_success_title: 'شكراً لرأيك ومشاركتك!',
    feedback_success_desc: 'تم تسجيل تقييمك بنجاح وسنأخذ به في التحديثات القادمة.',
    feedback_send_another: 'إرسال تقييم آخر',
    feedback_wall_title: 'أحدث آراء اللاعبين',
    feedback_wall_subtitle: 'انطباعات حقيقية شاركها اللاعبون في Ludova.',
    feedback_no_reviews: 'لا توجد تقييمات بعد. كن أول من يشاركنا رأيه!',
    
    // About Modal
    about_modal_title: 'عن موقع Ludova Games',
    about_subtitle: 'v2.5 • محرك ذكاء اصطناعي وتعلم آلي فائق الدقة',
    about_p1: 'منصة Ludova Games هي أداة ذكية لاكتشاف الألعاب مدعومة بمحرك تعلم آلي (Machine Learning) متطور. بدلاً من الاعتماد على التصنيفات السطحية، يقوم نموذج الذكاء الاصطناعي بتحليل عميق لآلاف مراجعات مجتمع Steam الحقيقية وسلوك اللاعبين وميكانيكيات اللعب لترشيح ألعاب تشبه ذوقك الحقيقي بدقة متناهية.',
    about_p2: 'يمكنك استكشاف ألعاب فردية بنظام تقييم التوافق المطور، أو دمج حتى 4 ألعاب بميزة (Taste Fusion) لاكتشاف ألعاب هجينة تجمع بين عوالمك المفضلة، أو تصفح سلاسل الألعاب بالترتيب الزمني الصحيح لأحداث القصة، بالإضافة لملخصات مراجعات اللاعبين الفورية — مع تجربة سلسة ومتوافقة بالكامل مع الهواتف الذكية.',
    about_feat_ml_title: 'محرك تعلم آلي عصبي (Neural ML)',
    about_feat_ml_desc: 'مدعوم بنماذج تعلّم آلي متقدمة على Hugging Face لحساب نسب التطابق والتشابه عبر تمثيل متجهي عميق.',
    about_feat_warmup_title: 'تخزين مؤقت ذكي واستجابة فائقة',
    about_feat_warmup_desc: 'نظام كاش متطور يحفظ نتائج الترشيحات لتقديم استجابات فورية وتقليل استهلاك موارد الخوادم.',
    about_feat_fusion_title: 'دمج الألعاب والسلاسل القصصية',
    about_feat_fusion_desc: 'دمج أذواق ألعاب متعددة وتصفح تسلسل أجزاء السلاسل الكبرى بحسب أحداث القصة وتاريخ الإصدار.',
    about_team_title: 'فريق التطوير والذكاء الاصطناعي',
    about_dev1_name: 'معاذ علي علي (Moaaz Ali)',
    about_dev1_role: 'مطور المنصة وهندسة البرمجيات',
    about_dev1_desc: 'معمارية النظام الكاملة (Full-Stack)، تكامل خوادم ASP.NET Core، تصميم الواجهات التفاعلية وإدارة قواعد البيانات.',
    about_dev2_name: 'عبد الله أبو خليل (Abdallah Abukhalil)',
    about_dev2_role: 'مهندس تعلّم آلي ومحلل بيانات (ML Engineer)',
    about_dev2_desc: 'تصميم وتدريب نموذج التعلّم الآلي (Machine Learning) للترشيحات، وتطوير خوارزميات التشابه المتجهي على Hugging Face.',
    about_view_linkedin: 'حساب LinkedIn',

    // 404
    not_found_title: '404 - الصفحة غير موجودة',
    not_found_desc: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.',
    back_home: 'العودة للاستكشاف'
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('ludova_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('ludova_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (lang === 'ar') {
      document.body.classList.add('rtl-mode');
    } else {
      document.body.classList.remove('rtl-mode');
    }
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => (prev === 'en' ? 'ar' : 'en'));
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, isRTL: lang === 'ar', toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
