// Main App Controller (Global)
import { store } from './store.js';
import { initDashboard, renderDashboard } from './dashboard.js';
import { 
    renderFullList, 
    renderTripList, 
    selectCategory, 
    closeModal, 
    openAddModal, 
    togglePaymentFields 
} from './ui.js';
import { switchTab, formatCurrency, getTripDate, setCurrency } from './utils.js';

// Init
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    renderAll();

    // Global Listeners
    setupSettingsListeners();

    // Setup Multi-Trip Toggle
    const headerTitle = document.querySelector('header h1');
    if (headerTitle) {
        headerTitle.classList.add('cursor-pointer');
        headerTitle.onclick = () => {
            document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
            document.getElementById('view-trip-select').classList.remove('hidden');
            renderTripList();
        };
    }

    // Date Filter Toggle
    const dateToggle = document.getElementById('toggle-date-filter');
    if (dateToggle) {
        dateToggle.addEventListener('change', (e) => {
            store.updateSettings({ filterDateRange: e.target.checked });
            renderAll();
        });
    }

    const groupToggle = document.getElementById('toggle-group-day');
    if (groupToggle) {
        groupToggle.addEventListener('change', () => {
            renderAll();
        });
    }

    // Subscribe to store changes to keep UI in sync
    store.subscribe(renderAll);
});

function renderAll() {
    renderDashboard();

    // Render Full List logic
    const trip = store.activeTrip;
    if (!trip) return;

    let displayExpenses = trip.expenses;
    if (trip.settings.startDate && trip.settings.endDate && trip.settings.filterDateRange) {
        const s = trip.settings.startDate;
        const e = trip.settings.endDate;
        displayExpenses = trip.expenses.filter(i => {
           // Use utility to handle timezone matching if needed, 
           // here raw split is used in original code, but we should be consistent.
           // Original was i.date.split('T')[0].
           // Let's stick to original logic for consistency unless we use utils.
           return i.date.split('T')[0] >= s && i.date.split('T')[0] <= e;
        });
    }

    renderFullList(displayExpenses, trip.settings.homeCurrency);
    updateSettingsUI(trip.settings);
}


// --- Settings ---
function setupSettingsListeners() {
    document.getElementById('setting-budget').addEventListener('input', (e) => {
        store.updateSettings({ budget: parseFloat(e.target.value) || 0 });
    });
    document.getElementById('setting-budget-slider').addEventListener('input', (e) => {
        store.updateSettings({ budget: parseFloat(e.target.value) || 0 });
    });
    document.getElementById('setting-home-currency').addEventListener('change', (e) => {
        store.updateSettings({ homeCurrency: e.target.value });
    });
    document.getElementById('setting-foreign-currency').addEventListener('change', (e) => {
        store.updateSettings({ foreignCurrency: e.target.value });
    });
    document.getElementById('setting-exchange-rate').addEventListener('input', (e) => {
        store.updateSettings({ exchangeRate: parseFloat(e.target.value) || 1 });
    });
    document.getElementById('setting-location').addEventListener('input', (e) => {
        store.updateSettings({ location: e.target.value });
    });
    document.getElementById('setting-timezone').addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) {
            store.updateSettings({ timezone: '' });
            renderAll();
            return;
        }
        try {
            // Validate
            new Date().toLocaleString('en-US', { timeZone: val });
            store.updateSettings({ timezone: val });
            renderAll();
        } catch (err) {
            alert('Invalid Timezone ID');
            // Revert value
            e.target.value = store.activeTrip.settings.timezone || '';
        }
    });
    document.getElementById('setting-start-date').addEventListener('change', (e) => {
        store.updateSettings({ startDate: e.target.value });
    });
    document.getElementById('setting-end-date').addEventListener('change', (e) => {
        store.updateSettings({ endDate: e.target.value });
    });

    // Smart Rate for Add Form
    document.getElementById('inp-currency').addEventListener('change', (e) => {
        const settings = store.activeTrip.settings;
        if (e.target.value === settings.homeCurrency) {
            document.getElementById('inp-rate').value = 1;
        } else if (e.target.value === settings.foreignCurrency) {
            document.getElementById('inp-rate').value = settings.exchangeRate || 1;
        }
    });
}

function updateSettingsUI(settings) {
    const s = settings;
    const ids = {
        'setting-budget': s.budget,
        'setting-budget-slider': Math.min(s.budget, 100000),
        'setting-home-currency': s.homeCurrency,
        'setting-foreign-currency': s.foreignCurrency || '',
        'setting-exchange-rate': s.exchangeRate || '',
        'setting-location': s.location || '',
        'setting-timezone': s.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        'setting-start-date': s.startDate || '',
        'setting-end-date': s.endDate || ''
    };
    for (const [id, val] of Object.entries(ids)) {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = val;
    }
}


