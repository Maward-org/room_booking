frappe.pages['bookingroom'].on_page_load = function(wrapper) {
    console.log('1. Loading page...');
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('Room Booking System'),
        single_column: true,
        card_layout: true
    });
    console.log('2. Application page created');
    new RoomBookingApp(wrapper, page);
};

class RoomBookingApp {
    constructor(wrapper, page) {
        this.wrapper = wrapper;
        this.page = page;
        this.state = {
            selectedSlots: [],  // كل عنصر: {room, startTime, endTime, price}
            isLoading: false
        };
        this.init();
    }

    init() {
        console.log('[3] Initializing app');
        this.setupDOM();
        this.setupEventListeners();
        this.loadBranches();
    }

    setupDOM() {
        console.log('[4] Setting up DOM');
        this.$container = $(`
            <div class="room-booking-container">
                <div class="row filter-section">
                    <div class="col-md-4 col-sm-6">
                        <label>${__('Branch')}</label>
                        <select class="form-control branch-filter">
                            <option value="">${__('All Branches')}</option>
                        </select>
                    </div>
                    <div class="col-md-3 col-sm-6">
                        <label>${__('Date')}</label>
                        <input type="date" class="form-control date-filter"
                            value="${frappe.datetime.get_today()}" min="${frappe.datetime.get_today()}">
                    </div>
                    <div class="col-md-3 col-sm-6">
                        <label>${__('Capacity')}</label>
                        <select class="form-control capacity-filter">
                            <option value="">${__('Any Capacity')}</option>
                            <option value="5">5+ ${__('People')}</option>
                            <option value="10">10+ ${__('People')}</option>
                            <option value="20">20+ ${__('People')}</option>
                        </select>
                    </div>
                    <div class="col-md-2 col-sm-6 d-flex align-items-end">
                        <button class="btn btn-primary btn-refresh btn-block">
                            <i class="fa fa-sync-alt"></i> ${__('Refresh')}
                        </button>
                    </div>
                </div>

                <div class="loading-state text-center" style="display:none;">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">${__('Loading...')}</span>
                    </div>
                    <p>${__('Loading available rooms...')}</p>
                </div>

                <div class="room-list-container row"></div>
            </div>
        `);

        $(this.wrapper).find('.layout-main-section').html(this.$container);
    }

    setupEventListeners() {
        console.log('[5] Setting up event listeners');
        this.$container.on('change', '.branch-filter, .capacity-filter, .date-filter', () => this.loadRooms());
        this.$container.on('click', '.btn-refresh', () => this.loadRooms());
        this.$container.on('click', '.time-slot.available', e => this.toggleTimeSlotSelection($(e.currentTarget)));
    }

