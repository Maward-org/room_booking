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
        selectedSlots: []
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
                        <label>${__("Branch")}</label>
                        <select class="form-control branch-filter"></select>
                    </div>
                    <div class="col-md-4">
                        <label>${__("Date")}</label>
                        <input type="date" class="form-control date-filter" 
                               value="${frappe.datetime.get_today()}" 
                               min="${frappe.datetime.get_today()}">
                    </div>
                    <div class="col-md-4">
                        <label>${__("Capacity")}</label>
                        <select class="form-control capacity-filter">
                            <option value="">${__("Any")}</option>
                            <option value="5">5+</option>
                            <option value="10">10+</option>
                            <option value="20">20+</option>
                        </select>
                    </div>
                </div>

                <div class="loading-state text-center" style="display:none;">
                    <div class="spinner-border"></div>
                    <p>${__("Loading rooms...")}</p>
                </div>

                <div class="selection-summary alert alert-info mt-3" style="display:none;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${__("Selected")}:</strong> 
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

                <div class="help-section mt-4">
                    <div class="card">
                        <div class="card-header"><h5>${__("How to Book")}</h5></div>
                        <div class="card-body">
                            <ol>
                                <li>${__("Select branch, date and capacity")}</li>
                                <li>${__("Click on available time slots")}</li>
                                <li>${__("Review your selection in the summary")}</li>
                                <li>${__('Click "Book Now" to confirm')}</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }
    add_styles() {
      if ($("#room-booking-style").length)
        return;
      const styles = `
            <style id="room-booking-style">
                .room-booking-container {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
                
                .time-slot::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: rgba(0,0,0,0.1);
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
                
                .time-slot .duration-badge {
                    display: inline-block;
                    background: rgba(0,0,0,0.1);
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 11px;
                    margin-top: 5px;
                }
                
                .selection-summary {
                    animation: fadeIn 0.3s ease;
                    background-color: #e3f2fd;
                    border-color: #bbdefb;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .badge-available {
                    background-color: #4caf50;
                }
                
                .badge-booked {
                    background-color: #2196f3;
                }
            </style>
        `;
      $("head").append(styles);
    }
    bind_events() {
      this.wrapper.on("change", ".branch-filter, .date-filter, .capacity-filter", () => this.load_rooms());
      this.wrapper.on("click", ".time-slot.available", (e) => this.handle_available_slot_click(e));
      this.wrapper.on("click", ".time-slot.booked", (e) => this.handle_booked_slot_click(e));
      this.wrapper.on("click", ".btn-book", () => this.handle_book_click());
    }
    async load_branches() {
      try {
        const { message: branches = [] } = await frappe.call("room_booking.api.get_branches");
        const $select = this.wrapper.find(".branch-filter").empty();
        $select.append(`<option value="">${__("All Branches")}</option>`);
        branches.forEach((b) => $select.append(`<option value="${b}">${b}</option>`));
        this.load_rooms();
      } catch (error) {
        console.error("Failed to load branches:", error);
        this.show_error(__("Failed to load branches. Please try again."));
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
        console.error("Failed to load rooms:", error);
        this.show_error(__("Failed to load rooms. Please try again."));
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
                        ${__("No rooms available for selected criteria. Please try different filters.")}
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
                            <h5 class="mb-0">${room.room_name}</h5>
                            <span class="badge ${room.status === "Available" ? "badge-available" : "badge-booked"}">
                                ${room.status}
                            </span>
                        </div>
                        <div class="card-body">
                            <p><i class="fa fa-users text-muted"></i> ${room.no_of_seats} ${__("seats")}</p>
                            <p><i class="fa fa-money-bill-wave text-muted"></i> 
                                ${room_booking.RoomBooking.helpers.formatCurrency(room.price_per_hour)}/${__("hour")}
                            </p>
                            <hr>
                            <h6>${__("Available Time Slots")}</h6>
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
                        ${__("No slots available for this room")}
                    </div>
                </div>
            `);
        return;
      }
      slots.forEach((slot) => {
        const isBooked = (slot.status || "").toLowerCase() === "booked";
        const isAvailable = !isBooked;
        const duration = room_booking.RoomBooking.helpers.calculateDuration(slot.start_time, slot.end_time);
        $container.append(`
                <div class="time-slot ${isBooked ? "booked" : "available"}" 
                     data-room="${roomName}"
                     data-start="${slot.start_time}"
                     data-end="${slot.end_time}"
                     data-status="${slot.status}"
                     data-price="${slot.price}"
                     data-booking-id="${slot.booking_id || ""}"
                     data-duration="${duration}">
                    <div class="time-range">
                        ${room_booking.RoomBooking.helpers.formatTimeForFrontend(slot.start_time)} - 
                        ${room_booking.RoomBooking.helpers.formatTimeForFrontend(slot.end_time)}
                    </div>
                    <div class="duration-badge">
                        ${duration} ${__("hours")}
                    </div>
                    <div class="price">
                        ${room_booking.RoomBooking.helpers.formatCurrency(slot.price)}
                    </div>
                </div>
            `);
      });
    }
    handle_available_slot_click(e) {
      const $slot = $(e.currentTarget);
      const room = $slot.data("room");
      const slot = {
        room,
        start: $slot.data("start"),
        end: $slot.data("end"),
        price: $slot.data("price"),
        duration: $slot.data("duration"),
        status: $slot.data("status")
      };
      this.state.selectedSlots = [slot];
      this.update_selection_summary();
      if (this.events.slot_selected) {
        this.events.slot_selected({ room, slot });
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
      if (this.state.selectedSlots.length && this.events.book_now_clicked) {
        this.events.book_now_clicked(this.state.selectedSlots);
      }
    }
    update_selection_summary() {
      const $summary = this.wrapper.find(".selection-summary");
      if (!this.state.selectedSlots.length) {
        $summary.hide();
        return;
      }
      const slot = this.state.selectedSlots[0];
      const duration = slot.duration;
      const price = slot.price;
      this.wrapper.find(".selected-period").text(
        `${room_booking.RoomBooking.helpers.formatTimeForFrontend(slot.start)} - 
             ${room_booking.RoomBooking.helpers.formatTimeForFrontend(slot.end)}`
      );
      this.wrapper.find(".selected-duration").text(`${duration} ${__("hours")}`);
      this.wrapper.find(".selected-price").text(room_booking.RoomBooking.helpers.formatCurrency(price));
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
      this.wrapper.find(".filter-section, .room-list-container, .help-section").toggle(!loading);
    }
    reload_rooms() {
      this.load_rooms();
    }
    show_error(message) {
      frappe.msgprint({
        title: __("Error"),
        message,
        indicator: "red"
      });
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

  // ../room_booking/room_booking/public/js/payment_processor.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.PaymentProcessor = class {
    constructor({ onSuccess, onCancel }) {
      this.onSuccess = onSuccess;
      this.onCancel = onCancel;
      this.paymentMethods = [];
      this.initPaymentMethods();
    }
    initPaymentMethods() {
      this.paymentMethods = [
        {
          id: "cash",
          name: __("\u0646\u0642\u062F\u064A"),
          icon: "fa-money-bill-wave",
          handler: () => this.processCashPayment()
        },
        {
          id: "credit_card",
          name: __("\u0628\u0637\u0627\u0642\u0629 \u0627\u0626\u062A\u0645\u0627\u0646"),
          icon: "fa-credit-card",
          handler: () => this.processCardPayment()
        },
        {
          id: "qr_payment",
          name: __("\u062F\u0641\u0639 \u0628\u0627\u0644QR"),
          icon: "fa-qrcode",
          handler: () => this.processQRPayment()
        }
      ];
    }
    startPayment({ items, customer, total }) {
      this.currentPayment = { items, customer, total };
      this.showPaymentDialog();
    }
    showPaymentDialog() {
      this.dialog = new frappe.ui.Dialog({
        title: __("\u0625\u062A\u0645\u0627\u0645 \u0627\u0644\u062F\u0641\u0639"),
        size: "extra-large",
        fields: [
          {
            fieldname: "payment_method",
            label: __("\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639"),
            fieldtype: "Select",
            options: this.paymentMethods.map((m) => m.name).join("\n"),
            default: this.paymentMethods[0].name,
            reqd: 1
          },
          {
            fieldname: "qr_container",
            label: __("\u0645\u0633\u062D QR Code"),
            fieldtype: "HTML",
            depends_on: "eval:doc.payment_method == '\u062F\u0641\u0639 \u0628\u0627\u0644QR'",
            html: `<div class="qr-payment-container">
                              <div class="qr-code"></div>
                              <p>${__("\u0627\u0633\u062A\u062E\u062F\u0645 \u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0628\u0646\u0643 \u0644\u0645\u0633\u062D \u0627\u0644\u0643\u0648\u062F")}</p>
                           </div>`
          },
          {
            fieldname: "split_payment",
            label: __("\u062A\u0642\u0633\u064A\u0645 \u0627\u0644\u062F\u0641\u0639"),
            fieldtype: "Check",
            description: __("\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0623\u0643\u062B\u0631 \u0645\u0646 \u0637\u0631\u064A\u0642\u0629 \u062F\u0641\u0639")
          },
          {
            fieldname: "split_methods",
            label: __("\u0637\u0631\u0642 \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0625\u0636\u0627\u0641\u064A\u0629"),
            fieldtype: "Table",
            depends_on: "eval:doc.split_payment",
            fields: [
              {
                fieldname: "method",
                label: __("\u0627\u0644\u0637\u0631\u064A\u0642\u0629"),
                fieldtype: "Select",
                options: this.paymentMethods.map((m) => m.name).join("\n")
              },
              {
                fieldname: "amount",
                label: __("\u0627\u0644\u0645\u0628\u0644\u063A"),
                fieldtype: "Currency"
              }
            ]
          }
        ],
        primary_action: (values) => this.processPayment(values),
        primary_action_label: __("\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062F\u0641\u0639")
      });
      this.dialog.show();
      this.generateQRCodeIfNeeded();
    }
    async processPayment(values) {
      try {
        const paymentResult = await this.validatePayment(values);
        if (paymentResult.success) {
          this.onSuccess({
            amount: this.currentPayment.total,
            method: values.payment_method,
            reference: paymentResult.reference,
            timestamp: frappe.datetime.now_datetime()
          });
        } else {
          frappe.msgprint(__("\u0641\u0634\u0644 \u0641\u064A \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u062F\u0641\u0639"));
        }
      } catch (error) {
        console.error("Payment error:", error);
        frappe.msgprint(__("\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629"));
      } finally {
        this.dialog.hide();
      }
    }
  };

  // ../room_booking/room_booking/public/js/theme_manager.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.ThemeManager = class {
    constructor({ themes, defaultTheme }) {
      this.themes = themes;
      this.currentTheme = defaultTheme;
      this.init();
    }
    init() {
      this.loadSavedTheme();
      this.applyTheme(this.currentTheme);
      this.initThemeSwitcher();
    }
    loadSavedTheme() {
      const savedTheme = localStorage.getItem("roomBookingTheme");
      if (savedTheme && this.themes.includes(savedTheme)) {
        this.currentTheme = savedTheme;
      }
    }
    applyTheme(theme) {
      $("body").removeClass(this.themes.map((t) => `theme-${t}`).join(" "));
      $("body").addClass(`theme-${theme}`);
      localStorage.setItem("roomBookingTheme", theme);
    }
    initThemeSwitcher() {
      this.switcher = $(`
            <div class="theme-switcher">
                <div class="theme-options">
                    ${this.themes.map((theme) => `
                        <div class="theme-option ${theme === this.currentTheme ? "active" : ""}" 
                             data-theme="${theme}">
                            <div class="theme-preview ${theme}"></div>
                            <span>${this.getThemeName(theme)}</span>
                        </div>
                    `).join("")}
                </div>
                <button class="btn btn-toggle-theme">
                    <i class="fa fa-moon"></i>
                </button>
            </div>
        `);
      $("body").append(this.switcher);
      this.bindEvents();
    }
    getThemeName(theme) {
      const names = {
        "light": __("\u0641\u0627\u062A\u062D"),
        "dark": __("\u062F\u0627\u0643\u0646"),
        "corporate": __("\u0634\u0631\u0643\u0627\u062A")
      };
      return names[theme] || theme;
    }
    bindEvents() {
      this.switcher.on("click", ".theme-option", (e) => {
        const theme = $(e.currentTarget).data("theme");
        this.switchTheme(theme);
      });
      this.switcher.on("click", ".btn-toggle-theme", () => {
        this.toggleDarkMode();
      });
    }
    toggleDarkMode() {
      const newTheme = this.currentTheme === "dark" ? "light" : "dark";
      this.switchTheme(newTheme);
    }
    switchTheme(theme) {
      this.currentTheme = theme;
      this.applyTheme(theme);
      this.switcher.find(".theme-option").removeClass("active");
      this.switcher.find(`.theme-option[data-theme="${theme}"]`).addClass("active");
    }
  };

  // ../room_booking/room_booking/public/js/booking_manager.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.BookingManager = class {
    constructor({ wrapper, onBookingUpdate }) {
      if (!wrapper || !$(wrapper).length) {
        this.showFatalError(__("\u0639\u0646\u0635\u0631 \u0627\u0644\u0640 wrapper \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629"));
        return;
      }
      try {
        this.wrapper = $(wrapper);
        this.onBookingUpdate = onBookingUpdate || function() {
        };
        this.currentBooking = null;
        this.state = {
          isLoading: false,
          calendarInitialized: false,
          bookings: [],
          errorContainer: null
        };
        this.init();
      } catch (error) {
        console.error("\u062A\u0639\u0630\u0631 \u062A\u0647\u064A\u0626\u0629 \u0645\u062F\u064A\u0631 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A:", error);
        this.showFatalError(__("\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062A\u0647\u064A\u0626\u0629"));
      }
    }
    async init() {
      try {
        this.renderBaseLayout();
        const libLoaded = await this.loadCalendarLibrary();
        if (!libLoaded)
          return;
        await this.loadInitialBookings();
        this.setupEventListeners();
      } catch (error) {
        console.error("\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u0647\u064A\u0626\u0629:", error);
        this.showError(__("\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u062D\u0645\u064A\u0644 \u0645\u062F\u064A\u0631 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A"));
      }
    }
    renderBaseLayout() {
      try {
        this.wrapper.html(`
                <div class="booking-manager">
                    <!-- \u0634\u0631\u064A\u0637 \u0627\u0644\u062A\u062D\u0643\u0645 -->
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
                    
                    <!-- \u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u062D\u0645\u064A\u0644 -->
                    <div class="loading-state" style="display:none;">
                        <div class="spinner"></div>
                        <p>${__("\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644...")}</p>
                    </div>
                    
                    <!-- \u0627\u0644\u062A\u0642\u0648\u064A\u0645 -->
                    <div class="calendar-container">
                        <div class="calendar-view"></div>
                        <div class="calendar-error alert alert-danger" style="display:none;"></div>
                    </div>
                    
                    <!-- \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062D\u062C\u0632 -->
                    <div class="booking-details card mt-4">
                        <div class="card-header">
                            <h3 class="card-title">${__("\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062D\u062C\u0632")}</h3>
                        </div>
                        <div class="card-body">
                            <div class="detail-content empty-state">
                                <i class="fa fa-calendar fa-3x text-muted"></i>
                                <p class="text-muted">${__("\u0627\u062E\u062A\u0631 \u062D\u062C\u0632\u0627\u064B \u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644")}</p>
                            </div>
                            <div class="detail-actions mt-3" style="display:none;">
                                <button class="btn btn-modify btn-sm btn-primary">
                                    <i class="fa fa-edit"></i> ${__("\u062A\u0639\u062F\u064A\u0644")}
                                </button>
                                <button class="btn btn-cancel btn-sm btn-danger">
                                    <i class="fa fa-times"></i> ${__("\u0625\u0644\u063A\u0627\u0621")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        this.state.errorContainer = this.wrapper.find(".calendar-error");
      } catch (error) {
        console.error("\u062E\u0637\u0623 \u0641\u064A \u0639\u0631\u0636 \u0627\u0644\u0648\u0627\u062C\u0647\u0629:", error);
        throw error;
      }
    }
    async loadCalendarLibrary() {
      try {
        if (typeof FullCalendar !== "undefined")
          return true;
        this.showLoading(true, __("\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u062A\u0642\u0648\u064A\u0645..."));
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.js";
          script.onload = resolve;
          script.onerror = () => reject(new Error("\u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0645\u0643\u062A\u0628\u0629 \u0627\u0644\u062A\u0642\u0648\u064A\u0645"));
          document.head.appendChild(script);
        });
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/main.min.css";
        document.head.appendChild(link);
        await this.loadArabicLocale();
        return true;
      } catch (error) {
        console.error("\u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u0643\u062A\u0628\u0629:", error);
        this.showCalendarError(__("\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0642\u0648\u064A\u0645. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A."));
        return false;
      } finally {
        this.showLoading(false);
      }
    }
    async loadArabicLocale() {
      try {
        if (FullCalendar.locales.ar)
          return;
        await new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/fullcalendar@5.10.1/locales/ar.min.js";
          script.onload = resolve;
          document.head.appendChild(script);
        });
      } catch (error) {
        console.warn("\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0645\u0644\u0641 \u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629:", error);
      }
    }
    async initCalendar() {
      try {
        if (this.state.calendarInitialized)
          return;
        const calendarEl = this.wrapper.find(".calendar-view")[0];
        if (!calendarEl) {
          throw new Error("\u0639\u0646\u0635\u0631 \u0627\u0644\u062A\u0642\u0648\u064A\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F");
        }
        this.calendar = new FullCalendar.Calendar(calendarEl, {
          initialView: "timeGridWeek",
          locale: "ar",
          direction: "rtl",
          headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "timeGridWeek,timeGridDay,listWeek"
          },
          eventClick: (info) => {
            try {
              this.showBookingDetails(info.event);
            } catch (error) {
              console.error("\u062E\u0637\u0623 \u0641\u064A \u0639\u0631\u0636 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644:", error);
              this.showError(__("\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0639\u0631\u0636 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062D\u062C\u0632"));
            }
          },
          events: async (fetchInfo, successCallback) => {
            try {
              const bookings = await this.fetchBookings(fetchInfo);
              successCallback(bookings);
            } catch (error) {
              console.error("\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A:", error);
              successCallback([]);
            }
          },
          eventContent: this.renderEventContent.bind(this)
        });
        this.calendar.render();
        this.state.calendarInitialized = true;
      } catch (error) {
        console.error("\u062E\u0637\u0623 \u0641\u064A \u062A\u0647\u064A\u0626\u0629 \u0627\u0644\u062A\u0642\u0648\u064A\u0645:", error);
        this.showCalendarError(__("\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u062A\u0642\u0648\u064A\u0645"));
        throw error;
      }
    }
    async loadInitialBookings() {
      try {
        this.showLoading(true, __("\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A..."));
        const today = frappe.datetime.get_today();
        const startDate = frappe.datetime.add_days(today, -30);
        const endDate = frappe.datetime.add_days(today, 60);
        this.state.bookings = await this.fetchBookings({
          start: new Date(startDate),
          end: new Date(endDate)
        });
        if (this.state.calendarInitialized) {
          this.calendar.refetchEvents();
        } else {
          await this.initCalendar();
        }
        this.onBookingUpdate(this.state.bookings);
      } catch (error) {
        console.error("\u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A:", error);
        this.showError(__("\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A"));
      } finally {
        this.showLoading(false);
      }
    }
    async fetchBookings(fetchInfo) {
      try {
        const { message: bookings } = await frappe.call({
          method: "room_booking.api.get_user_bookings",
          args: {
            start_date: frappe.datetime.obj_to_str(fetchInfo.start),
            end_date: frappe.datetime.obj_to_str(fetchInfo.end)
          },
          freeze: this.state.isLoading,
          always: () => this.showLoading(false)
        });
        if (!Array.isArray(bookings)) {
          throw new Error("\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629 \u0645\u0646 \u0627\u0644\u062E\u0627\u062F\u0645");
        }
        return bookings.map((booking) => {
          if (!booking.name || !booking.start_time || !booking.end_time) {
            console.warn("\u062D\u062C\u0632 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D:", booking);
            return null;
          }
          return {
            id: booking.name,
            title: `${booking.room_name || __("\u063A\u0631\u0641\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629")} - ${booking.customer_name || __("\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641")}`,
            start: booking.start_time,
            end: booking.end_time,
            extendedProps: {
              booking,
              amount: booking.total_amount || 0,
              status: booking.status || "Pending"
            },
            color: this.getStatusColor(booking.status),
            textColor: "#ffffff"
          };
        }).filter(Boolean);
      } catch (error) {
        console.error("\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A:", error);
        throw error;
      }
    }
    renderEventContent(eventInfo) {
      try {
        const booking = eventInfo.event.extendedProps.booking;
        return {
          html: `
                    <div class="fc-event-content">
                        <div class="fc-event-title">${booking.room_name || __("\u063A\u0631\u0641\u0629")}</div>
                        <div class="fc-event-time">
                            ${frappe.datetime.str_to_user(eventInfo.event.startStr).split(" ")[1]} - 
                            ${frappe.datetime.str_to_user(eventInfo.event.endStr).split(" ")[1]}
                        </div>
                        <div class="fc-event-status ${(booking.status || "").toLowerCase()}">
                            ${this.getStatusText(booking.status)}
                        </div>
                    </div>
                `
        };
      } catch (error) {
        console.error("\u062E\u0637\u0623 \u0641\u064A \u0639\u0631\u0636 \u0627\u0644\u062D\u062F\u062B:", error);
        return { html: '<div class="fc-event-content">\u062D\u062C\u0632</div>' };
      }
    }
    showBookingDetails(calendarEvent) {
      try {
        const booking = calendarEvent.extendedProps.booking;
        if (!booking) {
          throw new Error("\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u062D\u062C\u0632 \u0644\u0639\u0631\u0636\u0647\u0627");
        }
        this.currentBooking = booking;
        this.wrapper.find(".detail-content").html(`
                <div class="booking-info">
                    <h4>${booking.room_name || __("\u063A\u0631\u0641\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629")}</h4>
                    <div class="booking-meta">
                        <p>
                            <i class="fa fa-calendar"></i> 
                            ${frappe.datetime.str_to_user(booking.start_time) || __("\u063A\u064A\u0631 \u0645\u062D\u062F\u062F")}
                        </p>
                        <p>
                            <i class="fa fa-clock"></i> 
                            ${this.calculateDuration(booking.start_time, booking.end_time)}
                        </p>
                        <p>
                            <i class="fa fa-user"></i> 
                            ${booking.customer_name || __("\u063A\u064A\u0631 \u0645\u062D\u062F\u062F")}
                        </p>
                        <p>
                            <i class="fa fa-money-bill-wave"></i> 
                            ${room_booking.RoomBooking.helpers.formatCurrency(booking.total_amount) || "0.00"}
                        </p>
                    </div>
                    <div class="status-badge ${(booking.status || "").toLowerCase()}">
                        ${this.getStatusText(booking.status)}
                    </div>
                </div>
            `);
        this.wrapper.find(".detail-actions").show();
      } catch (error) {
        console.error("\u062E\u0637\u0623 \u0641\u064A \u0639\u0631\u0636 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644:", error);
        this.showError(__("\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062D\u062C\u0632"));
      }
    }
    async cancelCurrentBooking() {
      try {
        if (!this.currentBooking) {
          this.showError(__("\u0644\u0645 \u064A\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0623\u064A \u062D\u062C\u0632 \u0644\u0644\u0625\u0644\u063A\u0627\u0621"));
          return;
        }
        frappe.confirm(
          __("\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u0625\u0644\u063A\u0627\u0621 \u0647\u0630\u0627 \u0627\u0644\u062D\u062C\u0632\u061F"),
          () => this.processCancellation(this.currentBooking.id),
          __("\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u062C\u0632")
        );
      } catch (error) {
        console.error("\u062E\u0637\u0623 \u0641\u064A \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0625\u0644\u063A\u0627\u0621:", error);
        this.showError(__("\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u0625\u0644\u063A\u0627\u0621"));
      }
    }
    async processCancellation(bookingId) {
      try {
        this.showLoading(true, __("\u062C\u0627\u0631\u064A \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0625\u0644\u063A\u0627\u0621..."));
        const { message: result } = await frappe.call({
          method: "room_booking.api.cancel_booking",
          args: { booking_id: bookingId },
          freeze: true
        });
        if (result.success) {
          frappe.show_alert({
            message: __("\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u062C\u0632 \u0628\u0646\u062C\u0627\u062D"),
            indicator: "green"
          }, 5);
          this.calendar.refetchEvents();
          this.resetDetailsView();
        } else {
          throw new Error(result.message || __("\u0641\u0634\u0644 \u0641\u064A \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u062C\u0632"));
        }
      } catch (error) {
        console.error("\u062E\u0637\u0623 \u0641\u064A \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u062C\u0632:", error);
        this.showError(__("\u0641\u0634\u0644 \u0641\u064A \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u062C\u0632: ") + error.message);
      } finally {
        this.showLoading(false);
      }
    }
    resetDetailsView() {
      this.wrapper.find(".detail-content").html(`
            <div class="empty-state">
                <i class="fa fa-calendar fa-3x text-muted"></i>
                <p class="text-muted">${__("\u0627\u062E\u062A\u0631 \u062D\u062C\u0632\u0627\u064B \u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644")}</p>
            </div>
        `);
      this.wrapper.find(".detail-actions").hide();
      this.currentBooking = null;
    }
    setupEventListeners() {
      this.wrapper.off("click", ".btn-refresh");
      this.wrapper.off("click", ".btn-cancel");
      this.wrapper.off("click", ".btn-modify");
      this.wrapper.off("click", ".btn-add-booking");
      this.wrapper.on("click", ".btn-refresh", () => {
        this.loadInitialBookings().catch(console.error);
      });
      this.wrapper.on("click", ".btn-cancel", () => {
        this.cancelCurrentBooking().catch(console.error);
      });
      this.wrapper.on("click", ".btn-modify", () => {
        frappe.msgprint(__("\u0647\u0630\u0647 \u0627\u0644\u0645\u064A\u0632\u0629 \u0642\u064A\u062F \u0627\u0644\u062A\u0637\u0648\u064A\u0631 \u062D\u0627\u0644\u064A\u0627\u064B"));
      });
      this.wrapper.on("click", ".btn-add-booking", () => {
        frappe.set_route("app/room-booking");
      });
    }
    showLoading(show, message) {
      const loader = this.wrapper.find(".loading-state");
      if (show) {
        if (message)
          loader.find("p").text(message);
        loader.show();
      } else {
        loader.hide();
      }
    }
    showError(message) {
      frappe.msgprint({
        title: __("\u062E\u0637\u0623"),
        message,
        indicator: "red"
      });
    }
    showCalendarError(message) {
      if (this.state.errorContainer) {
        this.state.errorContainer.html(`<i class="fa fa-exclamation-triangle"></i> ${message}`).show();
      } else {
        this.showError(message);
      }
    }
    showFatalError(message = __("\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A. \u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0641\u062D\u0629 \u0623\u0648 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A.")) {
      this.wrapper.html(`
            <div class="alert alert-danger">
                <h3><i class="fa fa-exclamation-circle"></i> ${__("\u062E\u0637\u0623 \u0641\u0627\u062F\u062D")}</h3>
                <p>${message}</p>
                <button class="btn btn-danger btn-refresh-page mt-2">
                    <i class="fa fa-sync-alt"></i> ${__("\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0641\u062D\u0629")}
                </button>
            </div>
        `);
      this.wrapper.find(".btn-refresh-page").on("click", () => location.reload());
    }
    getStatusText(status) {
      const statusMap = {
        "Confirmed": __("\u0645\u0624\u0643\u062F"),
        "Cancelled": __("\u0645\u0644\u063A\u0649"),
        "Completed": __("\u0645\u0643\u062A\u0645\u0644"),
        "Pending": __("\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631"),
        "Draft": __("\u0645\u0633\u0648\u062F\u0629")
      };
      return statusMap[status] || status || __("\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641");
    }
    getStatusColor(status) {
      const colors = {
        "Confirmed": "#4CAF50",
        "Cancelled": "#F44336",
        "Completed": "#2196F3",
        "Pending": "#FFC107",
        "Draft": "#9E9E9E"
      };
      return colors[status] || "#757575";
    }
    calculateDuration(start, end) {
      try {
        if (!start || !end)
          return __("\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641");
        const startTime = frappe.datetime.str_to_obj(start);
        const endTime = frappe.datetime.str_to_obj(end);
        const diff = endTime - startTime;
        const hours = Math.floor(diff / (1e3 * 60 * 60));
        const minutes = Math.floor(diff % (1e3 * 60 * 60) / (1e3 * 60));
        return `${hours} ${__("\u0633\u0627\u0639\u0629")} ${minutes} ${__("\u062F\u0642\u064A\u0642\u0629")}`;
      } catch (error) {
        console.error("\u062E\u0637\u0623 \u0641\u064A \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u062F\u0629:", error);
        return __("\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641");
      }
    }
  };

  // ../room_booking/room_booking/public/js/3d_room_viewer.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.Room3DViewer = class {
    constructor() {
      this.currentRoom = null;
      this.initViewer();
    }
    initViewer() {
      this.container = $(`
            <div class="3d-room-viewer">
                <div class="viewer-header">
                    <h3 class="room-title"></h3>
                    <button class="btn-close"><i class="fa fa-times"></i></button>
                </div>
                <div class="3d-container"></div>
                <div class="room-controls">
                    <button class="btn-control" data-action="rotate"><i class="fa fa-sync-alt"></i></button>
                    <button class="btn-control" data-action="zoom-in"><i class="fa fa-search-plus"></i></button>
                    <button class="btn-control" data-action="zoom-out"><i class="fa fa-search-minus"></i></button>
                    <button class="btn-control" data-action="fullscreen"><i class="fa fa-expand"></i></button>
                </div>
            </div>
        `).hide();
      $("body").append(this.container);
      this.bindEvents();
    }
    loadRoom(roomData) {
      this.currentRoom = roomData;
      this.container.find(".room-title").text(roomData.name);
      this.container.find(".3d-container").html(`
            <div class="3d-placeholder">
                <img src="${roomData.image || "/assets/room_booking/images/3d_placeholder.jpg"}" 
                     alt="${roomData.name}">
                <div class="hotspots">
                    ${roomData.equipment.map((item) => `
                        <div class="hotspot" style="top:${item.y}%;left:${item.x}%" 
                             data-tooltip="${item.name}">
                            <i class="fa ${item.icon || "fa-info-circle"}"></i>
                        </div>
                    `).join("")}
                </div>
            </div>
        `);
      this.show();
    }
    show() {
      this.container.fadeIn();
      $("body").addClass("no-scroll");
    }
    hide() {
      this.container.fadeOut();
      $("body").removeClass("no-scroll");
    }
    bindEvents() {
      this.container.find(".btn-close").click(() => this.hide());
      this.container.on("click", ".btn-control", (e) => {
        const action = $(e.currentTarget).data("action");
        this.handleControlAction(action);
      });
      this.container.on("mouseenter", ".hotspot", function() {
        $(this).append(`<div class="tooltip">${$(this).data("tooltip")}</div>`);
      }).on("mouseleave", ".hotspot", function() {
        $(this).find(".tooltip").remove();
      });
    }
    handleControlAction(action) {
      const placeholder = this.container.find(".3d-placeholder");
      switch (action) {
        case "rotate":
          placeholder.toggleClass("rotate");
          break;
        case "zoom-in":
          placeholder.css("transform", (i, val) => {
            const scale = parseFloat(val.replace("scale(", "")) || 1;
            return `scale(${scale + 0.1})`;
          });
          break;
        case "zoom-out":
          placeholder.css("transform", (i, val) => {
            const scale = parseFloat(val.replace("scale(", "")) || 1;
            return `scale(${Math.max(0.5, scale - 0.1)})`;
          });
          break;
        case "fullscreen":
          this.container.toggleClass("fullscreen");
          break;
      }
    }
  };

  // ../room_booking/room_booking/public/js/booking_analytics.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.AnalyticsDashboard = class {
    constructor() {
      this.charts = {};
      this.init();
    }
    async init() {
      await this.loadData();
      this.render();
      this.initCharts();
    }
    async loadData() {
      try {
        const { message } = await frappe.call({
          method: "room_booking.api.get_booking_analytics"
        });
        this.analyticsData = message;
      } catch (error) {
        console.error("Failed to load analytics:", error);
      }
    }
    render() {
      this.container = $(`
            <div class="analytics-dashboard">
                <div class="dashboard-header">
                    <h3><i class="fa fa-chart-bar"></i> ${__("\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A")}</h3>
                    <div class="time-filters">
                        <select class="form-control period-filter">
                            <option value="day">${__("\u0627\u0644\u064A\u0648\u0645")}</option>
                            <option value="week">${__("\u0627\u0644\u0623\u0633\u0628\u0648\u0639")}</option>
                            <option value="month" selected>${__("\u0627\u0644\u0634\u0647\u0631")}</option>
                            <option value="year">${__("\u0627\u0644\u0633\u0646\u0629")}</option>
                        </select>
                    </div>
                </div>
                
                <div class="stats-cards">
                    <div class="stat-card total-bookings">
                        <h4>${__("\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A")}</h4>
                        <div class="value">0</div>
                    </div>
                    <div class="stat-card revenue">
                        <h4>${__("\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A")}</h4>
                        <div class="value">0 SAR</div>
                    </div>
                    <div class="stat-card occupancy-rate">
                        <h4>${__("\u0645\u0639\u062F\u0644 \u0627\u0644\u0625\u0634\u063A\u0627\u0644")}</h4>
                        <div class="value">0%</div>
                    </div>
                </div>
                
                <div class="charts-container">
                    <div class="chart-container bookings-chart">
                        <canvas id="bookingsTrendChart"></canvas>
                    </div>
                    <div class="chart-container revenue-chart">
                        <canvas id="revenueTrendChart"></canvas>
                    </div>
                </div>
            </div>
        `);
      this.bindEvents();
    }
    initCharts() {
      this.charts.bookingsTrend = new Chart(
        this.container.find("#bookingsTrendChart")[0].getContext("2d"),
        {
          type: "line",
          data: this.prepareBookingsData(),
          options: this.getChartOptions(__("\u062A\u0637\u0648\u0631 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A"))
        }
      );
      this.charts.revenueTrend = new Chart(
        this.container.find("#revenueTrendChart")[0].getContext("2d"),
        {
          type: "bar",
          data: this.prepareRevenueData(),
          options: this.getChartOptions(__("\u062A\u0637\u0648\u0631 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A"), "SAR")
        }
      );
    }
    prepareBookingsData() {
      return {
        labels: this.analyticsData.labels,
        datasets: [{
          label: __("\u0639\u062F\u062F \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A"),
          data: this.analyticsData.bookings,
          borderColor: "#4e73df",
          backgroundColor: "rgba(78, 115, 223, 0.05)",
          tension: 0.3
        }]
      };
    }
    prepareRevenueData() {
      return {
        labels: this.analyticsData.labels,
        datasets: [{
          label: __("\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A"),
          data: this.analyticsData.revenue,
          backgroundColor: "#1cc88a",
          borderRadius: 3
        }]
      };
    }
    getChartOptions(title, unit = "") {
      return {
        responsive: true,
        plugins: {
          title: { display: true, text: title },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.raw} ${unit}`
            }
          }
        },
        scales: {
          y: { beginAtZero: true }
        }
      };
    }
    bindEvents() {
      this.container.on("change", ".period-filter", async () => {
        await this.loadData();
        this.updateCharts();
        this.updateStats();
      });
    }
    updateCharts() {
      this.charts.bookingsTrend.data = this.prepareBookingsData();
      this.charts.revenueTrend.data = this.prepareRevenueData();
      this.charts.bookingsTrend.update();
      this.charts.revenueTrend.update();
    }
    updateStats() {
      this.container.find(".total-bookings .value").text(
        this.analyticsData.total_bookings
      );
      this.container.find(".revenue .value").text(
        room_booking.RoomBooking.helpers.formatCurrency(this.analyticsData.total_revenue)
      );
      this.container.find(".occupancy-rate .value").text(
        `${this.analyticsData.occupancy_rate}%`
      );
    }
  };

  // ../room_booking/room_booking/public/js/equipment_manager.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.EquipmentManager = class {
    constructor(roomId) {
      this.roomId = roomId;
      this.equipment = [];
      this.init();
    }
    async init() {
      await this.loadEquipment();
      this.render();
    }
    async loadEquipment() {
      try {
        const { message } = await frappe.call({
          method: "room_booking.api.get_room_equipment",
          args: { room_id: this.roomId }
        });
        this.equipment = message;
      } catch (error) {
        console.error("Failed to load equipment:", error);
      }
    }
    render() {
      this.container = $(`
            <div class="equipment-manager">
                <h4><i class="fa fa-tv"></i> ${__("\u062A\u062C\u0647\u064A\u0632\u0627\u062A \u0627\u0644\u063A\u0631\u0641\u0629")}</h4>
                <div class="equipment-grid"></div>
                <div class="equipment-preview">
                    <div class="preview-placeholder">
                        ${__("\u0627\u062E\u062A\u0631 \u062C\u0647\u0627\u0632\u0627\u064B \u0644\u0644\u0645\u0639\u0627\u064A\u0646\u0629")}
                    </div>
                </div>
            </div>
        `);
      this.equipment.forEach((item) => {
        this.container.find(".equipment-grid").append(`
                <div class="equipment-item" data-id="${item.name}">
                    <i class="fa ${item.icon || "fa-cube"}"></i>
                    <span>${item.equipment_name}</span>
                </div>
            `);
      });
      this.bindEvents();
    }
    bindEvents() {
      this.container.on("click", ".equipment-item", (e) => {
        const equipmentId = $(e.currentTarget).data("id");
        this.showPreview(equipmentId);
      });
    }
    showPreview(equipmentId) {
      const item = this.equipment.find((e) => e.name === equipmentId);
      if (!item)
        return;
      this.container.find(".equipment-preview").html(`
            <div class="preview-content">
                <h5>${item.equipment_name}</h5>
                <div class="preview-image">
                    <img src="${item.image || "/assets/room_booking/images/equipment_placeholder.jpg"}" 
                         alt="${item.equipment_name}">
                </div>
                <div class="preview-details">
                    <p><strong>${__("\u0627\u0644\u0646\u0648\u0639")}:</strong> ${item.equipment_type}</p>
                    <p><strong>${__("\u0627\u0644\u0643\u0645\u064A\u0629")}:</strong> ${item.quantity}</p>
                    <p><strong>${__("\u0627\u0644\u062D\u0627\u0644\u0629")}:</strong> ${item.status}</p>
                    <p class="description">${item.description || __("\u0644\u0627 \u064A\u0648\u062C\u062F \u0648\u0635\u0641 \u0645\u062A\u0627\u062D")}</p>
                </div>
            </div>
        `);
    }
  };

  // ../room_booking/room_booking/public/js/notification_center.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.NotificationCenter = class {
    constructor() {
      this.notifications = [];
      this.initContainer();
      this.initSound();
    }
    initContainer() {
      this.container = $(`
            <div class="notification-center">
                <div class="notification-bell">
                    <i class="fa fa-bell"></i>
                    <span class="badge">0</span>
                </div>
                <div class="notifications-dropdown"></div>
            </div>
        `);
      $("body").append(this.container);
      this.bindEvents();
    }
    initSound() {
      this.sounds = {
        info: new Audio("/assets/room_booking/sounds/notification.mp3"),
        success: new Audio("/assets/room_booking/sounds/success.mp3"),
        error: new Audio("/assets/room_booking/sounds/error.mp3")
      };
    }
    show(message, type = "info", duration = 3e3) {
      const id = Date.now();
      const notification = $(`
            <div class="notification ${type}" data-id="${id}">
                <i class="fa ${this.getIcon(type)}"></i>
                <div class="message">${message}</div>
                <button class="btn-close"><i class="fa fa-times"></i></button>
            </div>
        `);
      if (type === "urgent") {
        this.container.find(".notifications-dropdown").prepend(notification);
      } else {
        this.container.find(".notifications-dropdown").append(notification);
      }
      notification.hide().fadeIn(200);
      if (this.sounds[type]) {
        this.sounds[type].cloneNode(true).play();
      }
      this.updateBadge();
      if (duration > 0) {
        setTimeout(() => {
          notification.fadeOut(() => notification.remove());
          this.updateBadge();
        }, duration);
      }
      this.notifications.push({ id, message, type, timestamp: new Date() });
    }
    getIcon(type) {
      const icons = {
        info: "fa-info-circle",
        success: "fa-check-circle",
        warning: "fa-exclamation-triangle",
        error: "fa-times-circle",
        urgent: "fa-bell"
      };
      return icons[type] || icons.info;
    }
    updateBadge() {
      const count = this.container.find(".notification").length;
      this.container.find(".badge").text(count).toggle(count > 0);
    }
    bindEvents() {
      this.container.find(".notification-bell").click(() => {
        this.container.find(".notifications-dropdown").toggleClass("show");
      });
      this.container.on("click", ".btn-close", (e) => {
        $(e.currentTarget).closest(".notification").fadeOut(() => {
          $(e.currentTarget).remove();
          this.updateBadge();
        });
      });
    }
  };

  // ../room_booking/room_booking/public/js/voice_controller.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.VoiceController = class {
    constructor(app) {
      this.app = app;
      this.commands = {
        "\u0627\u062D\u062C\u0632 \u063A\u0631\u0641\u0629": () => this.app.switchView("room_selection"),
        "\u0639\u0631\u0636 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A": () => this.app.switchView("booking_management"),
        "\u0628\u062D\u062B \u0639\u0646 \u063A\u0631\u0641\u0629": (query) => this.searchRooms(query),
        "\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0641\u062D\u0629": () => location.reload(),
        "\u0645\u0633\u0627\u0639\u062F\u0629": () => this.showHelp()
      };
      this.init();
    }
    init() {
      this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      this.recognition.lang = "ar-SA";
      this.recognition.interimResults = false;
      this.setupUI();
      this.bindEvents();
    }
    setupUI() {
      this.container = $(`
            <div class="voice-controller">
                <button class="btn-voice-command">
                    <i class="fa fa-microphone"></i>
                </button>
                <div class="voice-status">
                    <span class="listening-status">${__("\u0627\u0646\u0642\u0631 \u0644\u0644\u062A\u062D\u062F\u062B")}</span>
                    <div class="voice-wave">
                        <span class="wave-dot"></span>
                        <span class="wave-dot"></span>
                        <span class="wave-dot"></span>
                    </div>
                </div>
            </div>
        `);
      $("body").append(this.container);
    }
    bindEvents() {
      this.container.on("click", ".btn-voice-command", () => {
        if (this.isListening) {
          this.stopListening();
        } else {
          this.startListening();
        }
      });
      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.processCommand(transcript);
      };
      this.recognition.onerror = (event) => {
        console.error("Voice recognition error:", event.error);
        this.showStatus(__("\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0635\u0648\u062A"), "error");
      };
    }
    startListening() {
      this.recognition.start();
      this.isListening = true;
      this.showStatus(__("\u064A\u0633\u062A\u0645\u0639 \u0627\u0644\u0622\u0646..."), "listening");
      this.container.find(".btn-voice-command").addClass("active");
    }
    stopListening() {
      this.recognition.stop();
      this.isListening = false;
      this.showStatus(__("\u0627\u0646\u0642\u0631 \u0644\u0644\u062A\u062D\u062F\u062B"), "idle");
      this.container.find(".btn-voice-command").removeClass("active");
    }
    processCommand(transcript) {
      this.showStatus(__("\u064A\u0639\u0627\u0644\u062C \u0627\u0644\u0623\u0645\u0631..."), "processing");
      let commandMatched = false;
      for (const [cmd, action] of Object.entries(this.commands)) {
        if (transcript.includes(cmd)) {
          const query = transcript.replace(cmd, "").trim();
          action(query);
          commandMatched = true;
          break;
        }
      }
      if (!commandMatched) {
        this.showStatus(__("\u0644\u0645 \u0623\u0641\u0647\u0645 \u0627\u0644\u0623\u0645\u0631"), "error");
        frappe.msgprint(__("\u0644\u0645 \u0623\u062A\u0639\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0645\u0631 \u0627\u0644\u0635\u0648\u062A\u064A\u060C \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649"));
      } else {
        this.showStatus(__("\u062A\u0645 \u0627\u0644\u062A\u0646\u0641\u064A\u0630"), "success");
      }
      setTimeout(() => this.stopListening(), 2e3);
    }
    showStatus(message, status) {
      this.container.find(".listening-status").text(message);
      this.container.removeClass("idle listening processing error success");
      this.container.addClass(status);
    }
    searchRooms(query) {
      frappe.show_alert(__(`\u062C\u0627\u0631\u064A \u0627\u0644\u0628\u062D\u062B \u0639\u0646: ${query}`));
      this.app.roomExplorer.applySearchFilter(query);
    }
    showHelp() {
      const commandsList = Object.keys(this.commands).join("<br>");
      frappe.msgprint({
        title: __("\u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0635\u0648\u062A\u064A\u0629 \u0627\u0644\u0645\u062A\u0627\u062D\u0629"),
        message: commandsList
      });
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
    }
    show(room, slot, onSuccess) {
      const duration = room_booking.RoomBooking.helpers.calculateDuration(slot.start, slot.end);
      const pricePerHour = room.price_per_hour || 0;
      this.dialog = new frappe.ui.Dialog({
        title: __("Confirm Booking"),
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
            get_query: () => {
              return {
                filters: { "disabled": 0 }
              };
            }
          },
          {
            label: __("Date"),
            fieldname: "date",
            fieldtype: "Date",
            reqd: true,
            default: frappe.datetime.get_today(),
            min_date: frappe.datetime.get_today()
          },
          {
            label: __("Start Time"),
            fieldname: "start_time",
            fieldtype: "Time",
            default: room_booking.RoomBooking.helpers.formatTimeForFrontend(slot.start),
            reqd: 1,
            change: () => this.update_calculations()
          },
          {
            label: __("Duration (hours)"),
            fieldname: "duration",
            fieldtype: "Float",
            default: duration,
            reqd: 1,
            min: 0.5,
            max: 24,
            change: () => this.update_end_time()
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
            rows: 3
          }
        ],
        primary_action_label: __("Confirm Booking"),
        primary_action: (values) => this.submit_booking(room, values, onSuccess),
        secondary_action_label: __("Cancel"),
        secondary_action: () => this.dialog.hide()
      });
      this.setup_event_listeners();
      this.update_end_time();
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
      const [hours, minutes] = startTime.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + Math.round(duration * 60);
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;
      const formattedEndTime = room_booking.RoomBooking.helpers.formatTime(endHours, endMinutes);
      this.dialog.set_value("end_time", formattedEndTime);
      this.update_calculations();
    }
    update_calculations() {
      const duration = parseFloat(this.dialog.get_value("duration")) || 0;
      const pricePerHour = parseFloat(this.dialog.get_value("price_per_hour")) || 0;
      const totalPrice = pricePerHour * duration;
      this.dialog.set_value("amount", totalPrice);
    }
    async submit_booking(room, values, onSuccess) {
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
        await frappe.call({
          method: "room_booking.api.create_booking",
          args: { bookings: [bookingData] },
          freeze: true,
          callback: (r) => {
            if (!r.exc) {
              frappe.show_alert({
                message: __("Booking created successfully"),
                indicator: "green"
              });
              this.dialog.hide();
              if (onSuccess)
                onSuccess();
            }
          }
        });
      } catch (error) {
        console.error("Booking error:", error);
        frappe.msgprint({
          title: __("Booking Failed"),
          message: __("An error occurred while creating the booking. Please try again."),
          indicator: "red"
        });
      }
    }
  };

  // ../room_booking/room_booking/public/js/helpers.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.helpers = {
    formatTimeForFrontend(timeStr) {
      if (!timeStr)
        return "00:00";
      try {
        const [hours, minutes] = String(timeStr).split(":");
        return `${hours.padStart(2, "0")}:${(minutes || "00").padStart(2, "0")}`;
      } catch (e) {
        console.error("Invalid time format:", timeStr);
        return "00:00";
      }
    },
    formatTimeForBackend(timeStr) {
      if (!timeStr)
        return "00:00:00";
      return `${this.formatTimeForFrontend(timeStr)}:00`;
    },
    validateTimeFormat(timeStr) {
      return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr);
    },
    createDateFromTime(timeStr) {
      if (!timeStr)
        return null;
      try {
        return new Date(`2000-01-01T${timeStr}`);
      } catch (e) {
        console.error("Invalid time string:", timeStr);
        return null;
      }
    },
    formatCurrency: (amount, currency = "SAR") => {
      return new Intl.NumberFormat("ar-SA", {
        style: "currency",
        currency
      }).format(amount);
    },
    calculateDuration: (start, end) => {
      const startDate = new Date(`2000-01-01T${start}`);
      const endDate = new Date(`2000-01-01T${end}`);
      const diffMs = endDate - startDate;
      const hours = Math.floor(diffMs / (1e3 * 60 * 60));
      const minutes = Math.floor(diffMs % (1e3 * 60 * 60) / (1e3 * 60));
      return `${hours}:${minutes.toString().padStart(2, "0")}`;
    },
    generateBookingId: () => {
      return `booking_${Date.now()}_${Math.floor(Math.random() * 1e3)}`;
    },
    formatDateForDisplay: (dateStr) => {
      return frappe.datetime.str_to_user(dateStr);
    },
    loadIcons: (icons) => {
      const iconLoader = document.createElement("div");
      iconLoader.style.display = "none";
      icons.forEach((icon) => {
        iconLoader.innerHTML += `<i class="fa ${icon}"></i>`;
      });
      document.body.appendChild(iconLoader);
    },
    showLoading: (message = "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644...") => {
      const loader = $(`
            <div class="custom-loader">
                <div class="loader-animation"></div>
                <p>${message}</p>
            </div>
        `);
      $("body").append(loader);
      return {
        hide: () => loader.remove()
      };
    }
  };

  // ../room_booking/room_booking/public/js/room_booking_app.js
  frappe.provide("room_booking.RoomBooking");
  room_booking.RoomBooking.Application = class {
    constructor(wrapper) {
      this.wrapper = $(wrapper).find(".layout-main-section");
      this.page = wrapper.page;
      this.state = {
        selectedRoom: null,
        selectedSlot: null,
        isLoading: false
      };
      this.init();
    }
    init() {
      this.check_opening_entry();
      this.setup_global_events();
    }
    check_opening_entry() {
      this.prepare_app_defaults();
    }
    prepare_app_defaults() {
      this.make_app();
    }
    setup_global_events() {
      frappe.realtime.on("pos_closed", () => {
        this.handle_pos_closed();
      });
    }
    handle_pos_closed() {
      frappe.msgprint({
        title: __("POS Closed"),
        message: __("The POS session has been closed. Please refresh the page."),
        indicator: "orange"
      });
    }
    make_app() {
      this.prepare_dom();
      this.prepare_menu();
      this.prepare_fullscreen_btn();
      this.init_components();
    }
    prepare_dom() {
      this.wrapper.html(`
            <div class="room-booking-app">
                <div class="row">
                    <div class="col-md-8 room-selector-container"></div>
                    <div class="col-md-4 booking-cart-container"></div>
                </div>
            </div>
        `);
    }
    prepare_menu() {
      this.page.clear_menu();
      this.page.add_menu_item(__("Refresh"), () => this.refresh(), false, "F5");
      this.page.add_menu_item(__("Close POS"), () => this.close_pos(), false, "Ctrl+Q");
      this.page.add_menu_item(__("Full Screen"), () => this.toggle_fullscreen(), false, "F11");
    }
    prepare_fullscreen_btn() {
      this.page.add_button(__("Full Screen"), () => this.toggle_fullscreen(), {
        btn_class: "btn-default fullscreen-btn"
      });
    }
    toggle_fullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
    init_components() {
      this.init_room_selector();
      this.init_booking_cart();
      this.init_booking_dialog();
      this.init_booking_manager();
    }
    init_room_selector() {
      this.room_selector = new room_booking.RoomBooking.RoomSelector({
        wrapper: this.wrapper.find(".room-selector-container"),
        events: {
          slot_selected: (args) => this.handle_slot_selected(args),
          booked_slot_clicked: (args) => this.handle_booked_slot_click(args)
        }
      });
    }
    init_booking_cart() {
      this.booking_cart = new room_booking.RoomBooking.BookingCart({
        wrapper: this.wrapper.find(".booking-cart-container"),
        events: {
          checkout: () => this.handle_checkout()
        }
      });
    }
    init_booking_dialog() {
      this.booking_dialog = new room_booking.RoomBooking.BookingDialog({
        events: {
          submit_booking: (values) => this.handle_booking_submit(values)
        }
      });
    }
    init_booking_manager() {
      this.booking_manager = new room_booking.RoomBooking.BookingManager({
        events: {
          booking_updated: () => this.refresh(),
          booking_cancelled: () => this.refresh()
        }
      });
    }
    handle_slot_selected({ room, slot }) {
      this.state.selectedRoom = room;
      this.state.selectedSlot = slot;
      this.booking_cart.add_booking(room, slot);
    }
    handle_booked_slot_click(booking) {
      this.booking_manager.show_booking_details(booking);
    }
    handle_checkout() {
      if (!this.state.selectedRoom || !this.state.selectedSlot) {
        frappe.msgprint(__("Please select a time slot first"));
        return;
      }
      this.booking_dialog.show(
        this.state.selectedRoom,
        this.state.selectedSlot,
        () => this.handle_booking_success()
      );
    }
    async handle_booking_submit(values) {
      try {
        this.set_loading(true);
        await frappe.call({
          method: "room_booking.api.create_booking",
          args: {
            booking: {
              rental_room: values.room.name,
              start_datetime: `${values.date} ${values.start_time}`,
              end_datetime: `${values.date} ${values.end_time}`,
              customer_name: values.customer,
              notes: values.notes,
              amount: values.amount
            }
          },
          freeze: true
        });
        return true;
      } catch (error) {
        console.error("Booking error:", error);
        frappe.msgprint(__("Booking failed. Please try again."));
        return false;
      } finally {
        this.set_loading(false);
      }
    }
    handle_booking_success() {
      frappe.show_alert({ message: __("Booking created successfully"), indicator: "green" });
      this.state.selectedRoom = null;
      this.state.selectedSlot = null;
      this.booking_cart.clear();
      this.room_selector.reload_rooms();
    }
    close_pos() {
      frappe.confirm(
        __("Are you sure you want to close the POS session?"),
        () => {
          frappe.call({
            method: "room_booking.api.close_pos_session",
            freeze: true,
            callback: () => {
              frappe.show_alert(__("POS session closed successfully"));
              window.location.reload();
            }
          });
        }
      );
    }
    refresh() {
      this.set_loading(true);
      this.room_selector.reload_rooms();
      this.booking_cart.clear();
      this.set_loading(false);
    }
    set_loading(loading) {
      this.state.isLoading = loading;
      if (loading) {
        this.wrapper.addClass("loading");
      } else {
        this.wrapper.removeClass("loading");
      }
    }
  };
  $(document).ready(() => {
    $("<style>").text(`
            .room-booking-app.loading {
                position: relative;
                opacity: 0.7;
                pointer-events: none;
            }
            .room-booking-app.loading::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255,255,255,0.7);
                z-index: 1000;
            }
        `).appendTo("head");
  });
})();
//# sourceMappingURL=room_booking.bundle.VSF7G3LD.js.map
