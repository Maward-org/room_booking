frappe.provide("room_booking.RoomBooking");

room_booking.RoomBooking.RoomSelector = class {
    constructor({ wrapper, events = {}, settings = {} }) {
        this.wrapper = $(wrapper);
        this.events = events;
        this.settings = settings;
        this.state = { 
            branches: [], 
            slotsData: {}, 
            isLoading: false,
            currentDialog: null
        };
        this.init_component();
    }

    init_component() {
        this.render();
        this.add_styles();
        this.load_branches();
        this.bind_events();
    }

    render() {
        this.wrapper.html(`
            <div class="room-booking-container">
                <div class="row filter-section">
                    <div class="col-md-4">
                        <label><i class="fa fa-building"></i> ${__('الفرع')}</label>
                        <select class="form-control branch-filter"></select>
                    </div>
                    <div class="col-md-4">
                        <label><i class="fa fa-calendar-day"></i> ${__('التاريخ')}</label>
                        <input type="date" class="form-control date-filter" 
                               value="${frappe.datetime.get_today()}" 
                               min="${frappe.datetime.get_today()}">
                    </div>
                    <div class="col-md-4">
                        <label><i class="fa fa-users"></i> ${__('السعة')}</label>
                        <select class="form-control capacity-filter">
                            <option value="">${__('الكل')}</option>
                            <option value="5">5+</option>
                            <option value="10">10+</option>
                            <option value="20">20+</option>
                        </select>
                    </div>
                </div>

                <div class="loading-state text-center" style="display:none;">
                    <div class="spinner-border"></div>
                    <p>${__('جاري تحميل الغرف...')}</p>
                </div>

                <div class="room-list-container row mt-4"></div>
            </div>
        `);
    }

    add_styles() {
        if ($("#room-booking-style").length) return;
        const styles = `
            <style id="room-booking-style">
                .room-booking-container {
                    font-family: 'Tajawal', 'Segoe UI', sans-serif;
                    direction: rtl;
                    background-color: #f8f9fa;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                }
                
                .filter-section {
                    background-color: #fff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                    margin-bottom: 20px;
                }
                
                .filter-section label {
                    font-weight: 600;
                    color: #495057;
                    margin-bottom: 8px;
                    display: block;
                }
                
                .filter-section .form-control {
                    border-radius: 6px;
                    border: 1px solid #e0e0e0;
                    padding: 10px 15px;
                    height: auto;
                }
                
                .room-list-container {
                    margin: 0 -10px;
                }
                
                .room-card {
                    border: none;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    transition: all 0.3s ease;
                    margin-bottom: 20px;
                    background-color: #fff;
                }
                
                .room-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.12);
                }
                
                .room-card-header {
                    background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
                    color: white;
                    padding: 15px 20px;
                    border-bottom: none;
                }
                
                .room-card-header h5 {
                    font-weight: 700;
                    margin: 0;
                }
                
                .room-card-body {
                    padding: 20px;
                }
                
                .room-card-body p {
                    margin-bottom: 10px;
                    color: #555;
                }
                
                .room-card-body i {
                    margin-left: 8px;
                    color: #6c757d;
                }
                
                .room-card hr {
                    margin: 15px 0;
                    border-color: #eee;
                }
                
                .slots-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 12px;
                    margin-top: 15px;
                }
                
                .time-slot {
                    padding: 12px;
                    border-radius: 8px;
                    text-align: center;
                    cursor: pointer;
                    font-size: 14px;
                    border: 1px solid transparent;
                    transition: all 0.2s ease;
                    position: relative;
                    overflow: hidden;
                }
                
                .time-slot.available {
                    background-color: #f0f9ff;
                    border-color: #d1e7ff;
                    color: #0d6efd;
                }
                
                .time-slot.available:hover {
                    background-color: #e2f0ff;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(13, 110, 253, 0.15);
                }
                
                .time-slot.available.selected {
                    background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%);
                    color: white;
                    font-weight: bold;
                    border-color: #0b5ed7;
                }
                
                .time-slot.booked {
                    background-color: #fff8f0;
                    border-color: #ffe8cc;
                    color: #fd7e14;
                }
                
                .time-slot.booked:hover {
                    background-color: #ffeedb;
                }
                
                .time-slot .slot-icon {
                    margin-left: 5px;
                }
                
                .time-slot .small {
                    font-size: 12px;
                    opacity: 0.9;
                }
                
                .badge {
                    font-weight: 500;
                    padding: 5px 10px;
                    border-radius: 50px;
                }
                
                .badge-success {
                    background-color: #198754;
                }
                
                .badge-info {
                    background-color: #0dcaf0;
                }
                
                .loading-state {
                    padding: 40px 0;
                }
                
                .loading-state .spinner-border {
                    width: 3rem;
                    height: 3rem;
                    border-width: 0.25em;
                    color: #6a11cb;
                }
                
                .loading-state p {
                    margin-top: 15px;
                    font-size: 16px;
                    color: #6c757d;
                }
                
                .alert {
                    border-radius: 8px;
                    padding: 15px;
                }
                
                /* Animation for slots */
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .time-slot {
                    animation: fadeIn 0.3s ease forwards;
                }
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .slots-grid {
                        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    }
                    
                    .filter-section .col-md-4 {
                        margin-bottom: 15px;
                    }
                }
            </style>
        `;
        $("head").append(styles);
    }

    bind_events() {
        this.wrapper.on('change', '.branch-filter, .date-filter, .capacity-filter', () => this.load_rooms());
        this.wrapper.on('click', '.time-slot.available', (e) => this.handle_slot_click(e));
        this.wrapper.on('click', '.time-slot.booked', (e) => this.handle_booked_slot_click(e));
    }

    // ... [بقية الدوال تبقى كما هي بدون تغيير] ...
    async load_branches() {
        try {
            const { message: branches = [] } = await frappe.call('room_booking.api.get_branches');
            const $select = this.wrapper.find('.branch-filter').empty();
            $select.append(`<option value="">${__('كل الفروع')}</option>`);
            branches.forEach(b => $select.append(`<option value="${b}">${b}</option>`));
            this.load_rooms();
        } catch (error) {
            this.show_error(__('فشل تحميل الفروع'));
        }
    }

    async load_rooms() {
        if (this.state.isLoading) return;
        
        this.set_loading(true);
        this.clear_selection();
        
        try {
            const filters = {
                branch: this.wrapper.find('.branch-filter').val(),
                date: this.wrapper.find('.date-filter').val(),
                capacity: this.wrapper.find('.capacity-filter').val()
            };
            
            const { message: rooms = [] } = await frappe.call({
                method: 'room_booking.api.get_available_rooms_with_slots',
                args: filters
            });
            
            this.state.slotsData = {};
            this.render_rooms(rooms);
            
        } catch (error) {
            this.show_error(__('فشل تحميل الغرف'));
        } finally {
            this.set_loading(false);
        }
    }

    render_rooms(rooms) {
        const $container = this.wrapper.find('.room-list-container').empty();
        
        if (!rooms.length) {
            $container.html(`
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="fa fa-info-circle"></i>
                        ${__('لا توجد غرف متاحة للشروط المحددة')}
                    </div>
                </div>
            `);
            return;
        }
        
        rooms.forEach(room => {
            this.state.slotsData[room.name] = room.available_slots || [];
            
            const $card = $(`
                <div class="col-md-6 col-lg-4">
                    <div class="card room-card h-100">
                        <div class="card-header room-card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">
                                <i class="fa fa-door-open"></i> ${room.room_name}
                            </h5>
                            <span class="badge ${room.status === 'Available' ? 'badge-success' : 'badge-info'}">
                                ${room.status}
                            </span>
                        </div>
                        <div class="card-body room-card-body">
                            <p><i class="fa fa-users"></i> ${room.no_of_seats} ${__('مقاعد')}</p>
                            <p><i class="fa fa-money-bill-wave"></i> 
                                ${this.format_currency(room.price_per_hour)}/${__('ساعة')}
                            </p>
                            <hr>
                            <h6><i class="fa fa-clock"></i> ${__('الفترات المتاحة')}</h6>
                            <div class="slots-grid" data-room="${room.name}"></div>
                        </div>
                    </div>
                </div>
            `);
            
            $container.append($card);
            this.render_slots(room.name);
        });
    }

    render_slots(roomName) {
        const slots = this.state.slotsData[roomName] || [];
        const $container = this.wrapper.find(`.slots-grid[data-room="${roomName}"]`).empty();
        
        if (!slots.length) {
            $container.html(`
                <div class="col-12">
                    <div class="alert alert-warning">
                        <i class="fa fa-exclamation-circle"></i>
                        ${__('لا توجد فترات متاحة')}
                    </div>
                </div>
            `);
            return;
        }
        
        slots.forEach(slot => {
            const isBooked = (slot.status || '').toLowerCase() === 'booked';
            const startTime = this.format_time(slot.start_time);
            const endTime = this.format_time(slot.end_time);
            const duration = this.calculate_duration(slot.start_time, slot.end_time);
            
            $container.append(`
                <div class="time-slot ${isBooked ? 'booked' : 'available'}" 
                     data-room="${roomName}"
                     data-start="${slot.start_time}"
                     data-end="${slot.end_time}"
                     data-status="${slot.status}"
                     data-price="${slot.price}"
                     data-booking-id="${slot.booking_id || ''}">
                    <div>
                        <i class="fa fa-${isBooked ? 'lock' : 'calendar-alt'} slot-icon"></i>
                        ${startTime} - ${endTime}
                    </div>
                    <div class="small mt-1">
                        ${duration} ${__('ساعة')} • ${this.format_currency(slot.price)}
                    </div>
                </div>
            `);
        });
    }

    handle_slot_click(e) {
        const $slot = $(e.currentTarget);
        $slot.toggleClass('selected');
        
        const slotData = {
            room: $slot.data('room'),
            start: $slot.data('start'),
            end: $slot.data('end'),
            price: $slot.data('price'),
            status: $slot.data('status'),
            booking_id: $slot.data('booking-id')
        };
        
        if ($slot.hasClass('selected')) {
            this.state.selectedSlots.push(slotData);
            this.show_booking_dialog(slotData);
            this.wrapper.find('.time-slot.selected').not($slot).removeClass('selected');
            this.state.selectedSlots = [slotData];
        } else {
            this.state.selectedSlots = this.state.selectedSlots.filter(s => 
                !(s.room === slotData.room && s.start === slotData.start)
            );
        }
        
        this.update_selection_summary();
        
        if (this.state.selectedSlots.length === 1 && this.events.slot_selected) {
            this.events.slot_selected({
                room: slotData.room,
                slot: slotData,
                is_booked: slotData.status === 'booked'
            });
        }
    }

    handle_booked_slot_click(e) {
        const $slot = $(e.currentTarget);
        const bookingInfo = {
            room: $slot.data('room'),
            start: $slot.data('start'),
            end: $slot.data('end'),
            booking_id: $slot.data('booking-id'),
            status: $slot.data('status')
        };

        const dialog = new frappe.ui.Dialog({
            title: __('خيارات الحجز'),
            fields: [
                {
                    fieldname: 'action',
                    fieldtype: 'Select',
                    label: __('اختر الإجراء'),
                    options: [
                        { label: __('تعديل الحجز'), value: 'update' },
                        { label: __('إلغاء الحجز'), value: 'cancel' },
                        { label: __('تفريغ الغرفة'), value: 'clear' }
                    ],
                    reqd: 1
                }
            ],
            primary_action_label: __('تنفيذ'),
            primary_action: async (values) => {
                dialog.hide();

                if(values.action === 'update') {
                    this.open_update_booking_dialog(bookingInfo);
                } else if(values.action === 'cancel') {
                    await this.cancel_booking(bookingInfo.booking_id);
                } else if(values.action === 'clear') {
                    await this.clear_room(bookingInfo.room, this.wrapper.find('.date-filter').val());
                }

                this.reload_rooms();
            }
        });

        dialog.show();
    }

    show_booking_dialog(slotData, is_update = false) {
        if (this.state.currentDialog) {
            this.state.currentDialog.hide();
        }

        const formatTimeForDisplay = (timeStr) => {
            if (!timeStr) return '00:00';
            const parts = timeStr.split(':');
            return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : '00:00';
        };

        const defaultCustomer = is_update ? slotData.customer_name || '' : '';
        const defaultBookingDate = this.wrapper.find('.date-filter').val() || frappe.datetime.get_today();
        const defaultStartTime = formatTimeForDisplay(slotData.start);
        const defaultEndTime = formatTimeForDisplay(slotData.end);
        const defaultHours = this.calculate_duration(slotData.start, slotData.end);
        const defaultAmount = slotData.price ? parseFloat(slotData.price).toFixed(2) : '0.00';

        const dialog = new frappe.ui.Dialog({
            title: is_update ? __('تعديل الحجز') : __('حجز غرفة'),
            fields: [
                {
                    label: __('اسم العميل'),
                    fieldname: 'customer',
                    fieldtype: 'Link',
                    options: 'Customer',
                    reqd: 1,
                    default: defaultCustomer
                },
                {
                    label: __('تاريخ الحجز'),
                    fieldname: 'booking_date',
                    fieldtype: 'Date',
                    default: defaultBookingDate,
                    read_only: !is_update
                },
                {
                    label: __('وقت الدخول'),
                    fieldname: 'start_time',
                    fieldtype: 'Data',
                    default: defaultStartTime,
                    reqd: 1,
                    description: __('التنسيق: HH:mm (مثال: 14:30)')
                },
                {
                    label: __('عدد الساعات'),
                    fieldname: 'hours',
                    fieldtype: 'Float',
                    default: defaultHours,
                    reqd: 1
                },
                {
                    label: __('وقت الخروج'),
                    fieldname: 'end_time',
                    fieldtype: 'Data',
                    default: defaultEndTime,
                    read_only: true
                },
                {
                    label: __('السعر'),
                    fieldname: 'amount',
                    fieldtype: 'Data',
                    default: __('ر.س') + ' ' + defaultAmount,
                    read_only: true
                },
                {
                    label: __('ملاحظات'),
                    fieldname: 'notes',
                    fieldtype: 'Text',
                    default: slotData.notes || ''
                }
            ],
            primary_action_label: is_update ? __('تحديث') : __('حجز'),
            primary_action: async (values) => {
                if (!this.validateTimeFormat(values.start_time)) {
                    frappe.msgprint(__('صيغة وقت الدخول غير صحيحة. يجب أن تكون HH:mm'));
                    return;
                }

                values.start_time = this.format_time_for_backend(values.start_time);
                values.end_time = this.format_time_for_backend(values.end_time);

                this.set_loading(true);

                try {
                    if (is_update) {
                        await frappe.call({
                            method: 'room_booking.api.update_booking',
                            args: {
                                booking_id: slotData.booking_id,
                                booking: JSON.stringify({
                                    rental_room: slotData.room,
                                    start_datetime: `${values.booking_date} ${values.start_time}`,
                                    end_datetime: `${values.booking_date} ${values.end_time}`,
                                    customer_name: values.customer,
                                    notes: values.notes,
                                    amount: values.amount.replace(/[^\d.]/g, '')
                                })
                            },
                            freeze: true
                        });
                        frappe.show_alert({ message: __('تم تحديث الحجز بنجاح'), indicator: 'green' });
                    } else {
                        await frappe.call({
                            method: 'room_booking.api.create_booking',
                            args: {
                                booking: [{
                                    rental_room: slotData.room,
                                    start_datetime: `${values.booking_date} ${values.start_time}`,
                                    end_datetime: `${values.booking_date} ${values.end_time}`,
                                    customer_name: values.customer,
                                    notes: values.notes,
                                    amount: values.amount.replace(/[^\d.]/g, '')
                                }]
                            },
                            freeze: true
                        });
                        frappe.show_alert({ message: __('تم الحجز بنجاح'), indicator: 'green' });
                    }

                    dialog.hide();
                    this.reload_rooms();

                    if (is_update && this.events.booking_updated) {
                        this.events.booking_updated(slotData.booking_id);
                    }
                    if (!is_update && this.events.booking_created) {
                        this.events.booking_created();
                    }

                } catch (error) {
                    frappe.msgprint({ title: __('خطأ'), message: error.message || error, indicator: 'red' });
                } finally {
                    this.set_loading(false);
                }
            }
        });

        dialog.fields_dict.start_time.$input.on('change', () => {
            const timeValue = dialog.get_value('start_time');
            if (!this.validateTimeFormat(timeValue)) {
                frappe.msgprint(__('صيغة الوقت غير صحيحة. يجب أن تكون HH:mm (مثال: 14:30)'));
                dialog.set_value('start_time', '00:00');
                return;
            }
            this.update_booking_times(dialog, slotData, 'start');
        });

        dialog.fields_dict.hours.$input.on('change', () => {
            let hours = parseFloat(dialog.get_value('hours'));
            if (isNaN(hours) || hours < 1 || hours > 24) {
                frappe.msgprint(__('عدد الساعات يجب أن يكون بين 1 و 24'));
                dialog.set_value('hours', 1);
                hours = 1;
            }
            this.update_booking_times(dialog, slotData, 'hours');
        });

        dialog.show();
        this.state.currentDialog = dialog;
    }

    validateTimeFormat(timeStr) {
        if (!timeStr) return false;
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(timeStr);
    }

    format_time_for_backend(timeStr) {
        if (!timeStr) return '00:00:00';
        const parts = timeStr.split(':');
        if (parts.length === 2) {
            return `${parts[0]}:${parts[1]}:00`;
        }
        return timeStr;
    }

    update_booking_times(dialog, slotData, changedField) {
        const startTime = dialog.get_value('start_time');
        if (!this.validateTimeFormat(startTime)) {
            return;
        }

        let hours = parseFloat(dialog.get_value('hours'));
        hours = Math.max(1, Math.min(hours, 24));
        
        const endTime = this.calculate_end_time(startTime, hours);
        dialog.set_value('end_time', endTime);
        
        const pricePerHour = slotData.price / this.calculate_duration(slotData.start, slotData.end);
        const price = (hours * pricePerHour).toFixed(2);
        dialog.set_value('amount', price);
    }

    calculate_end_time(startTime, hours) {
        const [hoursPart, minutesPart] = startTime.split(':').map(Number);
        const totalMinutes = hoursPart * 60 + minutesPart + Math.round(hours * 60);
        
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        
        return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    }

    async cancel_booking(booking_id) {
        try {
            await frappe.call({
                method: 'room_booking.api.cancel_booking',
                args: { booking_id },
                freeze: true
            });
            frappe.show_alert({ message: __('تم إلغاء الحجز بنجاح'), indicator: 'green' });
        } catch (error) {
            frappe.msgprint({ title: __('خطأ'), message: __('فشل إلغاء الحجز') + ': ' + error.message, indicator: 'red' });
        }
    }

    async clear_room(room, date) {
        try {
            await frappe.call({
                method: 'room_booking.api.clear_room',
                args: { room, date },
                freeze: true
            });
            frappe.show_alert({ message: __('تم تفريغ الغرفة بنجاح'), indicator: 'green' });
        } catch (error) {
            frappe.msgprint({ title: __('خطأ'), message: __('فشل تفريغ الغرفة') + ': ' + error.message, indicator: 'red' });
        }
    }

    open_update_booking_dialog(bookingInfo) {
        const slotData = {
            room: bookingInfo.room,
            start: bookingInfo.start,
            end: bookingInfo.end,
            price: 0,
            booking_id: bookingInfo.booking_id,
            status: bookingInfo.status
        };

        this.show_booking_dialog(slotData, true);
    }

    update_selection_summary() {
        const $summary = this.wrapper.find('.selection-summary');
        
        if (!this.state.selectedSlots.length) {
            $summary.hide();
            return;
        }
        
        const firstSlot = this.state.selectedSlots[0];
        
        this.wrapper.find('.selected-period').text(
            `${this.format_time(firstSlot.start)} - ${this.format_time(firstSlot.end)}`
        );
        
        const duration = this.calculate_duration(firstSlot.start, firstSlot.end);
        this.wrapper.find('.selected-duration').text(`${duration} ${__('ساعة')}`);
        this.wrapper.find('.selected-price').text(this.format_currency(firstSlot.price));
        
        $summary.show();
    }

    clear_selection() {
        this.state.selectedSlots = [];
        this.wrapper.find('.selection-summary').hide();
        this.wrapper.find('.time-slot').removeClass('selected');
    }

    set_loading(loading) {
        this.state.isLoading = loading;
        this.wrapper.find('.loading-state').toggle(loading);
        this.wrapper.find('.filter-section, .room-list-container').toggle(!loading);
    }

    reload_rooms() {
        this.load_rooms();
    }

    show_error(message) {
        frappe.msgprint({
            title: __('خطأ'),
            message: message,
            indicator: 'red'
        });
    }

    format_time(timeStr) {
        if (!timeStr) return '00:00';
        return timeStr.split(':').slice(0, 2).join(':');
    }

    calculate_duration(start, end) {
        const startTime = new Date(`2000-01-01T${start}:00`);
        const endTime = new Date(`2000-01-01T${end}:00`);
        return ((endTime - startTime) / (1000 * 60 * 60)).toFixed(1);
    }

    format_currency(amount) {
        return parseFloat(amount || 0).toFixed(2) + ' ' + __('ر.س');
    }
};