// room_booking/public/js/booking_pos.js
console.log("Loading Booking POS page...");
frappe.provide("room_booking.RoomBooking");

frappe.pages['room_booking_pos'].on_page_load = function(wrapper) {
    new RoomBookingPOS(wrapper);
};

class RoomBookingPOS {
    constructor(wrapper) {
        this.wrapper = wrapper;
        this.session_id = null;    // رقم جلسة POS Opening Entry الحالية
        this.pos_profile = null;   // POS Profile المختارة
        this.company = null;       // الشركة الحالية
        this.user = frappe.session.user;
        this.page = frappe.ui.make_app_page({
            parent: wrapper,
            title: __('Room Booking POS'),
            single_column: true
        });

        this.init();
    }

    async init() {
        this.pos_profile = await this.getDefaultPOSProfile();
        this.company = frappe.defaults.get_default('company');
        // تحقق من وجود جلسة POS مفتوحة أو اطلب فتحها
        await this.ensureOpenPOSSession();
        // هنا تكمل تحميل باقي عناصر الصفحة (الغرف، الفترات...) بعد التأكد من وجود شفت مفتوح
        this.setupUI();
    }

    async getDefaultPOSProfile() {
        // جلب POS Profile الافتراضية (يمكنك تخصيصه أكثر حسب شركتك)
        const profiles = await frappe.db.get_list('POS Profile', {
            fields: ['name'],
            limit: 1,
            filters: { user: frappe.session.user }
        });
        if (profiles && profiles.length) return profiles[0].name;
        // أو ضع اسم بروفايل افتراضي
        return null;
    }

    async ensureOpenPOSSession() {
        // استدعاء دالة backend للبحث عن جلسة POS مفتوحة
        let res = await frappe.call({
            method: 'erpnext.accounts.doctype.pos_opening_entry.pos_opening_entry.get_opening_entry',
            args: { pos_profile: this.pos_profile }
        });
        if (res.message && res.message.name) {
            this.session_id = res.message.name;
            return true;
        }

        // إذا لا يوجد جلسة مفتوحة، أطلب من المستخدم فتح جلسة
        await this.openSessionDialog();
    }

    async openSessionDialog() {
        return new Promise((resolve) => {
            let dialog = new frappe.ui.Dialog({
                title: __("Open POS Session"),
                fields: [
                    {
                        label: __("POS Profile"),
                        fieldname: "pos_profile",
                        fieldtype: "Link",
                        options: "POS Profile",
                        reqd: 1,
                        default: this.pos_profile
                    },
                    {
                        label: __("Opening Cash"),
                        fieldname: "opening_cash",
                        fieldtype: "Currency",
                        reqd: 1,
                        default: 0
                    }
                ],
                primary_action_label: __("Open Session"),
                primary_action: async (values) => {
                    let r = await frappe.call({
                        method: "erpnext.accounts.doctype.pos_opening_entry.pos_opening_entry.open_cash_register",
                        args: {
                            pos_profile: values.pos_profile,
                            opening_amount: values.opening_cash
                        }
                    });
                    if (r.message && r.message.name) {
                        this.session_id = r.message.name;
                        frappe.show_alert({
                            message: __("POS session opened successfully!"),
                            indicator: "green"
                        });
                        dialog.hide();
                        resolve(true);
                    } else {
                        frappe.msgprint(__("Failed to open POS session"));
                    }
                }
            });
            dialog.show();
        });
    }

    setupUI() {
        // هنا تكتب الكود الخاص بعرض الغرف والفترات وإكمال عملية الحجز (الخطوة القادمة)
        // مثلاً:
        $(this.wrapper).find('.layout-main-section').html(`
            <div class="alert alert-success">
                POS Session: ${this.session_id} - POS Profile: ${this.pos_profile}
            </div>
            <!-- أكمل بناء واجهة اختيار الغرف والفترات والحجز... -->
        `);
    }
}
