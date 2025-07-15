frappe.provide("room_booking.RoomBooking");

/**
 * مكون اختيار الغرفة والفترات الزمنية
 * @class room_booking.RoomBooking.RoomSelector
 */
room_booking.RoomBooking.RoomSelector = class {
    constructor({ wrapper, events = {}, settings = {} }) {
        this.wrapper = $(wrapper);
        this.events = events;
        this.settings = settings;
        this.state = { 
            branches: [], 
            slotsData: {}, 
            isLoading: false,
            selectedSlots: []
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
                        <label>${__('Branch')}</label>
                        <select class="form-control branch-filter"></select>
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

                <div class="selection-summary alert alert-info mt-3" style="display:none;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${__('Selected')}:</strong> 
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

                <div class="help-section mt-4">
                    <div class="card">
                        <div class="card-header"><h5>${__('How to Book')}</h5></div>
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
    }

    add_styles() {
        if ($("#room-booking-style").length) return;
        const styles = `
            <style id="room-booking-style">
                .room-booking-container {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
                
                .time-slot::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: rgba(0,0,0,0.1);
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
                
                .time-slot .duration-badge {
                    display: inline-block;
                    background: rgba(0,0,0,0.1);
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 11px;
                    margin-top: 5px;
                }
                
                .selection-summary {
                    animation: fadeIn 0.3s ease;
                    background-color: #e3f2fd;
                    border-color: #bbdefb;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .badge-available {
                    background-color: #4caf50;
                }
                
                .badge-booked {
                    background-color: #2196f3;
                }
            </style>
        `;
        $("head").append(styles);
    }

    bind_events() {
        this.wrapper.on('change', '.branch-filter, .date-filter, .capacity-filter', () => this.load_rooms());
        this.wrapper.on('click', '.time-slot.available', (e) => this.handle_available_slot_click(e));
        this.wrapper.on('click', '.time-slot.booked', (e) => this.handle_booked_slot_click(e));
        this.wrapper.on('click', '.btn-book', () => this.handle_book_click());
    }

    async load_branches() {
        try {
            const { message: branches = [] } = await frappe.call('room_booking.api.get_branches');
            const $select = this.wrapper.find('.branch-filter').empty();
            $select.append(`<option value="">${__('All Branches')}</option>`);
            branches.forEach(b => $select.append(`<option value="${b}">${b}</option>`));
            this.load_rooms();
        } catch (error) {
            console.error('Failed to load branches:', error);
            this.show_error(__('Failed to load branches. Please try again.'));
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
            console.error('Failed to load rooms:', error);
            this.show_error(__('Failed to load rooms. Please try again.'));
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
                            <span class="badge ${room.status === 'Available' ? 'badge-available' : 'badge-booked'}">
                                ${room.status}
                            </span>
                        </div>
                        <div class="card-body">
                            <p><i class="fa fa-users text-muted"></i> ${room.no_of_seats} ${__('seats')}</p>
                            <p><i class="fa fa-money-bill-wave text-muted"></i> 
                                ${room_booking.RoomBooking.helpers.formatCurrency(room.price_per_hour)}/${__('hour')}
                            </p>
                            <hr>
                            <h6>${__('Available Time Slots')}</h6>
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
                        ${__('No slots available for this room')}
                    </div>
                </div>
            `);
            return;
        }
        
        slots.forEach(slot => {
            const isBooked = (slot.status || '').toLowerCase() === 'booked';
            const isAvailable = !isBooked;
            const duration = room_booking.RoomBooking.helpers.calculateDuration(slot.start_time, slot.end_time);
            
            $container.append(`
                <div class="time-slot ${isBooked ? 'booked' : 'available'}" 
                     data-room="${roomName}"
                     data-start="${slot.start_time}"
                     data-end="${slot.end_time}"
                     data-status="${slot.status}"
                     data-price="${slot.price}"
                     data-booking-id="${slot.booking_id || ''}"
                     data-duration="${duration}">
                    <div class="time-range">
                        ${room_booking.RoomBooking.helpers.formatTimeForFrontend(slot.start_time)} - 
                        ${room_booking.RoomBooking.helpers.formatTimeForFrontend(slot.end_time)}
                    </div>
                    <div class="duration-badge">
                        ${duration} ${__('hours')}
                    </div>
                    <div class="price">
                        ${room_booking.RoomBooking.helpers.formatCurrency(slot.price)}
                    </div>
                </div>
            `);
        });
    }

    handle_available_slot_click(e) {
        const $slot = $(e.currentTarget);
        const room = $slot.data('room');
        const slot = {
            room,
            start: $slot.data('start'),
            end: $slot.data('end'),
            price: $slot.data('price'),
            duration: $slot.data('duration'),
            status: $slot.data('status')
        };
        
        // تحديد الفترة المختارة
        this.state.selectedSlots = [slot];
        this.update_selection_summary();
        
        // فتح نموذج الحجز مباشرة
        if (this.events.slot_selected) {
            this.events.slot_selected({ room, slot });
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
        if (this.state.selectedSlots.length && this.events.book_now_clicked) {
            this.events.book_now_clicked(this.state.selectedSlots);
        }
    }

    update_selection_summary() {
        const $summary = this.wrapper.find('.selection-summary');
        
        if (!this.state.selectedSlots.length) {
            $summary.hide();
            return;
        }
        
        const slot = this.state.selectedSlots[0];
        const duration = slot.duration;
        const price = slot.price;
        
        this.wrapper.find('.selected-period').text(
            `${room_booking.RoomBooking.helpers.formatTimeForFrontend(slot.start)} - 
             ${room_booking.RoomBooking.helpers.formatTimeForFrontend(slot.end)}`
        );
        
        this.wrapper.find('.selected-duration').text(`${duration} ${__('hours')}`);
        this.wrapper.find('.selected-price').text(room_booking.RoomBooking.helpers.formatCurrency(price));
        
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
        this.wrapper.find('.filter-section, .room-list-container, .help-section').toggle(!loading);
    }

    reload_rooms() {
        this.load_rooms();
    }

    show_error(message) {
        frappe.msgprint({
            title: __('Error'),
            message: message,
            indicator: 'red'
        });
    }
};