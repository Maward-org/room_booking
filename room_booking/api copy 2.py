# import frappe
# from frappe import _
# from datetime import datetime, time, timedelta
# import json
# from frappe.utils import get_datetime, get_time, getdate, now_datetime, cint, flt
# from frappe.utils import cint, today
# from datetime import datetime, timedelta

# @frappe.whitelist()
# def get_branches():
#     """الحصول على قائمة جميع الفروع النشطة"""
#     try:
#         branches = frappe.get_all("Branch", 
#             filters={"disabled": 0},
#             fields=["name", "branch_name", "branch_code", "phone_number"],
#             order_by="name"
#         )
#         return branches
#     except Exception as e:
#         frappe.log_error(_("خطأ في جلب الفروع"), str(e))
#         return []


# @frappe.whitelist()
# def get_available_rooms(date=None, branch=None, capacity=None):
#     """
#     الحصول على الغرف المتاحة مع فتراتها الزمنية
#     المعلمات:
#     - date: تاريخ الحجز (اختياري)
#     - branch: الفرع (اختياري)
#     - capacity: السعة (اختياري)
#     """
#     try:
#         date = getdate(date or frappe.utils.today())
        
#         filters = {"status": "Available"}
#         if branch:
#             filters["branch"] = branch
#         if capacity:
#             filters["no_of_seats"] = [">=", cint(capacity)]

#         rooms = frappe.get_all(
#             "Rental Room",
#             filters=filters,
#             fields=[
#                 "name", "room_name", "branch", "status", "no_of_seats",
#                 "description", "room_code", "location", "start_time",
#                 "end_time", "period_duration", "price_per_hour", "image"
#             ]
#         )

#         for room in rooms:
#             room["available_slots"] = generate_room_slots(room["name"], date)

#         return {
#             "success": True,
#             "rooms": rooms,
#             "date": date.strftime("%Y-%m-%d")
#         }
#     except Exception as e:
#         frappe.log_error(_("خطأ في جلب الغرف المتاحة"), str(e))
#         return {
#             "success": False,
#             "message": _("حدث خطأ أثناء جلب الغرف المتاحة")
#         }


# def generate_room_slots(room_name, date):
#     """
#     توليد الفترات الزمنية للغرفة وتصنيفها
#     """
#     try:
#         room = frappe.get_cached_doc("Rental Room", room_name)
        
#         # تحديد أوقات العمل
#         opening_time = get_time(room.start_time or "08:00:00")
#         closing_time = get_time(room.end_time or "22:00:00")
#         slot_duration = cint(room.period_duration or 60)  # دقائق
        
#         # حساب الوقت الحالي إذا كان التاريخ هو اليوم
#         now = now_datetime()
#         is_today = (date == now.date())
        
#         # بداية الفترة (الوقت الحالي إذا كان اليوم، أو وقت الافتتاح)
#         start_time = max(opening_time, now.time()) if is_today else opening_time
        
#         # توليد الفترات
#         slots = []
#         current_time = datetime.combine(date, start_time)
#         end_dt = datetime.combine(date, closing_time)
        
#         while current_time + timedelta(minutes=slot_duration) <= end_dt:
#             slot_end = current_time + timedelta(minutes=slot_duration)
            
#             # تصنيف الفترة
#             status = check_slot_status(room_name, date, current_time.time(), slot_end.time())
            
#             slots.append({
#                 "start": current_time.time().strftime("%H:%M"),
#                 "end": slot_end.time().strftime("%H:%M"),
#                 "status": status,
#                 "price": calculate_slot_price(room.price_per_hour, slot_duration),
#                 "duration": slot_duration
#             })
            
#             current_time = slot_end
        
#         return merge_similar_slots(slots)
#     except Exception as e:
#         frappe.log_error(_("خطأ في توليد الفترات الزمنية"), str(e))
#         return []


