/* =========================================
   TRIPSPLIT – APPLICATION LOGIC
   BCA Final Year Project
   Trip Expense Calculator
   ========================================= */

// ============ STATE ============
let state = {
  trips: [],
  members: [],
  expenses: [],
  currentTripId: null,
};

// ============ PERSISTENCE (localStorage) ============
function saveState() {
  localStorage.setItem('tripsplit_state', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('tripsplit_state');
  if (saved) {
    try { state = JSON.parse(saved); } catch(e) { console.log('Load error', e); }
  }
}

// ============ UTILS ============
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '–';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function tripTypeEmoji(type) {
  const m = { leisure: '🏖', adventure: '🏔', business: '💼', family: '👨‍👩‍👧', pilgrimage: '🛕', other: '📍' };
  return m[type] || '✈';
}

function catEmoji(cat) {
  const m = { transport: '🚗', accommodation: '🏨', food: '🍛', activities: '🎡', shopping: '🛍', medical: '💊', fuel: '⛽', other: '📦' };
  return m[cat] || '📦';
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  setTimeout(() => { t.className = 'toast hidden'; }, 3000);
}

// ============ NAVIGATION ============
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(page)) b.classList.add('active');
  });
  if (page === 'report') renderReport();
  if (page === 'settlement') renderSettlement();
  if (page === 'dashboard') updateDashboard();
}