    formatCurrency(amount) {
        try {
            amount = parseFloat(amount);
            if (isNaN(amount)) amount = 0;
            return amount.toFixed(2) + ' SAR';
        } catch (e) {
            console.error('Error formatting amount:', e);
            return '0.00 SAR';
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
        frappe.msgprint({title: __('Error'), message, indicator: 'red'});
    }

    async loadBranches() {
        this.setLoading(true);
        try {
            const response = await frappe.call({method: 'room_booking.api.get_branches'});
            const branches = response.message || [];
            const $select = this.$container.find('.branch-filter').empty();
            $select.append(`<option value="">${__('All Branches')}</option>`);
            branches.forEach(branch => $select.append(`<option value="${branch}">${branch}</option>`));
            await this.loadRooms();
        } catch (e) {
            this.showError(__('Failed to load branch list'));
        } finally {
            this.setLoading(false);
        }
    }

    async loadRooms() {
        if (this.state.isLoading) return;

        this.setLoading(true);

        const filters = {
            branch: this.$container.find('.branch-filter').val(),
            date: this.$container.find('.date-filter').val(),
            capacity: this.$container.find('.capacity-filter').val()
        };

        try {
            const response = await frappe.call({
                method: 'room_booking.api.get_available_rooms_with_slots',
                args: filters
            });
            const rooms = response.message || [];
            this.renderRoomsWithSlots(rooms);
            this.state.selectedSlots = [];
            this.updateBookingButton();
        } catch (e) {
            this.showError(__('Failed to load available rooms'));
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
                        ${__('No rooms available matching current filters')}
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
                            <h5 class="m-0"><i class="fa fa-door-open"></i> ${room.room_name || __('Unnamed')}</h5>
                            <span class="badge ${room.status === 'Available' ? 'badge-success' : 'badge-danger'}">${room.status || __('Unknown')}</span>
                        </div>
                        <div class="card-body">
                            <p><i class="fa fa-map-marker-alt text-primary"></i> <strong>${__('Location')}:</strong> ${room.branch || ''} - ${room.location || ''}</p>
                            <p><i class="fa fa-users text-info"></i> <strong>${__('Capacity')}:</strong> ${room.no_of_seats || 0} ${__('Seats')}</p>
                            <p><i class="fa fa-money-bill-wave text-success"></i> <strong>${__('Price')}:</strong> ${this.formatCurrency(room.price_per_hour || 0)}/${__('hour')}</p>
                            <hr>
                            <h6 class="text-center"><i class="fa fa-clock"></i> ${__('Available Slots')}</h6>
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
        console.log(`[6] Rendering time slots for room: ${roomName}`, slots);
        const $container = this.$container.find(`.slots-grid[data-room="${roomName}"]`);
        $container.empty();

        if (!slots.length) {
            $container.html(`<div class="alert alert-info">No available slots for this day</div>`);
            return;
        }

        const slotsHTML = slots.map(slot => {
            let statusText = slot.status || (slot.booked ? 'Booked' : 'Available');
            let statusClass = 'available';

            if (slot.status === 'Booked') {
                statusClass = 'booked';
            } else if (slot.status === 'Expired') {
                statusClass = 'expired';
            }

            return `
                <div class="time-slot ${statusClass}" 
                    data-room="${roomName}" 
                    data-start-time="${slot.start_time}" 
                    data-end-time="${slot.end_time}" 
                    data-price="${slot.price}">
                    <div class="slot-time">${slot.start_time} - ${slot.end_time}</div>
                    <div class="slot-status">${statusText}</div>
                    <div class="slot-price">${parseFloat(slot.price).toFixed(2)} SAR</div>
                </div>
            `;
        }).join('');

        $container.html(slotsHTML);
    }

    toggleTimeSlotSelection($slot) {
        // Multi-select contiguous slots only

        const room = $slot.data('room');
        const startTime = $slot.data('start-time');
        const endTime = $slot.data('end-time');
        const price = $slot.data('price');

        if ($slot.hasClass('selected')) {
            // Deselect this slot
            $slot.removeClass('selected');
            this.state.selectedSlots = this.state.selectedSlots.filter(
                s => !(s.room === room && s.startTime === startTime && s.endTime === endTime)
            );
        } else {
            // Check if selecting this slot keeps slots contiguous for this room
            if (this.state.selectedSlots.length === 0) {
                // No slots selected yet, add directly
                $slot.addClass('selected');
                this.state.selectedSlots.push({room, startTime, endTime, price});
            } else {
                // Verify all slots are from same room
                const sameRoom = this.state.selectedSlots.every(s => s.room === room);
                if (!sameRoom) {
                    frappe.msgprint({
                        title: __('Warning'),
                        indicator: 'orange',
                        message: __('You can only select contiguous slots in the same room.')
                    });
                    return;
                }

                // Insert and check continuity by sorting slots by startTime
                let slots = [...this.state.selectedSlots, {room, startTime, endTime, price}];
                slots.sort((a, b) => a.startTime.localeCompare(b.startTime));

                // Check contiguous time intervals
                for (let i = 0; i < slots.length - 1; i++) {
                    if (slots[i].endTime !== slots[i+1].startTime) {
                        frappe.msgprint({
                            title: __('Warning'),
                            indicator: 'orange',
                            message: __('Selected slots must be contiguous (no gaps).')
                        });
                        return;
                    }
                }
                // Passed continuity check, add the slot
                $slot.addClass('selected');
                this.state.selectedSlots = slots;
            }
        }
        this.updateBookingButton();
    }

    updateBookingButton() {
        const count = this.state.selectedSlots.length;
        this.page.set_primary_action(
            count ? `${__('Book Now')} (${count} ${__('Slots')})` : __('Book Now'),
            count ? () => this.openBookingDialog() : () => {
                frappe.msgprint({
                    title: __('Warning'),
                    indicator: 'orange',
                    message: __('Please select at least one time slot to book')
                });
            },
            count ? 'fa fa-calendar-check' : 'fa fa-calendar'
        );
    }

    openBookingDialog() {
        if (!this.state.selectedSlots.length) {
            frappe.msgprint({
                title: __('Warning'),
                indicator: 'orange',
                message: __('Please select booking time first')
            });
            return;
        }

        const selected = this.state.selectedSlots;
        const date = this.$container.find('.date-filter').val();
        const totalPrice = selected.reduce((sum, s) => sum + Number(s.price), 0);

        // Show total duration in hours and minutes
        const firstSlot = selected[0];
        const lastSlot = selected[selected.length - 1];

        const [firstHour, firstMinute] = firstSlot.startTime.split(':').map(Number);
        const [lastHour, lastMinute] = lastSlot.endTime.split(':').map(Number);

        let durationMinutes = (lastHour * 60 + lastMinute) - (firstHour * 60 + firstMinute);
        const durationHours = Math.floor(durationMinutes / 60);
        const durationRemMinutes = durationMinutes % 60;

        let durationText = durationHours > 0 ? `${durationHours} ${__('hours')}` : '';
        if(durationRemMinutes > 0) {
            durationText += (durationText ? ' ' : '') + `${durationRemMinutes} ${__('minutes')}`;
        }
        if (!durationText) durationText = '0 minutes';

        const slotsText = selected.map(s => `${s.startTime} - ${s.endTime}`).join('<br>');

        let dialog = new frappe.ui.Dialog({
            title: __('Confirm Room Booking'),
            fields: [
                {
                    label: __('Customer'),
                    fieldname: 'customer_name',
                    fieldtype: 'Link',
                    options: 'Customer',
                    reqd: 1,
                    get_query: () => ({ filters: { disabled: 0 } })
                },
                {
                    label: __('Or Add New Customer'),
                    fieldname: 'add_customer',
                    fieldtype: 'Button',
                    click: () => this.openQuickCustomerDialog(dialog)
                },
                { fieldtype: 'Section Break' },
                {
                    label: __('Date'),
                    fieldname: 'booking_date',
                    fieldtype: 'Data',
                    read_only: 1,
                    default: date
                },
                {
                    label: __('Selected Times'),
                    fieldname: 'selected_hours',
                    fieldtype: 'HTML',
                    options: slotsText
                },
                {
                    label: __('Total Duration'),
                    fieldname: 'duration',
                    fieldtype: 'Data',
                    read_only: 1,
                    default: durationText
                },
                {
                    label: __('Total Price'),
                    fieldname: 'amount',
                    fieldtype: 'Data',
                    read_only: 1,
                    default: this.formatCurrency(totalPrice)
                },
                { fieldtype: 'Section Break' },
                {
                    label: __('Notes'),
                    fieldname: 'notes',
                    fieldtype: 'Small Text'
                }
            ],
            primary_action_label: __('Confirm Booking'),
            primary_action: (values) => this.confirmBooking(values, dialog)
        });

        dialog.fields_dict.selected_hours.$wrapper.html(`<div class="alert alert-info mb-2">${slotsText}</div>`);
        dialog.show();
    }

    openQuickCustomerDialog(parentDialog) {
        let dialog = new frappe.ui.Dialog({
            title: __('Add New Customer'),
            fields: [
                { label: __('Customer Name'), fieldname: 'customer_name', fieldtype: 'Data', reqd: 1 },
                { label: __('Phone Number'), fieldname: 'mobile_no', fieldtype: 'Data' },
                { label: __('Email'), fieldname: 'email_id', fieldtype: 'Data' }
            ],
            primary_action_label: __('Save'),
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
                            frappe.show_alert({ message: __('Customer added successfully'), indicator: 'green' });
                        }
                    }
                });
            }
        });
        dialog.show();
    }

    confirmBooking(values, dialog) {
        if (!values.customer_name) {
            frappe.msgprint(__('Please select or add a customer first'));
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
            freeze_message: __('Saving booking...'),
            callback: (r) => {
                if (r.message && r.message.success) {
                    frappe.show_alert({
                        message: __('Booking successful! Booking ID: ') + r.message.name,
                        indicator: 'green'
                    });
                    dialog.hide();
                    this.state.selectedSlots = [];
                    this.updateBookingButton();
                    this.loadRooms();
                } else {
                    frappe.msgprint(r.message?.error || __('Booking failed'));
                }
            }
        });
    }
}
