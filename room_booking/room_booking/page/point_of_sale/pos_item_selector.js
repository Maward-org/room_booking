frappe.provide('room_booking.RoomBookingPOS');

room_booking.RoomBookingPOS.RoomSelector = class {
	constructor({ wrapper, events = {}, settings = {} }) {
		this.wrapper = $(wrapper);
		this.events = events;
		this.settings = settings;
		this.state = {
			rooms: [],
			branch: "",
			date: frappe.datetime.get_today(),
			capacity: "",
			loading: false,
		};
		this.init_component();
	}

	init_component() {
		this.prepare_dom();
		this.bind_events();
		this.load_branches();
	}

	prepare_dom() {
		this.wrapper.html(`
			<div class="rbp-filter-bar d-flex gap-3 align-items-end mb-3 flex-wrap">
				<div>
					<label>${__("Branch")}</label>
					<select class="form-control rbp-branch"></select>
				</div>
				<div>
					<label>${__("Date")}</label>
					<input type="date" class="form-control rbp-date" value="${frappe.datetime.get_today()}"/>
				</div>
				<div>
					<label>${__("Capacity")}</label>
					<select class="form-control rbp-capacity">
						<option value="">${__("Any")}</option>
						<option value="5">5+</option>
						<option value="10">10+</option>
						<option value="20">20+</option>
					</select>
				</div>
				<div class="flex-fill"></div>
				<button class="btn btn-primary rbp-refresh">
					<i class="fa fa-sync"></i> ${__("Refresh")}
				</button>
			</div>
			<div class="rbp-rooms-container row gx-4 gy-4"></div>
			<div class="rbp-help text-muted mt-4 small">
				<i class="fa fa-info-circle"></i> ${__("حدد الفرع والتاريخ والسعة أولاً ثم اختر الفترة الزمنية بالضغط عليها.")}
			</div>
		`);
		this.$rooms = this.wrapper.find('.rbp-rooms-container');
	}

	bind_events() {
		this.wrapper.on('change', '.rbp-branch, .rbp-date, .rbp-capacity', () => this.load_rooms());
		this.wrapper.on('click', '.rbp-refresh', () => this.load_rooms());
		this.wrapper.on('click', '.rbp-slot.available', (e) => this.handle_slot_click(e));
	}

	async load_branches() {
		let branches = [];
		try {
			const r = await frappe.call('room_booking.roombookingpos.get_branches');
			branches = r.message || [];
		} catch {
			branches = [];
		}
		const $branch = this.wrapper.find('.rbp-branch').empty();
		$branch.append(`<option value="">${__("All Branches")}</option>`);
		branches.forEach(b => $branch.append(`<option value="${b}">${b}</option>`));
		this.load_rooms();
	}

	async load_rooms() {
		this.set_loading(true);
		this.$rooms.empty();

		const branch = this.wrapper.find('.rbp-branch').val();
		const date = this.wrapper.find('.rbp-date').val();
		const capacity = this.wrapper.find('.rbp-capacity').val();

		try {
			const r = await frappe.call({
				method: 'room_booking.roombookingpos.get_available_rooms_with_slots',
				args: { branch, date, capacity }
			});
			const rooms = r.message || [];
			this.state.rooms = rooms;
			this.render_rooms(rooms);
		} catch (e) {
			this.$rooms.html(`<div class="alert alert-danger">${__("خطأ في تحميل الغرف!")}</div>`);
		}
		this.set_loading(false);
	}

	set_loading(on) {
		this.state.loading = on;
		this.$rooms.html(on ? `
			<div class="d-flex justify-content-center align-items-center p-5 w-100">
				<div class="spinner-border"></div>
			</div>
		` : "");
	}

	render_rooms(rooms) {
		this.$rooms.empty();
		if (!rooms.length) {
			this.$rooms.html(`
				<div class="col-12">
					<div class="alert alert-warning">${__("لا توجد غرف متاحة بهذه الخيارات.")}</div>
				</div>
			`);
			return;
		}
		rooms.forEach(room => {
			this.$rooms.append(this.get_room_card(room));
		});
	}

	get_room_card(room) {
		const slots_html = (room.available_slots || []).map(slot => this.get_slot_html(slot)).join("");
		return `
			<div class="col-md-6 col-lg-4">
				<div class="card shadow-sm h-100 rbp-room-card">
					<div class="card-header d-flex justify-content-between align-items-center bg-white">
						<div>
							<strong>${room.room_name}</strong>
							<span class="badge bg-secondary ms-2">${room.no_of_seats} ${__("مقعد")}</span>
						</div>
						<span class="badge bg-light text-primary border border-1 border-primary">${room.price_per_hour} ${__("ر.س/ساعة")}</span>
					</div>
					<div class="card-body">
						<div class="rbp-slots-grid d-flex flex-wrap gap-2">
							${slots_html}
						</div>
						${room.description ? `<div class="small text-muted mt-2">${room.description}</div>` : ""}
					</div>
					<div class="card-footer bg-white d-flex justify-content-between small text-muted">
						${room.branch || ""}
						<span>${room.location || ""}</span>
					</div>
				</div>
			</div>
		`;
	}

	get_slot_html(slot) {
		const status = slot.status.toLowerCase();
		let color = "secondary", title = __("غير متاح");
		if (status === "available") { color = "success"; title = __("متاح للحجز"); }
		else if (status === "booked") { color = "danger"; title = __("محجوز"); }
		else if (status === "expired") { color = "light"; title = __("انتهت الفترة"); }
		return `
			<div 
				class="rbp-slot badge bg-${color} px-2 py-2 mb-1 ${status}" 
				style="min-width:80px; cursor: ${status === "available" ? "pointer" : "not-allowed"};" 
				data-start="${slot.start_time}"
				data-end="${slot.end_time}"
				data-status="${slot.status}"
				data-price="${slot.price}"
				title="${title}"
			>
				<div><strong>${slot.start_time} - ${slot.end_time}</strong></div>
				<div class="small">${slot.price} ${__("ر.س")}</div>
			</div>
		`;
	}

	handle_slot_click(e) {
		const $slot = $(e.currentTarget);
		if (!$slot.hasClass('available')) return;
		const card = $slot.closest('.rbp-room-card');
		const room_name = card.find('.card-header strong').text();
		const seats = card.find('.badge.bg-secondary').text();
		const price = $slot.data('price');
		const start_time = $slot.data('start');
		const end_time = $slot.data('end');
		const branch = card.find('.card-footer').text().trim();

		const confirm_html = `
			<div class="mb-2">
				<strong>${__("غرفة")}:</strong> ${room_name}<br/>
				<strong>${__("الفرع")}:</strong> ${branch}<br/>
				<strong>${__("المدة")}:</strong> ${start_time} - ${end_time}<br/>
				<strong>${__("السعر")}:</strong> ${price} ${__("ر.س")}
			</div>
		`;

		frappe.confirm(
			confirm_html + __("تأكيد الحجز لهذه الفترة؟"),
			() => {
				// أطلق event خارجي ليتم تنفيذ عملية الحجز أو الدفع
				this.events.slot_selected && this.events.slot_selected({
					room_name,
					start_time,
					end_time,
					price,
					branch
				});
			},
			__("تأكيد الحجز")
		);
	}
};
