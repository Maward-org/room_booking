(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

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
      this.add_styles();
      this.load_branches();
      this.bind_events();
    }
    render() {
      this.wrapper.html(`
            <div class="room-booking-container">
                <div class="row filter-section">
                    <div class="col-md-4">
                        <label><i class="fa fa-building"></i> ${__("\u0627\u0644\u0641\u0631\u0639")}</label>
                        <select class="form-control branch-filter"></select>
                    </div>
                    <div class="col-md-4">
                        <label><i class="fa fa-calendar-day"></i> ${__("\u0627\u0644\u062A\u0627\u0631\u064A\u062E")}</label>
                        <input type="date" class="form-control date-filter" 
                               value="${frappe.datetime.get_today()}" 
                               min="${frappe.datetime.get_today()}">
                    </div>
                    <div class="col-md-4">
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

                <div class="selection-summary alert alert-info mt-3" style="display:none;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong><i class="fa fa-check-circle"></i> ${__("Selected")}:</strong> 
                            <span class="selected-period"></span> | 
                            <span class="selected-duration"></span> | 
                            <span class="selected-price"></span>
                        </div>
                        <button class="btn btn-primary btn-book">
                            <i class="fa fa-calendar-check"></i> ${__("Book Now")}
                        </button>
                    </div>
                </div>

                <div class="room-list-container row mt-4"></div>
            </div>
        `);
    }
    add_styles() {
      if ($("#room-booking-style").length)
        return;
      const styles = `
            <style id="room-booking-style">
                .room-booking-container {
                    font-family: 'Tajawal', 'Segoe UI', sans-serif;
                    direction: rtl;
                }
                
                .slots-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    gap: 10px;
                    margin-top: 15px;
                }
                
                .time-slot {
                    padding: 10px;
                    border-radius: 6px;
                    text-align: center;
                    cursor: pointer;
                    font-size: 13px;
                    border: 1px solid #ddd;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                
                .time-slot.available {
                    background-color: #e8f5e9;
                    border-color: #a5d6a7;
                    color: #2e7d32;
                }
                
                .time-slot.available:hover {
                    background-color: #c8e6c9;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                
                .time-slot.available.selected {
                    background-color: #4caf50;
                    color: white;
                    font-weight: bold;
                }
                
                .time-slot.booked {
                    background-color: #e3f2fd;
                    border-color: #90caf9;
                    color: #1565c0;
                }
                
                .time-slot.booked:hover {
                    background-color: #bbdefb;
                }
                
                .time-slot .slot-icon {
                    margin-left: 5px;
                }
                
                .selection-summary {
                    animation: fadeIn 0.3s ease;
                    background-color: #e3f2fd;
                    border-color: #bbdefb;
                }
            </style>
        `;
      $("head").append(styles);
    }
    bind_events() {
      this.wrapper.on("change", ".branch-filter, .date-filter, .capacity-filter", () => this.load_rooms());
      this.wrapper.on("click", ".time-slot.available", (e) => this.handle_slot_click(e));
      this.wrapper.on("click", ".time-slot.booked", (e) => this.handle_booked_slot_click(e));
      this.wrapper.on("click", ".btn-book", () => this.handle_book_click());
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
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">
                                <i class="fa fa-door-open"></i> ${room.room_name}
                            </h5>
                            <span class="badge ${room.status === "Available" ? "badge-success" : "badge-info"}">
                                ${room.status}
                            </span>
                        </div>
                        <div class="card-body">
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
      if (this.events.booked_slot_clicked) {
        this.events.booked_slot_clicked(bookingInfo);
      }
    }
    handle_book_click() {
      if (!this.state.selectedSlots.length)
        return;
      const slotData = this.state.selectedSlots[0];
      this.show_booking_dialog(slotData);
    }
    show_booking_dialog(slotData) {
      if (this.state.currentDialog) {
        this.state.currentDialog.hide();
      }
      const formatTimeForDisplay = (timeStr) => {
        if (!timeStr)
          return "00:00";
        const parts = timeStr.split(":");
        return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : "00:00";
      };
      const dialog = new frappe.ui.Dialog({
        title: __("\u062D\u062C\u0632 \u063A\u0631\u0641\u0629"),
        fields: [
          {
            label: __("\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644"),
            fieldname: "customer",
            fieldtype: "Link",
            options: "Customer",
            reqd: 1
          },
          {
            label: __("\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062D\u062C\u0632"),
            fieldname: "booking_date",
            fieldtype: "Date",
            default: this.wrapper.find(".date-filter").val(),
            read_only: 1
          },
          {
            label: __("\u0648\u0642\u062A \u0627\u0644\u062F\u062E\u0648\u0644"),
            fieldname: "start_time",
            fieldtype: "Data",
            default: formatTimeForDisplay(slotData.start),
            reqd: 1,
            description: __("\u0627\u0644\u062A\u0646\u0633\u064A\u0642: HH:mm (\u0645\u062B\u0627\u0644: 14:30)")
          },
          {
            label: __("\u0639\u062F\u062F \u0627\u0644\u0633\u0627\u0639\u0627\u062A"),
            fieldname: "hours",
            fieldtype: "Float",
            default: this.calculate_duration(slotData.start, slotData.end),
            reqd: 1
          },
          {
            label: __("\u0648\u0642\u062A \u0627\u0644\u062E\u0631\u0648\u062C"),
            fieldname: "end_time",
            fieldtype: "Data",
            default: formatTimeForDisplay(slotData.end),
            read_only: 1
          },
          {
            label: __("\u0627\u0644\u0633\u0639\u0631"),
            fieldname: "amount",
            fieldtype: "Currency",
            default: slotData.price,
            read_only: 1
          },
          {
            label: __("\u0645\u0644\u0627\u062D\u0638\u0627\u062A"),
            fieldname: "notes",
            fieldtype: "Text"
          }
        ],
        primary_action_label: __("\u062D\u062C\u0632"),
        primary_action: (values) => {
          if (!this.validateTimeFormat(values.start_time)) {
            frappe.msgprint(__("\u0635\u064A\u063A\u0629 \u0648\u0642\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629. \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 HH:mm"));
            return;
          }
          values.start_time = this.format_time_for_backend(values.start_time);
          values.end_time = this.format_time_for_backend(values.end_time);
          this.submit_booking(values, slotData);
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
        const hours = parseFloat(dialog.get_value("hours"));
        if (hours < 1 || hours > 24) {
          frappe.msgprint(__("\u0639\u062F\u062F \u0627\u0644\u0633\u0627\u0639\u0627\u062A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0628\u064A\u0646 1 \u0648 24"));
          dialog.set_value("hours", 1);
          return;
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
    async submit_booking(values, slotData) {
      try {
        this.set_loading(true);
        const bookingData = {
          rental_room: slotData.room,
          start_datetime: `${values.booking_date} ${values.start_time}`,
          end_datetime: `${values.booking_date} ${values.end_time}`,
          customer_name: values.customer,
          notes: values.notes,
          amount: values.amount
        };
        await frappe.call({
          method: "room_booking.api.create_booking",
          args: { booking: bookingData },
          freeze: true
        });
        frappe.show_alert({
          message: __("\u062A\u0645 \u0627\u0644\u062D\u062C\u0632 \u0628\u0646\u062C\u0627\u062D"),
          indicator: "green"
        });
        if (this.state.currentDialog) {
          this.state.currentDialog.hide();
        }
        this.reload_rooms();
        if (this.events.booking_created) {
          this.events.booking_created(bookingData);
        }
      } catch (error) {
        console.error("\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062D\u062C\u0632:", error);
        frappe.msgprint({
          title: __("\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062D\u062C\u0632"),
          message: __("\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u062D\u062C\u0632: ") + error.message,
          indicator: "red"
        });
      } finally {
        this.set_loading(false);
      }
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

  // ../room_booking/room_booking/public/js/room_explorer.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.RoomExplorer = class {
    constructor({ parent, onSlotSelect, onFilterChange }) {
      console.log("\u{1F680} \u0628\u062F\u0621 \u062A\u0647\u064A\u0626\u0629 \u0645\u0633\u062A\u0643\u0634\u0641 \u0627\u0644\u063A\u0631\u0641...");
      try {
        if (!parent || !parent.length) {
          throw new Error("\u0639\u0646\u0635\u0631 \u0627\u0644\u0640 parent \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0640 DOM");
        }
        this.parent = parent;
        this.onSlotSelect = onSlotSelect || function() {
          console.warn("\u26A0\uFE0F \u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u062F\u0627\u0644\u0629 onSlotSelect");
        };
        this.onFilterChange = onFilterChange || function() {
          console.warn("\u26A0\uFE0F \u0644\u0645 \u064A\u062A\u0645 \u062A\u0648\u0641\u064A\u0631 \u062F\u0627\u0644\u0629 onFilterChange");
        };
        this.heatmapData = {};
        this.currentDate = frappe.datetime.get_today();
        console.log("\u2705 \u062A\u0645 \u062A\u0647\u064A\u0626\u0629 \u0627\u0644\u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0628\u0646\u062C\u0627\u062D");
        this.init();
      } catch (error) {
        console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u0628\u0646\u0627\u0621 \u0645\u0633\u062A\u0643\u0634\u0641 \u0627\u0644\u063A\u0631\u0641:", error);
        this.showFatalError(__("\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u0627\u062F\u062D \u0623\u062B\u0646\u0627\u0621 \u062A\u0647\u064A\u0626\u0629 \u0627\u0644\u0646\u0638\u0627\u0645"));
      }
    }
    init() {
      console.log("\u{1F527} \u0628\u062F\u0621 \u062A\u0647\u064A\u0626\u0629 \u0645\u0643\u0648\u0646\u0627\u062A \u0645\u0633\u062A\u0643\u0634\u0641 \u0627\u0644\u063A\u0631\u0641...");
      try {
        this.renderSkeleton();
        console.log("\u{1F3A8} \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0647\u064A\u0643\u0644 \u0627\u0644\u0623\u0633\u0627\u0633\u064A \u0644\u0648\u0627\u062C\u0647\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645");
        this.loadRooms();
        console.log("\u{1F4E6} \u0628\u062F\u0621 \u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u063A\u0631\u0641...");
      } catch (error) {
        console.error("\u274C \u0641\u0634\u0644 \u0641\u064A \u062A\u0647\u064A\u0626\u0629 \u0627\u0644\u0645\u0633\u062A\u0643\u0634\u0641:", error);
        this.showError(__("\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0648\u0627\u062C\u0647\u0629 \u0645\u0633\u062A\u0643\u0634\u0641 \u0627\u0644\u063A\u0631\u0641"));
      }
    }
    renderSkeleton() {
      console.log("\u{1F6E0}\uFE0F \u0628\u0646\u0627\u0621 \u0627\u0644\u0647\u064A\u0643\u0644 \u0627\u0644\u0623\u0633\u0627\u0633\u064A \u0644\u0644\u0648\u0627\u062C\u0647\u0629...");
      try {
        this.parent.html(`
                <div class="room-explorer">
                    <!-- \u0641\u0644\u062A\u0631\u0627\u062A \u0627\u0644\u0628\u062D\u062B -->
                    <div class="advanced-filters card mb-4">
                        <div class="card-header">
                            <h4><i class="fa fa-filter"></i> ${__("\u0641\u0644\u0627\u062A\u0631 \u0627\u0644\u0628\u062D\u062B")}</h4>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label><i class="fa fa-building"></i> ${__("\u0627\u0644\u0641\u0631\u0639")}</label>
                                        <select class="form-control branch-filter">
                                            <option value="">${__("\u062C\u0645\u064A\u0639 \u0627\u0644\u0641\u0631\u0648\u0639")}</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label><i class="fa fa-users"></i> ${__("\u0627\u0644\u0633\u0639\u0629")}</label>
                                        <select class="form-control capacity-filter">
                                            <option value="">${__("\u062C\u0645\u064A\u0639 \u0627\u0644\u0633\u0639\u0627\u062A")}</option>
                                            <option value="5">5+ ${__("\u0623\u0634\u062E\u0627\u0635")}</option>
                                            <option value="10">10+ ${__("\u0623\u0634\u062E\u0627\u0635")}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- \u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u062D\u0645\u064A\u0644 -->
                    <div class="loading-state text-center py-5" style="display:none;">
                        <div class="spinner-border text-primary" role="status">
                            <span class="sr-only">${__("\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644...")}</span>
                        </div>
                        <p class="mt-3">${__("\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u063A\u0631\u0641...")}</p>
                    </div>

                    <!-- \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u063A\u0631\u0641 -->
                    <div class="rooms-list"></div>
                </div>
            `);
        console.log("\u{1F3AF} \u0625\u0639\u062F\u0627\u062F \u0645\u0633\u062A\u0645\u0639\u064A \u0627\u0644\u0623\u062D\u062F\u0627\u062B \u0644\u0644\u0641\u0644\u0627\u062A\u0631...");
        this.parent.find(".branch-filter, .capacity-filter").on("change", () => {
          console.log("\u{1F50E} \u062A\u063A\u064A\u064A\u0631 \u0641\u064A \u0627\u0644\u0641\u0644\u0627\u062A\u0631\u060C \u062C\u0627\u0631\u064A \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0646\u062A\u0627\u0626\u062C...");
          try {
            this.loadRooms();
          } catch (error) {
            console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0641\u0644\u0627\u062A\u0631:", error);
            this.showError(__("\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0641\u0644\u0627\u062A\u0631"));
          }
        });
      } catch (error) {
        console.error("\u274C \u0641\u0634\u0644 \u0641\u064A \u0628\u0646\u0627\u0621 \u0627\u0644\u0647\u064A\u0643\u0644 \u0627\u0644\u0623\u0633\u0627\u0633\u064A:", error);
        throw error;
      }
    }
    async loadRooms() {
      console.log("\u{1F310} \u0628\u062F\u0621 \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u063A\u0631\u0641 \u0645\u0646 \u0627\u0644\u062E\u0627\u062F\u0645...");
      try {
        this.showLoading(true);
        const filters = {
          date: this.currentDate,
          branch: this.parent.find(".branch-filter").val(),
          capacity: this.parent.find(".capacity-filter").val()
        };
        console.log("\u{1F50D} \u062A\u0635\u0641\u064A\u0629 \u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0629:", filters);
        const { message: rooms } = await frappe.call({
          method: "room_booking.api.get_available_rooms_with_slots",
          args: filters,
          freeze: true,
          callback: (response) => {
            if (response.exc) {
              console.error("\u{1F6A8} \u062E\u0637\u0623 \u0641\u064A \u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u062E\u0627\u062F\u0645:", response.exc);
              throw new Error(__("\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629 \u0645\u0646 \u0627\u0644\u062E\u0627\u062F\u0645"));
            }
          }
        });
        if (!rooms || !Array.isArray(rooms)) {
          console.warn("\u26A0\uFE0F \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u063A\u0631\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629 \u0623\u0648 \u0641\u0627\u0631\u063A\u0629");
          throw new Error(__("\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u063A\u0631\u0641 \u0645\u062A\u0627\u062D\u0629"));
        }
        console.log(`\u2705 \u062A\u0645 \u062A\u062D\u0645\u064A\u0644 ${rooms.length} \u063A\u0631\u0641\u0629 \u0628\u0646\u062C\u0627\u062D`);
        this.renderRooms(rooms);
      } catch (error) {
        console.error("\u274C \u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u063A\u0631\u0641:", error);
        this.showError(__("\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u063A\u0631\u0641: ") + error.message);
      } finally {
        this.showLoading(false);
      }
    }
    renderRooms(rooms) {
      console.log(`\u{1F3A8} \u0628\u062F\u0621 \u0639\u0631\u0636 ${rooms.length} \u063A\u0631\u0641\u0629...`);
      try {
        const container = this.parent.find(".rooms-list");
        container.empty();
        if (rooms.length === 0) {
          console.log("\u2139\uFE0F \u0644\u0627 \u062A\u0648\u062C\u062F \u063A\u0631\u0641 \u0645\u062A\u0627\u062D\u0629 \u0644\u0644\u0639\u0631\u0636");
          container.html(`
                    <div class="no-rooms-message text-center py-5">
                        <i class="fa fa-door-closed fa-4x text-muted mb-4"></i>
                        <h4 class="text-muted">${__("\u0644\u0627 \u062A\u0648\u062C\u062F \u063A\u0631\u0641 \u0645\u062A\u0627\u062D\u0629")}</h4>
                        <p class="text-muted">${__("\u062D\u0627\u0648\u0644 \u062A\u063A\u064A\u064A\u0631 \u0645\u0639\u0627\u064A\u064A\u0631 \u0627\u0644\u0628\u062D\u062B")}</p>
                        <button class="btn btn-primary btn-refresh mt-3">
                            <i class="fa fa-sync-alt"></i> ${__("\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0646\u062A\u0627\u0626\u062C")}
                        </button>
                    </div>
                `);
          container.find(".btn-refresh").on("click", () => this.loadRooms());
          return;
        }
        rooms.forEach((room, index) => {
          try {
            if (!this.validateRoomData(room)) {
              console.warn(`\u26A0\uFE0F \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u063A\u0631\u0641\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629 \u0641\u064A \u0627\u0644\u0641\u0647\u0631\u0633 ${index}:`, room);
              return;
            }
            console.log(`\u{1F6CF}\uFE0F \u0639\u0631\u0636 \u0627\u0644\u063A\u0631\u0641\u0629 ${room.name} (${room.id})`);
            const roomCard = $(`
                        <div class="room-card card mb-4" data-room-id="${room.id}">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h3 class="mb-0">
                                    <i class="fa fa-door-open"></i> ${room.name}
                                </h3>
                                <span class="badge badge-${room.status === "Available" ? "success" : "danger"}">
                                    ${this.getStatusText(room.status)}
                                </span>
                            </div>
                            
                            <div class="card-body">
                                <div class="room-meta row mb-3">
                                    <div class="col-md-4">
                                        <p><i class="fa fa-users"></i> <strong>${__("\u0627\u0644\u0633\u0639\u0629")}:</strong> ${room.capacity}</p>
                                    </div>
                                    <div class="col-md-4">
                                        <p><i class="fa fa-money-bill-wave"></i> <strong>${__("\u0627\u0644\u0633\u0639\u0631")}:</strong> ${this.formatPrice(room.price_per_hour)}</p>
                                    </div>
                                    <div class="col-md-4">
                                        <p><i class="fa fa-map-marker-alt"></i> <strong>${__("\u0627\u0644\u0641\u0631\u0639")}:</strong> ${room.branch || __("\u063A\u064A\u0631 \u0645\u062D\u062F\u062F")}</p>
                                    </div>
                                </div>
                                
                                <h5 class="mb-3"><i class="fa fa-clock"></i> ${__("\u0627\u0644\u0623\u0648\u0642\u0627\u062A \u0627\u0644\u0645\u062A\u0627\u062D\u0629")}</h5>
                                <div class="slots-grid"></div>
                            </div>
                        </div>
                    `);
            this.renderTimeSlots(roomCard.find(".slots-grid"), room.slots || []);
            container.append(roomCard);
          } catch (error) {
            console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u0639\u0631\u0636 \u0627\u0644\u063A\u0631\u0641\u0629 ${index}:`, error);
          }
        });
        this.setupSlotSelectionHandlers();
        console.log("\u{1F389} \u062A\u0645 \u0639\u0631\u0636 \u062C\u0645\u064A\u0639 \u0627\u0644\u063A\u0631\u0641 \u0628\u0646\u062C\u0627\u062D");
      } catch (error) {
        console.error("\u274C \u0641\u0634\u0644 \u0641\u064A \u0639\u0631\u0636 \u0627\u0644\u063A\u0631\u0641:", error);
        this.showError(__("\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0639\u0631\u0636 \u0627\u0644\u063A\u0631\u0641"));
      }
    }
    validateRoomData(room) {
      if (!room || typeof room !== "object") {
        console.warn("\u274C \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u063A\u0631\u0641\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629 (\u0644\u064A\u0633\u062A \u0643\u0627\u0626\u0646)");
        return false;
      }
      const requiredFields = ["id", "name", "capacity", "price_per_hour", "status"];
      const missingFields = requiredFields.filter((field) => !room[field]);
      if (missingFields.length > 0) {
        console.warn(`\u26A0\uFE0F \u062D\u0642\u0648\u0644 \u0646\u0627\u0642\u0635\u0629 \u0641\u064A \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u063A\u0631\u0641\u0629: ${missingFields.join(", ")}`);
        return false;
      }
      return true;
    }
    renderTimeSlots(container, slots) {
      console.log(`\u23F1\uFE0F \u0639\u0631\u0636 ${slots.length} \u0641\u062A\u0631\u0629 \u0632\u0645\u0646\u064A\u0629...`);
      try {
        if (!slots || !Array.isArray(slots)) {
          console.warn("\u26A0\uFE0F \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0641\u062A\u0631\u0627\u062A \u0627\u0644\u0632\u0645\u0646\u064A\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629");
          return;
        }
        if (slots.length === 0) {
          container.html(`
                    <div class="alert alert-info mb-0">
                        <i class="fa fa-info-circle"></i> ${__("\u0644\u0627 \u062A\u0648\u062C\u062F \u0641\u062A\u0631\u0627\u062A \u0645\u062A\u0627\u062D\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u063A\u0631\u0641\u0629")}
                    </div>
                `);
          return;
        }
        slots.forEach((slot, index) => {
          try {
            if (!this.validateSlotData(slot)) {
              console.warn(`\u26A0\uFE0F \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u0632\u0645\u0646\u064A\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629 \u0641\u064A \u0627\u0644\u0641\u0647\u0631\u0633 ${index}:`, slot);
              return;
            }
            const slotElement = $(`
                        <div class="time-slot ${slot.status.toLowerCase()} mb-2" 
                             data-start="${slot.start}" 
                             data-end="${slot.end}"
                             data-status="${slot.status}"
                             title="${slot.status === "Available" ? __("\u0627\u062D\u062C\u0632 \u0647\u0630\u0647 \u0627\u0644\u0641\u062A\u0631\u0629") : __("\u0647\u0630\u0647 \u0627\u0644\u0641\u062A\u0631\u0629 \u0645\u062D\u062C\u0648\u0632\u0629")}">
                            <div class="time-range">
                                <i class="fa fa-clock"></i> ${slot.start} - ${slot.end}
                            </div>
                            <div class="slot-meta">
                                <span class="badge badge-light">
                                    <i class="fa fa-hourglass"></i> ${slot.duration} ${__("\u0633\u0627\u0639\u0629")}
                                </span>
                                <span class="badge badge-primary">
                                    <i class="fa fa-money-bill-wave"></i> ${this.formatPrice(slot.price)}
                                </span>
                            </div>
                            ${slot.status === "Available" ? `
                                <button class="btn btn-sm btn-success btn-book-slot">
                                    <i class="fa fa-calendar-plus"></i> ${__("\u062D\u062C\u0632")}
                                </button>` : ""}
                        </div>
                    `);
            container.append(slotElement);
          } catch (error) {
            console.error(`\u274C \u062E\u0637\u0623 \u0641\u064A \u0639\u0631\u0636 \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u0632\u0645\u0646\u064A\u0629 ${index}:`, error);
          }
        });
      } catch (error) {
        console.error("\u274C \u0641\u0634\u0644 \u0641\u064A \u0639\u0631\u0636 \u0627\u0644\u0641\u062A\u0631\u0627\u062A \u0627\u0644\u0632\u0645\u0646\u064A\u0629:", error);
        throw error;
      }
    }
    validateSlotData(slot) {
      if (!slot || typeof slot !== "object") {
        console.warn("\u274C \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u0632\u0645\u0646\u064A\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629 (\u0644\u064A\u0633\u062A \u0643\u0627\u0626\u0646)");
        return false;
      }
      const requiredFields = ["start", "end", "status", "duration", "price"];
      const missingFields = requiredFields.filter((field) => !slot[field]);
      if (missingFields.length > 0) {
        console.warn(`\u26A0\uFE0F \u062D\u0642\u0648\u0644 \u0646\u0627\u0642\u0635\u0629 \u0641\u064A \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0641\u062A\u0631\u0629: ${missingFields.join(", ")}`);
        return false;
      }
      return true;
    }
    setupSlotSelectionHandlers() {
      console.log("\u{1F5B1}\uFE0F \u0625\u0639\u062F\u0627\u062F \u0645\u0639\u0627\u0644\u062C\u0627\u062A \u0623\u062D\u062F\u0627\u062B \u0627\u0644\u0641\u062A\u0631\u0627\u062A \u0627\u0644\u0632\u0645\u0646\u064A\u0629...");
      this.parent.find(".btn-book-slot").on("click", (e) => {
        e.stopPropagation();
        try {
          const slotElement = $(e.currentTarget).closest(".time-slot");
          const roomCard = slotElement.closest(".room-card");
          const roomId = roomCard.data("room-id");
          const roomName = roomCard.find(".card-header h3").text().trim();
          const slotData = {
            start: slotElement.data("start"),
            end: slotElement.data("end"),
            price: slotElement.find(".badge-primary").text().replace(/[^\d.]/g, ""),
            duration: slotElement.find(".badge-light").text().replace(/[^\d.]/g, "")
          };
          console.log("\u{1F3AF} \u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0641\u062A\u0631\u0629:", {
            roomId,
            roomName,
            slotData
          });
          this.onSlotSelect(roomId, slotData);
        } catch (error) {
          console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u062A\u0631\u0629:", error);
          this.showError(__("\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u0632\u0645\u0646\u064A\u0629"));
        }
      });
    }
    showLoading(show) {
      try {
        const loader = this.parent.find(".loading-state");
        if (show) {
          loader.show();
          this.parent.find(".rooms-list").hide();
        } else {
          loader.hide();
          this.parent.find(".rooms-list").show();
        }
      } catch (error) {
        console.error("\u274C \u062E\u0637\u0623 \u0641\u064A \u0639\u0631\u0636 \u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u062D\u0645\u064A\u0644:", error);
      }
    }
    showError(msg) {
      try {
        console.error("\u{1F4A5} \u0639\u0631\u0636 \u0631\u0633\u0627\u0644\u0629 \u062E\u0637\u0623:", msg);
        this.parent.find(".rooms-list").html(`
                <div class="error-state text-center py-5">
                    <i class="fa fa-exclamation-triangle fa-4x text-danger mb-4"></i>
                    <h4 class="text-danger">${__("\u062D\u062F\u062B \u062E\u0637\u0623")}</h4>
                    <p class="text-muted">${msg}</p>
                    <button class="btn btn-danger btn-retry mt-3">
                        <i class="fa fa-sync-alt"></i> ${__("\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629")}
                    </button>
                </div>
            `);
        this.parent.find(".btn-retry").on("click", () => {
          console.log("\u{1F504} \u0625\u0639\u0627\u062F\u0629 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0639\u062F \u0627\u0644\u062E\u0637\u0623...");
          this.loadRooms();
        });
      } catch (error) {
        console.error("\u274C \u0641\u0634\u0644 \u0641\u064A \u0639\u0631\u0636 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u062E\u0637\u0623:", error);
        frappe.msgprint({
          title: __("\u062E\u0637\u0623"),
          message: msg,
          indicator: "red"
        });
      }
    }
    showFatalError(msg) {
      try {
        console.error("\u{1F480} \u062E\u0637\u0623 \u0641\u0627\u062F\u062D:", msg);
        if (!this.parent || !this.parent.length) {
          console.error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0639\u0631\u0636 \u0627\u0644\u062E\u0637\u0623 - \u0639\u0646\u0635\u0631 parent \u063A\u064A\u0631 \u0645\u062A\u0627\u062D");
          document.write(`<div class="alert alert-danger">${msg}</div>`);
          return;
        }
        this.parent.html(`
            <div class="fatal-error text-center py-5">
                <i class="fa fa-skull-crossbones fa-4x text-danger mb-4"></i>
                <h3 class="text-danger">${__("\u062E\u0637\u0623 \u0641\u0627\u062F\u062D")}</h3>
                <p class="lead">${msg}</p>
                <div class="mt-4">
                    <button class="btn btn-danger btn-refresh mr-2">
                        <i class="fa fa-sync-alt"></i> ${__("\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0641\u062D\u0629")}
                    </button>
                </div>
            </div>
        `);
        this.parent.find(".btn-refresh").on("click", () => location.reload());
      } catch (error) {
        console.error("\u274C \u0641\u0634\u0644 \u0641\u064A \u0639\u0631\u0636 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u062E\u0637\u0623 \u0627\u0644\u0641\u0627\u062F\u062D:", error);
        alert(msg);
      }
    }
    getStatusText(status) {
      const statusMap = {
        "Available": __("\u0645\u062A\u0627\u062D\u0629"),
        "Booked": __("\u0645\u062D\u062C\u0648\u0632\u0629"),
        "Maintenance": __("\u0635\u064A\u0627\u0646\u0629"),
        "Reserved": __("\u0645\u062D\u062C\u0648\u0632\u0629 \u0645\u0633\u0628\u0642\u0627\u064B")
      };
      return statusMap[status] || status;
    }
    formatPrice(amount) {
      try {
        return room_booking.RoomBooking.helpers.formatCurrency(amount);
      } catch (error) {
        console.warn("\u26A0\uFE0F \u062E\u0637\u0623 \u0641\u064A \u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0633\u0639\u0631\u060C \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0623\u0635\u0644\u064A\u0629");
        return amount;
      }
    }
  };

  // ../room_booking/room_booking/public/js/booking_manager.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.BookingManager = class {
    constructor({ wrapper, events = {} }) {
      if (!wrapper || !$(wrapper).length) {
        console.error("\u0639\u0646\u0635\u0631 \u0627\u0644\u0640 wrapper \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629");
        return;
      }
      this.wrapper = $(wrapper);
      this.events = events;
      this.events.bookingUpdated && this.events.bookingUpdated();
    }
    init() {
      this.renderBaseLayout();
      this.loadInitialBookings();
      this.setupEventListeners();
    }
    renderBaseLayout() {
      this.wrapper.html(`
            <div class="booking-manager">
                <div class="manager-header">
                    <h2><i class="fa fa-calendar-alt"></i> ${__("\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A")}</h2>
                    <div class="header-actions">
                        <button class="btn btn-refresh">
                            <i class="fa fa-sync-alt"></i> ${__("\u062A\u062D\u062F\u064A\u062B")}
                        </button>
                        <button class="btn btn-add-booking">
                            <i class="fa fa-plus"></i> ${__("\u062D\u062C\u0632 \u062C\u062F\u064A\u062F")}
                        </button>
                    </div>
                </div>
                
                <div class="loading-state" style="display:none;">
                    <div class="spinner"></div>
                    <p>${__("\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644...")}</p>
                </div>
                
                <div class="bookings-list">
                    <div class="list-header">
                        <div>${__("\u0627\u0644\u063A\u0631\u0641\u0629")}</div>
                        <div>${__("\u0627\u0644\u062A\u0627\u0631\u064A\u062E")}</div>
                        <div>${__("\u0627\u0644\u0648\u0642\u062A")}</div>
                        <div>${__("\u0627\u0644\u062D\u0627\u0644\u0629")}</div>
                    </div>
                    <div class="list-items"></div>
                </div>
                
                <div class="booking-details">
                    <div class="details-header">
                        <h3>${__("\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062D\u062C\u0632")}</h3>
                    </div>
                    <div class="details-content">
                        <div class="empty-state">
                            <i class="fa fa-calendar fa-3x"></i>
                            <p>${__("\u0627\u062E\u062A\u0631 \u062D\u062C\u0632\u0627\u064B \u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644")}</p>
                        </div>
                    </div>
                    <div class="details-actions">
                        <button class="btn btn-modify">
                            <i class="fa fa-edit"></i> ${__("\u062A\u0639\u062F\u064A\u0644")}
                        </button>
                        <button class="btn btn-cancel">
                            <i class="fa fa-times"></i> ${__("\u0625\u0644\u063A\u0627\u0621")}
                        </button>
                    </div>
                </div>
            </div>
        `);
    }
    async loadInitialBookings() {
      this.showLoading(true);
      const today = frappe.datetime.get_today();
      const start_date = frappe.datetime.add_days(today, -30);
      const end_date = frappe.datetime.add_days(today, 60);
      this.state.bookings = await this.fetchBookings(start_date, end_date);
      this.renderBookingsList();
      this.showLoading(false);
    }
    async fetchBookings(from_date, to_date) {
      const response = await frappe.call({
        method: "room_booking.api.get_user_bookings",
        args: { from_date, to_date }
      });
      if (!response || !response.message) {
        console.error("\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629 \u0645\u0646 \u0627\u0644\u062E\u0627\u062F\u0645");
        return [];
      }
      return response.message.map((booking) => ({
        id: booking.name,
        room: booking.rental_room,
        room_name: booking.room_name,
        date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        customer: booking.customer_name,
        status: booking.status,
        amount: booking.total_amount
      }));
    }
    renderBookingsList() {
      const $list = this.wrapper.find(".list-items").empty();
      this.state.bookings.forEach((booking) => {
        $list.append(`
                <div class="booking-item" data-booking-id="${booking.id}">
                    <div>${booking.room_name}</div>
                    <div>${frappe.datetime.str_to_user(booking.date)}</div>
                    <div>${booking.start_time} - ${booking.end_time}</div>
                    <div class="status-badge ${booking.status.toLowerCase()}">
                        ${this.getStatusText(booking.status)}
                    </div>
                </div>
            `);
      });
    }
    showBookingDetails(bookingId) {
      const booking = this.state.bookings.find((b) => b.id === bookingId);
      if (!booking)
        return;
      this.currentBooking = booking;
      this.wrapper.find(".details-content").html(`
            <div class="booking-info">
                <h4>${booking.room_name}</h4>
                <div class="info-row">
                    <label>${__("\u0627\u0644\u062A\u0627\u0631\u064A\u062E")}:</label>
                    <span>${frappe.datetime.str_to_user(booking.date)}</span>
                </div>
                <div class="info-row">
                    <label>${__("\u0627\u0644\u0648\u0642\u062A")}:</label>
                    <span>${booking.start_time} - ${booking.end_time}</span>
                </div>
                <div class="info-row">
                    <label>${__("\u0627\u0644\u062D\u0627\u0644\u0629")}:</label>
                    <span class="status-badge ${booking.status.toLowerCase()}">
                        ${this.getStatusText(booking.status)}
                    </span>
                </div>
                <div class="info-row">
                    <label>${__("\u0627\u0644\u0645\u0628\u0644\u063A")}:</label>
                    <span>${booking.amount}</span>
                </div>
            </div>
        `);
      this.toggleActions(booking.status);
    }
    toggleActions(status) {
      const $actions = this.wrapper.find(".details-actions");
      if (status === "Confirmed") {
        $actions.show();
      } else {
        $actions.hide();
      }
    }
    async cancelCurrentBooking() {
      if (!this.currentBooking)
        return;
      const confirmed = confirm(__("\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u0625\u0644\u063A\u0627\u0621 \u0647\u0630\u0627 \u0627\u0644\u062D\u062C\u0632\u061F"));
      if (!confirmed)
        return;
      this.showLoading(true, __("\u062C\u0627\u0631\u064A \u0627\u0644\u0625\u0644\u063A\u0627\u0621..."));
      await frappe.call({
        method: "room_booking.api.cancel_booking",
        args: { booking_id: this.currentBooking.id }
      });
      this.showLoading(false);
      this.loadInitialBookings();
      this.wrapper.find(".details-content").html(`
            <div class="empty-state">
                <i class="fa fa-calendar fa-3x"></i>
                <p>${__("\u0627\u062E\u062A\u0631 \u062D\u062C\u0632\u0627\u064B \u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644")}</p>
            </div>
        `);
    }
    setupEventListeners() {
      this.wrapper.on("click", ".btn-refresh", () => this.loadInitialBookings());
      this.wrapper.on("click", ".btn-cancel", () => this.cancelCurrentBooking());
      this.wrapper.on("click", ".btn-add-booking", () => frappe.set_route("app/room-booking"));
      this.wrapper.on("click", ".booking-item", (e) => {
        const bookingId = $(e.currentTarget).data("booking-id");
        this.showBookingDetails(bookingId);
      });
    }
    showLoading(show, message = __("\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644...")) {
      const $loader = this.wrapper.find(".loading-state");
      show ? $loader.show() : $loader.hide();
      if (message)
        $loader.find("p").text(message);
    }
    getStatusText(status) {
      const statusMap = {
        "Confirmed": __("\u0645\u0624\u0643\u062F"),
        "Cancelled": __("\u0645\u0644\u063A\u0649"),
        "Completed": __("\u0645\u0643\u062A\u0645\u0644")
      };
      return statusMap[status] || status;
    }
  };

  // ../room_booking/room_booking/public/js/booking_cart.js
  frappe.provide("room_booking.RoomBooking");
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
                    <h4><i class="fa fa-shopping-cart"></i> ${__("Booking Cart")}</h4>
                </div>
                
                <div class="cart-items-container">
                    <div class="empty-cart-message">
                        <i class="fa fa-clock"></i>
                        <p>${__("No bookings selected yet")}</p>
                    </div>
                </div>
                
                <div class="cart-summary">
                    <div class="summary-row">
                        <span>${__("Total Duration")}:</span>
                        <strong class="total-duration">0 ${__("hours")}</strong>
                    </div>
                    <div class="summary-row">
                        <span>${__("Total Price")}:</span>
                        <strong class="total-price">${room_booking.RoomBooking.helpers.formatCurrency(0)}</strong>
                    </div>
                    
                    <div class="customer-selection mt-3">
                        <label>${__("Customer")}</label>
                        <div class="input-group">
                            <select class="form-control customer-select" 
                                    data-placeholder="${__("Select customer")}">
                                <option value="">${__("Select customer")}</option>
                            </select>
                            <div class="input-group-append">
                                <button class="btn btn-outline-secondary refresh-customers" 
                                        title="${__("Refresh customers list")}">
                                    <i class="fa fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary btn-checkout mt-3" disabled>
                        <i class="fa fa-calendar-check"></i> ${__("Confirm Booking")}
                    </button>
                </div>
            </div>
        `);
      this.$cartItems = this.wrapper.find(".cart-items-container");
      this.$emptyMessage = this.wrapper.find(".empty-cart-message");
      this.$customerSelect = this.wrapper.find(".customer-select");
      this.$checkoutBtn = this.wrapper.find(".btn-checkout");
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
      this.$checkoutBtn.on("click", () => this.handle_checkout());
      this.$customerSelect.on("change", () => this.handle_customer_change());
      this.wrapper.on("click", ".remove-item", (e) => this.remove_booking($(e.target).data("id")));
      this.wrapper.on("click", ".refresh-customers", () => this.load_customers());
    }
    async load_customers() {
      try {
        this.$customerSelect.prop("disabled", true);
        const { message: customers } = await frappe.call("room_booking.api.get_customers");
        this.$customerSelect.empty().append('<option value="">Select customer</option>');
        customers.forEach((c) => {
          this.$customerSelect.append(`<option value="${c.name}">${c.customer_name}</option>`);
        });
        if (this.state.customer) {
          this.$customerSelect.val(this.state.customer);
        }
      } catch (error) {
        console.error("Failed to load customers:", error);
        frappe.msgprint(__("Failed to load customers list"));
      } finally {
        this.$customerSelect.prop("disabled", false);
      }
    }
    handle_customer_change() {
      this.state.customer = this.$customerSelect.val();
      this.update_checkout_button();
    }
    update_checkout_button() {
      const canCheckout = this.state.bookings.length > 0 && this.state.customer;
      this.$checkoutBtn.prop("disabled", !canCheckout);
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
      const exists = this.state.bookings.some(
        (b) => b.start === slot.start && b.end === slot.end
      );
      if (!exists) {
        this.state.bookings.push(__spreadProps(__spreadValues({}, slot), {
          room_name: room.room_name,
          id: Date.now().toString()
        }));
        this.render_bookings();
      }
      this.update_checkout_button();
    }
    remove_booking(bookingId) {
      this.state.bookings = this.state.bookings.filter((b) => b.id !== bookingId);
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
      this.state.bookings.forEach((booking) => {
        const duration = room_booking.RoomBooking.helpers.calculateDuration(booking.start, booking.end);
        totalDuration += duration;
        totalPrice += parseFloat(booking.price || 0);
        const $item = $(`
                <div class="cart-item" data-id="${booking.id}">
                    <div class="cart-item-header">
                        <span class="cart-item-title">${booking.room_name}</span>
                        <span class="cart-item-duration">${duration} ${__("hours")}</span>
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
                                title="${__("Remove")}">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </div>
            `);
        this.$cartItems.append($item);
      });
      this.wrapper.find(".total-duration").text(`${totalDuration.toFixed(2)} ${__("hours")}`);
      this.wrapper.find(".total-price").text(room_booking.RoomBooking.helpers.formatCurrency(totalPrice));
    }
    clear() {
      this.state.bookings = [];
      this.state.customer = null;
      this.state.selectedRoom = null;
      this.$customerSelect.val("");
      this.render_bookings();
      this.update_checkout_button();
    }
  };

  // ../room_booking/room_booking/public/js/booking_dialog.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.BookingDialog = class {
    constructor({ events = {}, settings = {} }) {
      this.events = events;
      this.settings = settings;
      this.dialog = null;
      this.currentBooking = null;
    }
    show(room, slot, onSuccess, booking = null) {
      this.currentBooking = booking;
      const isEditMode = !!booking;
      const duration = room_booking.RoomBooking.helpers.calculateDuration(slot.start, slot.end);
      const pricePerHour = room.price_per_hour || 0;
      const defaultDate = booking ? booking.start_datetime.split(" ")[0] : frappe.datetime.get_today();
      this.dialog = new frappe.ui.Dialog({
        title: isEditMode ? __("Edit Booking") : __("New Booking"),
        size: "large",
        fields: [
          {
            label: __("Room"),
            fieldname: "room",
            fieldtype: "Data",
            read_only: true,
            default: room.room_name,
            description: __("Selected room")
          },
          {
            label: __("Customer"),
            fieldname: "customer",
            fieldtype: "Link",
            options: "Customer",
            reqd: 1,
            default: booking ? booking.customer_name : null,
            get_query: () => ({ filters: { "disabled": 0 } })
          },
          {
            label: __("Date"),
            fieldname: "date",
            fieldtype: "Date",
            reqd: true,
            default: defaultDate,
            min_date: frappe.datetime.get_today(),
            change: () => this.validate_booking()
          },
          {
            label: __("Start Time"),
            fieldname: "start_time",
            fieldtype: "Time",
            default: room_booking.RoomBooking.helpers.formatTimeForFrontend(slot.start),
            reqd: 1,
            change: () => {
              this.validate_time_input("start_time");
              this.update_end_time();
              this.validate_booking();
            }
          },
          {
            label: __("Duration (hours)"),
            fieldname: "duration",
            fieldtype: "Float",
            default: duration,
            reqd: 1,
            min: 0.5,
            max: 24,
            change: () => {
              this.update_end_time();
              this.validate_booking();
            }
          },
          {
            label: __("End Time"),
            fieldname: "end_time",
            fieldtype: "Time",
            read_only: true,
            reqd: 1
          },
          {
            label: __("Price per Hour"),
            fieldname: "price_per_hour",
            fieldtype: "Currency",
            read_only: true,
            default: pricePerHour
          },
          {
            label: __("Total Price"),
            fieldname: "amount",
            fieldtype: "Currency",
            read_only: true,
            default: slot.price
          },
          {
            label: __("Notes"),
            fieldname: "notes",
            fieldtype: "Text Area",
            rows: 3,
            default: booking ? booking.notes : ""
          },
          {
            fieldname: "validation_section",
            fieldtype: "Section Break",
            label: __("Validation"),
            collapsible: 1,
            collapsed: 1,
            depends_on: "eval:!doc.__islocal"
          },
          {
            label: __("Availability Check"),
            fieldname: "availability_status",
            fieldtype: "HTML",
            read_only: true
          }
        ],
        primary_action_label: isEditMode ? __("Update Booking") : __("Confirm Booking"),
        primary_action: (values) => this.submit_booking(room, values, onSuccess, isEditMode),
        secondary_action_label: __("Cancel")
      });
      this.setup_event_listeners();
      this.update_end_time();
      this.validate_booking();
      this.dialog.show();
    }
    setup_event_listeners() {
      this.dialog.fields_dict.start_time.$input.on("input", () => {
        this.validate_time_input("start_time");
      });
    }
    validate_time_input(fieldname) {
      const value = this.dialog.get_value(fieldname);
      const $input = this.dialog.fields_dict[fieldname].$input;
      if (!room_booking.RoomBooking.helpers.validateTimeFormat(value)) {
        $input.addClass("invalid-input");
        return false;
      }
      $input.removeClass("invalid-input");
      return true;
    }
    update_end_time() {
      const duration = parseFloat(this.dialog.get_value("duration")) || 1;
      const startTime = this.dialog.get_value("start_time");
      if (!this.validate_time_input("start_time"))
        return;
      const endTime = room_booking.RoomBooking.helpers.calculateEndTime(startTime, duration);
      this.dialog.set_value("end_time", endTime);
      this.update_calculations();
    }
    update_calculations() {
      const duration = parseFloat(this.dialog.get_value("duration")) || 0;
      const pricePerHour = parseFloat(this.dialog.get_value("price_per_hour")) || 0;
      const totalPrice = pricePerHour * duration;
      this.dialog.set_value("amount", totalPrice);
    }
    async validate_booking() {
      var _a, _b;
      const values = this.dialog.get_values();
      if (!values || !values.date || !values.start_time || !values.end_time)
        return;
      try {
        const isAvailable = await frappe.call({
          method: "room_booking.api.check_slot_availability",
          args: {
            room: ((_a = this.currentBooking) == null ? void 0 : _a.rental_room) || "",
            date: values.date,
            start_time: room_booking.RoomBooking.helpers.formatTimeForBackend(values.start_time),
            end_time: room_booking.RoomBooking.helpers.formatTimeForBackend(values.end_time),
            exclude_booking: (_b = this.currentBooking) == null ? void 0 : _b.name
          }
        });
        const statusField = this.dialog.fields_dict.availability_status;
        if (isAvailable.message) {
          statusField.$wrapper.html(`
                    <div class="alert alert-success">
                        <i class="fa fa-check-circle"></i>
                        ${__("This time slot is available for booking")}
                    </div>
                `);
        } else {
          statusField.$wrapper.html(`
                    <div class="alert alert-danger">
                        <i class="fa fa-exclamation-circle"></i>
                        ${__("This time slot is not available")}
                    </div>
                `);
        }
      } catch (error) {
        console.error("Validation error:", error);
      }
    }
    async submit_booking(room, values, onSuccess, isEditMode = false) {
      if (!this.validate_time_input("start_time")) {
        frappe.msgprint(__("Please enter a valid start time in HH:mm format"));
        return;
      }
      if (!values.customer) {
        frappe.msgprint(__("Please select a customer"));
        return;
      }
      try {
        const bookingData = {
          rental_room: room.name,
          start_datetime: `${values.date} ${room_booking.RoomBooking.helpers.formatTimeForBackend(values.start_time)}`,
          end_datetime: `${values.date} ${room_booking.RoomBooking.helpers.formatTimeForBackend(values.end_time)}`,
          customer_name: values.customer,
          notes: values.notes || "",
          amount: values.amount
        };
        if (isEditMode && this.currentBooking) {
          bookingData.name = this.currentBooking.name;
          await frappe.call({
            method: "room_booking.api.update_booking",
            args: { booking: bookingData },
            freeze: true
          });
        } else {
          await frappe.call({
            method: "room_booking.api.create_booking",
            args: { bookings: [bookingData] },
            freeze: true
          });
        }
        frappe.show_alert({
          message: isEditMode ? __("Booking updated successfully") : __("Booking created successfully"),
          indicator: "green"
        });
        this.dialog.hide();
        if (onSuccess)
          onSuccess();
      } catch (error) {
        console.error("Booking error:", error);
        frappe.msgprint({
          title: __("Booking Failed"),
          message: __("An error occurred while processing your booking. Please try again."),
          indicator: "red"
        });
      }
    }
  };

  // ../room_booking/room_booking/public/js/helpers.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.helpers = {
    calculateEndTime: function(startTime, durationHours) {
      try {
        if (!startTime || isNaN(durationHours))
          return "00:00";
        const [hours = 0, minutes = 0] = String(startTime).split(":").map(Number);
        const totalMinutes = hours * 60 + minutes + Math.round(durationHours * 60);
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
      } catch (error) {
        console.error("Error calculating end time:", error);
        return "00:00";
      }
    },
    formatTimeForFrontend: function(timeStr) {
      if (!timeStr)
        return "00:00";
      try {
        return String(timeStr).split(":").slice(0, 2).map((part) => part.padStart(2, "0")).join(":");
      } catch (error) {
        console.error("Error formatting time:", error);
        return "00:00";
      }
    },
    formatTimeForBackend: function(timeStr) {
      return `${this.formatTimeForFrontend(timeStr)}:00`;
    },
    validateTimeFormat: function(timeStr) {
      return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr);
    },
    formatCurrency: function(amount, currency = "SAR", locale = "ar-SA") {
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(amount || 0);
      } catch (error) {
        console.error("Error formatting currency:", error);
        return `${(amount || 0).toFixed(2)} ${currency}`;
      }
    },
    calculateDuration: function(start, end) {
      try {
        const startDate = new Date(`2000-01-01T${start}:00`);
        const endDate = new Date(`2000-01-01T${end}:00`);
        const diffMs = endDate - startDate;
        if (diffMs <= 0)
          return "00:00";
        const totalMinutes = Math.floor(diffMs / (1e3 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      } catch (error) {
        console.error("Error calculating duration:", error);
        return "00:00";
      }
    },
    durationToMinutes: function(duration) {
      try {
        const [hours = 0, minutes = 0] = String(duration).split(":").map(Number);
        return hours * 60 + minutes;
      } catch (error) {
        console.error("Error converting duration:", error);
        return 0;
      }
    },
    loadLibrary: function(url, type = "script") {
      return new Promise((resolve, reject) => {
        try {
          let element;
          if (type === "script") {
            element = document.createElement("script");
            element.src = url;
            element.onload = resolve;
            element.onerror = reject;
          } else if (type === "css") {
            element = document.createElement("link");
            element.rel = "stylesheet";
            element.href = url;
            element.onload = resolve;
            element.onerror = reject;
          }
          if (element) {
            document.head.appendChild(element);
          } else {
            reject(new Error("\u0646\u0648\u0639 \u0627\u0644\u0645\u0643\u062A\u0628\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"));
          }
        } catch (error) {
          reject(error);
        }
      });
    },
    session: function(key, value, expiry = 3600) {
      try {
        if (value === void 0) {
          const item = localStorage.getItem(key);
          if (!item)
            return null;
          const { value: storedValue, expiry: storedExpiry } = JSON.parse(item);
          if (storedExpiry && Date.now() > storedExpiry) {
            localStorage.removeItem(key);
            return null;
          }
          return storedValue;
        } else {
          const item = {
            value,
            expiry: expiry ? Date.now() + expiry * 1e3 : null
          };
          localStorage.setItem(key, JSON.stringify(item));
          return value;
        }
      } catch (error) {
        console.error("Error managing session:", error);
        return null;
      }
    },
    handleError: function(error, customMessage) {
      console.error("System Error:", error);
      const userMessage = customMessage || __("\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B.");
      frappe.msgprint({
        title: __("\u062E\u0637\u0623"),
        message: userMessage,
        indicator: "red"
      });
    },
    generateId: function(prefix = "") {
      return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    loadIcons: function(icons) {
      try {
        if (!Array.isArray(icons) || !icons.length)
          return;
        const iconLoader = document.createElement("div");
        iconLoader.style.display = "none";
        iconLoader.innerHTML = icons.map(
          (icon) => `<i class="fa ${icon}"></i>`
        ).join("");
        document.body.appendChild(iconLoader);
      } catch (error) {
        console.error("Error loading icons:", error);
      }
    },
    formatDate: function(dateStr) {
      try {
        return frappe.datetime.str_to_user(dateStr);
      } catch (error) {
        console.error("Error formatting date:", error);
        return dateStr || "";
      }
    },
    isSlotAvailable: function(startTime, endTime, bookedSlots = []) {
      try {
        const newStart = new Date(`2000-01-01T${startTime}:00`);
        const newEnd = new Date(`2000-01-01T${endTime}:00`);
        if (newStart >= newEnd)
          return false;
        return !bookedSlots.some((slot) => {
          const slotStart = new Date(`2000-01-01T${slot.start}:00`);
          const slotEnd = new Date(`2000-01-01T${slot.end}:00`);
          return newStart < slotEnd && newEnd > slotStart;
        });
      } catch (error) {
        console.error("Error checking slot availability:", error);
        return false;
      }
    }
  };
  room_booking.RoomBooking.helpers.loadIcons([
    "fa-door-open",
    "fa-calendar",
    "fa-clock",
    "fa-user",
    "fa-money-bill-wave",
    "fa-check-circle",
    "fa-times-circle",
    "fa-sync-alt",
    "fa-plus",
    "fa-edit",
    "fa-eye"
  ]);

  // ../room_booking/room_booking/public/js/room_booking_app.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.Application = class {
    constructor(wrapper) {
      this._initProperties(wrapper);
      this._setupDOM();
      this._setupEventDelegation();
      this._initializeComponents();
      this._applyStyles();
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
    }
    _setupDOM() {
      this.wrapper.html(`
            <div class="room-booking-app">
                <!-- \u0634\u0631\u064A\u0637 \u0627\u0644\u062A\u062D\u0643\u0645 -->
                <div class="app-controls">
                    ${this._renderControlBar()}
                </div>
                
                <!-- \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0631\u0626\u064A\u0633\u064A -->
                <div class="app-content">
                    ${this._renderMainContent()}
                </div>
                
                <!-- \u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u062D\u0645\u064A\u0644 -->
                ${this._renderLoadingState()}
            </div>
        `);
    }
    _renderControlBar() {
      return `
            <div class="view-switcher">
                <button class="btn btn-booking-view active" data-action="switch-view" data-view="booking">
                    <i class="fa fa-calendar-plus"></i> ${__("\u062D\u062C\u0632 \u062C\u062F\u064A\u062F")}
                </button>
                <button class="btn btn-management-view" data-action="switch-view" data-view="management">
                    <i class="fa fa-list"></i> ${__("\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A")}
                </button>
            </div>
            <div class="app-actions">
                <button class="btn btn-refresh" data-action="refresh">
                    <i class="fa fa-sync-alt"></i>
                </button>
                <button class="btn btn-fullscreen" data-action="fullscreen">
                    <i class="fa fa-expand"></i>
                </button>
            </div>
        `;
    }
    _renderMainContent() {
      return `
            <div class="booking-view">
                <div class="row">
                    <div class="col-md-8 room-selector-container"></div>
                    <div class="col-md-4 booking-summary-container"></div>
                </div>
            </div>
            <div class="management-view" style="display:none;">
                <div class="booking-manager-container"></div>
            </div>
        `;
    }
    _renderLoadingState() {
      return `
            <div class="app-loading-state">
                <div class="spinner"></div>
                <p>${__("\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644...")}</p>
            </div>
        `;
    }
    _setupEventDelegation() {
      this.wrapper.on("click", "[data-action]", (e) => {
        const action = $(e.currentTarget).data("action");
        this._handleAction(action, $(e.currentTarget).data());
      });
    }
    _handleAction(action, data) {
      const actions = {
        "switch-view": () => this._switchView(data.view),
        "refresh": () => this._refreshData(),
        "fullscreen": () => this._toggleFullscreen()
      };
      if (actions[action]) {
        actions[action]();
      }
    }
    _initializeComponents() {
      this._initRoomSelector();
      this._initBookingSummary();
      this._initBookingDialog();
      this._initBookingManager();
    }
    _initRoomSelector() {
      this._components.roomSelector = new room_booking.RoomBooking.RoomSelector({
        wrapper: this.wrapper.find(".room-selector-container"),
        events: {
          slotSelected: (args) => this._handleSlotSelected(args),
          bookedSlotClicked: (args) => this._handleBookedSlotClick(args)
        }
      });
    }
    _switchView(view) {
      if (this._state.currentView === view)
        return;
      this._state.currentView = view;
      const viewActions = {
        "booking": () => {
          this.wrapper.find(".booking-view").show();
          this.wrapper.find(".management-view").hide();
          this._updateActiveViewButtons("booking");
        },
        "management": () => {
          this.wrapper.find(".booking-view").hide();
          this.wrapper.find(".management-view").show();
          this._updateActiveViewButtons("management");
          this._refreshBookings();
        }
      };
      viewActions[view]();
    }
    _updateActiveViewButtons(activeView) {
      this.wrapper.find(".btn-booking-view").toggleClass("active", activeView === "booking");
      this.wrapper.find(".btn-management-view").toggleClass("active", activeView === "management");
    }
    _applyStyles() {
      const styles = `
            .room-booking-app {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 20px;
            }
            
            .app-controls {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                background: #f8f9fa;
                padding: 10px 15px;
                border-radius: 5px;
                align-items: center;
            }
            
            .view-switcher .btn {
                margin-right: 5px;
                transition: all 0.3s ease;
            }
            
            .btn.active {
                background-color: var(--primary-color, #4CAF50);
                color: white;
            }
            
            .app-loading-state {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255,255,255,0.9);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                backdrop-filter: blur(2px);
            }
            
            .app-loading-state .spinner {
                border: 5px solid #f3f3f3;
                border-top: 5px solid var(--primary-color, #3498db);
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
      $("<style>").text(styles).appendTo("head");
    }
  };
  frappe.pages["roombooking"].on_page_load = function(wrapper) {
    new room_booking.RoomBooking.Application(wrapper);
  };
})();
//# sourceMappingURL=room_booking.bundle.YKQDAOUK.js.map
