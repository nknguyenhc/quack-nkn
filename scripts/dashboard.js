document.addEventListener('alpine:init', () => {
    Alpine.data('dashboard', () => ({
        description: '',
        init() {
            const now = new Date();
            this.description = `Nov 2023 - ${now.toLocaleDateString('default', { month: 'short' })} ${now.getFullYear()}`;
        },
    }));
});

document.addEventListener('alpine:init', () => {
    Alpine.data('dashboardData', (title, color, id, route) => ({
        title: title,
        color: color,
        id: id,
        route: route,
        async init() {
            const [xData, yData] = this.fetchedDataToArray(await this.getData());
            const data = [
                {
                    x: xData,
                    y: yData,
                    type: 'bar',
                    marker: {
                        color: this.color,
                    },
                },
            ];
            
            const layout = {
                title: this.title,
                showlegend: false,
            };
            Plotly.newPlot(this.id, data, layout, {
                modeBarButtonsToRemove: ['toImage', 'pan', 'select', 'lasso', 'autoScale'],
                displaylogo: false,
                responsive: true,
            });
        },
        async getData() {
            return fetch(this.route)
                .then(res => res.json())
                .then(res => res.data);
        },
        fetchedDataToArray(data) {
            return [Object.keys(data), Object.values(data)];
        },
    }));
});
