/* ==========================================================================
   1. Cài đặt ban đầu (Initial Setup)
   ========================================================================== */
const urlParams = new URLSearchParams(window.location.search);
const apiUrl = urlParams.get('api');
const sheetId = urlParams.get('sheetId');
const proxyUrl = 'https://miniappdesign.netlify.app/.netlify/functions/proxy?url=';

// Kiểm tra thông số API và Sheet ID
if (!apiUrl || !sheetId) {
  showToast("Thiếu thông tin API hoặc Sheet ID. Vui lòng kiểm tra lại URL!", "error");
}

// Biến toàn cục
let cachedFinancialData = null;
let cachedChartData = null;
let cachedTransactions = null;
let cachedKeywords = null;
let currentPage = 1;
const transactionsPerPage = 10;
let cachedMonthlyExpenses = null;
let currentPageMonthly = 1;
const expensesPerPage = 10;
let cachedSearchResults = null;
let currentPageSearch = 1;
const searchPerPage = 10;
let expenseChart = null;

/* ==========================================================================
   2. Hàm tiện ích (Utility Functions)
   ========================================================================== */
function showToast(message, type = "info") {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showModalError(modalId, message) {
  const errorDiv = document.getElementById(`${modalId}Error`);
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 5000);
  }
}

function showLoading(show, tabId) {
  const loadingElement = document.getElementById(`loading${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
  if (loadingElement) loadingElement.style.display = show ? 'block' : 'none';
}

function showLoadingPopup(show) {
  let loadingPopup = document.getElementById('loadingPopup');
  if (!loadingPopup) {
    loadingPopup = document.createElement('div');
    loadingPopup.id = 'loadingPopup';
    loadingPopup.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0, 0, 0, 0.5); display: none; 
      justify-content: center; align-items: center; z-index: 3000;
    `;
    loadingPopup.innerHTML = `
      <div style="background: #FFFFFF; padding: 2rem; border-radius: 16px; 
                  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2); 
                  display: flex; flex-direction: column; align-items: center; gap: 1rem;">
        <div style="border: 4px solid #16A34A; border-top: 4px solid transparent; 
                    border-radius: 50%; width: 40px; height: 40px; 
                    animation: spin 1s linear infinite;"></div>
        <span style="font-size: 1rem; color: #1F2A44; font-weight: 500;">Đang xử lý...</span>
      </div>
    `;
    document.body.appendChild(loadingPopup);
  }
  loadingPopup.style.display = show ? 'flex' : 'none';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  const [day, month, year] = parts;
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

function formatDateToYYYYMMDD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatNumberWithCommas(value) {
  if (!value) return '';
  const digitsOnly = value.toString().replace(/[^0-9]/g, '');
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseNumber(value) {
  return parseInt(value.toString().replace(/[^0-9]/g, '')) || 0;
}

/* ==========================================================================
   3. Hàm điều hướng (Navigation Functions)
   ========================================================================== */
window.openTab = function(tabId) {
  const tabs = document.querySelectorAll('.nav-item');
  const contents = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));
  contents.forEach(content => content.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  document.querySelector(`.nav-item[data-tab="${tabId}"]`).classList.add('active');

  if (tabId === 'tab1') window.fetchTransactions();
  else if (tabId === 'tab2') window.fetchData();
  else if (tabId === 'tab3') window.fetchMonthlyData();
  else if (tabId === 'tab5') window.fetchMonthlyExpenses();
  else if (tabId === 'tab6') populateSearchCategories();
  else if (tabId === 'tab7') window.fetchKeywords();
};

/* ==========================================================================
   4. Tab 1: Giao dịch (Transactions Tab)
   ========================================================================== */
window.fetchTransactions = async function() {
  const transactionDate = document.getElementById('transactionDate').value;
  if (!transactionDate) return showToast("Vui lòng chọn ngày!", "warning");
  const [year, month, day] = transactionDate.split('-');
  const formattedDate = `${day}/${month}/${year}`;
  const cacheKey = formattedDate;

  if (cachedTransactions && cachedTransactions.cacheKey === cacheKey) {
    displayTransactions(cachedTransactions.data);
    return;
  }

  showLoading(true, 'tab1');
  try {
    const targetUrl = `${apiUrl}?action=getTransactionsByDate&date=${encodeURIComponent(transactionDate)}&sheetId=${sheetId}`;
    const finalUrl = proxyUrl + encodeURIComponent(targetUrl);
    const response = await fetch(finalUrl);
    const transactionData = await response.json();
    if (transactionData.error) throw new Error(transactionData.error);
    cachedTransactions = { cacheKey, data: transactionData };
    displayTransactions(transactionData);
  } catch (error) {
    showToast("Lỗi khi lấy giao dịch: " + error.message, "error");
    displayTransactions({ error: true });
  } finally {
    showLoading(false, 'tab1');
  }
};

function displayTransactions(data) {
  const container = document.getElementById('transactionsContainer');
  const summaryContainer = document.getElementById('dailySummary');
  const pageInfo = document.getElementById('pageInfo');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  container.innerHTML = '';

  if (!data || data.error || !Array.isArray(data) || data.length === 0) {
    container.innerHTML = '<div>Không có giao dịch nào</div>';
    summaryContainer.innerHTML = `
      <div class="stat-box income"><div class="title">Tổng thu nhập</div><div class="amount no-data">Không có<br>dữ liệu</div></div>
      <div class="stat-box expense"><div class="title">Tổng chi tiêu</div><div class="amount no-data">Không có<br>dữ liệu</div></div>
      <div class="stat-box balance"><div class="title">Số dư</div><div class="amount no-data">Không có<br>dữ liệu</div></div>
    `;
    pageInfo.textContent = '';
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;
    return;
  }

  let totalIncome = 0, totalExpense = 0;
  data.forEach(item => {
    if (item.type === 'Thu nhập') totalIncome += item.amount;
    else if (item.type === 'Chi tiêu') totalExpense += item.amount;
  });
  const balance = totalIncome - totalExpense;

  summaryContainer.innerHTML = `
    <div class="stat-box income"><div class="title">Tổng thu nhập</div><div class="amount">${totalIncome.toLocaleString('vi-VN')}đ</div></div>
    <div class="stat-box expense"><div class="title">Tổng chi tiêu</div><div class="amount">${totalExpense.toLocaleString('vi-VN')}đ</div></div>
    <div class="stat-box balance"><div class="title">Số dư</div><div class="amount">${balance.toLocaleString('vi-VN')}đ</div></div>
  `;

  const totalPages = Math.ceil(data.length / transactionsPerPage);
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = startIndex + transactionsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

  paginatedData.forEach((item, index) => {
    const transactionBox = document.createElement('div');
    transactionBox.className = 'transaction-box';
    const amountColor = item.type === 'Thu nhập' ? 'var(--income-color)' : 'var(--expense-color)';
    const typeClass = item.type === 'Thu nhập' ? 'income' : 'expense';
    const transactionNumber = startIndex + index + 1;
    transactionBox.innerHTML = `
      <div class="layer-container" style="position: relative;">
        <div class="layer-top" style="position: absolute; top: 0; right: 0;">
          <div class="number">Giao dịch thứ: ${transactionNumber}</div>
          <div class="id">Mã giao dịch: ${item.id}</div>
        </div>
        <div class="layer-bottom" style="width: 100%;">
          <div class="date">${formatDate(item.date)}</div>
          <div class="amount" style="color: ${amountColor}; font-size: 1.4rem;">${item.amount.toLocaleString('vi-VN')}đ</div>
          <div class="content">Nội dung: ${item.content}${item.note ? ` (${item.note})` : ''}</div>
          <div class="type ${typeClass}">Phân loại: ${item.type}</div>
          <div class="category">Phân loại chi tiết: ${item.category}</div>
        </div>
      </div>
      <div style="margin-top: 0.5rem;">
        <button class="edit-btn edit" data-id="${item.id}">Sửa</button>
        <button class="delete-btn delete" data-id="${item.id}">Xóa</button>
      </div>
    `;
    container.appendChild(transactionBox);
  });

  pageInfo.textContent = `Trang ${currentPage} / ${totalPages}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages;

  document.querySelectorAll('.edit-btn').forEach(button => {
    const transactionId = button.getAttribute('data-id');
    const transaction = data.find(item => String(item.id) === String(transactionId));
    if (!transaction) return console.error(`Không tìm thấy giao dịch với ID: ${transactionId}`);
    button.addEventListener('click', () => openEditForm(transaction));
  });

  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', () => deleteTransaction(button.getAttribute('data-id')));
  });
}

/* ==========================================================================
   5. Quản lý giao dịch (Transaction Management)
   ========================================================================== */
async function fetchCategories() {
  try {
    const targetUrl = `${apiUrl}?action=getCategories&sheetId=${sheetId}`;
    const finalUrl = proxyUrl + encodeURIComponent(targetUrl);
    const response = await fetch(finalUrl);
    const categoriesData = await response.json();
    if (categoriesData.error) throw new Error(categoriesData.error);
    return categoriesData;
  } catch (error) {
    showToast("Lỗi khi lấy danh sách phân loại: " + error.message, "error");
    return [];
  }
}

async function openEditForm(transaction) {
  if (!transaction) return showToast('Dữ liệu giao dịch không hợp lệ!', "error");
  const modal = document.getElementById('editModal');
  const form = document.getElementById('editForm');
  const categorySelect = document.getElementById('editCategory');
  const amountInput = document.getElementById('editAmount');
  const modalContent = document.querySelector('#editModal .modal-content');

  document.getElementById('editTransactionId').value = transaction.id || '';
  document.getElementById('editContent').value = transaction.content || '';
  amountInput.value = formatNumberWithCommas(transaction.amount.toString());
  document.getElementById('editType').value = transaction.type || 'Thu nhập';
  document.getElementById('editNote').value = transaction.note || '';

  let dateValue = '';
  if (transaction.date && transaction.date.includes('/')) {
    const [day, month, year] = transaction.date.split('/');
    if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
      dateValue = `${year}-${month}-${day}`;
    } else {
      showToast("Định dạng ngày không hợp lệ!", "error");
      return;
    }
  } else {
    showToast("Ngày giao dịch không hợp lệ!", "error");
    return;
  }
  document.getElementById('editDate').value = dateValue;

  const categories = await fetchCategories();
  categorySelect.innerHTML = '<option value="">Chọn danh mục</option>';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    if (category === transaction.category) option.selected = true;
    categorySelect.appendChild(option);
  });

  amountInput.addEventListener('input', function() {
    const cursorPosition = this.selectionStart;
    const oldLength = this.value.length;
    this.value = formatNumberWithCommas(this.value);
    const newLength = this.value.length;
    this.selectionStart = this.selectionEnd = cursorPosition + (newLength - oldLength);
  });

  amountInput.addEventListener('keypress', function(e) {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  });

  modal.style.display = 'flex';

  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      setTimeout(() => {
        modal.scrollTop = input.offsetTop - 50;
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });
  });

  form.onsubmit = async function(e) {
    e.preventDefault();
    const dateInput = document.getElementById('editDate').value;
    if (!dateInput) return showModalError('edit', 'Vui lòng chọn ngày!');
    const inputDate = new Date(dateInput);
    const today = new Date();
    if (inputDate > today) return showModalError('edit', 'Không thể chọn ngày trong tương lai!');
    const amount = parseNumber(document.getElementById('editAmount').value);
    if (amount <= 0) return showModalError('edit', 'Số tiền phải lớn hơn 0!');
    const [year, month, day] = dateInput.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    const updatedTransaction = {
      id: document.getElementById('editTransactionId').value,
      content: document.getElementById('editContent').value,
      amount: amount,
      type: document.getElementById('editType').value,
      category: document.getElementById('editCategory').value,
      note: document.getElementById('editNote').value || '',
      date: formattedDate,
      action: 'updateTransaction',
      sheetId: sheetId
    };
    await saveTransaction(updatedTransaction);
  };
}

async function openAddForm() {
  const modal = document.getElementById('addModal');
  const form = document.getElementById('addForm');
  const categorySelect = document.getElementById('addCategory');
  const amountInput = document.getElementById('addAmount');

  document.getElementById('addDate').value = formatDateToYYYYMMDD(new Date());
  document.getElementById('addContent').value = '';
  amountInput.value = '';
  document.getElementById('addType').value = 'Thu nhập';
  document.getElementById('addNote').value = '';

  const categories = await fetchCategories();
  categorySelect.innerHTML = '<option value="">Chọn danh mục</option>';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });

  amountInput.addEventListener('input', function() {
    const cursorPosition = this.selectionStart;
    const oldLength = this.value.length;
    this.value = formatNumberWithCommas(this.value);
    const newLength = this.value.length;
    this.selectionStart = this.selectionEnd = cursorPosition + (newLength - oldLength);
  });

  amountInput.addEventListener('keypress', function(e) {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  });

  modal.style.display = 'flex';
  form.onsubmit = async function(e) {
    e.preventDefault();
    const dateInput = document.getElementById('addDate').value;
    const [year, month, day] = dateInput.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    const today = new Date();
    const inputDate = new Date(year, month - 1, day);
    if (inputDate > today) return showModalError('add', 'Không thể chọn ngày trong tương lai!');
    const amount = parseNumber(document.getElementById('addAmount').value);
    if (amount <= 0) return showModalError('add', 'Số tiền phải lớn hơn 0!');
    const newTransaction = {
      content: document.getElementById('addContent').value,
      amount: amount,
      type: document.getElementById('addType').value,
      category: document.getElementById('addCategory').value,
      note: document.getElementById('addNote').value || '',
      date: formattedDate,
      action: 'addTransaction',
      sheetId: sheetId
    };
    await addTransaction(newTransaction);
  };
}

function closeEditForm() {
  document.getElementById('editModal').style.display = 'none';
}

function closeAddForm() {
  document.getElementById('addModal').style.display = 'none';
}

async function saveTransaction(updatedTransaction) {
  if (!updatedTransaction.date || !/^\d{2}\/\d{2}\/\d{4}$/.test(updatedTransaction.date)) {
    showToast("Định dạng ngày không hợp lệ!", "error");
    return;
  }
  const dateParts = updatedTransaction.date.split('/');
  updatedTransaction.month = dateParts[1].padStart(2, '0');

  showLoadingPopup(true);
  try {
    const finalUrl = proxyUrl + encodeURIComponent(apiUrl);
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTransaction)
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    showToast("Cập nhật giao dịch thành công!", "success");
    closeEditForm();
    cachedTransactions = null;
    cachedMonthlyExpenses = null;
    cachedSearchResults = null;
    const activeTab = document.querySelector('.tab-content.active')?.id;
    if (activeTab === 'tab1') await window.fetchTransactions();
    else if (activeTab === 'tab2') await window.fetchData();
    else if (activeTab === 'tab5') await window.fetchMonthlyExpenses();
    else if (activeTab === 'tab6') await window.searchTransactions();
  } catch (error) {
    showToast("Lỗi khi cập nhật giao dịch: " + error.message, "error");
  } finally {
    showLoadingPopup(false);
  }
}

async function addTransaction(newTransaction) {
  showLoadingPopup(true);
  try {
    if (!newTransaction.date || !/^\d{2}\/\d{2}\/\d{4}$/.test(newTransaction.date)) {
      throw new Error("Định dạng ngày không hợp lệ!");
    }
    const finalUrl = proxyUrl + encodeURIComponent(apiUrl);
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTransaction)
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    showToast(`Thêm giao dịch thành công!`, "success");
    closeAddForm();
    cachedTransactions = null;
    cachedMonthlyExpenses = null;
    cachedSearchResults = null;
    const activeTab = document.querySelector('.tab-content.active')?.id;
    const [day, month, year] = newTransaction.date.split('/');
    const formattedDateForInput = `${year}-${month}-${day}`;
    if (activeTab === 'tab1') {
      document.getElementById('transactionDate').value = formattedDateForInput;
      await window.fetchTransactions();
    } else if (activeTab === 'tab2') await window.fetchData();
    else if (activeTab === 'tab5') await window.fetchMonthlyExpenses();
    else if (activeTab === 'tab6') await window.searchTransactions();
  } catch (error) {
    showToast("Lỗi khi thêm giao dịch: " + error.message, "error");
  } finally {
    showLoadingPopup(false);
  }
}

async function deleteTransaction(transactionId) {
  const modal = document.getElementById('confirmDeleteModal');
  if (!modal) return showToast("Lỗi giao diện: Không tìm thấy modal xác nhận!", "error");

  modal.style.display = 'flex';
  const confirmBtn = document.getElementById('confirmDeleteBtn');
  confirmBtn.onclick = async () => {
    modal.style.display = 'none';
    showLoadingPopup(true);
    try {
      const activeTab = document.querySelector('.tab-content.active')?.id;
      let cacheData = activeTab === 'tab1' ? cachedTransactions :
                      activeTab === 'tab5' ? cachedMonthlyExpenses :
                      activeTab === 'tab6' ? cachedSearchResults : null;

      const transaction = cacheData?.data?.find(item => String(item.id) === String(transactionId));
      if (!transaction) throw new Error("Không tìm thấy giao dịch!");

      const dateParts = transaction.date.split('/');
      if (dateParts.length !== 3) throw new Error("Định dạng ngày không hợp lệ!");
      const transactionMonth = dateParts[1].padStart(2, '0');

      const finalUrl = proxyUrl + encodeURIComponent(apiUrl);
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteTransaction',
          id: transactionId,
          month: transactionMonth,
          sheetId: sheetId
        })
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);
      showToast("Xóa giao dịch thành công!", "success");
      cachedTransactions = null;
      cachedMonthlyExpenses = null;
      cachedSearchResults = null;
      if (activeTab === 'tab1') await window.fetchTransactions();
      else if (activeTab === 'tab2') await window.fetchData();
      else if (activeTab === 'tab5') await window.fetchMonthlyExpenses();
      else if (activeTab === 'tab6') await window.searchTransactions();
    } catch (error) {
      showToast("Lỗi khi xóa giao dịch: " + error.message, "error");
    } finally {
      showLoadingPopup(false);
    }
  };
}

function closeConfirmDeleteModal() {
  document.getElementById('confirmDeleteModal').style.display = 'none';
}

/* ==========================================================================
   6. Tab 2: Thống kê (Statistics Tab)
   ========================================================================== */
window.fetchData = async function() {
  const startDateInput = document.getElementById('startDate').value;
  const endDateInput = document.getElementById('endDate').value;
  if (!startDateInput || !endDateInput) return showToast("Vui lòng chọn khoảng thời gian!", "warning");
  const startDate = new Date(startDateInput);
  const endDate = new Date(endDateInput);
  if (startDate > endDate) return showToast("Ngày bắt đầu không thể lớn hơn ngày kết thúc!", "warning");

  const cacheKey = `${startDateInput}-${endDateInput}`;
  if (cachedFinancialData && cachedFinancialData.cacheKey === cacheKey) {
    updateFinancialData(cachedFinancialData.data);
    if (cachedChartData && cachedChartData.cacheKey === cacheKey) {
      updateChartData(cachedChartData.data);
    }
    return;
  }

  showLoading(true, 'tab2');
  try {
    const financialUrl = `${apiUrl}?action=getFinancialSummary&startDate=${startDateInput}&endDate=${endDateInput}&sheetId=${sheetId}`;
    const finalFinancialUrl = proxyUrl + encodeURIComponent(financialUrl);
    const financialResponse = await fetch(finalFinancialUrl);
    const financialData = await response.json();
    if (financialData.error) throw new Error(financialData.error);
    cachedFinancialData = { cacheKey, data: financialData };
    updateFinancialData(financialData);

    const chartUrl = `${apiUrl}?action=getChartData&startDate=${startDateInput}&endDate=${endDateInput}&sheetId=${sheetId}`;
    const finalChartUrl = proxyUrl + encodeURIComponent(chartUrl);
    const chartResponse = await fetch(finalChartUrl);
    const chartData = await chartResponse.json();
    if (chartData.error) throw new Error(chartData.error);
    cachedChartData = { cacheKey, data: chartData };
    updateChartData(chartData);
  } catch (error) {
    showToast("Lỗi khi lấy dữ liệu: " + error.message, "error");
    updateFinancialData({ error: true });
  } finally {
    showLoading(false, 'tab2');
  }
};

function updateFinancialData(data) {
  const container = document.getElementById('statsContainer');
  if (!data || data.error || !data.income) {
    container.innerHTML = `
      <div class="stat-box income"><div class="title">Tổng thu nhập</div><div class="amount no-data">Không có<br>dữ liệu</div></div>
      <div class="stat-box expense"><div class="title">Tổng chi tiêu</div><div class="amount no-data">Không có<br>dữ liệu</div></div>
      <div class="stat-box balance"><div class="title">Số dư</div><div class="amount no-data">Không có<br>dữ liệu</div></div>
    `;
    return;
  }

  const totalIncome = Number(data.income) || 0;
  const totalExpense = Number(data.expense) || 0;
  const balance = totalIncome - totalExpense;

  container.innerHTML = `
    <div class="stat-box income"><div class="title">Tổng thu nhập</div><div class="amount">${totalIncome.toLocaleString('vi-VN')}đ</div></div>
    <div class="stat-box expense"><div class="title">Tổng chi tiêu</div><div class="amount">${totalExpense.toLocaleString('vi-VN')}đ</div></div>
    <div class="stat-box balance"><div class="title">Số dư</div><div class="amount">${balance.toLocaleString('vi-VN')}đ</div></div>
  `;
}

function updateChartData(response) {
  const ctx = document.getElementById('myChart').getContext('2d');
  if (expenseChart) expenseChart.destroy();

  if (response.error || !response.chartData) {
    showToast("Không có dữ liệu biểu đồ!", "error");
    return;
  }

  const chartData = response.chartData;
  const totalAmount = chartData.reduce((sum, item) => sum + item.amount, 0);
  const backgroundColors = [
    '#FF6B6B', '#FF8E53', '#FFC107', '#4CAF50', '#40C4FF', '#3F51B5',
    '#AB47BC', '#EC407A', '#EF5350', '#FF7043', '#FDD835', '#66BB6A'
  ];

  const customLegend = document.getElementById('customLegend');
  customLegend.innerHTML = '';
  const leftColumn = document.createElement('div');
  leftColumn.className = 'custom-legend-column';
  const rightColumn = document.createElement('div');
  rightColumn.className = 'custom-legend-column';

  chartData.forEach((item, i) => {
    const color = backgroundColors[i % backgroundColors.length];
    const percentage = ((item.amount / totalAmount) * 100).toFixed(1);
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <span class="legend-color" style="background-color: ${color};"></span>
      <span class="legend-text">${item.category}: <span class="legend-value">${item.amount.toLocaleString('vi-VN')}đ (${percentage}%)</span></span>
    `;
    if (i % 2 === 0) leftColumn.appendChild(legendItem);
    else rightColumn.appendChild(legendItem);
  });

  customLegend.appendChild(leftColumn);
  customLegend.appendChild(rightColumn);

  expenseChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: chartData.map(item => item.category),
      datasets: [{
        data: chartData.map(item => item.amount),
        backgroundColor: chartData.map((item, i) => backgroundColors[i % backgroundColors.length])
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(tooltipItem) {
              const category = tooltipItem.label;
              const amount = tooltipItem.raw;
              const percentage = ((amount / totalAmount) * 100).toFixed(1);
              return `${category}: ${amount.toLocaleString('vi-VN')}đ (${percentage}%)`;
            }
          }
        },
        datalabels: {
          formatter: (value, context) => {
            const percentage = ((value / totalAmount) * 100).toFixed(1);
            return percentage >= 1 ? `${value.toLocaleString('vi-VN')}đ (${percentage}%)` : '';
          },
          color: '#fff',
          font: { weight: 'bold', size: 12 }
        }
      }
    }
  });
}

