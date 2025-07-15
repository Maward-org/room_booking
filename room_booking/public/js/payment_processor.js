frappe.provide("room_booking.RoomBooking");

/**
 * 💳 نظام معالجة الدفع - مع دفع QR ومدفوعات متعددة
 */
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
                id: 'cash',
                name: __('نقدي'),
                icon: 'fa-money-bill-wave',
                handler: () => this.processCashPayment()
            },
            {
                id: 'credit_card',
                name: __('بطاقة ائتمان'),
                icon: 'fa-credit-card',
                handler: () => this.processCardPayment()
            },
            {
                id: 'qr_payment',
                name: __('دفع بالQR'),
                icon: 'fa-qrcode',
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
            title: __('إتمام الدفع'),
            size: 'extra-large',
            fields: [
                {
                    fieldname: 'payment_method',
                    label: __('طريقة الدفع'),
                    fieldtype: 'Select',
                    options: this.paymentMethods.map(m => m.name).join('\n'),
                    default: this.paymentMethods[0].name,
                    reqd: 1
                },
                {
                    fieldname: 'qr_container',
                    label: __('مسح QR Code'),
                    fieldtype: 'HTML',
                    depends_on: "eval:doc.payment_method == 'دفع بالQR'",
                    html: `<div class="qr-payment-container">
                              <div class="qr-code"></div>
                              <p>${__('استخدم تطبيق البنك لمسح الكود')}</p>
                           </div>`
                },
                {
                    fieldname: 'split_payment',
                    label: __('تقسيم الدفع'),
                    fieldtype: 'Check',
                    description: __('استخدام أكثر من طريقة دفع')
                },
                {
                    fieldname: 'split_methods',
                    label: __('طرق الدفع الإضافية'),
                    fieldtype: 'Table',
                    depends_on: "eval:doc.split_payment",
                    fields: [
                        {
                            fieldname: 'method',
                            label: __('الطريقة'),
                            fieldtype: 'Select',
                            options: this.paymentMethods.map(m => m.name).join('\n')
                        },
                        {
                            fieldname: 'amount',
                            label: __('المبلغ'),
                            fieldtype: 'Currency'
                        }
                    ]
                }
            ],
            primary_action: (values) => this.processPayment(values),
            primary_action_label: __('تأكيد الدفع')
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
                frappe.msgprint(__('فشل في عملية الدفع'));
            }
        } catch (error) {
            console.error("Payment error:", error);
            frappe.msgprint(__('حدث خطأ أثناء المعالجة'));
        } finally {
            this.dialog.hide();
        }
    }

    // ... (طرق الدفع الأخرى)
};