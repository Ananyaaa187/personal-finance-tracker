let selectedMonth = new Date().toISOString().slice(0, 7);
const records = JSON.parse(localStorage.getItem("expenseRecords")) || {};

// Set and persist theme
function applyTheme() {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
  }
}

// On page load
document.addEventListener("DOMContentLoaded", () => {
  applyTheme();

  const [year, month] = selectedMonth.split("-");
  const yInput = document.getElementById("year-input");
  const mSelect = document.getElementById("month-select");

  if (yInput && mSelect) {
    yInput.value = year;
    mSelect.value = month;
    document.getElementById("current-month").innerText = selectedMonth;
    document.getElementById("chart-link").href = `chart.html?month=${selectedMonth}`;
  }

  if (document.getElementById("set-income-btn")) {
    document.getElementById("set-income-btn").addEventListener("click", setIncome);
    document.getElementById("add-expense-btn").addEventListener("click", addExpense);
    document.getElementById("download-btn").addEventListener("click", downloadData);
    document.getElementById("upload-input").addEventListener("change", uploadData);
  }

  if (document.getElementById("theme-toggle")) {
    document.getElementById("theme-toggle").addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark-mode");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }

  if (localStorage.getItem("selectedMonth")) {
    selectedMonth = localStorage.getItem("selectedMonth");
    if (yInput && mSelect) {
      const [savedYear, savedMonth] = selectedMonth.split("-");
      yInput.value = savedYear;
      mSelect.value = savedMonth;
      document.getElementById("current-month").innerText = selectedMonth;
      document.getElementById("chart-link").href = `chart.html?month=${selectedMonth}`;
    }
  }

  render();
});

function manualMonthChange() {
  const year = document.getElementById("year-input").value;
  const month = document.getElementById("month-select").value;
  const fullMonth = `${year}-${month}`;
  switchMonth(fullMonth);
}

function switchMonth(month) {
  selectedMonth = month;
  localStorage.setItem("selectedMonth", month);
  document.getElementById("current-month").innerText = month;
  document.getElementById("chart-link").href = `chart.html?month=${month}`;
  render();
}

function saveRecords() {
  localStorage.setItem("expenseRecords", JSON.stringify(records));
}

function setIncome() {
  const incomeInput = document.getElementById("monthly-income");
  const income = Number(incomeInput.value);
  if (!records[selectedMonth]) {
    records[selectedMonth] = { income: 0, expenses: [] };
  }
  records[selectedMonth].income = income;
  saveRecords();
  render();
  incomeInput.value = "";
}

function addExpense() {
  const amountInput = document.getElementById("expense-amount");
  const categoryInput = document.getElementById("expense-category");
  const noteInput = document.getElementById("expense-note");

  const amount = Number(amountInput.value);
  const category = categoryInput.value.trim();
  const note = noteInput.value.trim();

  if (!amount || !category) {
    alert("Please enter amount and category.");
    return;
  }

  const expense = {
    id: Date.now(),
    amount,
    category,
    note,
    date: new Date().toISOString().slice(0, 10)
  };

  if (!records[selectedMonth]) {
    records[selectedMonth] = { income: 0, expenses: [] };
  }

  records[selectedMonth].expenses.push(expense);
  saveRecords();
  render();

  // Clear inputs after submission
  amountInput.value = "";
  categoryInput.value = "";
  noteInput.value = "";
}

function deleteExpense(id) {
  records[selectedMonth].expenses = records[selectedMonth].expenses.filter(e => e.id !== id);
  saveRecords();
  render();
}

function deleteMonth(monthKey) {
  if (confirm(`Delete all records for ${monthKey}?`)) {
    delete records[monthKey];
    saveRecords();
    if (monthKey === selectedMonth) {
      selectedMonth = new Date().toISOString().slice(0, 7);
      localStorage.setItem("selectedMonth", selectedMonth);
    }
    render();
  }
}

function downloadData() {
  const dataStr = JSON.stringify(records[selectedMonth] || {}, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${selectedMonth}-finance.json`;
  a.click();
}

function uploadData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!records[selectedMonth]) {
        records[selectedMonth] = { income: 0, expenses: [] };
      }
      if (data.income) records[selectedMonth].income = data.income;
      if (Array.isArray(data.expenses)) {
        records[selectedMonth].expenses.push(...data.expenses);
      }
      saveRecords();
      render();
    } catch (err) {
      alert("Invalid file format.");
    }
  };
  reader.readAsText(file);
}

function render() {
  const data = records[selectedMonth] || { income: 0, expenses: [] };
  const incomeElem = document.getElementById("income-value");
  const totalElem = document.getElementById("total-expense");
  const balanceElem = document.getElementById("remaining-balance");
  const alertBox = document.getElementById("spend-alert");
  const list = document.getElementById("expense-list");

  if (incomeElem) incomeElem.innerText = data.income;
  if (list) list.innerHTML = "";

  let totalSpent = 0;
  data.expenses.forEach(e => {
    totalSpent += e.amount;
    const remaining = data.income - totalSpent;

    const li = document.createElement("li");
    li.innerHTML = `
      ${e.date} - ₹${e.amount} for ${e.category} (${e.note || ""}) → Remaining: ₹${remaining}
      <button onclick="deleteExpense(${e.id})" style="margin-left: 5px; color: red;">🗑️ Delete</button>
    `;
    if (list) list.appendChild(li);
  });

  if (totalElem) totalElem.innerText = totalSpent;
  if (balanceElem) balanceElem.innerText = data.income - totalSpent;

  // Compare to previous month
  const [year, month] = selectedMonth.split("-");
  const prevMonth = month === "01" ? `${year - 1}-12` : `${year}-${(Number(month) - 1).toString().padStart(2, "0")}`;
  const prevData = records[prevMonth];
  if (alertBox) {
    if (prevData && prevData.expenses) {
      const prevTotal = prevData.expenses.reduce((sum, e) => sum + e.amount, 0);
      alertBox.innerText = totalSpent > prevTotal ? "⚠️ You're spending more than last month!" : "";
    } else {
      alertBox.innerText = "";
    }
  }

  // Populate month list (for history.html)
  const historyList = document.getElementById("history-months");
  if (historyList) {
    historyList.innerHTML = "";
    Object.keys(records).forEach(monthKey => {
      const item = document.createElement("li");
      item.innerHTML = `
        ${monthKey} <button onclick="deleteMonth('${monthKey}')" style="margin-left: 10px; color: red;">🗑️ Delete</button>
      `;
      historyList.appendChild(item);
    });
  }
}
