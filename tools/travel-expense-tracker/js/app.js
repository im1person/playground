// Main App Controller (Global)
import { store } from './store.js';
import { initDashboard, renderDashboard } from './dashboard.js';
import { 
    renderFullList, 
    renderTripList, 
    selectCategory, 
    closeModal, 
    openAddModal, 
    togglePaymentFields,
    getSelectedReceiptBlob
} from './ui.js';
import { switchTab, formatCurrency, getTripDate, setCurrency } from './utils.js';
import { saveReceipt, deleteReceipt, clearAllReceipts } from './db.js';

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

    // Expense Search
    const searchInput = document.getElementById('expense-search');
    const searchClear = document.getElementById('expense-search-clear');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            searchClear.classList.toggle('hidden', !searchInput.value);
            renderAll();
        });
    }
    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.classList.add('hidden');
            renderAll();
        });
    }

    const listSortEl = document.getElementById('list-sort');
    if (listSortEl) {
        listSortEl.value = localStorage.getItem('travelTrackerListSort') || 'dateDesc';
        listSortEl.addEventListener('change', (e) => {
            localStorage.setItem('travelTrackerListSort', e.target.value);
            renderAll();
        });
    }

    document.querySelectorAll('.filter-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const baseClass = 'filter-cat-btn px-2.5 py-1 rounded-lg text-xs font-medium ';
            const activeClass = 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
            const inactiveClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500';
            document.querySelectorAll('.filter-cat-btn').forEach(b => {
                b.className = baseClass + (b === btn ? activeClass : inactiveClass);
                b.classList.toggle('filter-cat-active', b === btn);
            });
            renderAll();
        });
    });

    document.querySelectorAll('.filter-pay-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const baseClass = 'filter-pay-btn px-2.5 py-1 rounded-lg text-xs font-medium ';
            const activeClass = 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
            const inactiveClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500';
            document.querySelectorAll('.filter-pay-btn').forEach(b => {
                b.className = baseClass + (b === btn ? activeClass : inactiveClass);
                b.classList.toggle('filter-pay-active', b === btn);
            });
            renderAll();
        });
    });

    // FAB: tap = open modal, long-press = quick templates
    const fab = document.getElementById('fab-add');
    const quickMenu = document.getElementById('quick-templates');
    let fabTimer = null;
    let fabTriggered = false;
    const showQuickMenu = () => {
        fabTriggered = true;
        quickMenu.classList.toggle('hidden');
        if (window.lucide) lucide.createIcons();
    };
    if (fab) {
        fab.addEventListener('pointerdown', () => {
            fabTriggered = false;
            fabTimer = setTimeout(showQuickMenu, 500);
        });
        fab.addEventListener('pointerup', () => {
            clearTimeout(fabTimer);
            if (!fabTriggered) {
                quickMenu.classList.add('hidden');
                openAddModal();
            }
        });
        fab.addEventListener('pointerleave', () => clearTimeout(fabTimer));
    }
    document.addEventListener('click', (e) => {
        if (quickMenu && !quickMenu.contains(e.target) && e.target !== fab && !fab?.contains(e.target)) {
            quickMenu.classList.add('hidden');
        }
    });

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

    const searchQuery = (document.getElementById('expense-search')?.value || '').trim().toLowerCase();
    let filteredExpenses = searchQuery
        ? displayExpenses.filter(i => {
            const text = `${i.title} ${i.note || ''} ${i.category} ${i.currency} ${i.address || ''} ${i.airline || ''} ${i.flightNo || ''}`.toLowerCase();
            return text.includes(searchQuery);
        })
        : displayExpenses;

    const catFilter = document.querySelector('.filter-cat-btn.filter-cat-active')?.dataset.cat || 'all';
    if (catFilter !== 'all') filteredExpenses = filteredExpenses.filter(i => i.category === catFilter);

    const payFilter = document.querySelector('.filter-pay-btn.filter-pay-active')?.dataset.pay || 'all';
    if (payFilter !== 'all') filteredExpenses = filteredExpenses.filter(i => i.paymentMethod === payFilter);

    const listSort = localStorage.getItem('travelTrackerListSort') || 'dateDesc';
    renderFullList(filteredExpenses, trip.settings.homeCurrency, listSort);
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
    const themeToggle = document.getElementById('setting-theme-dark');
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'dark' : 'light';
            store.updateSettings({ theme });
            applyTheme(theme);
        });
    }

    const noteTextarea = document.getElementById('setting-general-note');
    noteTextarea.addEventListener('input', (e) => {
        store.updateSettings({ generalNote: e.target.value });
        autoResizeTextarea(noteTextarea);
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
        'setting-end-date': s.endDate || '',
        'setting-general-note': s.generalNote || ''
    };
    for (const [id, val] of Object.entries(ids)) {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = val;
    }
    const noteTA = document.getElementById('setting-general-note');
    if (noteTA && document.activeElement !== noteTA) autoResizeTextarea(noteTA);

    const themeEl = document.getElementById('setting-theme-dark');
    if (themeEl && document.activeElement !== themeEl) themeEl.checked = (s.theme || 'light') === 'dark';
    applyTheme(s.theme || 'light');
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
}


