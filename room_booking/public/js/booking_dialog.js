frappe.provide("room_booking.RoomBooking");

/**
 * مكون دايالوج تأكيد الحجز
 * @class room_booking.RoomBooking.BookingDialog
 */
room_booking.RoomBooking.BookingDialog = class {
    constructor({ events = {}, settings = {} }) {
        this.events = events;
        this.settings = settings;
        this.dialog = null;
    }

    /**
     * عرض دايالوج الحجز
     * @param {object} room - بيانات الغرفة
     * @param {object} slot - بيانات الفترة الزمنية
     * @param {function} [onSuccess] - دالة استدعاء عند نجاح الحجز
     */
    show(room, slot, onSuccess) {
        const duration = room_booking.RoomBooking.helpers.calculateDuration(slot.start, slot.end);
        const pricePerHour = room.price_per_hour || 0;
        
        this.dialog = new frappe.ui.Dialog({
            title: __('Confirm Booking'),
            size: 'large',
            fields: [
                {
                    label: __('Room'),
                    fieldname: 'room',
                    fieldtype: 'Data',
                    read_only: true,
                    default: room.room_name,
                    description: __('Selected room')
                },
                {
                    label: __('Customer'),
                    fieldname: 'customer',
                    fieldtype: 'Link',
                    options: 'Customer',
                    reqd: 1,
                    get_query: () => {
                        return {
                            filters: { 'disabled': 0 }
                        };
                    }
                },
                {
                    label: __('Date'),
                    fieldname: 'date',
                    fieldtype: 'Date',
                    reqd: true,
                    default: frappe.datetime.get_today(),
                    min_date: frappe.datetime.get_today()
                },
                {
                    label: __('Start Time'),
                    fieldname: 'start_time',
                    fieldtype: 'Time',
                    default: room_booking.RoomBooking.helpers.formatTimeForFrontend(slot.start),
                    reqd: 1,
                    change: () => this.update_calculations()
                },
                {
                    label: __('Duration (hours)'),
                    fieldname: 'duration',
                    fieldtype: 'Float',
                    default: duration,
                    reqd: 1,
                    min: 0.5,
                    max: 24,
                    change: () => this.update_end_time()
                },
                {
                    label: __('End Time'),
                    fieldname: 'end_time',
                    fieldtype: 'Time',
                    read_only: true,
                    reqd: 1
                },
                {
                    label: __('Price per Hour'),
                    fieldname: 'price_per_hour',
                    fieldtype: 'Currency',
                    read_only: true,
                    default: pricePerHour
                },
                {
                    label: __('Total Price'),
                    fieldname: 'amount',
                    fieldtype: 'Currency',
                    read_only: true,
                    default: slot.price
                },
                {
                    label: __('Notes'),
                    fieldname: 'notes',
                    fieldtype: 'Text Area',
                    rows: 3
                }
            ],
            primary_action_label: __('Confirm Booking'),
            primary_action: (values) => this.submit_booking(room, values, onSuccess),
            secondary_action_label: __('Cancel'),
            secondary_action: () => this.dialog.hide()
        });

        this.setup_event_listeners();
        this.update_end_time(); // حساب الوقت النهائي الأولي
        this.dialog.show();
    }

    setup_event_listeners() {
        this.dialog.fields_dict.start_time.$input.on('input', () => {
            this.validate_time_input('start_time');
        });
    }

    validate_time_input(fieldname) {
        const value = this.dialog.get_value(fieldname);
        const $input = this.dialog.fields_dict[fieldname].$input;
        
        if (!room_booking.RoomBooking.helpers.validateTimeFormat(value)) {
            $input.addClass('invalid-input');
            return false;
        }
        
        $input.removeClass('invalid-input');
        return true;
    }

    update_end_time() {
        const duration = parseFloat(this.dialog.get_value('duration')) || 1;
        const startTime = this.dialog.get_value('start_time');
        
        if (!this.validate_time_input('start_time')) return;
        
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + Math.round(duration * 60);
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        
        const formattedEndTime = room_booking.RoomBooking.helpers.formatTime(endHours, endMinutes);
        this.dialog.set_value('end_time', formattedEndTime);
        this.update_calculations();
    }

    update_calculations() {
        const duration = parseFloat(this.dialog.get_value('duration')) || 0;
        const pricePerHour = parseFloat(this.dialog.get_value('price_per_hour')) || 0;
        const totalPrice = pricePerHour * duration;
        
        this.dialog.set_value('amount', totalPrice);
    }

    /**
     * إرسال بيانات الحجز
     * @param {object} room - بيانات الغرفة
     * @param {object} values - قيم النموذج
     * @param {function} [onSuccess] - دالة استدعاء عند النجاح
     */
    async submit_booking(room, values, onSuccess) {
        if (!this.validate_time_input('start_time')) {
            frappe.msgprint(__('Please enter a valid start time in HH:mm format'));
            return;
        }

        if (!values.customer) {
            frappe.msgprint(__('Please select a customer'));
            return;
        }

        try {
            const bookingData = {
                rental_room: room.name,
                start_datetime: `${values.date} ${room_booking.RoomBooking.helpers.formatTimeForBackend(values.start_time)}`,
                end_datetime: `${values.date} ${room_booking.RoomBooking.helpers.formatTimeForBackend(values.end_time)}`,
                customer_name: values.customer,
                notes: values.notes || '',
                amount: values.amount
            };

            await frappe.call({
                method: 'room_booking.api.create_booking',
                args: { bookings: [bookingData] },
                freeze: true,
                callback: (r) => {
                    if (!r.exc) {
                        frappe.show_alert({
                            message: __('Booking created successfully'),
                            indicator: 'green'
                        });
                        this.dialog.hide();
                        if (onSuccess) onSuccess();
                    }
                }
            });
        } catch (error) {
            console.error('Booking error:', error);
            frappe.msgprint({
                title: __('Booking Failed'),
                message: __('An error occurred while creating the booking. Please try again.'),
                indicator: 'red'
            });
        }
    }
};