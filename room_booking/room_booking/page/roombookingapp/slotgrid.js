class SlotGrid {
    constructor(app) {
        this.app = app;
    }

    handleSlotClick($slot) {
        const status = $slot.data('status').toLowerCase();

        if (status === 'booked') {
            this.showBookingManagementDialog($slot);
            return;
        }

        const room = $slot.data('room');
        const start = $slot.data('start');
        const end = $slot.data('end');
        const price = $slot.data('price');

        this.app.stateService.setSelectedRoom(room);
        this.app.stateService.setSelectedSlots([{ room, start, end, price }]);
        this.app.summarySection.update();
        this.app.bookingDialog.open();
    }

    showBookingManagementDialog($slot) {
        const bookingId = $slot.data('booking-id');
        const startTime = this.app.apiService.formatTimeForFrontend($slot.data('start'));
        const endTime = this.app.apiService.formatTimeForFrontend($slot.data('end'));

        const dialog = new frappe.ui.Dialog({
            title: __('Manage Booking'),
            fields: [
                {
                    label: __('Booking Period'),
                    fieldname: 'period',
                    fieldtype: 'Data',
                    read_only: true,
                    default: `${startTime} - ${endTime}`
                },
                {
                    label: __('Booking Status'),
                    fieldname: 'status',
                    fieldtype: 'Select',
                    options: ['Confirmed', 'Cancelled'],
                    default: 'Confirmed'
                }
            ],
            primary_action_label: __('Update Booking'),
            secondary_action_label: __('Cancel Booking'),
            primary_action: (values) => this.updateBookingStatus(bookingId, values.status, dialog),
            secondary_action: () => this.cancelBooking(bookingId, dialog)
        });

        dialog.show();
    }

    async updateBookingStatus(bookingId, status, dialog) {
        try {
            await this.app.apiService.updateBookingStatus(bookingId, status);
            frappe.show_alert({
                message: __('Booking updated successfully'),
                indicator: 'green'
            });
            dialog.hide();
            this.app.loadRooms();
        } catch (e) {
            frappe.msgprint(__('Failed to update booking'));
        }
    }

    async cancelBooking(bookingId, dialog) {
        try {
            await this.app.apiService.cancelBooking(bookingId);
            frappe.show_alert({
                message: __('Booking cancelled successfully'),
                indicator: 'green'
            });
            dialog.hide();
            this.app.loadRooms();
        } catch (e) {
            frappe.msgprint(__('Failed to cancel booking'));
        }
    }
}