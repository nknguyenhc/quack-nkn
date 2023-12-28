document.addEventListener('alpine:init', () => {
    Alpine.data('header', () => ({
        items: [
            {
                text: "Home",
                link: "/",
            },
            {
                text: "Dashboard",
                link: "/dashboard",
            },
            {
                text: "Feedback",
                link: "/feedback",
            },
        ],

        isOnLink(link) {
            return link === window.location.pathname;
        }
    }));
});
