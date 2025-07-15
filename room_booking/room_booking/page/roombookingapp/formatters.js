class Formatters {
    static formatTime(hours, minutes) {
        const pad = num => num.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}`;
    }

    static formatTimeForFrontend(timeStr) {
        if (!timeStr) return '00:00';
        return timeStr.split(':').slice(0, 2).join(':');
    }

    static formatTimeForBackend(timeStr) {
        if (!timeStr) return '00:00:00';
        return timeStr.includes(':') ? `${timeStr}:00` : '00:00:00';
    }

    static calculateDuration(start, end) {
        const startTime = new Date(`2000-01-01T${start}:00`);
        const endTime = new Date(`2000-01-01T${end}:00`);
        return (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
    }

    static formatCurrency(amount) {
        return parseFloat(amount || 0).toFixed(2) + ' ' + __('SAR');
    }
}