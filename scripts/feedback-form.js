document.addEventListener('alpine:init', () => {
    Alpine.data('feedback', () => ({
        name: '',
        contact: '',
        message: '',
        files: [],
        submit() {
            submitForm('/api/feedback/submit', {
                title: this.name,
                contact: this.contact,
                message: this.message,
                files: this.files,
            }).then(res => {
                if (res.message === 'Success') {
                    this.$store.modal.setMessage("Your feedback has been sent, we will take a look within the next few days!");
                    this.$store.modal.setRedirectLink("/");
                }
            });
        },
    }));
});
