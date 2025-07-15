.room-booking-container {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.slots-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;
    margin-top: 10px;
}

.time-slot {
    padding: 8px;
    border-radius: 4px;
    text-align: center;
    cursor: default;
    font-size: 12px;
    border: 1px solid #ddd;
    transition: all 0.2s ease;
}

.time-slot.available {
    background-color: #e6f7e6;
    border-color: #a3d8a3;
    color: #2e7d32;
    cursor: pointer;
}

.time-slot.available:hover {
    background-color: #d0f0d0;
    transform: scale(1.03);
}

.time-slot.available.selected {
    background-color: #4caf50;
    color: white;
    font-weight: bold;
}

.time-slot.booked {
    background-color: #e3f2fd;
    border-color: #90caf9;
    color: #0d47a1;
    cursor: pointer;
}

.time-slot.booked:hover {
    background-color: #bbdefb;
}

.time-slot .duration-badge {
    display: inline-block;
    background-color: rgba(255,255,255,0.2);
    padding: 2px 5px;
    border-radius: 10px;
    font-size: 10px;
    margin-top: 3px;
}

.time-slot.expired {
    background-color: #f5f5f5;
    border-color: #e0e0e0;
    color: #9e9e9e;
}

.time-slot .small {
    font-size: 10px;
    opacity: 0.8;
}

.invalid-input {
    border-color: #ff5252 !important;
    background-color: #fff5f5 !important;
}

.card {
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: box-shadow 0.3s ease;
}

.card:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.btn-book {
    font-weight: 500;
    letter-spacing: 0.5px;
}

.selection-summary {
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}