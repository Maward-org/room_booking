

import frappe
from frappe import _
from frappe.utils import getdate, now_datetime, cint, get_time, get_datetime, flt
from datetime import datetime, time, timedelta
import json

@frappe.whitelist()
def get_available_slots(room, date, current_time=None):
    """
    Return all time slots with status (available/booked/expired) for a given room and date.
    """
    try:
        if not room or not date:
            frappe.throw(_("Room and date are required"))

        if not frappe.db.exists("Rental Room", room):
            frappe.throw(_("Room does not exist"))

        booking_date = getdate(date)
        today = getdate()

        room_doc = frappe.get_cached_doc("Rental Room", room)

        opening_time = room_doc.start_time if isinstance(room_doc.start_time, time) else time(8, 0)
        closing_time = room_doc.end_time if isinstance(room_doc.end_time, time) else time(22, 0)
        period_duration = cint(room_doc.get("period_duration", 60))

        all_slots = generate_time_slots(booking_date, opening_time, closing_time, period_duration)
        existing_bookings = get_existing_bookings(room, date)

        now_time = None
        if current_time:
            try:
                now_dt = get_datetime(current_time)
                if now_dt.date() == booking_date:
                    now_time = now_dt.time()
            except Exception:
                pass

        final_slots = []
        for slot in all_slots:
            is_booked = is_slot_booked(slot, existing_bookings)
            is_expired = False
            if booking_date == today and now_time:
                is_expired = slot["end"].time() <= now_time

            slot_price = calculate_slot_price(room_doc, slot["start"].time())

            final_slots.append({
                "hour": slot["start"].hour,
                "minute": slot["start"].minute,
                "start_time": slot["start"].strftime("%H:%M"),
                "end_time": slot["end"].strftime("%H:%M"),
                "price": slot_price,
                "booked": is_booked,
                "expired": is_expired,
                "status": "Booked" if is_booked else "Expired" if is_expired else "Available"
            })

        return merge_slots(final_slots)

    except Exception as e:
        frappe.log_error(title="Failed to get available slots", message=f"Room: {room}, Date: {date}\n{str(e)}")
        frappe.throw(_("Error fetching time slots. Please try again later."))


def generate_time_slots(date, start_time, end_time, duration_minutes):
    slots = []
    if not isinstance(start_time, time) or not isinstance(end_time, time):
        frappe.throw(_("Start and end times must be of type time"))

    current_dt = datetime.combine(date, start_time)
    end_dt = datetime.combine(date, end_time)

    while current_dt + timedelta(minutes=duration_minutes) <= end_dt:
        slot_end = current_dt + timedelta(minutes=duration_minutes)
        slots.append({"start": current_dt, "end": slot_end})
        current_dt = slot_end

    return slots


def get_existing_bookings(room, date):
    return frappe.db.sql("""
        SELECT start_time, end_time 
        FROM `tabRoom Booking`
        WHERE rental_room = %(room)s
          AND booking_date = %(date)s
          AND reservation_status NOT IN ('Cancelled', 'Completed')
          AND docstatus = 1
    """, {"room": room, "date": date}, as_dict=1)


def calculate_slot_price(room_doc, slot_time):
    try:
        return flt(room_doc.price_per_hour) / (60 / cint(room_doc.get("period_duration", 60)))
    except Exception:
        return 0


def is_slot_booked(slot, bookings):
    for booking in bookings:
        booking_start = get_time(booking.start_time)
        booking_end = get_time(booking.end_time)
        if not (slot["end"].time() <= booking_start or slot["start"].time() >= booking_end):
            return True
    return False


def merge_slots(slots):
    """
    Merge consecutive slots with the same status and price into one longer slot.
    """
    if not slots:
        return []

    merged = []
    current = slots[0].copy()

    for slot in slots[1:]:
        gap = (datetime.strptime(slot["start_time"], "%H:%M") - datetime.strptime(current["end_time"], "%H:%M")).total_seconds() / 60
        if gap == 0 and slot["status"] == current["status"] and abs(slot["price"] - current["price"]) < 0.01:
            current["end_time"] = slot["end_time"]
        else:
            current["duration_minutes"] = int((datetime.strptime(current["end_time"], "%H:%M") - datetime.strptime(current["start_time"], "%H:%M")).total_seconds() / 60)
            merged.append(current)
            current = slot.copy()
    current["duration_minutes"] = int((datetime.strptime(current["end_time"], "%H:%M") - datetime.strptime(current["start_time"], "%H:%M")).total_seconds() / 60)
    merged.append(current)

    return merged