async function handleFormSubmit(e) {
    e.preventDefault();
    try {
        const entryId = document.getElementById('entry-id').value;
        const isEdit = !!entryId;
        const id = entryId || Date.now().toString();

        // Determine category from DOM state
        let currentCategory = 'general';
        const activeCatBtn = document.querySelector('.cat-btn.text-blue-700') || document.querySelector('.cat-btn.bg-blue-50');
        if (activeCatBtn) currentCategory = activeCatBtn.dataset.cat;

        const selectedBlob = getSelectedReceiptBlob();
        let receiptId = null;

        if (isEdit) {
            const oldItem = store.activeTrip.expenses.find(i => i.id === entryId);
            receiptId = oldItem?.receiptId || null;

            if (selectedBlob) {
                // Check if it's a NEW file (File object) vs existing Blob we loaded
                if (selectedBlob instanceof File) {
                    receiptId = `rcpt_${id}_${Date.now()}`;
                    await saveReceipt(receiptId, selectedBlob);
                    if (oldItem?.receiptId) await deleteReceipt(oldItem.receiptId);
                }
            } else if (oldItem?.receiptId) {
                await deleteReceipt(oldItem.receiptId);
                receiptId = null;
            }
        } else if (selectedBlob) {
            receiptId = `rcpt_${id}_${Date.now()}`;
            await saveReceipt(receiptId, selectedBlob);
        }

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
            departure: document.getElementById('inp-departure').value,
            receiptId: receiptId
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

let undoTimer = null;
let undoItem = null;

function deleteItem(id) {
    const item = store.activeTrip.expenses.find(i => i.id === id);
    if (!item) return;

    undoItem = { ...item };
    store.deleteExpense(id);

    const toast = document.getElementById('undo-toast');
    const msg = document.getElementById('undo-toast-msg');
    const btn = document.getElementById('undo-toast-btn');
    msg.textContent = `已刪除「${item.title}」`;
    toast.classList.remove('hidden');

    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = setTimeout(async () => {
        toast.classList.add('hidden');
        if (undoItem?.receiptId) {
            try { await deleteReceipt(undoItem.receiptId); } catch {}
        }
        undoItem = null;
    }, 5000);

    btn.onclick = () => {
        if (undoTimer) clearTimeout(undoTimer);
        if (undoItem) {
            store.addExpense(undoItem);
            undoItem = null;
        }
        toast.classList.add('hidden');
    };
}

function duplicateItem(id) {
    const item = store.activeTrip.expenses.find(i => i.id === id);
    if (!item) return;
    const dup = { ...item, id: Date.now().toString(), date: new Date().toISOString(), receiptId: null };
    store.addExpense(dup);
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

async function clearAllData() {
    if (confirm('Clear ALL trips? This will also delete all receipts.')) {
        await clearAllReceipts();
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
        alert('已複製詳情到剪貼簿！');
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
        alert('已複製摘要到剪貼簿！');
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
window.duplicateItem = duplicateItem;
window.quickAdd = quickAdd;

function quickAdd(title, category = 'general') {
    document.getElementById('quick-templates')?.classList.add('hidden');
    openAddModal();
    setTimeout(() => {
        document.getElementById('inp-title').value = title;
        selectCategory(category);
        document.getElementById('inp-amount')?.focus();
    }, 100);
}
window.switchTab = switchTab;
window.setCurrency = setCurrency;

let noteCollapsed = false;
function toggleNoteCollapse() {
    noteCollapsed = !noteCollapsed;
    const body = document.getElementById('general-note-body');
    const icon = document.getElementById('note-collapse-icon');
    if (!body) return;
    if (noteCollapsed) {
        body.style.maxHeight = '0px';
        if (icon) icon.style.transform = 'rotate(180deg)';
    } else {
        body.style.maxHeight = body.scrollHeight + 'px';
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
}
window.toggleNoteCollapse = toggleNoteCollapse;

function copyNoteToClipboard() {
    const note = store.activeTrip?.settings?.generalNote || '';
    if (!note) return;
    navigator.clipboard.writeText(note).then(() => {
        const btn = document.querySelector('#general-note-container [title*="Copy"]');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i>';
            if (window.lucide) lucide.createIcons();
            setTimeout(() => { btn.innerHTML = orig; if (window.lucide) lucide.createIcons(); }, 1500);
        }
    });
}
window.copyNoteToClipboard = copyNoteToClipboard;

function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 96) + 'px';
}

let notePreviewMode = false;
function toggleNotePreview() {
    notePreviewMode = !notePreviewMode;
    const editArea = document.getElementById('note-edit-area');
    const previewArea = document.getElementById('note-preview-area');
    const previewContent = document.getElementById('note-preview-content');
    const toggleBtn = document.getElementById('note-preview-toggle');
    if (!editArea || !previewArea) return;

    if (notePreviewMode) {
        const text = document.getElementById('setting-general-note')?.value || '';
        try {
            const html = typeof marked !== 'undefined'
                ? (typeof marked.parse === 'function' ? marked.parse(text) : marked(text))
                : text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
            previewContent.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html) : html;
        } catch {
            previewContent.textContent = text;
            previewContent.style.whiteSpace = 'pre-wrap';
        }
        editArea.classList.add('hidden');
        previewArea.classList.remove('hidden');
        toggleBtn.innerHTML = '<i data-lucide="pencil" class="w-3 h-3"></i> 編輯';
        toggleBtn.classList.remove('bg-gray-100', 'text-gray-500');
        toggleBtn.classList.add('bg-blue-100', 'text-blue-600');
    } else {
        editArea.classList.remove('hidden');
        previewArea.classList.add('hidden');
        toggleBtn.innerHTML = '<i data-lucide="eye" class="w-3 h-3"></i> 預覽';
        toggleBtn.classList.add('bg-gray-100', 'text-gray-500');
        toggleBtn.classList.remove('bg-blue-100', 'text-blue-600');
        const ta = document.getElementById('setting-general-note');
        autoResizeTextarea(ta);
    }
    if (window.lucide) lucide.createIcons();
}
window.toggleNotePreview = toggleNotePreview;

