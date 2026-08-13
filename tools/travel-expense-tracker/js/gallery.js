/**
 * Receipt Gallery — trip-scoped or all-trips (master) view
 */
import { store } from './store.js';
import { getReceiptIds, getTripDate, formatCurrency } from './utils.js';
import { getReceipt } from './db.js';

let galleryScope = localStorage.getItem('travelTrackerGalleryScope') || 'trip';
/** @type {string[]} */
let galleryObjectUrls = [];
/** @type {{ url: string, caption: string, expenseId: string, tripId: string }[]} */
let flatGalleryItems = [];
let renderToken = 0;

function escapeHtml(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function escapeAttr(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function revokeGalleryUrls() {
    galleryObjectUrls.forEach(u => {
        try { URL.revokeObjectURL(u); } catch {}
    });
    galleryObjectUrls = [];
}

function collectTripEntries(trip) {
    const entries = [];
    const expenses = [...(trip.expenses || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const exp of expenses) {
        const ids = getReceiptIds(exp);
        for (const rid of ids) {
            entries.push({
                tripId: trip.id,
                tripName: trip.name || trip.settings?.location || '行程',
                expenseId: exp.id,
                title: exp.title || '無標題',
                date: exp.date,
                amount: exp.amount,
                currency: exp.currency,
                homeCurrency: trip.settings?.homeCurrency || 'HKD',
                rate: exp.rate,
                receiptId: rid
            });
        }
    }
    return entries;
}

async function loadEntryUrls(entries, token) {
    const loaded = [];
    for (const entry of entries) {
        if (token !== renderToken) return null;
        try {
            const blob = await getReceipt(entry.receiptId);
            if (token !== renderToken) return null;
            if (!blob) continue;
            const url = URL.createObjectURL(blob);
            if (token !== renderToken) {
                try { URL.revokeObjectURL(url); } catch {}
                return null;
            }
            galleryObjectUrls.push(url);
            loaded.push({ ...entry, url });
        } catch (err) {
            console.warn('Gallery: skip receipt', entry.receiptId, err);
        }
    }
    return loaded;
}

function updateScopeUI() {
    const tripBtn = document.getElementById('gallery-scope-trip');
    const allBtn = document.getElementById('gallery-scope-all');
    const hint = document.getElementById('gallery-scope-hint');
    const active = 'gallery-scope-btn flex-1 py-2 rounded-lg text-xs font-medium transition bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm';
    const idle = 'gallery-scope-btn flex-1 py-2 rounded-lg text-xs font-medium transition text-gray-500 dark:text-gray-400';
    if (tripBtn) tripBtn.className = galleryScope === 'trip' ? active : idle;
    if (allBtn) allBtn.className = galleryScope === 'all' ? active : idle;
    if (hint) {
        hint.textContent = galleryScope === 'all'
            ? '所有行程嘅收據，按行程分組'
            : '只顯示目前行程嘅收據';
    }
}

function buildThumbCard(item, flatIndex) {
    const homeAmt = (parseFloat(item.amount) || 0) * (parseFloat(item.rate) || 1);
    const amtStr = formatCurrency(homeAmt, item.homeCurrency);
    const day = getTripDate(item.date) || '';
    return `
        <div class="gallery-thumb relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 group cursor-zoom-in"
             data-flat-idx="${flatIndex}" title="${escapeAttr(item.title)}">
            <img src="${item.url}" alt="${escapeAttr(item.title)}" class="w-full h-full object-cover pointer-events-none" loading="lazy">
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pt-4 pb-1.5 pointer-events-none">
                <div class="text-[10px] text-white font-medium truncate leading-tight">${escapeHtml(item.title)}</div>
                <div class="text-[9px] text-white/80 truncate tabular-nums">${escapeHtml(day)} · ${escapeHtml(amtStr)}</div>
            </div>
            <button type="button" class="gallery-open-exp absolute top-1 right-1 bg-black/50 hover:bg-blue-600 text-white rounded-full p-1.5 transition"
                data-expense-id="${escapeAttr(item.expenseId)}" data-trip-id="${escapeAttr(item.tripId)}" title="開啟支出" aria-label="開啟支出">
                <i data-lucide="external-link" class="w-3 h-3"></i>
            </button>
        </div>
    `;
}

function renderLoadedGallery(items) {
    const container = document.getElementById('gallery-content');
    const countEl = document.getElementById('gallery-count');
    if (!container) return;

    if (countEl) countEl.textContent = items.length ? `${items.length} 張` : '';

    if (!items.length) {
        flatGalleryItems = [];
        container.innerHTML = `
            <div class="text-center text-gray-400 py-12 space-y-2">
                <i data-lucide="image-off" class="w-10 h-10 mx-auto opacity-40"></i>
                <p class="text-sm">未有收據相片</p>
                <p class="text-xs">新增支出時可以影相或揀相</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    // Group: trip → day → items
    const byTrip = new Map();
    for (const item of items) {
        if (!byTrip.has(item.tripId)) {
            byTrip.set(item.tripId, { name: item.tripName, days: new Map() });
        }
        const tripG = byTrip.get(item.tripId);
        const day = getTripDate(item.date) || '未知日期';
        if (!tripG.days.has(day)) tripG.days.set(day, []);
        tripG.days.get(day).push(item);
    }

    let html = '';
    const displayOrder = [];
    const showTripHeaders = galleryScope === 'all' || byTrip.size > 1;

    for (const [, tripG] of byTrip) {
        if (showTripHeaders) {
            const tripCount = [...tripG.days.values()].reduce((n, arr) => n + arr.length, 0);
            html += `
                <div class="flex items-center gap-2 pt-1">
                    <i data-lucide="map-pin" class="w-4 h-4 text-blue-500 shrink-0"></i>
                    <h3 class="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">${escapeHtml(tripG.name)}</h3>
                    <span class="text-[10px] text-gray-400 tabular-nums shrink-0">${tripCount} 張</span>
                </div>`;
        }

        const dayKeys = [...tripG.days.keys()].sort((a, b) => b.localeCompare(a));
        for (const day of dayKeys) {
            const dayItems = tripG.days.get(day);
            html += `
                <div class="space-y-2">
                    <div class="text-xs font-semibold text-gray-500 dark:text-gray-400">${escapeHtml(day)} · ${dayItems.length} 張</div>
                    <div class="grid grid-cols-3 gap-2">`;
            for (const item of dayItems) {
                html += buildThumbCard(item, displayOrder.length);
                displayOrder.push(item);
            }
            html += `</div></div>`;
        }
    }

    flatGalleryItems = displayOrder;
    container.innerHTML = html;
    bindGalleryClicks(container);
    if (window.lucide) lucide.createIcons();
}

function bindGalleryClicks(container) {
    container.querySelectorAll('.gallery-thumb').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.gallery-open-exp')) return;
            const idx = parseInt(el.dataset.flatIdx, 10);
            openGalleryAt(idx);
        });
    });
    container.querySelectorAll('.gallery-open-exp').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tripId = btn.dataset.tripId;
            const expenseId = btn.dataset.expenseId;
            if (typeof window.closeLightbox === 'function') window.closeLightbox();
            if (tripId && tripId !== store.data.activeTripId) {
                store.switchTrip(tripId);
            }
            // Defer modal open so trip switch + gallery re-render can settle
            setTimeout(() => {
                if (typeof window.openAddModal === 'function') {
                    window.openAddModal(expenseId);
                }
            }, 0);
        });
    });
}

function openGalleryAt(index) {
    if (!flatGalleryItems.length) return;
    const urls = flatGalleryItems.map(i => i.url);
    const captions = flatGalleryItems.map(i => {
        const tripBit = galleryScope === 'all' ? `${i.tripName} · ` : '';
        return `${tripBit}${i.title}`;
    });
    const i = Math.max(0, Math.min(index, urls.length - 1));
    if (typeof window.openLightboxGallery === 'function') {
        window.openLightboxGallery(urls, i, captions);
    }
}

export function setGalleryScope(scope) {
    if (scope !== 'trip' && scope !== 'all') return;
    galleryScope = scope;
    localStorage.setItem('travelTrackerGalleryScope', scope);
    updateScopeUI();
    renderGallery();
}

export async function renderGallery() {
    const container = document.getElementById('gallery-content');
    if (!container) return;

    updateScopeUI();
    const token = ++renderToken;

    // Closing lightbox first avoids broken images when we revoke blob URLs
    const lb = document.getElementById('lightbox');
    if (lb && !lb.classList.contains('hidden') && typeof window.closeLightbox === 'function') {
        window.closeLightbox();
    }

    revokeGalleryUrls();
    flatGalleryItems = [];

    container.innerHTML = `<div class="text-center text-gray-400 py-10 text-sm">載入收據中…</div>`;

    let entries = [];
    if (galleryScope === 'all') {
        for (const trip of store.data.trips || []) {
            entries = entries.concat(collectTripEntries(trip));
        }
    } else {
        const trip = store.activeTrip;
        if (trip) entries = collectTripEntries(trip);
    }

    const loaded = await loadEntryUrls(entries, token);
    if (token !== renderToken || loaded == null) return;
    renderLoadedGallery(loaded);
}

export function initGallery() {
    document.getElementById('gallery-scope-trip')?.addEventListener('click', () => setGalleryScope('trip'));
    document.getElementById('gallery-scope-all')?.addEventListener('click', () => setGalleryScope('all'));
    document.getElementById('btn-gallery-export')?.addEventListener('click', () => {
        if (typeof window.exportPhotosZip === 'function') {
            window.exportPhotosZip(galleryScope === 'all' ? 'all' : 'trip');
        }
    });
    updateScopeUI();
}

window.setGalleryScope = setGalleryScope;
window.renderGallery = renderGallery;