/* ==========================================================================
   7. Tab 3: Biểu đồ (Charts Tab)
   ========================================================================== */
window.fetchMonthlyData = async function() {
  const startMonth = parseInt(document.getElementById('startMonth').value);
  const endMonth = parseInt(document.getElementById('endMonth').value);
  const year = new Date().getFullYear();
  if (startMonth > endMonth) return showToast("Tháng bắt đầu không thể lớn hơn tháng kết thúc!", "warning");

  showLoading(true, 'tab3');
  try {
    const targetUrl = `${apiUrl}?action=getMonthlyData&year=${year}&sheetId=${sheetId}`;
    const finalUrl = proxyUrl + encodeURIComponent(targetUrl);
    const response = await fetch(finalUrl);
    const monthlyData = await response.json();
    if (monthlyData.error) throw new Error(monthlyData.error);

    const filteredData = Array.from({ length: endMonth - startMonth + 1 }, (_, i) => {
      const month = startMonth + i;
      const existingData = monthlyData.find(item => item.month === month);
      return existingData || { month, income: 0, expense: 0 };
    });

    updateMonthlyChart(filteredData);
  } catch (error) {
    showToast("Lỗi khi lấy dữ liệu biểu đồ: " + error.message, "error");
    updateMonthlyChart([]);
  } finally {
    showLoading(false, 'tab3');
  }
};

