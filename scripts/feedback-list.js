document.addEventListener('alpine:init', () => {
    Alpine.data('feedbacklist', () => ({
        feedbacks: [],
        init() {
            fetch('/api/feedback/get')
                .then(res => res.json())
                .then(res => this.feedbacks = res.feedbacks);
        },
    }));
});
