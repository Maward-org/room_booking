import frappe
import json
from frappe import _
from datetime import datetime, timedelta
from frappe.utils import get_datetime, get_time, getdate, now_datetime, cint, flt

# --------------------------
# جلب قائمة الفروع النشطة
# --------------------------
@frappe.whitelist()
def get_branches():
    """Get list of all active branches."""
    return frappe.get_all("Branch", filters={"disabled": 0}, pluck="name")

# --------------------------
# جلب كل الغرف مع الفترات الزمنية المتاحة ليوم محدد (مع الحالات)
# --------------------------
@frappe.whitelist()
def get_available_rooms_with_slots(date=None, branch=None, capacity=None):
    """
    إرجاع جميع الغرف في الفرع المختار، مع الفترات الزمنية (slots) وحالتها (متاح، محجوز، منتهي) لليوم المحدد.
    """
    date = getdate(date or frappe.utils.today())
    filters = {"status": "Available"}
    if branch:
        filters["branch"] = branch
    if capacity:
        filters["no_of_seats"] = [">=", cint(capacity)]

    rooms = frappe.get_all(
        "Rental Room",
        filters=filters,
        fields=[
            "name", "room_name", "branch", "status", "no_of_seats",
            "description", "room_code", "location", "start_time",
            "end_time", "period_duration", "price_per_hour"
        ]
    )

    for room in rooms:
        room["available_slots"] = get_room_slots_for_date(room["name"], date, room)

    return rooms

def get_room_slots_for_date(room_name, date, room_doc=None):
    """
    توليد وتصنيف كل الفترات الزمنية للغرفة في تاريخ معين، مع حالة كل فترة (متاح، محجوز، منتهي)
    """
    if not room_doc:
        room_doc = frappe.get_cached_doc("Rental Room", room_name)

    opening_time = get_time(room_doc.start_time or "08:00:00")
    closing_time = get_time(room_doc.end_time or "22:00:00")
    period_duration = cint(room_doc.get("period_duration") or 60)

    now = now_datetime()
    booking_date = getdate(date)
    start_time = max(opening_time, now.time()) if booking_date == now.date() else opening_time

    slots = generate_time_slots(booking_date, start_time, closing_time, period_duration)
    existing_bookings = get_existing_bookings(room_name, booking_date)

    classified_slots = []
    for slot in slots:
        status = classify_slot(slot, existing_bookings, now if booking_date == now.date() else None)
        classified_slots.append({
            "start_time": slot["start"].strftime("%H:%M"),
            "end_time": slot["end"].strftime("%H:%M"),
            "price": calculate_slot_price(room_doc, period_duration),
            "status": status,
            "booked": status == "Booked",
            "expired": status == "Expired"
        })

    return merge_consecutive_slots(classified_slots)

def generate_time_slots(date, start_time, end_time, duration_minutes):
    """
    توليد فترات زمنية (slots) بين وقت البداية والنهاية حسب مدة الفترة (مثلاً 60 دقيقة)
    """
    slots = []
    current = datetime.combine(date, start_time)
    end_dt = datetime.combine(date, end_time)
    while current + timedelta(minutes=duration_minutes) <= end_dt:
        slot_end = current + timedelta(minutes=duration_minutes)
        slots.append({"start": current, "end": slot_end})
        current = slot_end
    return slots

def get_existing_bookings(room, date):
    """
    إرجاع جميع الحجوزات الفعالة للغرفة في ذلك اليوم
    """
    return frappe.db.sql("""
        SELECT start_time, end_time 
        FROM `tabRoom Booking`
        WHERE rental_room = %(room)s
          AND booking_date = %(date)s
          AND reservation_status NOT IN ('Cancelled', 'Completed')
    """, {"room": room, "date": date}, as_dict=1)

def classify_slot(slot, existing_bookings, current_datetime=None):
    """
    تحديد حالة الفترة الزمنية: متاح / محجوز / منتهي
    """
    for booking in existing_bookings:
        booking_start = get_time(booking.start_time)
        booking_end = get_time(booking.end_time)
        if not (slot["end"].time() <= booking_start or slot["start"].time() >= booking_end):
            return "Booked"
    if current_datetime and slot["end"] <= current_datetime:
        return "Expired"
    return "Available"

def calculate_slot_price(room_doc, period_duration):
    """حساب سعر الفترة الزمنية"""
    try:
        return flt(room_doc.price_per_hour) * (period_duration / 60)
    except Exception:
        return 0

def merge_consecutive_slots(slots):
    """
    دمج الفترات المتتالية (متاحة أو منتهية) بنفس الحالة والتوقيت المتصل. تبقى الفترات المحجوزة منفصلة.
    """
    if not slots:
        return []
    merged = []
    current = slots[0].copy()
    for slot in slots[1:]:
        if (slot["status"] == current["status"] and 
            slot["status"] in ["Available", "Expired"] and
            slot["start_time"] == current["end_time"]):
            current["end_time"] = slot["end_time"]
            current["price"] += slot["price"]
        else:
            merged.append(current)
            current = slot.copy()
    merged.append(current)
    return merged

