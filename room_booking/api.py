

import frappe
from frappe import _
from datetime import datetime, time, timedelta
import json
from datetime import datetime, time, timedelta
from frappe.utils import get_datetime, get_time, getdate, now_datetime, cint, flt,get_datetime



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





def get_booked_rooms():
    """
    Returns a list of booked slots for today, including room info and booking times.
    """
    today = frappe.utils.today()
    booked_rooms = frappe.get_all(
        "Room Booking",
        filters={
            "booking_date": today,
            "status": "Confirmed"  # assuming status is string, not list here
        },
        fields=["rental_room", "start_datetime", "end_datetime", "name"]
    )

    booked_slots = []
    for b in booked_rooms:
        booked_slots.append({
            "room": b.get("rental_room"),
            "start_time": b.get("start_datetime").strftime("%H:%M") if b.get("start_datetime") else None,
            "end_time": b.get("end_datetime").strftime("%H:%M") if b.get("end_datetime") else None,
            "booking_id": b.get("name")
        })
    return booked_slots



# def get_available_slots_for_room(room_name, date, room_doc=None):
#     if not room_doc:
#         room_doc = frappe.get_cached_doc("Rental Room", room_name)

#     booking_date = getdate(date)
#     opening_time = room_doc.start_time if isinstance(room_doc.start_time, time) else time(8, 0)
#     closing_time = room_doc.end_time if isinstance(room_doc.end_time, time) else time(22, 0)
#     period_duration = cint(room_doc.get("period_duration", 60))
#     room_price_doc = None
#     all_room_price = frappe.get_all("Rental Pricing", filters={"rental_room": room_name}, fields=["name"])
#     if all_room_price:
#         room_price_doc = frappe.get_doc("Rental Pricing", all_room_price[0]["name"])

#     now = now_datetime()
#     today = now.date()

#     if booking_date == today:
#         start_dt = max(datetime.combine(booking_date, opening_time), now)
#     else:
#         start_dt = datetime.combine(booking_date, opening_time)

#     end_dt = datetime.combine(booking_date, closing_time)

#     slots = []
#     current = start_dt

#     existing_bookings = frappe.db.sql("""
#         SELECT start_time, end_time FROM `tabRoom Booking`
#         WHERE rental_room=%s AND booking_date=%s
#           AND reservation_status NOT IN ('Cancelled', 'Completed') AND docstatus=1
#     """, (room_name, booking_date), as_dict=1)

#     while current + timedelta(minutes=period_duration) <= end_dt:
#         slot_end = current + timedelta(minutes=period_duration)

#         is_booked = any(
#             not (slot_end.time() <= get_time(b.start_time) or current.time() >= get_time(b.end_time))
#             for b in existing_bookings
#         )

#         is_expired = booking_date == today and slot_end <= now

#         status = "Booked" if is_booked else "Expired" if is_expired else "Available"

#         slot_price = flt(room_doc.price_per_hour) * flt(period_duration) if room_price_doc.price_per_hour is not None else flt(room_price_doc.price_per_hour) * flt(period_duration)

#         slots.append({
#             "start_time": current.strftime("%H:%M"),
#             "end_time": slot_end.strftime("%H:%M"),
#             "price": round(slot_price, 2),
#             "booked": is_booked,
#             "expired": is_expired,
#             "status": status
#         })

#         current = slot_end

#     return merge_slots(slots)

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
@frappe.whitelist()
def get_available_slots(room, date, current_time=None):
    """
    Return all time slots for a given room and date with merged periods
    """
    try:
        if not room or not date:
            frappe.throw(_("Room and date are required"))

        if not frappe.db.exists("Rental Room", room):
            frappe.throw(_("Room does not exist"))

        booking_date = getdate(date)
        room_doc = frappe.get_cached_doc("Rental Room", room)

        opening_time = get_time(room_doc.start_time)
        closing_time = get_time(room_doc.end_time)


        # Start time for slots: max(opening_time, now) if booking for today
        now = now_datetime()
        today = now.date()

        if booking_date == today:
            start_dt = max(datetime.combine(booking_date, opening_time), now)
        else:
            start_dt = datetime.combine(booking_date, opening_time)

        start_str = start_dt.strftime("%H:%M")
        end_str = closing_time.strftime("%H:%M")

        # Get merged slots between opening and closing
        merged_slots = get_slots_between_times(room, date, start_str, end_str)

        return merged_slots

    except Exception as e:
        frappe.log_error(title="Failed to get available slots", message=f"Room: {room}, Date: {date}\n{str(e)}")
        frappe.throw(_("Error fetching time slots. Please try again later."))

