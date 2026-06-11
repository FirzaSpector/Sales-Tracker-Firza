// Supabase Configuration
const SUPABASE_URL = 'https://mcepiftcywdaatnchfbc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lVwOfWnJxZn6NB03yEEzaQ_DGlHT2UM'; // Ganti dengan anon key dari Supabase dashboard
const SUPABASE_KEY_PLACEHOLDER = 'YOUR_ANON_KEY_HERE';

// Initialize Supabase client (use window.supabase — local name must not shadow the CDN global)
let supabaseClient = null;
let isSupabaseConfigured = false;

try {
    const hasValidKey = SUPABASE_ANON_KEY
        && SUPABASE_ANON_KEY !== SUPABASE_KEY_PLACEHOLDER
        && typeof window.supabase?.createClient === 'function';

    if (hasValidKey) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        isSupabaseConfigured = true;
        console.log('✅ Supabase configured successfully');
    } else {
        console.warn('⚠️ Supabase not configured - using localStorage only');
    }
} catch (error) {
    console.error('❌ Supabase initialization failed:', error);
}

// Local transactions for fallback
let transactions = [];
try {
    transactions = JSON.parse(localStorage.getItem('salesTransactions')) || [];
} catch (error) {
    console.warn('⚠️ Invalid localStorage data, starting fresh:', error);
    localStorage.removeItem('salesTransactions');
}
const TARGET_AMOUNT = 100000000;

const form = document.querySelector('.form-grid');
const progressBarFill = document.querySelector('.progress-fill');
const progressTrack = document.querySelector('.progress-track');
const goalPercent = document.querySelector('.goal-percent');
const collectedAmount = document.querySelector('.collected');
const remainingAmount = document.querySelector('.remaining');
const statValues = document.querySelectorAll('.stat-value');
const toast = document.getElementById('toast');

async function init() {
    console.log('🚀 Initializing app...');

    updateStats();
    renderTransactions();

    // Load cloud data in the background — must not block the form
    loadFromSupabase().then(() => {
        updateStats();
        renderTransactions();
    });

    console.log('✅ App initialized successfully');
}

function setupEventListeners() {
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn && !submitBtn.dataset.bound) {
        submitBtn.dataset.bound = 'true';
        submitBtn.addEventListener('click', handleAddTransaction);
        console.log('✅ Event listener attached to submit button');
    } else if (!submitBtn) {
        console.error('❌ Submit button not found!');
    }
}

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2800);
}

function handleAddTransaction() {
    console.log('🔄 handleAddTransaction called');
    
    const product = document.getElementById('product').value.trim();
    const platform = document.getElementById('platform').value;
    const cost = parseFloat(document.getElementById('cost').value) || 0;
    const sellPrice = parseFloat(document.getElementById('sellPrice').value) || 0;
    const notes = document.getElementById('notes').value.trim();

    console.log('📝 Form data:', { product, platform, cost, sellPrice, notes });

    if (!product) {
        showToast('Mohon isi nama barang', 'error');
        document.getElementById('product').focus();
        return;
    }

    if (sellPrice <= 0) {
        showToast('Mohon isi harga jual yang valid', 'error');
        document.getElementById('sellPrice').focus();
        return;
    }

    const transaction = {
        id: Date.now(),
        product,
        platform,
        cost,
        sellPrice,
        profit: sellPrice - cost,
        notes,
        date: new Date().toISOString()
    };

    console.log('✨ Creating transaction:', transaction);
    
    transactions.push(transaction);
    console.log('📊 Transactions array size:', transactions.length);
    
    saveTransactions();
    updateStats();
    renderTransactions();

    document.getElementById('product').value = '';
    document.getElementById('cost').value = '';
    document.getElementById('sellPrice').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('platform').selectedIndex = 0;

    showToast('Penjualan berhasil dicatat');
    console.log('✅ Transaction completed successfully');
}

