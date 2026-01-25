// Utils (Global)
function formatCurrency(num, curr) {
    try {
        return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: curr }).format(num);
    } catch (e) {
        return `${curr} ${parseFloat(num).toFixed(2)}`;
    }
}

function getTripTime(isoStr) {
    if (!isoStr) return '';
    try {
        const store = window.store;
        const tz = store?.activeTrip?.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        return new Date(isoStr).toLocaleTimeString('sv-SE', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '';
    }
}

function getDetailedTime(isoStr) {
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
        }).replace(' ', ''); // remove space between date/week if any, or adjust manually
    } catch (e) {
        return '';
    }
}

function getTripDate(isoStr) {
    if (!isoStr) return '';
    try {
        const store = window.store; // Ensure global access
        const tz = store?.activeTrip?.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Return YYYY-MM-DD in target timezone
        // Swedish locale uses YYYY-MM-DD format, which is convenient
        return new Date(isoStr).toLocaleDateString('sv-SE', { timeZone: tz });
    } catch (e) {
        return isoStr.split('T')[0]; // Fallback
    }
}

function setCurrency(inputId, code) {
    const el = document.getElementById(inputId);
    if (el) {
        el.value = code;
        el.dispatchEvent(new Event('change'));
    }
}

function switchTab(viewName) {
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

// Expose to window explicitly if needed, though top-level var is global in non-module scripts
window.formatCurrency = formatCurrency;
window.setCurrency = setCurrency;
window.switchTab = switchTab;

function getAdjustedExpenses(expenses) {
    const processedList = [];
    expenses.forEach(item => {
        if (item.category === 'accommodation' && item.spreadCost && item.nights > 1 && item.checkin) {
            const nights = parseInt(item.nights);
            const avgAmount = parseFloat(item.amount) / nights;

            // Checkin date is normally local date string "YYYY-MM-DD"
            // We need to create dates starting from this.
            // Using a safe approach to avoid timezone shifts:
            const parts = item.checkin.split('-');
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const day = parseInt(parts[2]);

            for (let i = 0; i < nights; i++) {
                let splitItem = { ...item };

                // Construct date for this night
                // We want the resulting 'date' property (ISO string) to have the correct YYYY-MM-DD when split('T')[0] is called.
                // We can just construct a UTC date at midnight?
                // Or construct local date and toISOString?
                // Existing app uses `new Date(inp-date.value).toISOString()`.
                // Let's create a date object for noon to be safe from simple DST shifts.
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
window.getAdjustedExpenses = getAdjustedExpenses;
window.getTripDate = getTripDate;
window.getTripTime = getTripTime;
window.getDetailedTime = getDetailedTime;
