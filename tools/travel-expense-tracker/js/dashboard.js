// Dashboard Module
import { store } from './store.js';
import { formatCurrency, getTripDate, getCashPoolCurrencyCode } from './utils.js';
import { createItemElement } from './ui.js';

let expenseChart = null;
let dailyChartInstance = null;

export function initDashboard() {
    initChart();
    // Re-render when store changes
    store.subscribe(() => {
        renderDashboard();
    });
}

function initChart() {
    if (expenseChart) {
        expenseChart.destroy();
    }
    const canvas = document.getElementById('expenseChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#2563eb', '#6366f1', '#14b8a6', '#f43f5e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 6 } }
            },
            cutout: '70%'
        }
    });
}

export function renderDashboard() {
    const trip = store.activeTrip;
    if (!trip) return;

    // Header
    const titleEl = document.querySelector('header h1');
    if (titleEl) titleEl.textContent = trip.settings.location || '旅遊記帳';

    // Date Filtering Logic
    const hasDates = trip.settings.startDate && trip.settings.endDate;
    const filterContainer = document.getElementById('date-filter-container');
    const toggleFilter = document.getElementById('toggle-date-filter');

    if (filterContainer) {
        if (hasDates) {
            filterContainer.classList.remove('hidden');
            // Ensure UI matches state
            if (toggleFilter) toggleFilter.checked = trip.settings.filterDateRange;
        } else {
            filterContainer.classList.add('hidden');
        }
    }

    // General Note
    const noteContainer = document.getElementById('general-note-container');
    const noteContent = document.getElementById('general-note-content');
    if (noteContainer && noteContent) {
        const noteText = (trip.settings.generalNote || '').trim();
        if (noteText) {
            try {
                const html = typeof marked !== 'undefined'
                    ? (typeof marked.parse === 'function' ? marked.parse(noteText) : marked(noteText))
                    : noteText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
                noteContent.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html) : html;
            } catch {
                noteContent.textContent = noteText;
                noteContent.style.whiteSpace = 'pre-wrap';
            }
            noteContainer.classList.remove('hidden');
            const body = document.getElementById('general-note-body');
            const icon = document.getElementById('note-collapse-icon');
            if (body) {
                requestAnimationFrame(() => {
                    body.style.maxHeight = window.noteCollapsed ? '0px' : (body.scrollHeight + 'px');
                    if (icon) icon.style.transform = window.noteCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
                });
            }
            if (window.lucide) lucide.createIcons();
        } else {
            noteContent.innerHTML = '';
            noteContainer.classList.add('hidden');
        }
    }

    let displayExpenses = trip.expenses;
    if (hasDates && trip.settings.filterDateRange) {
        const startDateStr = trip.settings.startDate;
        const endDateStr = trip.settings.endDate;
        displayExpenses = trip.expenses.filter(item => {
            const itemDateStr = getTripDate(item.date);
            return itemDateStr >= startDateStr && itemDateStr <= endDateStr;
        });
    }

    // Calcs
    const total = displayExpenses.reduce((sum, item) => {
        const amount = parseFloat(item.amount);
        const rate = parseFloat(item.rate) || 1;
        return sum + (amount * rate);
    }, 0);

    const cashTotal = displayExpenses
        .filter(i => i.paymentMethod === 'cash')
        .reduce((sum, i) => sum + (parseFloat(i.amount) * (parseFloat(i.rate) || 1)), 0);
    const cardTotal = total - cashTotal;

    const budget = trip.settings.budget;
    const remaining = budget - total;
    const currency = trip.settings.homeCurrency;

    // DOM Updates
    const totalEl = document.getElementById('total-expense-display');
    if (totalEl) totalEl.textContent = formatCurrency(total, currency);
    
    const remainingEl = document.getElementById('budget-remaining');
    if (remainingEl) remainingEl.textContent = formatCurrency(remaining, currency);

    // Progress Bar
    const progressBar = document.getElementById('budget-progress-bar');
    const progressText = document.getElementById('budget-progress-text');
    
    if (progressBar && progressText) {
        let percentage = 0;
        if (budget > 0) percentage = Math.min((total / budget) * 100, 100);

        progressBar.style.width = percentage + '%';
        progressText.textContent = Math.round(percentage) + '%';

        if (percentage < 50) progressBar.className = 'bg-blue-500 h-2.5 rounded-full transition-all duration-500';
        else if (percentage < 80) progressBar.className = 'bg-yellow-500 h-2.5 rounded-full transition-all duration-500';
        else progressBar.className = 'bg-red-500 h-2.5 rounded-full transition-all duration-500';
    }

    // Breakdown
    renderPaymentBreakdown(cashTotal, cardTotal, currency);
    renderCurrencyBreakdown(displayExpenses, currency);
    renderStatsSummary(displayExpenses, currency, trip.settings);
    renderCashPoolSummary(displayExpenses, trip.settings);

    // Lists & Charts
    renderRecentList(displayExpenses, currency);
    updateExpenseChart(displayExpenses);
    renderDailyChart(displayExpenses, trip.settings);
}