function updateMonthlyChart(filteredData) {
  const ctx = document.getElementById('monthlyChart').getContext('2d');
  if (window.monthlyChart) window.monthlyChart.destroy();

  if (!filteredData || filteredData.length === 0) {
    window.monthlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Không có dữ liệu'],
        datasets: [
          { label: 'Thu nhập', data: [0], backgroundColor: '#10B981' },
          { label: 'Chi tiêu', data: [0], backgroundColor: '#EF4444' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Số tiền (đ)' } },
          x: { title: { display: true, text: 'Tháng' } }
        }
      }
    });
    document.getElementById('monthlyLegend').innerHTML = '<div>Không có dữ liệu</div>';
    return;
  }

  const labels = filteredData.map(item => `Tháng ${item.month}`);
  const incomes = filteredData.map(item => item.income || 0);
  const expenses = filteredData.map(item => item.expense || 0);

  window.monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Thu nhập', data: incomes, backgroundColor: '#10B981', borderColor: '#10B981', borderWidth: 1 },
        { label: 'Chi tiêu', data: expenses, backgroundColor: '#EF4444', borderColor: '#EF4444', borderWidth: 1 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Số tiền (đ)' },
          ticks: { callback: value => value.toLocaleString('vi-VN') + 'đ' }
        },
        x: { title: { display: true, text: 'Tháng' } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(tooltipItem) {
              return `${tooltipItem.dataset.label}: ${tooltipItem.raw.toLocaleString('vi-VN')}đ`;
            }
          }
        },
        datalabels: {
          display: true,
          align: 'end',
          anchor: 'end',
          formatter: value => value.toLocaleString('vi-VN') + 'đ',
          color: '#1F2A44',
          font: { weight: 'bold', size: 12 }
        }
      }
    }
  });

  const monthlyLegend = document.getElementById('monthlyLegend');
  monthlyLegend.innerHTML = '';
  const column = document.createElement('div');
  column.className = 'monthly-column';
  filteredData.forEach(item => {
    const difference = (item.income || 0) - (item.expense || 0);
    const diffClass = difference >= 0 ? 'positive' : 'negative';
    const diffIcon = difference >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    const monthItem = document.createElement('div');
    monthItem.className = 'month-item';
    monthItem.innerHTML = `
      <h3>Tháng ${item.month}:</h3>
      <p><span class="color-box" style="background-color: #10B981;"></span>Tổng thu nhập: <strong>${(item.income || 0).toLocaleString('vi-VN')}đ</strong></p>
      <p><span class="color-box" style="background-color: #EF4444;"></span>Tổng chi tiêu: <strong>${(item.expense || 0).toLocaleString('vi-VN')}đ</strong></p>
      <p><i class="fas ${diffIcon} difference-icon ${diffClass}"></i>Chênh lệch: <span class="difference ${diffClass}"><strong>${difference.toLocaleString('vi-VN')}đ</strong></span></p>
    `;
    column.appendChild(monthItem);
  });
  monthlyLegend.appendChild(column);
}

