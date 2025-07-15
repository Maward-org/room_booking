class StateService {
    constructor() {
        this.state = {
            selectedSlots: [],
            selectedRoom: null,
            isLoading: false,
            slotsData: {}
        };
    }

    getSelectedSlots() {
        return this.state.selectedSlots;
    }

    setSelectedSlots(slots) {
        this.state.selectedSlots = slots;
    }

    getSelectedRoom() {
        return this.state.selectedRoom;
    }

    setSelectedRoom(room) {
        this.state.selectedRoom = room;
    }

    isLoading() {
        return this.state.isLoading;
    }

    setLoading(loading) {
        this.state.isLoading = loading;
    }

    getSlotsData() {
        return this.state.slotsData;
    }

    setSlotsData(data) {
        this.state.slotsData = data;
    }

    clearSelection() {
        this.state.selectedSlots = [];
        this.state.selectedRoom = null;
    }
}