class BookingDialog {
    constructor(app) {
        this.app = app;
    }

    open() {
        const selectedSlots = this.app.stateService.getSelectedSlots();
        const selectedRoom = this.app.stateService.getSelectedRoom();

        if (!selectedSlots.length) {
            frappe.msgprint({
                title: __('No Selection'),
                message: __('Please select time slots first'),
                indicator: 'red'
            });
            return;
        }

        const first = selectedSlots[0];
        const last = selectedSlots[selectedSlots.length - 1];
        const totalPrice = selectedSlots.reduce((sum, slot) => sum + slot.price, 0);

        const now = new Date();
        const currentTime = this.app.apiService.formatTime(now.getHours(), now.getMinutes());

        this.dialog = new frappe.ui.Dialog({
            title: __('Confirm Booking'),
            fields: [
                {
                    label: __('Customer'),
                    fieldname: 'customer',
                    fieldtype: 'Link',
                    options: 'Customer',
                    reqd: 1,
                    description: __('Select customer from the list')
                },
                {
                    label: __('Date'),
                    fieldname: 'date',
                    fieldtype: 'Data',
                    read_only: 1,
                    default: this.app.$container.find('.date-filter').val()
                },
                {
                    label: __('Start Time'),
                    fieldname: 'start_time',
                    fieldtype: 'Data',
                    default: this.app.apiService.formatTimeForFrontend(first.start),
                    reqd: 1,
                    description: __('Format: HH:mm (e.g. 09:30)'),
                    change: () => {
                        if (this.validateTimeInput('start_time')) {
                            this.updateEndTimeBasedOnDuration();
                        }
                    }
                },
                {
                    label: __('Duration (hours)'),
                    fieldname: 'duration',
                    fieldtype: 'Float',
                    default: this.app.apiService.calculateDuration(first.start, last.end),
                    reqd: 1,
                    description: __('Enter booking duration in hours'),
                    change: () => this.updateEndTimeBasedOnDuration()
                },
                {
                    label: __('End Time'),
                    fieldname: 'end_time',
                    fieldtype: 'Data',
                    read_only: 1,
                    reqd: 1
                },
                {
                    label: __('Total Price'),
                    fieldname: 'amount',
                    fieldtype: 'Currency',
                    read_only: 1,
                    default: totalPrice
                },
                {
                    label: __('Notes'),
                    fieldname: 'notes',
                    fieldtype: 'Text',
                    description: __('Any special requirements or notes')
                }
            ],
            primary_action_label: __('Confirm Booking'),
            primary_action: values => this.submitBooking(values)
        });

        this.dialog.fields_dict.start_time.$input.attr('placeholder', 'HH:mm');
        this.dialog.fields_dict.duration.$input.attr('placeholder', 'e.g. 1.5 for 1 hour 30 minutes');

        this.dialog.show();
        this.updateEndTimeBasedOnDuration();

        // Add real-time validation
        this.dialog.fields_dict.start_time.$input.on('input', () => {
            const value = this.dialog.get_value('start_time');
            const isValid = /^([01]?[0-9]|2[0-3]):?([0-5]?[0-9])?$/.test(value);
            this.dialog.fields_dict.start_time.$input.toggleClass('invalid-input', !isValid);
        });
    }

    validateTimeInput(fieldname) {
        const value = this.dialog.get_value(fieldname);
        const $input = this.dialog.fields_dict[fieldname].$input;

        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
            $input.addClass('invalid-input');
            frappe.msgprint({
                title: __('Invalid Time'),
                message: __('Please enter time in HH:mm format (e.g. 14:30)'),
                indicator: 'red'
            });
            return false;
        }

        $input.removeClass('invalid-input');
        return true;
    }

    updateEndTimeBasedOnDuration() {
        const duration = parseFloat(this.dialog.get_value('duration')) || 1;
        const startTime = this.dialog.get_value('start_time') || '00:00';

        if (!this.validateTimeInput('start_time')) return;

        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const totalMinutes = startHours * 60 + startMinutes + Math.round(duration * 60);
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;

        this.dialog.set_value('end_time', this.app.apiService.formatTime(endHours, endMinutes));
        this.updatePrice(duration);
    }

    updatePrice(duration = null) {
        const room = this.app.stateService.getSelectedRoom();
        const slotsData = this.app.stateService.getSlotsData();
        const roomDoc = slotsData[room]?.roomDoc;
        if (!roomDoc) return;

        const finalDuration = duration || parseFloat(this.dialog.get_value('duration')) || 0;
        const pricePerHour = roomDoc.price_per_hour || 0;
        const totalPrice = pricePerHour * finalDuration;

        this.dialog.set_value('amount', totalPrice);
    }

    async submitBooking(values) {
        if (!this.validateTimeInput('start_time')) return;

        if (!values.customer) {
            frappe.msgprint({
                title: __('Customer Required'),
                message: __('Please select a customer'),
                indicator: 'red'
            });
            return;
        }

        const date = this.app.$container.find('.date-filter').val();
        const room = this.app.stateService.getSelectedRoom();

        try {
            const isAvailable = await this.app.apiService.checkSlotAvailability(
                room,
                date,
                this.app.apiService.formatTimeForBackend(values.start_time),
                this.app.apiService.formatTimeForBackend(values.end_time)
            );

            if (!isAvailable) {
                frappe.msgprint({
                    title: __('Slot Not Available'),
                    message: __('The selected time slot is no longer available. Please choose another time.'),
                    indicator: 'red'
                });
                return;
            }
        } catch (e) {
            frappe.msgprint(__('Error checking availability'));
            return;
        }

        const booking = {
            rental_room: room,
            start_datetime: `${date} ${this.app.apiService.formatTimeForBackend(values.start_time)}`,
            end_datetime: `${date} ${this.app.apiService.formatTimeForBackend(values.end_time)}`,
            customer_name: values.customer,
            notes: values.notes || '',
            amount: values.amount
        };

        try {
            await this.app.apiService.createBooking([booking]);
            frappe.show_alert({
                message: __('Booking created successfully'),
                indicator: 'green'
            });
            this.dialog.hide();
            this.app.stateService.clearSelection();
            this.app.summarySection.hide();
            this.app.loadRooms();
        } catch (e) {
            frappe.msgprint({
                title: __('Booking Failed'),
                message: __('Booking failed. Please try again.'),
                indicator: 'red'
            });
        }
    }
}