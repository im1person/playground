// UI Module
import { store } from './store.js';
import { formatCurrency, getDetailedTime, switchTab, getAdjustedExpenses, getTripDate } from './utils.js';
import { getReceipt } from './db.js';

let currentCategory = 'general';
let selectedReceiptBlob = null;

const TITLE_PRESETS = {
    general: [
        { label: '早餐', icon: '🌅' },
        { label: '午餐', icon: '☀️' },
        { label: '晚餐', icon: '🌙' },
        { label: '宵夜', icon: '🍜' },
        { label: '飲品', icon: '🧋' },
        { label: '零食', icon: '🍪' },
        { label: '超市', icon: '🛒' },
        { label: '便利店', icon: '🏪' },
        { label: '手信', icon: '🎁' },
        { label: '門票', icon: '🎫' },
        { label: '購物', icon: '🛍️' },
        { label: '藥房', icon: '💊' },
        { label: '電話/上網', icon: '📶' },
        { label: '貼士', icon: '💰' },
    ],
    transport: [
        { label: '地鐵/MTR', icon: '🚇' },
        { label: '巴士', icon: '🚌' },
        { label: '火車', icon: '🚄' },
        { label: '的士', icon: '🚕' },
        { label: 'Uber/Grab', icon: '📱' },
        { label: '機票', icon: '✈️' },
        { label: '渡輪', icon: '⛴️' },
        { label: '租車', icon: '🚗' },
        { label: '油費', icon: '⛽' },
        { label: '泊車費', icon: '🅿️' },
        { label: '高速公路', icon: '🛣️' },
        { label: '包車', icon: '🚐' },
    ],
    accommodation: [
        { label: '酒店', icon: '🏨' },
        { label: '民宿', icon: '🏠' },
        { label: 'Airbnb', icon: '🏡' },
        { label: '青旅', icon: '🛏️' },
        { label: '溫泉旅館', icon: '♨️' },
    ],
};

function renderTitlePresets(cat) {
    const container = document.getElementById('title-presets');
    if (!container) return;
    const presets = TITLE_PRESETS[cat] || TITLE_PRESETS.general;
    container.innerHTML = presets.map(p =>
        `<button type="button" class="preset-title-btn px-2 py-1 rounded-lg text-[11px] font-medium bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-300 transition" data-title="${p.label}">${p.icon} ${p.label}</button>`
    ).join('');
    container.querySelectorAll('.preset-title-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const inp = document.getElementById('inp-title');
            if (inp) {
                inp.value = btn.dataset.title;
                inp.focus();
            }
        });
    });
}

export function selectCategory(cat) {
    currentCategory = cat;
    const activeClasses = ['bg-blue-50', 'dark:bg-blue-900/30', 'border-blue-200', 'dark:border-blue-500', 'text-blue-700', 'dark:text-blue-300'];
    document.querySelectorAll('.cat-btn').forEach(btn => {
        if (btn.dataset.cat === cat) {
            activeClasses.forEach(c => btn.classList.add(c));
        } else {
            activeClasses.forEach(c => btn.classList.remove(c));
        }
    });
    document.getElementById('fields-accommodation').classList.add('hidden');
    document.getElementById('fields-transport').classList.add('hidden');
    if (cat === 'accommodation') document.getElementById('fields-accommodation').classList.remove('hidden');
    else if (cat === 'transport') document.getElementById('fields-transport').classList.remove('hidden');
    renderTitlePresets(cat);
}

export async function openAddModal(id = null) {
    const form = document.getElementById('expense-form');
    // Safety check if DOM is ready
    if (!form) return;

    // Reset Receipt State
    removeReceipt();

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

            // Load Receipt
            if (item.receiptId) {
                try {
                    const blob = await getReceipt(item.receiptId);
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        showReceiptPreview(url);
                        selectedReceiptBlob = blob;
                    }
                } catch (err) {
                    console.error('Failed to load receipt:', err);
                }
            }

            document.getElementById('modal-title').textContent = '編輯/睇返支出';
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
    const showOwner = ['ic_card', 'e_pay', 'paid_other'].includes(method);
    icField.classList.toggle('hidden', !showOwner);
    const ownerInput = document.getElementById('inp-ic-owner');
    if (method === 'ic_card') ownerInput.placeholder = '持卡人 (Card Owner)';
    else if (method === 'e_pay') ownerInput.placeholder = '戶口 / 平台 (Account / Platform)';
    else if (method === 'paid_other') ownerInput.placeholder = '代付人 (Paid by)';
}
window.togglePaymentFields = togglePaymentFields;

export function handleReceiptSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    selectedReceiptBlob = file;
    const url = URL.createObjectURL(file);
    showReceiptPreview(url);
}

export function removeReceipt() {
    selectedReceiptBlob = null;
    ['inp-receipt-camera', 'inp-receipt-file'].forEach(id => {
        const inp = document.getElementById(id);
        if (inp) inp.value = '';
    });
    const container = document.getElementById('receipt-preview-container');
    if (container) container.classList.add('hidden');
}

