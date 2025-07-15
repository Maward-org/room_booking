
frappe.provide("room_booking.RoomBooking");

frappe.pages["roombooking"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Room Booking System"),
		single_column: true,
	});

	frappe.require("room_booking.bundle.js", function () {
		wrapper.book = new room_booking.RoomBooking.Application(wrapper);
		window.cur_book = wrapper.book;
	});
};

frappe.pages["roombooking"].refresh = function (wrapper) {
	if (document.scannerDetectionData) {
		onScan.detachFrom(document);
		wrapper.book.wrapper.html("");
		wrapper.book.check_opening_entry();
	}
};

