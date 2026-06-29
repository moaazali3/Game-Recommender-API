document.addEventListener('DOMContentLoaded', () => {
    const starRating = document.getElementById('starRating');
    const stars = starRating.querySelectorAll('span');
    const ratingValueInput = document.getElementById('ratingValue');
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackText = document.getElementById('feedbackText');
    const feedbackSuccess = document.getElementById('feedbackSuccess');
    const feedbackError = document.getElementById('feedbackError');
    const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');

    // Update stars on UI load based on default value
    updateStars(parseInt(ratingValueInput.value));

    // Star interaction logic
    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            const val = parseInt(e.target.getAttribute('data-value'));
            ratingValueInput.value = val;
            updateStars(val);
        });

        star.addEventListener('mouseover', (e) => {
            const val = parseInt(e.target.getAttribute('data-value'));
            highlightStars(val);
        });

        star.addEventListener('mouseleave', () => {
            updateStars(parseInt(ratingValueInput.value));
        });
    });

    function highlightStars(val) {
        stars.forEach(s => {
            const starVal = parseInt(s.getAttribute('data-value'));
            if (starVal <= val) {
                s.style.color = 'var(--accent)';
                s.style.textShadow = '0 0 15px var(--accent)';
            } else {
                s.style.color = 'rgba(255, 255, 255, 0.1)';
                s.style.textShadow = 'none';
            }
        });
    }

    function updateStars(val) {
        stars.forEach(s => {
            const starVal = parseInt(s.getAttribute('data-value'));
            if (starVal <= val) {
                s.classList.add('active');
                s.style.color = ''; // reset inline styles to rely on CSS
                s.style.textShadow = '';
            } else {
                s.classList.remove('active');
                s.style.color = 'rgba(255, 255, 255, 0.1)';
                s.style.textShadow = 'none';
            }
        });
    }

    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const text = feedbackText.value.trim();
        const rating = parseInt(ratingValueInput.value);
        
        if (!text) return;

        submitFeedbackBtn.textContent = 'Sending...';
        submitFeedbackBtn.disabled = true;
        feedbackError.classList.add('hidden');

        try {
            const payload = {
                description: text,
                rating: rating
            };

            const response = await fetch('/api/Recommendations/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to submit feedback');
            }

            // Success
            feedbackForm.classList.add('hidden');
            feedbackSuccess.classList.remove('hidden');

        } catch (error) {
            console.error('Feedback error:', error);
            feedbackError.classList.remove('hidden');
            submitFeedbackBtn.textContent = 'Send Feedback';
            submitFeedbackBtn.disabled = false;
        }
    });
});