# def check_slot_status(room, date, start_time, end_time):
#     """
#     التحقق من حالة الفترة الزمنية (متاحة، محجوزة، منتهية)
#     """
#     try:
#         # التحقق من الحجوزات الحالية
#         overlapping_bookings = frappe.db.sql("""
#             SELECT name 
#             FROM `tabRoom Booking`
#             WHERE rental_room = %(room)s
#               AND booking_date = %(date)s
#               AND status NOT IN ('Cancelled', 'Completed')
#               AND (
#                   (start_time < %(end)s AND end_time > %(start)s)
#               )
#             LIMIT 1
#         """, {
#             "room": room,
#             "date": date,
#             "start": start_time.strftime("%H:%M:%S"),
#             "end": end_time.strftime("%H:%M:%S")
#         })
        
#         if overlapping_bookings:
#             return "Booked"
        
#         # التحقق إذا كانت الفترة منتهية (في الماضي)
#         if date == getdate() and end_time <= now_datetime().time():
#             return "Expired"
            
#         return "Available"
#     except Exception as e:
#         frappe.log_error(_("خطأ في التحقق من حالة الفترة"), str(e))
#         return "Unknown"


# def calculate_slot_price(price_per_hour, duration_minutes):
#     """
#     حساب سعر الفترة الزمنية
#     """
#     try:
#         return flt(price_per_hour) * (duration_minutes / 60)
#     except Exception:
#         return 0


# def merge_similar_slots(slots):
#     """
#     دمج الفترات المتشابهة المتتالية
#     """
#     if not slots:
#         return []
    
#     merged = []
#     current_slot = slots[0].copy()
    
#     for slot in slots[1:]:
#         if (slot["status"] == current_slot["status"] and 
#             slot["start"] == current_slot["end"] and
#             slot["status"] in ["Available", "Expired"]):
#             # دمج الفترات
#             current_slot["end"] = slot["end"]
#             current_slot["price"] += slot["price"]
#             current_slot["duration"] += slot["duration"]
#         else:
#             merged.append(current_slot)
#             current_slot = slot.copy()
    
#     merged.append(current_slot)
#     return merged


# @frappe.whitelist()
# def create_booking(bookings):
#     if isinstance(bookings, str):
#         try:
#             bookings = json.loads(bookings)
#         except Exception:
#             frappe.throw(_("Invalid JSON format for bookings"))

#     results = []

#     for idx, booking in enumerate(bookings):
#         required_fields = ['rental_room', 'start_datetime', 'end_datetime', 'customer_name', 'amount']
#         missing = [f for f in required_fields if not booking.get(f)]
#         if missing:
#             frappe.throw(_("Booking {0}: Missing fields: {1}").format(idx + 1, ", ".join(missing)))

#         start_dt = get_datetime(booking['start_datetime'])
#         end_dt = get_datetime(booking['end_datetime'])

#         if not start_dt or not end_dt:
#             frappe.throw(_("Booking {0}: Invalid datetime format.").format(idx + 1))

#         duration = (end_dt - start_dt).total_seconds() / 3600
#         if duration <= 0:
#             frappe.throw(_("Booking {0}: Duration must be positive.").format(idx + 1))

#         if start_dt < now_datetime():
#             frappe.throw(_("Booking {0}: Cannot book in the past.").format(idx + 1))

#         doc = frappe.get_doc({
#             'doctype': 'Room Booking',
#             'rental_room': booking['rental_room'],
#             'booking_date': start_dt.date(),
#             'start_time': start_dt.time().strftime("%H:%M:%S"),
#             'end_time': end_dt.time().strftime("%H:%M:%S"),
#             'duration_hours': duration,
#             'customer_name': booking['customer_name'],
#             'customer_phone': booking.get('customer_phone'),
#             'price_per_hour': flt(booking.get('price_per_hour', 0)),
#             'total_amount': flt(booking['amount']),
#             'notes': booking.get('notes', ''),
#             'status': 'Confirmed',
#             'payment_status': 'Unpaid',
#             'reservation_status': 'Reserved'
#         })

#         doc.insert(ignore_permissions=True)
#         doc.save()

#         results.append({
#             'name': doc.name,
#             'room': booking['rental_room'],
#             'start': str(start_dt),
#             'end': str(end_dt),
#             'status': 'Success'
#         })