function showReceiptPreview(url) {
    const img = document.getElementById('receipt-preview');
    const container = document.getElementById('receipt-preview-container');
    if (img && container) {
        img.src = url;
        container.classList.remove('hidden');
        
        // Add click listener to open lightbox
        img.onclick = () => openLightbox(url, '收據預覽 (Receipt)');
        img.classList.add('cursor-zoom-in');
    }
}

export function getSelectedReceiptBlob() {
    return selectedReceiptBlob;
}

window.handleReceiptSelection = handleReceiptSelection;
window.removeReceipt = removeReceipt;

export function openLightbox(url, caption = '') {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-caption');
    if (lb && img) {
        img.src = url;
        cap.textContent = caption;
        lb.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }
}

export function closeLightbox() {
    const lb = document.getElementById('lightbox');
    if (lb) lb.classList.add('hidden');
}

window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;


export function createItemElement(item, homeCurrency) {
    const div = document.createElement('div');
    div.className = 'bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition';
    div.onclick = () => window.openAddModal(item.id);

    const nativeAmount = parseFloat(item.amount);
    const rate = parseFloat(item.rate) || 1;
    const homeAmount = nativeAmount * rate;

    let iconName = 'shopping-bag';
    let iconColor = 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
    if (item.category === 'accommodation') { iconName = 'hotel'; iconColor = 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'; }
    if (item.category === 'transport') { iconName = 'plane'; iconColor = 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400'; }

    let detailHtml = '';
    // Payment Method Badge
    let paymentBadge = '';
    const ownerTag = item.icOwner ? ` (${item.icOwner})` : '';
    switch (item.paymentMethod) {
        case 'cash':
            paymentBadge = '<span class="text-[10px] bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded ml-2">現金</span>';
            break;
        case 'ic_card':
            paymentBadge = `<span class="text-[10px] bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded ml-2">IC卡${ownerTag}</span>`;
            break;
        case 'e_pay':
            paymentBadge = `<span class="text-[10px] bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded ml-2">電子付款${ownerTag}</span>`;
            break;
        case 'paid_other':
            paymentBadge = `<span class="text-[10px] bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 px-1.5 py-0.5 rounded ml-2">代付${ownerTag}</span>`;
            break;
        default:
            paymentBadge = '<span class="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded ml-2">碌卡</span>';
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
                <div class="font-bold text-gray-800 dark:text-gray-100 truncate flex items-center">
                    ${item.title} ${paymentBadge} 
                    ${item.receiptId ? `<i data-lucide="image" class="w-3.5 h-3.5 text-blue-500 ml-1 cursor-pointer hover:scale-110 transition" onclick="event.stopPropagation(); window.viewReceipt('${item.receiptId}', '${item.title.replace(/'/g, "\\'")}')"></i>` : ''}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <div>${formatCurrency(nativeAmount, item.currency)} ${item.currency !== homeCurrency ? '(@ ' + item.rate + ')' : ''}</div>
                    <div class="mt-1"><span class="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded text-[10px] text-gray-600 dark:text-gray-300">${getDetailedTime(item.date)}</span></div>
                </div>
                ${detailHtml}
            </div>
        </div>
        <div class="text-right shrink-0">
            <div class="font-bold text-gray-800 dark:text-gray-100">${formatCurrency(homeAmount, homeCurrency)}</div>
            <div class="flex gap-2 justify-end mt-2">
                    <button class="btn-dup text-gray-400 hover:text-green-500" title="複製 (Duplicate)"><i data-lucide="copy" class="w-4 h-4"></i></button>
                    <button class="btn-share text-gray-400 hover:text-blue-500"><i data-lucide="share-2" class="w-4 h-4"></i></button>
                    <button class="btn-delete text-gray-400 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>
    `;

    div.querySelector('.btn-dup').onclick = (e) => { e.stopPropagation(); window.duplicateItem(item.id); };
    div.querySelector('.btn-share').onclick = (e) => { e.stopPropagation(); window.shareItem(item.id); };
    div.querySelector('.btn-delete').onclick = (e) => { e.stopPropagation(); window.deleteItem(item.id); };

    return div;
}
window.createItemElement = createItemElement;

// Initial Listeners setup in app.js or here? 
// Let's attach the listener in renderFullList or better, make app.js call render on toggle.
// For now, let's just update the render function.

function getSortComparator(sortOrder) {
    const homeCurrency = store.activeTrip?.settings?.homeCurrency || 'HKD';
    const homeAmount = (item) => (parseFloat(item.amount) || 0) * (parseFloat(item.rate) || 1);
    switch (sortOrder) {
        case 'dateAsc': return (a, b) => new Date(a.date) - new Date(b.date);
        case 'amountDesc': return (a, b) => homeAmount(b) - homeAmount(a);
        case 'amountAsc': return (a, b) => homeAmount(a) - homeAmount(b);
        default: return (a, b) => new Date(b.date) - new Date(a.date);
    }
}

export function renderFullList(dataList, currency, sortOrder = 'dateDesc') {
    const listContainer = document.getElementById('full-list');
    const isGrouped = document.getElementById('toggle-group-day')?.checked;

    const processedList = getAdjustedExpenses(dataList);
    const sorted = [...processedList].sort(getSortComparator(sortOrder));

    listContainer.innerHTML = sorted.length ? '' : '<div class="text-center text-gray-400 py-10 text-sm">撳 + 新增第一筆支出</div>';

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
                    card: 0,
                    ePay: 0,
                    paidOther: 0
                };
            }
            groups[dateKey].items.push(item);

            const amountVal = parseFloat(item.amount);
            const rateVal = parseFloat(item.rate) || 1;
            const homeAmount = amountVal * rateVal;

            groups[dateKey].total += homeAmount;

            switch (item.paymentMethod) {
                case 'cash':
                    if (item.currency === foreignCode) {
                        groups[dateKey].cashForeign += amountVal;
                    } else {
                        groups[dateKey].cashHome += homeAmount;
                    }
                    break;
                case 'ic_card':
                    groups[dateKey].ic += (homeAmount || 0);
                    break;
                case 'e_pay':
                    groups[dateKey].ePay += (homeAmount || 0);
                    break;
                case 'paid_other':
                    groups[dateKey].paidOther += (homeAmount || 0);
                    break;
                default:
                    groups[dateKey].card += homeAmount;
            }
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
            statsParts.push(`<span class="text-slate-600 dark:text-slate-300 whitespace-nowrap">總: <span class="font-bold">${formatCurrency(group.total, currency)}</span></span>`);

            // Cash Foreign
            if (group.cashForeign > 0) {
                statsParts.push(`<span class="text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 px-1 rounded whitespace-nowrap">現(${foreignCode}): ${formatCurrency(group.cashForeign, foreignCode)}</span>`);
            }
            if (group.cashHome > 0) {
                statsParts.push(`<span class="text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 px-1 rounded whitespace-nowrap">現(${homeCode}): ${formatCurrency(group.cashHome, homeCode)}</span>`);
            }

            if (group.ic > 0) {
                statsParts.push(`<span class="text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-1 rounded whitespace-nowrap">IC: ${formatCurrency(group.ic, currency)}</span>`);
            }
            if (group.card > 0) {
                statsParts.push(`<span class="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded whitespace-nowrap">碌卡: ${formatCurrency(group.card, currency)}</span>`);
            }
            if (group.ePay > 0) {
                statsParts.push(`<span class="text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-1 rounded whitespace-nowrap">電付: ${formatCurrency(group.ePay, currency)}</span>`);
            }
            if (group.paidOther > 0) {
                statsParts.push(`<span class="text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/30 px-1 rounded whitespace-nowrap">代付: ${formatCurrency(group.paidOther, currency)}</span>`);
            }

            const statsHtml = `
                <div class="flex gap-2 text-[10px] font-normal mt-1 overflow-x-auto no-scrollbar">
                    ${statsParts.join('')}
                </div>
            `;

            const header = document.createElement('div');
            header.className = 'sticky top-16 bg-white/95 dark:bg-gray-800/95 backdrop-blur py-3 px-2 z-10 border-b border-gray-100 dark:border-gray-700 shadow-sm mt-4 mb-2 -mx-2';
            header.innerHTML = `
                <div class="font-bold text-gray-700 dark:text-gray-200 text-sm flex justify-between items-center">
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
        const isActive = trip.id === store.data.activeTripId;
        const div = document.createElement('div');
        div.className = `p-4 rounded-xl border flex justify-between items-center transition ${isActive ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex-1 cursor-pointer';
        infoDiv.innerHTML = `
            <div class="font-bold text-gray-800 dark:text-gray-100">${trip.name}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">${trip.expenses.length} Records</div>
        `;
        infoDiv.onclick = () => {
            store.switchTrip(trip.id);
            document.getElementById('view-trip-select').classList.add('hidden');
            document.getElementById('view-dashboard').classList.remove('hidden');
        };

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'flex items-center gap-2 shrink-0 ml-3';
        if (isActive) {
            actionsDiv.innerHTML = '<i data-lucide="check" class="text-blue-500 w-5 h-5"></i>';
        }
        if (store.data.trips.length > 1) {
            const delBtn = document.createElement('button');
            delBtn.className = 'p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition';
            delBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`刪除行程「${trip.name}」？呢個操作無法復原。\nDelete trip "${trip.name}"? This cannot be undone.`)) {
                    store.deleteTrip(trip.id);
                    renderTripList();
                }
            };
            actionsDiv.appendChild(delBtn);
        }

        div.appendChild(infoDiv);
        div.appendChild(actionsDiv);
        list.appendChild(div);
    });
    if (window.lucide) lucide.createIcons();
}
window.renderTripList = renderTripList;

export async function viewReceipt(receiptId, title = '') {
    try {
        const { getReceipt } = await import('./db.js');
        const blob = await getReceipt(receiptId);
        if (blob) {
            const url = URL.createObjectURL(blob);
            openLightbox(url, title);
        } else {
            alert('搵唔到收據檔案');
        }
    } catch (err) {
        console.error('Error viewing receipt:', err);
        alert('讀取收據時發生錯誤');
    }
}
window.viewReceipt = viewReceipt;
