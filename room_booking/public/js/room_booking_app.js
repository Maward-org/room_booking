frappe.provide("room_booking.RoomBooking");

room_booking.RoomBooking.Application = class {
	constructor(wrapper) {
		this._initProperties(wrapper);
		this._initPOSOpeningHandler(); // تهيئة منطق فتح الفترة من ملف منفصل
	}

	_initProperties(wrapper) {
		this.wrapper = $(wrapper).find(".layout-main-section");
		this.page = wrapper.page;
		this._state = {
			selectedRoom: null,
			selectedSlot: null,
			isLoading: false,
			currentView: "booking",
		};
		this._components = {};
        this.make_app();

	}

	_initPOSOpeningHandler() {
		this.posHandler = new room_booking.RoomBooking.POSOpeningHandler(this);
	}

	make_app() {
		this.prepare_dom();
		this.prepare_components();
		// this.prepare_menu();
		this.prepare_fullscreen_btn();
	}

	prepare_dom() {
		this.wrapper.html(`
			<div class="app-content">
            <div class="booking-view">
                <div class="room-selector-container"></div>
            </div>
			</div>
		`);
	}

	prepare_components() {
		this._initRoomSelector();
	}


	_initRoomSelector() {
		this._components.roomSelector = new room_booking.RoomBooking.RoomSelector({
			wrapper: this.wrapper.find(".room-selector-container"),
		});
	}

    prepare_menu() {
		this.page.clear_menu();
		this.page.add_menu_item(__("Open Form View"), this.open_form_view(this), false, "Ctrl+F");
		this.page.add_menu_item(__("Close the POS"), app.close_pos(this), false, "Shift+Ctrl+C");
	}
    open_form_view() {
		frappe.model.sync(this.frm.doc);
		frappe.set_route("Form", this.frm.doc.doctype, this.frm.doc.name);
	}

	prepare_fullscreen_btn() {
		this.page.page_actions.find(".custom-actions").empty();
		this.page.add_button(__("Full Screen"), null, { btn_class: "btn-default fullscreen-btn" });
		this.bind_fullscreen_events();
	}

	bind_fullscreen_events() {
		this.$fullscreen_btn = this.page.page_actions.find(".fullscreen-btn");

		this.$fullscreen_btn.on("click", function () {
			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen();
			} else {
				document.exitFullscreen();
			}
		});

		$(document).on("fullscreenchange", this.handle_fullscreen_change_event.bind(this));
	}

	handle_fullscreen_change_event() {
		const enable_label = __("Full Screen");
		const exit_label = __("Exit Full Screen");

		this.$fullscreen_btn.text(document.fullscreenElement ? exit_label : enable_label);
	}
};

// تهيئة التطبيق عند تحميل الصفحة
frappe.pages["roombooking"].on_page_load = function (wrapper) {
	new room_booking.RoomBooking.Application(wrapper);
};
