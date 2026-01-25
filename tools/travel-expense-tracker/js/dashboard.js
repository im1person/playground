// Dashboard Module

let expenseChart = null;
let dailyChartInstance = null;

function initDashboard() {
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
    const ctx = document.getElementById('expenseChart').getContext('2d');
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#2563eb', '#6366f1', '#14b8a6', '#f59e0b', '#ef4444'],
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

function renderDashboard() {
    const trip = store.activeTrip;
    if (!trip) return;

    // Header
    const titleEl = document.querySelector('header h1');
    titleEl.textContent = trip.settings.location || 'Travel Tracker';

    // Date Filtering Logic
    const hasDates = trip.settings.startDate && trip.settings.endDate;
    const filterContainer = document.getElementById('date-filter-container');
    const toggleFilter = document.getElementById('toggle-date-filter');

    if (hasDates) {
        filterContainer.classList.remove('hidden');
        // Ensure UI matches state
        toggleFilter.checked = trip.settings.filterDateRange;
    } else {
        filterContainer.classList.add('hidden');
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
    document.getElementById('total-expense-display').textContent = formatCurrency(total, currency);
    document.getElementById('budget-remaining').textContent = formatCurrency(remaining, currency);

    // Progress Bar
    const progressBar = document.getElementById('budget-progress-bar');
    const progressText = document.getElementById('budget-progress-text');
    let percentage = 0;
    if (budget > 0) percentage = Math.min((total / budget) * 100, 100);

    progressBar.style.width = percentage + '%';
    progressText.textContent = Math.round(percentage) + '%';

    if (percentage < 50) progressBar.className = 'bg-blue-500 h-2.5 rounded-full transition-all duration-500';
    else if (percentage < 80) progressBar.className = 'bg-yellow-500 h-2.5 rounded-full transition-all duration-500';
    else progressBar.className = 'bg-red-500 h-2.5 rounded-full transition-all duration-500';

    // Breakdown
    renderPaymentBreakdown(cashTotal, cardTotal, currency);

    // Lists & Charts
    renderRecentList(displayExpenses, currency);
    updateExpenseChart(displayExpenses);
    renderDailyChart(displayExpenses, trip.settings);
}

function renderPaymentBreakdown(cash, card, currency) {
    let breakdownEl = document.getElementById('payment-breakdown');
    if (!breakdownEl) {
        const container = document.getElementById('total-expense-display').parentElement;
        breakdownEl = document.createElement('div');
        breakdownEl.id = 'payment-breakdown';
        breakdownEl.className = 'flex gap-4 mt-2 mb-4';
        container.insertBefore(breakdownEl, container.children[2]);
    }
    breakdownEl.innerHTML = `
        <div class="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 rounded-lg border border-yellow-100">
            <i data-lucide="coins" class="w-3.5 h-3.5 text-yellow-600"></i>
            <div class="flex flex-col leading-none">
                    <span class="text-[10px] text-yellow-600 font-bold uppercase">現金 (Cash)</span>
                    <span class="text-xs font-bold text-yellow-700">${formatCurrency(cash, currency)}</span>
            </div>
        </div>
            <div class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
            <i data-lucide="credit-card" class="w-3.5 h-3.5 text-indigo-600"></i>
            <div class="flex flex-col leading-none">
                    <span class="text-[10px] text-indigo-600 font-bold uppercase">其他 (Other)</span>
                    <span class="text-xs font-bold text-indigo-700">${formatCurrency(card, currency)}</span>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

// ... Charts related functions ...
function updateExpenseChart(dataList) {
    if (!expenseChart) return;
    const categories = { 'general': 0, 'accommodation': 0, 'transport': 0 };
    dataList.forEach(item => {
        const amount = parseFloat(item.amount) * (parseFloat(item.rate) || 1);
        categories[item.category] = (categories[item.category] || 0) + amount;
    });
    const labels = { 'general': '一般', 'accommodation': '住宿', 'transport': '交通' };
    expenseChart.data.labels = Object.keys(categories).map(k => labels[k]);
    expenseChart.data.datasets[0].data = Object.values(categories);
    expenseChart.update();
}

function renderDailyChart(dataList, settings) {
    // Only init container if needed
    let container = document.getElementById('daily-chart-container');
    if (!container) {
        // Create container logic (omitted for brevity, assume structure exists from prev step or create)
        const parent = document.getElementById('view-dashboard');
        const chartCard = document.querySelector('#view-dashboard > div.bg-white.rounded-2xl.p-5.shadow-sm');
        container = document.createElement('div');
        container.id = 'daily-chart-container';
        container.className = 'bg-white rounded-2xl p-5 shadow-sm border border-gray-100';
        container.innerHTML = `
            <h3 class="text-sm font-semibold text-gray-700 mb-4">每日支出 (Daily)</h3>
            <div class="relative h-48 w-full flex justify-center">
                <canvas id="dailyChart"></canvas>
            </div>
        `;
        parent.insertBefore(container, chartCard.nextSibling);
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
        const dateKey = new Date(item.date).toISOString().split('T')[0];
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
        const ctx = document.getElementById('dailyChart').getContext('2d');
        dailyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{ label: 'Daily', data: dataPoints, backgroundColor: '#60a5fa', borderRadius: 4 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
            }
        });
    }
}

function renderRecentList(dataList, currency) {
    const list = document.getElementById('recent-list');
    const recent = [...dataList].reverse().slice(0, 3);
    list.innerHTML = recent.length ? '' : '<div class="text-center text-gray-400 py-4 text-sm">暫無紀錄</div>';
    recent.forEach(item => list.appendChild(createItemElement(item, currency)));
}

// Global Export
window.initDashboard = initDashboard;
window.renderDashboard = renderDashboard;

function initChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#2563eb', '#6366f1', '#14b8a6', '#f59e0b', '#ef4444'],
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

function renderDashboard() {
    const trip = store.activeTrip;
    if (!trip) return;

    // Header
    const titleEl = document.querySelector('header h1');
    titleEl.textContent = trip.settings.location || 'Travel Tracker';

    // Date Filtering Logic
    const hasDates = trip.settings.startDate && trip.settings.endDate;
    const filterContainer = document.getElementById('date-filter-container');
    const toggleFilter = document.getElementById('toggle-date-filter');

    if (hasDates) {
        filterContainer.classList.remove('hidden');
        // Ensure UI matches state
        toggleFilter.checked = trip.settings.filterDateRange;
    } else {
        filterContainer.classList.add('hidden');
    }

    let displayExpenses = trip.expenses;
    if (hasDates && trip.settings.filterDateRange) {
        const startDateStr = trip.settings.startDate;
        const endDateStr = trip.settings.endDate;
        displayExpenses = trip.expenses.filter(item => {
            const itemDateStr = item.date.split('T')[0];
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
    document.getElementById('total-expense-display').textContent = formatCurrency(total, currency);
    document.getElementById('budget-remaining').textContent = formatCurrency(remaining, currency);

    // Progress Bar
    const progressBar = document.getElementById('budget-progress-bar');
    const progressText = document.getElementById('budget-progress-text');
    let percentage = 0;
    if (budget > 0) percentage = Math.min((total / budget) * 100, 100);

    progressBar.style.width = percentage + '%';
    progressText.textContent = Math.round(percentage) + '%';

    if (percentage < 50) progressBar.className = 'bg-blue-500 h-2.5 rounded-full transition-all duration-500';
    else if (percentage < 80) progressBar.className = 'bg-yellow-500 h-2.5 rounded-full transition-all duration-500';
    else progressBar.className = 'bg-red-500 h-2.5 rounded-full transition-all duration-500';

    // Breakdown
    renderPaymentBreakdown(cashTotal, cardTotal, currency);

    // Lists & Charts
    renderRecentList(displayExpenses, currency);
    updateExpenseChart(displayExpenses);
    renderDailyChart(displayExpenses, trip.settings);
}

function renderPaymentBreakdown(cash, card, currency) {
    let breakdownEl = document.getElementById('payment-breakdown');
    if (!breakdownEl) {
        const container = document.getElementById('total-expense-display').parentElement;
        breakdownEl = document.createElement('div');
        breakdownEl.id = 'payment-breakdown';
        breakdownEl.className = 'flex gap-4 mt-2 mb-4';
        container.insertBefore(breakdownEl, container.children[2]);
    }
    breakdownEl.innerHTML = `
        <div class="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 rounded-lg border border-yellow-100">
            <i data-lucide="coins" class="w-3.5 h-3.5 text-yellow-600"></i>
            <div class="flex flex-col leading-none">
                    <span class="text-[10px] text-yellow-600 font-bold uppercase">現金 (Cash)</span>
                    <span class="text-xs font-bold text-yellow-700">${formatCurrency(cash, currency)}</span>
            </div>
        </div>
            <div class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
            <i data-lucide="credit-card" class="w-3.5 h-3.5 text-indigo-600"></i>
            <div class="flex flex-col leading-none">
                    <span class="text-[10px] text-indigo-600 font-bold uppercase">其他 (Other)</span>
                    <span class="text-xs font-bold text-indigo-700">${formatCurrency(card, currency)}</span>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

// ... Charts related functions ...
function updateExpenseChart(dataList) {
    if (!expenseChart) return;
    const categories = { 'general': 0, 'accommodation': 0, 'transport': 0 };
    dataList.forEach(item => {
        const amount = parseFloat(item.amount) * (parseFloat(item.rate) || 1);
        categories[item.category] = (categories[item.category] || 0) + amount;
    });
    const labels = { 'general': '一般', 'accommodation': '住宿', 'transport': '交通' };
    expenseChart.data.labels = Object.keys(categories).map(k => labels[k]);
    expenseChart.data.datasets[0].data = Object.values(categories);
    expenseChart.update();
}

function renderDailyChart(dataList, settings) {
    // Only init container if needed
    let container = document.getElementById('daily-chart-container');
    if (!container) {
        // Create container logic (omitted for brevity, assume structure exists from prev step or create)
        const parent = document.getElementById('view-dashboard');
        const chartCard = document.querySelector('#view-dashboard > div.bg-white.rounded-2xl.p-5.shadow-sm');
        container = document.createElement('div');
        container.id = 'daily-chart-container';
        container.className = 'bg-white rounded-2xl p-5 shadow-sm border border-gray-100';
        container.innerHTML = `
            <h3 class="text-sm font-semibold text-gray-700 mb-4">每日支出 (Daily)</h3>
            <div class="relative h-48 w-full flex justify-center">
                <canvas id="dailyChart"></canvas>
            </div>
        `;
        parent.insertBefore(container, chartCard.nextSibling);
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
        const ctx = document.getElementById('dailyChart').getContext('2d');
        dailyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{ label: 'Daily', data: dataPoints, backgroundColor: '#60a5fa', borderRadius: 4 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
            }
        });
    }
}

// ... List Rendering ...
// ... List Rendering ...
// createItemElement is in ui.js which is loaded before this.

function renderRecentList(dataList, currency) {
    const list = document.getElementById('recent-list');
    const recent = [...dataList].reverse().slice(0, 3);
    list.innerHTML = recent.length ? '' : '<div class="text-center text-gray-400 py-4 text-sm">暫無紀錄</div>';
    recent.forEach(item => list.appendChild(createItemElement(item, currency)));
}
