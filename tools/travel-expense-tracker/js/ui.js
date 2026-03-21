// UI Module
import { store } from './store.js';
import { formatCurrency, getDetailedTime, switchTab, getAdjustedExpenses, getTripDate } from './utils.js';
import { getReceipt } from './db.js';

let currentCategory = 'general';
let selectedReceiptBlob = null;

export function getCurrentCategory() {
    return currentCategory;
}

function escapeHtml(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function escapeAttr(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

const PAID_BY_CHIP_BASE = 'paid-by-chip px-3 py-1.5 rounded-full text-xs font-medium transition border shrink-0';
const PAID_BY_CHIP_ON = 'bg-blue-600 text-white border-blue-600 shadow-sm dark:bg-blue-500';
const PAID_BY_CHIP_OFF = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600';

function paidByChipClass(selected) {
    return `${PAID_BY_CHIP_BASE} ${selected ? PAID_BY_CHIP_ON : PAID_BY_CHIP_OFF}`;
}

function initPaidByChipClicks() {
    const wrap = document.getElementById('field-paid-by-wrap');
    if (!wrap || wrap.dataset.paidByBound) return;
    wrap.dataset.paidByBound = '1';
    wrap.addEventListener('click', (e) => {
        const btn = e.target.closest('button.paid-by-chip');
        if (!btn) return;
        e.preventDefault();
        const name = btn.dataset.name ?? '';
        const hidden = document.getElementById('inp-paid-by');
        if (hidden) hidden.value = name;
        const container = document.getElementById('inp-paid-by-chips');
        if (!container) return;
        container.querySelectorAll('.paid-by-chip').forEach(b => {
            const on = (b.dataset.name ?? '') === name;
            b.className = paidByChipClass(on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    });
}
initPaidByChipClicks();

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
    insurance: [
        { label: '旅遊保險', icon: '🛡️' },
        { label: '醫療保險', icon: '🏥' },
        { label: '租車保險', icon: '🚗' },
        { label: '航班保險', icon: '✈️' },
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
    // insurance: 無額外區塊
    renderTitlePresets(cat);
}

export function populatePaidByFields(paidByValue = '') {
    const settings = store.activeTrip?.settings || {};
    const members = Array.isArray(settings.tripMembers) ? settings.tripMembers.filter(m => m && String(m).trim()) : [];
    const hidden = document.getElementById('inp-paid-by');
    const chips = document.getElementById('inp-paid-by-chips');
    const text = document.getElementById('inp-paid-by-text');
    if (!hidden || !chips || !text) return;

    const v = paidByValue || '';
    hidden.value = v;

    const chipsHtml = [];
    const noneSelected = !v;
    chipsHtml.push(`<button type="button" class="${paidByChipClass(noneSelected)}" data-name="" aria-pressed="${noneSelected}">唔揀</button>`);
    members.forEach(m => {
        const on = v === m;
        chipsHtml.push(`<button type="button" class="${paidByChipClass(on)}" data-name="${escapeAttr(m)}" aria-pressed="${on}">${escapeHtml(m)}</button>`);
    });
    if (v && !members.includes(v)) {
        chipsHtml.push(`<button type="button" class="${paidByChipClass(true)}" data-name="${escapeAttr(v)}" aria-pressed="true">${escapeHtml(v)}（舊紀錄）</button>`);
    }

    if (members.length > 0 || (v && !members.includes(v))) {
        chips.innerHTML = chipsHtml.join('');
        chips.classList.remove('hidden');
        text.classList.add('hidden');
    } else {
        chips.classList.add('hidden');
        chips.innerHTML = '';
        text.classList.remove('hidden');
        text.value = v;
    }
    updatePaidByHint();
    if (window.lucide) lucide.createIcons();
}

function updatePaidByHint() {
    const hint = document.getElementById('paid-by-hint');
    if (!hint) return;
    const method = document.querySelector('input[name="payment-method"]:checked')?.value;
    const foreign = (store.activeTrip?.settings?.foreignCurrency || '').trim();
    if (method === 'cash') {
        if (foreign) {
            hint.textContent = `外幣（${foreign}）現金會跟現金池扣；揀邊個人頭。本幣現金唔計池。`;
        } else {
            hint.textContent = '現金池只計外幣現金；請先喺設定填「外幣」。本幣現金唔會入池。';
        }
    } else {
        hint.textContent = '記低邊個找數（唔扣現金池各人剩餘）';
    }
}

export function getPaidByFromForm() {
    const chips = document.getElementById('inp-paid-by-chips');
    const hidden = document.getElementById('inp-paid-by');
    const text = document.getElementById('inp-paid-by-text');
    if (chips && !chips.classList.contains('hidden') && hidden) return (hidden.value || '').trim();
    if (text && !text.classList.contains('hidden')) return (text.value || '').trim();
    return '';
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
    document.getElementById('hint-timezone').textContent = `（裝置時間 GMT${sign}${offset}）`;

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
    populatePaidByFields('');

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
            populatePaidByFields(item.paidBy || '');

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
        if (window.lucide) lucide.createIcons();
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
    if (method === 'ic_card') ownerInput.placeholder = '持卡人姓名';
    else if (method === 'e_pay') ownerInput.placeholder = '戶口／平台名稱';
    else if (method === 'paid_other') ownerInput.placeholder = '代付人姓名';
    updatePaidByHint();
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
        img.onclick = () => openLightbox(url, '收據預覽');
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
    div.className = 'bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition active:bg-gray-50 dark:active:bg-gray-700/80 touch-manipulation';
    div.onclick = () => window.openAddModal(item.id);

    const nativeAmount = parseFloat(item.amount);
    const rate = parseFloat(item.rate) || 1;
    const homeAmount = nativeAmount * rate;

    let iconName = 'shopping-bag';
    let iconColor = 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
    if (item.category === 'accommodation') { iconName = 'hotel'; iconColor = 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'; }
    if (item.category === 'transport') { iconName = 'plane'; iconColor = 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400'; }
    if (item.category === 'insurance') { iconName = 'shield'; iconColor = 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'; }

    let detailHtml = '';
    // Payment Method Badge
    let paymentBadge = '';
    const ownerTag = item.icOwner ? ` (${escapeHtml(item.icOwner)})` : '';
    switch (item.paymentMethod) {
        case 'cash':
            paymentBadge = '<span class="text-[10px] bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded-md font-medium shrink-0">現金</span>';
            break;
        case 'ic_card':
            paymentBadge = `<span class="text-[10px] bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded-md font-medium shrink-0">IC卡${ownerTag}</span>`;
            break;
        case 'e_pay':
            paymentBadge = `<span class="text-[10px] bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded-md font-medium shrink-0">電子付款${ownerTag}</span>`;
            break;
        case 'paid_other':
            paymentBadge = `<span class="text-[10px] bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 px-1.5 py-0.5 rounded-md font-medium shrink-0">代付${ownerTag}</span>`;
            break;
        default:
            paymentBadge = '<span class="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-md font-medium shrink-0">碌卡</span>';
    }

    const paidByTag = item.paidBy
        ? `<span class="text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded-md font-medium shrink-0">找數：${escapeHtml(item.paidBy)}</span>`
        : '';

    if (item.category === 'accommodation' && item.checkin) {
        const checkinDate = new Date(item.checkin);
        const nights = parseInt(item.nights) || 1;
        const checkoutDate = new Date(checkinDate);
        checkoutDate.setDate(checkinDate.getDate() + nights);
        const avgPrice = nativeAmount / nights;
        const addrEsc = escapeHtml(item.address || '無地址');

        detailHtml = `
            <div class="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 space-y-1">
                <div class="flex items-start gap-1.5 min-w-0">
                    <i data-lucide="map-pin" class="w-3 h-3 shrink-0 mt-0.5 opacity-80"></i>
                    <span class="break-words leading-snug">${addrEsc}</span>
                </div>
                <div class="leading-snug pl-4 sm:pl-0 sm:ml-4">退房：${checkoutDate.toLocaleDateString()} · ${nights}晚 · 每晚約 ${formatCurrency(avgPrice, item.currency)}</div>
            </div>`;
    } else if (item.category === 'transport') {
        detailHtml = `<div class="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 flex items-start gap-1.5 min-w-0"><i data-lucide="calendar" class="w-3 h-3 shrink-0 mt-0.5 opacity-80"></i><span class="break-words leading-snug">${item.departure ? new Date(item.departure).toLocaleString() : ''} ${escapeHtml(item.flightNo || '')}</span></div>`;
    }

    const titleSafeJs = String(item.title || '').replace(/'/g, "\\'");

    div.innerHTML = `
        <div class="flex gap-3 items-start min-w-0">
            <div class="${iconColor} p-2.5 rounded-xl shrink-0" aria-hidden="true">
                <i data-lucide="${iconName}" class="w-5 h-5"></i>
            </div>
            <div class="flex-1 min-w-0 space-y-1">
                <div class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span class="font-bold text-base text-gray-800 dark:text-gray-100 break-words">${escapeHtml(item.title)}</span>
                    ${paymentBadge}
                    ${paidByTag}
                    ${item.receiptId ? `<button type="button" class="p-1 rounded-md text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 shrink-0 -m-0.5" title="睇收據" aria-label="睇收據" onclick="event.stopPropagation(); window.viewReceipt('${item.receiptId}', '${titleSafeJs}')"><i data-lucide="image" class="w-4 h-4"></i></button>` : ''}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                    <span class="tabular-nums">${formatCurrency(nativeAmount, item.currency)}</span>${item.currency !== homeCurrency ? ` <span class="text-gray-400">(@ ${item.rate})</span>` : ''}
                </div>
                <div><span class="inline-block font-mono bg-gray-100 dark:bg-gray-700/80 px-1.5 py-0.5 rounded-md text-[10px] text-gray-600 dark:text-gray-300">${getDetailedTime(item.date)}</span></div>
                ${detailHtml}
            </div>
            <div class="flex flex-col items-end gap-1.5 shrink-0 min-w-0 sm:min-w-[6.5rem]">
                <div class="text-lg font-bold tabular-nums tracking-tight text-gray-900 dark:text-gray-100 leading-snug text-right">${formatCurrency(homeAmount, homeCurrency)}</div>
                <div class="flex items-center gap-0.5 -mr-1 sm:mr-0">
                    <button type="button" class="btn-dup p-2.5 rounded-lg text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-600/50 min-w-[44px] min-h-[44px] flex items-center justify-center" title="複製" aria-label="複製此筆支出"><i data-lucide="copy" class="w-[18px] h-[18px]"></i></button>
                    <button type="button" class="btn-share p-2.5 rounded-lg text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-600/50 min-w-[44px] min-h-[44px] flex items-center justify-center" title="分享" aria-label="分享此筆支出"><i data-lucide="share-2" class="w-[18px] h-[18px]"></i></button>
                    <button type="button" class="btn-delete p-2.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600/50 min-w-[44px] min-h-[44px] flex items-center justify-center" title="刪除" aria-label="刪除此筆支出"><i data-lucide="trash-2" class="w-[18px] h-[18px]"></i></button>
                </div>
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
                dayLabel = `第 ${dayNum} 日 <span class="font-normal text-xs text-gray-400">（${dateKey}）</span>`;
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
            <div class="text-xs text-gray-500 dark:text-gray-400">${trip.expenses.length} 筆紀錄</div>
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
                if (confirm(`刪除行程「${trip.name}」？呢個操作無法復原。`)) {
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
