frappe.provide("room_booking.RoomBooking");

/**
 * التطبيق الرئيسي لنظام حجز الغرف
 * @class
 */
room_booking.RoomBooking.Application = class {
    constructor(wrapper) {
        this._initProperties(wrapper);
        this._setupDOM();
        this._setupEventDelegation();
        this._initializeComponents();
        this._applyStyles();
    }

    // ----------------------------------------
    // Initialization Methods
    // ----------------------------------------

    /**
     * تهيئة الخصائص الأساسية
     * @private
     */
    _initProperties(wrapper) {
        this.wrapper = $(wrapper).find(".layout-main-section");
        this.page = wrapper.page;
        this._state = {
            selectedRoom: null,
            selectedSlot: null,
            isLoading: false,
            currentView: 'booking'
        };
        this._components = {};
    }

    /**
     * إعداد هيكل DOM الأساسي
     * @private
     */
    _setupDOM() {
        this.wrapper.html(`
            <div class="room-booking-app">
                <!-- شريط التحكم -->
                <div class="app-controls">
                    ${this._renderControlBar()}
                </div>
                
                <!-- المحتوى الرئيسي -->
                <div class="app-content">
                    ${this._renderMainContent()}
                </div>
                
                <!-- حالة التحميل -->
                ${this._renderLoadingState()}
            </div>
        `);
    }

    // ----------------------------------------
    // Rendering Methods
    // ----------------------------------------

    /**
     * عرض شريط التحكم
     * @private
     */
    _renderControlBar() {
        return `
            <div class="view-switcher">
                <button class="btn btn-booking-view active" data-action="switch-view" data-view="booking">
                    <i class="fa fa-calendar-plus"></i> ${__('حجز جديد')}
                </button>
                <button class="btn btn-management-view" data-action="switch-view" data-view="management">
                    <i class="fa fa-list"></i> ${__('إدارة الحجوزات')}
                </button>
            </div>
            <div class="app-actions">
                <button class="btn btn-refresh" data-action="refresh">
                    <i class="fa fa-sync-alt"></i>
                </button>
                <button class="btn btn-fullscreen" data-action="fullscreen">
                    <i class="fa fa-expand"></i>
                </button>
            </div>
        `;
    }

    /**
     * عرض المحتوى الرئيسي
     * @private
     */
    _renderMainContent() {
        return `
            <div class="booking-view">
                <div class="row">
                    <div class="col-md-8 room-selector-container"></div>
                    <div class="col-md-4 booking-summary-container"></div>
                </div>
            </div>
            <div class="management-view" style="display:none;">
                <div class="booking-manager-container"></div>
            </div>
        `;
    }

    /**
     * عرض حالة التحميل
     * @private
     */
    _renderLoadingState() {
        return `
            <div class="app-loading-state">
                <div class="spinner"></div>
                <p>${__('جاري التحميل...')}</p>
            </div>
        `;
    }

    // ----------------------------------------
    // Event Handling
    // ----------------------------------------

    /**
     * إعداد تفويض الأحداث
     * @private
     */
    _setupEventDelegation() {
        this.wrapper.on('click', '[data-action]', (e) => {
            const action = $(e.currentTarget).data('action');
            this._handleAction(action, $(e.currentTarget).data());
        });
    }

    /**
     * معالجة الأحداث بناء على data-action
     * @private
     */
    _handleAction(action, data) {
        const actions = {
            'switch-view': () => this._switchView(data.view),
            'refresh': () => this._refreshData(),
            'fullscreen': () => this._toggleFullscreen()
        };

        if (actions[action]) {
            actions[action]();
        }
    }

    // ----------------------------------------
    // Component Initialization
    // ----------------------------------------

    /**
     * تهيئة المكونات الأساسية
     * @private
     */
    _initializeComponents() {
        this._initRoomSelector();
        this._initBookingSummary();
        this._initBookingDialog();
        this._initBookingManager();
    }

    /**
     * تهيئة محدد الغرف
     * @private
     */
    _initRoomSelector() {
        this._components.roomSelector = new room_booking.RoomBooking.RoomSelector({
            wrapper: this.wrapper.find('.room-selector-container'),
            events: {
                slotSelected: (args) => this._handleSlotSelected(args),
                bookedSlotClicked: (args) => this._handleBookedSlotClick(args)
            }
        });
    }

    // ... (بقية دوال تهيئة المكونات بنفس النمط)
    
    // ----------------------------------------
    // State Management
    // ----------------------------------------

    /**
     * تبديل بين واجهات التطبيق
     * @private
     */
    _switchView(view) {
        if (this._state.currentView === view) return;
        
        this._state.currentView = view;
        
        const viewActions = {
            'booking': () => {
                this.wrapper.find('.booking-view').show();
                this.wrapper.find('.management-view').hide();
                this._updateActiveViewButtons('booking');
            },
            'management': () => {
                this.wrapper.find('.booking-view').hide();
                this.wrapper.find('.management-view').show();
                this._updateActiveViewButtons('management');
                this._refreshBookings();
            }
        };

        viewActions[view]();
    }

    /**
     * تحديث أزرار عرض الواجهة
     * @private
     */
    _updateActiveViewButtons(activeView) {
        this.wrapper.find('.btn-booking-view').toggleClass('active', activeView === 'booking');
        this.wrapper.find('.btn-management-view').toggleClass('active', activeView === 'management');
    }

    // ... (بقية الدوال بنفس النمط مع تحسين التصميم)
    
    // ----------------------------------------
    // Styles
    // ----------------------------------------

    /**
     * تطبيق الأنماط على التطبيق
     * @private
     */
    _applyStyles() {
        const styles = `
            .room-booking-app {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 20px;
            }
            
            .app-controls {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                background: #f8f9fa;
                padding: 10px 15px;
                border-radius: 5px;
                align-items: center;
            }
            
            .view-switcher .btn {
                margin-right: 5px;
                transition: all 0.3s ease;
            }
            
            .btn.active {
                background-color: var(--primary-color, #4CAF50);
                color: white;
            }
            
            .app-loading-state {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255,255,255,0.9);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                backdrop-filter: blur(2px);
            }
            
            .app-loading-state .spinner {
                border: 5px solid #f3f3f3;
                border-top: 5px solid var(--primary-color, #3498db);
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        $('<style>').text(styles).appendTo('head');
    }
};

// تهيئة التطبيق عند تحميل الصفحة
frappe.pages['roombooking'].on_page_load = function(wrapper) {
    new room_booking.RoomBooking.Application(wrapper);
};