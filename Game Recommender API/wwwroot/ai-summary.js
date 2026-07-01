document.addEventListener('DOMContentLoaded', () => {
    // Inject the AI Modal HTML into the body
    const modalHtml = `
        <div id="aiSummaryModal" class="ai-modal">
            <div class="ai-modal-content">
                <span class="ai-modal-close" id="aiModalClose">&times;</span>
                <h2 class="ai-modal-title" data-i18n="ai_summary_title">&#x2728; AI Review Summary</h2>
                <div id="aiModalBody">
                    <!-- Content injected here -->
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('aiSummaryModal');
    const closeBtn = document.getElementById('aiModalClose');
    const modalBody = document.getElementById('aiModalBody');

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });

    // Make fetch function available globally
    window.openAISummary = async (appId) => {
        modal.classList.add('show');
        modalBody.innerHTML = `
            <div class="ai-loading-container">
                <div class="ai-loading-spinner"></div>
                <p data-i18n="ai_loading">Analyzing thousands of reviews with Groq AI...</p>
            </div>
        `;

        if (typeof applyLanguage === 'function') applyLanguage();

        try {
            const response = await fetch(`/api/reviews/${appId}/ai-summary`);
            if (!response.ok) throw new Error('Failed to fetch summary');
            const data = await response.json();

            // Format the text
            const rawSummary = data.summary || data.Summary || '';
            const sourceText = data.source || data.Source || 'Groq AI';

            let htmlContent = '';

            if (rawSummary) {
                const lines = rawSummary.split('\n').filter(l => l.trim() !== '');
                let inPros = false;
                let inCons = false;

                let prosHtml = '<ul class="ai-pro-list">';
                let consHtml = '<ul class="ai-con-list">';
                let generalHtml = '';

                lines.forEach(line => {
                    const cleanLine = line.replace(/^[-\*]\s*/, '').trim();
                    if (!cleanLine) return;

                    const lowerLine = line.toLowerCase();

                    if (lowerLine.startsWith('pros') || lowerLine.startsWith('الايجابيات') || lowerLine.startsWith('المميزات')) {
                        inPros = true;
                        inCons = false;
                    } else if (lowerLine.startsWith('cons') || lowerLine.startsWith('السلبيات') || lowerLine.startsWith('العيوب')) {
                        inCons = true;
                        inPros = false;
                    } else if (inPros) {
                        prosHtml += `<li>${cleanLine}</li>`;
                    } else if (inCons) {
                        consHtml += `<li>${cleanLine}</li>`;
                    } else {
                        generalHtml += `<p>${cleanLine}</p>`;
                    }
                });

                prosHtml += '</ul>';
                consHtml += '</ul>';

                htmlContent = generalHtml;
                if (prosHtml.length > 25) htmlContent += `<h3 style="color: #22c55e; margin-top: 15px;" data-i18n="ai_pros">Pros</h3>` + prosHtml;
                if (consHtml.length > 25) htmlContent += `<h3 style="color: #ef4444; margin-top: 15px;" data-i18n="ai_cons">Cons</h3>` + consHtml;

            } else {
                htmlContent = `<p data-i18n="ai_error">No summary available.</p>`;
            }

            htmlContent += `<div class="ai-source">Source: ${sourceText}</div>`;

            modalBody.innerHTML = htmlContent;
            if (typeof applyLanguage === 'function') applyLanguage();

        } catch (error) {
            console.error('AI Summary Error:', error);
            modalBody.innerHTML = `<div class="error-card"><h3 data-i18n="ai_error">Error loading summary</h3></div>`;
            if (typeof applyLanguage === 'function') applyLanguage();
        }
    };
});