#     return {
#         'success': True,
#         'message': _('{0} bookings created successfully').format(len(results)),
#         'bookings': results,
#         'total_bookings': len(results)
#     }



# @frappe.whitelist()
# def update_booking(booking_id, update_data):
#     """
#     تحديث بيانات الحجز
#     """
#     try:
#         if not frappe.db.exists("Room Booking", booking_id):
#             return {
#                 "success": False,
#                 "message": _("الحجز غير موجود")
#             }
        
#         booking = frappe.get_doc("Room Booking", booking_id)
        
#         # التحقق من إمكانية التعديل
#         if booking.status in ["Cancelled", "Completed"]:
#             return {
#                 "success": False,
#                 "message": _("لا يمكن تعديل الحجز الملغى أو المكتمل")
#             }
        
#         # تطبيق التحديثات
#         if "start_time" in update_data or "end_time" in update_data:
#             # التحقق من الفترة الجديدة
#             start_time = update_data.get("start_time", booking.start_time)
#             end_time = update_data.get("end_time", booking.end_time)
            
#             is_available = check_slot_availability(
#                 booking.rental_room,
#                 booking.booking_date,
#                 start_time,
#                 end_time,
#                 exclude_booking=booking.name
#             )
            
#             if not is_available:
#                 return {
#                     "success": False,
#                     "message": _("الفترة الزمنية الجديدة غير متاحة")
#                 }
            
#             # حساب المدة والسعر الجديد
#             start_dt = get_datetime(f"{booking.booking_date} {start_time}")
#             end_dt = get_datetime(f"{booking.booking_date} {end_time}")
#             duration_hours = (end_dt - start_dt).total_seconds() / 3600
#             room = frappe.get_doc("Rental Room", booking.rental_room)
            
#             booking.start_time = start_time
#             booking.end_time = end_time
#             booking.duration_hours = duration_hours
#             booking.total_amount = flt(room.price_per_hour) * duration_hours
        
#         if "status" in update_data:
#             if update_data["status"] not in ["Confirmed", "Cancelled"]:
#                 return {
#                     "success": False,
#                     "message": _("حالة الحجز غير صالحة")
#                 }
#             booking.status = update_data["status"]
        
#         if "notes" in update_data:
#             booking.notes = update_data["notes"]
        
#         booking.save()
#         frappe.db.commit()
        
#         return {
#             "success": True,
#             "message": _("تم تحديث الحجز بنجاح")
#         }
        
#     except Exception as e:
#         frappe.log_error(_("خطأ في تحديث الحجز"), str(e))
#         return {
#             "success": False,
#             "message": _("حدث خطأ أثناء تحديث الحجز: {0}").format(str(e))
#         }


# @frappe.whitelist()
# def cancel_booking(booking_id):
#     """
#     إلغاء الحجز
#     """
#     try:
#         if not frappe.db.exists("Room Booking", booking_id):
#             return {
#                 "success": False,
#                 "message": _("الحجز غير موجود")
#             }
        
#         booking = frappe.get_doc("Room Booking", booking_id)
        
#         if booking.status == "Cancelled":
#             return {
#                 "success": False,
#                 "message": _("الحجز ملغى بالفعل")
#             }
        
#         booking.status = "Cancelled"
#         booking.save()
#         frappe.db.commit()
        
#         return {
#             "success": True,
#             "message": _("تم إلغاء الحجز بنجاح")
#         }
        
#     except Exception as e:
#         frappe.log_error(_("خطأ في إلغاء الحجز"), str(e))
#         return {
#             "success": False,
#             "message": _("حدث خطأ أثناء إلغاء الحجز: {0}").format(str(e))
#         }


# @frappe.whitelist()
# def check_availability(room, date, start_time, end_time, exclude_booking=None):
#     """
#     التحقق من توفر الفترة الزمنية
#     """
#     try:
#         if not all([room, date, start_time, end_time]):
#             return False
        
#         if not frappe.db.exists("Rental Room", room):
#             return False
        
