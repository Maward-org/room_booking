frappe.pages['bookingroom'].on_page_load = function(wrapper) {
    new RoomBookingApp(wrapper);
};

class RoomBookingApp {
    constructor(wrapper) {
        this.wrapper = wrapper;
        this.page = frappe.ui.make_app_page({
            parent: wrapper,
            title: __('Room Booking System'),
            single_column: true
        });

        this.state = {
            selectedSlots: [],
            selectedRoom: null,
            isLoading: false,
            slotsData: {}
        };

        this.init();
    }

    init() {
        this.setupDOM();
        this.setupEventListeners();
        this.loadBranches();
        this.addStyles();
    }

    setupDOM() {
        this.$container = $(`
            <div class="room-booking-container">
                <div class="row filter-section">
                    <div class="col-md-4">
                        <label>${__('Branch')}</label>
                        <select class="form-control branch-filter">
                            <option value="">${__('All Branches')}</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label>${__('Date')}</label>
                        <input type="date" class="form-control date-filter" 
                               value="${frappe.datetime.get_today()}" 
                               min="${frappe.datetime.get_today()}">
                    </div>
                    <div class="col-md-4">
                        <label>${__('Capacity')}</label>
                        <select class="form-control capacity-filter">
                            <option value="">${__('Any')}</option>
                            <option value="5">5+</option>
                            <option value="10">10+</option>
                            <option value="20">20+</option>
                        </select>
                    </div>
                </div>

                <div class="loading-state text-center" style="display:none;">
                    <div class="spinner-border"></div>
                    <p>${__('Loading rooms...')}</p>
                </div>

                <div class="room-list-container row mt-4"></div>

                <div class="selection-summary alert alert-info mt-3" style="display:none;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${__('Selected')}:</strong> 
                            <span class="selected-period"></span> | 
                            <span class="selected-duration"></span> | 
                            <span class="selected-price"></span>
                        </div>
                        <button class="btn btn-primary btn-book">${__('Book Now')}</button>
                    </div>
                </div>

                <div class="help-section mt-4">
                    <div class="card">
                        <div class="card-header">
                            <h5>${__('How to Book')}</h5>
                        </div>
                        <div class="card-body">
                            <ol>
                                <li>${__('Select branch, date and capacity')}</li>
                                <li>${__('Click on available time slots')}</li>
                                <li>${__('Review your selection in the summary')}</li>
                                <li>${__('Click "Book Now" to confirm')}</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        `);

        $(this.wrapper).find('.layout-main-section').html(this.$container);
    }

    addStyles() {
        const styles = `
            <style>
                .room-booking-container {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                .slots-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 8px;
                    margin-top: 10px;
                }
                .time-slot {
                    padding: 8px;
                    border-radius: 4px;
                    text-align: center;
                    cursor: default;
                    font-size: 12px;
                    border: 1px solid #ddd;
                    transition: all 0.2s ease;
                }
                .time-slot.available {
                    background-color: #e6f7e6;
                    border-color: #a3d8a3;
                    color: #2e7d32;
                    cursor: pointer;
                }
                .time-slot.available:hover {
                    background-color: #d0f0d0;
                    transform: scale(1.03);
                }
                .time-slot.available.selected {
                    background-color: #4caf50;
                    color: white;
                    font-weight: bold;
                }
                .time-slot.booked {
                    background-color: #e3f2fd;
                    border-color: #90caf9;
                    color: #0d47a1;
                    cursor: pointer;
                }
                .time-slot.booked:hover {
                    background-color: #bbdefb;
                }
                .time-slot .duration-badge {
                    display: inline-block;
                    background-color: rgba(255,255,255,0.2);
                    padding: 2px 5px;
                    border-radius: 10px;
                    font-size: 10px;
                    margin-top: 3px;
                }
                .time-slot.expired {
                    background-color: #f5f5f5;
                    border-color: #e0e0e0;
                    color: #9e9e9e;
                }
                .time-slot .small {
                    font-size: 10px;
                    opacity: 0.8;
                }
                .invalid-input {
                    border-color: #ff5252 !important;
                    background-color: #fff5f5 !important;
                }
                .card {
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: box-shadow 0.3s ease;
                }
                .card:hover {
                    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                }
                .btn-book {
                    font-weight: 500;
                    letter-spacing: 0.5px;
                }
                .selection-summary {
                    animation: fadeIn 0.3s ease;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            </style>
        `;
        $(this.wrapper).append(styles);
    }

