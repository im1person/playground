const STORAGE_KEY = 'travelTrackerData_v2';

// Initial State Template
const DEFAULT_TRIP = {
    id: '',
    name: 'My Trip',
    settings: {
        budget: 0,
        homeCurrency: 'HKD',
        foreignCurrency: 'JPY',
        exchangeRate: 1,
        startDate: '',
        endDate: '',
        location: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        filterDateRange: false,
        theme: 'light',
        generalNote: '',
        tripMembers: [],
        cashPoolTotal: 0,
        cashAllocations: []
    },
    expenses: []
};

export class Store {
    constructor() {
        this.data = {
            activeTripId: null,
            trips: []
        };
        this.listeners = [];
        this.load();
    }

    load() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                this.data = JSON.parse(raw);
            } catch (e) {
                console.error('Store Load Error', e);
            }
        }

        // Migration: Check for old v1 data if v2 is empty
        if (this.data.trips.length === 0) {
            const oldData = localStorage.getItem('travelTrackerBooking');
            if (oldData) {
                try {
                    const parsed = JSON.parse(oldData);
                    // Convert old format to new trip
                    const newTrip = { ...DEFAULT_TRIP, id: Date.now().toString(), name: parsed.settings.location || '匯入嘅行程', ...parsed };
                    this.data.trips.push(newTrip);
                    this.data.activeTripId = newTrip.id;
                    this.save();
                } catch (e) { }
            }
        }

        // Ensure at least one trip exists
        if (this.data.trips.length === 0) {
            this.createTrip('My First Trip');
        }

        // Ensure active trip
        if (!this.data.activeTripId && this.data.trips.length > 0) {
            this.data.activeTripId = this.data.trips[0].id;
        }

        // Merge new settings keys for older saved data
        let migrated = false;
        const defS = DEFAULT_TRIP.settings;
        this.data.trips.forEach(trip => {
            trip.settings = { ...defS, ...trip.settings };
            if (!Array.isArray(trip.settings.tripMembers)) {
                trip.settings.tripMembers = [];
                migrated = true;
            }
            if (typeof trip.settings.cashPoolTotal !== 'number') {
                trip.settings.cashPoolTotal = parseFloat(trip.settings.cashPoolTotal) || 0;
                migrated = true;
            }
            if (!Array.isArray(trip.settings.cashAllocations)) {
                trip.settings.cashAllocations = [];
                migrated = true;
            }
        });
        if (migrated) this.save();
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        this.notify();
    }

    notify() {
        this.listeners.forEach(cb => cb(this.data));
    }

    subscribe(cb) {
        this.listeners.push(cb);
    }

    // --- Actions ---

    get activeTrip() {
        return this.data.trips.find(t => t.id === this.data.activeTripId) || this.data.trips[0];
    }

    createTrip(name = 'New Trip') {
        const newTrip = JSON.parse(JSON.stringify(DEFAULT_TRIP));
        newTrip.id = Date.now().toString();
        newTrip.name = name;
        newTrip.settings.location = name;
        this.data.trips.push(newTrip);
        this.data.activeTripId = newTrip.id;
        this.save();
        return newTrip;
    }

    switchTrip(id) {
        if (this.data.trips.find(t => t.id === id)) {
            this.data.activeTripId = id;
            this.save();
        }
    }

    deleteTrip(id) {
        this.data.trips = this.data.trips.filter(t => t.id !== id);
        if (this.data.activeTripId === id) {
            this.data.activeTripId = this.data.trips.length > 0 ? this.data.trips[0].id : null;
            if (!this.data.activeTripId) this.createTrip();
        }
        this.save();
    }

    updateSettings(updatedSettings) {
        const trip = this.activeTrip;
        trip.settings = { ...trip.settings, ...updatedSettings };
        // Sync name if location changes
        if (updatedSettings.location) trip.name = updatedSettings.location;
        this.save();
    }

    addExpense(expense) {
        this.activeTrip.expenses.push(expense);
        this.save();
    }

    updateExpense(updatedExpense) {
        const trip = this.activeTrip;
        const index = trip.expenses.findIndex(e => e.id === updatedExpense.id);
        if (index !== -1) {
            trip.expenses[index] = updatedExpense;
            this.save();
        }
    }

    deleteExpense(id) {
        const trip = this.activeTrip;
        trip.expenses = trip.expenses.filter(e => e.id !== id);
        this.save();
    }
}

// Global Store Instance
export const store = new Store();
if (typeof window !== 'undefined') window.store = store;