/* ==========================================================================
   8. Tab 5: Chi tiêu trong tháng (Monthly Expenses Tab)
   ========================================================================== */
window.fetchMonthlyExpenses = async function() {
  const month = document.getElementById('expenseMonth').value;
  if (!month) return showToast("Vui lòng chọn tháng!", "warning");
  const year = new Date().getFullYear();
  const cacheKey = `${year}-${month}`;

  if (cachedMonthlyExpenses && cachedMonthlyExpenses.cacheKey === cacheKey) {
    displayMonthlyExpenses(cachedMonthlyExpenses.data);
    return;
  }

  showLoading(true, 'tab5');
  try {
    const targetUrl = `${apiUrl}?action=getTransactionsByMonth&month=${month}&year=${year}&sheetId=${sheetId}`;
    const finalUrl = proxyUrl + encodeURIComponent(targetUrl);
    const response = await fetch(finalUrl);
    const transactionData = await response.json();
    if (transactionData.error) throw new Error(transactionData.error);
    cachedMonthlyExpenses = { cacheKey, data: transactionData };
    displayMonthlyExpenses(transactionData);
  } catch (error) {
    showToast("Lỗi khi lấy giao dịch: " + error.message, "error");
    displayMonthlyExpenses({ error: true });
  } finally {
    showLoading(false, 'tab5');
  }
};

