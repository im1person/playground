// Utils (Global)
export function formatCurrency(num, curr) {
    try {
        return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: curr }).format(num);
    } catch (e) {
        return `${curr} ${parseFloat(num).toFixed(2)}`;
    }
}

export function getTripTime(isoStr) {
    if (!isoStr) return '';
    try {
        // Access store via window for now, or pass it in? 
        // Better: Functions that need dependencies should probably accept them, 
        // BUT to minimize refactor risk, we can keep using window.store if we ensure app.js sets it, 
        // OR better: Import store? Circular dependency risk if store uses utils.
        // Let's stick to simple pure functions where possible.
        // These functions access `window.store`. In ESM, `window.store` might not be set yet if we don't assign it.
        // We will ensure `store.js` assigns `window.store` for backward compat or just import `store` instance.
        // For now, let's allow `window.store` access but note it.
        const store = window.store;
        const tz = store?.activeTrip?.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        return new Date(isoStr).toLocaleTimeString('sv-SE', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '';
    }
}

export function getDetailedTime(isoStr) {
    if (!isoStr) return '';
    try {
        const store = window.store;
        const tz = store?.activeTrip?.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Format: "1/26(週一) 14:30"
        return new Date(isoStr).toLocaleString('zh-TW', {
            timeZone: tz,
            month: 'numeric',
            day: 'numeric',
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(' ', ''); 
    } catch (e) {
        return '';
    }
}

export function getTripDate(isoStr) {
    if (!isoStr) return '';
    try {
        const store = window.store; 
        const tz = store?.activeTrip?.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        return new Date(isoStr).toLocaleDateString('sv-SE', { timeZone: tz });
    } catch (e) {
        return isoStr.split('T')[0]; // Fallback
    }
}

export function setCurrency(inputId, code) {
    const el = document.getElementById(inputId);
    if (el) {
        el.value = code;
        el.dispatchEvent(new Event('change'));
    }
}

export function switchTab(viewName) {
    // Update Nav
    document.querySelectorAll('.bottom-nav-item').forEach(el => {
        if (el.dataset.target === 'view-' + viewName) {
            el.classList.add('active', 'text-blue-600');
        } else {
            el.classList.remove('active', 'text-blue-600');
        }
    });

    // Update Views
    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById('view-' + viewName);
    if (target) target.classList.remove('hidden');
}

export function getAdjustedExpenses(expenses) {
    const processedList = [];
    expenses.forEach(item => {
        if (item.category === 'accommodation' && item.spreadCost && item.nights > 1 && item.checkin) {
            const nights = parseInt(item.nights);
            const avgAmount = parseFloat(item.amount) / nights;
            const parts = item.checkin.split('-');
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const day = parseInt(parts[2]);

            for (let i = 0; i < nights; i++) {
                let splitItem = { ...item };
                const d = new Date(year, month, day + i, 12, 0, 0);
                splitItem.date = d.toISOString();
                splitItem.amount = avgAmount;
                splitItem.title = `${item.title} (${i + 1}/${nights})`;
                splitItem.isVirtual = true;
                splitItem.originalId = item.id;
                processedList.push(splitItem);
            }
        } else {
            processedList.push(item);
        }
    });
    return processedList;
}

// Global exports moved to window assignment in main module if needed, 
// strictly exports here.

