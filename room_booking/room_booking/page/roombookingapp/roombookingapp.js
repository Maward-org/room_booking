// frappe.pages['roombookingapp'].on_page_load = function(wrapper) {
// 	var page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: 'None',
// 		single_column: true
// 	});
// }

frappe.pages['roombookingapp'].on_page_load = function(wrapper) {
    new RoomBookingApp(wrapper);
};

class RoomBookingApp {
    constructor(wrapper) {
        this.wrapper = wrapper;
        this.page = frappe.ui.make_app_page({
            parent: wrapper,
            title: __('Room Booking System'),
            single_column: true
        });

        this.initServices();
        this.initComponents();
        this.init();
    }

    initServices() {
        this.apiService = new ApiService();
        this.stateService = new StateService();
    }

    initComponents() {
        this.roomList = new RoomList(this);
        this.slotGrid = new SlotGrid(this);
        this.bookingDialog = new BookingDialog(this);
        this.summarySection = new SummarySection(this);
    }

    init() {
        this.setupDOM();
        this.loadBranches();
        this.addStyles();
    }

    setupDOM() {
        this.$container = $(`
            <div class="room-booking-container">
                <div class="row filter-section">
                    <div class="col-md-4">
                        <label>${__('Branch')}</label>
                        <select class="form-control branch-filter">
                            <option value="">${__('All Branches')}</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label>${__('Date')}</label>
                        <input type="date" class="form-control date-filter" 
                               value="${frappe.datetime.get_today()}" 
                               min="${frappe.datetime.get_today()}">
                    </div>
                    <div class="col-md-4">
                        <label>${__('Capacity')}</label>
                        <select class="form-control capacity-filter">
                            <option value="">${__('Any')}</option>
                            <option value="5">5+</option>
                            <option value="10">10+</option>
                            <option value="20">20+</option>
                        </select>
                    </div>
                </div>

                <div class="loading-state text-center" style="display:none;">
                    <div class="spinner-border"></div>
                    <p>${__('Loading rooms...')}</p>
                </div>

                <div class="room-list-container row mt-4"></div>

                <div class="selection-summary-container mt-3"></div>

                <div class="help-section mt-4">
                    <div class="card">
                        <div class="card-header">
                            <h5>${__('How to Book')}</h5>
                        </div>
                        <div class="card-body">
                            <ol>
                                <li>${__('Select branch, date and capacity')}</li>
                                <li>${__('Click on available time slots')}</li>
                                <li>${__('Review your selection in the summary')}</li>
                                <li>${__('Click "Book Now" to confirm')}</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        `);

        $(this.wrapper).find('.layout-main-section').html(this.$container);
        
        // Initialize components with their containers
        this.roomList.init(this.$container.find('.room-list-container'));
        this.summarySection.init(this.$container.find('.selection-summary-container'));
        
        // Setup event listeners
        this.setupEventListeners();
    }

    addStyles() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/room_booking/styles/main.css';
        this.wrapper.appendChild(link);
    }

    setupEventListeners() {
        this.$container.on('change', '.branch-filter, .date-filter, .capacity-filter', () => this.loadRooms());
    }

    setLoading(loading) {
        this.stateService.setLoading(loading);
        this.$container.find('.loading-state').toggle(loading);
        this.$container.find('.filter-section, .room-list-container, .help-section').toggle(!loading);
    }

    async loadBranches() {
        try {
            const branches = await this.apiService.getBranches();
            const $select = this.$container.find('.branch-filter').empty();
            $select.append(`<option value="">${__('All Branches')}</option>`);
            branches.forEach(b => $select.append(`<option value="${b}">${b}</option>`));
            this.loadRooms();
        } catch (e) {
            this.showError(__('Failed to load branches'));
        }
    }

    async loadRooms() {
        if (this.stateService.isLoading()) return;

        this.setLoading(true);
        this.stateService.clearSelection();

        try {
            const filters = {
                branch: this.$container.find('.branch-filter').val(),
                date: this.$container.find('.date-filter').val(),
                capacity: this.$container.find('.capacity-filter').val()
            };

            const rooms = await this.apiService.getAvailableRoomsWithSlots(filters);
            this.roomList.render(rooms);
        } catch (e) {
            this.showError(__('Failed to load rooms'));
        } finally {
            this.setLoading(false);
        }
    }

    showError(message) {
        frappe.msgprint({
            title: __('Error'),
            message: message,
            indicator: 'red'
        });
    }
}