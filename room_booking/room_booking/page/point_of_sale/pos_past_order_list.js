frappe.provide("room_booking.RoomBookingPOS");

room_booking.RoomBookingPOS.PastOrderList = class {
	constructor({ wrapper, filters = {} }) {
		this.wrapper = $(wrapper);
		this.filters = filters;
		this.init_component();
	}

	async init_component() {
		this.prepare_dom();
		await this.load_orders();
	}

	prepare_dom() {
		this.wrapper.html(`
			<div class="rbp-past-orders p-2 border rounded bg-light">
				<h6 class="mb-2">${__("سجل الحجوزات السابقة")}</h6>
				<table class="table table-sm table-striped mb-0">
					<thead>
						<tr>
							<th>${__("رقم الحجز")}</th>
							<th>${__("الغرفة")}</th>
							<th>${__("التاريخ")}</th>
							<th>${__("الفترة")}</th>
							<th>${__("العميل")}</th>
							<th>${__("المبلغ")}</th>
							<th>${__("الحالة")}</th>
						</tr>
					</thead>
					<tbody class="rbp-orders-tbody"></tbody>
				</table>
			</div>
		`);
		this.$tbody = this.wrapper.find('.rbp-orders-tbody');
	}

	async load_orders() {
		this.$tbody.html(`<tr><td colspan="7" class="text-center text-muted">${__("...تحميل")}</td></tr>`);
		try {
			const r = await frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Room Booking",
					fields: ["name", "rental_room", "booking_date", "start_time", "end_time", "customer_name", "total_amount", "reservation_status"],
					limit_page_length: 25,
					order_by: "booking_date desc"
				}
			});
			const rows = (r.message || []).map(b =>
				`<tr>
					<td>${b.name}</td>
					<td>${b.rental_room}</td>
					<td>${b.booking_date}</td>
					<td>${b.start_time} - ${b.end_time}</td>
					<td>${b.customer_name || ""}</td>
					<td>${b.total_amount}</td>
					<td>${b.reservation_status || ""}</td>
				</tr>`
			).join("");
			this.$tbody.html(rows || `<tr><td colspan="7" class="text-center text-muted">${__("لا توجد حجوزات")}</td></tr>`);
		} catch (e) {
			this.$tbody.html(`<tr><td colspan="7" class="text-danger">${__("خطأ في تحميل الحجوزات")}</td></tr>`);
		}
	}
};
