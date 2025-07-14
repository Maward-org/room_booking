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
            selectedSlots: [],  // Array of {room, startTime, endTime, price}
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
            const aggregatedSlots = this.aggregateSlots(room.available_slots || []);
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
            this.renderAggregatedSlots(room.name, aggregatedSlots);
        });
    }

    // تجميع الفترات المتتالية بنفس الحالة
    aggregateSlots(slots) {
        if (!slots.length) return [];

        const aggregated = [];
        let currentGroup = {...slots[0]};

        for (let i = 1; i < slots.length; i++) {
            const slot = slots[i];
            if (slot.status === currentGroup.status && slot.start_time === currentGroup.end_time) {
                currentGroup.end_time = slot.end_time;
                currentGroup.price += slot.price; // يمكن تعديل الحساب حسب الحاجة
            } else {
                aggregated.push(currentGroup);
                currentGroup = {...slot};
            }
        }
        aggregated.push(currentGroup);
        return aggregated;
    }

    renderAggregatedSlots(roomName, slots) {
        const $container = this.$container.find(`.slots-grid[data-room="${roomName}"]`);
        $container.empty();

        if (!slots.length) {
            $container.html(`<div class="alert alert-info">${__('No available slots for this day')}</div>`);
            return;
        }

        const html = slots.map(slot => {
            let statusClass = 'available';
            let statusText = slot.status;

            if (slot.status === 'Booked') statusClass = 'booked';
            else if (slot.status === 'Expired') statusClass = 'expired';

            return `
                <div class="time-slot ${statusClass} ${statusClass === 'available' ? 'selectable' : ''}"
                    data-room="${roomName}"
                    data-start-time="${slot.start_time}"
                    data-end-time="${slot.end_time}"
                    data-price="${slot.price}">
                    <div class="slot-time">${slot.start_time} - ${slot.end_time}</div>
                    <div class="slot-status">${statusText}</div>
                    <div class="slot-price">${this.formatCurrency(slot.price)}</div>
                </div>
            `;
        }).join('');

        $container.html(html);
    }

    toggleTimeSlotSelection($slot) {
        if (this.state.selectedSlots.length > 0) {
            frappe.msgprint({
                title: __('Warning'),
                indicator: 'orange',
                message: __('Please select only one start time for flexible duration booking.')
            });
            return;
        }

        const room = $slot.data('room');
        const startTime = $slot.data('start-time');
        const pricePerSlot = parseFloat($slot.data('price'));

        this.openDurationDialog(room, startTime, pricePerSlot);
    }

    openDurationDialog(room, startTime, pricePerSlot) {
        const date = this.$container.find('.date-filter').val();

        let dialog = new frappe.ui.Dialog({
            title: __('Select Booking Duration'),
            fields: [
                {
                    label: __('Start Time'),
                    fieldname: 'start_time',
                    fieldtype: 'Data',
                    read_only: 1,
                    default: startTime
                },
                {
                    label: __('Duration (hours)'),
                    fieldname: 'duration',
                    fieldtype: 'Float',
                    default: 1,
                    reqd: 1,
                    description: __('Enter duration in hours, e.g. 1.5 for 1 hour 30 minutes')
                },
                {
                    label: __('End Time'),
                    fieldname: 'end_time',
                    fieldtype: 'Data',
                    read_only: 1
                },
                {
                    label: __('Total Price'),
                    fieldname: 'total_price',
                    fieldtype: 'Data',
                    read_only: 1,
                    default: this.formatCurrency(pricePerSlot)
                }
            ],
            primary_action_label: __('Check Availability'),
            primary_action: (values) => {
                const [startHour, startMinute] = values.start_time.split(':').map(Number);
                const totalMinutes = Math.round(values.duration * 60);

                let startDate = new Date(`${date}T${values.start_time}:00`);
                let endDate = new Date(startDate.getTime() + totalMinutes * 60000);

                const endHour = String(endDate.getHours()).padStart(2, '0');
                const endMinute = String(endDate.getMinutes()).padStart(2, '0');
                const computedEndTime = `${endHour}:${endMinute}`;

                dialog.set_value('end_time', computedEndTime);

                this.checkSlotAvailability(room, date, values.start_time, computedEndTime, pricePerSlot, totalMinutes, dialog);
            }
        });

        dialog.fields_dict.duration.$input.on('input', () => {
            let durationVal = parseFloat(dialog.get_value('duration'));
            if (isNaN(durationVal) || durationVal <= 0) {
                dialog.set_value('end_time', '');
                dialog.set_value('total_price', this.formatCurrency(0));
                return;
            }
            let startDate = new Date(`${date}T${dialog.get_value('start_time')}:00`);
            let endDate = new Date(startDate.getTime() + durationVal * 60 * 60000);
            const endHour = String(endDate.getHours()).padStart(2, '0');
            const endMinute = String(endDate.getMinutes()).padStart(2, '0');
            const computedEndTime = `${endHour}:${endMinute}`;
            dialog.set_value('end_time', computedEndTime);

            const periodDurationMinutes = 60; // TODO: ideally get from API or config
            const numSlots = Math.ceil(durationVal * 60 / periodDurationMinutes);
            const totalPrice = pricePerSlot * numSlots;
            dialog.set_value('total_price', this.formatCurrency(totalPrice));
        });

        dialog.show();
    }

    async checkSlotAvailability(room, date, start_time, end_time, pricePerSlot, totalMinutes, dialog) {
        try {
            const response = await frappe.call({
                method: 'room_booking.api.get_slots_between_times',
                args: { room, date, start_time, end_time }
            });

            const slots = response.message || [];
            if (slots.length === 0) {
                frappe.msgprint({
                    title: __('Unavailable'),
                    indicator: 'red',
                    message: __('No slots available in the selected period.')
                });
                return;
            }

            const allAvailable = slots.every(s => s.status === 'Available');
            if (!allAvailable) {
                frappe.msgprint({
                    title: __('Unavailable'),
                    indicator: 'red',
                    message: __('Some slots in the selected duration are already booked or expired.')
                });
                return;
            }

            this.state.selectedSlots = slots.map(s => ({
                room,
                startTime: s.start_time,
                endTime: s.end_time,
                price: s.price
            }));

            dialog.hide();
            this.updateBookingButton();
            this.renderSelectionSummary();
        } catch (e) {
            frappe.msgprint({
                title: __('Error'),
                indicator: 'red',
                message: __('Failed to check availability. Please try again.')
            });
        }
    }

    renderSelectionSummary() {
        let $summary = this.$container.find('.booking-summary');
        if (!$summary.length) {
            this.$container.find('.filter-section').after('<div class="booking-summary alert alert-info mt-3"></div>');
            $summary = this.$container.find('.booking-summary');
        }

        const slots = this.state.selectedSlots;
        if (slots.length === 0) {
            $summary.hide();
            return;
        }

        const start = slots[0].startTime;
        const end = slots[slots.length - 1].endTime;
        const durationMinutes = slots.length * 60;  // Assuming 60 min slot duration, adapt if needed
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        let durationText = hours > 0 ? `${hours} ${__('hours')}` : '';
        if (minutes > 0) {
            durationText += (durationText ? ' ' : '') + `${minutes} ${__('minutes')}`;
        }

        const totalPrice = slots.reduce((acc, s) => acc + s.price, 0);

        $summary.html(`
            <strong>${__('Selected Period')}:</strong> ${start} - ${end} <br>
            <strong>${__('Duration')}:</strong> ${durationText} <br>
            <strong>${__('Total Price')}:</strong> ${this.formatCurrency(totalPrice)}
        `).show();
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

        const firstSlot = selected[0];
        const lastSlot = selected[selected.length - 1];

        const [firstHour, firstMinute] = firstSlot.startTime.split(':').map(Number);
        const [lastHour, lastMinute] = lastSlot.endTime.split(':').map(Number);

        let durationMinutes = (lastHour * 60 + lastMinute) - (firstHour * 60 + firstMinute);
        const durationHours = Math.floor(durationMinutes / 60);
        const durationRemMinutes = durationMinutes % 60;

        let durationText = durationHours > 0 ? `${durationHours} ${__('hours')}` : '';
        if (durationRemMinutes > 0) {
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