function displayMonthlyExpenses(data) {
  const container = document.getElementById('monthlyExpensesContainer');
  const summaryContainer = document.getElementById('monthlyExpenseSummary');
  const pageInfo = document.getElementById('pageInfoMonthly');
  const prevPageBtn = document.getElementById('prevPageMonthly');
  const nextPageBtn = document.getElementById('nextPageMonthly');
  container.innerHTML = '';

  if (!data || data.error || !Array.isArray(data) || data.length === 0) {
    container.innerHTML = '<div>Không có giao dịch trong tháng này</div>';
    summaryContainer.innerHTML = `
      <div class="stat-box income"><div class="title">Tổng thu nhập</div><div class="amount no-data">Không có<br>dữ liệu</div></div>
      <div class="stat-box expense"><div class="title">Tổng chi tiêu</div><div class="amount no-data">Không có<br>dữ liệu</div></div>
      <div class="stat-box balance"><div class="title">Số dư</div><div class="amount no-data">Không có<br>dữ liệu</div></div>
    `;
    pageInfo.textContent = '';
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;
    return;
  }

  let totalIncome = 0, totalExpense = 0;
  data.forEach(item => {
    if (item.type === 'Thu nhập') totalIncome += item.amount;
    else if (item.type === 'Chi tiêu') totalExpense += item.amount;
  });
  const balance = totalIncome - totalExpense;

  summaryContainer.innerHTML = `
    <div class="stat-box income"><div class="title">Tổng thu nhập</div><div class="amount">${totalIncome.toLocaleString('vi-VN')}đ</div></div>
    <div class="stat-box expense"><div class="title">Tổng chi tiêu</div><div class="amount">${totalExpense.toLocaleString('vi-VN')}đ</div></div>
    <div class="stat-box balance"><div class="title">Số dư</div><div class="amount">${balance.toLocaleString('vi-VN')}đ</div></div>
  `;

  const totalPages = Math.ceil(data.length / expensesPerPage);
  const startIndex = (currentPageMonthly - 1) * expensesPerPage;
  const endIndex = startIndex + expensesPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

  paginatedData.forEach((item, index) => {
    const transactionBox = document.createElement('div');
    transactionBox.className = 'transaction-box';
    const amountColor = item.type === 'Thu nhập' ? 'var(--income-color)' : 'var(--expense-color)';
    const typeClass = item.type === 'Thu nhập' ? 'income' : 'expense';
    const transactionNumber = startIndex + index + 1;
    transactionBox.innerHTML = `
      <div class="layer-container" style="position: relative;">
        <div class="layer-top" style="position: absolute; top: 0; right: 0;">
          <div class="number">Giao dịch thứ: ${transactionNumber}</div>
          <div class="id">Mã giao dịch: ${item.id}</div>
        </div>
        <div class="layer-bottom" style="width: 100%;">
          <div class="date">${formatDate(item.date)}</div>
          <div class="amount" style="color: ${amountColor}; font-size: 1.4rem;">${item.amount.toLocaleString('vi-VN')}đ</div>
          <div class="content">Nội dung: ${item.content}${item.note ? ` (${item.note})` : ''}</div>
          <div class="type ${typeClass}">Phân loại: ${item.type}</div>
          <div class="category">Phân loại chi tiết: ${item.category}</div>
        </div>
      </div>
      <div style="margin-top: 0.5rem;">
        <button class="edit-btn edit" data-id="${item.id}">Sửa</button>
        <button class="delete-btn delete" data-id="${item.id}">Xóa</button>
      </div>
    `;
    container.appendChild(transactionBox);
  });

  pageInfo.textContent = `Trang ${currentPageMonthly} / ${totalPages}`;
  prevPageBtn.disabled = currentPageMonthly === 1;
  nextPageBtn.disabled = currentPageMonthly === totalPages;

  document.querySelectorAll('.edit-btn').forEach(button => {
    const transactionId = button.getAttribute('data-id');
    const transaction = data.find(item => String(item.id) === String(transactionId));
    if (!transaction) return console.error(`Không tìm thấy giao dịch với ID: ${transactionId}`);
    button.addEventListener('click', () => openEditForm(transaction));
  });

  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', () => deleteTransaction(button.getAttribute('data-id')));
  });
}