#         # تحويل الأوقات
#         start_dt = get_datetime(f"{date} {start_time}")
#         end_dt = get_datetime(f"{date} {end_time}")
        
#         if start_dt >= end_dt:
#             return False
        
#         # استعلام للتحقق من التعارضات
#         filters = {
#             "rental_room": room,
#             "booking_date": date,
#             "status": ["not in", ["Cancelled", "Completed"]],
#             "start_time": ["<", end_time],
#             "end_time": [">", start_time]
#         }
        
#         if exclude_booking:
#             filters["name"] = ["!=", exclude_booking]
        
#         conflicting_bookings = frappe.get_all(
#             "Room Booking",
#             filters=filters,
#             limit=1
#         )
        
#         return len(conflicting_bookings) == 0
        
#     except Exception as e:
#         frappe.log_error(_("خطأ في التحقق من التوفر"), str(e))
#         return False


# @frappe.whitelist()
# def get_booking_details(booking_id):
#     """
#     الحصول على تفاصيل الحجز
#     """
#     try:
#         if not frappe.db.exists("Room Booking", booking_id):
#             return {
#                 "success": False,
#                 "message": _("الحجز غير موجود")
#             }
        
#         booking = frappe.get_doc("Room Booking", booking_id)
#         room = frappe.get_doc("Rental Room", booking.rental_room)
        
#         return {
#             "success": True,
#             "booking": {
#                 "id": booking.name,
#                 "room": booking.rental_room,
#                 "room_name": room.room_name,
#                 "date": booking.booking_date,
#                 "start_time": booking.start_time,
#                 "end_time": booking.end_time,
#                 "duration": booking.duration_hours,
#                 "customer": booking.customer,
#                 "customer_name": booking.customer_name,
#                 "status": booking.status,
#                 "amount": booking.total_amount,
#                 "notes": booking.notes,
#                 "created_at": booking.creation
#             }
#         }
        
#     except Exception as e:
#         frappe.log_error(_("خطأ في جلب تفاصيل الحجز"), str(e))
#         return {
#             "success": False,
#             "message": _("حدث خطأ أثناء جلب تفاصيل الحجز")
#         }
        

# @frappe.whitelist()
# def get_available_rooms_with_slots(date=None, branch=None, capacity=None):
  

#     if not date:
#         date = today()

#     filters = {"status": "Available"}
#     if branch:
#         filters["branch"] = branch
#     if capacity:
#         filters["no_of_seats"] = [">=", cint(capacity)]

#     rooms = frappe.get_all(
#         "Rental Room",
#         filters=filters,
#         fields=[
#             "name", "room_name", "branch", "status", "no_of_seats",
#             "description", "room_code", "location", "start_time",
#             "end_time", "period_duration", "price_per_hour"
#         ]
#     )

#     rooms_with_slots = []
#     for room in rooms:
#         all_slots = generate_slots_for_room(room, date)
#         rooms_with_slots.append({
#             **room,
#             "available_slots": all_slots
#         })

#     return rooms_with_slots

# from datetime import datetime, timedelta
# import frappe

# def generate_slots_for_room(room, date):
#     slots = []
#     fmt = '%H:%M:%S'

#     # إحضار كل الحجوزات في اليوم
#     bookings = frappe.get_all("Room Booking", 
#         filters={
#             "rental_room": room.name,
#             "start_datetime": ['between', [f"{date} 00:00:00", f"{date} 23:59:59"]],
#             "docstatus": ["!=", 2]
#         },
#         fields=["start_datetime", "end_datetime", "name"])

#     booking_slots = []
#     for booking in bookings:
#         if booking.start_datetime and booking.end_datetime:
#             booking_slots.append({
#                 "start": booking.start_datetime.time(),
#                 "end": booking.end_datetime.time(),
#                 "id": booking.name
#             })

#     # معالجة حقلي start_time و end_time في الغرفة (Rental Room)
#     if isinstance(room.start_time, timedelta):
#         total_seconds = room.start_time.total_seconds()
#         hours = int(total_seconds // 3600)
#         minutes = int((total_seconds % 3600) // 60)
#         start_time_str = f"{hours:02d}:{minutes:02d}:00"
#     else:
#         start_time_str = room.start_time

