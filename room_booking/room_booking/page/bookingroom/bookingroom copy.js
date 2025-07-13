frappe.pages['bookingroom'].on_page_load = function(wrapper) {
    console.log('1. بدء تحميل الصفحة...');
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('نظام حجز الغرف'),
        single_column: true,
        card_layout: true
    });
    console.log('2. تم إنشاء صفحة التطبيق');

    new RoomBookingApp(wrapper, page);
};
class RoomBookingApp {
    constructor(wrapper, page) {
        this.wrapper = wrapper;
        this.page = page;
        this.state = {
            selectedSlots: [],
            isLoading: false
        };
        this.init();
    }

    init() {
        console.log('[3] بدء تهيئة التطبيق');
        this.setupDOM();
        this.setupEventListeners();
        this.loadBranches();
    }

    setupDOM() {
        console.log('[4] إعداد هيكل الصفحة');
        this.$container = $(`
            <div class="room-booking-container">
                <div class="row filter-section">
                    <div class="col-md-4 col-sm-6">
                        <label>${__('الفرع')}</label>
                        <select class="form-control branch-filter">
                            <option value="">${__('جميع الفروع')}</option>
                        </select>
                    </div>
                    <div class="col-md-3 col-sm-6">
                        <label>${__('التاريخ')}</label>
                        <input type="date" class="form-control date-filter"
                            value="${frappe.datetime.get_today()}" min="${frappe.datetime.get_today()}">
                    </div>
                    <div class="col-md-3 col-sm-6">
                        <label>${__('السعة')}</label>
                        <select class="form-control capacity-filter">
                            <option value="">${__('أي سعة')}</option>
                            <option value="5">5+ ${__('أشخاص')}</option>
                            <option value="10">10+ ${__('أشخاص')}</option>
                            <option value="20">20+ ${__('أشخاص')}</option>
                        </select>
                    </div>
                    <div class="col-md-2 col-sm-6 d-flex align-items-end">
                        <button class="btn btn-primary btn-refresh btn-block">
                            <i class="fa fa-sync-alt"></i> ${__('تحديث')}
                        </button>
                    </div>
                </div>

                <div class="loading-state text-center" style="display:none;">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">${__('جاري التحميل...')}</span>
                    </div>
                    <p>${__('جاري تحميل الغرف المتاحة...')}</p>
                </div>

                <div class="room-list-container row"></div>
            </div>
        `);

        $(this.wrapper).find('.layout-main-section').html(this.$container);
    }

    setupEventListeners() {
        console.log('[5] إعداد مستمعي الأحداث');
        this.$container.on('change', '.branch-filter, .capacity-filter, .date-filter', () => this.loadRooms());
        this.$container.on('click', '.btn-refresh', () => this.loadRooms());
        this.$container.on('click', '.time-slot', (e) => {
            this.toggleTimeSlotSelection($(e.currentTarget));
        });
    }

    formatCurrency(amount) {
        try {
            amount = parseFloat(amount);
            if (isNaN(amount)) amount = 0;
            return amount.toFixed(2) + ' ر.س';
        } catch (e) {
            console.error('خطأ في تنسيق المبلغ:', e);
            return '0.00 ر.س';
        }
    }

    setLoading(loading) {
        this.state.isLoading = loading;
        this.$container.find('.loading-state').toggle(loading);
        this.$container.find('.filter-section, .room-list-container').toggle(!loading);
    }

    showError(message, roomName = null) {
        if (roomName) {
            this.$container.find(`.slots-grid[data-room="${roomName}"]`).html(`
                <div class="alert alert-danger">${message}</div>
            `);
        } else {
            this.$container.find('.room-list-container').html(`
                <div class="alert alert-danger text-center">${message}</div>
            `);
        }
        frappe.msgprint({title: __('خطأ'), message, indicator: 'red'});
    }

    async loadBranches() {
        this.setLoading(true);
        try {
            let response = await frappe.call({method: 'room_booking.api.get_branches'});
            const branches = response.message || [];
            const $select = this.$container.find('.branch-filter').empty();
            $select.append(`<option value="">${__('جميع الفروع')}</option>`);
            branches.forEach(branch => $select.append(`<option value="${branch}">${branch}</option>`));
            await this.loadRooms();
        } catch (e) {
            this.showError(__('فشل في تحميل قائمة الفروع'));
        } finally {
            this.setLoading(false);
        }
    }