def get_available_slots_for_room(room_name, date, room_doc=None):
    if not room_doc:
        room_doc = frappe.get_cached_doc("Rental Room", room_name)

    booking_date = getdate(date)
    

    opening_time = get_time(room_doc.start_time)
    closing_time = get_time(room_doc.end_time)
    # frappe.throw(_(f"Opening Time: {opening_time}, Closing Time: {closing_time}"))

    period_duration = cint(room_doc.get("period_duration", 60))

    room_price_doc = None
    all_room_price = frappe.get_all("Rental Pricing", filters={"rental_room": room_name}, fields=["name"])
    if all_room_price:
        room_price_doc = frappe.get_doc("Rental Pricing", all_room_price[0]["name"])

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
        SELECT name, start_time, end_time FROM `tabRoom Booking`
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
        if is_booked:
            status = "Booked"
        elif is_expired:
            status = "Expired"
        else:
            status = "Available"

        if room_price_doc and room_price_doc.price_per_hour is not None:
            slot_price = flt(room_price_doc.price_per_hour) * flt(period_duration)
        elif room_doc.price_per_hour:
            slot_price = flt(room_doc.price_per_hour) * flt(period_duration)
        else:
            slot_price = 0.0  

        slots.append({
            "start_time": current.strftime("%H:%M"),
            # "end_time": slot_end.strftime("%H:%M"),
            "end_time": slot_end.strftime("%H:%M"),
            "price": round(slot_price, 2),
            "booked": is_booked,
            "expired": is_expired,
            "status": status
        })

        current = slot_end

    return merge_slots(slots)

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


def merge_consecutive_slots(slots):
    """
    Merge consecutive time slots that share the same status into larger slots.
    Input: slots = list of dicts with keys start_time, end_time, status, etc.
    Output: list of merged slots.
    """
    if not slots:
        return []

    merged_slots = []
    current_slot = slots[0].copy()

    for slot in slots[1:]:
        # Check if status is same and times are contiguous
        if (slot['status'] == current_slot['status'] and
            slot['start_time'] == current_slot['end_time']):
            # Extend current slot end time
            current_slot['end_time'] = slot['end_time']
            # Add prices (or handle as needed)
            current_slot['price'] += slot['price']
            # Maintain flags if any are True
            current_slot['booked'] = current_slot['booked'] or slot['booked']
            current_slot['expired'] = current_slot['expired'] or slot['expired']
        else:
            merged_slots.append(current_slot)
            current_slot = slot.copy()

    merged_slots.append(current_slot)
    return merged_slots

@frappe.whitelist()
def get_slots_between_times(room, date, start_time, end_time):
    """
    Return merged time slots between start_time and end_time with their status (Available, Booked, Expired)
    """
    try:
        if not room or not date or not start_time or not end_time:
            frappe.throw(_("Room, date, start_time and end_time are required"))

        if not frappe.db.exists("Rental Room", room):
            frappe.throw(_("Room does not exist"))

        booking_date = getdate(date)
        room_doc = frappe.get_cached_doc("Rental Room", room)

        period_duration = cint(room_doc.get("period_duration", 60))  # minutes

        # Parse start and end times (strings like "08:00")
        start_dt = datetime.combine(booking_date, datetime.strptime(start_time, "%H:%M").time())
        end_dt = datetime.combine(booking_date, datetime.strptime(end_time, "%H:%M").time())

        now = now_datetime()
        today = now.date()

        # Fetch existing bookings for that room and date
        existing_bookings = frappe.db.sql("""
            SELECT start_time, end_time FROM `tabRoom Booking`
            WHERE rental_room=%s AND booking_date=%s
            AND reservation_status NOT IN ('Cancelled', 'Completed') AND docstatus=1
        """, (room, booking_date), as_dict=1)

        slots = []
        current = start_dt

        while current < end_dt:
            slot_end = current + timedelta(minutes=period_duration)
            if slot_end > end_dt:
                slot_end = end_dt  # last partial slot if any

            # Check booking overlap
            is_booked = False
            if existing_bookings:
                for booking in existing_bookings:
                    booking_start = get_time(booking.start_time)
                    booking_end = get_time(booking.end_time)
                    if not (slot_end.time() <= booking_start or current.time() >= booking_end):
                        is_booked = True
                        break

            # Check if expired
            is_expired = (booking_date == today and slot_end <= now)

            if is_booked:
                status = "Booked"
            elif is_expired:
                status = "Expired"
            else:
                status = "Available"

            slot_price = flt(room_doc.price_per_hour) / (60 / period_duration) * ((slot_end - current).seconds / 60) / period_duration

            slots.append({
                "start_time": current.strftime("%H:%M"),
                "end_time": slot_end.strftime("%H:%M"),
                "price": round(slot_price, 2),
                "booked": is_booked,
                "expired": is_expired,
                "status": status
            })

            current = slot_end

        # Merge consecutive slots with same status
        merged_slots = merge_consecutive_slots(slots)

        return merged_slots

    except Exception as e:
        frappe.log_error(title="Failed to get slots between times", message=f"Room: {room}, Date: {date}, Start: {start_time}, End: {end_time}\n{str(e)}")
        frappe.throw(_("Error fetching slots. Please try again later."))