#     if isinstance(room.end_time, timedelta):
#         total_seconds = room.end_time.total_seconds()
#         hours = int(total_seconds // 3600)
#         minutes = int((total_seconds % 3600) // 60)
#         end_time_str = f"{hours:02d}:{minutes:02d}:00"
#     else:
#         end_time_str = room.end_time

#     current_time = datetime.strptime(start_time_str, fmt)
#     end_time = datetime.strptime(end_time_str, fmt)
#     duration = int(room.period_duration)

#     while current_time + timedelta(minutes=duration) <= end_time:
#         slot_start = current_time.time()
#         slot_end = (current_time + timedelta(minutes=duration)).time()

#         status = "Available"
#         booking_id = None

#         # التحقق من وجود حجز
#         for booked in booking_slots:
#             if (slot_start < booked['end'] and booked['start'] < slot_end):
#                 status = "Booked"
#                 booking_id = booked['id']
#                 break

#         slots.append({
#             "start_time": slot_start.strftime(fmt),
#             "end_time": slot_end.strftime(fmt),
#             "status": status,
#             "price": room.price_per_hour,
#             "booking_id": booking_id
#         })

#         current_time += timedelta(minutes=duration)

#     return slots


# def get_available_slots_for_room(room_name, date, room_doc=None):
#     if not room_doc:
#         room_doc = frappe.get_cached_doc("Rental Room", room_name)

#     booking_date = getdate(date)
#     opening_time = room_doc.start_time if isinstance(room_doc.start_time, time) else time(8, 0)
#     closing_time = room_doc.end_time if isinstance(room_doc.end_time, time) else time(22, 0)
#     period_duration = cint(room_doc.get("period_duration", 60))

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

#         slot_price = flt(room_doc.price_per_hour) / (60 / period_duration)

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


# def merge_consecutive_slots(slots):
#     """
#     Merge consecutive time slots that share the same status into larger slots.
#     Input: slots = list of dicts with keys start_time, end_time, status, etc.
#     Output: list of merged slots.
#     """
#     if not slots:
#         return []

#     merged_slots = []
#     current_slot = slots[0].copy()

#     for slot in slots[1:]:
#         # Check if status is same and times are contiguous
#         if (slot['status'] == current_slot['status'] and
#             slot['start_time'] == current_slot['end_time']):
#             # Extend current slot end time
#             current_slot['end_time'] = slot['end_time']
#             # Add prices (or handle as needed)
#             current_slot['price'] += slot['price']
#             # Maintain flags if any are True
#             current_slot['booked'] = current_slot['booked'] or slot['booked']
#             current_slot['expired'] = current_slot['expired'] or slot['expired']
#         else:
#             merged_slots.append(current_slot)
#             current_slot = slot.copy()

#     merged_slots.append(current_slot)
#     return merged_slots

# @frappe.whitelist()
# def get_slots_between_times(room, date, start_time, end_time):
#     """
#     Return merged time slots between start_time and end_time with their status (Available, Booked, Expired)
#     """
#     try:
#         if not room or not date or not start_time or not end_time:
#             frappe.throw(_("Room, date, start_time and end_time are required"))

#         if not frappe.db.exists("Rental Room", room):
#             frappe.throw(_("Room does not exist"))

#         booking_date = getdate(date)
#         room_doc = frappe.get_cached_doc("Rental Room", room)

#         period_duration = cint(room_doc.get("period_duration", 60))  # minutes

#         # Parse start and end times (strings like "08:00")
#         start_dt = datetime.combine(booking_date, datetime.strptime(start_time, "%H:%M").time())
#         end_dt = datetime.combine(booking_date, datetime.strptime(end_time, "%H:%M").time())

#         now = now_datetime()
#         today = now.date()