    setupEventListeners() {
        this.$container.on('change', '.branch-filter, .date-filter, .capacity-filter', () => this.loadRooms());
        this.$container.on('click', '.time-slot.available', (e) => this.handleSlotClick(e));
        this.$container.on('click', '.time-slot.booked', (e) => this.showBookingManagementDialog($(e.currentTarget)));
        this.$container.on('click', '.btn-book', () => this.openBookingDialog());
    }

    setLoading(loading) {
        this.state.isLoading = loading;
        this.$container.find('.loading-state').toggle(loading);
        this.$container.find('.filter-section, .room-list-container, .help-section').toggle(!loading);
    }

    async loadBranches() {
        try {
            const branches = await frappe.call('room_booking.api.get_branches');
            const $select = this.$container.find('.branch-filter').empty();
            $select.append(`<option value="">${__('All Branches')}</option>`);
            branches.message.forEach(b => $select.append(`<option value="${b}">${b}</option>`));
            this.loadRooms();
        } catch (e) {
            this.showError(__('Failed to load branches'));
        }
    }

    async loadRooms() {
        if (this.state.isLoading) return;

        this.setLoading(true);
        this.clearSelection();

        try {
            const filters = {
                branch: this.$container.find('.branch-filter').val(),
                date: this.$container.find('.date-filter').val(),
                capacity: this.$container.find('.capacity-filter').val()
            };

            const response = await frappe.call({
                method: 'room_booking.api.get_available_rooms_with_slots',
                args: filters
            });

            this.state.slotsData = {};
            this.renderRooms(response.message || []);
        } catch (e) {
            this.showError(__('Failed to load rooms'));
        } finally {
            this.setLoading(false);
        }
    }

