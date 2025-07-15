frappe.provide("room_booking.RoomBooking");

/**
 * Controller class for Room Booking System
 * @class room_booking.RoomBooking.Controller
 */
room_booking.RoomBooking.Application = class {
    constructor(wrapper) {
        this.wrapper = $(wrapper).find(".layout-main-section");
        this.page = wrapper.page;
        this.state = {
            selectedRoom: null,
            selectedSlot: null,
            isLoading: false
        };
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.check_opening_entry();
        this.setup_global_events();
    }

    /**
     * Check for POS opening entry (if required)
     */
    check_opening_entry() {
        // Implementation remains same as original
        // ...
        this.prepare_app_defaults();
    }

    /**
     * Prepare application defaults and settings
     */
    prepare_app_defaults() {
        // Implementation remains same as original
        // ...
        this.make_app();
    }

    /**
     * Setup global event listeners
     */
    setup_global_events() {
        // Handle POS closing events if needed
        frappe.realtime.on('pos_closed', () => {
            this.handle_pos_closed();
        });
    }

    /**
     * Handle POS closed event
     */
    handle_pos_closed() {
        frappe.msgprint({
            title: __('POS Closed'),
            message: __('The POS session has been closed. Please refresh the page.'),
            indicator: 'orange'
        });
    }

    /**
     * Create the main application UI
     */
    make_app() {
        this.prepare_dom();
        this.prepare_menu();
        this.prepare_fullscreen_btn();
        this.init_components();
    }

    /**
     * Prepare DOM structure
     */
    prepare_dom() {
        this.wrapper.html(`
            <div class="room-booking-app">
                <div class="row">
                    <div class="col-md-8 room-selector-container"></div>
                    <div class="col-md-4 booking-cart-container"></div>
                </div>
            </div>
        `);
    }

    /**
     * Prepare application menu
     */
    prepare_menu() {
        this.page.clear_menu();
        
        this.page.add_menu_item(__('Refresh'), () => this.refresh(), false, 'F5');
        this.page.add_menu_item(__('Close POS'), () => this.close_pos(), false, 'Ctrl+Q');
        this.page.add_menu_item(__('Full Screen'), () => this.toggle_fullscreen(), false, 'F11');
    }

    /**
     * Prepare fullscreen button
     */
    prepare_fullscreen_btn() {
        this.page.add_button(__('Full Screen'), () => this.toggle_fullscreen(), {
            btn_class: 'btn-default fullscreen-btn'
        });
    }

    /**
     * Toggle fullscreen mode
     */
    toggle_fullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * Initialize all components
     */
    init_components() {
        this.init_room_selector();
        this.init_booking_cart();
        this.init_booking_dialog();
        this.init_booking_manager();
    }

    /**
     * Initialize room selector component
     */
    init_room_selector() {
        this.room_selector = new room_booking.RoomBooking.RoomSelector({
            wrapper: this.wrapper.find('.room-selector-container'),
            events: {
                slot_selected: (args) => this.handle_slot_selected(args),
                booked_slot_clicked: (args) => this.handle_booked_slot_click(args)
            }
        });
    }

    /**
     * Initialize booking cart component
     */
    init_booking_cart() {
        this.booking_cart = new room_booking.RoomBooking.BookingCart({
            wrapper: this.wrapper.find('.booking-cart-container'),
            events: {
                checkout: () => this.handle_checkout()
            }
        });
    }

    /**
     * Initialize booking dialog component
     */
    init_booking_dialog() {
        this.booking_dialog = new room_booking.RoomBooking.BookingDialog({
            events: {
                submit_booking: (values) => this.handle_booking_submit(values)
            }
        });
    }

    /**
     * Initialize booking manager component
     */
    init_booking_manager() {
        this.booking_manager = new room_booking.RoomBooking.BookingManager({
            events: {
                booking_updated: () => this.refresh(),
                booking_cancelled: () => this.refresh()
            }
        });
    }

    /**
     * Handle slot selection event
     */
    handle_slot_selected({ room, slot }) {
        this.state.selectedRoom = room;
        this.state.selectedSlot = slot;
        this.booking_cart.add_booking(room, slot);
    }

    /**
     * Handle booked slot click event
     */
    handle_booked_slot_click(booking) {
        this.booking_manager.show_booking_details(booking);
    }

    /**
     * Handle checkout event
     */
    handle_checkout() {
        if (!this.state.selectedRoom || !this.state.selectedSlot) {
            frappe.msgprint(__('Please select a time slot first'));
            return;
        }
        
        this.booking_dialog.show(
            this.state.selectedRoom, 
            this.state.selectedSlot,
            () => this.handle_booking_success()
        );
    }

    /**
     * Handle booking submission
     */
    async handle_booking_submit(values) {
        try {
            this.set_loading(true);
            
            await frappe.call({
                method: 'room_booking.api.create_booking',
                args: {
                    booking: {
                        rental_room: values.room.name,
                        start_datetime: `${values.date} ${values.start_time}`,
                        end_datetime: `${values.date} ${values.end_time}`,
                        customer_name: values.customer,
                        notes: values.notes,
                        amount: values.amount
                    }
                },
                freeze: true
            });
            
            return true;
        } catch (error) {
            console.error('Booking error:', error);
            frappe.msgprint(__('Booking failed. Please try again.'));
            return false;
        } finally {
            this.set_loading(false);
        }
    }

    /**
     * Handle successful booking
     */
    handle_booking_success() {
        frappe.show_alert({ message: __('Booking created successfully'), indicator: 'green' });
        this.state.selectedRoom = null;
        this.state.selectedSlot = null;
        this.booking_cart.clear();
        this.room_selector.reload_rooms();
    }

    /**
     * Close POS session
     */
    close_pos() {
        frappe.confirm(
            __('Are you sure you want to close the POS session?'),
            () => {
                frappe.call({
                    method: 'room_booking.api.close_pos_session',
                    freeze: true,
                    callback: () => {
                        frappe.show_alert(__('POS session closed successfully'));
                        window.location.reload();
                    }
                });
            }
        );
    }

    /**
     * Refresh the application
     */
    refresh() {
        this.set_loading(true);
        this.room_selector.reload_rooms();
        this.booking_cart.clear();
        this.set_loading(false);
    }

    /**
     * Set loading state
     */
    set_loading(loading) {
        this.state.isLoading = loading;
        if (loading) {
            this.wrapper.addClass('loading');
        } else {
            this.wrapper.removeClass('loading');
        }
    }
};

// Add styles when the page loads
$(document).ready(() => {
    $('<style>')
        .text(`
            .room-booking-app.loading {
                position: relative;
                opacity: 0.7;
                pointer-events: none;
            }
            .room-booking-app.loading::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255,255,255,0.7);
                z-index: 1000;
            }
        `)
        .appendTo('head');
});