#         # Fetch existing bookings for that room and date
#         existing_bookings = frappe.db.sql("""
#             SELECT start_time, end_time FROM `tabRoom Booking`
#             WHERE rental_room=%s AND booking_date=%s
#             AND reservation_status NOT IN ('Cancelled', 'Completed') AND docstatus=1
#         """, (room, booking_date), as_dict=1)

#         slots = []
#         current = start_dt

#         while current < end_dt:
#             slot_end = current + timedelta(minutes=period_duration)
#             if slot_end > end_dt:
#                 slot_end = end_dt  # last partial slot if any

#             # Check booking overlap
#             is_booked = False
#             for booking in existing_bookings:
#                 booking_start = get_time(booking.start_time)
#                 booking_end = get_time(booking.end_time)
#                 if not (slot_end.time() <= booking_start or current.time() >= booking_end):
#                     is_booked = True
#                     break

#             # Check if expired
#             is_expired = (booking_date == today and slot_end <= now)

#             status = "Booked" if is_booked else "Expired" if is_expired else "Available"

#             slot_price = flt(room_doc.price_per_hour) / (60 / period_duration) * ((slot_end - current).seconds / 60) / period_duration

#             slots.append({
#                 "start_time": current.strftime("%H:%M"),
#                 "end_time": slot_end.strftime("%H:%M"),
#                 "price": round(slot_price, 2),
#                 "booked": is_booked,
#                 "expired": is_expired,
#                 "status": status
#             })

#             current = slot_end

#         # Merge consecutive slots with same status
#         merged_slots = merge_consecutive_slots(slots)

#         return merged_slots

#     except Exception as e:
#         frappe.log_error(title="Failed to get slots between times", message=f"Room: {room}, Date: {date}, Start: {start_time}, End: {end_time}\n{str(e)}")
#         frappe.throw(_("Error fetching slots. Please try again later."))




# def merge_slots(slots):
#     """
#     Merge consecutive slots with the same status and price into one longer slot.
#     """
#     if not slots:
#         return []

#     merged = []
#     current = slots[0].copy()

#     for slot in slots[1:]:
#         gap = (datetime.strptime(slot["start_time"], "%H:%M") - datetime.strptime(current["end_time"], "%H:%M")).total_seconds() / 60
#         if gap == 0 and slot["status"] == current["status"] and abs(slot["price"] - current["price"]) < 0.01:
#             current["end_time"] = slot["end_time"]
#         else:
#             current["duration_minutes"] = int((datetime.strptime(current["end_time"], "%H:%M") - datetime.strptime(current["start_time"], "%H:%M")).total_seconds() / 60)
#             merged.append(current)
#             current = slot.copy()
#     current["duration_minutes"] = int((datetime.strptime(current["end_time"], "%H:%M") - datetime.strptime(current["start_time"], "%H:%M")).total_seconds() / 60)
#     merged.append(current)

#     return merged

# @frappe.whitelist()
# def get_user_bookings(from_date=None, to_date=None):
#     try:
#         bookings = frappe.get_all("Room Booking",
#             filters=[
#                 ["booking_date", "between", [from_date, to_date]],
#                 # ["status", "!=", "Cancelled"]
#             ],
#             fields=["name", "room_name", "customer_name", "start_time", 
#                    "end_time", "total_amount", "status"]
#         )
#         return bookings
#     except Exception:
#         frappe.log_error("Failed to get bookings")
#         return []
    
# @frappe.whitelist()
# def check_slot_availability(room, date, start_time, end_time):
#     """
#     Check if a custom time slot is available for booking.
#     """
#     start_dt = datetime.combine(getdate(date), get_time(start_time))
#     end_dt = datetime.combine(getdate(date), get_time(end_time))

#     existing_bookings = frappe.db.sql("""
#         SELECT start_time, end_time FROM `tabRoom Booking`
#         WHERE rental_room = %s AND booking_date = %s
#         AND reservation_status NOT IN ('Cancelled', 'Completed') AND docstatus = 1
#     """, (room, date), as_dict=1)

#     for booking in existing_bookings:
#         booking_start = datetime.combine(getdate(date), get_time(booking.start_time))
#         booking_end = datetime.combine(getdate(date), get_time(booking.end_time))

