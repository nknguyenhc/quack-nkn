document.addEventListener('alpine:init', () => {
    Alpine.data('status', () => ({
        isLoaded: false,
        isLoggedIn: false,
        username: '',
        init() {
            fetch('/user/current-user')
                .then(res => res.json())
                .then(res => {
                    this.isLoaded = true;
                    this.isLoggedIn = res.isLoggedIn;
                    if (res.isLoggedIn) {
                        this.username = res.username;
                    }
                });
        },
        logout() {
            fetch('/user/logout')
                .then(res => res.json())
                .then(res => {
                    if (res.message === 'Success') {
                        this.$store.modal.setMessage("Logout successful!");
                        this.$store.modal.setRedirectLink("/");
                    }
                });
        },
    }));
});