function deleteTransaction(id) {
    if (confirm('Hapus transaksi ini?')) {
        // Delete from local array
        transactions = transactions.filter(t => t.id !== id);
        
        // Delete from Supabase if configured (async, doesn't block)
        if (isSupabaseConfigured && supabaseClient) {
            supabaseClient
                .from('transactions')
                .delete()
                .eq('id', id)
                .then(({ error }) => {
                    if (error) {
                        console.error('❌ Failed to delete from Supabase:', error);
                    } else {
                        console.log('✅ Transaction deleted from Supabase');
                    }
                })
                .catch(error => {
                    console.error('❌ Supabase delete error:', error);
                });
        }
        
        saveTransactions();
        updateStats();
        renderTransactions();
        showToast('Transaksi dihapus');
    }
}

async function saveTransactions() {
    // Always save to localStorage as backup (synchronous)
    localStorage.setItem('salesTransactions', JSON.stringify(transactions));
    
    // Sync to Supabase if configured (async, doesn't block)
    if (isSupabaseConfigured && supabaseClient) {
        // Don't await - let it run in background
        supabaseClient
            .from('transactions')
            .upsert(transactions, {
                onConflict: 'id'
            })
            .then(({ error }) => {
                if (error) {
                    console.error('❌ Failed to sync to Supabase:', error);
                } else {
                    console.log('✅ Transactions synced to Supabase');
                }
            })
            .catch(error => {
                console.error('❌ Supabase sync error:', error);
            });
    }
}

async function loadFromSupabase() {
    if (!isSupabaseConfigured || !supabaseClient) {
        console.log('⚠️ Supabase not configured, using localStorage');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });
        
        if (error) {
            console.error('❌ Error loading from Supabase:', error);
            return;
        }
        
        if (data && data.length > 0 && transactions.length === 0) {
            transactions = data;
            localStorage.setItem('salesTransactions', JSON.stringify(transactions));
            console.log(`✅ Loaded ${data.length} transactions from Supabase`);
        }
    } catch (error) {
        console.error('❌ Failed to load from Supabase:', error);
    }
}

function updateStats() {
    const totalTransactions = transactions.length;
    const totalCost = transactions.reduce((sum, t) => sum + t.cost, 0);
    const totalRevenue = transactions.reduce((sum, t) => sum + t.sellPrice, 0);
    const totalProfit = transactions.reduce((sum, t) => sum + t.profit, 0);

    statValues[0].textContent = totalTransactions;
    statValues[1].textContent = formatCurrency(totalCost);
    statValues[2].textContent = formatCompactCurrency(totalRevenue);
    statValues[3].textContent = formatCompactCurrency(totalProfit);

    const progress = (totalProfit / TARGET_AMOUNT) * 100;
    const percentage = Math.min(progress, 100).toFixed(1);

    progressBarFill.style.width = `${percentage}%`;
    goalPercent.textContent = `${percentage}%`;
    progressTrack.setAttribute('aria-valuenow', percentage);

    collectedAmount.textContent = formatCurrency(totalProfit);

    const remaining = Math.max(TARGET_AMOUNT - totalProfit, 0);
    remainingAmount.textContent = formatCurrency(remaining);
}

