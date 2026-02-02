// UI Module
import { store } from './store.js';
import { formatCurrency, getDetailedTime, switchTab, getAdjustedExpenses, getTripDate } from './utils.js';

let currentCategory = 'general';

export function selectCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(btn => {
        if (btn.dataset.cat === cat) {
            btn.classList.add('bg-blue-50', 'border-blue-200', 'text-black');
        } else {
            btn.classList.remove('bg-blue-50', 'border-blue-200', 'text-black');
        }
    });
    document.getElementById('fields-accommodation').classList.add('hidden');
    document.getElementById('fields-transport').classList.add('hidden');
    if (cat === 'accommodation') document.getElementById('fields-accommodation').classList.remove('hidden');
    else if (cat === 'transport') document.getElementById('fields-transport').classList.remove('hidden');
}

export function openAddModal(id = null) {
    const form = document.getElementById('expense-form');
    // Safety check if DOM is ready
    if (!form) return;

    form.reset();
    document.getElementById('entry-id').value = '';
    const settings = store.activeTrip ? store.activeTrip.settings : {};
    const defaultCurr = settings.foreignCurrency || settings.homeCurrency || 'HKD';
    let defaultRate = settings.exchangeRate || 1;

    // Auto-correct rate if default is home currency
    if (defaultCurr === settings.homeCurrency) {
        defaultRate = 1;
    }

    document.getElementById('inp-currency').value = defaultCurr;
    document.getElementById('inp-rate').value = defaultRate;

    // Show device timezone hint
    const offset = -new Date().getTimezoneOffset() / 60;
    const sign = offset >= 0 ? '+' : '';
    document.getElementById('hint-timezone').textContent = `(Device Time: GMT${sign}${offset})`;

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('inp-date').value = now.toISOString().slice(0, 16);

    // Set default date for checkin
    document.getElementById('inp-checkin').valueAsDate = new Date();
    document.getElementById('inp-nights').value = '';
    document.getElementById('inp-spread-cost').checked = false;
    document.getElementById('inp-note').value = '';
    document.getElementById('inp-ic-owner').value = '';
    togglePaymentFields(); // Reset visibility

    // Check if Edit
    if (id && typeof id === 'string' && store.activeTrip) {
        const item = store.activeTrip.expenses.find(i => i.id === id);
        if (item) {
            document.getElementById('entry-id').value = item.id;
            document.getElementById('inp-title').value = item.title;
            document.getElementById('inp-amount').value = item.amount;
            document.getElementById('inp-currency').value = item.currency;
            document.getElementById('inp-rate').value = item.rate || 1;

            const d = new Date(item.date);
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            document.getElementById('inp-date').value = d.toISOString().slice(0, 16);

            const pMethod = item.paymentMethod || 'cash';
            const radio = document.querySelector(`input[name="payment-method"][value="${pMethod}"]`);
            if (radio) radio.checked = true;

            selectCategory(item.category);
            document.getElementById('inp-address').value = item.address || '';
            document.getElementById('inp-checkin').value = item.checkin || '';
            document.getElementById('inp-nights').value = item.nights || '';
            document.getElementById('inp-spread-cost').checked = !!item.spreadCost;
            document.getElementById('inp-note').value = item.note || '';
            document.getElementById('inp-flight-no').value = item.flightNo || '';
            document.getElementById('inp-airline').value = item.airline || '';
            document.getElementById('inp-departure').value = item.departure || '';
            document.getElementById('inp-ic-owner').value = item.icOwner || '';
            togglePaymentFields(); // Update visibility based on loaded item

            document.getElementById('modal-title').textContent = '編輯/檢視支出';
        }
    } else {
        selectCategory('general');
        document.getElementById('modal-title').textContent = '新增支出';
    }

    const modalForm = document.getElementById('modal-form');
    modalForm.classList.remove('hidden');
    setTimeout(() => {
        modalForm.classList.remove('opacity-0');
        document.getElementById('modal-content').classList.remove('translate-y-full');
    }, 10);
}

export function closeModal() {
    const modalForm = document.getElementById('modal-form');
    modalForm.classList.add('opacity-0');
    document.getElementById('modal-content').classList.add('translate-y-full');
    setTimeout(() => {
        modalForm.classList.add('hidden');
    }, 300);
}

// Ensure global expoure for HTML onclicks inside the modal
window.selectCategory = selectCategory;
window.openAddModal = openAddModal;
window.closeModal = closeModal;

// Temporary solution until we have a proper modal for export
window.showExportModal = function() {
    // Scroll to settings view where export buttons are located
    switchTab('settings');
    // Highlight the data section
    const dataSection = document.querySelector('#view-settings > div:last-child');
    if(dataSection) {
        dataSection.scrollIntoView({ behavior: 'smooth' });
        dataSection.classList.add('ring-2', 'ring-blue-500');
        setTimeout(() => dataSection.classList.remove('ring-2', 'ring-blue-500'), 2000);
    }
};

