frappe.provide("room_booking.RoomBooking");

/**
 * مجموعة أدوات مساعدة لنظام حجز الغرف
 * @namespace room_booking.RoomBooking.helpers
 */
room_booking.RoomBooking.helpers = {

    formatTimeForFrontend(timeStr) {
        if (!timeStr) return '00:00';
        try {
            const [hours, minutes] = String(timeStr).split(':');
            return `${hours.padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}`;
        } catch (e) {
            console.error('Invalid time format:', timeStr);
            return '00:00';
        }
    },

    formatTimeForBackend(timeStr) {
        if (!timeStr) return '00:00:00';
        return `${this.formatTimeForFrontend(timeStr)}:00`;
    },
    validateTimeFormat(timeStr) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr);
    },

    createDateFromTime(timeStr) {
        if (!timeStr) return null;
        try {
            return new Date(`2000-01-01T${timeStr}`);
        } catch (e) {
            console.error('Invalid time string:', timeStr);
            return null;
        }
    },
    formatCurrency: (amount, currency = 'SAR') => {

            return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    // حساب المدة بين وقتين بدقة
    calculateDuration: (start, end) => {
        const startDate = new Date(`2000-01-01T${start}`);
        const endDate = new Date(`2000-01-01T${end}`);
        const diffMs = endDate - startDate;
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    },

    // إنشاء معرف فريد للحجوزات
    generateBookingId: () => {
        return `booking_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    },

    // تحويل التاريخ لتنسيق قابل للقراءة
    formatDateForDisplay: (dateStr) => {
        return frappe.datetime.str_to_user(dateStr);
    },

    // تحميل أيقونات FontAwesome ديناميكياً
    loadIcons: (icons) => {
        const iconLoader = document.createElement('div');
        iconLoader.style.display = 'none';
        icons.forEach(icon => {
            iconLoader.innerHTML += `<i class="fa ${icon}"></i>`;
        });
        document.body.appendChild(iconLoader);
    },

    // عرض مؤشر تحميل متقدم
    showLoading: (message = 'جاري التحميل...') => {
        const loader = $(`
            <div class="custom-loader">
                <div class="loader-animation"></div>
                <p>${message}</p>
            </div>
        `);
        $('body').append(loader);
        return {
            hide: () => loader.remove()
        };
    }

};