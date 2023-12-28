document.addEventListener('alpine:init', () => {
    Alpine.data('login', () => ({
        username: '',
        password: '',
        submit() {
            submitJson('/user/login', {
                username: this.username,
                password: this.password,
            }).then(res => {
                if (res.message === 'Success') {
                    this.$store.modal.setMessage("Login successful!");
                    this.$store.modal.setRedirectLink("/");
                } else {
                    this.$store.modal.setMessage(res.message);
                }
            });
        },
    }));
});
