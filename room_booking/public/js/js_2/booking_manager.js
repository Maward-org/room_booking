frappe.provide("room_booking.RoomBooking");

/**
 * نظام إدارة الحجوزات - الإصدار المحسن
 * @class room_booking.RoomBooking.BookingManager
 */
room_booking.RoomBooking.BookingManager = class {
    constructor({ wrapper, onBookingUpdate }) {
        this.wrapper = $(wrapper);
        this.onBookingUpdate = onBookingUpdate || function() {};
        this.currentBooking = null;
        this.state = {
            isLoading: false,
            bookings: [],
            filters: {
                status: 'all',
                date_range: 'this_week'
            }
        };

        this.init();
    }

    async init() {
        this.render();
        this.setupEventListeners();
        await this.loadBookings();
    }

    render() {
        this.wrapper.html(`
            <div class="booking-manager">
                <!-- شريط التحكم -->
                <div class="manager-toolbar">
                    <h3><i class="fa fa-calendar-alt"></i> ${__('إدارة الحجوزات')}</h3>
                    
                    <div class="toolbar-actions">
                        <div class="filter-group">
                            <select class="form-control status-filter">
                                <option value="all">${__('كل الحالات')}</option>
                                <option value="Confirmed">${__('مؤكدة')}</option>
                                <option value="Pending">${__('قيد الانتظار')}</option>
                                <option value="Cancelled">${__('ملغاة')}</option>
                            </select>
                            
                            <select class="form-control date-filter">
                                <option value="today">${__('اليوم')}</option>
                                <option value="this_week" selected>${__('هذا الأسبوع')}</option>
                                <option value="next_week">${__('الأسبوع القادم')}</option>
                                <option value="this_month">${__('هذا الشهر')}</option>
                            </select>
                        </div>
                        
                        <button class="btn btn-refresh">
                            <i class="fa fa-sync-alt"></i> ${__('تحديث')}
                        </button>
                    </div>
                </div>
                
                <!-- حالة التحميل -->
                <div class="loading-state">
                    <div class="spinner-border"></div>
                    <p>${__('جاري تحميل الحجوزات...')}</p>
                </div>
                
                <!-- قائمة الحجوزات -->
                <div class="bookings-list">
                    <div class="list-header">
                        <div class="header-item">${__('الغرفة')}</div>
                        <div class="header-item">${__('التاريخ والوقت')}</div>
                        <div class="header-item">${__('الحالة')}</div>
                        <div class="header-item">${__('العميل')}</div>
                        <div class="header-item">${__('المبلغ')}</div>
                        <div class="header-item">${__('الإجراءات')}</div>
                    </div>
                    <div class="list-items"></div>
                </div>
                
                <!-- تفاصيل الحجز -->
                <div class="booking-details">
                    <div class="details-header">
                        <h4>${__('تفاصيل الحجز')}</h4>
                        <button class="btn btn-close-details">
                            <i class="fa fa-times"></i>
                        </button>
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

    async loadBookings() {
        try {
            this.setLoading(true);
            
            const filters = {
                status: this.wrapper.find('.status-filter').val(),
                date_range: this.wrapper.find('.date-filter').val()
            };

            const { message: bookings } = await frappe.call({
                method: 'room_booking.api.get_user_bookings',
                args: { filters }
            });

            this.state.bookings = bookings;
            this.renderBookingsList();
            this.onBookingUpdate(bookings);
            
        } catch (error) {
            frappe.msgprint({
                title: __('خطأ'),
                message: __('تعذر تحميل الحجوزات: ') + error.message,
                indicator: 'red'
            });
        } finally {
            this.setLoading(false);
        }
    }

    renderBookingsList() {
        const $list = this.wrapper.find('.list-items').empty();
        
        if (!this.state.bookings.length) {
            $list.html(`
                <div class="empty-list">
                    <i class="fa fa-calendar-times"></i>
                    <p>${__('لا توجد حجوزات متاحة')}</p>
                </div>
            `);
            return;
        }

        this.state.bookings.forEach(booking => {
            const $item = $(`
                <div class="booking-item" data-booking-id="${booking.name}">
                    <div class="item-col room-col">
                        <i class="fa fa-door-open"></i>
                        ${booking.room_name}
                    </div>
                    <div class="item-col date-col">
                        ${frappe.datetime.str_to_user(booking.start_time)}
                    </div>
                    <div class="item-col status-col">
                        <span class="status-badge ${booking.status.toLowerCase()}">
                            ${this.getStatusText(booking.status)}
                        </span>
                    </div>
                    <div class="item-col customer-col">
                        ${booking.customer_name}
                    </div>
                    <div class="item-col amount-col">
                        ${this.formatCurrency(booking.total_amount)}
                    </div>
                    <div class="item-col actions-col">
                        <button class="btn btn-view">
                            <i class="fa fa-eye"></i>
                        </button>
                    </div>
                </div>
            `);
            
            $list.append($item);
        });
    }

    showBookingDetails(bookingId) {
        const booking = this.state.bookings.find(b => b.name === bookingId);
        if (!booking) return;

        this.currentBooking = booking;
        
        const $details = this.wrapper.find('.details-content');
        $details.html(`
            <div class="booking-info">
                <div class="info-row">
                    <label>${__('الغرفة')}:</label>
                    <span>${booking.room_name}</span>
                </div>
                <div class="info-row">
                    <label>${__('العميل')}:</label>
                    <span>${booking.customer_name}</span>
                </div>
                <div class="info-row">
                    <label>${__('تاريخ البدء')}:</label>
                    <span>${frappe.datetime.str_to_user(booking.start_time)}</span>
                </div>
                <div class="info-row">
                    <label>${__('تاريخ الانتهاء')}:</label>
                    <span>${frappe.datetime.str_to_user(booking.end_time)}</span>
                </div>
                <div class="info-row">
                    <label>${__('المدة')}:</label>
                    <span>${this.calculateDuration(booking.start_time, booking.end_time)}</span>
                </div>
                <div class="info-row">
                    <label>${__('المبلغ')}:</label>
                    <span>${this.formatCurrency(booking.total_amount)}</span>
                </div>
                <div class="info-row">
                    <label>${__('الحالة')}:</label>
                    <span class="status-badge ${booking.status.toLowerCase()}">
                        ${this.getStatusText(booking.status)}
                    </span>
                </div>
                <div class="info-row notes-row">
                    <label>${__('ملاحظات')}:</label>
                    <p>${booking.notes || __('لا توجد ملاحظات')}</p>
                </div>
            </div>
        `);
        
        this.wrapper.find('.booking-details').addClass('active');
        this.toggleActions(booking.status);
    }

    toggleActions(status) {
        const $actions = this.wrapper.find('.details-actions');
        $actions.toggle(status !== 'Cancelled');
        
        if (status === 'Confirmed') {
            $actions.find('.btn-cancel').show();
            $actions.find('.btn-modify').show();
        } else if (status === 'Pending') {
            $actions.find('.btn-cancel').show();
            $actions.find('.btn-modify').hide();
        } else {
            $actions.hide();
        }
    }

    async cancelCurrentBooking() {
        if (!this.currentBooking) return;

        frappe.confirm(
            __('هل أنت متأكد من إلغاء هذا الحجز؟'),
            async () => {
                try {
                    this.setLoading(true, __('جاري إلغاء الحجز...'));
                    
                    await frappe.call({
                        method: 'room_booking.api.cancel_booking',
                        args: { booking_id: this.currentBooking.name }
                    });
                    
                    frappe.show_alert({
                        message: __('تم إلغاء الحجز بنجاح'),
                        indicator: 'green'
                    });
                    
                    await this.loadBookings();
                    this.wrapper.find('.booking-details').removeClass('active');
                    
                } catch (error) {
                    frappe.msgprint({
                        title: __('خطأ'),
                        message: __('تعذر إلغاء الحجز: ') + error.message,
                        indicator: 'red'
                    });
                } finally {
                    this.setLoading(false);
                }
            }
        );
    }

    setupEventListeners() {
        // تحديث الحجوزات
        this.wrapper.on('click', '.btn-refresh', () => this.loadBookings());
        
        // تصفية الحجوزات
        this.wrapper.on('change', '.status-filter, .date-filter', () => this.loadBookings());
        
        // عرض تفاصيل الحجز
        this.wrapper.on('click', '.btn-view', (e) => {
            const bookingId = $(e.currentTarget).closest('.booking-item').data('booking-id');
            this.showBookingDetails(bookingId);
        });
        
        // إغلاق التفاصيل
        this.wrapper.on('click', '.btn-close-details', () => {
            this.wrapper.find('.booking-details').removeClass('active');
        });
        
        // إلغاء الحجز
        this.wrapper.on('click', '.btn-cancel', () => this.cancelCurrentBooking());
        
        // تعديل الحجز
        this.wrapper.on('click', '.btn-modify', () => {
            if (this.currentBooking) {
                frappe.set_route('Form', 'Room Booking', this.currentBooking.name);
            }
        });
    }

    setLoading(loading, message) {
        this.state.isLoading = loading;
        const $loader = this.wrapper.find('.loading-state');
        
        if (loading) {
            if (message) $loader.find('p').text(message);
            $loader.show();
        } else {
            $loader.hide();
        }
    }

    // Helper Methods
    getStatusText(status) {
        const statusMap = {
            'Confirmed': __('مؤكد'),
            'Cancelled': __('ملغى'),
            'Pending': __('قيد الانتظار')
        };
        return statusMap[status] || status;
    }

    calculateDuration(start, end) {
        const startTime = new Date(start);
        const endTime = new Date(end);
        const diff = (endTime - startTime) / (1000 * 60 * 60); // بالساعات
        
        const hours = Math.floor(diff);
        const minutes = Math.round((diff - hours) * 60);
        
        return `${hours} ${__('ساعة')} ${minutes} ${__('دقيقة')}`;
    }

    formatCurrency(amount) {
        return parseFloat(amount || 0).toFixed(2) + ' ' + __('ر.س');
    }
};