# --------------------------
# التحقق من توافر الفترة
# --------------------------
@frappe.whitelist()
def check_slot_availability(room, date, start_time, end_time):
    """
    التحقق من عدم وجود تعارض مع حجوزات سابقة في الفترة المطلوبة
    """
    if not all([room, date, start_time, end_time]):
        return False

    if not frappe.db.exists("Rental Room", room):
        return False

    start_dt = datetime.combine(getdate(date), get_time(start_time))
    end_dt = datetime.combine(getdate(date), get_time(end_time))

    if start_dt >= end_dt:
        return False

    existing_bookings = frappe.db.sql("""
        SELECT start_time, end_time 
        FROM `tabRoom Booking`
        WHERE rental_room = %(room)s
          AND booking_date = %(date)s
          AND reservation_status NOT IN ('Cancelled', 'Completed')
          AND docstatus = 1
    """, {"room": room, "date": date}, as_dict=1)

    for booking in existing_bookings:
        booking_start = datetime.combine(getdate(date), get_time(booking.start_time))
        booking_end = datetime.combine(getdate(date), get_time(booking.end_time))
        if not (end_dt <= booking_start or start_dt >= booking_end):
            return False

    return True

# --------------------------
# إنشاء الحجز
# --------------------------
@frappe.whitelist()
def create_booking(bookings):
    """
    إنشاء حجز أو عدة حجوزات دفعة واحدة
    bookings: list of dicts {rental_room, start_datetime, end_datetime, customer_name, amount, notes}
    """
    if isinstance(bookings, str):
        try:
            bookings = json.loads(bookings)
        except ValueError:
            frappe.throw(_("Invalid bookings data format"))

    if not isinstance(bookings, list):
        frappe.throw(_("Bookings should be a list of booking objects"))

    results = []
    for booking in bookings:
        required_fields = ['rental_room', 'start_datetime', 'end_datetime', 'customer_name']
        missing = [f for f in required_fields if f not in booking]
        if missing:
            frappe.throw(_("Missing fields: {0}").format(", ".join(missing)))

        start_dt = get_datetime(booking['start_datetime'])
        end_dt = get_datetime(booking['end_datetime'])

        if start_dt >= end_dt:
            frappe.throw(_("End time must be after start time"))

        if start_dt < now_datetime():
            frappe.throw(_("Cannot book in the past"))

        # التحقق من عدم وجود تعارض
        ok = check_slot_availability(
            booking['rental_room'],
            start_dt.date(),
            start_dt.time().strftime("%H:%M"),
            end_dt.time().strftime("%H:%M")
        )
        if not ok:
            frappe.throw(_("Selected time slot is already booked."))

        doc = frappe.get_doc({
            'doctype': 'Room Booking',
            'rental_room': booking['rental_room'],
            'booking_date': start_dt.date(),
            'start_time': start_dt.time().strftime("%H:%M:%S"),
            'end_time': end_dt.time().strftime("%H:%M:%S"),
            'duration_hours': (end_dt - start_dt).total_seconds() / 3600,
            'customer_name': booking['customer_name'],
            'customer_phone': booking.get('customer_phone'),
            'total_amount': flt(booking.get('amount', 0)),
            'notes': booking.get('notes', ''),
            'status': 'Confirmed'
        })
        doc.insert()
        doc.submit()
        results.append(doc.name)

    return {
        'success': True,
        'message': _('Successfully created {0} bookings').format(len(results)),
        'bookings': results
    }

# --------------------------
# تحديث حالة الحجز (تأكيد/إلغاء)
# --------------------------
@frappe.whitelist()
def update_booking_status(booking_id, status):
    """
    تحديث حالة الحجز (Confirmed, Cancelled)
    """
    booking = frappe.get_doc("Room Booking", booking_id)
    if status not in ["Confirmed", "Cancelled"]:
        frappe.throw(_("Invalid status"))
    booking.reservation_status = status
    booking.save()
    frappe.db.commit()
    return True

# --------------------------
# إلغاء حجز
# --------------------------
@frappe.whitelist()
def cancel_booking(booking_id):
    doc = frappe.get_doc("Room Booking", booking_id)
    doc.cancel()
    return True

# --------------------------
# جلب العملاء (للبحث/الاختيار)
# --------------------------
@frappe.whitelist()
def get_customers():
    return frappe.db.get_all("Customer", fields=["name", "customer_name"])



@frappe.whitelist()
def check_opening_entry(user=None, pos_profile=None):
    filters = {"status": "Open", "docstatus": 1}
    if user:
        filters["user"] = user
    if pos_profile:
        filters["pos_profile"] = pos_profile
    entries = frappe.get_all(
        "POS Opening Entry",
        filters=filters,
        fields=["name", "pos_profile", "company", "user", "opening_amount", "opening_date", "period_start_date", "status"]
    )
    return entries

@frappe.whitelist()
def create_opening_voucher(pos_profile, company, balance_details):
    balance_details = json.loads(balance_details) if isinstance(balance_details, str) else balance_details
    new_pos_opening = frappe.get_doc({
        "doctype": "POS Opening Entry",
        "period_start_date": frappe.utils.get_datetime(),
        "posting_date": frappe.utils.getdate(),
        "user": frappe.session.user,
        "pos_profile": pos_profile,
        "company": company,
    })
    new_pos_opening.set("balance_details", balance_details)
    new_pos_opening.submit()
    return new_pos_opening.as_dict()

@frappe.whitelist()
def get_opening_entry(pos_profile=None, user=None, company=None):
    filters = {"docstatus": 1, "status": "Open"}
    if pos_profile:
        filters["pos_profile"] = pos_profile
    if user:
        filters["user"] = user
    if company:
        filters["company"] = company
    entry = frappe.get_all(
        "POS Opening Entry",
        filters=filters,
        fields=["name", "pos_profile", "company", "user", "opening_date", "status", "period_start_date"]
    )
    return entry[0] if entry else None

@frappe.whitelist()
def get_pos_profile_data(pos_profile):
    pos_profile = frappe.get_doc("POS Profile", pos_profile)
    return pos_profile.as_dict()