export function togglePaymentFields() {
    const method = document.querySelector('input[name="payment-method"]:checked')?.value;
    const icField = document.getElementById('field-ic-owner');
    if (method === 'ic_card') {
        icField.classList.remove('hidden');
    } else {
        icField.classList.add('hidden');
    }
}
window.togglePaymentFields = togglePaymentFields;


export function createItemElement(item, homeCurrency) {
    const div = document.createElement('div');
    div.className = 'bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition';
    div.onclick = () => window.openAddModal(item.id);

    const nativeAmount = parseFloat(item.amount);
    const rate = parseFloat(item.rate) || 1;
    const homeAmount = nativeAmount * rate;

    let iconName = 'shopping-bag';
    let iconColor = 'bg-gray-100 text-gray-600';
    if (item.category === 'accommodation') { iconName = 'hotel'; iconColor = 'bg-indigo-100 text-indigo-600'; }
    if (item.category === 'transport') { iconName = 'plane'; iconColor = 'bg-teal-100 text-teal-600'; }

    let detailHtml = '';
    // Payment Method Badge
    let paymentBadge = '';
    if (item.paymentMethod === 'cash') {
        paymentBadge = '<span class="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded ml-2">現金</span>';
    } else if (item.paymentMethod === 'ic_card') {
        const owner = item.icOwner ? ` (${item.icOwner})` : '';
        paymentBadge = `<span class="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded ml-2">IC卡${owner}</span>`;
    } else {
        paymentBadge = '<span class="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded ml-2">刷卡</span>';
    }

    if (item.category === 'accommodation' && item.checkin) {
        const checkinDate = new Date(item.checkin);
        const nights = parseInt(item.nights) || 1;
        const checkoutDate = new Date(checkinDate);
        checkoutDate.setDate(checkinDate.getDate() + nights);
        const avgPrice = nativeAmount / nights;

        detailHtml = `
            <div class="text-[10px] text-gray-400 mt-1 flex flex-col gap-0.5">
                <div class="flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${item.address || '無地址'}</div>
                <div>退房: ${checkoutDate.toLocaleDateString()} (${nights}晚, 均價: ${formatCurrency(avgPrice, item.currency)})</div>
            </div>`;
    } else if (item.category === 'transport') {
        detailHtml = `<div class="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${item.departure ? new Date(item.departure).toLocaleString() : ''} ${item.flightNo || ''}</div>`;
    }

    div.innerHTML = `
        <div class="flex items-center gap-3 overflow-hidden">
            <div class="${iconColor} p-2 rounded-lg shrink-0">
                <i data-lucide="${iconName}" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
                <div class="font-bold text-gray-800 truncate flex items-center">${item.title} ${paymentBadge}</div>
                <div class="text-xs text-gray-500 mt-0.5">
                    <div>${formatCurrency(nativeAmount, item.currency)} ${item.currency !== homeCurrency ? '(@ ' + item.rate + ')' : ''}</div>
                    <div class="mt-1"><span class="font-mono bg-gray-100 px-1 rounded text-[10px] text-gray-600">${getDetailedTime(item.date)}</span></div>
                </div>
                ${detailHtml}
            </div>
        </div>
        <div class="text-right shrink-0">
            <div class="font-bold text-gray-800">${formatCurrency(homeAmount, homeCurrency)}</div>
            <div class="flex gap-2 justify-end mt-2">
                    <button class="btn-share text-gray-400 hover:text-blue-500"><i data-lucide="share-2" class="w-4 h-4"></i></button>
                    <button class="btn-delete text-gray-400 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>
    `;

    // Attach listeners safely
    div.querySelector('.btn-share').onclick = (e) => { e.stopPropagation(); window.shareItem(item.id); };
    div.querySelector('.btn-delete').onclick = (e) => { e.stopPropagation(); window.deleteItem(item.id); };

    return div;
}
window.createItemElement = createItemElement;

// Initial Listeners setup in app.js or here? 
// Let's attach the listener in renderFullList or better, make app.js call render on toggle.
// For now, let's just update the render function.