    async loadRooms() {
        if (this.state.isLoading) {
            console.log('تم تجاهل طلب تحميل الغرف بسبب وجود عملية تحميل جارية');
            return;
        }

        this.setLoading(true);

        const filters = {
            branch: this.$container.find('.branch-filter').val(),
            date: this.$container.find('.date-filter').val(),
            capacity: this.$container.find('.capacity-filter').val()
        };

        try {
            let response = await frappe.call({
                method: 'room_booking.api.get_available_rooms_with_slots',
                args: filters
            });
            const rooms = response.message || [];
            this.renderRoomsWithSlots(rooms);
            this.state.selectedSlots = []; // إعادة تعيين الاختيارات بعد تحميل الغرف الجديدة
            this.updateBookingButton();
        } catch (e) {
            this.showError(__('فشل في تحميل الغرف المتاحة'));
            this.renderRoomsWithSlots([]);
        } finally {
            this.setLoading(false);
        }
    }

    renderRoomsWithSlots(rooms) {
        const $container = this.$container.find('.room-list-container');
        $container.empty();

        if (!Array.isArray(rooms) || rooms.length === 0) {
            $container.html(`
                <div class="col-12">
                    <div class="alert alert-warning text-center">
                        <i class="fa fa-exclamation-triangle"></i>
                        ${__('لا توجد غرف متاحة حسب معايير البحث الحالية')}
                    </div>
                </div>
            `);
            return;
        }

        rooms.forEach(room => {
            const $roomCard = $(`
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="room-card card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="m-0"><i class="fa fa-door-open"></i> ${room.room_name || __('بدون اسم')}</h5>
                            <span class="badge ${room.status === 'متاحة' ? 'badge-success' : 'badge-danger'}">${room.status || __('غير معروف')}</span>
                        </div>
                        <div class="card-body">
                            <p><i class="fa fa-map-marker-alt text-primary"></i> <strong>${__('الموقع')}:</strong> ${room.branch || ''} - ${room.location || ''}</p>
                            <p><i class="fa fa-users text-info"></i> <strong>${__('السعة')}:</strong> ${room.no_of_seats || 0} ${__('مقاعد')}</p>
                            <p><i class="fa fa-money-bill-wave text-success"></i> <strong>${__('السعر')}:</strong> ${this.formatCurrency(room.price_per_hour || 0)}/${__('ساعة')}</p>
                            <hr>
                            <h6 class="text-center"><i class="fa fa-clock"></i> ${__('الفترات المتاحة')}</h6>
                            <div class="slots-grid" data-room="${room.name}"></div>
                        </div>
                    </div>
                </div>
            `);
            $container.append($roomCard);
            this.renderTimeSlots(room.name, room.available_slots || []);
        });
    }

    renderTimeSlots(roomName, slots) {
        const $container = this.$container.find(`.slots-grid[data-room="${roomName}"]`);
        $container.empty();

        if (!slots.length) {
            $container.html(`<div class="alert alert-info">${__('لا توجد فترات متاحة لهذا اليوم')}</div>`);
            return;
        }

        const slotsHTML = slots.map(slot => {
            const status = slot.booked ? __('محجوز') : __('متاح');
            const statusClass = slot.booked ? 'booked' : 'available';

            return `
                <div class="time-slot ${statusClass}" 
                    data-room="${roomName}" 
                    data-start-time="${slot.start_time}" 
                    data-end-time="${slot.end_time}" 
                    data-price="${slot.price}">
                    <div class="slot-time">${slot.start_time} - ${slot.end_time}</div>
                    <div class="slot-status">${status}</div>
                    <div class="slot-price">${flt(slot.price).toFixed(2)} ${__('ريال')}</div>
                </div>
            `;
        }).join('');

        $container.html(slotsHTML);
    }

    toggleTimeSlotSelection($slot) {
        $slot.toggleClass('selected');

        const room = $slot.data('room');
        const startTime = $slot.data('start-time');
        const endTime = $slot.data('end-time');
        const price = $slot.data('price');

        if ($slot.hasClass('selected')) {
            this.state.selectedSlots.push({ room, startTime, endTime, price });
        } else {
            this.state.selectedSlots = this.state.selectedSlots.filter(
                s => !(s.room === room && s.startTime === startTime && s.endTime === endTime)
            );
        }

        this.updateBookingButton();
    }

    updateBookingButton() {
        const count = this.state.selectedSlots.length;
        this.page.set_primary_action(
            count ? `${__('حجز الآن')} (${count})` : __('حجز الآن'),
            count ? () => this.openBookingDialog() : () => {
                frappe.msgprint({
                    title: __('تحذير'),
                    indicator: 'orange',
                    message: __('الرجاء تحديد ساعة واحدة على الأقل للحجز')
                });
            },
            count ? 'fa fa-calendar-check' : 'fa fa-calendar'
        );
    }