/* ==========================================================================
   9. Tab 6: Tìm kiếm giao dịch (Search Transactions Tab)
   ========================================================================== */
async function populateSearchCategories() {
  const categorySelect = document.getElementById('searchCategory');
  const categories = await fetchCategories();
  categorySelect.innerHTML = '<option value="">Tất cả</option>';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

window.searchTransactions = async function() {
  const month = document.getElementById('searchMonth').value;
  const content = document.getElementById('searchContent').value.trim();
  let amount = document.getElementById('searchAmount').value;
  amount = amount ? parseNumber(amount).toString() : '';
  const category = document.getElementById('searchCategory').value;
  const year = new Date().getFullYear();

  if (!month && !content && !amount && !category) return showToast("Vui lòng nhập ít nhất một tiêu chí!", "warning");

  const cacheKey = `${year}-${month || 'all'}-${content || ''}-${amount || ''}-${category || ''}`;
  if (cachedSearchResults && cachedSearchResults.cacheKey === cacheKey) {
    displaySearchResults(cachedSearchResults.transactions);
    return;
  }

  showLoading(true, 'tab6');
  try {
    let targetUrl = `${apiUrl}?action=searchTransactions&sheetId=${sheetId}&page=${currentPageSearch}&limit=${searchPerPage}`;
    if (month) targetUrl += `&month=${month}&year=${year}`;
    if (content) targetUrl += `&content=${encodeURIComponent(content)}`;
    if (amount) targetUrl += `&amount=${encodeURIComponent(amount)}`;
    if (category) targetUrl += `&category=${encodeURIComponent(category)}`;

    const finalUrl = proxyUrl + encodeURIComponent(targetUrl);
    const response = await fetch(finalUrl);
    const searchData = await response.json();
    if (searchData.error) throw new Error(searchData.error);

    cachedSearchResults = {
      transactions: searchData.transactions || [],
      totalTransactions: searchData.totalTransactions || 0,
      totalPages: searchData.totalPages || 1,
      currentPage: searchData.currentPage || 1,
      cacheKey
    };
    currentPageSearch = searchData.currentPage || 1;
    displaySearchResults(searchData.transactions);
  } catch (error) {
    showToast("Lỗi khi tìm kiếm: " + error.message, "error");
    displaySearchResults({ error: true });
  } finally {
    showLoading(false, 'tab6');
  }
};

function displaySearchResults(data) {
  const container = document.getElementById('searchResultsContainer');
  const pageInfo = document.getElementById('pageInfoSearch');
  const prevPageBtn = document.getElementById('prevPageSearch');
  const nextPageBtn = document.getElementById('nextPageSearch');
  container.innerHTML = '';

  if (!data || data.error || !Array.isArray(data) || data.length === 0) {
    container.innerHTML = '<div>Không tìm thấy giao dịch</div>';
    pageInfo.textContent = '';
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;
    return;
  }

  const totalTransactions = cachedSearchResults?.totalTransactions || data.length;
  container.innerHTML = `<div class="notification">Tìm thấy ${totalTransactions} giao dịch</div>`;

  const totalPages = cachedSearchResults?.totalPages || Math.ceil(totalTransactions / searchPerPage);
  const startIndex = (currentPageSearch - 1) * searchPerPage;
  const endIndex = startIndex + searchPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

  paginatedData.forEach((item, index) => {
    const transactionBox = document.createElement('div');
    transactionBox.className = 'transaction-box';
    const amountColor = item.type === 'Thu nhập' ? 'var(--income-color)' : 'var(--expense-color)';
    const typeClass = item.type === 'Thu nhập' ? 'income' : 'expense';
    const transactionNumber = startIndex + index + 1;
    transactionBox.innerHTML = `
      <div class="layer-container" style="position: relative;">
        <div class="layer-top" style="position: absolute; top: 0; right: 0;">
          <div class="number">Giao dịch thứ: ${transactionNumber}</div>
          <div class="id">Mã giao dịch: ${item.id}</div>
        </div>
        <div class="layer-bottom" style="width: 100%;">
          <div class="date">${formatDate(item.date)}</div>
          <div class="amount" style="color: ${amountColor}; font-size: 1.4rem;">${item.amount.toLocaleString('vi-VN')}đ</div>
          <div class="content">Nội dung: ${item.content}${item.note ? ` (${item.note})` : ''}</div>
          <div class="type ${typeClass}">Phân loại: ${item.type}</div>
          <div class="category">Phân loại chi tiết: ${item.category}</div>
        </div>
      </div>
      <div style="margin-top: 0.5rem;">
        <button class="edit-btn edit" data-id="${item.id}">Sửa</button>
        <button class="delete-btn delete" data-id="${item.id}">Xóa</button>
      </div>
    `;
    container.appendChild(transactionBox);
  });

  pageInfo.textContent = `Trang ${currentPageSearch} / ${totalPages}`;
  prevPageBtn.disabled = currentPageSearch === 1;
  nextPageBtn.disabled = currentPageSearch >= totalPages;

  document.querySelectorAll('.edit-btn').forEach(button => {
    const transactionId = button.getAttribute('data-id');
    const transaction = data.find(item => String(item.id) === String(transactionId));
    if (!transaction) return console.error(`Không tìm thấy giao dịch với ID: ${transactionId}`);
    button.addEventListener('click', () => openEditForm(transaction));
  });

  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', () => deleteTransaction(button.getAttribute('data-id')));
  });
}

