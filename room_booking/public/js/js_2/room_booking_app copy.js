frappe.provide("room_booking.RoomBooking");

room_booking.RoomBooking.Application = class {
    constructor(wrapper) {
        this.wrapper = $(wrapper).find(".layout-main-section");
        this.page = wrapper.page;
        
        // 🌟 حالة التطبيق الذكية
        this.state = {
            currentView: 'room_selection', // room_selection | booking_management
            selectedRoom: null,
            selectedSlots: [],
            bookingCart: [],
            customer: null,
            filters: {
                date: frappe.datetime.get_today(),
                branch: null,
                capacity: null
            },
            realtimeUpdates: true
        };

        // 🛠️ تهيئة المكونات الأساسية
        this.initComponents();
        this.initRealtime();
        this.initKeyboardShortcuts();
        this.render();
        
        // 📡 تسجيل خدمة العملاء
        this.registerCustomerService();
    }

    /**
     * 🧩 تهيئة المكونات الرئيسية
     */
    initComponents() {
        // 🏨 مكون عرض الغرف
        this.roomExplorer = new room_booking.RoomBooking.RoomExplorer({
            parent: this.wrapper.find('.room-explorer-container'),
            onSlotSelect: (room, slot) => this.addToBookingCart(room, slot),
            onFilterChange: (filters) => this.updateFilters(filters)
        });

        // 🛒 مكون سلة الحجوزات
        this.bookingCart = new room_booking.RoomBooking.BookingCart({
            parent: this.wrapper.find('.booking-cart-container'),
            onCheckout: () => this.initiateCheckout(),
            onEdit: (bookingId) => this.editBooking(bookingId),
            onRemove: (bookingId) => this.removeFromCart(bookingId)
        });

        // 💳 نظام الدفع الذكي (مستوحى من POS مع تحسينات)
        this.paymentProcessor = new room_booking.RoomBooking.PaymentProcessor({
            onSuccess: (paymentData) => this.finalizeBooking(paymentData),
            onCancel: () => this.cancelCheckout()
        });

        // 📅 مدير الحجوزات
        this.bookingManager = new room_booking.RoomBooking.BookingManager({
            onBookingUpdate: () => this.refreshData()
        });

        // 🎨 نظام السمات المرئية
        this.themeManager = new room_booking.RoomBooking.ThemeManager({
            themes: ['light', 'dark', 'corporate'],
            defaultTheme: 'light'
        });
    }

    /**
     * 🖥️ عرض الواجهة الرئيسية
     */
    render() {
        this.wrapper.html(`
            <div class="room-booking-app">
                <!-- 🎛️ شريط التحكم العلوي -->
                <div class="control-panel">
                    <div class="view-switcher">
                        <button class="btn btn-view ${this.state.currentView === 'room_selection' ? 'active' : ''}" 
                                data-view="room_selection">
                            <i class="fa fa-door-open"></i> ${__('الغرف')}
                        </button>
                        <button class="btn btn-view ${this.state.currentView === 'booking_management' ? 'active' : ''}" 
                                data-view="booking_management">
                            <i class="fa fa-calendar-check"></i> ${__('الحجوزات')}
                        </button>
                    </div>
                    <div class="quick-actions">
                        <button class="btn btn-refresh"><i class="fa fa-sync-alt"></i></button>
                        <button class="btn btn-fullscreen"><i class="fa fa-expand"></i></button>
                    </div>
                </div>

                <!-- 📅 فلتر التاريخ -->
                <div class="date-navigator">
                    <button class="btn btn-prev"><i class="fa fa-chevron-left"></i></button>
                    <input type="date" class="form-control booking-date" 
                           value="${this.state.filters.date}">
                    <button class="btn btn-next"><i class="fa fa-chevron-right"></i></button>
                </div>

                <!-- 🏨 منطقة المحتوى الديناميكي -->
                <div class="content-area">
                    <div class="room-explorer-container" 
                         style="${this.state.currentView !== 'room_selection' ? 'display:none' : ''}"></div>
                    <div class="booking-manager-container" 
                         style="${this.state.currentView !== 'booking_management' ? 'display:none' : ''}"></div>
                </div>

                <!-- 🛒 سلة الحجوزات الجانبية -->
                <div class="booking-cart-container"></div>

                <!-- 🔔 نظام الإشعارات -->
                <div class="notification-center"></div>
            </div>
        `);

        this.bindEvents();
    }

    /**
     * 🎮 ربط الأحداث التفاعلية
     */
    bindEvents() {
        // 🔄 أحداث تبديل العرض
        this.wrapper.on('click', '.btn-view', (e) => {
            const view = $(e.currentTarget).data('view');
            this.switchView(view);
        });

        // 📅 أحداث تنقل التاريخ
        this.wrapper.on('click', '.btn-prev', () => this.navigateDate(-1));
        this.wrapper.on('click', '.btn-next', () => this.navigateDate(1));
        this.wrapper.on('change', '.booking-date', (e) => {
            this.state.filters.date = $(e.target).val();
            this.refreshData();
        });

        // 🎯 أحداث الاختصارات
        $(document).on('keydown', this.handleKeyboardShortcuts.bind(this));
    }

    /**
     * 🔄 تبديل بين واجهات النظام
     */
    switchView(view) {
        this.state.currentView = view;
        this.wrapper.find('.content-area > div').hide();
        this.wrapper.find(`.${view}-container`).show();
        
        if (view === 'room_selection') {
            this.roomExplorer.refresh();
        } else {
            this.bookingManager.loadBookings();
        }
    }

    /**
     * 🛒 إضافة حجز للسلة
     */
    addToBookingCart(room, slot) {
        if (this.isSlotAlreadyAdded(slot)) {
            this.showNotification(__('تم إضافة هذه الفترة مسبقاً'), 'warning');
            return;
        }

        const bookingItem = {
            id: this.generateBookingId(),
            room: room,
            slot: slot,
            price: this.calculatePrice(room.price_per_hour, slot.duration),
            status: 'pending'
        };

        this.state.bookingCart.push(bookingItem);
        this.bookingCart.refresh(this.state.bookingCart);
        this.showNotification(__('تم إضافة الحجز للسلة'), 'success');
    }

    /**
     * 💰 بدء عملية الدفع
     */
    initiateCheckout() {
        if (this.state.bookingCart.length === 0) {
            this.showNotification(__('السلة فارغة، أضف حجوزات أولاً'), 'error');
            return;
        }

        const totalAmount = this.state.bookingCart.reduce((sum, item) => sum + item.price, 0);
        
        this.paymentProcessor.startPayment({
            items: this.state.bookingCart,
            customer: this.state.customer,
            total: totalAmount
        });
    }

    /**
     * ✅ إتمام الحجز الناجح
     */
    async finalizeBooking(paymentData) {
        try {
            const bookingData = {
                customer: this.state.customer,
                date: this.state.filters.date,
                slots: this.state.bookingCart.map(item => ({
                    room: item.room.name,
                    start_time: item.slot.start,
                    end_time: item.slot.end,
                    amount: item.price
                })),
                payment: paymentData
            };

            const result = await frappe.call({
                method: 'room_booking.api.create_booking',
                args: { booking: bookingData },
                freeze: true
            });

            if (result.message) {
                this.showNotification(__('تم تأكيد الحجز بنجاح!'), 'success');
                this.state.bookingCart = [];
                this.bookingCart.refresh([]);
                this.bookingManager.loadBookings();
            }
        } catch (error) {
            this.showNotification(__('فشل في إتمام الحجز'), 'error');
            console.error('Booking error:', error);
        }
    }

    /**
     * 🆘 إلغاء عملية الدفع
     */
    cancelCheckout() {
        this.showNotification(__('تم إلغاء عملية الدفع'), 'warning');
    }

    /**
     * 🔄 تحديث البيانات تلقائيًا
     */
    initRealtime() {
        frappe.realtime.on('room_booking_update', (data) => {
            if (this.state.realtimeUpdates) {
                this.showNotification(__('تم تحديث بيانات الغرف تلقائياً'), 'info');
                this.roomExplorer.refresh();
            }
        });
    }

    /**
     * ⌨️ اختصارات لوحة المفاتيح
     */
    initKeyboardShortcuts() {
        this.shortcuts = {
            'F5': () => this.refreshData(),
            'Ctrl+1': () => this.switchView('room_selection'),
            'Ctrl+2': () => this.switchView('booking_management'),
            'Ctrl+K': () => this.initiateCheckout()
        };
    }

    handleKeyboardShortcuts(e) {
        const key = e.key;
        const ctrlKey = e.ctrlKey || e.metaKey;

        // F5 Refresh
        if (key === 'F5') {
            e.preventDefault();
            this.refreshData();
        }

        // Ctrl + Number (View switching)
        if (ctrlKey && key === '1') this.switchView('room_selection');
        if (ctrlKey && key === '2') this.switchView('booking_management');
        if (ctrlKey && key.toLowerCase() === 'k') this.initiateCheckout();
    }

    /**
     * 📞 خدمة العملاء (دعم فني مباشر)
     */
    registerCustomerService() {
        frappe.realtime.on('customer_support_message', (message) => {
            this.showNotification(`${__('الدعم الفني')}: ${message}`, 'info', 10000);
        });
    }

    /**
     * 🔔 عرض الإشعارات
     */
    showNotification(message, type='info', duration=3000) {
        const notification = $(`
            <div class="notification ${type}">
                <i class="fa ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `);
        
        this.wrapper.find('.notification-center').append(notification);
        notification.fadeIn(200);
        
        setTimeout(() => {
            notification.fadeOut(200, () => notification.remove());
        }, duration);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-times-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    // ... (الدوال المساعدة الأخرى)
};