function renderTransactions() {
    let transactionsSection = document.querySelector('.transactions-section');

    if (!transactionsSection) {
        transactionsSection = document.createElement('section');
        transactionsSection.className = 'transactions-section';
        transactionsSection.innerHTML = `
            <div class="section-head">
                <h2 class="section-title">Riwayat transaksi</h2>
                <p class="section-desc">Semua penjualan yang sudah kamu catat.</p>
            </div>
            <ul class="transaction-list"></ul>
        `;
        document.querySelector('.container').appendChild(transactionsSection);
    }

    const transactionList = transactionsSection.querySelector('.transaction-list');

    if (transactions.length === 0) {
        transactionList.innerHTML = `
            <div class="empty-state">
                <svg class="empty-state-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                    <rect x="8" y="14" width="32" height="26" rx="3" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 20h32" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M18 10h12v4H18z" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <p>Belum ada transaksi</p>
                <p>Catat penjualan pertamamu di form di atas.</p>
            </div>
        `;
        return;
    }

    const sortedTransactions = [...transactions].reverse();

    transactionList.innerHTML = sortedTransactions.map(transaction => `
        <li class="transaction-item">
            <div class="transaction-info">
                <h3>${escapeHtml(transaction.product)}</h3>
                <div class="transaction-meta">
                    <span>${formatDate(transaction.date)}</span>
                    <span class="dot" aria-hidden="true"></span>
                    <span>Modal ${formatCurrency(transaction.cost)}</span>
                    <span class="dot" aria-hidden="true"></span>
                    <span>Jual ${formatCurrency(transaction.sellPrice)}</span>
                    ${transaction.notes ? `<span class="dot" aria-hidden="true"></span><span>${escapeHtml(transaction.notes)}</span>` : ''}
                </div>
            </div>
            <div class="transaction-profit">
                <div class="profit-amount">+${formatCompactCurrency(transaction.profit)}</div>
                <span class="platform-badge">${escapeHtml(transaction.platform)}</span>
            </div>
            <button class="delete-btn" onclick="deleteTransaction(${transaction.id})">Hapus</button>
        </li>
    `).join('');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatCompactCurrency(amount) {
    if (amount >= 1000000) {
        return 'Rp ' + (amount / 1000000).toFixed(1) + 'jt';
    }
    if (amount >= 1000) {
        return 'Rp ' + (amount / 1000).toFixed(0) + 'rb';
    }
    return formatCurrency(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.deleteTransaction = deleteTransaction;

// Export data to JSON file
function exportData() {
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Data berhasil di-export');
}

// Import data from JSON file
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                transactions = importedData;
                saveTransactions();
                updateStats();
                renderTransactions();
                showToast('Data berhasil di-import');
            } else {
                showToast('Format file tidak valid', 'error');
            }
        } catch (error) {
            showToast('Gagal membaca file', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

// Manual sync to Supabase
async function syncToSupabase() {
    if (!isSupabaseConfigured || !supabaseClient) {
        showToast('Supabase belum dikonfigurasi', 'error');
        return;
    }

    try {
        showToast('Men-sync data ke cloud...', 'info');
        await saveTransactions();
        showToast('✅ Data berhasil di-sync ke cloud!');
        updateSyncStatus(true);
    } catch (error) {
        console.error('Sync error:', error);
        showToast('❌ Gagal sync ke cloud', 'error');
        updateSyncStatus(false);
    }
}

// Update sync status UI
function updateSyncStatus(connected) {
    const syncStatus = document.getElementById('syncStatus');
    const syncStatusText = document.getElementById('syncStatusText');
    
    if (connected) {
        syncStatus.className = 'sync-status connected';
        syncStatusText.textContent = '✅ Terhubung ke Supabase';
    } else {
        syncStatus.className = 'sync-status disconnected';
        syncStatusText.textContent = '❌ Tidak terhubung ke Supabase';
    }
}

// Check Supabase connection on load
async function checkSupabaseConnection() {
    const syncStatus = document.getElementById('syncStatus');
    const syncStatusText = document.getElementById('syncStatusText');
    
    if (!isSupabaseConfigured || !supabaseClient) {
        syncStatus.className = 'sync-status disconnected';
        syncStatusText.textContent = '⚠️ Supabase belum dikonfigurasi (mode lokal)';
        return;
    }

    // Test actual connection to Supabase
    try {
        syncStatusText.textContent = '🔄 Memeriksa koneksi...';
        
        // Simple test query
        const { error } = await supabaseClient
            .from('transactions')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            throw error;
        }
        
        syncStatus.className = 'sync-status connected';
        syncStatusText.textContent = '✅ Terhubung ke Supabase';
        console.log('✅ Supabase connection verified');
    } catch (error) {
        console.error('❌ Supabase connection failed:', error);
        syncStatus.className = 'sync-status disconnected';
        syncStatusText.textContent = '❌ Gagal terhubung ke Supabase';
        
        // Jangan matikan isSupabaseConfigured jika ini hanya error sementara
        // Tapi beri tahu user
        if (error.code === '42P01') {
            syncStatusText.textContent = '❌ Tabel "transactions" belum dibuat';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkSupabaseConnection();
    init();
});
