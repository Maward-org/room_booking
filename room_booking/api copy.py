

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
            for booking in existing_bookings:
                booking_start = get_time(booking.start_time)
                booking_end = get_time(booking.end_time)
                if not (slot_end.time() <= booking_start or current.time() >= booking_end):
                    is_booked = True
                    break

            # Check if expired
            is_expired = (booking_date == today and slot_end <= now)

            status = "Booked" if is_booked else "Expired" if is_expired else "Available"

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

        opening_time = room_doc.start_time if isinstance(room_doc.start_time, time) else time(8, 0)
        closing_time = room_doc.end_time if isinstance(room_doc.end_time, time) else time(22, 0)

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

###################################################################################################




import frappe
from frappe import _
from datetime import datetime, time, timedelta
import json
from frappe.utils import get_datetime, get_time, getdate, now_datetime, cint, flt


@frappe.whitelist()
def get_branches():
    """Get list of all active branches"""
    return frappe.get_all("Branch", filters={"disabled": 0}, pluck="name")


@frappe.whitelist()
def get_available_rooms_with_slots(date=None, branch=None, capacity=None):
    """
    Get all rooms with their aggregated time slots (available, booked, expired) for a given date
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
    Generate and classify all slots for the room on a date,
    then merge consecutive Available and Expired slots.
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
    Generate time slots between start and end time with given duration
    Returns: List of dicts with start and end datetime objects
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
    """Get all active bookings for a room on given date"""
    return frappe.db.sql("""
        SELECT start_time, end_time 
        FROM `tabRoom Booking`
        WHERE rental_room = %(room)s
          AND booking_date = %(date)s
          AND reservation_status NOT IN ('Cancelled', 'Completed')
    """, {"room": room, "date": date}, as_dict=1)


def classify_slot(slot, existing_bookings, current_datetime=None):
    """
    Determine slot status (Available, Booked, Expired)
    """
    # Check if slot is booked
    for booking in existing_bookings:
        booking_start = get_time(booking.start_time)
        booking_end = get_time(booking.end_time)
        if not (slot["end"].time() <= booking_start or slot["start"].time() >= booking_end):
            return "Booked"
    
    # Check if slot is expired (in the past)
    if current_datetime and slot["end"] <= current_datetime:
        return "Expired"
    
    return "Available"


def calculate_slot_price(room_doc, period_duration):
    """Calculate price for one time slot"""
    try:
        return flt(room_doc.price_per_hour) * (period_duration / 60)
    except Exception:
        return 0


def merge_consecutive_slots(slots):
    """
    Merge consecutive Available or Expired slots with matching status and contiguous time.
    Booked slots remain separate.
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


@frappe.whitelist()
def get_available_rooms_with_slots(date=None, branch=None, capacity=None):
    """
    Get all rooms with their aggregated time slots (available, booked, expired) for a given date
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
    Generate and classify all slots for the room on a date,
    then merge consecutive Available and Expired slots.
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


def merge_consecutive_slots(slots):
    """
    Merge consecutive Available or Expired slots with matching status and contiguous time.
    Booked slots remain separate.
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


@frappe.whitelist()
def get_slots_between_times(room, date, start_time, end_time):
    """
    Return merged slots between two times for flexible booking durations
    """
    try:
        if not all([room, date, start_time, end_time]):
            frappe.throw(_("Missing required parameters"))

        if not frappe.db.exists("Rental Room", room):
            frappe.throw(_("Room does not exist"))

        room_doc = frappe.get_cached_doc("Rental Room", room)
        period_duration = cint(room_doc.get("period_duration") or 60)
        booking_date = getdate(date)

        start_dt = datetime.combine(booking_date, get_time(start_time + ":00"))
        end_dt = datetime.combine(booking_date, get_time(end_time + ":00"))

        existing_bookings = get_existing_bookings(room, booking_date)

        slots = []
        current = start_dt
        now = now_datetime() if booking_date == now_datetime().date() else None

        while current < end_dt:
            slot_end = min(current + timedelta(minutes=period_duration), end_dt)

            status = classify_slot(
                {"start": current, "end": slot_end},
                existing_bookings,
                now
            )

            price = calculate_slot_price(room_doc, (slot_end - current).seconds // 60)

            slots.append({
                "start_time": current.strftime("%H:%M"),
                "end_time": slot_end.strftime("%H:%M"),
                "price": price,
                "status": status,
                "booked": status == "Booked",
                "expired": status == "Expired"
            })

            current = slot_end

        return merge_consecutive_slots(slots)

    except Exception as e:
        frappe.log_error(_("Error getting slots between times"), str(e))
        frappe.throw(_("Failed to get time slots. Please try again."))



@frappe.whitelist()
def create_booking(bookings):
    """
    Create multiple bookings with validation and error handling
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
        try:
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
            results.append(doc.name)

        except Exception as e:
            frappe.log_error(_("Booking creation failed"), str(e))
            frappe.throw(_("Failed to create booking: {0}").format(str(e)))

    return {
        'success': True,
        'message': _('Successfully created {0} bookings').format(len(results)),
        'bookings': results
    }

    
@frappe.whitelist()
def check_slot_availability(room, date, start_time, end_time):
    """
    Check if the custom slot is free (no conflict with existing bookings)
    """
    try:
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

    except Exception:
        frappe.log_error("Error checking slot availability")
        return False


@frappe.whitelist()
def update_booking_status(booking_id, status):
    """
    Update the reservation_status of a Room Booking
    """
    try:
        booking = frappe.get_doc("Room Booking", booking_id)
        if status not in ["Confirmed", "Cancelled"]:
            frappe.throw(_("Invalid status"))

        booking.reservation_status = status
        booking.save()
        frappe.db.commit()
        return True
    except Exception as e:
        frappe.log_error(f"Failed to update booking status for {booking_id}: {str(e)}")
        frappe.throw(_("Failed to update booking status"))