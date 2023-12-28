document.addEventListener('alpine:init', () => {
    Alpine.data('landing', () => ({
        frames: [
            "/favicon.ico",
            "/static/assets/landing-1.png",
            "/static/assets/landing-2.png",
            "/static/assets/landing-3.png",
        ],
        showIndex: 0,
        secondsPerFrame: 5,
        init() {
            const callback = () => {
                this.nextImg();
                setTimeout(callback, this.secondsPerFrame * 1000);
            };
            setTimeout(callback, this.secondsPerFrame * 1000);
        },
        nextImg() {
            this.showIndex = (this.showIndex + 1) % this.frames.length;
        },
        lastImg() {
            this.showIndex = (this.showIndex - 1 + this.frames.length) % this.frames.length;
        },
        handleFrame(event) {
            if (event.clientX < window.innerWidth / 2) {
                this.lastImg();
            } else {
                this.nextImg();
            }
        }
    }));
});
