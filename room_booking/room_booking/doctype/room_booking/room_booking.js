// Copyright (c) 2025, alaalsalam and contributors
// For license information, please see license.txt

// public/js/room_booking.js
frappe.ui.form.on('Room Booking', {
    rental_room: function(frm) {
        frm.trigger('fetch_and_set_price');
    },
    start_datetime: function(frm) {
        frm.trigger('fetch_and_set_price');
    },
    end_datetime: function(frm) {
        frm.trigger('calculate_duration_and_total');
    },
    fetch_and_set_price: function(frm) {
        if (frm.doc.rental_room && frm.doc.start_datetime) {
            frappe.call({
                method: 'room_booking.room_booking.doctype.room_booking.room_booking.get_price_for_room_and_datetime',
                args: {
                    rental_room: frm.doc.rental_room,
                    booking_datetime: frm.doc.start_datetime
                },
                callback: function(r) {
                    if (r.message !== undefined) {
                        frm.set_value('price_per_hour', r.message);
                        frm.trigger('calculate_duration_and_total');
                    } else {
                        frm.set_value('price_per_hour', 0);
                        frm.set_value('total_amount', 0);
                    }
                }
            });
        } else {
            frm.set_value('price_per_hour', 0);
            frm.set_value('total_amount', 0);
        }
    },
    calculate_duration_and_total: function(frm) {
        if (frm.doc.start_datetime && frm.doc.end_datetime) {
            var start = new Date(frm.doc.start_datetime);
            var end = new Date(frm.doc.end_datetime);
            var hours = (end - start) / 36e5;
            if (hours > 0) {
                frm.set_value('duration_hours', Math.round(hours * 100) / 100);
                var total = (frm.doc.price_per_hour || 0) * hours;
                frm.set_value('total_amount', Math.round(total * 100) / 100);
            } else {
                frm.set_value('duration_hours', 0);
                frm.set_value('total_amount', 0);
            }
        }
    },
    validate: function(frm) {
        // Ensure price & duration are up to date before saving
        frm.trigger('fetch_and_set_price');
    }
});
