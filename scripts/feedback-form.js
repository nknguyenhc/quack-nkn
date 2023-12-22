document.addEventListener('alpine:init', () => {
    Alpine.data('feedback', () => ({
        name: '',
        contact: '',
        message: '',
        files: [],
        submit() {
            console.log(this.name, this.contact, this.message, this.files);
        },
    }));
});
