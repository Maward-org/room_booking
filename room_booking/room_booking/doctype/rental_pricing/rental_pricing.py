# Copyright (c) 2025, alaalsalam and contributors
# For license information, please see license.txt

# apps/room_booking/room_booking/doctype/rental_pricing/rental_pricing.py
import frappe
from frappe.model.document import Document

class RentalPricing(Document):
    def validate(self):
        # Rental Room must exist
        if not self.rental_room or not frappe.db.exists("Rental Room", self.rental_room):
            frappe.throw("Valid Rental Room is required.")

        # Price per hour
        if self.price_per_hour is None or self.price_per_hour < 0:
            frappe.throw("Price per hour must be zero or greater.")

        # Effective dates
        if not self.effective_from or not self.effective_to:
            frappe.throw("Both Effective From and Effective To dates are required.")
        if self.effective_from > self.effective_to:
            frappe.throw("Effective From date must not be after Effective To date.")

        # Prevent overlapping pricing for the same room
        overlapping = frappe.db.sql("""
            SELECT name FROM `tabRental Pricing`
            WHERE
                rental_room = %(rental_room)s
                AND name != %(name)s
                AND (
                    (%(from)s BETWEEN effective_from AND effective_to)
                    OR (%(to)s BETWEEN effective_from AND effective_to)
                    OR (effective_from BETWEEN %(from)s AND %(to)s)
                    OR (effective_to BETWEEN %(from)s AND %(to)s)
                )
            """, {
                "rental_room": self.rental_room,
                "name": self.name or "New Rental Pricing",
                "from": self.effective_from,
                "to": self.effective_to
            })
        if overlapping:
            frappe.throw("Overlapping pricing periods detected for the same room.")
