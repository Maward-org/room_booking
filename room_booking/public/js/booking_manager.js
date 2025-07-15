frappe.provide("room_booking.RoomBooking");

/**
 * 📅 نظام إدارة الحجوزات المتكامل - الإصدار النهائي المعدل
 * @class room_booking.RoomBooking.BookingManager
 */
room_booking.RoomBooking.BookingManager = class {
    constructor({ wrapper, onBookingUpdate }) {
        // التحقق الأساسي من العنصر المغلف
        if (!wrapper || !$(wrapper).length) {
            this.showFatalError(__('عنصر الـ wrapper غير موجود في الصفحة'));
            return;
        }

        try {
            this.wrapper = $(wrapper);
            this.onBookingUpdate = onBookingUpdate || function() {};
            this.currentBooking = null;
            
            // حالة التطبيق مع قيم افتراضية
            this.state = {
                isLoading: false,
                calendarInitialized: false,
                bookings: [],
                errorContainer: null
            };

            this.init();
            
        } catch (error) {
            console.error("تعذر تهيئة مدير الحجوزات:", error);
            this.showFatalError(__('حدث خطأ غير متوقع أثناء التهيئة'));
        }
    }

    async init() {
        try {
            // إنشاء عناصر واجهة المستخدم
            this.renderBaseLayout();
            
            // تحميل المكتبات المطلوبة
            const libLoaded = await this.loadCalendarLibrary();
            if (!libLoaded) return;
            
            // تحميل البيانات الأولية
            await this.loadInitialBookings();
            
            // إعداد مستمعي الأحداث
            this.setupEventListeners();
            
        } catch (error) {
            console.error("خطأ في التهيئة:", error);
            this.showError(__('حدث خطأ أثناء تحميل مدير الحجوزات'));
        }
    }

    renderBaseLayout() {
        try {
            // HTML أساسي مع تحسينات للعرض على الأجهزة المختلفة
            this.wrapper.html(`
                <div class="booking-manager">
                    <!-- شريط التحكم -->
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
                    
                    <!-- حالة التحميل -->
                    <div class="loading-state" style="display:none;">
                        <div class="spinner"></div>
                        <p>${__('جاري التحميل...')}</p>
                    </div>
                    
                    <!-- التقويم -->
                    <div class="calendar-container">
                        <div class="calendar-view"></div>
                        <div class="calendar-error alert alert-danger" style="display:none;"></div>
                    </div>
                    
                    <!-- تفاصيل الحجز -->
                    <div class="booking-details card mt-4">
                        <div class="card-header">
                            <h3 class="card-title">${__('تفاصيل الحجز')}</h3>
                        </div>
                        <div class="card-body">
                            <div class="detail-content empty-state">
                                <i class="fa fa-calendar fa-3x text-muted"></i>
                                <p class="text-muted">${__('اختر حجزاً لعرض التفاصيل')}</p>
                            </div>
                            <div class="detail-actions mt-3" style="display:none;">
                                <button class="btn btn-modify btn-sm btn-primary">
                                    <i class="fa fa-edit"></i> ${__('تعديل')}
                                </button>
                                <button class="btn btn-cancel btn-sm btn-danger">
                                    <i class="fa fa-times"></i> ${__('إلغاء')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `);
            
            // تخزين العناصر المهمة للوصول السريع
            this.state.errorContainer = this.wrapper.find('.calendar-error');
            
        } catch (error) {
            console.error("خطأ في عرض الواجهة:", error);
            throw error;
        }
    }

    async loadCalendarLibrary() {
        try {
            // إذا كانت المكتبة محملة مسبقاً
            if (typeof FullCalendar !== 'undefined') return true;
            
            this.showLoading(true, __('جاري تحميل التقويم...'));
            
            // تحميل مكتبة FullCalendar بشكل ديناميكي
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('فشل تحميل مكتبة التقويم'));
                document.head.appendChild(script);
            });
            
            // تحميل ملفات CSS المطلوبة
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.css';
            document.head.appendChild(link);
            
            // تحميل الترجمة العربية إذا لزم الأمر
            await this.loadArabicLocale();
            
            return true;
            
        } catch (error) {
            console.error("خطأ في تحميل المكتبة:", error);
            this.showCalendarError(__('تعذر تحميل نظام التقويم. يرجى التحقق من اتصال الإنترنت.'));
            return false;
            
        } finally {
            this.showLoading(false);
        }
    }

    async loadArabicLocale() {
        try {
            if (FullCalendar.locales.ar) return;
            
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/locales/ar.min.js';
                script.onload = resolve;
                document.head.appendChild(script);
            });
            
        } catch (error) {
            console.warn("تعذر تحميل ملف الترجمة العربية:", error);
        }
    }

    async initCalendar() {
        try {
            if (this.state.calendarInitialized) return;
            
            const calendarEl = this.wrapper.find('.calendar-view')[0];
            if (!calendarEl) {
                throw new Error('عنصر التقويم غير موجود');
            }
            
            this.calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'timeGridWeek',
                locale: 'ar',
                direction: 'rtl',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'timeGridWeek,timeGridDay,listWeek'
                },
                eventClick: (info) => {
                    try {
                        this.showBookingDetails(info.event);
                    } catch (error) {
                        console.error("خطأ في عرض التفاصيل:", error);
                        this.showError(__('حدث خطأ أثناء عرض تفاصيل الحجز'));
                    }
                },
                events: async (fetchInfo, successCallback) => {
                    try {
                        const bookings = await this.fetchBookings(fetchInfo);
                        successCallback(bookings);
                    } catch (error) {
                        console.error("خطأ في جلب الحجوزات:", error);
                        successCallback([]);
                    }
                },
                eventContent: this.renderEventContent.bind(this)
            });
            
            this.calendar.render();
            this.state.calendarInitialized = true;
            
        } catch (error) {
            console.error("خطأ في تهيئة التقويم:", error);
            this.showCalendarError(__('حدث خطأ في تحميل التقويم'));
            throw error;
        }
    }

    async loadInitialBookings() {
        try {
            this.showLoading(true, __('جاري تحميل الحجوزات...'));
            
            // نطاق زمني أوسع لضمان رؤية الحجوزات القريبة
            const today = frappe.datetime.get_today();
            const startDate = frappe.datetime.add_days(today, -30);
            const endDate = frappe.datetime.add_days(today, 60);
            
            this.state.bookings = await this.fetchBookings({
                start: new Date(startDate),
                end: new Date(endDate)
            });
            
            if (this.state.calendarInitialized) {
                this.calendar.refetchEvents();
            } else {
                await this.initCalendar();
            }
            
            this.onBookingUpdate(this.state.bookings);
            
        } catch (error) {
            console.error("خطأ في تحميل الحجوزات:", error);
            this.showError(__('تعذر تحميل بيانات الحجوزات'));
            
        } finally {
            this.showLoading(false);
        }
    }

    async fetchBookings(fetchInfo) {
        try {
            const { message: bookings } = await frappe.call({
                method: 'room_booking.api.get_user_bookings',
                args: {
                    start_date: frappe.datetime.obj_to_str(fetchInfo.start),
                    end_date: frappe.datetime.obj_to_str(fetchInfo.end)
                },
                freeze: this.state.isLoading,
                always: () => this.showLoading(false)
            });
            
            // تحقق من صحة البيانات قبل المعالجة
            if (!Array.isArray(bookings)) {
                throw new Error('استجابة غير صالحة من الخادم');
            }
            
            return bookings.map(booking => {
                // تحقق من وجود الحقول المطلوبة
                if (!booking.name || !booking.start_time || !booking.end_time) {
                    console.warn('حجز غير صالح:', booking);
                    return null;
                }
                
                return {
                    id: booking.name,
                    title: `${booking.room_name || __('غرفة غير معروفة')} - ${booking.customer_name || __('عميل غير معروف')}`,
                    start: booking.start_time,
                    end: booking.end_time,
                    extendedProps: {
                        booking: booking,
                        amount: booking.total_amount || 0,
                        status: booking.status || 'Pending'
                    },
                    color: this.getStatusColor(booking.status),
                    textColor: '#ffffff'
                };
            }).filter(Boolean); // تصفية القيم الفارغة
            
        } catch (error) {
            console.error("خطأ في جلب الحجوزات:", error);
            throw error;
        }
    }

    renderEventContent(eventInfo) {
        try {
            const booking = eventInfo.event.extendedProps.booking;
            return {
                html: `
                    <div class="fc-event-content">
                        <div class="fc-event-title">${booking.room_name || __('غرفة')}</div>
                        <div class="fc-event-time">
                            ${frappe.datetime.str_to_user(eventInfo.event.startStr).split(' ')[1]} - 
                            ${frappe.datetime.str_to_user(eventInfo.event.endStr).split(' ')[1]}
                        </div>
                        <div class="fc-event-status ${(booking.status || '').toLowerCase()}">
                            ${this.getStatusText(booking.status)}
                        </div>
                    </div>
                `
            };
        } catch (error) {
            console.error("خطأ في عرض الحدث:", error);
            return { html: '<div class="fc-event-content">حجز</div>' };
        }
    }

    showBookingDetails(calendarEvent) {
        try {
            const booking = calendarEvent.extendedProps.booking;
            if (!booking) {
                throw new Error('لا توجد بيانات حجز لعرضها');
            }
            
            this.currentBooking = booking;
            
            this.wrapper.find('.detail-content').html(`
                <div class="booking-info">
                    <h4>${booking.room_name || __('غرفة غير معروفة')}</h4>
                    <div class="booking-meta">
                        <p>
                            <i class="fa fa-calendar"></i> 
                            ${frappe.datetime.str_to_user(booking.start_time) || __('غير محدد')}
                        </p>
                        <p>
                            <i class="fa fa-clock"></i> 
                            ${this.calculateDuration(booking.start_time, booking.end_time)}
                        </p>
                        <p>
                            <i class="fa fa-user"></i> 
                            ${booking.customer_name || __('غير محدد')}
                        </p>
                        <p>
                            <i class="fa fa-money-bill-wave"></i> 
                            ${room_booking.RoomBooking.helpers.formatCurrency(booking.total_amount) || '0.00'}
                        </p>
                    </div>
                    <div class="status-badge ${(booking.status || '').toLowerCase()}">
                        ${this.getStatusText(booking.status)}
                    </div>
                </div>
            `);
            
            this.wrapper.find('.detail-actions').show();
            
        } catch (error) {
            console.error("خطأ في عرض التفاصيل:", error);
            this.showError(__('تعذر تحميل تفاصيل الحجز'));
        }
    }

    async cancelCurrentBooking() {
        try {
            if (!this.currentBooking) {
                this.showError(__('لم يتم اختيار أي حجز للإلغاء'));
                return;
            }
            
            frappe.confirm(
                __('هل أنت متأكد من إلغاء هذا الحجز؟'),
                () => this.processCancellation(this.currentBooking.id),
                __('إلغاء الحجز')
            );
            
        } catch (error) {
            console.error("خطأ في عملية الإلغاء:", error);
            this.showError(__('حدث خطأ أثناء محاولة الإلغاء'));
        }
    }

    async processCancellation(bookingId) {
        try {
            this.showLoading(true, __('جاري معالجة الإلغاء...'));
            
            const { message: result } = await frappe.call({
                method: 'room_booking.api.cancel_booking',
                args: { booking_id: bookingId },
                freeze: true
            });
            
            if (result.success) {
                frappe.show_alert({
                    message: __('تم إلغاء الحجز بنجاح'),
                    indicator: 'green'
                }, 5);
                
                // تحديث البيانات
                this.calendar.refetchEvents();
                this.resetDetailsView();
            } else {
                throw new Error(result.message || __('فشل في إلغاء الحجز'));
            }
            
        } catch (error) {
            console.error("خطأ في إلغاء الحجز:", error);
            this.showError(__('فشل في إلغاء الحجز: ') + error.message);
            
        } finally {
            this.showLoading(false);
        }
    }

    resetDetailsView() {
        this.wrapper.find('.detail-content').html(`
            <div class="empty-state">
                <i class="fa fa-calendar fa-3x text-muted"></i>
                <p class="text-muted">${__('اختر حجزاً لعرض التفاصيل')}</p>
            </div>
        `);
        this.wrapper.find('.detail-actions').hide();
        this.currentBooking = null;
    }

    setupEventListeners() {
        // إزالة أي مستمعين سابقين لمنع التكرار
        this.wrapper.off('click', '.btn-refresh');
        this.wrapper.off('click', '.btn-cancel');
        this.wrapper.off('click', '.btn-modify');
        this.wrapper.off('click', '.btn-add-booking');
        
        // تحديث الحجوزات
        this.wrapper.on('click', '.btn-refresh', () => {
            this.loadInitialBookings().catch(console.error);
        });
        
        // إلغاء الحجز
        this.wrapper.on('click', '.btn-cancel', () => {
            this.cancelCurrentBooking().catch(console.error);
        });
        
        // تعديل الحجز
        this.wrapper.on('click', '.btn-modify', () => {
            frappe.msgprint(__('هذه الميزة قيد التطوير حالياً'));
        });
        
        // حجز جديد
        this.wrapper.on('click', '.btn-add-booking', () => {
            frappe.set_route('app/room-booking');
        });
    }

    showLoading(show, message) {
        const loader = this.wrapper.find('.loading-state');
        if (show) {
            if (message) loader.find('p').text(message);
            loader.show();
        } else {
            loader.hide();
        }
    }

    showError(message) {
        frappe.msgprint({
            title: __('خطأ'),
            message: message,
            indicator: 'red'
        });
    }

    showCalendarError(message) {
        if (this.state.errorContainer) {
            this.state.errorContainer
                .html(`<i class="fa fa-exclamation-triangle"></i> ${message}`)
                .show();
        } else {
            this.showError(message);
        }
    }

    showFatalError(message = __('تعذر تحميل نظام إدارة الحجوزات. يرجى تحديث الصفحة أو الاتصال بالدعم الفني.')) {
        this.wrapper.html(`
            <div class="alert alert-danger">
                <h3><i class="fa fa-exclamation-circle"></i> ${__('خطأ فادح')}</h3>
                <p>${message}</p>
                <button class="btn btn-danger btn-refresh-page mt-2">
                    <i class="fa fa-sync-alt"></i> ${__('تحديث الصفحة')}
                </button>
            </div>
        `);
        
        this.wrapper.find('.btn-refresh-page').on('click', () => location.reload());
    }

    getStatusText(status) {
        const statusMap = {
            'Confirmed': __('مؤكد'),
            'Cancelled': __('ملغى'),
            'Completed': __('مكتمل'),
            'Pending': __('قيد الانتظار'),
            'Draft': __('مسودة')
        };
        return statusMap[status] || status || __('غير معروف');
    }

    getStatusColor(status) {
        const colors = {
            'Confirmed': '#4CAF50',  // أخضر
            'Cancelled': '#F44336',  // أحمر
            'Completed': '#2196F3',  // أزرق
            'Pending': '#FFC107',    // أصفر
            'Draft': '#9E9E9E'       // رمادي
        };
        return colors[status] || '#757575';
    }

    calculateDuration(start, end) {
        try {
            if (!start || !end) return __('غير معروف');
            
            const startTime = frappe.datetime.str_to_obj(start);
            const endTime = frappe.datetime.str_to_obj(end);
            const diff = endTime - startTime;
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            return `${hours} ${__('ساعة')} ${minutes} ${__('دقيقة')}`;
            
        } catch (error) {
            console.error("خطأ في حساب المدة:", error);
            return __('غير معروف');
        }
    }
};