    renderRooms(rooms) {
        const $container = this.$container.find('.room-list-container').empty();

        if (!rooms.length) {
            $container.html(`
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="fa fa-info-circle"></i> 
                        ${__('No rooms available for selected criteria. Please try different filters.')}
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
                            <h5 class="mb-0">${room.room_name}</h5>
                            <span class="badge ${room.status === 'Available' ? 'badge-success' : 'badge-secondary'}">
                                ${room.status}
                            </span>
                        </div>
                        <div class="card-body">
                            <p><i class="fa fa-users text-muted"></i> ${room.no_of_seats} ${__('seats')}</p>
                            <p><i class="fa fa-money-bill-wave text-muted"></i> ${this.formatCurrency(room.price_per_hour)}/${__('hour')}</p>

                            <hr>
                            <h6>${__('Available Time Slots')}</h6>
                            <div class="slots-grid" data-room="${room.name}"></div>
                        </div>
                    </div>
                </div>
            `);

            $container.append($card);
            this.renderSlots(room.name);
        });
    }

    renderSlots(roomName) {
        const slots = this.state.slotsData[roomName] || [];
        const $container = this.$container.find(`.slots-grid[data-room="${roomName}"]`).empty();

        if (!slots.length) {
            $container.html(`<div class="alert alert-warning">${__('No slots available for this room')}</div>`);
            return;
        }

        slots.forEach(slot => {
            const statusLower = slot.status.toLowerCase();
            const isBooked = statusLower === 'booked';
            const isAvailable = statusLower === 'available';
            const isExpired = statusLower === 'expired';
            const startTime = this.formatTimeForFrontend(slot.start_time);
            const endTime = this.formatTimeForFrontend(slot.end_time);
            const durationHours = this.calculateDuration(slot.start_time, slot.end_time);

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
                    <div class="small">${this.formatCurrency(slot.price)}</div>
                </div>
            `);
        });
    }

    handleSlotClick(e) {
        const $slot = $(e.currentTarget);
        const status = $slot.data('status').toLowerCase();

        if (status === 'booked') {
            this.showBookingManagementDialog($slot);
            return;
        }

        // إذا كانت الفترة متاحة، نفتح نموذج الحجز مباشرة
        const room = $slot.data('room');
        const start = $slot.data('start');
        const end = $slot.data('end');
        const price = $slot.data('price');

        this.state.selectedRoom = room;
        this.state.selectedSlots = [{ room, start, end, price }];
        this.updateSelectionSummary();
        this.openBookingDialog();
    }

    showBookingManagementDialog($slot) {
        const bookingId = $slot.data('booking-id');
        const startTime = this.formatTimeForFrontend($slot.data('start'));
        const endTime = this.formatTimeForFrontend($slot.data('end'));

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
            await frappe.call({
                method: 'room_booking.api.update_booking_status',
                args: {
                    booking_id: bookingId,
                    status: status
                },
                freeze: true
            });

            frappe.show_alert({
                message: __('Booking updated successfully'),
                indicator: 'green'
            });

            dialog.hide();
            this.loadRooms();
        } catch (e) {
            frappe.msgprint(__('Failed to update booking'));
        }
    }

    async cancelBooking(bookingId, dialog) {
        try {
            await frappe.call({
                method: 'room_booking.api.cancel_booking',
                args: { booking_id: bookingId },
                freeze: true
            });

            frappe.show_alert({
                message: __('Booking cancelled successfully'),
                indicator: 'green'
            });

            dialog.hide();
            this.loadRooms();
        } catch (e) {
            frappe.msgprint(__('Failed to cancel booking'));
        }
    }

    clearSelection() {
        this.$container.find('.time-slot').removeClass('selected');
        this.state.selectedSlots = [];
        this.state.selectedRoom = null;
        this.$container.find('.selection-summary').hide();
    }

    updateSelectionSummary() {
        if (!this.state.selectedSlots.length) {
            this.$container.find('.selection-summary').hide();
            return;
        }

        const first = this.state.selectedSlots[0];
        const last = this.state.selectedSlots[this.state.selectedSlots.length - 1];

        const start = new Date(`2000-01-01T${first.start}:00`);
        const end = new Date(`2000-01-01T${last.end}:00`);
        const durationMinutes = (end - start) / 60000;
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        let durationText = '';
        if (hours > 0) durationText += `${hours} ${__('hours')} `;
        if (minutes > 0) durationText += `${minutes} ${__('minutes')}`;

        const totalPrice = this.state.selectedSlots.reduce((sum, slot) => sum + slot.price, 0);

        this.$container.find('.selected-period').text(`${this.formatTimeForFrontend(first.start)} - ${this.formatTimeForFrontend(last.end)}`);
        this.$container.find('.selected-duration').text(durationText);
        this.$container.find('.selected-price').text(this.formatCurrency(totalPrice));
        this.$container.find('.selection-summary').show();
    }

    openBookingDialog() {
        if (!this.state.selectedSlots.length) {
            frappe.msgprint({
                title: __('No Selection'),
                message: __('Please select time slots first'),
                indicator: 'red'
            });
            return;
        }

        const first = this.state.selectedSlots[0];
        const last = this.state.selectedSlots[this.state.selectedSlots.length - 1];
        const totalPrice = this.state.selectedSlots.reduce((sum, slot) => sum + slot.price, 0);

        const now = new Date();
        const currentTime = this.formatTime(now.getHours(), now.getMinutes());

        const dialog = new frappe.ui.Dialog({
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
                    default: this.$container.find('.date-filter').val()
                },
                {
                    label: __('Start Time'),
                    fieldname: 'start_time',
                    fieldtype: 'Data',
                    default: this.formatTimeForFrontend(first.start),
                    reqd: 1,
                    description: __('Format: HH:mm (e.g. 09:30)'),
                    change: () => {
                        if (this.validateTimeInput(dialog, 'start_time')) {
                            this.updateEndTimeBasedOnDuration(dialog);
                        }
                    }
                },
                {
                    label: __('Duration (hours)'),
                    fieldname: 'duration',
                    fieldtype: 'Float',
                    default: this.calculateDuration(first.start, last.end),
                    reqd: 1,
                    description: __('Enter booking duration in hours'),
                    change: () => this.updateEndTimeBasedOnDuration(dialog)
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
            primary_action: values => this.submitBooking(values, dialog)
        });

        dialog.fields_dict.start_time.$input.attr('placeholder', 'HH:mm');
        dialog.fields_dict.duration.$input.attr('placeholder', 'e.g. 1.5 for 1 hour 30 minutes');

        dialog.show();
        this.updateEndTimeBasedOnDuration(dialog);

        // Add real-time validation
        dialog.fields_dict.start_time.$input.on('input', () => {
            const value = dialog.get_value('start_time');
            const isValid = /^([01]?[0-9]|2[0-3]):?([0-5]?[0-9])?$/.test(value);
            dialog.fields_dict.start_time.$input.toggleClass('invalid-input', !isValid);
        });
    }

    // Helper function to format time as HH:mm
    formatTime(hours, minutes) {
        const pad = num => num.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}`;
    }

    // Convert backend format (HH:mm:ss) to frontend format (HH:mm)
    formatTimeForFrontend(timeStr) {
        if (!timeStr) return '00:00';
        return timeStr.split(':').slice(0, 2).join(':');
    }

    // Convert frontend format (HH:mm) to backend format (HH:mm:ss)
    formatTimeForBackend(timeStr) {
        if (!timeStr) return '00:00:00';
        return timeStr.includes(':') ? `${timeStr}:00` : '00:00:00';
    }

    validateTimeInput(dialog, fieldname) {
        const value = dialog.get_value(fieldname);
        const $input = dialog.fields_dict[fieldname].$input;

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

    calculateDuration(start, end) {
        const startTime = new Date(`2000-01-01T${start}:00`);
        const endTime = new Date(`2000-01-01T${end}:00`);
        return (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
    }

    updateEndTimeBasedOnDuration(dialog) {
        const duration = parseFloat(dialog.get_value('duration')) || 1;
        const startTime = dialog.get_value('start_time') || '00:00';

        if (!this.validateTimeInput(dialog, 'start_time')) return;

        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const totalMinutes = startHours * 60 + startMinutes + Math.round(duration * 60);
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;

        dialog.set_value('end_time', this.formatTime(endHours, endMinutes));
        this.updatePrice(dialog, duration);
    }

    updatePrice(dialog, duration = null) {
        const room = this.state.selectedRoom;
        const roomDoc = this.state.slotsData[room]?.roomDoc;
        if (!roomDoc) return;

        const finalDuration = duration || parseFloat(dialog.get_value('duration')) || 0;
        const pricePerHour = roomDoc.price_per_hour || 0;
        const totalPrice = pricePerHour * finalDuration;

        dialog.set_value('amount', totalPrice);
    }

    async submitBooking(values, dialog) {
        if (!this.validateTimeInput(dialog, 'start_time')) return;

        if (!values.customer) {
            frappe.msgprint({
                title: __('Customer Required'),
                message: __('Please select a customer'),
                indicator: 'red'
            });
            return;
        }

        const date = this.$container.find('.date-filter').val();
        const room = this.state.selectedRoom;

        try {
            const isAvailable = await frappe.call({
                method: 'room_booking.api.check_slot_availability',
                args: {
                    room: room,
                    date: date,
                    start_time: this.formatTimeForBackend(values.start_time),
                    end_time: this.formatTimeForBackend(values.end_time)
                }
            });

            if (!isAvailable.message) {
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
            start_datetime: `${date} ${this.formatTimeForBackend(values.start_time)}`,
            end_datetime: `${date} ${this.formatTimeForBackend(values.end_time)}`,
            customer_name: values.customer,
            notes: values.notes || '',
            amount: values.amount
        };

        try {
            await frappe.call({
                method: 'room_booking.api.create_booking',
                args: { bookings: [booking] },
                freeze: true
            });

            frappe.show_alert({
                message: __('Booking created successfully'),
                indicator: 'green'
            });
            dialog.hide();
            this.clearSelection();
            this.loadRooms();
        } catch (e) {
            frappe.msgprint({
                title: __('Booking Failed'),
                message: __('Booking failed. Please try again.'),
                indicator: 'red'
            });
        }
    }

    formatCurrency(amount) {
        return parseFloat(amount || 0).toFixed(2) + ' ' + __('SAR');
    }

    showError(message) {
        frappe.msgprint({
            title: __('Error'),
            message: message,
            indicator: 'red'
        });
    }
}
