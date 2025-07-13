
import frappe
from frappe import _
from frappe.utils import getdate, now_datetime, cint, get_time, get_datetime
from datetime import datetime, timedelta
from frappe.utils import getdate, flt


# ==========================
# 1. Get all rental rooms
# ==========================
@frappe.whitelist()
def get_rooms():
    rooms = frappe.get_all(
        "Rental Room",
        fields=["name", "room_name", "branch", "status", "no_of_seats", "description", "room_code"]
    )
    # Get price_per_hour for each room
    for room in rooms:
        price = frappe.db.get_value(
            "Rental Pricing",
            {
                "rental_room": room["name"],
                "effective_from": ["<=", getdate(now_datetime())],
                "effective_to": [">=", getdate(now_datetime())]
            },
            "price_per_hour"
        )
        room["price_per_hour"] = price or 0
    return rooms

# ==========================
# 2. Get booked hours for a room in a date
# ==========================
@frappe.whitelist()
def get_booked_hours(rental_room, booking_date):
    """
    يعيد قائمة الساعات (int) المحجوزة لغرفة معينة في يوم معين (8-20)
    """
    if not rental_room or not booking_date:
        return []
    start_dt = f"{booking_date} 00:00:00"
    end_dt = f"{booking_date} 23:59:59"
    bookings = frappe.get_all(
        "Room Booking",
        filters={
            "rental_room": rental_room,
            "start_datetime": ["between", [start_dt, end_dt]],
            "reservation_status": ["in", ["Confirmed", "Booked"]]
        },
        fields=["start_datetime", "end_datetime"]
    )
    booked_hours = set()
    for b in bookings:
        start_hour = b.start_datetime.hour
        end_hour = b.end_datetime.hour
        for h in range(start_hour, end_hour):
            booked_hours.add(h)
    return sorted(list(booked_hours))

# ==========================
# 3. Add a new booking (single hour)
# ==========================
@frappe.whitelist()
def add_booking(rental_room, customer, start_datetime, end_datetime):
    """
    يحجز ساعة واحدة فقط لغرفة محددة بعد التحقق من عدم وجود تداخل مع حجوزات أخرى
    """
    # تحقق من القيم
    if not (rental_room and customer and start_datetime and end_datetime):
        return "Missing data"
    start_dt = datetime.strptime(start_datetime, "%Y-%m-%d %H:%M:%S")
    end_dt = datetime.strptime(end_datetime, "%Y-%m-%d %H:%M:%S")
    if end_dt <= start_dt:
        return "End time must be after start time"
    # تحقق أن الغرفة متاحة
    room_status = frappe.db.get_value("Rental Room", rental_room, "status")
    if room_status != "Available":
        return _("Room not available")
    # تحقق من عدم التداخل
    overlapping = frappe.db.sql("""
        SELECT name FROM `tabRoom Booking`
        WHERE rental_room=%s
          AND reservation_status in ('Confirmed', 'Booked')
          AND (
              (start_datetime < %s AND end_datetime > %s)
              OR
              (start_datetime >= %s AND start_datetime < %s)
          )
    """, (rental_room, end_datetime, start_datetime, start_datetime, end_datetime))
    if overlapping:
        return _("This time slot is already booked")
    # احسب السعر
    price_per_hour = frappe.db.get_value(
        "Rental Pricing",
        {
            "rental_room": rental_room,
            "effective_from": ["<=", start_dt.date()],
            "effective_to": [">=", start_dt.date()]
        },
        "price_per_hour"
    ) or 0
    # أضف الحجز
    doc = frappe.new_doc("Room Booking")
    doc.rental_room = rental_room
    doc.customer = customer
    doc.price_per_hour = price_per_hour
    doc.total_amount = price_per_hour
    doc.start_datetime = start_datetime
    doc.end_datetime = end_datetime
    doc.duration_hours = 1
    doc.payment_status = "Unpaid"
    doc.reservation_status = "Booked"
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return "success"

# ==========================
# 4. (اختياري) Get branches (لو عندك فروع)
# ==========================
@frappe.whitelist()
def get_branches():
    branches = frappe.get_all("Branch", fields=["name"])
    return [b["name"] for b in branches]


@frappe.whitelist()
def get_available_rooms(date=None, branch=None, capacity=None):
    """
    Returns available rooms on a given date (optionally by branch and capacity)
    """
    # Set default date if not provided
    if not date:
        date = frappe.utils.today()
    
    filters = {"status": "Available"}
    
    if branch:
        filters["branch"] = branch
        
    if capacity:
        filters["no_of_seats"] = [">=", int(capacity)]
    
    # Get basic room info
    rooms = frappe.get_all(
        "Rental Room",
        filters=filters,
        fields=["name", "room_name", "branch", "status", "no_of_seats", "description", "room_code", "location"]
    )
    
    # Get pricing info for each room
    for room in rooms:
        # Get current price
        price = frappe.db.get_value(
            "Rental Pricing",
            {
                "rental_room": room["name"],
                "effective_from": ["<=", date],
                "effective_to": [">=", date]
            },
            "price_per_hour"
        )
        room["price_per_hour"] = flt(price) if price else 0.0
        
        # Add additional fields if needed
        room["image"] = frappe.db.get_value("Rental Room", room["name"], "image")
    
    return rooms

