frappe.provide("room_booking.RoomBooking");

/**
 * مكون سلة الحجز لإدارة الحجوزات المحددة
 * @class room_booking.RoomBooking.BookingCart
 */
room_booking.RoomBooking.BookingCart = class {
    constructor({ wrapper, events = {}, settings = {} }) {
        this.wrapper = $(wrapper);
        this.events = events;
        this.settings = settings;
        this.state = { 
            bookings: [], 
            customer: null,
            selectedRoom: null
        };
        this.init_component();
    }

    init_component() {
        this.render();
        this.add_styles();
        this.bind_events();
    }

    render() {
        this.wrapper.html(`
            <div class="booking-cart-container">
                <div class="cart-header">
                    <h4><i class="fa fa-shopping-cart"></i> ${__('Booking Cart')}</h4>
                </div>
                
                <div class="cart-items-container">
                    <div class="empty-cart-message">
                        <i class="fa fa-clock"></i>
                        <p>${__('No bookings selected yet')}</p>
                    </div>
                </div>
                
                <div class="cart-summary">
                    <div class="summary-row">
                        <span>${__('Total Duration')}:</span>
                        <strong class="total-duration">0 ${__('hours')}</strong>
                    </div>
                    <div class="summary-row">
                        <span>${__('Total Price')}:</span>
                        <strong class="total-price">${room_booking.RoomBooking.helpers.formatCurrency(0)}</strong>
                    </div>
                    
                    <div class="customer-selection mt-3">
                        <label>${__('Customer')}</label>
                        <div class="input-group">
                            <select class="form-control customer-select" 
                                    data-placeholder="${__('Select customer')}">
                                <option value="">${__('Select customer')}</option>
                            </select>
                            <div class="input-group-append">
                                <button class="btn btn-outline-secondary refresh-customers" 
                                        title="${__('Refresh customers list')}">
                                    <i class="fa fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary btn-checkout mt-3" disabled>
                        <i class="fa fa-calendar-check"></i> ${__('Confirm Booking')}
                    </button>
                </div>
            </div>
        `);
        
        this.$cartItems = this.wrapper.find('.cart-items-container');
        this.$emptyMessage = this.wrapper.find('.empty-cart-message');
        this.$customerSelect = this.wrapper.find('.customer-select');
        this.$checkoutBtn = this.wrapper.find('.btn-checkout');
    }

    add_styles() {
        const styles = `
            <style>
                .booking-cart-container {
                    background: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    padding: 20px;
                    height: 100%;
                }
                
                .cart-header {
                    border-bottom: 1px solid #eee;
                    padding-bottom: 15px;
                    margin-bottom: 15px;
                }
                
                .cart-header h4 {
                    color: #333;
                    font-weight: 600;
                }
                
                .cart-items-container {
                    min-height: 200px;
                    position: relative;
                }
                
                .empty-cart-message {
                    text-align: center;
                    padding: 40px 0;
                    color: #999;
                }
                
                .empty-cart-message i {
                    font-size: 40px;
                    margin-bottom: 10px;
                    opacity: 0.6;
                }
                
                .cart-item {
                    background: #f9f9f9;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 10px;
                    border-left: 3px solid #4CAF50;
                    transition: all 0.3s;
                }
                
                .cart-item:hover {
                    background: #f1f1f1;
                }
                
                .cart-item-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                
                .cart-item-title {
                    font-weight: 600;
                    color: #333;
                }
                
                .cart-item-duration {
                    background: rgba(0,0,0,0.1);
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 12px;
                }
                
                .cart-item-time {
                    color: #666;
                    font-size: 13px;
                }
                
                .cart-item-price {
                    font-weight: 600;
                    color: #4CAF50;
                }
                
                .cart-summary {
                    border-top: 1px solid #eee;
                    padding-top: 15px;
                    margin-top: 15px;
                }
                
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                
                .btn-checkout {
                    width: 100%;
                    padding: 10px;
                    font-weight: 600;
                }
                
                .btn-checkout:disabled {
                    opacity: 0.7;
                }
            </style>
        `;
        this.wrapper.append(styles);
    }

    bind_events() {
        this.$checkoutBtn.on('click', () => this.handle_checkout());
        this.$customerSelect.on('change', () => this.handle_customer_change());
        this.wrapper.on('click', '.remove-item', (e) => this.remove_booking($(e.target).data('id')));
        this.wrapper.on('click', '.refresh-customers', () => this.load_customers());
    }

    async load_customers() {
        try {
            this.$customerSelect.prop('disabled', true);
            const { message: customers } = await frappe.call('room_booking.api.get_customers');
            
            this.$customerSelect.empty().append('<option value="">Select customer</option>');
            customers.forEach(c => {
                this.$customerSelect.append(`<option value="${c.name}">${c.customer_name}</option>`);
            });
            
            if (this.state.customer) {
                this.$customerSelect.val(this.state.customer);
            }
        } catch (error) {
            console.error('Failed to load customers:', error);
            frappe.msgprint(__('Failed to load customers list'));
        } finally {
            this.$customerSelect.prop('disabled', false);
        }
    }

    handle_customer_change() {
        this.state.customer = this.$customerSelect.val();
        this.update_checkout_button();
    }

    update_checkout_button() {
        const canCheckout = this.state.bookings.length > 0 && this.state.customer;
        this.$checkoutBtn.prop('disabled', !canCheckout);
    }

    handle_checkout() {
        if (this.events.checkout) {
            this.events.checkout({
                bookings: this.state.bookings,
                customer: this.state.customer,
                room: this.state.selectedRoom
            });
        }
    }

    add_booking(room, slot) {
        if (!this.state.selectedRoom) {
            this.state.selectedRoom = room;
        }
        
        // تجنب الإضافة المكررة
        const exists = this.state.bookings.some(b => 
            b.start === slot.start && b.end === slot.end
        );
        
        if (!exists) {
            this.state.bookings.push({
                ...slot,
                room_name: room.room_name,
                id: Date.now().toString()
            });
            this.render_bookings();
        }
        
        this.update_checkout_button();
    }

    remove_booking(bookingId) {
        this.state.bookings = this.state.bookings.filter(b => b.id !== bookingId);
        this.render_bookings();
        this.update_checkout_button();
    }

    render_bookings() {
        this.$cartItems.empty();
        
        if (this.state.bookings.length === 0) {
            this.$emptyMessage.show();
            return;
        }
        
        this.$emptyMessage.hide();
        
        let totalDuration = 0;
        let totalPrice = 0;
        
        this.state.bookings.forEach(booking => {
            const duration = room_booking.RoomBooking.helpers.calculateDuration(booking.start, booking.end);
            totalDuration += duration;
            totalPrice += parseFloat(booking.price || 0);
            
            const $item = $(`
                <div class="cart-item" data-id="${booking.id}">
                    <div class="cart-item-header">
                        <span class="cart-item-title">${booking.room_name}</span>
                        <span class="cart-item-duration">${duration} ${__('hours')}</span>
                    </div>
                    <div class="cart-item-time">
                        ${room_booking.RoomBooking.helpers.formatTimeForFrontend(booking.start)} - 
                        ${room_booking.RoomBooking.helpers.formatTimeForFrontend(booking.end)}
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <span class="cart-item-price">
                            ${room_booking.RoomBooking.helpers.formatCurrency(booking.price)}
                        </span>
                        <button class="btn btn-sm btn-outline-danger remove-item" 
                                data-id="${booking.id}"
                                title="${__('Remove')}">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </div>
            `);
            
            this.$cartItems.append($item);
        });
        
        // تحديث الملخص
        this.wrapper.find('.total-duration').text(`${totalDuration.toFixed(2)} ${__('hours')}`);
        this.wrapper.find('.total-price').text(room_booking.RoomBooking.helpers.formatCurrency(totalPrice));
    }

    clear() {
        this.state.bookings = [];
        this.state.customer = null;
        this.state.selectedRoom = null;
        this.$customerSelect.val('');
        this.render_bookings();
        this.update_checkout_button();
    }
};