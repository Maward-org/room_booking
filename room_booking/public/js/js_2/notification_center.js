frappe.provide("room_booking.RoomBooking");

/**
 * 🔔 نظام إشعارات متطور مع تأثيرات مرئية
 */
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
        
        $('body').append(this.container);
        this.bindEvents();
    }

    initSound() {
        this.sounds = {
            info: new Audio('/assets/room_booking/sounds/notification.mp3'),
            success: new Audio('/assets/room_booking/sounds/success.mp3'),
            error: new Audio('/assets/room_booking/sounds/error.mp3')
        };
    }

    show(message, type='info', duration=3000) {
        const id = Date.now();
        const notification = $(`
            <div class="notification ${type}" data-id="${id}">
                <i class="fa ${this.getIcon(type)}"></i>
                <div class="message">${message}</div>
                <button class="btn-close"><i class="fa fa-times"></i></button>
            </div>
        `);

        // إضافة للإشعارات العاجلة
        if (type === 'urgent') {
            this.container.find('.notifications-dropdown').prepend(notification);
        } else {
            this.container.find('.notifications-dropdown').append(notification);
        }

        // تأثير الظهور
        notification.hide().fadeIn(200);

        // تشغيل الصوت
        if (this.sounds[type]) {
            this.sounds[type].cloneNode(true).play();
        }

        // التحديث التلقائي
        this.updateBadge();

        // الإخفاء التلقائي
        if (duration > 0) {
            setTimeout(() => {
                notification.fadeOut(() => notification.remove());
                this.updateBadge();
            }, duration);
        }

        // تخزين الإشعار
        this.notifications.push({ id, message, type, timestamp: new Date() });
    }

    getIcon(type) {
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle',
            urgent: 'fa-bell'
        };
        return icons[type] || icons.info;
    }

    updateBadge() {
        const count = this.container.find('.notification').length;
        this.container.find('.badge').text(count).toggle(count > 0);
    }

    bindEvents() {
        // فتح/إغلاق قائمة الإشعارات
        this.container.find('.notification-bell').click(() => {
            this.container.find('.notifications-dropdown').toggleClass('show');
        });

        // إغلاق إشعار يدوياً
        this.container.on('click', '.btn-close', (e) => {
            $(e.currentTarget).closest('.notification').fadeOut(() => {
                $(e.currentTarget).remove();
                this.updateBadge();
            });
        });
    }
};