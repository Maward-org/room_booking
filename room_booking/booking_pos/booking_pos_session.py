# room_booking/booking_pos/booking_pos_session.py

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime
import json

@frappe.whitelist()
def open_booking_session(user=None, pos_profile=None, opening_balance=0):
    """افتح جلسة حجز جديدة إذا لم توجد جلسة مفتوحة لهذا المستخدم"""
    if not user:
        user = frappe.session.user
    if not pos_profile:
        frappe.throw(_("POS Profile is required"))
    if opening_balance is None:
        opening_balance = 0

    # تحقق من وجود جلسة مفتوحة لنفس المستخدم + POS Profile
    open_session = frappe.get_all(
        "Booking POS Session",
        filters={
            "user": user,
            "pos_profile": pos_profile,
            "status": "Open"
        },
        fields=["name"]
    )
    if open_session:
        frappe.throw(_("You already have an open session."))

    # أنشئ جلسة جديدة
    doc = frappe.get_doc({
        "doctype": "Booking POS Session",
        "user": user,
        "pos_profile": pos_profile,
        "opening_time": now_datetime(),
        "opening_balance": opening_balance,
        "status": "Open"
    })
    doc.insert()
    return {
        "session_id": doc.name,
        "user": doc.user,
        "opening_time": doc.opening_time,
        "opening_balance": doc.opening_balance,
        "pos_profile": doc.pos_profile,
        "status": doc.status
    }

@frappe.whitelist()
def close_booking_session(session_id, closing_balance=0):
    """اغلق جلسة الحجز الحالية واحسب ملخص الحجوزات"""
    session = frappe.get_doc("Booking POS Session", session_id)
    if session.status != "Open":
        frappe.throw(_("Session is not open."))

    session.status = "Closed"
    session.closing_time = now_datetime()
    session.closing_balance = closing_balance
    session.save()
    frappe.db.commit()

    # احسب ملخص الحجوزات/الدفعات
    bookings_count = frappe.db.count(
        "Room Booking", {
            "pos_session": session_id
        }
    )
    payments_total = frappe.db.sql("""
        SELECT SUM(amount) FROM `tabBooking Payment`
        WHERE pos_session = %s
    """, session_id)[0][0] or 0

    return {
        "session_id": session_id,
        "closed": True,
        "closing_time": session.closing_time,
        "bookings_count": bookings_count,
        "payments_total": payments_total
    }

@frappe.whitelist()
def get_open_session(user=None, pos_profile=None):
    """احصل على جلسة الحجز المفتوحة (إن وجدت)"""
    if not user:
        user = frappe.session.user
    sessions = frappe.get_all(
        "Booking POS Session",
        filters={
            "user": user,
            "pos_profile": pos_profile,
            "status": "Open"
        },
        fields=["name", "opening_time", "opening_balance"]
    )
    return sessions[0] if sessions else None
