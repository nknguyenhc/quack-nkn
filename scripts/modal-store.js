document.addEventListener('alpine:init', () => {
    Alpine.store('modal', {
        message: '',
        setMessage(message) {
            this.message = message;
        },
        redirectLink: '',
        setRedirectLink(link) {
            this.redirectLink = link;
        }
    });
});
