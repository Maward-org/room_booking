class SummarySection {
    constructor(app) {
        this.app = app;
        this.$container = null;
    }

    init($container) {
        this.$container = $container;
        this.$container.html(`
            <div class="selection-summary alert alert-info" style="display:none;">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${__('Selected')}:</strong> 
                        <span class="selected-period"></span> | 
                        <span class="selected-duration"></span> | 
                        <span class="selected-price"></span>
                    </div>
                    <button class="btn btn-primary btn-book">${__('Book Now')}</button>
                </div>
            </div>
        `);

        this.$container.on('click', '.btn-book', () => this.app.bookingDialog.open());
    }

    update() {
        const selectedSlots = this.app.stateService.getSelectedSlots();
        const selectedRoom = this.app.stateService.getSelectedRoom();

        if (!selectedSlots.length) {
            this.$container.find('.selection-summary').hide();
            return;
        }

        const first = selectedSlots[0];
        const last = selectedSlots[selectedSlots.length - 1];

        const start = new Date(`2000-01-01T${first.start}:00`);
        const end = new Date(`2000-01-01T${last.end}:00`);
        const durationMinutes = (end - start) / 60000;
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        let durationText = '';
        if (hours > 0) durationText += `${hours} ${__('hours')} `;
        if (minutes > 0) durationText += `${minutes} ${__('minutes')}`;

        const totalPrice = selectedSlots.reduce((sum, slot) => sum + slot.price, 0);

        this.$container.find('.selected-period').text(
            `${this.app.apiService.formatTimeForFrontend(first.start)} - ${this.app.apiService.formatTimeForFrontend(last.end)}`
        );
        this.$container.find('.selected-duration').text(durationText);
        this.$container.find('.selected-price').text(this.app.apiService.formatCurrency(totalPrice));
        this.$container.find('.selection-summary').show();
    }

    hide() {
        this.$container.find('.selection-summary').hide();
    }
}