function handleFormSubmit(e) {
    e.preventDefault();
    try {
        const entryId = document.getElementById('entry-id').value;
        const isEdit = !!entryId;
        const id = entryId || Date.now().toString();

        // Determine category from DOM state
        let currentCategory = 'general';
        const activeCatBtn = document.querySelector('.cat-btn.bg-blue-50');
        if (activeCatBtn) currentCategory = activeCatBtn.dataset.cat;

        const newItem = {
            id: id,
            category: currentCategory,
            title: document.getElementById('inp-title').value,
            amount: document.getElementById('inp-amount').value,
            currency: document.getElementById('inp-currency').value,
            rate: document.getElementById('inp-rate').value,
            paymentMethod: document.querySelector('input[name="payment-method"]:checked').value,
            icOwner: document.getElementById('inp-ic-owner').value,
            date: new Date(document.getElementById('inp-date').value).toISOString(),
            address: document.getElementById('inp-address').value,
            checkin: document.getElementById('inp-checkin').value,
            nights: document.getElementById('inp-nights').value,
            spreadCost: document.getElementById('inp-spread-cost').checked,
            note: document.getElementById('inp-note').value,
            flightNo: document.getElementById('inp-flight-no').value,
            airline: document.getElementById('inp-airline').value,
            departure: document.getElementById('inp-departure').value
        };

        if (isEdit) {
            store.updateExpense(newItem);
        } else {
            store.addExpense(newItem);
        }
        closeModal();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function deleteItem(id) {
    if (confirm('Delete?')) store.deleteExpense(id);
}

// --- Import/Export ---
function exportJSON() {
    // Export ALL trips
    const dataStr = JSON.stringify(store.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'travel_tracker_backup.json';
    a.click();
}

function importJSON(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.trips) {
                store.data = data;
                store.save();
                alert('Imported Successfully');
            } else {
                alert('Invalid Data Format');
            }
        } catch (err) { alert('Invalid JSON'); }
    };
    reader.readAsText(file);
}

function exportCSV() {
    // Export Active Trip
    const trip = store.activeTrip;
    const headers = ['Date', 'Category', 'Title', 'Amount', 'Currency', 'Rate', 'Total', 'Payment', 'Note'];
    const rows = trip.expenses.map(e => [
        new Date(e.date).toLocaleDateString(),
        e.category,
        e.title,
        e.amount,
        e.currency,
        e.rate,
        (e.amount * e.rate).toFixed(2),
        e.paymentMethod,
        e.category === 'accommodation' ? `Checkin:${e.checkin} ` : (e.flightNo || '')
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenses_${trip.name}.csv`);
    link.click();
}

function clearAllData() {
    if (confirm('Clear ALL trips?')) {
        localStorage.removeItem('travelTrackerData_v2');
        localStorage.removeItem('travelTrackerBooking'); // Clear legacy data
        location.reload();
    }
}

// Trip Management Actions
function createNewTrip() {
    const name = prompt('Trip Name (e.g. Kyoto 2026):');
    if (name) {
        store.createTrip(name);
        document.getElementById('view-trip-select').classList.add('hidden');
        document.getElementById('view-settings').classList.remove('hidden'); // Go to settings
        switchTab('settings');
    }
};

async function shareItem(id) {
    const item = store.activeTrip.expenses.find(x => x.id === id);
    if (!item) return;

    let details = '';
    if (item.category === 'accommodation') details = `📍 地址: ${item.address}\n📅 入住: ${item.checkin} `;
    if (item.category === 'transport') details = `✈️ 航班: ${item.airline} ${item.flightNo}\n🕒 時間:
    ${item.departure} `;

    const text = `📌 ${item.title}\n💰 金額: ${item.currency} ${item.amount}\n${details} `;

    if (navigator.share) {
        await navigator.share({ title: item.title, text: text });
    } else {
        navigator.clipboard.writeText(text);
        alert('已複製詳情到剪貼簿!');
    }
};

async function shareSummary() {
    const trip = store.activeTrip;
    const total = trip.expenses.reduce((s, i) => s + (i.amount * i.rate), 0);
    const remaining = trip.settings.budget - total;

    // Quick calc for top category
    const categories = { 'general': 0, 'accommodation': 0, 'transport': 0 };
    trip.expenses.forEach(item => {
        const amount = parseFloat(item.amount) * (parseFloat(item.rate) || 1);
        categories[item.category] = (categories[item.category] || 0) + amount;
    });
    const topCatKey = Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b);
    const labels = { 'general': '一般', 'accommodation': '住宿', 'transport': '交通' };

    const text = `✈️ 旅遊記帳報告 (${trip.name}) \n💰 總支出: $${total.toFixed(0)}\n📉 剩餘預算: $${remaining.toFixed(0)}\n📊 最大開銷: ${labels[topCatKey] || '無'}`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: '旅遊記帳摘要',
                text: text
            });
        } catch (err) {
            console.log('Share canceled');
        }
    } else {
        navigator.clipboard.writeText(text);
        alert('已複製摘要到剪貼簿!');
    }
};

// Exports
window.handleFormSubmit = handleFormSubmit;
window.exportJSON = exportJSON;
window.exportCSV = exportCSV;
window.importJSON = importJSON;
window.clearAllData = clearAllData;
window.createNewTrip = createNewTrip;
window.shareItem = shareItem;
window.shareSummary = shareSummary;
window.deleteItem = deleteItem;
window.switchTab = switchTab;
window.setCurrency = setCurrency;

