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
        this.currentBooking = null;
    }

    /**
     * عرض دايالوج الحجز
     * @param {object} room - بيانات الغرفة
     * @param {object} slot - بيانات الفترة الزمنية
     * @param {function} [onSuccess] - دالة استدعاء عند نجاح الحجز
     * @param {object} [booking] - بيانات الحجز الحالية (للتعديل)
     */
    show(room, slot, onSuccess, booking = null) {
        this.currentBooking = booking;
        const isEditMode = !!booking;
        const duration = room_booking.RoomBooking.helpers.calculateDuration(slot.start, slot.end);
        const pricePerHour = room.price_per_hour || 0;
        const defaultDate = booking ? booking.start_datetime.split(' ')[0] : frappe.datetime.get_today();

        this.dialog = new frappe.ui.Dialog({
            title: isEditMode ? __('Edit Booking') : __('New Booking'),
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
                    default: booking ? booking.customer_name : null,
                    get_query: () => ({ filters: { 'disabled': 0 } })
                },
                {
                    label: __('Date'),
                    fieldname: 'date',
                    fieldtype: 'Date',
                    reqd: true,
                    default: defaultDate,
                    min_date: frappe.datetime.get_today(),
                    change: () => this.validate_booking()
                },
                {
                    label: __('Start Time'),
                    fieldname: 'start_time',
                    fieldtype: 'Time',
                    default: room_booking.RoomBooking.helpers.formatTimeForFrontend(slot.start),
                    reqd: 1,
                    change: () => {
                        this.validate_time_input('start_time');
                        this.update_end_time();
                        this.validate_booking();
                    }
                },
                {
                    label: __('Duration (hours)'),
                    fieldname: 'duration',
                    fieldtype: 'Float',
                    default: duration,
                    reqd: 1,
                    min: 0.5,
                    max: 24,
                    change: () => {
                        this.update_end_time();
                        this.validate_booking();
                    }
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
                    rows: 3,
                    default: booking ? booking.notes : ''
                },
                {
                    fieldname: 'validation_section',
                    fieldtype: 'Section Break',
                    label: __('Validation'),
                    collapsible: 1,
                    collapsed: 1,
                    depends_on: 'eval:!doc.__islocal'
                },
                {
                    label: __('Availability Check'),
                    fieldname: 'availability_status',
                    fieldtype: 'HTML',
                    read_only: true
                }
            ],
            primary_action_label: isEditMode ? __('Update Booking') : __('Confirm Booking'),
            primary_action: (values) => this.submit_booking(room, values, onSuccess, isEditMode),
            secondary_action_label: __('Cancel')
        });

        this.setup_event_listeners();
        this.update_end_time();
        this.validate_booking();
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
        
        const endTime = room_booking.RoomBooking.helpers.calculateEndTime(startTime, duration);
        this.dialog.set_value('end_time', endTime);
        this.update_calculations();
    }

    update_calculations() {
        const duration = parseFloat(this.dialog.get_value('duration')) || 0;
        const pricePerHour = parseFloat(this.dialog.get_value('price_per_hour')) || 0;
        const totalPrice = pricePerHour * duration;
        
        this.dialog.set_value('amount', totalPrice);
    }

    async validate_booking() {
        const values = this.dialog.get_values();
        if (!values || !values.date || !values.start_time || !values.end_time) return;

        try {
            const isAvailable = await frappe.call({
                method: 'room_booking.api.check_slot_availability',
                args: {
                    room: this.currentBooking?.rental_room || '',
                    date: values.date,
                    start_time: room_booking.RoomBooking.helpers.formatTimeForBackend(values.start_time),
                    end_time: room_booking.RoomBooking.helpers.formatTimeForBackend(values.end_time),
                    exclude_booking: this.currentBooking?.name
                }
            });

            const statusField = this.dialog.fields_dict.availability_status;
            if (isAvailable.message) {
                statusField.$wrapper.html(`
                    <div class="alert alert-success">
                        <i class="fa fa-check-circle"></i>
                        ${__('This time slot is available for booking')}
                    </div>
                `);
            } else {
                statusField.$wrapper.html(`
                    <div class="alert alert-danger">
                        <i class="fa fa-exclamation-circle"></i>
                        ${__('This time slot is not available')}
                    </div>
                `);
            }
        } catch (error) {
            console.error('Validation error:', error);
        }
    }

    async submit_booking(room, values, onSuccess, isEditMode = false) {
        // التحقق من صحة المدخلات
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

            if (isEditMode && this.currentBooking) {
                bookingData.name = this.currentBooking.name;
                await frappe.call({
                    method: 'room_booking.api.update_booking',
                    args: { booking: bookingData },
                    freeze: true
                });
            } else {
                await frappe.call({
                    method: 'room_booking.api.create_booking',
                    args: { bookings: [bookingData] },
                    freeze: true
                });
            }

            frappe.show_alert({
                message: isEditMode ? __('Booking updated successfully') : __('Booking created successfully'),
                indicator: 'green'
            });
            
            this.dialog.hide();
            if (onSuccess) onSuccess();

        } catch (error) {
            console.error('Booking error:', error);
            frappe.msgprint({
                title: __('Booking Failed'),
                message: __('An error occurred while processing your booking. Please try again.'),
                indicator: 'red'
            });
        }
    }
};

