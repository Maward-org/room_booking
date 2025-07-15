# room_booking/booking_pos/booking_invoice.py

import frappe
from frappe import _
import json

@frappe.whitelist()
def book_and_create_invoice(booking_data, pos_session_id):
    """
    تأكيد حجز غرفة وإنشاء فاتورة POS (Sales Invoice) مربوطة بجلسة POS.
    booking_data: dict (بيانات الحجز: room_item_code, room_name, date, start_time, end_time, customer, amount, mode_of_payment)
    pos_session_id: رقم جلسة POS Opening Entry
    """
    # التعامل مع البيانات إذا أرسلت كسلسلة نصية
    if isinstance(booking_data, str):
        booking_data = json.loads(booking_data)

    # تحقق من المدخلات الأساسية
    required = ["room_item_code", "room_name", "date", "start_time", "end_time", "customer", "amount"]
    for field in required:
        if not booking_data.get(field):
            frappe.throw(_("Missing booking field: {0}").format(field))

    # جلب POS Profile من جلسة POS
    pos_profile = frappe.db.get_value("POS Opening Entry", pos_session_id, "pos_profile")
    if not pos_profile:
        frappe.throw(_("POS Profile not found for POS Session"))

    # إعداد بيانات الفاتورة
    invoice = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": booking_data["customer"],
        "pos_profile": pos_profile,
        "is_pos": 1,
        "set_posting_time": 1,
        "posting_date": booking_data["date"],
        "posting_time": booking_data["start_time"],
        "items": [{
            "item_code": booking_data["room_item_code"],  # معرف المنتج الذي يمثل الغرفة
            "qty": 1,
            "rate": booking_data["amount"],
            "description": f"Room: {booking_data['room_name']}, {booking_data['start_time']} - {booking_data['end_time']}"
        }],
        "payments": [{
            "mode_of_payment": booking_data.get("mode_of_payment", "Cash"),
            "amount": booking_data["amount"]
        }],
        "pos_opening_entry": pos_session_id,
        # أضف أي حقول مخصصة تربط الفاتورة بالحجز إن لزم
    })

    invoice.insert()
    invoice.submit()

    return {
        "invoice_name": invoice.name,
        "invoice_url": f"/app/sales-invoice/{invoice.name}"
    }
