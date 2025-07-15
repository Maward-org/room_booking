frappe.provide("room_booking.RoomBooking");

room_booking.RoomBooking.BookingManager = class {
constructor({ wrapper, events = {} }) {
    if (!wrapper || !$(wrapper).length) {
        console.error('عنصر الـ wrapper غير موجود في الصفحة');
        return;
    }

    this.wrapper = $(wrapper);
    this.events = events;

    // ثم تستخدم الأحداث كالتالي:
    this.events.bookingUpdated && this.events.bookingUpdated();
}


    init() {
        this.renderBaseLayout();
        this.loadInitialBookings();
        this.setupEventListeners();
    }

    renderBaseLayout() {
        this.wrapper.html(`
            <div class="booking-manager">
                <div class="manager-header">
                    <h2><i class="fa fa-calendar-alt"></i> ${__('إدارة الحجوزات')}</h2>
                    <div class="header-actions">
                        <button class="btn btn-refresh">
                            <i class="fa fa-sync-alt"></i> ${__('تحديث')}
                        </button>
                        <button class="btn btn-add-booking">
                            <i class="fa fa-plus"></i> ${__('حجز جديد')}
                        </button>
                    </div>
                </div>
                
                <div class="loading-state" style="display:none;">
                    <div class="spinner"></div>
                    <p>${__('جاري التحميل...')}</p>
                </div>
                
                <div class="bookings-list">
                    <div class="list-header">
                        <div>${__('الغرفة')}</div>
                        <div>${__('التاريخ')}</div>
                        <div>${__('الوقت')}</div>
                        <div>${__('الحالة')}</div>
                    </div>
                    <div class="list-items"></div>
                </div>
                
                <div class="booking-details">
                    <div class="details-header">
                        <h3>${__('تفاصيل الحجز')}</h3>
                    </div>
                    <div class="details-content">
                        <div class="empty-state">
                            <i class="fa fa-calendar fa-3x"></i>
                            <p>${__('اختر حجزاً لعرض التفاصيل')}</p>
                        </div>
                    </div>
                    <div class="details-actions">
                        <button class="btn btn-modify">
                            <i class="fa fa-edit"></i> ${__('تعديل')}
                        </button>
                        <button class="btn btn-cancel">
                            <i class="fa fa-times"></i> ${__('إلغاء')}
                        </button>
                    </div>
                </div>
            </div>
        `);
    }

    async loadInitialBookings() {
        this.showLoading(true);
        
        const today = frappe.datetime.get_today();
        const start_date = frappe.datetime.add_days(today, -30);
        const end_date = frappe.datetime.add_days(today, 60);
        
        this.state.bookings = await this.fetchBookings(start_date, end_date);
        this.renderBookingsList();
        
        this.showLoading(false);
    }

    async fetchBookings(from_date, to_date) {
        const response = await frappe.call({
            method: 'room_booking.api.get_user_bookings',
            args: { from_date, to_date }
        });

        if (!response || !response.message) {
            console.error('استجابة غير صالحة من الخادم');
            return [];
        }

        return response.message.map(booking => ({
            id: booking.name,
            room: booking.rental_room,
            room_name: booking.room_name,
            date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
            customer: booking.customer_name,
            status: booking.status,
            amount: booking.total_amount
        }));
    }

    renderBookingsList() {
        const $list = this.wrapper.find('.list-items').empty();
        
        this.state.bookings.forEach(booking => {
            $list.append(`
                <div class="booking-item" data-booking-id="${booking.id}">
                    <div>${booking.room_name}</div>
                    <div>${frappe.datetime.str_to_user(booking.date)}</div>
                    <div>${booking.start_time} - ${booking.end_time}</div>
                    <div class="status-badge ${booking.status.toLowerCase()}">
                        ${this.getStatusText(booking.status)}
                    </div>
                </div>
            `);
        });
    }

    showBookingDetails(bookingId) {
        const booking = this.state.bookings.find(b => b.id === bookingId);
        if (!booking) return;

        this.currentBooking = booking;
        
        this.wrapper.find('.details-content').html(`
            <div class="booking-info">
                <h4>${booking.room_name}</h4>
                <div class="info-row">
                    <label>${__('التاريخ')}:</label>
                    <span>${frappe.datetime.str_to_user(booking.date)}</span>
                </div>
                <div class="info-row">
                    <label>${__('الوقت')}:</label>
                    <span>${booking.start_time} - ${booking.end_time}</span>
                </div>
                <div class="info-row">
                    <label>${__('الحالة')}:</label>
                    <span class="status-badge ${booking.status.toLowerCase()}">
                        ${this.getStatusText(booking.status)}
                    </span>
                </div>
                <div class="info-row">
                    <label>${__('المبلغ')}:</label>
                    <span>${booking.amount}</span>
                </div>
            </div>
        `);
        
        this.toggleActions(booking.status);
    }

    toggleActions(status) {
        const $actions = this.wrapper.find('.details-actions');
        
        if (status === 'Confirmed') {
            $actions.show();
        } else {
            $actions.hide();
        }
    }

    async cancelCurrentBooking() {
        if (!this.currentBooking) return;

        const confirmed = confirm(__('هل أنت متأكد من إلغاء هذا الحجز؟'));
        if (!confirmed) return;

        this.showLoading(true, __('جاري الإلغاء...'));
        
        await frappe.call({
            method: 'room_booking.api.cancel_booking',
            args: { booking_id: this.currentBooking.id }
        });
        
        this.showLoading(false);
        this.loadInitialBookings();
        this.wrapper.find('.details-content').html(`
            <div class="empty-state">
                <i class="fa fa-calendar fa-3x"></i>
                <p>${__('اختر حجزاً لعرض التفاصيل')}</p>
            </div>
        `);
    }

    setupEventListeners() {
        this.wrapper.on('click', '.btn-refresh', () => this.loadInitialBookings());
        this.wrapper.on('click', '.btn-cancel', () => this.cancelCurrentBooking());
        this.wrapper.on('click', '.btn-add-booking', () => frappe.set_route('app/room-booking'));
        
        this.wrapper.on('click', '.booking-item', (e) => {
            const bookingId = $(e.currentTarget).data('booking-id');
            this.showBookingDetails(bookingId);
        });
    }

    showLoading(show, message = __('جاري التحميل...')) {
        const $loader = this.wrapper.find('.loading-state');
        show ? $loader.show() : $loader.hide();
        if (message) $loader.find('p').text(message);
    }

    getStatusText(status) {
        const statusMap = {
            'Confirmed': __('مؤكد'),
            'Cancelled': __('ملغى'),
            'Completed': __('مكتمل')
        };
        return statusMap[status] || status;
    }
};