function renderPaymentBreakdown(cash, card, currency) {
    let breakdownEl = document.getElementById('payment-breakdown');
    if (!breakdownEl) {
        const container = document.getElementById('total-expense-display')?.parentElement;
        if (!container) return;
        breakdownEl = document.createElement('div');
        breakdownEl.id = 'payment-breakdown';
        breakdownEl.className = 'flex gap-4 mt-2 mb-4';
        container.insertBefore(breakdownEl, container.children[2]);
    }
    breakdownEl.innerHTML = `
        <div class="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-100 dark:border-yellow-800">
            <i data-lucide="coins" class="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400"></i>
            <div class="flex flex-col leading-none">
                    <span class="text-[10px] text-yellow-600 dark:text-yellow-400 font-bold uppercase">現金</span>
                    <span class="text-xs font-bold text-yellow-700 dark:text-yellow-300">${formatCurrency(cash, currency)}</span>
            </div>
        </div>
        <div class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <i data-lucide="credit-card" class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"></i>
            <div class="flex flex-col leading-none">
                    <span class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">非現金</span>
                    <span class="text-xs font-bold text-indigo-700 dark:text-indigo-300">${formatCurrency(card, currency)}</span>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function renderStatsSummary(dataList, currency, settings) {
    let el = document.getElementById('stats-summary');
    if (!el) {
        const summaryCard = document.getElementById('total-expense-display')?.closest('.bg-white, .dark\\:bg-gray-800');
        if (!summaryCard) return;
        el = document.createElement('div');
        el.id = 'stats-summary';
        el.className = 'bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700';
        const currBreakdown = document.getElementById('currency-breakdown');
        if (currBreakdown) {
            currBreakdown.parentElement.insertBefore(el, currBreakdown.nextSibling);
        } else {
            summaryCard.parentElement.insertBefore(el, summaryCard.nextSibling);
        }
    }

    if (dataList.length === 0) {
        el.classList.add('hidden');
        return;
    }
    el.classList.remove('hidden');

    const homeAmounts = dataList.map(i => (parseFloat(i.amount) || 0) * (parseFloat(i.rate) || 1));
    const total = homeAmounts.reduce((s, a) => s + a, 0);
    const max = Math.max(...homeAmounts);
    const maxItem = dataList[homeAmounts.indexOf(max)];

    const uniqueDays = new Set(dataList.map(i => i.date?.split('T')[0])).size || 1;

    let tripDays = uniqueDays;
    if (settings.startDate && settings.endDate) {
        const d1 = new Date(settings.startDate);
        const d2 = new Date(settings.endDate);
        tripDays = Math.max(1, Math.ceil((d2 - d1) / 86400000) + 1);
    }

    const avgPerDay = total / tripDays;

    const maxTitleEsc = escHtml(maxItem?.title || '');
    el.innerHTML = `
        <div class="flex items-center gap-1.5 mb-3">
            <i data-lucide="bar-chart-3" class="w-3.5 h-3.5 text-gray-500 dark:text-gray-400"></i>
            <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">統計摘要</h3>
        </div>
        <div class="flex flex-col gap-2.5 sm:grid sm:grid-cols-3 sm:gap-3 sm:text-center">
            <div class="flex flex-row justify-between items-baseline gap-2 sm:flex-col sm:items-center sm:gap-1 sm:min-w-0">
                <span class="text-[10px] text-gray-500 dark:text-gray-400 shrink-0 sm:order-2">筆數</span>
                <span class="flex-1 min-w-0 text-lg font-bold text-gray-800 dark:text-gray-100 tabular-nums text-right sm:text-center sm:order-1 sm:flex-none">${dataList.length}</span>
            </div>
            <div class="flex flex-row justify-between items-baseline gap-2 sm:flex-col sm:items-center sm:gap-1 sm:min-w-0">
                <span class="text-[10px] text-gray-500 dark:text-gray-400 shrink-0 sm:order-2">日均開支</span>
                <span class="flex-1 min-w-0 text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 tabular-nums text-right sm:text-center sm:order-1 sm:flex-none leading-tight">${formatCurrency(avgPerDay, currency)}</span>
            </div>
            <div class="flex flex-row justify-between items-baseline gap-2 sm:flex-col sm:items-center sm:gap-1 sm:min-w-0">
                <span class="text-[10px] text-gray-500 dark:text-gray-400 shrink-0 sm:order-2" title="${maxTitleEsc}">單筆最高</span>
                <span class="flex-1 min-w-0 text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 tabular-nums text-right sm:text-center sm:order-1 sm:flex-none leading-tight">${formatCurrency(max, currency)}</span>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function renderCurrencyBreakdown(dataList, homeCurrency) {
    let el = document.getElementById('currency-breakdown');
    if (!el) {
        const summaryCard = document.getElementById('total-expense-display')?.closest('.bg-white');
        if (!summaryCard) return;
        el = document.createElement('div');
        el.id = 'currency-breakdown';
        el.className = 'bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700';
        summaryCard.parentElement.insertBefore(el, summaryCard.nextSibling);
    }

    const byCurrency = {};
    dataList.forEach(item => {
        const cur = item.currency || homeCurrency;
        const amt = parseFloat(item.amount) || 0;
        const rate = parseFloat(item.rate) || 1;
        if (!byCurrency[cur]) byCurrency[cur] = { native: 0, home: 0, count: 0 };
        byCurrency[cur].native += amt;
        byCurrency[cur].home += amt * rate;
        byCurrency[cur].count++;
    });

    const keys = Object.keys(byCurrency);
    if (keys.length <= 1) {
        el.classList.add('hidden');
        return;
    }
    el.classList.remove('hidden');

    const items = keys
        .sort((a, b) => byCurrency[b].home - byCurrency[a].home)
        .map(cur => {
            const d = byCurrency[cur];
            const homeStr = cur !== homeCurrency ? `<span class="text-[10px] text-gray-400 ml-1">(≈ ${formatCurrency(d.home, homeCurrency)})</span>` : '';
            return `<div class="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-gray-700 dark:text-gray-200">${cur}</span>
                    <span class="text-[10px] text-gray-400">${d.count} 筆</span>

                </div>
                <div class="text-xs font-bold text-gray-800 dark:text-gray-100">${formatCurrency(d.native, cur)}${homeStr}</div>
            </div>`;
        }).join('');

    el.innerHTML = `
        <div class="flex items-center gap-1.5 mb-2">
            <i data-lucide="coins" class="w-3.5 h-3.5 text-gray-500 dark:text-gray-400"></i>
            <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">各幣別支出</h3>
        </div>
        ${items}
    `;
    if (window.lucide) lucide.createIcons();
}

function escHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

// ... Charts related functions ...
function renderCashPoolSummary(displayExpenses, settings) {
    const poolCode = getCashPoolCurrencyCode(settings);
    const poolTotal = parseFloat(settings.cashPoolTotal) || 0;
    const allocs = Array.isArray(settings.cashAllocations) ? settings.cashAllocations : [];

    let el = document.getElementById('cash-pool-summary');
    if (!poolCode) {
        if (el) el.classList.add('hidden');
        return;
    }

    const cashSpentNative = displayExpenses
        .filter(i => i.paymentMethod === 'cash' && String(i.currency || '').trim() === poolCode)
        .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

    const poolRemaining = poolTotal - cashSpentNative;

    const show = poolTotal > 0 || allocs.length > 0;
    const anchor = document.getElementById('currency-breakdown') || document.getElementById('stats-summary');
    const summaryCard = document.getElementById('total-expense-display')?.closest('.rounded-2xl');
    if (!summaryCard?.parentElement) return;

    if (!show) {
        if (el) el.classList.add('hidden');
        return;
    }
    if (!el) {
        el = document.createElement('div');
        el.id = 'cash-pool-summary';
        el.className = 'bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700';
        if (anchor) anchor.parentElement.insertBefore(el, anchor.nextSibling);
        else summaryCard.parentElement.insertBefore(el, summaryCard.nextSibling);
    }
    el.classList.remove('hidden');

    const memberRows = allocs.map(a => {
        const name = a.memberName || '';
        const alloc = parseFloat(a.amount) || 0;
        const spent = displayExpenses
            .filter(i => i.paymentMethod === 'cash' && String(i.currency || '').trim() === poolCode && (i.paidBy || '') === name)
            .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
        const rem = alloc - spent;
        return `<div class="flex justify-between text-xs py-1 border-b border-gray-50 dark:border-gray-700 last:border-0">
            <span class="text-gray-600 dark:text-gray-300">${name ? escHtml(name) : '—'}</span>
            <span class="font-mono text-gray-800 dark:text-gray-100">分配 ${formatCurrency(alloc, poolCode)} · 仲剩 ${formatCurrency(rem, poolCode)}</span>
        </div>`;
    }).join('');

    el.innerHTML = `
        <div class="flex items-center gap-1.5 mb-2">
            <i data-lucide="wallet" class="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400"></i>
            <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">現金池（${poolCode}）</h3>
        </div>
        <div class="flex justify-between text-sm mb-2">
            <span class="text-gray-600 dark:text-gray-300">總額</span>
            <span class="font-bold">${formatCurrency(poolTotal, poolCode)}</span>
        </div>
        <div class="flex justify-between text-sm mb-2">
            <span class="text-gray-600 dark:text-gray-300">總池剩餘（估算）</span>
            <span class="font-bold text-yellow-700 dark:text-yellow-300">${formatCurrency(poolRemaining, poolCode)}</span>
        </div>
        ${memberRows ? `<div class="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700"><div class="text-[10px] text-gray-400 mb-1">每人分配 · 仲剩幾多</div>${memberRows}</div>` : ''}
    `;
    if (window.lucide) lucide.createIcons();
}

function updateExpenseChart(dataList) {
    if (!expenseChart) return;
    const categories = { 'general': 0, 'accommodation': 0, 'transport': 0, 'insurance': 0 };
    dataList.forEach(item => {
        const amount = parseFloat(item.amount) * (parseFloat(item.rate) || 1);
        categories[item.category] = (categories[item.category] || 0) + amount;
    });
    const labels = { general: '一般', accommodation: '住宿', transport: '交通', insurance: '保險' };
    expenseChart.data.labels = Object.keys(categories).map(k => labels[k]);
    expenseChart.data.datasets[0].data = Object.values(categories);
    expenseChart.update();
}

function renderDailyChart(dataList, settings) {
    // Only init container if needed
    let container = document.getElementById('daily-chart-container');
    if (!container) {
        const viewDashboard = document.getElementById('view-dashboard');
        if (!viewDashboard) return;
        
        const chartCard = document.querySelector('#view-dashboard > div.bg-white.rounded-2xl.p-5.shadow-sm');
        container = document.createElement('div');
        container.id = 'daily-chart-container';
        container.className = 'bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700';
        container.innerHTML = `
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">每日支出</h3>
            <div class="relative h-48 w-full flex justify-center">
                <canvas id="dailyChart"></canvas>
            </div>
        `;
        if (chartCard && chartCard.nextSibling) {
             viewDashboard.insertBefore(container, chartCard.nextSibling);
        } else {
             viewDashboard.appendChild(container);
        }
    }

    const dailyData = {};
    if (settings.startDate && settings.endDate) {
        let curr = new Date(settings.startDate);
        const end = new Date(settings.endDate);
        while (curr <= end) {
            const key = curr.toISOString().split('T')[0];
            dailyData[key] = 0;
            curr.setDate(curr.getDate() + 1);
        }
    }

    dataList.forEach(item => {
        const dateKey = getTripDate(item.date);
        const amount = parseFloat(item.amount) * (parseFloat(item.rate) || 1);
        if (dailyData.hasOwnProperty(dateKey)) dailyData[dateKey] += amount;
        else if (!settings.filterDateRange) dailyData[dateKey] = (dailyData[dateKey] || 0) + amount;
    });

    const sortedDates = Object.keys(dailyData).sort();
    const dataPoints = sortedDates.map(d => dailyData[d]);
    const labels = sortedDates.map(d => d.slice(5));

    if (dailyChartInstance) {
        dailyChartInstance.data.labels = labels;
        dailyChartInstance.data.datasets[0].data = dataPoints;
        dailyChartInstance.update();
    } else {
        const canvas = document.getElementById('dailyChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        dailyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{ label: '本幣', data: dataPoints, backgroundColor: '#60a5fa', borderRadius: 4 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
            }
        });
    }
}

export function renderRecentList(dataList, currency) {
    const list = document.getElementById('recent-list');
    if (!list) return;
    const recent = [...dataList].reverse().slice(0, 3);
    list.innerHTML = recent.length ? '' : '<div class="text-center text-gray-400 py-4 text-sm">暫無紀錄</div>';
    recent.forEach(item => list.appendChild(createItemElement(item, currency)));
}

// Global Export for legacy/debug if needed, otherwise module exports are enough for app.js
window.initDashboard = initDashboard;
window.renderDashboard = renderDashboard;
