frappe.provide("room_booking.RoomBooking");

/**
 * 🖥️ نظام إدارة تجهيزات الغرف مع معاينة حية
 */
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
                method: 'room_booking.api.get_room_equipment',
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
                <h4><i class="fa fa-tv"></i> ${__('تجهيزات الغرفة')}</h4>
                <div class="equipment-grid"></div>
                <div class="equipment-preview">
                    <div class="preview-placeholder">
                        ${__('اختر جهازاً للمعاينة')}
                    </div>
                </div>
            </div>
        `);

        this.equipment.forEach(item => {
            this.container.find('.equipment-grid').append(`
                <div class="equipment-item" data-id="${item.name}">
                    <i class="fa ${item.icon || 'fa-cube'}"></i>
                    <span>${item.equipment_name}</span>
                </div>
            `);
        });

        this.bindEvents();
    }

    bindEvents() {
        this.container.on('click', '.equipment-item', (e) => {
            const equipmentId = $(e.currentTarget).data('id');
            this.showPreview(equipmentId);
        });
    }

    showPreview(equipmentId) {
        const item = this.equipment.find(e => e.name === equipmentId);
        if (!item) return;

        this.container.find('.equipment-preview').html(`
            <div class="preview-content">
                <h5>${item.equipment_name}</h5>
                <div class="preview-image">
                    <img src="${item.image || '/assets/room_booking/images/equipment_placeholder.jpg'}" 
                         alt="${item.equipment_name}">
                </div>
                <div class="preview-details">
                    <p><strong>${__('النوع')}:</strong> ${item.equipment_type}</p>
                    <p><strong>${__('الكمية')}:</strong> ${item.quantity}</p>
                    <p><strong>${__('الحالة')}:</strong> ${item.status}</p>
                    <p class="description">${item.description || __('لا يوجد وصف متاح')}</p>
                </div>
            </div>
        `);
    }
};