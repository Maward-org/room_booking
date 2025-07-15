frappe.provide("room_booking.RoomBooking");

/**
 * 📊 نظام تحليلات متقدم مع رسوم بيانية تفاعلية
 */
room_booking.RoomBooking.AnalyticsDashboard = class {
    constructor() {
        this.charts = {};
        this.init();
    }

    async init() {
        await this.loadData();
        this.render();
        this.initCharts();
    }

    async loadData() {
        try {
            const { message } = await frappe.call({
                method: 'room_booking.api.get_booking_analytics'
            });
            this.analyticsData = message;
        } catch (error) {
            console.error("Failed to load analytics:", error);
        }
    }

    render() {
        this.container = $(`
            <div class="analytics-dashboard">
                <div class="dashboard-header">
                    <h3><i class="fa fa-chart-bar"></i> ${__('إحصائيات الحجوزات')}</h3>
                    <div class="time-filters">
                        <select class="form-control period-filter">
                            <option value="day">${__('اليوم')}</option>
                            <option value="week">${__('الأسبوع')}</option>
                            <option value="month" selected>${__('الشهر')}</option>
                            <option value="year">${__('السنة')}</option>
                        </select>
                    </div>
                </div>
                
                <div class="stats-cards">
                    <div class="stat-card total-bookings">
                        <h4>${__('إجمالي الحجوزات')}</h4>
                        <div class="value">0</div>
                    </div>
                    <div class="stat-card revenue">
                        <h4>${__('إجمالي الإيرادات')}</h4>
                        <div class="value">0 SAR</div>
                    </div>
                    <div class="stat-card occupancy-rate">
                        <h4>${__('معدل الإشغال')}</h4>
                        <div class="value">0%</div>
                    </div>
                </div>
                
                <div class="charts-container">
                    <div class="chart-container bookings-chart">
                        <canvas id="bookingsTrendChart"></canvas>
                    </div>
                    <div class="chart-container revenue-chart">
                        <canvas id="revenueTrendChart"></canvas>
                    </div>
                </div>
            </div>
        `);

        this.bindEvents();
    }

    initCharts() {
        // مخطط اتجاه الحجوزات
        this.charts.bookingsTrend = new Chart(
            this.container.find('#bookingsTrendChart')[0].getContext('2d'),
            {
                type: 'line',
                data: this.prepareBookingsData(),
                options: this.getChartOptions(__('تطور الحجوزات'))
            }
        );

        // مخطط اتجاه الإيرادات
        this.charts.revenueTrend = new Chart(
            this.container.find('#revenueTrendChart')[0].getContext('2d'),
            {
                type: 'bar',
                data: this.prepareRevenueData(),
                options: this.getChartOptions(__('تطور الإيرادات'), 'SAR')
            }
        );
    }

    prepareBookingsData() {
        return {
            labels: this.analyticsData.labels,
            datasets: [{
                label: __('عدد الحجوزات'),
                data: this.analyticsData.bookings,
                borderColor: '#4e73df',
                backgroundColor: 'rgba(78, 115, 223, 0.05)',
                tension: 0.3
            }]
        };
    }

    prepareRevenueData() {
        return {
            labels: this.analyticsData.labels,
            datasets: [{
                label: __('الإيرادات'),
                data: this.analyticsData.revenue,
                backgroundColor: '#1cc88a',
                borderRadius: 3
            }]
        };
    }

    getChartOptions(title, unit='') {
        return {
            responsive: true,
            plugins: {
                title: { display: true, text: title },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.raw} ${unit}`
                    }
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        };
    }

    bindEvents() {
        this.container.on('change', '.period-filter', async () => {
            await this.loadData();
            this.updateCharts();
            this.updateStats();
        });
    }

    updateCharts() {
        this.charts.bookingsTrend.data = this.prepareBookingsData();
        this.charts.revenueTrend.data = this.prepareRevenueData();
        this.charts.bookingsTrend.update();
        this.charts.revenueTrend.update();
    }

    updateStats() {
        this.container.find('.total-bookings .value').text(
            this.analyticsData.total_bookings
        );
        
        this.container.find('.revenue .value').text(
            room_booking.RoomBooking.helpers.formatCurrency(this.analyticsData.total_revenue)
        );
        
        this.container.find('.occupancy-rate .value').text(
            `${this.analyticsData.occupancy_rate}%`
        );
    }
};