from datetime import datetime, time

@frappe.whitelist()
def get_available_slots(room, date):
    """
    إرجاع جميع الفترات الزمنية المتاحة للحجز لغرفة معينة في يوم محدد،
    مع مراعاة الحجوزات السابقة وإظهار كل الفترات (محجوزة/متاحة)
    """
    # التحقق من صحة المدخلات
    if not room or not date:
        frappe.throw(_("يجب تحديد الغرفة والتاريخ"))

    # التأكد من صيغة التاريخ
    try:
        booking_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        frappe.throw(_("صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD"))

    # جلب بيانات الغرفة
    room_doc = frappe.get_doc("Rental Room", room)

    # ضبط ساعات العمل الافتراضية والمعالجة الآمنة
    start_time_str = str(room_doc.start_time) if room_doc.start_time else "08:00:00"
    end_time_str   = str(room_doc.end_time)   if room_doc.end_time   else "22:00:00"
    try:
        opening_time = datetime.strptime(start_time_str, "%H:%M:%S").time()
        closing_time = datetime.strptime(end_time_str, "%H:%M:%S").time()
    except Exception:
        opening_time = time(8, 0, 0)
        closing_time = time(22, 0, 0)

    # مدة كل فترة (دقائق)
    period_duration = int(room_doc.get("period_duration") or 60)

    # إنشاء كل الفترات الممكنة (start/end لكل فترة)
    all_slots = generate_time_slots(booking_date, opening_time, closing_time, period_duration)

    # جلب الحجوزات المؤكدة في هذا اليوم
    existing_bookings = get_existing_bookings(room, booking_date)

    # نبني قائمة فترات اليوم كاملة، ونوضح المحجوز والمتاح
    final_slots = []
    for slot in all_slots:
        slot_is_booked = False
        # قارن كل فترة مع الحجوزات الفعلية
        for booking in existing_bookings:
            if not (
                slot["end"] <= booking["start"] or
                slot["start"] >= booking["end"]
            ):
                slot_is_booked = True
                break

        final_slots.append({
            "hour": slot["start"].hour,  # للواجهات التي تعتمد رقم الساعة
            "start_time": slot["start"].strftime("%H:%M"),
            "end_time": slot["end"].strftime("%H:%M"),
            "price": calculate_slot_price(room_doc, slot["start"].time()),
            "booked": slot_is_booked,
            "room": room,
            "date": date
        })

    return final_slots

def generate_time_slots(date, start_time, end_time, duration_minutes):
    """
    إنشاء جميع الفترات الزمنية الممكنة ليوم معين
    """
    slots = []
    start_datetime = datetime.combine(date, start_time)
    end_datetime = datetime.combine(date, end_time)
    
    current_time = start_datetime
    while current_time + timedelta(minutes=duration_minutes) <= end_datetime:
        slot_end = current_time + timedelta(minutes=duration_minutes)
        slots.append({
            "start": current_time,
            "end": slot_end
        })
        current_time = slot_end
    
    return slots

def get_existing_bookings(room, date):
    """
    استرجاع الحجوزات الموجودة للغرفة في تاريخ معين
    """
    bookings = frappe.get_all("Room Booking",
        filters={
            "rental_room": room,
            "date": date,
            "docstatus": 1  # الحجوزات المؤكدة فقط
        },
        fields=["name", "start_time", "end_time"])
    
    return bookings

def filter_available_slots(all_slots, existing_bookings):
    """
    تصفية الفترات المحجوزة من جميع الفترات
    """
    available_slots = []
    
    for slot in all_slots:
        is_available = True
        
        for booking in existing_bookings:
            booking_start = datetime.strptime(booking.start_time, "%H:%M:%S").time()
            booking_end = datetime.strptime(booking.end_time, "%H:%M:%S").time()
            
            slot_start = slot["start"].time()
            slot_end = slot["end"].time()
            
            # التحقق إذا كانت الفترة متداخلة مع حجز موجود
            if not (slot_end <= booking_start or slot_start >= booking_end):
                is_available = False
                break
        
        if is_available:
            available_slots.append(slot)
    
    return available_slots