#         if not (end_dt <= booking_start or start_dt >= booking_end):
#             return {"available": False}

#     return {"available": True}


# @frappe.whitelist()
# def update_booking_status(booking_id, status):
#     """
#     Update the status of a Room Booking (e.g., Confirmed, Cancelled).
#     """
#     valid_statuses = ['Confirmed', 'Cancelled', 'Completed', 'Pending', 'Draft']
#     if status not in valid_statuses:
#         frappe.throw(_("حالة غير صالحة"))

#     try:
#         booking = frappe.get_doc("Room Booking", booking_id)
#         booking.reservation_status = status
#         booking.save(ignore_permissions=True)
#         frappe.db.commit()
#         return {"success": True, "message": _("تم تحديث حالة الحجز بنجاح")}
#     except Exception as e:
#         frappe.log_error(f"Update booking status failed: {str(e)}", "Update Booking Error")
#         frappe.throw(_("حدث خطأ أثناء تحديث حالة الحجز"))




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

# @frappe.whitelist()
# def get_rooms_with_slots():
#     """
#     Returns list of rooms with their available and booked time slots for today.
#     """
#     import datetime

#     # الوقت الحالي والتاريخ
#     now = frappe.utils.now_datetime()
#     today = now.date()
#     slot_duration = datetime.timedelta(minutes=60)

#     # جلب الغرف
#     rooms = frappe.get_all("Rental Room", fields=["name", "room_name"])

#     # جلب الحجوزات المؤكدة لهذا اليوم
#     booked_rooms = frappe.get_all(
#         "Room Booking",
#         filters={
#             "booking_date": today,
#             "status": "Confirmed"
#         },
#         fields=["rental_room", "start_time", "end_time", "name", "customer_name"]
#     )

#     # تجميع الفترات المحجوزة في قاموس لكل غرفة
#     booked_slots_by_room = {}
#     for b in booked_rooms:
#         room = b["rental_room"]
#         start = b["start_time"].time()
#         end = b["end_time"].time()
#         slot = {
#             "start_time": start.strftime("%H:%M"),
#             "end_time": end.strftime("%H:%M"),
#             "booking_id": b["name"],
#             "customer": b["customer_name"]
#         }
#         booked_slots_by_room.setdefault(room, []).append(slot)

#     result = []

#     for room in rooms:
#         room_name = room["name"]
#         available_slots = []
#         booked_slots = booked_slots_by_room.get(room_name, [])

#         # إنشاء فترات اليوم من 8 صباحاً حتى 8 مساءً
#         start_time = datetime.datetime.combine(today, datetime.time(hour=8))
#         end_time = datetime.datetime.combine(today, datetime.time(hour=20))

#         current_time = start_time
#         while current_time < end_time:
#             slot_start = current_time.time()
#             slot_end = (current_time + slot_duration).time()

#             # تنسيق الوقت كنص
#             slot = {
#                 "start_time": slot_start.strftime("%H:%M"),
#                 "end_time": slot_end.strftime("%H:%M")
#             }

#             # هل هذه الفترة محجوزة؟
#             is_booked = any(
#                 slot_start.strftime("%H:%M") == b["start_time"] and slot_end.strftime("%H:%M") == b["end_time"]
#                 for b in booked_slots
#             )

#             if not is_booked:
#                 available_slots.append(slot)

#             current_time += slot_duration

#         result.append({
#             "room": room["room_name"],
#             "room_id": room_name,
#             "available_slots": available_slots,
#             "booked_slots": booked_slots  # مباشرة دون تعديل
#         })

#     return result

