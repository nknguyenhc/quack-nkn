document.addEventListener('alpine:init', () => {
    Alpine.data('files', () => ({
        files: [],
        init() {
            this.$watch('files', files => this.$dispatch('fileschanged', files));
        },
        removeFile(index) {
            this.files = this.files.filter((_, i) => i !== index);
        },
        handleFile(target) {
            this.files = [
                ...this.files,
                ...target.files,
            ];
            target.value = '';
        },
    }));
});
