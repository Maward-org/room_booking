frappe.provide("room_booking.RoomBookingPOS");

room_booking.RoomBookingPOS.ItemCart = class {
	constructor({ wrapper, events = {}, settings = {} }) {
		this.wrapper = $(wrapper);
		this.events = events;
		this.settings = settings;

		this.state = {
			bookings: [],     // قائمة الحجوزات المختارة {room, start_time, end_time, price}
			customer: null,   // بيانات العميل
		};
		this.init_component();
	}

	init_component() {
		this.prepare_dom();
		this.bind_events();
		this.render_cart();
	}

	prepare_dom() {
		this.wrapper.html(`
			<div class="rbp-cart p-3 border rounded shadow-sm bg-white">
				<div class="d-flex align-items-center mb-2 gap-2">
					<label class="fw-bold mb-0">${__("العميل")}:</label>
					<input type="text" class="form-control rbp-customer-input" placeholder="${__("ابحث عن العميل أو أدخل اسمه")}" style="max-width:220px;">
					<button class="btn btn-link p-0 rbp-clear-customer" style="display:none;">
						<i class="fa fa-times"></i>
					</button>
				</div>
				<div class="rbp-customer-info small text-muted mb-2"></div>
				<hr>
				<div class="rbp-bookings-list"></div>
				<div class="rbp-cart-summary mt-3 border-top pt-2"></div>
				<div class="mt-3 d-flex justify-content-end">
					<button class="btn btn-success rbp-checkout-btn" disabled>
						<i class="fa fa-credit-card"></i> ${__("تأكيد الحجز والدفع")}
					</button>
				</div>
			</div>
		`);
		this.$list = this.wrapper.find('.rbp-bookings-list');
		this.$summary = this.wrapper.find('.rbp-cart-summary');
		this.$customer_input = this.wrapper.find('.rbp-customer-input');
		this.$customer_info = this.wrapper.find('.rbp-customer-info');
		this.$checkout_btn = this.wrapper.find('.rbp-checkout-btn');
	}

	bind_events() {
		this.$customer_input.on('input', async (e) => {
			const value = e.target.value.trim();
			this.state.customer = value || null;
			this.update_customer_info();
			this.enable_checkout();
		});

		this.wrapper.on('click', '.rbp-remove-booking', (e) => {
			const idx = $(e.currentTarget).data('idx');
			this.state.bookings.splice(idx, 1);
			this.render_cart();
			this.enable_checkout();
		});

		this.$checkout_btn.on('click', () => this.trigger_checkout());
	}

	render_cart() {
		const bookings = this.state.bookings;
		this.$list.empty();
		if (!bookings.length) {
			this.$list.html(`<div class="alert alert-info mb-2">${__("لم يتم اختيار أي حجز بعد.")}</div>`);
			this.$summary.html('');
			this.$checkout_btn.prop('disabled', true);
			return;
		}

		bookings.forEach((booking, idx) => {
			this.$list.append(`
				<div class="rbp-cart-item d-flex align-items-center justify-content-between mb-2 p-2 border rounded bg-light">
					<div>
						<div><strong>${booking.room_name}</strong></div>
						<div class="small text-muted">
							${__("الفترة")}: ${booking.start_time} - ${booking.end_time}
						</div>
						<div class="small">${__("السعر")}: ${booking.price} ${__("ر.س")}</div>
					</div>
					<button class="btn btn-outline-danger btn-sm rbp-remove-booking" data-idx="${idx}">
						<i class="fa fa-trash"></i>
					</button>
				</div>
			`);
		});

		const total = bookings.reduce((sum, b) => sum + (parseFloat(b.price) || 0), 0);
		this.$summary.html(`
			<div class="d-flex justify-content-between fw-bold">
				<span>${__("المجموع الكلي")}:</span>
				<span>${total.toFixed(2)} ${__("ر.س")}</span>
			</div>
		`);
		this.enable_checkout();
	}

	update_customer_info() {
		const customer = this.state.customer;
		if (!customer) {
			this.$customer_info.html('');
			this.wrapper.find('.rbp-clear-customer').hide();
			return;
		}
		// يمكنك هنا جلب بيانات إضافية عن العميل إن أردت
		this.$customer_info.html(`<span class="text-success">${__("سيتم الحجز باسم")} <strong>${customer}</strong></span>`);
		this.wrapper.find('.rbp-clear-customer').show();
	}

	enable_checkout() {
		const ready = this.state.bookings.length > 0 && !!this.state.customer;
		this.$checkout_btn.prop('disabled', !ready);
	}

	// هذه الدالة تُستدعى عند إضافة حجز جديد من RoomSelector:
	add_booking(booking) {
		this.state.bookings.push(booking);
		this.render_cart();
		this.enable_checkout();
	}

	clear_cart() {
		this.state.bookings = [];
		this.render_cart();
		this.enable_checkout();
	}

	trigger_checkout() {
		if (this.events && this.events.checkout) {
			this.events.checkout({
				bookings: this.state.bookings,
				customer: this.state.customer
			});
		}
	}
};
