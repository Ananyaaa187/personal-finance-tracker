// script.js
let selectedMonth = new Date().toISOString().slice(0, 7);
const records = JSON.parse(localStorage.getItem("expenseRecords")) || {};

document.addEventListener("DOMContentLoaded", () => {
  const [year, month] = selectedMonth.split("-");
  const yearInput = document.getElementById("year-input");
  const monthSelect = document.getElementById("month-select");
  if (yearInput && monthSelect) {
    yearInput.value = year;
    monthSelect.value = month;
  }
  const currentMonthDisplay = document.getElementById("current-month");
  if (currentMonthDisplay) currentMonthDisplay.innerText = selectedMonth;

  const chartLink = document.getElementById("chart-link");
  if (chartLink) chartLink.href = `chart.html?month=${selectedMonth}`;

  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) themeBtn.addEventListener("click", themeToggle);

  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "dark") document.body.classList.add("dark-mode");

  if (localStorage.getItem("selectedMonth")) {
    selectedMonth = localStorage.getItem("selectedMonth");
    const [savedYear, savedMonth] = selectedMonth.split("-");
    if (yearInput) yearInput.value = savedYear;
    if (monthSelect) monthSelect.value = savedMonth;
    if (currentMonthDisplay) currentMonthDisplay.innerText = selectedMonth;
    if (chartLink) chartLink.href = `chart.html?month=${selectedMonth}`;
  }

  if (document.getElementById("set-income-btn"))
    document.getElementById("set-income-btn").addEventListener("click", setIncome);
  if (document.getElementById("add-expense-btn"))
    document.getElementById("add-expense-btn").addEventListener("click", addExpense);
  if (document.getElementById("download-btn"))
    document.getElementById("download-btn").addEventListener("click", downloadData);
  if (document.getElementById("upload-input"))
    document.getElementById("upload-input").addEventListener("change", uploadData);

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
    alert("Please enter both amount and category.");
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
      alert("Invalid file format");
    }
  };
  reader.readAsText(file);
}

function render() {
  const data = records[selectedMonth] || { income: 0, expenses: [] };
  if (document.getElementById("income-value"))
    document.getElementById("income-value").innerText = data.income;

  const list = document.getElementById("expense-list");
  if (list) {
    list.innerHTML = "";
    let totalSpent = 0;
    data.expenses.forEach(e => {
      totalSpent += e.amount;
      const remaining = data.income - totalSpent;
      const li = document.createElement("li");
      li.innerHTML = `
        ${e.date} - ₹${e.amount} for ${e.category} (${e.note || ""}) → Remaining: ₹${remaining}
        <button onclick="deleteExpense(${e.id})" style="margin-left: 5px; color: red;">🗑️</button>
      `;
      list.appendChild(li);
    });
    if (document.getElementById("total-expense"))
      document.getElementById("total-expense").innerText = totalSpent;
    if (document.getElementById("remaining-balance"))
      document.getElementById("remaining-balance").innerText = data.income - totalSpent;

    const [year, month] = selectedMonth.split("-");
    const prevMonth = month === "01" ? `${year - 1}-12` : `${year}-${(Number(month) - 1).toString().padStart(2, "0")}`;
    const prevData = records[prevMonth];
    const alertBox = document.getElementById("spend-alert");
    if (alertBox) {
      if (prevData && prevData.expenses) {
        const prevTotal = prevData.expenses.reduce((sum, e) => sum + e.amount, 0);
        if (totalSpent > prevTotal) {
          alertBox.innerText = "⚠️ Spending more than last month!";
        } else {
          alertBox.innerText = "";
        }
      } else {
        alertBox.innerText = "";
      }
    }
  }

  const historyList = document.getElementById("history-months");
  if (historyList) {
    historyList.innerHTML = "";
    Object.keys(records).forEach(monthKey => {
      const monthItem = document.createElement("li");
      monthItem.innerHTML = `
        ${monthKey} <button onclick="deleteMonth('${monthKey}')" style="margin-left: 10px; color: red;">🗑️ Delete</button>
      `;
      historyList.appendChild(monthItem);
    });
  }
}
