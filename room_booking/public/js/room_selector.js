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

                <div class="selection-summary alert alert-info mt-3" style="display:none;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong><i class="fa fa-check-circle"></i> ${__('Selected')}:</strong> 
                            <span class="selected-period"></span> | 
                            <span class="selected-duration"></span> | 
                            <span class="selected-price"></span>
                        </div>
                        <button class="btn btn-primary btn-book">
                            <i class="fa fa-calendar-check"></i> ${__('Book Now')}
                        </button>
                    </div>
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
                }
                
                .slots-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    gap: 10px;
                    margin-top: 15px;
                }
                
                .time-slot {
                    padding: 10px;
                    border-radius: 6px;
                    text-align: center;
                    cursor: pointer;
                    font-size: 13px;
                    border: 1px solid #ddd;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                
                .time-slot.available {
                    background-color: #e8f5e9;
                    border-color: #a5d6a7;
                    color: #2e7d32;
                }
                
                .time-slot.available:hover {
                    background-color: #c8e6c9;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                
                .time-slot.available.selected {
                    background-color: #4caf50;
                    color: white;
                    font-weight: bold;
                }
                
                .time-slot.booked {
                    background-color: #e3f2fd;
                    border-color: #90caf9;
                    color: #1565c0;
                }
                
                .time-slot.booked:hover {
                    background-color: #bbdefb;
                }
                
                .time-slot .slot-icon {
                    margin-left: 5px;
                }
                
                .selection-summary {
                    animation: fadeIn 0.3s ease;
                    background-color: #e3f2fd;
                    border-color: #bbdefb;
                }
            </style>
        `;
        $("head").append(styles);
    }

    bind_events() {
        this.wrapper.on('change', '.branch-filter, .date-filter, .capacity-filter', () => this.load_rooms());
        this.wrapper.on('click', '.time-slot.available', (e) => this.handle_slot_click(e));
        this.wrapper.on('click', '.time-slot.booked', (e) => this.handle_booked_slot_click(e));
        this.wrapper.on('click', '.btn-book', () => this.handle_book_click());
    }

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
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">
                                <i class="fa fa-door-open"></i> ${room.room_name}
                            </h5>
                            <span class="badge ${room.status === 'Available' ? 'badge-success' : 'badge-info'}">
                                ${room.status}
                            </span>
                        </div>
                        <div class="card-body">
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
        
        // Update selected slots
        if ($slot.hasClass('selected')) {
            this.state.selectedSlots.push(slotData);
        } else {
            this.state.selectedSlots = this.state.selectedSlots.filter(s => 
                !(s.room === slotData.room && s.start === slotData.start)
            );
        }
        
        this.update_selection_summary();
        
        // Trigger event if only one slot is selected
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
        
        if (this.events.booked_slot_clicked) {
            this.events.booked_slot_clicked(bookingInfo);
        }
    }

    handle_book_click() {
        if (!this.state.selectedSlots.length) return;
        
        const slotData = this.state.selectedSlots[0];
        this.show_booking_dialog(slotData);
    }

    show_booking_dialog(slotData) {
        if (this.state.currentDialog) {
            this.state.currentDialog.hide();
        }

        const formatTimeForDisplay = (timeStr) => {
            if (!timeStr) return '00:00';
            const parts = timeStr.split(':');
            return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : '00:00';
        };

        const dialog = new frappe.ui.Dialog({
            title: __('حجز غرفة'),
            fields: [
                {
                    label: __('اسم العميل'),
                    fieldname: 'customer',
                    fieldtype: 'Link',
                    options: 'Customer',
                    reqd: 1
                },
                {
                    label: __('تاريخ الحجز'),
                    fieldname: 'booking_date',
                    fieldtype: 'Date',
                    default: this.wrapper.find('.date-filter').val(),
                    read_only: 1
                },
                {
                    label: __('وقت الدخول'),
                    fieldname: 'start_time',
                    fieldtype: 'Data', // Changed from 'Time' to 'Data'
                    default: formatTimeForDisplay(slotData.start),
                    reqd: 1,
                    description: __('التنسيق: HH:mm (مثال: 14:30)')
                },
                {
                    label: __('عدد الساعات'),
                    fieldname: 'hours',
                    fieldtype: 'Float',
                    default: this.calculate_duration(slotData.start, slotData.end),
                    reqd: 1
                },
                {
                    label: __('وقت الخروج'),
                    fieldname: 'end_time',
                    fieldtype: 'Data', // Changed from 'Time' to 'Data'
                    default: formatTimeForDisplay(slotData.end),
                    read_only: 1
                },
                {
                    label: __('السعر'),
                    fieldname: 'amount',
                    fieldtype: 'Currency',
                    default: slotData.price,
                    read_only: 1
                },
                {
                    label: __('ملاحظات'),
                    fieldname: 'notes',
                    fieldtype: 'Text'
                }
            ],
            primary_action_label: __('حجز'),
            primary_action: (values) => {
                if (!this.validateTimeFormat(values.start_time)) {
                    frappe.msgprint(__('صيغة وقت الدخول غير صحيحة. يجب أن تكون HH:mm'));
                    return;
                }

                // Format time for backend
                values.start_time = this.format_time_for_backend(values.start_time);
                values.end_time = this.format_time_for_backend(values.end_time);
                
                this.submit_booking(values, slotData);
            }
        });

        // Add time validation on change
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
            const hours = parseFloat(dialog.get_value('hours'));
            if (hours < 1 || hours > 24) {
                frappe.msgprint(__('عدد الساعات يجب أن يكون بين 1 و 24'));
                dialog.set_value('hours', 1);
                return;
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
        
        // Update price
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

    async submit_booking(values, slotData) {
        try {
            this.set_loading(true);
            
            const bookingData = {
                rental_room: slotData.room,
                start_datetime: `${values.booking_date} ${values.start_time}`,
                end_datetime: `${values.booking_date} ${values.end_time}`,
                customer_name: values.customer,
                notes: values.notes,
                amount: values.amount
            };

            await frappe.call({
                method: 'room_booking.api.create_booking',
                args: { booking: bookingData },
                freeze: true
            });

            frappe.show_alert({
                message: __('تم الحجز بنجاح'),
                indicator: 'green'
            });

            if (this.state.currentDialog) {
                this.state.currentDialog.hide();
            }

            this.reload_rooms();
            
            if (this.events.booking_created) {
                this.events.booking_created(bookingData);
            }

        } catch (error) {
            console.error('خطأ في الحجز:', error);
            frappe.msgprint({
                title: __('خطأ في الحجز'),
                message: __('حدث خطأ أثناء محاولة الحجز: ') + error.message,
                indicator: 'red'
            });
        } finally {
            this.set_loading(false);
        }
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

    // Helper methods
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