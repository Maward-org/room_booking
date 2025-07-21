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
            user: frappe.session.user,
        });
    }

    async prepare_app_defaults(data) {
        const app = this.app;
        app.pos_opening = data.name;
        app.company = data.company;
        app.pos_profile = data.pos_profile;
        app.pos_opening_time = data.period_start_date;
        app.item_stock_map = {};
        app.settings = {};

        frappe.call({
            method: "erpnext.selling.page.point_of_sale.point_of_sale.get_pos_profile_data",
            args: { pos_profile: app.pos_profile },
            callback: (res) => {
                const profile = res.message;
                Object.assign(app.settings, profile);
                app.settings.customer_groups = profile.customer_groups.map((group) => group.name);
            },
        });

        frappe.realtime.on(`poe_${app.pos_opening}_closed`, (data) => {
            const route = frappe.get_route_str();
            if (data && route === "roombooking") {
                frappe.dom.freeze();
                frappe.msgprint({
                    title: __("POS Closed"),
                    indicator: "orange",
                    message: __("POS has been closed at {0}. Please refresh the page.", [
                        frappe.datetime.str_to_user(data.creation).bold(),
                    ]),
                    primary_action_label: __("Refresh"),
                    primary_action: {
                        action() {
                            window.location.reload();
                        },
                    },
                });
            }
        });
    }

    create_opening_voucher() {
        const app = this.app;
        const table_fields = [
            {
                fieldname: "mode_of_payment",
                fieldtype: "Link",
                in_list_view: 1,
                label: __("Mode of Payment"),
                options: "Mode of Payment",
                reqd: 1,
            },
            {
                fieldname: "opening_amount",
                fieldtype: "Currency",
                in_list_view: 1,
                label: __("Opening Amount"),
                options: "company:company_currency",
                onchange: function () {
                    dialog.fields_dict.balance_details.df.data.some((d) => {
                        if (d.idx === this.doc.idx) {
                            d.opening_amount = this.value;
                            dialog.fields_dict.balance_details.grid.refresh();
                            return true;
                        }
                    });
                },
            },
        ];

        const fetch_pos_payment_methods = () => {
            const pos_profile = dialog.fields_dict.pos_profile.get_value();
            if (!pos_profile) return;
            frappe.db.get_doc("POS Profile", pos_profile).then(({ payments }) => {
                dialog.fields_dict.balance_details.df.data = [];
                payments.forEach((pay) => {
                    dialog.fields_dict.balance_details.df.data.push({
                        mode_of_payment: pay.mode_of_payment,
                        opening_amount: "0",
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
                    reqd: 1,
                },
                {
                    fieldtype: "Link",
                    label: __("POS Profile"),
                    options: "POS Profile",
                    fieldname: "pos_profile",
                    reqd: 1,
                    get_query: () => pos_profile_query(),
                    onchange: () => fetch_pos_payment_methods(),
                },
                {
                    fieldname: "balance_details",
                    fieldtype: "Table",
                    label: __("Opening Balance Details"),
                    cannot_add_rows: false,
                    in_place_edit: true,
                    reqd: 1,
                    data: [],
                    fields: table_fields,
                },
            ],
            primary_action: async function ({ company, pos_profile, balance_details }) {
                if (!balance_details.length) {
                    frappe.show_alert({
                        message: __("Please add Mode of payments and opening balance details."),
                        indicator: "red",
                    });
                    return frappe.utils.play_sound("error");
                }

                balance_details = balance_details.filter((d) => d.mode_of_payment);

                const res = await frappe.call({
                    method: "erpnext.selling.page.point_of_sale.point_of_sale.create_opening_voucher",
                    args: { pos_profile, company, balance_details },
                    freeze: true,
                });

                if (!res.exc) app.prepare_app_defaults(res.message);
                dialog.hide();
            },
            primary_action_label: __("Submit"),
        });

        dialog.show();

        const pos_profile_query = () => {
            return {
                query: "erpnext.accounts.doctype.pos_profile.pos_profile.pos_profile_query",
                filters: { company: dialog.fields_dict.company.get_value() },
            };
        };
    }
    close_pos() {
		if (!this.$components_wrapper.is(":visible")) return;

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
