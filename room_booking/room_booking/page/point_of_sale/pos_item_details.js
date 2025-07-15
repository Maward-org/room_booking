frappe.provide("room_booking.RoomBookingPOS");

room_booking.RoomBookingPOS.ItemDetails = class {
	constructor({ wrapper, booking }) {
		this.wrapper = $(wrapper);
		this.booking = booking;
		this.init_component();
	}

	init_component() {
		this.wrapper.html(`
			<div class="rbp-item-details p-3 border rounded bg-light">
				<h6 class="mb-2">${__("تفاصيل الحجز")}</h6>
				<div class="mb-1"><strong>${__("الغرفة")}:</strong> ${this.booking.room_name}</div>
				<div class="mb-1"><strong>${__("الفترة")}:</strong> ${this.booking.start_time} - ${this.booking.end_time}</div>
				<div class="mb-1"><strong>${__("المبلغ")}:</strong> ${this.booking.price} ${__("ر.س")}</div>
				${this.booking.customer ? `<div class="mb-1"><strong>${__("العميل")}:</strong> ${this.booking.customer}</div>` : ""}
			</div>
		`);
	}
};