    openBookingDialog() {
        if (!this.state.selectedSlots.length) {
            frappe.msgprint({
                title: __('تحذير'),
                indicator: 'orange',
                message: __('يرجى تحديد وقت الحجز أولاً')
            });
            return;
        }

        const selected = this.state.selectedSlots;
        const date = this.$container.find('.date-filter').val();
        const totalPrice = selected.reduce((sum, s) => sum + Number(s.price), 0);
        const slotsText = selected.map(s => `${s.startTime} - ${s.endTime}`).join('<br>');

        let dialog = new frappe.ui.Dialog({
            title: __('تأكيد حجز الغرفة'),
            fields: [
                {
                    label: __('العميل'),
                    fieldname: 'customer_name',
                    fieldtype: 'Link',
                    options: 'Customer',
                    reqd: 1,
                    get_query: () => ({ filters: { disabled: 0 } })
                },
                {
                    label: __('أو إضافة عميل جديد'),
                    fieldname: 'add_customer',
                    fieldtype: 'Button',
                    click: () => this.openQuickCustomerDialog(dialog)
                },
                { fieldtype: 'Section Break' },
                {
                    label: __('التاريخ'),
                    fieldname: 'booking_date',
                    fieldtype: 'Data',
                    read_only: 1,
                    default: date
                },
                {
                    label: __('الأوقات المختارة'),
                    fieldname: 'selected_hours',
                    fieldtype: 'HTML'
                },
                {
                    label: __('إجمالي السعر'),
                    fieldname: 'amount',
                    fieldtype: 'Data',
                    read_only: 1,
                    default: this.formatCurrency(totalPrice)
                },
                { fieldtype: 'Section Break' },
                {
                    label: __('ملاحظات'),
                    fieldname: 'notes',
                    fieldtype: 'Small Text'
                }
            ],
            primary_action_label: __('تأكيد الحجز'),
            primary_action: (values) => this.confirmBooking(values, dialog)
        });

        dialog.fields_dict.selected_hours.$wrapper.html(`<div class="alert alert-info mb-2">${slotsText}</div>`);
        dialog.show();
    }

    openQuickCustomerDialog(parentDialog) {
        let dialog = new frappe.ui.Dialog({
            title: __('إضافة عميل جديد'),
            fields: [
                { label: __('اسم العميل'), fieldname: 'customer_name', fieldtype: 'Data', reqd: 1 },
                { label: __('رقم الهاتف'), fieldname: 'mobile_no', fieldtype: 'Data' },
                { label: __('الإيميل'), fieldname: 'email_id', fieldtype: 'Data' }
            ],
            primary_action_label: __('حفظ'),
            primary_action: (values) => {
                frappe.call({
                    method: 'frappe.client.insert',
                    args: {
                        doc: {
                            doctype: "Customer",
                            customer_name: values.customer_name,
                            mobile_number: values.mobile_no,
                            email_id: values.email_id,
                        }
                    },
                    callback: (r) => {
                        if (r.message && r.message.name) {
                            parentDialog.set_value('customer_name', r.message.name);
                            dialog.hide();
                            frappe.show_alert({ message: __('تم إضافة العميل بنجاح'), indicator: 'green' });
                        }
                    }
                });
            }
        });
        dialog.show();
    }

    confirmBooking(values, dialog) {
        if (!values.customer_name) {
            frappe.msgprint(__('يرجى اختيار عميل أو إضافته أولاً'));
            return;
        }

        const selected_date = this.$container.find('.date-filter').val();

        const bookings = this.state.selectedSlots.map(slot => ({
            rental_room: slot.room,
            start_datetime: `${selected_date} ${slot.startTime}:00`,
            end_datetime: `${selected_date} ${slot.endTime}:00`,
            customer_name: values.customer_name,
            notes: values.notes || '',
            price: slot.price,
            amount: values.amount || 0
        }));

        frappe.call({
            method: 'room_booking.api.create_booking',
            args: { bookings },
            freeze: true,
            freeze_message: __('جاري حفظ الحجز...'),
            callback: (r) => {
                if (r.message && r.message.success) {
                    frappe.show_alert({
                        message: __('تم الحجز بنجاح! رقم الحجز: ') + r.message.booking_id,
                        indicator: 'green'
                    });
                    dialog.hide();
                    this.state.selectedSlots = [];
                    this.updateBookingButton();
                    this.loadRooms();
                } else {
                    frappe.msgprint(r.message?.error || __('تعذر إتمام الحجز'));
                }
            }
        });
    }
}