/* ==========================================================================
   10. Tab 7: Quản lý từ khóa (Keywords Tab)
   ========================================================================== */
window.fetchKeywords = async function() {
  showLoading(true, 'tab7');
  try {
    const targetUrl = `${apiUrl}?action=getKeywords&sheetId=${sheetId}`;
    const finalUrl = proxyUrl + encodeURIComponent(targetUrl);
    const response = await fetch(finalUrl);
    const keywordsData = await response.json();
    if (keywordsData.error) throw new Error(keywordsData.error);
    cachedKeywords = keywordsData;
    displayKeywords(keywordsData);
  } catch (error) {
    showToast("Lỗi khi lấy từ khóa: " + error.message, "error");
    displayKeywords({ error: true });
  } finally {
    showLoading(false, 'tab7');
  }
};

function displayKeywords(data) {
  const container = document.getElementById('keywordsContainer');
  container.innerHTML = '';

  if (!data || data.error || !Array.isArray(data) || data.length === 0) {
    container.innerHTML = '<div class="notification">Không có từ khóa</div>';
    return;
  }

  data.forEach(item => {
    const keywordBox = document.createElement('div');
    keywordBox.className = 'keyword-box';
    const keywordCount = item.keywords ? item.keywords.split(',').length : 0;
    keywordBox.innerHTML = `
      <div class="category">${item.category} (${keywordCount} từ khóa)</div>
      <div class="keywords"><span style="font-weight: bold;">Từ khóa:</span> ${item.keywords}</div>
      <button class="delete-btn" onclick="window.deleteKeyword('${item.category}', '${item.keywords.split(', ')[0]}')">Xóa</button>
    `;
    container.appendChild(keywordBox);
  });
}

