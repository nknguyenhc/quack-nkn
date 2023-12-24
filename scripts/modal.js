document.addEventListener('alpine:init', () => {
    Alpine.data('modal', () => ({
        isOpen: false,
        init() {
            this.$watch('$store.modal.message', (message) => {
                if (message) {
                    this.isOpen = true;
                }
            });
        },
        closeModal() {
            this.isOpen = false;
            if (this.$store.modal.redirectLink) {
                location.replace(this.$store.modal.redirectLink);
            } else {
                this.$store.modal.setMessage('');
            }
        },
    }));
});
