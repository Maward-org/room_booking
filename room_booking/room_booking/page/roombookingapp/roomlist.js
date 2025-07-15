class RoomList {
    constructor(app) {
        this.app = app;
        this.$container = null;
    }

    init($container) {
        this.$container = $container;
    }

    render(rooms) {
        this.$container.empty();

        if (!rooms.length) {
            this.showNoRoomsMessage();
            return;
        }

        rooms.forEach(room => this.renderRoomCard(room));
    }

    showNoRoomsMessage() {
        this.$container.html(`
            <div class="col-12">
                <div class="alert alert-info">
                    <i class="fa fa-info-circle"></i> 
                    ${__('No rooms available for selected criteria. Please try different filters.')}
                </div>
            </div>
        `);
    }

    renderRoomCard(room) {
        const $card = $(`
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${room.room_name}</h5>
                        <span class="badge ${room.status === 'Available' ? 'badge-success' : 'badge-secondary'}">
                            ${room.status}
                        </span>
                    </div>
                    <div class="card-body">
                        <p><i class="fa fa-users text-muted"></i> ${room.no_of_seats} ${__('seats')}</p>
                        <p><i class="fa fa-money-bill-wave text-muted"></i> ${this.app.apiService.formatCurrency(room.price_per_hour)}/${__('hour')}</p>

                        <hr>
                        <h6>${__('Available Time Slots')}</h6>
                        <div class="slots-grid" data-room="${room.name}"></div>
                    </div>
                </div>
            </div>
        `);

        this.$container.append($card);
        this.renderSlots(room);
    }

    renderSlots(room) {
        const slots = room.available_slots || [];
        const $container = this.$container.find(`.slots-grid[data-room="${room.name}"]`).empty();

        if (!slots.length) {
            $container.html(`<div class="alert alert-warning">${__('No slots available for this room')}</div>`);
            return;
        }

        slots.forEach(slot => this.renderSlot($container, room.name, slot));
    }

    renderSlot($container, roomName, slot) {
        const statusLower = slot.status.toLowerCase();
        const isBooked = statusLower === 'booked';
        const isAvailable = statusLower === 'available';
        const isExpired = statusLower === 'expired';
        const startTime = this.app.apiService.formatTimeForFrontend(slot.start_time);
        const endTime = this.app.apiService.formatTimeForFrontend(slot.end_time);
        const durationHours = this.app.apiService.calculateDuration(slot.start_time, slot.end_time);

        let className = 'time-slot ';
        if (isAvailable) className += 'available selectable';
        else if (isBooked) className += 'booked';
        else if (isExpired) className += 'expired';
        else className += 'unknown';

        $container.append(`
            <div class="${className}" 
                 data-room="${roomName}"
                 data-start="${slot.start_time}"
                 data-end="${slot.end_time}"
                 data-status="${slot.status}"
                 data-price="${slot.price}"
                 data-booking-id="${slot.booking_id || ''}">
                <div>${startTime} - ${endTime}</div>
                <div class="small">${durationHours} ${__('hours')}</div>
                <div class="small">${this.app.apiService.formatCurrency(slot.price)}</div>
            </div>
        `);
    }
}