@frappe.whitelist()
def get_rooms_with_slots(date=None, branch=None, capacity=None):
    """
    Returns list of rooms with their available and booked time slots for the given date.
    """
    from datetime import datetime, time, timedelta
    
    # إذا لم يتم تحديد تاريخ، استخدم تاريخ اليوم
    if not date:
        date = frappe.utils.today()
    
    booking_date = frappe.utils.getdate(date)
    now = frappe.utils.now_datetime()
    
    # جلب الغرف مع الفلاتر
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
    
    result = []
    
    for room in rooms:
        # تحديد أوقات العمل للغرفة
        opening_time = room.start_time if isinstance(room.start_time, time) else time(8, 0)
        closing_time = room.end_time if isinstance(room.end_time, time) else time(22, 0)
        period_duration = cint(room.get("period_duration", 60))  # دقائق
        
        # تحويل إلى كائنات datetime
        start_dt = datetime.combine(booking_date, opening_time)
        end_dt = datetime.combine(booking_date, closing_time)
        
        # إذا كان التاريخ هو اليوم، ابدأ من الوقت الحالي
        if booking_date == now.date():
            start_dt = max(start_dt, now)
        
        # جلب الحجوزات الحالية لهذه الغرفة
        existing_bookings = frappe.get_all(
            "Room Booking",
            filters={
                "rental_room": room.name,
                "booking_date": booking_date,
                "status": "Confirmed",
                "docstatus": 1
            },
            fields=["start_time", "end_time", "name", "customer_name"]
        )
        
        slots = []
        current = start_dt
        
        while current + timedelta(minutes=period_duration) <= end_dt:
            slot_end = current + timedelta(minutes=period_duration)
            
            # التحقق من التداخل مع الحجوزات الحالية
            is_booked = any(
                not (slot_end.time() <= get_time(b.start_time) or current.time() >= get_time(b.end_time))
                for b in existing_bookings
            )
            
            # التحقق من انتهاء صلاحية الفترة
            is_expired = booking_date == now.date() and slot_end <= now
            
            status = "Booked" if is_booked else "Expired" if is_expired else "Available"
            
            # حساب السعر
            slot_price = flt(room.price_per_hour) / (60 / period_duration) if room.price_per_hour else 0
            
            slots.append({
                "start_time": current.time().strftime("%H:%M"),
                "end_time": slot_end.time().strftime("%H:%M"),
                "price": round(slot_price, 2),
                "booked": is_booked,
                "expired": is_expired,
                "status": status,
                "booking_id": b.name if is_booked else None
            })
            
            current = slot_end
        
        result.append({
            "name": room.name,
            "room_name": room.room_name,
            "branch": room.branch,
            "no_of_seats": room.no_of_seats,
            "price_per_hour": room.price_per_hour,
            "available_slots": slots
        })
    
    return result


# @frappe.whitelist()
# def get_booked_rooms():
#     """
#     Returns a list of booked slots for today, including room info and booking times.
#     """
#     today = frappe.utils.today()
#     booked_rooms = frappe.get_all(
#         "Room Booking",
#         filters={
#             "booking_date": today,
#             "status": "Confirmed"  # assuming status is string, not list here
#         },
#         fields=["rental_room", "start_datetime", "end_datetime", "name"]
#     )

#     booked_slots = []
#     for b in booked_rooms:
#         booked_slots.append({
#             "room": b.get("rental_room"),
#             "start_time": b.get("start_datetime").strftime("%H:%M") if b.get("start_datetime") else None,
#             "end_time": b.get("end_datetime").strftime("%H:%M") if b.get("end_datetime") else None,
#             "booking_id": b.get("name")
#         })
#     return booked_slots



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

def get_available_slots_for_room(room_name, date, room_doc=None):
    if not room_doc:
        room_doc = frappe.get_cached_doc("Rental Room", room_name)

    booking_date = getdate(date)
    opening_time = room_doc.start_time if isinstance(room_doc.start_time, time) else time(8, 0)
    closing_time = room_doc.end_time if isinstance(room_doc.end_time, time) else time(22, 0)
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

        if room_price_doc and room_price_doc.price_per_hour is not None:
            slot_price = flt(room_price_doc.price_per_hour) * flt(period_duration)
        elif room_doc.price_per_hour:
            slot_price = flt(room_doc.price_per_hour) * flt(period_duration)
        else:
            slot_price = 0.0  # أو يمكنك استخدام frappe.throw إذا كان السعر إلزامياً

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

