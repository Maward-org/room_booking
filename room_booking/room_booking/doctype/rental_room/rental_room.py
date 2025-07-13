# Copyright (c) 2025, alaalsalam and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class RentalRoom(Document):
    def validate(self):
        # Required fields
        if not self.room_name or not self.room_code or not self.branch:
            frappe.throw("Room Name, Room Code, and Branch are required.")

        # Room code must be unique
        if frappe.db.exists("Rental Room", {"room_code": self.room_code, "name": ["!=", self.name]}):
            frappe.throw(f"Room Code '{self.room_code}' already exists for another room.")

        # No of seats: must be >= 0
        if self.no_of_seats is not None and self.no_of_seats < 0:
            frappe.throw("Number of seats must be zero or greater.")

        # Valid status check
        valid_status = ["Available", "Unavailable", "Maintenance"]
        if self.status and self.status not in valid_status:
            frappe.throw(f"Invalid status: {self.status}. Must be one of {valid_status}.")

        # Description: optional, but truncate if overly long
        if self.description and len(self.description) > 500:
            frappe.throw("Description is too long (max 500 characters).")
