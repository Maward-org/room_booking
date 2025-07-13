import frappe
from frappe.model.document import Document
from frappe.utils import get_datetime, get_time, getdate, now_datetime, flt
from frappe import _

class RoomBooking(Document):
    def validate(self):
        self._validate_fields()
        self._validate_times()
        self._fetch_price_and_amount()
        self._prevent_overlap()
        # يمكنك تفعيل حالة الحجز تلقائيًا حسب الوقت إذا أردت
        # self._set_status_by_time()

    def _validate_fields(self):
        required = [
            ("rental_room", _("Rental Room")),
            ("customer_name", _("Customer")),
            ("booking_date", _("Booking Date")),
            ("start_time", _("Start Time")),
            ("end_time", _("End Time"))
        ]
        for field, label in required:
            if not getattr(self, field):
                frappe.throw(_("{0} is required.").format(label))

        if not frappe.db.exists("Rental Room", self.rental_room):
            frappe.throw(_("Rental Room does not exist."))

    def _validate_times(self):
        start = get_time(self.start_time)
        end = get_time(self.end_time)

        if not start or not end:
            frappe.throw(_("Start Time and End Time must be valid times."))

        if start >= end:
            frappe.throw(_("End Time must be after Start Time."))

        # حساب المدة بالساعات
        from datetime import datetime
        today = datetime.today()
        duration = (datetime.combine(today, end) - datetime.combine(today, start)).total_seconds() / 3600

        if duration <= 0:
            frappe.throw(_("Booking duration must be greater than zero."))

        self.duration_hours = round(duration, 2)

    def _fetch_price_and_amount(self):
        price = get_price_for_room_and_date(self.rental_room, self.booking_date)
        if price is None:
            frappe.throw(_("No valid pricing found for this room and date."))

        self.price_per_hour = price
        self.total_amount = round(flt(price) * flt(self.duration_hours), 2)

    def _prevent_overlap(self):
        start = get_time(self.start_time)
        end = get_time(self.end_time)

        overlapping = frappe.db.sql("""
            SELECT name FROM `tabRoom Booking`
            WHERE rental_room = %(room)s
            AND name != %(name)s
            AND reservation_status NOT IN ('Cancelled', 'Completed')
            AND booking_date = %(booking_date)s
            AND (
                (%(start)s < end_time AND %(end)s > start_time)
            )
        """, {
            "room": self.rental_room,
            "name": self.name or "New Room Booking",
            "booking_date": self.booking_date,
            "start": start,
            "end": end,
        })

        if overlapping:
            frappe.throw(_("This room is already booked for the selected period."))

    def on_submit(self):
        if self.reservation_status != "Confirmed":
            self.reservation_status = "Confirmed"

    def on_cancel(self):
        self.reservation_status = "Cancelled"

@frappe.whitelist()
def get_price_for_room_and_date(rental_room, booking_date):
    date = getdate(booking_date)
    pricing = frappe.get_all(
        "Rental Pricing",
        filters={
            "rental_room": rental_room,
            "effective_from": ["<=", date],
            "effective_to": [">=", date]
        },
        fields=["price_per_hour"],
        order_by="effective_from desc",
        limit_page_length=1
    )
    return pricing[0]["price_per_hour"] if pricing else None