export function renderFullList(dataList, currency) {
    const listContainer = document.getElementById('full-list');
    const isGrouped = document.getElementById('toggle-group-day')?.checked;

    // Expand expenses if needed
    const processedList = getAdjustedExpenses(dataList);

    const sorted = [...processedList].sort((a, b) => new Date(b.date) - new Date(a.date));

    listContainer.innerHTML = sorted.length ? '' : '<div class="text-center text-gray-400 py-10 text-sm">點擊 + 新增第一筆支出</div>';

    if (!isGrouped) {
        sorted.forEach(item => listContainer.appendChild(createItemElement(item, currency)));
    } else {
        // Group items first to calculate stats
        const groups = {};
        const settings = store.activeTrip?.settings || {};
        const homeCode = settings.homeCurrency || 'HKD';
        const foreignCode = settings.foreignCurrency || 'JPY';

        sorted.forEach(item => {
            const dateKey = getTripDate(item.date);
            if (!groups[dateKey]) {
                groups[dateKey] = {
                    items: [],
                    total: 0,
                    cashHome: 0,
                    cashForeign: 0,
                    ic: 0,
                    other: 0
                };
            }
            groups[dateKey].items.push(item);

            // Calc sums 
            // 1. Total (Always Home Currency)
            const amountVal = parseFloat(item.amount);
            const rateVal = parseFloat(item.rate) || 1;
            const homeAmount = amountVal * rateVal;

            groups[dateKey].total += homeAmount;

            // 2. Breakdown
            if (item.paymentMethod === 'cash') {
                if (item.currency === foreignCode) {
                    groups[dateKey].cashForeign += amountVal; // Keep in Foreign Unit
                } else {
                    groups[dateKey].cashHome += homeAmount; // Convert everything else to Home equivalent
                }
            }
            else if (item.paymentMethod === 'ic_card') groups[dateKey].ic += (homeAmount || 0);
            else groups[dateKey].other += homeAmount;
        });

        const tripStart = store.activeTrip?.settings?.startDate ? new Date(store.activeTrip.settings.startDate) : null;

        // Iterate through unique sorted keys
        const sortedKeys = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

        sortedKeys.forEach(dateKey => {
            const group = groups[dateKey];

            // Header Logic
            const dateObj = new Date(dateKey);
            let dayLabel = dateKey;
            if (tripStart) {
                const d1 = new Date(tripStart); d1.setHours(0, 0, 0, 0);
                const d2 = new Date(dateObj); d2.setHours(0, 0, 0, 0);
                const diffTime = d2 - d1;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const dayNum = diffDays + 1;
                dayLabel = `Day ${dayNum} <span class="font-normal text-xs text-gray-400">(${dateKey})</span>`;
            }

            // Stats Construction
            let statsParts = [];
            // Total
            statsParts.push(`<span class="text-slate-600 whitespace-nowrap">總: <span class="font-bold">${formatCurrency(group.total, currency)}</span></span>`);

            // Cash Foreign
            if (group.cashForeign > 0) {
                statsParts.push(`<span class="text-yellow-600 bg-yellow-50 px-1 rounded whitespace-nowrap">現(${foreignCode}): ${formatCurrency(group.cashForeign, foreignCode)}</span>`);
            }
            // Cash Home
            if (group.cashHome > 0) {
                statsParts.push(`<span class="text-yellow-600 bg-yellow-50 px-1 rounded whitespace-nowrap">現(${homeCode}): ${formatCurrency(group.cashHome, homeCode)}</span>`);
            }

            // IC
            if (group.ic > 0) {
                statsParts.push(`<span class="text-teal-600 bg-teal-50 px-1 rounded whitespace-nowrap">IC: ${formatCurrency(group.ic, currency)}</span>`);
            }
            // Other
            if (group.other > 0) {
                statsParts.push(`<span class="text-indigo-600 bg-indigo-50 px-1 rounded whitespace-nowrap">卡: ${formatCurrency(group.other, currency)}</span>`);
            }

            const statsHtml = `
                <div class="flex gap-2 text-[10px] font-normal mt-1 overflow-x-auto no-scrollbar">
                    ${statsParts.join('')}
                </div>
            `;

            const header = document.createElement('div');
            header.className = 'sticky top-16 bg-white/95 backdrop-blur py-3 px-2 z-10 border-b border-gray-100 shadow-sm mt-4 mb-2 -mx-2';
            header.innerHTML = `
                <div class="font-bold text-gray-700 text-sm flex justify-between items-center">
                    <div>${dayLabel}</div>
                </div>
                ${statsHtml}
            `;

            listContainer.appendChild(header);
            group.items.forEach(item => listContainer.appendChild(createItemElement(item, currency)));
        });
    }

    if (window.lucide) lucide.createIcons();
}
window.renderFullList = renderFullList;

export function renderTripList() {
    // New function for Trip Selector View
    const list = document.getElementById('trip-list-container');
    if (!list) return;

    list.innerHTML = '';
    store.data.trips.forEach(trip => {
        const div = document.createElement('div');
        div.className = `p-4 rounded-xl border flex justify-between items-center cursor-pointer transition ${trip.id === store.data.activeTripId ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-100 hover:bg-gray-50'}`;
        div.onclick = () => {
            store.switchTrip(trip.id);
            document.getElementById('view-trip-select').classList.add('hidden');
            document.getElementById('view-dashboard').classList.remove('hidden');
            // Also update nav state?
        };

        div.innerHTML = `
            <div>
                <div class="font-bold text-gray-800">${trip.name}</div>
                <div class="text-xs text-gray-500">${trip.expenses.length} Records</div>
            </div>
            ${trip.id === store.data.activeTripId ? '<i data-lucide="check" class="text-blue-500 w-5 h-5"></i>' : ''}
        `;
        list.appendChild(div);
    });
    if (window.lucide) lucide.createIcons();
}
window.renderTripList = renderTripList;
