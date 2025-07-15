class ApiService {
    async getBranches() {
        const result = await frappe.call('room_booking.api.get_branches');
        return result.message || [];
    }

    async getAvailableRoomsWithSlots(filters) {
        const result = await frappe.call({
            method: 'room_booking.api.get_available_rooms_with_slots',
            args: filters
        });
        return result.message || [];
    }

    async checkSlotAvailability(room, date, startTime, endTime) {
        const result = await frappe.call({
            method: 'room_booking.api.check_slot_availability',
            args: { room, date, start_time: startTime, end_time: endTime }
        });
        return result.message;
    }

    async createBooking(bookings) {
        const result = await frappe.call({
            method: 'room_booking.api.create_booking',
            args: { bookings },
            freeze: true
        });
        return result.message;
    }

    async updateBookingStatus(bookingId, status) {
        const result = await frappe.call({
            method: 'room_booking.api.update_booking_status',
            args: { booking_id: bookingId, status },
            freeze: true
        });
        return result.message;
    }

    async cancelBooking(bookingId) {
        const result = await frappe.call({
            method: 'room_booking.api.cancel_booking',
            args: { booking_id: bookingId },
            freeze: true
        });
        return result.message;
    }
}