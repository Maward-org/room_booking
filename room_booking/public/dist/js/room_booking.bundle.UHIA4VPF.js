(() => {
  // ../room_booking/room_booking/public/js/room_selector.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.RoomSelector = class {
    constructor({ wrapper, events = {}, settings = {} }) {
      this.wrapper = $(wrapper);
      this.events = events;
      this.settings = settings;
      this.state = {
        branches: [],
        slotsData: {},
        isLoading: false,
        currentDialog: null
      };
      this.init_component();
    }
    init_component() {
      this.render();
      this.load_branches();
      this.bind_events();
    }
    render() {
      this.wrapper.html(`
        <div class="room-booking-container">
            <div class="filter-section grid-filters">
                <div class="filter-item">
                    <label><i class="fa fa-building"></i> ${__("\u0627\u0644\u0641\u0631\u0639")}</label>
                    <select class="form-control branch-filter"></select>
                </div>
                <div class="filter-item">
                    <label><i class="fa fa-calendar-day"></i> ${__("\u0627\u0644\u062A\u0627\u0631\u064A\u062E")}</label>
                    <input type="date" class="form-control date-filter" 
                           value="${frappe.datetime.get_today()}" 
                           min="${frappe.datetime.get_today()}">
                </div>
                <div class="filter-item">
                    <label><i class="fa fa-users"></i> ${__("\u0627\u0644\u0633\u0639\u0629")}</label>
                    <select class="form-control capacity-filter">
                        <option value="">${__("\u0627\u0644\u0643\u0644")}</option>
                        <option value="5">5+</option>
                        <option value="10">10+</option>
                        <option value="20">20+</option>
                    </select>
                </div>
            </div>

            <div class="loading-state text-center" style="display:none;">
                <div class="spinner-border"></div>
                <p>${__("\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u063A\u0631\u0641...")}</p>
            </div>

            <div class="room-list-container"></div>
        </div>
    `);
    }
    bind_events() {
      this.wrapper.on("change", ".branch-filter, .date-filter, .capacity-filter", () => this.load_rooms());
      this.wrapper.on("click", ".time-slot.available", (e) => this.handle_slot_click(e));
      this.wrapper.on("click", ".time-slot.booked", (e) => this.handle_booked_slot_click(e));
    }
    async load_branches() {
      try {
        const { message: branches = [] } = await frappe.call("room_booking.api.get_branches");
        const $select = this.wrapper.find(".branch-filter").empty();
        $select.append(`<option value="">${__("\u0643\u0644 \u0627\u0644\u0641\u0631\u0648\u0639")}</option>`);
        branches.forEach((b) => $select.append(`<option value="${b}">${b}</option>`));
        this.load_rooms();
      } catch (error) {
        this.show_error(__("\u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0641\u0631\u0648\u0639"));
      }
    }
    async load_rooms() {
      if (this.state.isLoading)
        return;
      this.set_loading(true);
      this.clear_selection();
      try {
        const filters = {
          branch: this.wrapper.find(".branch-filter").val(),
          date: this.wrapper.find(".date-filter").val(),
          capacity: this.wrapper.find(".capacity-filter").val()
        };
        const { message: rooms = [] } = await frappe.call({
          method: "room_booking.api.get_available_rooms_with_slots",
          args: filters
        });
        this.state.slotsData = {};
        this.render_rooms(rooms);
      } catch (error) {
        this.show_error(__("\u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u063A\u0631\u0641"));
      } finally {
        this.set_loading(false);
      }
    }
    render_rooms(rooms) {
      const $container = this.wrapper.find(".room-list-container").empty();
      console.log("Rendering rooms:", rooms);
      if (!rooms.length) {
        $container.html(`
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="fa fa-info-circle"></i>
                        ${__("\u0644\u0627 \u062A\u0648\u062C\u062F \u063A\u0631\u0641 \u0645\u062A\u0627\u062D\u0629 \u0644\u0644\u0634\u0631\u0648\u0637 \u0627\u0644\u0645\u062D\u062F\u062F\u0629")}
                    </div>
                </div>
            `);
        return;
      }
      rooms.forEach((room) => {
        this.state.slotsData[room.name] = room.available_slots || [];
        const $card = $(`
    <div class="room-card">
        <div class="card room-card-inner h-100">
            <div class="card-header room-card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                    <i class="fa fa-door-open"></i> ${room.room_name}
                </h5>
                <span class="badge ${room.status === "Available" ? "badge-success" : "badge-info"}">
                    ${room.status}
                </span>
            </div>
            <div class="card-body room-card-body">
                <p><i class="fa fa-users"></i> ${room.no_of_seats} ${__("\u0645\u0642\u0627\u0639\u062F")}</p>
                <p><i class="fa fa-money-bill-wave"></i> 
                    ${this.format_currency(room.price_per_hour)}/${__("\u0633\u0627\u0639\u0629")}
                </p>
                <hr>
                <h6><i class="fa fa-clock"></i> ${__("\u0627\u0644\u0641\u062A\u0631\u0627\u062A \u0627\u0644\u0645\u062A\u0627\u062D\u0629")}</h6>
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
                        ${__("\u0644\u0627 \u062A\u0648\u062C\u062F \u0641\u062A\u0631\u0627\u062A \u0645\u062A\u0627\u062D\u0629")}
                    </div>
                </div>
            `);
        return;
      }
      slots.forEach((slot) => {
        const isBooked = (slot.status || "").toLowerCase() === "booked";
        const startTime = this.format_time(slot.start_time);
        const endTime = this.format_time(slot.end_time);
        const duration = this.calculate_duration(slot.start_time, slot.end_time);
        $container.append(`
                <div class="time-slot ${isBooked ? "booked" : "available"}" 
                     data-room="${roomName}"
                     data-start="${slot.start_time}"
                     data-end="${slot.end_time}"
                     data-status="${slot.status}"
                     data-price="${slot.price}"
                     data-booking-id="${slot.booking_id || ""}">
                    <div>
                        <i class="fa fa-${isBooked ? "lock" : "calendar-alt"} slot-icon"></i>
                        ${startTime} - ${endTime}
                    </div>
                    <div class="small mt-1">
                        ${duration} ${__("\u0633\u0627\u0639\u0629")} \u2022 ${this.format_currency(slot.price)}
                    </div>
                </div>
            `);
      });
    }
    handle_slot_click(e) {
      const $slot = $(e.currentTarget);
      $slot.toggleClass("selected");
      const slotData = {
        room: $slot.data("room"),
        start: $slot.data("start"),
        end: $slot.data("end"),
        price: $slot.data("price"),
        status: $slot.data("status"),
        booking_id: $slot.data("booking-id")
      };
      if ($slot.hasClass("selected")) {
        this.state.selectedSlots.push(slotData);
        this.show_booking_dialog(slotData);
        this.wrapper.find(".time-slot.selected").not($slot).removeClass("selected");
        this.state.selectedSlots = [slotData];
      } else {
        this.state.selectedSlots = this.state.selectedSlots.filter(
          (s) => !(s.room === slotData.room && s.start === slotData.start)
        );
      }
      this.update_selection_summary();
      if (this.state.selectedSlots.length === 1 && this.events.slot_selected) {
        this.events.slot_selected({
          room: slotData.room,
          slot: slotData,
          is_booked: slotData.status === "booked"
        });
      }
    }
    handle_booked_slot_click(e) {
      const $slot = $(e.currentTarget);
      const bookingInfo = {
        room: $slot.data("room"),
        start: $slot.data("start"),
        end: $slot.data("end"),
        booking_id: $slot.data("booking-id"),
        status: $slot.data("status")
      };
      const dialog = new frappe.ui.Dialog({
        title: __("\u062E\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u062D\u062C\u0632"),
        fields: [
          {
            fieldname: "action",
            fieldtype: "Select",
            label: __("\u0627\u062E\u062A\u0631 \u0627\u0644\u0625\u062C\u0631\u0627\u0621"),
            options: [
              { label: __("\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u062D\u062C\u0632"), value: "update" },
              { label: __("\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u062C\u0632"), value: "cancel" },
              { label: __("\u062A\u0641\u0631\u064A\u063A \u0627\u0644\u063A\u0631\u0641\u0629"), value: "clear" }
            ],
            reqd: 1
          }
        ],
        primary_action_label: __("\u062A\u0646\u0641\u064A\u0630"),
        primary_action: async (values) => {
          dialog.hide();
          if (values.action === "update") {
            this.open_update_booking_dialog(bookingInfo);
          } else if (values.action === "cancel") {
            await this.cancel_booking(bookingInfo.booking_id);
          } else if (values.action === "clear") {
            await this.clear_room(bookingInfo.room, this.wrapper.find(".date-filter").val());
          }
          this.reload_rooms();
        }
      });
      dialog.show();
    }
    show_booking_dialog(slotData, is_update = false) {
      if (this.state.currentDialog) {
        this.state.currentDialog.hide();
      }
      const formatTimeForDisplay = (timeStr) => {
        if (!timeStr)
          return "00:00";
        const parts = timeStr.split(":");
        return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : "00:00";
      };
      const defaultCustomer = is_update ? slotData.customer_name || "" : "";
      const defaultBookingDate = this.wrapper.find(".date-filter").val() || frappe.datetime.get_today();
      const defaultStartTime = formatTimeForDisplay(slotData.start);
      const defaultEndTime = formatTimeForDisplay(slotData.end);
      const defaultHours = this.calculate_duration(slotData.start, slotData.end);
      const defaultAmount = slotData.price ? parseFloat(slotData.price).toFixed(2) : "0.00";
      const dialog = new frappe.ui.Dialog({
        title: is_update ? __("\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u062D\u062C\u0632") : __("\u062D\u062C\u0632 \u063A\u0631\u0641\u0629"),
        fields: [
          {
            label: __("\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644"),
            fieldname: "customer",
            fieldtype: "Link",
            options: "Customer",
            reqd: 1,
            default: defaultCustomer
          },
          {
            label: __("\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062D\u062C\u0632"),
            fieldname: "booking_date",
            fieldtype: "Date",
            default: defaultBookingDate,
            read_only: !is_update
          },
          {
            label: __("\u0648\u0642\u062A \u0627\u0644\u062F\u062E\u0648\u0644"),
            fieldname: "start_time",
            fieldtype: "Data",
            default: defaultStartTime,
            reqd: 1,
            description: __("\u0627\u0644\u062A\u0646\u0633\u064A\u0642: HH:mm (\u0645\u062B\u0627\u0644: 14:30)")
          },
          {
            label: __("\u0639\u062F\u062F \u0627\u0644\u0633\u0627\u0639\u0627\u062A"),
            fieldname: "hours",
            fieldtype: "Float",
            default: defaultHours,
            reqd: 1
          },
          {
            label: __("\u0648\u0642\u062A \u0627\u0644\u062E\u0631\u0648\u062C"),
            fieldname: "end_time",
            fieldtype: "Data",
            default: defaultEndTime,
            read_only: true
          },
          {
            label: __("\u0627\u0644\u0633\u0639\u0631"),
            fieldname: "amount",
            fieldtype: "Data",
            default: __("\u0631.\u0633") + " " + defaultAmount,
            read_only: true
          },
          {
            label: __("\u0645\u0644\u0627\u062D\u0638\u0627\u062A"),
            fieldname: "notes",
            fieldtype: "Text",
            default: slotData.notes || ""
          }
        ],
        primary_action_label: is_update ? __("\u062A\u062D\u062F\u064A\u062B") : __("\u062D\u062C\u0632"),
        primary_action: async (values) => {
          if (!this.validateTimeFormat(values.start_time)) {
            frappe.msgprint(__("\u0635\u064A\u063A\u0629 \u0648\u0642\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629. \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 HH:mm"));
            return;
          }
          values.start_time = this.format_time_for_backend(values.start_time);
          values.end_time = this.format_time_for_backend(values.end_time);
          this.set_loading(true);
          try {
            if (is_update) {
              await frappe.call({
                method: "room_booking.api.update_booking",
                args: {
                  booking_id: slotData.booking_id,
                  booking: JSON.stringify({
                    rental_room: slotData.room,
                    start_datetime: `${values.booking_date} ${values.start_time}`,
                    end_datetime: `${values.booking_date} ${values.end_time}`,
                    customer_name: values.customer,
                    notes: values.notes,
                    amount: values.amount.replace(/[^\d.]/g, "")
                  })
                },
                freeze: true
              });
              frappe.show_alert({ message: __("\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062D\u062C\u0632 \u0628\u0646\u062C\u0627\u062D"), indicator: "green" });
            } else {
              await frappe.call({
                method: "room_booking.api.create_booking",
                args: {
                  booking: [{
                    rental_room: slotData.room,
                    start_datetime: `${values.booking_date} ${values.start_time}`,
                    end_datetime: `${values.booking_date} ${values.end_time}`,
                    customer_name: values.customer,
                    notes: values.notes,
                    amount: values.amount.replace(/[^\d.]/g, "")
                  }]
                },
                freeze: true
              });
              frappe.show_alert({ message: __("\u062A\u0645 \u0627\u0644\u062D\u062C\u0632 \u0628\u0646\u062C\u0627\u062D"), indicator: "green" });
            }
            dialog.hide();
            this.reload_rooms();
            if (is_update && this.events.booking_updated) {
              this.events.booking_updated(slotData.booking_id);
            }
            if (!is_update && this.events.booking_created) {
              this.events.booking_created();
            }
          } catch (error) {
            frappe.msgprint({ title: __("\u062E\u0637\u0623"), message: error.message || error, indicator: "red" });
          } finally {
            this.set_loading(false);
          }
        }
      });
      dialog.fields_dict.start_time.$input.on("change", () => {
        const timeValue = dialog.get_value("start_time");
        if (!this.validateTimeFormat(timeValue)) {
          frappe.msgprint(__("\u0635\u064A\u063A\u0629 \u0627\u0644\u0648\u0642\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629. \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 HH:mm (\u0645\u062B\u0627\u0644: 14:30)"));
          dialog.set_value("start_time", "00:00");
          return;
        }
        this.update_booking_times(dialog, slotData, "start");
      });
      dialog.fields_dict.hours.$input.on("change", () => {
        let hours = parseFloat(dialog.get_value("hours"));
        if (isNaN(hours) || hours < 1 || hours > 24) {
          frappe.msgprint(__("\u0639\u062F\u062F \u0627\u0644\u0633\u0627\u0639\u0627\u062A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0628\u064A\u0646 1 \u0648 24"));
          dialog.set_value("hours", 1);
          hours = 1;
        }
        this.update_booking_times(dialog, slotData, "hours");
      });
      dialog.show();
      this.state.currentDialog = dialog;
    }
    validateTimeFormat(timeStr) {
      if (!timeStr)
        return false;
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      return timeRegex.test(timeStr);
    }
    format_time_for_backend(timeStr) {
      if (!timeStr)
        return "00:00:00";
      const parts = timeStr.split(":");
      if (parts.length === 2) {
        return `${parts[0]}:${parts[1]}:00`;
      }
      return timeStr;
    }
    update_booking_times(dialog, slotData, changedField) {
      const startTime = dialog.get_value("start_time");
      if (!this.validateTimeFormat(startTime)) {
        return;
      }
      let hours = parseFloat(dialog.get_value("hours"));
      hours = Math.max(1, Math.min(hours, 24));
      const endTime = this.calculate_end_time(startTime, hours);
      dialog.set_value("end_time", endTime);
      const pricePerHour = slotData.price / this.calculate_duration(slotData.start, slotData.end);
      const price = (hours * pricePerHour).toFixed(2);
      dialog.set_value("amount", price);
    }
    calculate_end_time(startTime, hours) {
      const [hoursPart, minutesPart] = startTime.split(":").map(Number);
      const totalMinutes = hoursPart * 60 + minutesPart + Math.round(hours * 60);
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;
      return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
    }
    async cancel_booking(booking_id) {
      try {
        await frappe.call({
          method: "room_booking.api.cancel_booking",
          args: { booking_id },
          freeze: true
        });
        frappe.show_alert({ message: __("\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u062C\u0632 \u0628\u0646\u062C\u0627\u062D"), indicator: "green" });
      } catch (error) {
        frappe.msgprint({ title: __("\u062E\u0637\u0623"), message: __("\u0641\u0634\u0644 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u062C\u0632") + ": " + error.message, indicator: "red" });
      }
    }
    async clear_room(room, date) {
      try {
        await frappe.call({
          method: "room_booking.api.clear_room",
          args: { room, date },
          freeze: true
        });
        frappe.show_alert({ message: __("\u062A\u0645 \u062A\u0641\u0631\u064A\u063A \u0627\u0644\u063A\u0631\u0641\u0629 \u0628\u0646\u062C\u0627\u062D"), indicator: "green" });
      } catch (error) {
        frappe.msgprint({ title: __("\u062E\u0637\u0623"), message: __("\u0641\u0634\u0644 \u062A\u0641\u0631\u064A\u063A \u0627\u0644\u063A\u0631\u0641\u0629") + ": " + error.message, indicator: "red" });
      }
    }
    open_update_booking_dialog(bookingInfo) {
      const slotData = {
        room: bookingInfo.room,
        start: bookingInfo.start,
        end: bookingInfo.end,
        price: 0,
        booking_id: bookingInfo.booking_id,
        status: bookingInfo.status
      };
      this.show_booking_dialog(slotData, true);
    }
    update_selection_summary() {
      const $summary = this.wrapper.find(".selection-summary");
      if (!this.state.selectedSlots.length) {
        $summary.hide();
        return;
      }
      const firstSlot = this.state.selectedSlots[0];
      this.wrapper.find(".selected-period").text(
        `${this.format_time(firstSlot.start)} - ${this.format_time(firstSlot.end)}`
      );
      const duration = this.calculate_duration(firstSlot.start, firstSlot.end);
      this.wrapper.find(".selected-duration").text(`${duration} ${__("\u0633\u0627\u0639\u0629")}`);
      this.wrapper.find(".selected-price").text(this.format_currency(firstSlot.price));
      $summary.show();
    }
    clear_selection() {
      this.state.selectedSlots = [];
      this.wrapper.find(".selection-summary").hide();
      this.wrapper.find(".time-slot").removeClass("selected");
    }
    set_loading(loading) {
      this.state.isLoading = loading;
      this.wrapper.find(".loading-state").toggle(loading);
      this.wrapper.find(".filter-section, .room-list-container").toggle(!loading);
    }
    reload_rooms() {
      this.load_rooms();
    }
    show_error(message) {
      frappe.msgprint({
        title: __("\u062E\u0637\u0623"),
        message,
        indicator: "red"
      });
    }
    format_time(timeStr) {
      if (!timeStr)
        return "00:00";
      return timeStr.split(":").slice(0, 2).join(":");
    }
    calculate_duration(start, end) {
      const startTime = new Date(`2000-01-01T${start}:00`);
      const endTime = new Date(`2000-01-01T${end}:00`);
      return ((endTime - startTime) / (1e3 * 60 * 60)).toFixed(1);
    }
    format_currency(amount) {
      return parseFloat(amount || 0).toFixed(2) + " " + __("\u0631.\u0633");
    }
  };

  // ../room_booking/room_booking/public/js/posroom.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.POSOpeningHandler = class {
    constructor(appInstance) {
      this.app = appInstance;
      this.init();
    }
    init() {
      this.check_opening_entry();
    }
    check_opening_entry() {
      console.log("Checking for existing POS opening entry...");
      this.fetch_opening_entry().then((r) => {
        console.log("POS opening entry check result:", r);
        if (r.message.length) {
          this.prepare_app_defaults(r.message[0]);
        } else {
          this.create_opening_voucher();
        }
      });
    }
    fetch_opening_entry() {
      return frappe.call("erpnext.selling.page.point_of_sale.point_of_sale.check_opening_entry", {
        user: frappe.session.user
      });
    }
    async prepare_app_defaults(data) {
      const app2 = this.app;
      app2.pos_opening = data.name;
      app2.company = data.company;
      app2.pos_profile = data.pos_profile;
      app2.pos_opening_time = data.period_start_date;
      app2.item_stock_map = {};
      app2.settings = {};
      frappe.call({
        method: "erpnext.selling.page.point_of_sale.point_of_sale.get_pos_profile_data",
        args: { pos_profile: app2.pos_profile },
        callback: (res) => {
          const profile = res.message;
          Object.assign(app2.settings, profile);
          app2.settings.customer_groups = profile.customer_groups.map((group) => group.name);
        }
      });
      frappe.realtime.on(`poe_${app2.pos_opening}_closed`, (data2) => {
        const route = frappe.get_route_str();
        if (data2 && route === "roombooking") {
          frappe.dom.freeze();
          frappe.msgprint({
            title: __("POS Closed"),
            indicator: "orange",
            message: __("POS has been closed at {0}. Please refresh the page.", [
              frappe.datetime.str_to_user(data2.creation).bold()
            ]),
            primary_action_label: __("Refresh"),
            primary_action: {
              action() {
                window.location.reload();
              }
            }
          });
        }
      });
    }
    create_opening_voucher() {
      const app2 = this.app;
      const table_fields = [
        {
          fieldname: "mode_of_payment",
          fieldtype: "Link",
          in_list_view: 1,
          label: __("Mode of Payment"),
          options: "Mode of Payment",
          reqd: 1
        },
        {
          fieldname: "opening_amount",
          fieldtype: "Currency",
          in_list_view: 1,
          label: __("Opening Amount"),
          options: "company:company_currency",
          onchange: function() {
            dialog.fields_dict.balance_details.df.data.some((d) => {
              if (d.idx === this.doc.idx) {
                d.opening_amount = this.value;
                dialog.fields_dict.balance_details.grid.refresh();
                return true;
              }
            });
          }
        }
      ];
      const fetch_pos_payment_methods = () => {
        const pos_profile = dialog.fields_dict.pos_profile.get_value();
        if (!pos_profile)
          return;
        frappe.db.get_doc("POS Profile", pos_profile).then(({ payments }) => {
          dialog.fields_dict.balance_details.df.data = [];
          payments.forEach((pay) => {
            dialog.fields_dict.balance_details.df.data.push({
              mode_of_payment: pay.mode_of_payment,
              opening_amount: "0"
            });
          });
          dialog.fields_dict.balance_details.grid.refresh();
        });
      };
      const dialog = new frappe.ui.Dialog({
        title: __("Create POS Opening Entry"),
        static: true,
        fields: [
          {
            fieldtype: "Link",
            label: __("Company"),
            default: frappe.defaults.get_default("company"),
            options: "Company",
            fieldname: "company",
            reqd: 1
          },
          {
            fieldtype: "Link",
            label: __("POS Profile"),
            options: "POS Profile",
            fieldname: "pos_profile",
            reqd: 1,
            get_query: () => pos_profile_query(),
            onchange: () => fetch_pos_payment_methods()
          },
          {
            fieldname: "balance_details",
            fieldtype: "Table",
            label: __("Opening Balance Details"),
            cannot_add_rows: false,
            in_place_edit: true,
            reqd: 1,
            data: [],
            fields: table_fields
          }
        ],
        primary_action: async function({ company, pos_profile, balance_details }) {
          if (!balance_details.length) {
            frappe.show_alert({
              message: __("Please add Mode of payments and opening balance details."),
              indicator: "red"
            });
            return frappe.utils.play_sound("error");
          }
          balance_details = balance_details.filter((d) => d.mode_of_payment);
          const res = await frappe.call({
            method: "erpnext.selling.page.point_of_sale.point_of_sale.create_opening_voucher",
            args: { pos_profile, company, balance_details },
            freeze: true
          });
          if (!res.exc)
            app2.prepare_app_defaults(res.message);
          dialog.hide();
        },
        primary_action_label: __("Submit")
      });
      dialog.show();
      const pos_profile_query = () => {
        return {
          query: "erpnext.accounts.doctype.pos_profile.pos_profile.pos_profile_query",
          filters: { company: dialog.fields_dict.company.get_value() }
        };
      };
    }
    close_pos() {
      if (!this.$components_wrapper.is(":visible"))
        return;
      let voucher = frappe.model.get_new_doc("POS Closing Entry");
      voucher.pos_profile = this.frm.doc.pos_profile;
      voucher.user = frappe.session.user;
      voucher.company = this.frm.doc.company;
      voucher.pos_opening_entry = this.pos_opening;
      voucher.period_end_date = frappe.datetime.now_datetime();
      voucher.posting_date = frappe.datetime.now_date();
      voucher.posting_time = frappe.datetime.now_time();
      frappe.set_route("Form", "POS Closing Entry", voucher.name);
    }
  };

  // ../room_booking/room_booking/public/js/room_booking_app.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.Application = class {
    constructor(wrapper) {
      this._initProperties(wrapper);
      this._initPOSOpeningHandler();
    }
    _initProperties(wrapper) {
      this.wrapper = $(wrapper).find(".layout-main-section");
      this.page = wrapper.page;
      this._state = {
        selectedRoom: null,
        selectedSlot: null,
        isLoading: false,
        currentView: "booking"
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
        wrapper: this.wrapper.find(".room-selector-container")
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
      this.$fullscreen_btn.on("click", function() {
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
  frappe.pages["roombooking"].on_page_load = function(wrapper) {
    new room_booking.RoomBooking.Application(wrapper);
  };
})();
//# sourceMappingURL=room_booking.bundle.UHIA4VPF.js.map
