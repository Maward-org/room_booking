frappe.provide("room_booking.RoomBooking");

/**
 * 🏨 نظام استكشاف الغرف - الإصدار المحسن مع تتبع كامل للعمليات
 * @class room_booking.RoomBooking.RoomExplorer
 */
room_booking.RoomBooking.RoomExplorer = class {
    constructor({ parent, onSlotSelect, onFilterChange }) {
        console.log("🚀 بدء تهيئة مستكشف الغرف...");
        
        try {
            // التحقق من العنصر الرئيسي
            if (!parent || !parent.length) {
                throw new Error("عنصر الـ parent غير صالح أو غير موجود في الـ DOM");
            }

            this.parent = parent;
            this.onSlotSelect = onSlotSelect || function() {
                console.warn("⚠️ لم يتم توفير دالة onSlotSelect");
            };
            
            this.onFilterChange = onFilterChange || function() {
                console.warn("⚠️ لم يتم توفير دالة onFilterChange");
            };
            
            this.heatmapData = {};
            this.currentDate = frappe.datetime.get_today();
            
            console.log("✅ تم تهيئة المتغيرات الأساسية بنجاح");
            this.init();
            
        } catch (error) {
            console.error("❌ خطأ في بناء مستكشف الغرف:", error);
            this.showFatalError(__('حدث خطأ فادح أثناء تهيئة النظام'));
        }
    }

    init() {
        console.log("🔧 بدء تهيئة مكونات مستكشف الغرف...");
        
        try {
            this.renderSkeleton();
            console.log("🎨 تم إنشاء الهيكل الأساسي لواجهة المستخدم");
            
            this.loadRooms();
            console.log("📦 بدء تحميل بيانات الغرف...");
            
        } catch (error) {
            console.error("❌ فشل في تهيئة المستكشف:", error);
            this.showError(__('تعذر تحميل واجهة مستكشف الغرف'));
        }
    }

    renderSkeleton() {
        console.log("🛠️ بناء الهيكل الأساسي للواجهة...");
        
        try {
            this.parent.html(`
                <div class="room-explorer">
                    <!-- فلترات البحث -->
                    <div class="advanced-filters card mb-4">
                        <div class="card-header">
                            <h4><i class="fa fa-filter"></i> ${__('فلاتر البحث')}</h4>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label><i class="fa fa-building"></i> ${__('الفرع')}</label>
                                        <select class="form-control branch-filter">
                                            <option value="">${__('جميع الفروع')}</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label><i class="fa fa-users"></i> ${__('السعة')}</label>
                                        <select class="form-control capacity-filter">
                                            <option value="">${__('جميع السعات')}</option>
                                            <option value="5">5+ ${__('أشخاص')}</option>
                                            <option value="10">10+ ${__('أشخاص')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- حالة التحميل -->
                    <div class="loading-state text-center py-5" style="display:none;">
                        <div class="spinner-border text-primary" role="status">
                            <span class="sr-only">${__('جاري التحميل...')}</span>
                        </div>
                        <p class="mt-3">${__('جاري تحميل بيانات الغرف...')}</p>
                    </div>

                    <!-- قائمة الغرف -->
                    <div class="rooms-list"></div>
                </div>
            `);
            
            console.log("🎯 إعداد مستمعي الأحداث للفلاتر...");
            this.parent.find('.branch-filter, .capacity-filter').on('change', () => {
                console.log("🔎 تغيير في الفلاتر، جاري تحديث النتائج...");
                try {
                    this.loadRooms();
                } catch (error) {
                    console.error("❌ خطأ في تطبيق الفلاتر:", error);
                    this.showError(__('حدث خطأ أثناء تطبيق الفلاتر'));
                }
            });
            
        } catch (error) {
            console.error("❌ فشل في بناء الهيكل الأساسي:", error);
            throw error;
        }
    }

    async loadRooms() {
        console.log("🌐 بدء جلب بيانات الغرف من الخادم...");
        
        try {
            this.showLoading(true);
            
            const filters = {
                date: this.currentDate,
                branch: this.parent.find('.branch-filter').val(),
                capacity: this.parent.find('.capacity-filter').val()
            };
            
            console.log("🔍 تصفية البحث المستخدمة:", filters);
            
            const { message: rooms } = await frappe.call({
                method: 'room_booking.api.get_available_rooms_with_slots',
                args: filters,
                freeze: true,
                callback: (response) => {
                    if (response.exc) {
                        console.error("🚨 خطأ في استجابة الخادم:", response.exc);
                        throw new Error(__('استجابة غير صالحة من الخادم'));
                    }
                }
            });

            if (!rooms || !Array.isArray(rooms)) {
                console.warn("⚠️ بيانات الغرف غير صالحة أو فارغة");
                throw new Error(__('لا توجد بيانات غرف متاحة'));
            }

            console.log(`✅ تم تحميل ${rooms.length} غرفة بنجاح`);
            this.renderRooms(rooms);
            
        } catch (error) {
            console.error("❌ فشل في تحميل الغرف:", error);
            this.showError(__('تعذر تحميل بيانات الغرف: ') + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    renderRooms(rooms) {
        console.log(`🎨 بدء عرض ${rooms.length} غرفة...`);
        
        try {
            const container = this.parent.find('.rooms-list');
            container.empty();

            if (rooms.length === 0) {
                console.log("ℹ️ لا توجد غرف متاحة للعرض");
                container.html(`
                    <div class="no-rooms-message text-center py-5">
                        <i class="fa fa-door-closed fa-4x text-muted mb-4"></i>
                        <h4 class="text-muted">${__('لا توجد غرف متاحة')}</h4>
                        <p class="text-muted">${__('حاول تغيير معايير البحث')}</p>
                        <button class="btn btn-primary btn-refresh mt-3">
                            <i class="fa fa-sync-alt"></i> ${__('تحديث النتائج')}
                        </button>
                    </div>
                `);
                
                container.find('.btn-refresh').on('click', () => this.loadRooms());
                return;
            }

            rooms.forEach((room, index) => {
                try {
                    if (!this.validateRoomData(room)) {
                        console.warn(`⚠️ بيانات الغرفة غير صالحة في الفهرس ${index}:`, room);
                        return;
                    }

                    console.log(`🛏️ عرض الغرفة ${room.name} (${room.id})`);
                    
                    const roomCard = $(`
                        <div class="room-card card mb-4" data-room-id="${room.id}">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h3 class="mb-0">
                                    <i class="fa fa-door-open"></i> ${room.name}
                                </h3>
                                <span class="badge badge-${room.status === 'Available' ? 'success' : 'danger'}">
                                    ${this.getStatusText(room.status)}
                                </span>
                            </div>
                            
                            <div class="card-body">
                                <div class="room-meta row mb-3">
                                    <div class="col-md-4">
                                        <p><i class="fa fa-users"></i> <strong>${__('السعة')}:</strong> ${room.capacity}</p>
                                    </div>
                                    <div class="col-md-4">
                                        <p><i class="fa fa-money-bill-wave"></i> <strong>${__('السعر')}:</strong> ${this.formatPrice(room.price_per_hour)}</p>
                                    </div>
                                    <div class="col-md-4">
                                        <p><i class="fa fa-map-marker-alt"></i> <strong>${__('الفرع')}:</strong> ${room.branch || __('غير محدد')}</p>
                                    </div>
                                </div>
                                
                                <h5 class="mb-3"><i class="fa fa-clock"></i> ${__('الأوقات المتاحة')}</h5>
                                <div class="slots-grid"></div>
                            </div>
                        </div>
                    `);

                    this.renderTimeSlots(roomCard.find('.slots-grid'), room.slots || []);
                    container.append(roomCard);
                    
                } catch (error) {
                    console.error(`❌ خطأ في عرض الغرفة ${index}:`, error);
                }
            });

            this.setupSlotSelectionHandlers();
            console.log("🎉 تم عرض جميع الغرف بنجاح");
            
        } catch (error) {
            console.error("❌ فشل في عرض الغرف:", error);
            this.showError(__('حدث خطأ أثناء عرض الغرف'));
        }
    }

    validateRoomData(room) {
        if (!room || typeof room !== 'object') {
            console.warn("❌ بيانات الغرفة غير صالحة (ليست كائن)");
            return false;
        }
        
        const requiredFields = ['id', 'name', 'capacity', 'price_per_hour', 'status'];
        const missingFields = requiredFields.filter(field => !room[field]);
        
        if (missingFields.length > 0) {
            console.warn(`⚠️ حقول ناقصة في بيانات الغرفة: ${missingFields.join(', ')}`);
            return false;
        }
        
        return true;
    }

    renderTimeSlots(container, slots) {
        console.log(`⏱️ عرض ${slots.length} فترة زمنية...`);
        
        try {
            if (!slots || !Array.isArray(slots)) {
                console.warn("⚠️ بيانات الفترات الزمنية غير صالحة");
                return;
            }

            if (slots.length === 0) {
                container.html(`
                    <div class="alert alert-info mb-0">
                        <i class="fa fa-info-circle"></i> ${__('لا توجد فترات متاحة لهذه الغرفة')}
                    </div>
                `);
                return;
            }

            slots.forEach((slot, index) => {
                try {
                    if (!this.validateSlotData(slot)) {
                        console.warn(`⚠️ بيانات الفترة الزمنية غير صالحة في الفهرس ${index}:`, slot);
                        return;
                    }

                    const slotElement = $(`
                        <div class="time-slot ${slot.status.toLowerCase()} mb-2" 
                             data-start="${slot.start}" 
                             data-end="${slot.end}"
                             data-status="${slot.status}"
                             title="${slot.status === 'Available' ? __('احجز هذه الفترة') : __('هذه الفترة محجوزة')}">
                            <div class="time-range">
                                <i class="fa fa-clock"></i> ${slot.start} - ${slot.end}
                            </div>
                            <div class="slot-meta">
                                <span class="badge badge-light">
                                    <i class="fa fa-hourglass"></i> ${slot.duration} ${__('ساعة')}
                                </span>
                                <span class="badge badge-primary">
                                    <i class="fa fa-money-bill-wave"></i> ${this.formatPrice(slot.price)}
                                </span>
                            </div>
                            ${slot.status === 'Available' ? `
                                <button class="btn btn-sm btn-success btn-book-slot">
                                    <i class="fa fa-calendar-plus"></i> ${__('حجز')}
                                </button>` : ''
                            }
                        </div>
                    `);

                    container.append(slotElement);
                    
                } catch (error) {
                    console.error(`❌ خطأ في عرض الفترة الزمنية ${index}:`, error);
                }
            });
            
        } catch (error) {
            console.error("❌ فشل في عرض الفترات الزمنية:", error);
            throw error;
        }
    }

    validateSlotData(slot) {
        if (!slot || typeof slot !== 'object') {
            console.warn("❌ بيانات الفترة الزمنية غير صالحة (ليست كائن)");
            return false;
        }
        
        const requiredFields = ['start', 'end', 'status', 'duration', 'price'];
        const missingFields = requiredFields.filter(field => !slot[field]);
        
        if (missingFields.length > 0) {
            console.warn(`⚠️ حقول ناقصة في بيانات الفترة: ${missingFields.join(', ')}`);
            return false;
        }
        
        return true;
    }

    setupSlotSelectionHandlers() {
        console.log("🖱️ إعداد معالجات أحداث الفترات الزمنية...");
        
        this.parent.find('.btn-book-slot').on('click', (e) => {
            e.stopPropagation();
            
            try {
                const slotElement = $(e.currentTarget).closest('.time-slot');
                const roomCard = slotElement.closest('.room-card');
                
                const roomId = roomCard.data('room-id');
                const roomName = roomCard.find('.card-header h3').text().trim();
                
                const slotData = {
                    start: slotElement.data('start'),
                    end: slotElement.data('end'),
                    price: slotElement.find('.badge-primary').text().replace(/[^\d.]/g, ''),
                    duration: slotElement.find('.badge-light').text().replace(/[^\d.]/g, '')
                };
                
                console.log("🎯 تم اختيار فترة:", {
                    roomId,
                    roomName,
                    slotData
                });
                
                this.onSlotSelect(roomId, slotData);
                
            } catch (error) {
                console.error("❌ خطأ في معالجة اختيار الفترة:", error);
                this.showError(__('حدث خطأ أثناء اختيار الفترة الزمنية'));
            }
        });
    }

    showLoading(show) {
        try {
            const loader = this.parent.find('.loading-state');
            if (show) {
                loader.show();
                this.parent.find('.rooms-list').hide();
            } else {
                loader.hide();
                this.parent.find('.rooms-list').show();
            }
        } catch (error) {
            console.error("❌ خطأ في عرض حالة التحميل:", error);
        }
    }

    showError(msg) {
        try {
            console.error("💥 عرض رسالة خطأ:", msg);
            
            this.parent.find('.rooms-list').html(`
                <div class="error-state text-center py-5">
                    <i class="fa fa-exclamation-triangle fa-4x text-danger mb-4"></i>
                    <h4 class="text-danger">${__('حدث خطأ')}</h4>
                    <p class="text-muted">${msg}</p>
                    <button class="btn btn-danger btn-retry mt-3">
                        <i class="fa fa-sync-alt"></i> ${__('إعادة المحاولة')}
                    </button>
                </div>
            `);
            
            this.parent.find('.btn-retry').on('click', () => {
                console.log("🔄 إعادة تحميل البيانات بعد الخطأ...");
                this.loadRooms();
            });
            
        } catch (error) {
            console.error("❌ فشل في عرض رسالة الخطأ:", error);
            frappe.msgprint({
                title: __('خطأ'),
                message: msg,
                indicator: 'red'
            });
        }
    }

showFatalError(msg) {
    try {
        console.error("💀 خطأ فادح:", msg);
        
        // التحقق من وجود this.parent بشكل صحيح
        if (!this.parent || !this.parent.length) {
            console.error("لا يمكن عرض الخطأ - عنصر parent غير متاح");
            document.write(`<div class="alert alert-danger">${msg}</div>`);
            return;
        }
        
        this.parent.html(`
            <div class="fatal-error text-center py-5">
                <i class="fa fa-skull-crossbones fa-4x text-danger mb-4"></i>
                <h3 class="text-danger">${__('خطأ فادح')}</h3>
                <p class="lead">${msg}</p>
                <div class="mt-4">
                    <button class="btn btn-danger btn-refresh mr-2">
                        <i class="fa fa-sync-alt"></i> ${__('تحديث الصفحة')}
                    </button>
                </div>
            </div>
        `);
        
        this.parent.find('.btn-refresh').on('click', () => location.reload());
    } catch (error) {
        console.error("❌ فشل في عرض رسالة الخطأ الفادح:", error);
        alert(msg); // Fallback بسيط
    }
}

    getStatusText(status) {
        const statusMap = {
            'Available': __('متاحة'),
            'Booked': __('محجوزة'),
            'Maintenance': __('صيانة'),
            'Reserved': __('محجوزة مسبقاً')
        };
        return statusMap[status] || status;
    }

    formatPrice(amount) {
        try {
            return room_booking.RoomBooking.helpers.formatCurrency(amount);
        } catch (error) {
            console.warn("⚠️ خطأ في تنسيق السعر، استخدام القيمة الأصلية");
            return amount;
        }
    }
};