// ============ MODALS ============
function openModal(id) {
  if (id === 'expenseModal') populateExpTrips();
  if (id === 'memberModal') populateMemberTrips();
  document.getElementById(id).classList.remove('hidden');
  const dateInput = document.getElementById('expDate');
  if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ============ TRIP OPERATIONS ============
function saveTrip() {
  const name = document.getElementById('tripName').value.trim();
  const dest = document.getElementById('tripDest').value.trim();
  const start = document.getElementById('tripStart').value;
  const end = document.getElementById('tripEnd').value;
  const budget = parseFloat(document.getElementById('tripBudget').value) || 0;
  const type = document.getElementById('tripType').value;
  const desc = document.getElementById('tripDesc').value.trim();

  if (!name || !dest || !start || !end) {
    showToast('Please fill all required fields!', 'error'); return;
  }
  if (new Date(end) < new Date(start)) {
    showToast('End date must be after start date!', 'error'); return;
  }

  const trip = { id: uid(), name, dest, start, end, budget, type, desc, createdAt: Date.now() };
  state.trips.push(trip);
  saveState();
  populateAllDropdowns();
  renderTrips();
  updateDashboard();
  closeModal('tripModal');
  clearForm(['tripName','tripDest','tripStart','tripEnd','tripBudget','tripDesc']);
  showToast(`Trip "${name}" created! 🎉`);
}

function deleteTrip(id) {
  if (!confirm('Delete this trip and all its expenses?')) return;
  state.trips = state.trips.filter(t => t.id !== id);
  state.expenses = state.expenses.filter(e => e.tripId !== id);
  saveState();
  renderTrips();
  updateDashboard();
  populateAllDropdowns();
  showToast('Trip deleted.', 'warning');
}

function openTripSidebar(tripId) {
  state.currentTripId = tripId;
  const trip = state.trips.find(t => t.id === tripId);
  document.getElementById('sidebarTripName').textContent = trip ? trip.name + ' – Expenses' : 'Expenses';
  document.getElementById('expenseSidebar').classList.remove('hidden');
  document.getElementById('sidebarOverlay').classList.remove('hidden');
  renderSidebarExpenses(tripId);
}

function closeSidebar() {
  document.getElementById('expenseSidebar').classList.add('hidden');
  document.getElementById('sidebarOverlay').classList.add('hidden');
  state.currentTripId = null;
}

function renderTrips() {
  const grid = document.getElementById('tripsGrid');
  if (!state.trips.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🗺️</div><p>No trips yet. Start your first adventure!</p><button class="btn-primary" onclick="openModal('tripModal')">Create Trip</button></div>`;
    return;
  }
  grid.innerHTML = state.trips.map(trip => {
    const tripExpenses = state.expenses.filter(e => e.tripId === trip.id);
    const totalSpent = tripExpenses.reduce((s, e) => s + e.amount, 0);
    const budgetPct = trip.budget ? Math.min((totalSpent / trip.budget) * 100, 100) : 0;
    const barClass = budgetPct >= 100 ? 'over' : budgetPct >= 80 ? 'warn' : '';
    const days = trip.start && trip.end ? Math.ceil((new Date(trip.end) - new Date(trip.start)) / 86400000) + 1 : '–';
    return `
    <div class="trip-card">
      <div class="trip-card-header">
        <div class="trip-card-icon">${tripTypeEmoji(trip.type)}</div>
        <h3>${trip.name}</h3>
        <div class="trip-card-dest"><i class="fas fa-map-pin" style="color:var(--accent)"></i> ${trip.dest}</div>
      </div>
      <div class="trip-card-body">
        <div class="trip-meta">
          <div class="trip-meta-item"><span>Duration</span><strong>${days} days</strong></div>
          <div class="trip-meta-item"><span>Expenses</span><strong>${tripExpenses.length}</strong></div>
          <div class="trip-meta-item"><span>Total Spent</span><strong>${formatINR(totalSpent)}</strong></div>
        </div>
        ${trip.budget ? `
        <div class="budget-bar-wrap">
          <label><span>Budget</span><span>${formatINR(totalSpent)} / ${formatINR(trip.budget)}</span></label>
          <div class="budget-bar"><div class="budget-fill ${barClass}" style="width:${budgetPct}%"></div></div>
        </div>` : ''}
        <div style="font-size:0.78rem;color:var(--muted);margin-top:10px">${formatDate(trip.start)} → ${formatDate(trip.end)}</div>
      </div>
      <div class="trip-card-footer">
        <button class="btn-primary btn-sm" onclick="openTripSidebar('${trip.id}');event.stopPropagation()">View Expenses</button>
        <button class="btn-outline btn-sm" onclick="openModal('expenseModal');document.getElementById('expTrip').value='${trip.id}';populatePaidBy();event.stopPropagation()">+ Add Expense</button>
        <button class="btn-danger" onclick="deleteTrip('${trip.id}');event.stopPropagation()">Delete</button>
      </div>
    </div>`;
  }).join('');
}

// ============ MEMBER OPERATIONS ============
function saveMember() {
  const name = document.getElementById('memberName').value.trim();
  const email = document.getElementById('memberEmail').value.trim();
  const phone = document.getElementById('memberPhone').value.trim();
  const tripId = document.getElementById('memberTrip').value;

  if (!name) { showToast('Member name is required!', 'error'); return; }

  const member = { id: uid(), name, email, phone, tripId, createdAt: Date.now() };
  state.members.push(member);
  saveState();
  renderMembers();
  populateAllDropdowns();
  closeModal('memberModal');
  clearForm(['memberName','memberEmail','memberPhone']);
  showToast(`${name} added! 👤`);
}

function deleteMember(id) {
  state.members = state.members.filter(m => m.id !== id);
  saveState();
  renderMembers();
  showToast('Member removed.', 'warning');
}

function renderMembers() {
  const grid = document.getElementById('membersGrid');
  if (!state.members.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>No members added yet.</p><button class="btn-primary" onclick="openModal('memberModal')">Add Member</button></div>`;
    return;
  }
  grid.innerHTML = state.members.map(m => {
    const trip = state.trips.find(t => t.id === m.tripId);
    const paid = state.expenses.filter(e => e.paidBy === m.id).reduce((s, e) => s + e.amount, 0);
    return `
    <div class="member-card">
      <div class="member-avatar">${getInitials(m.name)}</div>
      <h4>${m.name}</h4>
      ${m.email ? `<p>✉ ${m.email}</p>` : ''}
      ${m.phone ? `<p>📞 ${m.phone}</p>` : ''}
      ${trip ? `<div class="member-trips-tag">✈ ${trip.name}</div>` : ''}
      <p style="color:var(--accent);font-weight:600;margin-top:10px">${formatINR(paid)} paid</p>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
        <button class="btn-danger" onclick="deleteMember('${m.id}')">Remove</button>
      </div>
    </div>`;
  }).join('');
}

// ============ EXPENSE OPERATIONS ============
function saveExpense() {
  const tripId = document.getElementById('expTrip').value;
  const desc = document.getElementById('expDesc').value.trim();
  const cat = document.getElementById('expCat').value;
  const amount = parseFloat(document.getElementById('expAmount').value);
  const date = document.getElementById('expDate').value;
  const paidBy = document.getElementById('expPaidBy').value;
  const notes = document.getElementById('expNotes').value.trim();

  if (!tripId || !desc || !amount || !date || !paidBy) {
    showToast('Please fill all required fields!', 'error'); return;
  }
  if (isNaN(amount) || amount <= 0) {
    showToast('Amount must be a positive number!', 'error'); return;
  }

  const splitChecks = document.querySelectorAll('#splitCheckboxes input:checked');
  const splitAmong = splitChecks.length ? [...splitChecks].map(c => c.value) : [paidBy];

  const expense = { id: uid(), tripId, desc, cat, amount, date, paidBy, notes, splitAmong, createdAt: Date.now() };
  state.expenses.push(expense);
  saveState();
  updateDashboard();
  renderTrips();
  if (state.currentTripId) renderSidebarExpenses(state.currentTripId);
  closeModal('expenseModal');
  clearForm(['expDesc','expAmount','expNotes','expDate']);
  showToast(`Expense "${desc}" added! 💰`);
}

function deleteExpense(id) {
  const tripId = state.expenses.find(e => e.id === id)?.tripId;
  state.expenses = state.expenses.filter(e => e.id !== id);
  saveState();
  updateDashboard();
  renderTrips();
  if (tripId) renderSidebarExpenses(tripId);
  showToast('Expense deleted.', 'warning');
}

function renderSidebarExpenses(tripId) {
  const container = document.getElementById('sidebarExpenses');
  const exps = state.expenses.filter(e => e.tripId === tripId).sort((a,b) => new Date(b.date) - new Date(a.date));
  if (!exps.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:30px">No expenses yet for this trip.</div>';
    return;
  }
  container.innerHTML = exps.map(e => {
    const paidByName = getMemberName(e.paidBy);
    return `
    <div class="expense-item">
      <div class="expense-icon">${catEmoji(e.cat)}</div>
      <div class="expense-info">
        <h4>${e.desc}</h4>
        <p>Paid by ${paidByName} · <span class="badge badge-${e.cat}">${e.cat}</span></p>
        ${e.notes ? `<p style="margin-top:3px;font-style:italic">${e.notes}</p>` : ''}
      </div>
      <div class="expense-right">
        <div class="expense-amount">${formatINR(e.amount)}</div>
        <div class="expense-date">${formatDate(e.date)}</div>
        <button class="btn-danger" style="margin-top:5px" onclick="deleteExpense('${e.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ============ SETTLEMENT LOGIC ============
function renderSettlement() {
  const filter = document.getElementById('settlementTripFilter').value;
  const expenses = filter === 'all' ? state.expenses : state.expenses.filter(e => e.tripId === filter);
  const content = document.getElementById('settlementContent');

  if (!expenses.length) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">💸</div><p>No expenses to settle yet.</p></div>`;
    return;
  }

  const memberIds = [...new Set([
    ...expenses.map(e => e.paidBy),
    ...expenses.flatMap(e => e.splitAmong || []),
  ])];

  const balances = {};
  memberIds.forEach(id => { balances[id] = 0; });

  expenses.forEach(exp => {
    const split = exp.splitAmong && exp.splitAmong.length ? exp.splitAmong : [exp.paidBy];
    const share = exp.amount / split.length;
    balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;
    split.forEach(id => { balances[id] = (balances[id] || 0) - share; });
  });

  const creditors = [], debtors = [];
  Object.entries(balances).forEach(([id, bal]) => {
    if (bal > 0.01) creditors.push({ id, amt: bal });
    else if (bal < -0.01) debtors.push({ id, amt: -bal });
  });

  const transactions = [];
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const pay = Math.min(creditors[ci].amt, debtors[di].amt);
    transactions.push({ from: debtors[di].id, to: creditors[ci].id, amt: pay });
    creditors[ci].amt -= pay;
    debtors[di].amt -= pay;
    if (creditors[ci].amt < 0.01) ci++;
    if (debtors[di].amt < 0.01) di++;
  }

  content.innerHTML = `
    <div class="settlement-grid">
      <div class="settle-card">
        <h3>Balance Summary</h3>
        ${memberIds.map(id => {
          const bal = balances[id] || 0;
          const cls = bal >= 0 ? 'positive' : 'negative';
          const label = bal >= 0 ? '▲ gets back' : '▼ owes';
          return `
          <div class="settle-row">
            <div class="settle-person">
              <div class="settle-avatar-sm">${getInitials(getMemberName(id))}</div>
              <div class="settle-name">${getMemberName(id)}</div>
            </div>
            <div class="settle-amount ${cls}">${label} ${formatINR(Math.abs(bal))}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="settle-card">
        <h3>Suggested Payments</h3>
        ${transactions.length ? `
        <div class="transaction-list">
          ${transactions.map(txn => `
          <div class="txn-item">
            <span class="txn-from">${getMemberName(txn.from)}</span>
            <span class="txn-arrow">→</span>
            <span class="txn-to">${getMemberName(txn.to)}</span>
            <span class="txn-amt">${formatINR(txn.amt)}</span>
          </div>`).join('')}
        </div>` : '<p style="color:var(--green);padding:20px 0;text-align:center;font-weight:600">🎉 All settled up!</p>'}
      </div>
    </div>`;
}

// ============ REPORT / CHARTS ============
function renderReport() {
  const filter = document.getElementById('reportTripFilter').value;
  const expenses = filter === 'all' ? state.expenses : state.expenses.filter(e => e.tripId === filter);
  renderCharts(expenses);
  renderReportTable(expenses);
}

function renderCharts(expenses) {
  const catTotals = {};
  expenses.forEach(e => { catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount; });
  drawDonutChart('categoryChart', Object.keys(catTotals), Object.values(catTotals), [
    '#3b82f6','#a855f7','#f97316','#22c55e','#ec4899','#ef4444','#eab308','#94a3b8'
  ]);

  const personTotals = {};
  expenses.forEach(e => {
    const name = getMemberName(e.paidBy);
    personTotals[name] = (personTotals[name] || 0) + e.amount;
  });
  drawBarChart('personChart', Object.keys(personTotals), Object.values(personTotals));
}

function drawDonutChart(canvasId, labels, data, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const total = data.reduce((s, v) => s + v, 0);
  if (!total) {
    ctx.fillStyle = '#8aa0c8';
    ctx.font = '14px DM Sans';
    ctx.textAlign = 'center';
    ctx.fillText('No data', W/2, H/2);
    return;
  }

  const cx = W/2 - 30, cy = H/2, r = Math.min(cx, cy) - 20, ir = r * 0.52;
  let start = -Math.PI / 2;

  data.forEach((val, i) => {
    const slice = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#0b0f1a';
    ctx.lineWidth = 2;
    ctx.stroke();
    start += slice;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, ir, 0, Math.PI * 2);
  ctx.fillStyle = '#121828';
  ctx.fill();

  ctx.fillStyle = '#e8edf8';
  ctx.font = 'bold 14px DM Sans';
  ctx.textAlign = 'center';
  ctx.fillText(formatINR(total), cx, cy + 5);

  const lx = W - 110, ly = 20;
  labels.forEach((label, i) => {
    if (i > 6) return;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(lx, ly + i * 22, 12, 12);
    ctx.fillStyle = '#8aa0c8';
    ctx.font = '11px DM Sans';
    ctx.textAlign = 'left';
    ctx.fillText(label.slice(0,10), lx + 16, ly + 10 + i * 22);
  });
}

function drawBarChart(canvasId, labels, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  if (!data.length) {
    ctx.fillStyle = '#8aa0c8';
    ctx.font = '14px DM Sans';
    ctx.textAlign = 'center';
    ctx.fillText('No data', W/2, H/2);
    return;
  }

  const max = Math.max(...data);
  const pad = { l: 60, r: 20, t: 20, b: 60 };
  const gW = W - pad.l - pad.r;
  const gH = H - pad.t - pad.b;
  const barW = Math.min(gW / labels.length - 12, 50);
  const colors = ['#f4a034','#3b82f6','#22c55e','#a855f7','#ef4444','#ec4899'];

  labels.forEach((label, i) => {
    const barH = max > 0 ? (data[i] / max) * gH : 0;
    const x = pad.l + i * (gW / labels.length) + (gW / labels.length - barW) / 2;
    const y = pad.t + gH - barH;

    const grad = ctx.createLinearGradient(x, y, x, pad.t + gH);
    grad.addColorStop(0, colors[i % colors.length]);
    grad.addColorStop(1, colors[i % colors.length] + '55');
    ctx.fillStyle = grad;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, barW, barH, [5, 5, 0, 0]);
    else ctx.rect(x, y, barW, barH);
    ctx.fill();

    ctx.fillStyle = '#8aa0c8';
    ctx.font = '10px DM Sans';
    ctx.textAlign = 'center';
    ctx.fillText(label.slice(0, 8), x + barW/2, H - pad.b + 16);

    ctx.fillStyle = '#e8edf8';
    ctx.font = 'bold 10px DM Sans';
    ctx.fillText(formatINR(data[i]), x + barW/2, y - 6);
  });

  ctx.strokeStyle = '#2e3f5c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l - 5, pad.t);
  ctx.lineTo(pad.l - 5, pad.t + gH + 5);
  ctx.lineTo(W - pad.r, pad.t + gH + 5);
  ctx.stroke();
}

function renderReportTable(expenses) {
  const tbody = document.getElementById('reportTable');
  if (!expenses.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No expenses yet.</td></tr>';
    return;
  }

  const memberIds = [...new Set([
    ...expenses.map(e => e.paidBy),
    ...expenses.flatMap(e => e.splitAmong || []),
  ])];

  tbody.innerHTML = memberIds.map(id => {
    const paid = expenses.filter(e => e.paidBy === id).reduce((s, e) => s + e.amount, 0);
    const involved = expenses.filter(e => (e.splitAmong || [e.paidBy]).includes(id));
    const share = involved.reduce((s, e) => s + e.amount / (e.splitAmong?.length || 1), 0);
    const balance = paid - share;
    const balClass = balance >= 0 ? 'positive' : 'negative';
    return `<tr>
      <td>${getMemberName(id)}</td>
      <td>${formatINR(paid)}</td>
      <td>${formatINR(share)}</td>
      <td class="${balClass}">${balance >= 0 ? '+' : ''}${formatINR(balance)}</td>
    </tr>`;
  }).join('');
}

// ============ DASHBOARD ============
function updateDashboard() {
  document.getElementById('stat-trips').textContent = state.trips.length;
  document.getElementById('stat-members').textContent = state.members.length;
  const total = state.expenses.reduce((s, e) => s + e.amount, 0);
  document.getElementById('stat-spent').textContent = formatINR(total);

  const balances = {};
  state.expenses.forEach(e => {
    const split = e.splitAmong?.length ? e.splitAmong : [e.paidBy];
    const share = e.amount / split.length;
    balances[e.paidBy] = (balances[e.paidBy] || 0) + e.amount;
    split.forEach(id => { balances[id] = (balances[id] || 0) - share; });
  });
  const pending = Object.values(balances).filter(v => v < 0).reduce((s, v) => s + Math.abs(v), 0);
  document.getElementById('stat-pending').textContent = formatINR(pending);

  renderRecentExpenses();
}

function renderRecentExpenses() {
  const tbody = document.getElementById('recentBody');
  const recent = [...state.expenses].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No expenses yet. Create a trip and add expenses!</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(e => {
    const trip = state.trips.find(t => t.id === e.tripId);
    return `<tr>
      <td>${formatDate(e.date)}</td>
      <td>${trip ? trip.name : '–'}</td>
      <td><span class="badge badge-${e.cat}">${catEmoji(e.cat)} ${e.cat}</span></td>
      <td>${e.desc}${e.notes ? ` <span style="color:var(--muted);font-size:0.8em">(${e.notes})</span>` : ''}</td>
      <td>${getMemberName(e.paidBy)}</td>
      <td><strong style="color:var(--accent)">${formatINR(e.amount)}</strong></td>
    </tr>`;
  }).join('');
}

// ============ DROPDOWN HELPERS ============
function populateAllDropdowns() {
  populateExpTrips();
  populateMemberTrips();
  populateSettlementFilter();
  populateReportFilter();
}

function populateExpTrips() {
  const sel = document.getElementById('expTrip');
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- Select Trip --</option>' + state.trips.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  if (cur) sel.value = cur;
}

function populateMemberTrips() {
  const sel = document.getElementById('memberTrip');
  sel.innerHTML = '<option value="">-- Select Trip --</option>' + state.trips.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

function populatePaidBy() {
  const tripId = document.getElementById('expTrip').value;
  const sel = document.getElementById('expPaidBy');
  const splitDiv = document.getElementById('splitCheckboxes');

  const tripMembers = state.members.filter(m => !m.tripId || m.tripId === tripId);
  sel.innerHTML = '<option value="">-- Select Member --</option>' + tripMembers.map(m => `<option value="${m.id}">${m.name}</option>`).join('');

  splitDiv.innerHTML = tripMembers.map(m => `
    <label class="check-label">
      <input type="checkbox" value="${m.id}" checked/>
      <span>${m.name}</span>
    </label>`).join('');
}

function populateSettlementFilter() {
  const sel = document.getElementById('settlementTripFilter');
  const cur = sel.value;
  sel.innerHTML = '<option value="all">All Trips</option>' + state.trips.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  if (cur && cur !== 'all') sel.value = cur;
}

function populateReportFilter() {
  const sel = document.getElementById('reportTripFilter');
  const cur = sel.value;
  sel.innerHTML = '<option value="all">All Trips</option>' + state.trips.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  if (cur && cur !== 'all') sel.value = cur;
}

// ============ UTILITY ============
function getMemberName(id) {
  const m = state.members.find(m => m.id === id);
  return m ? m.name : (id || 'Unknown');
}

function clearForm(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ============ PRINT / EXPORT REPORT ============
function printReport() {
  const filter = document.getElementById('reportTripFilter').value;
  const expenses = filter === 'all' ? state.expenses : state.expenses.filter(e => e.tripId === filter);
  const tripLabel = filter === 'all' ? 'All Trips' : (state.trips.find(t => t.id === filter)?.name || 'Trip');

  // Build settlement data
  const memberIds = [...new Set([
    ...expenses.map(e => e.paidBy),
    ...expenses.flatMap(e => e.splitAmong || []),
  ])];

  const balances = {};
  memberIds.forEach(id => { balances[id] = 0; });
  expenses.forEach(exp => {
    const split = exp.splitAmong?.length ? exp.splitAmong : [exp.paidBy];
    const share = exp.amount / split.length;
    balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;
    split.forEach(id => { balances[id] = (balances[id] || 0) - share; });
  });

  const creditors = [], debtors = [];
  Object.entries(balances).forEach(([id, bal]) => {
    if (bal > 0.01) creditors.push({ id, amt: bal });
    else if (bal < -0.01) debtors.push({ id, amt: -bal });
  });
  const transactions = [];
  let ci = 0, di = 0;
  const c2 = creditors.map(x => ({...x})), d2 = debtors.map(x => ({...x}));
  while (ci < c2.length && di < d2.length) {
    const pay = Math.min(c2[ci].amt, d2[di].amt);
    transactions.push({ from: d2[di].id, to: c2[ci].id, amt: pay });
    c2[ci].amt -= pay; d2[di].amt -= pay;
    if (c2[ci].amt < 0.01) ci++;
    if (d2[di].amt < 0.01) di++;
  }

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const catTotals = {};
  expenses.forEach(e => { catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amount; });

  const expenseRows = [...expenses].sort((a,b) => new Date(a.date) - new Date(b.date)).map(e => {
    const trip = state.trips.find(t => t.id === e.tripId);
    return `<tr>
      <td>${formatDate(e.date)}</td>
      <td>${trip ? trip.name : '–'}</td>
      <td>${e.cat}</td>
      <td>${e.desc}${e.notes ? ` (${e.notes})` : ''}</td>
      <td>${getMemberName(e.paidBy)}</td>
      <td style="text-align:right;font-weight:600">${formatINR(e.amount)}</td>
    </tr>`;
  }).join('');

  const balanceRows = memberIds.map(id => {
    const paid = expenses.filter(e => e.paidBy === id).reduce((s, e) => s + e.amount, 0);
    const involved = expenses.filter(e => (e.splitAmong || [e.paidBy]).includes(id));
    const share = involved.reduce((s, e) => s + e.amount / (e.splitAmong?.length || 1), 0);
    const balance = paid - share;
    const color = balance >= 0 ? '#16a34a' : '#dc2626';
    return `<tr>
      <td>${getMemberName(id)}</td>
      <td style="text-align:right">${formatINR(paid)}</td>
      <td style="text-align:right">${formatINR(share)}</td>
      <td style="text-align:right;font-weight:700;color:${color}">${balance >= 0 ? '+' : ''}${formatINR(balance)}</td>
    </tr>`;
  }).join('');

  const settlementRows = transactions.length
    ? transactions.map(t => `<tr><td>${getMemberName(t.from)}</td><td style="text-align:center">→</td><td>${getMemberName(t.to)}</td><td style="text-align:right;font-weight:700;color:#b45309">${formatINR(t.amt)}</td></tr>`).join('')
    : `<tr><td colspan="4" style="text-align:center;color:#16a34a;font-weight:600;padding:16px">🎉 All settled up! No payments needed.</td></tr>`;

  const catSummaryRows = Object.entries(catTotals).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => {
    const pct = ((amt / totalSpent) * 100).toFixed(1);
    return `<tr><td>${catEmoji(cat)} ${cat}</td><td style="text-align:right">${formatINR(amt)}</td><td style="text-align:right">${pct}%</td></tr>`;
  }).join('');

  const printHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>TripSplit Report – ${tripLabel}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', Arial, sans-serif; color: #1e293b; background: #fff; padding: 32px; font-size: 13px; }
    .cover { text-align: center; padding: 40px 20px 30px; border-bottom: 3px solid #f4a034; margin-bottom: 28px; }
    .cover h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 2.4rem; color: #0b1220; }
    .cover .sub { color: #f4a034; font-weight: 700; letter-spacing: 2px; font-size: 0.78rem; text-transform: uppercase; margin-bottom: 8px; }
    .cover .trip-name { font-family: 'Playfair Display', serif; font-size: 1.3rem; color: #334155; margin-top: 6px; }
    .cover .date { color: #64748b; font-size: 0.82rem; margin-top: 4px; }
    .stats-row { display: flex; gap: 16px; margin-bottom: 28px; }
    .stat-box { flex: 1; border: 2px solid #e2e8f0; border-radius: 10px; padding: 16px; text-align: center; }
    .stat-box .val { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; color: #0b1220; }
    .stat-box .lbl { font-size: 0.72rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    .stat-box.orange { border-color: #f4a034; }
    .stat-box.green { border-color: #22c55e; }
    .stat-box.blue { border-color: #3b82f6; }
    .stat-box.red { border-color: #ef4444; }
    h2 { font-family: 'Playfair Display', serif; font-size: 1.15rem; color: #0b1220; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #f4a034; }
    section { margin-bottom: 28px; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    th { background: #1e2a42; color: #e8edf8; padding: 10px 12px; text-align: left; font-size: 0.72rem; letter-spacing: 0.5px; text-transform: uppercase; }
    td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:last-child td { border-bottom: none; }
    .footer { text-align: center; margin-top: 36px; padding-top: 18px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 0.78rem; }
    .badge { display: inline-block; background: #f1f5f9; color: #475569; border-radius: 20px; padding: 2px 8px; font-size: 0.7rem; }
    @media print {
      body { padding: 16px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <div class="sub">BCA Final Year Project</div>
    <h1>✈ TripSplit</h1>
    <div class="trip-name">Expense Report — ${tripLabel}</div>
    <div class="date">Generated on ${new Date().toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}</div>
  </div>

  <div class="stats-row">
    <div class="stat-box orange">
      <div class="val">${state.trips.length}</div>
      <div class="lbl">Total Trips</div>
    </div>
    <div class="stat-box green">
      <div class="val">${formatINR(totalSpent)}</div>
      <div class="lbl">Total Spent</div>
    </div>
    <div class="stat-box blue">
      <div class="val">${expenses.length}</div>
      <div class="lbl">Transactions</div>
    </div>
    <div class="stat-box red">
      <div class="val">${memberIds.length}</div>
      <div class="lbl">Members</div>
    </div>
  </div>

  <section>
    <h2>📊 Category-wise Spending</h2>
    <table>
      <thead><tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:right">% of Total</th></tr></thead>
      <tbody>${catSummaryRows || '<tr><td colspan="3" style="text-align:center;padding:20px;color:#94a3b8">No data</td></tr>'}</tbody>
    </table>
  </section>

  <section>
    <h2>📋 All Expenses</h2>
    <table>
      <thead><tr><th>Date</th><th>Trip</th><th>Category</th><th>Description</th><th>Paid By</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${expenseRows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">No expenses</td></tr>'}</tbody>
      <tfoot><tr style="background:#1e2a42;color:#e8edf8"><td colspan="5" style="padding:10px 12px;font-weight:700">TOTAL</td><td style="padding:10px 12px;text-align:right;font-weight:700">${formatINR(totalSpent)}</td></tr></tfoot>
    </table>
  </section>

  <section>
    <h2>💰 Member Balance Summary</h2>
    <table>
      <thead><tr><th>Member</th><th style="text-align:right">Total Paid</th><th style="text-align:right">Fair Share</th><th style="text-align:right">Balance</th></tr></thead>
      <tbody>${balanceRows || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8">No data</td></tr>'}</tbody>
    </table>
  </section>

  <section>
    <h2>💸 Settlement – Suggested Payments</h2>
    <table>
      <thead><tr><th>From (Owes)</th><th style="text-align:center">→</th><th>To (Gets Back)</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${settlementRows}</tbody>
    </table>
  </section>

  <div class="footer">
    TripSplit – Trip Expense Calculator &nbsp;|&nbsp; BCA Final Year Project &nbsp;|&nbsp; Powered by Vanilla JS
  </div>

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(printHTML);
  win.document.close();
}

// ============ SEED DEMO DATA ============
function seedDemoData() {
  if (state.trips.length) return;

  const t1 = uid(), t2 = uid();
  const m1 = uid(), m2 = uid(), m3 = uid(), m4 = uid();

  state.trips = [
    { id: t1, name: 'Goa Beach Trip', dest: 'Goa, India', start: '2025-12-20', end: '2025-12-26', budget: 18000, type: 'leisure', desc: 'Annual friend trip to Goa', createdAt: Date.now() },
    { id: t2, name: 'Manali Snow Trip', dest: 'Manali, Himachal Pradesh', start: '2025-01-10', end: '2025-01-15', budget: 22000, type: 'adventure', desc: 'Snow adventure with college friends', createdAt: Date.now() - 1000000 },
  ];

  state.members = [
    { id: m1, name: 'Rahul Sharma', email: 'rahul@mail.com', phone: '9876543210', tripId: t1, createdAt: Date.now() },
    { id: m2, name: 'Priya Singh', email: 'priya@mail.com', phone: '9865432109', tripId: t1, createdAt: Date.now() },
    { id: m3, name: 'Amit Verma', email: 'amit@mail.com', phone: '9754321098', tripId: t2, createdAt: Date.now() },
    { id: m4, name: 'Sneha Gupta', email: 'sneha@mail.com', phone: '9643210987', tripId: t2, createdAt: Date.now() },
  ];

  state.expenses = [
    { id: uid(), tripId: t1, desc: 'Flight Tickets', cat: 'transport', amount: 6800, date: '2025-12-20', paidBy: m1, splitAmong: [m1, m2], notes: 'Indigo flight' },
    { id: uid(), tripId: t1, desc: 'Beach Resort 3 nights', cat: 'accommodation', amount: 4500, date: '2025-12-20', paidBy: m2, splitAmong: [m1, m2], notes: '' },
    { id: uid(), tripId: t1, desc: 'Seafood Dinner', cat: 'food', amount: 1800, date: '2025-12-21', paidBy: m1, splitAmong: [m1, m2], notes: "Fisherman's Wharf" },
    { id: uid(), tripId: t1, desc: 'Water Sports', cat: 'activities', amount: 2400, date: '2025-12-22', paidBy: m2, splitAmong: [m1, m2], notes: 'Parasailing + Jet ski' },
    { id: uid(), tripId: t2, desc: 'Volvo Bus Tickets', cat: 'transport', amount: 3600, date: '2025-01-10', paidBy: m3, splitAmong: [m3, m4], notes: '' },
    { id: uid(), tripId: t2, desc: 'Snow Hotel 4 nights', cat: 'accommodation', amount: 7200, date: '2025-01-10', paidBy: m4, splitAmong: [m3, m4], notes: 'Snow View Hotel' },
    { id: uid(), tripId: t2, desc: 'Trekking Gear Rental', cat: 'activities', amount: 1400, date: '2025-01-11', paidBy: m3, splitAmong: [m3, m4], notes: '' },
    { id: uid(), tripId: t2, desc: 'Meals & Snacks', cat: 'food', amount: 2800, date: '2025-01-12', paidBy: m4, splitAmong: [m3, m4], notes: '' },
  ];

  saveState();
}

// ============ INIT ============
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  seedDemoData();
  renderTrips();
  renderMembers();
  updateDashboard();
  populateAllDropdowns();
});
