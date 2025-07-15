frappe.provide("room_booking.RoomBooking");

/**
 * 📦 مجموعة أدوات مساعدة لنظام حجز الغرف
 * @namespace room_booking.RoomBooking.helpers
 */
room_booking.RoomBooking.helpers = {
    /**
     * حساب وقت الانتهاء بناءً على وقت البداية والمدة
     * @param {string} startTime - وقت البداية (HH:mm)
     * @param {number} durationHours - المدة بالساعات
     * @returns {string} وقت الانتهاء (HH:mm)
     */
    calculateEndTime: function(startTime, durationHours) {
        try {
            if (!startTime || isNaN(durationHours)) return '00:00';
            
            const [hours = 0, minutes = 0] = String(startTime).split(':').map(Number);
            const totalMinutes = hours * 60 + minutes + Math.round(durationHours * 60);
            const endHours = Math.floor(totalMinutes / 60) % 24;
            const endMinutes = totalMinutes % 60;
            
            return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
        } catch (error) {
            console.error('Error calculating end time:', error);
            return '00:00';
        }
    },

    /**
     * تنسيق الوقت للعرض في الواجهة الأمامية (HH:mm)
     * @param {string} timeStr - وقت بتنسيق HH:mm:ss أو HH:mm
     * @returns {string} وقت بتنسيق HH:mm
     */
    formatTimeForFrontend: function(timeStr) {
        if (!timeStr) return '00:00';
        try {
            return String(timeStr).split(':').slice(0, 2)
                .map(part => part.padStart(2, '0'))
                .join(':');
        } catch (error) {
            console.error('Error formatting time:', error);
            return '00:00';
        }
    },

    /**
     * تنسيق الوقت للتخزين في قاعدة البيانات (HH:mm:ss)
     * @param {string} timeStr - وقت بتنسيق HH:mm
     * @returns {string} وقت بتنسيق HH:mm:ss
     */
    formatTimeForBackend: function(timeStr) {
        return `${this.formatTimeForFrontend(timeStr)}:00`;
    },

    /**
     * التحقق من صحة تنسيق الوقت
     * @param {string} timeStr - وقت للتحقق منه
     * @returns {boolean} true إذا كان التنسيق صحيحاً
     */
    validateTimeFormat: function(timeStr) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr);
    },

    /**
     * تنسيق المبلغ المالي حسب العملة
     * @param {number} amount - المبلغ المالي
     * @param {string} [currency='SAR'] - رمز العملة
     * @param {string} [locale='ar-SA'] - اللغة المحلية
     * @returns {string} المبلغ المنسق
     */
    formatCurrency: function(amount, currency = 'SAR', locale = 'ar-SA') {
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount || 0);
        } catch (error) {
            console.error('Error formatting currency:', error);
            return `${(amount || 0).toFixed(2)} ${currency}`;
        }
    },

    /**
     * حساب المدة بين وقتين بدقة
     * @param {string} start - وقت البداية (HH:mm)
     * @param {string} end - وقت النهاية (HH:mm)
     * @returns {string} المدة بتنسيق HH:mm
     */
    calculateDuration: function(start, end) {
        try {
            const startDate = new Date(`2000-01-01T${start}:00`);
            const endDate = new Date(`2000-01-01T${end}:00`);
            const diffMs = endDate - startDate;
            
            if (diffMs <= 0) return '00:00';
            
            const totalMinutes = Math.floor(diffMs / (1000 * 60));
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } catch (error) {
            console.error('Error calculating duration:', error);
            return '00:00';
        }
    },

    /**
     * تحويل المدة من تنسيق HH:mm إلى دقائق
     * @param {string} duration - المدة بتنسيق HH:mm
     * @returns {number} المدة بالدقائق
     */
    durationToMinutes: function(duration) {
        try {
            const [hours = 0, minutes = 0] = String(duration).split(':').map(Number);
            return hours * 60 + minutes;
        } catch (error) {
            console.error('Error converting duration:', error);
            return 0;
        }
    },

    /**
     * تحميل مكتبة خارجية بشكل ديناميكي
     * @param {string} url - رابط المكتبة
     * @param {string} [type='script'] - نوع المكتبة (script/css)
     * @returns {Promise} Promise يحل عند نجاح التحميل
     */
    loadLibrary: function(url, type = 'script') {
        return new Promise((resolve, reject) => {
            try {
                let element;
                if (type === 'script') {
                    element = document.createElement('script');
                    element.src = url;
                    element.onload = resolve;
                    element.onerror = reject;
                } else if (type === 'css') {
                    element = document.createElement('link');
                    element.rel = 'stylesheet';
                    element.href = url;
                    element.onload = resolve;
                    element.onerror = reject;
                }
                
                if (element) {
                    document.head.appendChild(element);
                } else {
                    reject(new Error('نوع المكتبة غير معروف'));
                }
            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * إدارة الجلسة المؤقتة
     * @param {string} key - مفتاح الجلسة
     * @param {*} [value] - قيمة الجلسة (إذا لم يتم توفيره، يتم استرجاع القيمة)
     * @param {number} [expiry] - مدة الانتهاء بالثواني
     * @returns {*} قيمة الجلسة إذا كان key فقط
     */
    session: function(key, value, expiry = 3600) {
        try {
            if (value === undefined) {
                // استرجاع القيمة
                const item = localStorage.getItem(key);
                if (!item) return null;
                
                const { value: storedValue, expiry: storedExpiry } = JSON.parse(item);
                if (storedExpiry && Date.now() > storedExpiry) {
                    localStorage.removeItem(key);
                    return null;
                }
                return storedValue;
            } else {
                // تخزين القيمة
                const item = {
                    value,
                    expiry: expiry ? Date.now() + (expiry * 1000) : null
                };
                localStorage.setItem(key, JSON.stringify(item));
                return value;
            }
        } catch (error) {
            console.error('Error managing session:', error);
            return null;
        }
    },

    /**
     * معالجة الأخطاء وعرض رسائل للمستخدم
     * @param {Error} error - كائن الخطأ
     * @param {string} [customMessage] - رسالة مخصصة
     */
    handleError: function(error, customMessage) {
        console.error('System Error:', error);
        
        const userMessage = customMessage || __('حدث خطأ في النظام. يرجى المحاولة لاحقاً.');
        frappe.msgprint({
            title: __('خطأ'),
            message: userMessage,
            indicator: 'red'
        });
        
        // يمكن إضافة إرسال تقرير الخطأ للخادم هنا
    },

    /**
     * إنشاء معرف فريد
     * @param {string} [prefix] - بادئة للتعريف
     * @returns {string} معرف فريد
     */
    generateId: function(prefix = '') {
        return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * تحميل أيقونات FontAwesome ديناميكياً
     * @param {string[]} icons - قائمة الأيقونات المطلوبة
     */
    loadIcons: function(icons) {
        try {
            if (!Array.isArray(icons) || !icons.length) return;
            
            const iconLoader = document.createElement('div');
            iconLoader.style.display = 'none';
            iconLoader.innerHTML = icons.map(icon => 
                `<i class="fa ${icon}"></i>`
            ).join('');
            document.body.appendChild(iconLoader);
        } catch (error) {
            console.error('Error loading icons:', error);
        }
    },

    /**
     * تحويل التاريخ لتنسيق قابل للقراءة
     * @param {string} dateStr - تاريخ بتنسيق YYYY-MM-DD
     * @returns {string} تاريخ منسق حسب لغة المستخدم
     */
    formatDate: function(dateStr) {
        try {
            return frappe.datetime.str_to_user(dateStr);
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateStr || '';
        }
    },

    /**
     * التحقق من توفر الفترة الزمنية
     * @param {string} startTime - وقت البداية
     * @param {string} endTime - وقت النهاية
     * @param {string[]} bookedSlots - الفترات المحجوزة
     * @returns {boolean} true إذا كانت الفترة متاحة
     */
    isSlotAvailable: function(startTime, endTime, bookedSlots = []) {
        try {
            const newStart = new Date(`2000-01-01T${startTime}:00`);
            const newEnd = new Date(`2000-01-01T${endTime}:00`);
            
            if (newStart >= newEnd) return false;
            
            return !bookedSlots.some(slot => {
                const slotStart = new Date(`2000-01-01T${slot.start}:00`);
                const slotEnd = new Date(`2000-01-01T${slot.end}:00`);
                return (newStart < slotEnd && newEnd > slotStart);
            });
        } catch (error) {
            console.error('Error checking slot availability:', error);
            return false;
        }
    }
};

// تحميل الأيقونات الأساسية عند التهيئة
room_booking.RoomBooking.helpers.loadIcons([
    'fa-door-open',
    'fa-calendar',
    'fa-clock',
    'fa-user',
    'fa-money-bill-wave',
    'fa-check-circle',
    'fa-times-circle',
    'fa-sync-alt',
    'fa-plus',
    'fa-edit',
    'fa-eye'
]);