@frappe.whitelist()
def get_available_rooms_with_slots(date=None, branch=None, capacity=None):
    if not date:
        date = frappe.utils.today()

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

    rooms_with_slots = []
    for room in rooms:
        available_slots = get_available_slots_for_room(room['name'], date, room)
        room['available_slots'] = available_slots
        rooms_with_slots.append(room)

    return rooms_with_slots


def get_available_slots_for_room(room_name, date, room_doc=None):
    if not room_doc:
        room_doc = frappe.get_cached_doc("Rental Room", room_name)

    booking_date = getdate(date)
    opening_time = room_doc.start_time if isinstance(room_doc.start_time, time) else time(8, 0)
    closing_time = room_doc.end_time if isinstance(room_doc.end_time, time) else time(22, 0)
    period_duration = cint(room_doc.get("period_duration", 60))

    now = now_datetime()
    today = now.date()

    if booking_date == today:
        start_dt = max(datetime.combine(booking_date, opening_time), now)
    else:
        start_dt = datetime.combine(booking_date, opening_time)

    end_dt = datetime.combine(booking_date, closing_time)

    slots = []
    current = start_dt

    existing_bookings = frappe.db.sql("""
        SELECT start_time, end_time FROM `tabRoom Booking`
        WHERE rental_room=%s AND booking_date=%s
          AND reservation_status NOT IN ('Cancelled', 'Completed') AND docstatus=1
    """, (room_name, booking_date), as_dict=1)

    while current + timedelta(minutes=period_duration) <= end_dt:
        slot_end = current + timedelta(minutes=period_duration)

        is_booked = any(
            not (slot_end.time() <= get_time(b.start_time) or current.time() >= get_time(b.end_time))
            for b in existing_bookings
        )

        is_expired = booking_date == today and slot_end <= now

        status = "Booked" if is_booked else "Expired" if is_expired else "Available"

        slot_price = flt(room_doc.price_per_hour) / (60 / period_duration)

        slots.append({
            "start_time": current.strftime("%H:%M"),
            "end_time": slot_end.strftime("%H:%M"),
            "price": round(slot_price, 2),
            "booked": is_booked,
            "expired": is_expired,
            "status": status
        })

        current = slot_end

    return merge_slots(slots)


@frappe.whitelist()
def get_branches():
    branches = frappe.get_all("Branch", fields=["name"])
    return [b["name"] for b in branches]


@frappe.whitelist()
def create_booking(bookings):
    if isinstance(bookings, str):
        try:
            bookings = json.loads(bookings)
        except Exception:
            frappe.throw(_("Invalid JSON format for bookings"))

    results = []

    for idx, booking in enumerate(bookings):
        required_fields = ['rental_room', 'start_datetime', 'end_datetime', 'customer_name', 'amount']
        missing = [f for f in required_fields if not booking.get(f)]
        if missing:
            frappe.throw(_("Booking {0}: Missing fields: {1}").format(idx + 1, ", ".join(missing)))

        start_dt = get_datetime(booking['start_datetime'])
        end_dt = get_datetime(booking['end_datetime'])

        if not start_dt or not end_dt:
            frappe.throw(_("Booking {0}: Invalid datetime format.").format(idx + 1))

        duration = (end_dt - start_dt).total_seconds() / 3600
        if duration <= 0:
            frappe.throw(_("Booking {0}: Duration must be positive.").format(idx + 1))

        if start_dt < now_datetime():
            frappe.throw(_("Booking {0}: Cannot book in the past.").format(idx + 1))

        doc = frappe.get_doc({
            'doctype': 'Room Booking',
            'rental_room': booking['rental_room'],
            'booking_date': start_dt.date(),
            'start_time': start_dt.time().strftime("%H:%M:%S"),
            'end_time': end_dt.time().strftime("%H:%M:%S"),
            'duration_hours': duration,
            'customer_name': booking['customer_name'],
            'customer_phone': booking.get('customer_phone'),
            'price_per_hour': flt(booking.get('price_per_hour', 0)),
            'total_amount': flt(booking['amount']),
            'notes': booking.get('notes', ''),
            'status': 'Confirmed',
            'payment_status': 'Unpaid',
            'reservation_status': 'Reserved'
        })

        doc.insert(ignore_permissions=True)
        doc.save()

        results.append({
            'name': doc.name,
            'room': booking['rental_room'],
            'start': str(start_dt),
            'end': str(end_dt),
            'status': 'Success'
        })

    return {
        'success': True,
        'message': _('{0} bookings created successfully').format(len(results)),
        'bookings': results,
        'total_bookings': len(results)
    }