async function populateKeywordCategories() {
  const categorySelect = document.getElementById('keywordCategory');
  const categories = await fetchCategories();
  categorySelect.innerHTML = '<option value="">Chọn phân loại</option>';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

window.addKeyword = async function() {
  const category = document.getElementById('keywordCategory').value;
  const keywordsInput = document.getElementById('keywordInput').value.trim();

  if (!category) return showToast("Vui lòng chọn phân loại!", "warning");
  if (!keywordsInput) return showToast("Vui lòng nhập từ khóa!", "warning");

  const keywordsArray = keywordsInput.split(',').map(keyword => keyword.trim()).filter(keyword => keyword);
  const formattedKeywords = keywordsArray.join(', ');

  showLoading(true, 'tab7');
  try {
    const finalUrl = proxyUrl + encodeURIComponent(apiUrl);
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addKeyword',
        category: category,
        keywords: formattedKeywords,
        sheetId: sheetId
      })
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    showToast("Thêm từ khóa thành công!", "success");
    document.getElementById('keywordInput').value = '';
    await window.fetchKeywords();
  } catch (error) {
    showToast("Lỗi khi thêm từ khóa: " + error.message, "error");
  } finally {
    showLoading(false, 'tab7');
  }
};

window.deleteKeyword = async function(category, keyword) {
  if (!category || !keyword) return showToast("Vui lòng chọn danh mục và từ khóa!", "warning");

  showLoading(true, 'tab7');
  try {
    const finalUrl = proxyUrl + encodeURIComponent(apiUrl);
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'deleteKeyword',
        category: category,
        keyword: keyword,
        sheetId: sheetId
      })
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    showToast("Xóa từ khóa thành công!", "success");
    document.getElementById('keywordInput').value = '';
    await window.fetchKeywords();
  } catch (error) {
    showToast("Lỗi khi xóa từ khóa: " + error.message, "error");
  } finally {
    showLoading(false, 'tab7');
  }
};

/* ==========================================================================
   11. Khởi tạo ứng dụng (Application Initialization)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', function() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => window.openTab(item.getAttribute('data-tab')));
  });

  document.getElementById('fetchDataBtn').addEventListener('click', window.fetchData);
  document.getElementById('fetchMonthlyDataBtn').addEventListener('click', window.fetchMonthlyData);
  document.getElementById('fetchTransactionsBtn').addEventListener('click', window.fetchTransactions);
  document.getElementById('addTransactionBtn').addEventListener('click', openAddForm);
  document.getElementById('fetchMonthlyExpensesBtn').addEventListener('click', window.fetchMonthlyExpenses);
  document.getElementById('searchTransactionsBtn').addEventListener('click', window.searchTransactions);
  document.getElementById('fetchKeywordsBtn').addEventListener('click', window.fetchKeywords);
  document.getElementById('addKeywordBtn').addEventListener('click', window.addKeyword);
  document.getElementById('deleteKeywordBtn').addEventListener('click', () => window.deleteKeyword(
    document.getElementById('keywordCategory').value,
    document.getElementById('keywordInput').value.trim()
  ));

  document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      window.fetchTransactions();
    }
  });
  document.getElementById('nextPage').addEventListener('click', () => {
    const data = cachedTransactions?.data || [];
    const totalPages = Math.ceil(data.length / transactionsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      window.fetchTransactions();
    }
  });
  document.getElementById('prevPageMonthly').addEventListener('click', () => {
    if (currentPageMonthly > 1) {
      currentPageMonthly--;
      window.fetchMonthlyExpenses();
    }
  });
  document.getElementById('nextPageMonthly').addEventListener('click', () => {
    const data = cachedMonthlyExpenses?.data || [];
    const totalPages = Math.ceil(data.length / expensesPerPage);
    if (currentPageMonthly < totalPages) {
      currentPageMonthly++;
      window.fetchMonthlyExpenses();
    }
  });
  document.getElementById('prevPageSearch').addEventListener('click', () => {
    if (currentPageSearch > 1) {
      currentPageSearch--;
      window.searchTransactions();
    }
  });
  document.getElementById('nextPageSearch').addEventListener('click', () => {
    const totalPages = cachedSearchResults?.totalPages || 1;
    if (currentPageSearch < totalPages) {
      currentPageSearch++;
      window.searchTransactions();
    }
  });

  const currentMonth = new Date().getMonth() + 1;
  const startMonthInput = document.getElementById('startMonth');
  const endMonthInput = document.getElementById('endMonth');
  if (startMonthInput && endMonthInput) {
    startMonthInput.value = 1;
    endMonthInput.value = currentMonth;
  }

  const expenseMonthInput = document.getElementById('expenseMonth');
  if (expenseMonthInput) expenseMonthInput.value = currentMonth;

  const searchAmountInput = document.getElementById('searchAmount');
  if (searchAmountInput) {
    searchAmountInput.addEventListener('input', function() {
      const cursorPosition = this.selectionStart;
      const oldLength = this.value.length;
      this.value = formatNumberWithCommas(this.value);
      const newLength = this.value.length;
      this.selectionStart = this.selectionEnd = cursorPosition + (newLength - oldLength);
    });
    searchAmountInput.addEventListener('keypress', function(e) {
      if (!/[0-9]/.test(e.key)) e.preventDefault();
    });
  }

  const today = new Date();
  const formattedToday = formatDateToYYYYMMDD(today);
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const formattedFirstDay = formatDateToYYYYMMDD(firstDayOfMonth);

  const transactionDateInput = document.getElementById('transactionDate');
  if (transactionDateInput) transactionDateInput.value = formattedToday;

  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  if (startDateInput && endDateInput) {
    startDateInput.value = formattedFirstDay;
    endDateInput.value = formattedToday;
  }

  populateSearchCategories();
  populateKeywordCategories();
  window.openTab('tab1');
});
