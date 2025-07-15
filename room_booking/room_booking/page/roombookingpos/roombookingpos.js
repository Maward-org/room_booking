frappe.provide("room_booking.RoomBookingPOS");

frappe.pages["roombookingpos"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Room Booking POS"),
		single_column: true,
	});

	frappe.require("room_booking.bundle.js", function () {
		wrapper.pos = new room_booking.RoomBookingPOS.Controller(wrapper);
		window.cur_pos = wrapper.pos;
	});
};

frappe.pages["roombookingpos"].refresh = function (wrapper) {
	if (document.scannerDetectionData) {
		onScan.detachFrom(document);
		wrapper.pos.wrapper.html("");
		wrapper.pos.check_opening_entry();
	}
};
