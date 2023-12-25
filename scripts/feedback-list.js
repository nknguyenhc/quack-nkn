document.addEventListener('alpine:init', () => {
    Alpine.data('feedbacklist', () => ({
        init() {
            fetch('/api/feedback/get')
                .then(res => res.json())
                .then(res => console.log(res));
        },
    }));
});