def calculate_slot_price(room_doc, time):
    """
    حساب سعر الفترة بناءً على وقت اليوم (يمكن تعديله حسب القواعد التجارية)
    """
    base_price = room_doc.price_per_hour
    
    # # مثال: زيادة السعر في ساعات الذروة (6pm-9pm)
    # if 18 <= time.hour < 21:
    #     return base_price * 1.2  # زيادة 20% في ساعات الذروة
    
    # # مثال: خصم في الصباح الباكر
    # if 8 <= time.hour < 10:
    #     return base_price * 0.9  # خصم 10%
    
    return base_price


@frappe.whitelist()
def create_booking(bookings):
    """
    Create new Room Booking records with proper validation
    Args:
        bookings: List of booking dictionaries containing:
            - rental_room: Room ID
            - start_datetime: Booking start datetime (YYYY-MM-DD HH:MM:SS)
            - end_datetime: Booking end datetime (YYYY-MM-DD HH:MM:SS)
            - customer_name: Customer full name
            - customer_phone: Customer phone number (optional)
            - amount: Total amount
            - notes: Additional notes (optional)
    Returns:
        Dictionary with booking IDs and status
    """
    try:
        # Parse input data
        bookings = frappe.parse_json(bookings) if isinstance(bookings, str) else bookings
        
        if not bookings or not isinstance(bookings, list):
            frappe.throw(_("Invalid bookings data format. Expected a list of bookings."))

        results = []
        for booking in bookings:
            # Validate required fields
            required_fields = ['rental_room', 'start_datetime', 'end_datetime', 
                             'customer_name', 'amount']
            
            missing_fields = [field for field in required_fields if not booking.get(field)]
            if missing_fields:
                frappe.throw(_("Missing required fields: {0}").format(", ".join(missing_fields)))

            # Validate and parse datetime
            try:
                start_dt = frappe.utils.get_datetime(booking['start_datetime'])
                end_dt = frappe.utils.get_datetime(booking['end_datetime'])
            except Exception as dt_error:
                frappe.throw(_("Invalid datetime format. Please use YYYY-MM-DD HH:MM:SS"))

            # Validate datetime logic
            if start_dt >= end_dt:
                frappe.throw(_("End datetime must be after start datetime"))

            if start_dt < frappe.utils.now_datetime():
                frappe.throw(_("Cannot book rooms in the past"))

            # Calculate duration
            duration = (end_dt - start_dt).total_seconds() / 3600  # in hours
            if duration <= 0:
                frappe.throw(_("Booking duration must be positive"))

            # Validate room availability
            if not is_room_available(booking['rental_room'], start_dt, end_dt):
                frappe.throw(_("Room {0} is not available for the selected time slot").format(booking['rental_room']))

            # Create new booking
            booking_doc = frappe.get_doc({
                'doctype': 'Room Booking',
                'rental_room': booking['rental_room'],
                'booking_date': start_dt.date(),
                'start_time': start_dt.time(),
                'end_time': end_dt.time(),
                'duration_hours': duration,
                'period_duration': f"{duration} {_('Hours')}",
                'customer_name': booking['customer_name'],
                'customer_phone': booking.get('customer_phone'),
                'price_per_hour': flt(booking.get('price_per_hour', 0)),
                'total_amount': flt(booking['amount']),
                'notes': booking.get('notes', ''),
                'status': 'Confirmed',
                'payment_status': 'Unpaid',
                'reservation_status': 'Reserved'
            })

            booking_doc.insert(ignore_permissions=True)
            booking_doc.submit()

            results.append({
                'booking_id': booking_doc.name,
                'room': booking['rental_room'],
                'start': booking['start_datetime'],
                'end': booking['end_datetime'],
                'status': 'Success'
            })

        return {
            'success': True,
            'message': _('{0} bookings created successfully').format(len(results)),
            'bookings': results,
            'total_bookings': len(results)
        }

    except Exception as e:
        frappe.log_error(
            title='Room Booking Creation Failed',
            message=f"Bookings: {bookings}\nError: {str(e)}\n{frappe.get_traceback()}"
        )
        return {
            'success': False,
            'error': str(e),
            'bookings': []
        }


def is_room_available(room, start_datetime, end_datetime):
    """
    Check if room is available for booking with improved validation
    Args:
        room: Room ID
        start_datetime: datetime object
        end_datetime: datetime object
    Returns:
        bool: True if room is available
    """
    if not room or not start_datetime or not end_datetime:
        return False

    if start_datetime >= end_datetime:
        return False

    overlapping_bookings = frappe.get_all('Room Booking',
        filters=[
            ['rental_room', '=', room],
            ['docstatus', '=', 1],  # Submitted documents only
            ['start_time', '<', end_datetime],
            ['end_time', '>', start_datetime],
            ['status', 'not in', ['Cancelled', 'Checked Out']]
        ],
        limit=1
    )
    
    return len(overlapping_bookings) == 0