# Example usage within existing get_available_slots or similar function:





@frappe.whitelist()
def get_branches():
    branches = frappe.get_all("Branch", fields=["name"])
    return [b["name"] for b in branches]


@frappe.whitelist()
def create_booking(booking):
    if isinstance(booking, str):
        try:
            booking = json.loads(booking)
        except Exception:
            frappe.throw(_("Invalid JSON format for booking"))

    results = []

    for idx, booking in enumerate(booking):
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

@frappe.whitelist()
def cancel_booking(booking_id):
    if not booking_id:
        frappe.throw(_("Booking ID is required for cancellation."))

    booking_doc = frappe.get_doc("Room Booking", booking_id)

    # تحقق أن الحجز موجود وحالته تسمح بالإلغاء
    if booking_doc.reservation_status in ['Cancelled', 'Completed']:
        frappe.throw(_("Booking is already cancelled or completed."))

    booking_doc.reservation_status = 'Cancelled'
    booking_doc.status = 'Cancelled'
    booking_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        'success': True,
        'message': _("Booking {0} cancelled successfully").format(booking_id)
    }


@frappe.whitelist()
def update_booking(booking_id, booking):
    """
    booking: JSON string or dict with fields to update:
    rental_room, start_datetime, end_datetime, customer_name, amount, notes, etc.
    """

    if not booking_id:
        frappe.throw(_("Booking ID is required for update."))

    if isinstance(booking, str):
        try:
            booking = json.loads(booking)
        except Exception:
            frappe.throw(_("Invalid JSON format for booking data."))

    booking_doc = frappe.get_doc("Room Booking", booking_id)

    if booking_doc.reservation_status in ['Cancelled', 'Completed']:
        frappe.throw(_("Cannot update a cancelled or completed booking."))

    # تحقق من الحقول المطلوبة (مشابه create_booking)
    required_fields = ['rental_room', 'start_datetime', 'end_datetime', 'customer_name', 'amount']
    missing = [f for f in required_fields if not booking.get(f)]
    if missing:
        frappe.throw(_("Missing fields for update: {0}").format(", ".join(missing)))

    start_dt = get_datetime(booking['start_datetime'])
    end_dt = get_datetime(booking['end_datetime'])

    if not start_dt or not end_dt:
        frappe.throw(_("Invalid datetime format."))

    duration = (end_dt - start_dt).total_seconds() / 3600
    if duration <= 0:
        frappe.throw(_("Duration must be positive."))

    if start_dt < now_datetime():
        frappe.throw(_("Cannot set booking start time in the past."))

    # تحديث الحقول
    booking_doc.rental_room = booking['rental_room']
    booking_doc.booking_date = start_dt.date()
    booking_doc.start_time = start_dt.time().strftime("%H:%M:%S")
    booking_doc.end_time = end_dt.time().strftime("%H:%M:%S")
    booking_doc.duration_hours = duration
    booking_doc.customer_name = booking['customer_name']
    booking_doc.customer_phone = booking.get('customer_phone', booking_doc.customer_phone)
    booking_doc.price_per_hour = flt(booking.get('price_per_hour', booking_doc.price_per_hour))
    booking_doc.total_amount = flt(booking['amount'])
    booking_doc.notes = booking.get('notes', booking_doc.notes)

    booking_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        'success': True,
        'message': _("Booking {0} updated successfully").format(booking_id),
        'booking_id': booking_id
    }


@frappe.whitelist()
def clear_room(room, date=None):
    """
    Cancel all active bookings for the room on the given date.
    If date is None, cancel all future bookings.
    """

    if not room:
        frappe.throw(_("Room is required."))

    filters = {
        "rental_room": room,
        "reservation_status": ["not in", ["Cancelled", "Completed"]],
        "docstatus": 1
    }

    if date:
        filters["booking_date"] = getdate(date)
    else:
        filters["booking_date"] = [">=", frappe.utils.today()]

    bookings = frappe.get_all("Room Booking", filters=filters, fields=["name"])

    if not bookings:
        return {
            'success': True,
            'message': _("No active bookings found to clear.")
        }

    for b in bookings:
        booking_doc = frappe.get_doc("Room Booking", b['name'])
        booking_doc.reservation_status = 'Cancelled'
        booking_doc.status = 'Cancelled'
        booking_doc.save(ignore_permissions=True)

    frappe.db.commit()

    return {
        'success': True,
        'message': _("Cleared {0} bookings for room {1}").format(len(bookings), room)
    }
