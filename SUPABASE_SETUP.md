# 🚀 Panduan Setup Supabase untuk Sales Tracker

Berikut adalah langkah-langkah untuk mengkonfigurasi Supabase sebagai backend untuk aplikasi Sales Tracker kamu.

## 📋 Prasyarat
- Akun Supabase (gratis di https://supabase.com)
- Project Supabase URL: `https://mcepiftcywdaatnchfbc.supabase.co`

## 🔧 Langkah-langkah Setup

### 1. Dapatkan Anon Key dari Supabase Dashboard

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project `mcepiftcywdaatnchfbc`
3. Go to **Settings** → **API**
4. Copy **anon public key** (bukan service_role key!)
5. Key akan terlihat seperti: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 2. Update Konfigurasi di script.js

Buka file `script.js` dan pastikan bagian ini sudah terisi:

```javascript
const SUPABASE_ANON_KEY = 'sb_publishable_lVwOfWnJxZn6NB03yEEzaQ_DGlHT2UM'; // Sudah terisi
```

Status saat ini: ✅ **Sudah terkonfigurasi!**

### 3. Buat Tabel di Supabase (LANGKAH TERAKHIR!)

**Ini satu-satunya yang perlu kamu lakukan!** Konfigurasi sudah siap.

1. Di Supabase Dashboard, go to **SQL Editor**
2. Jalankan perintah SQL berikut:

```sql
-- Buat tabel transactions
CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT PRIMARY KEY,
    product TEXT NOT NULL,
    platform TEXT NOT NULL,
    cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
    sellPrice DECIMAL(15, 2) NOT NULL DEFAULT 0,
    profit DECIMAL(15, 2) GENERATED ALWAYS AS (sellPrice - cost) STORED,
    notes TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buat index untuk performa
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);

-- Enable Row Level Security (opsional, untuk keamanan)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Buat policy untuk membolehkan akses publik (untuk aplikasi pribadi)
CREATE POLICY "Enable all access for all users" 
ON transactions FOR ALL 
USING (true) 
WITH CHECK (true);
```

### 4. Test Koneksi

1. Buka file `index.html` di browser
2. Lihat bagian **Backup & Sync** di bawah form
3. Status seharusnya berubah menjadi: ✅ Terhubung ke Supabase
4. Jika masih ❌ Tidak terhubung, cek lagi konfigurasi anon key

### 5. Sync Data

Setelah terhubung:

1. **Auto-sync**: Setiap transaksi baru akan otomatis di-sync ke Supabase
2. **Manual sync**: Klik tombol "Sync ke Cloud" untuk sync manual
3. **Load data**: Saat pertama kali dibuka, data akan di-load dari Supabase (jika ada)

## 🔒 Keamanan (Opsional)

Untuk aplikasi pribadi, konfigurasi di atas sudah cukup aman. Tapi jika ingin lebih aman:

### Opsi 1: Gunakan Supabase Auth
1. Enable Supabase Authentication di dashboard
2. Update code untuk mengimplementasikan login
3. Buat policy yang lebih ketat di RLS

### Opsi 2: Batasi IP Address
1. Di Supabase Dashboard → Settings → API
2. Add IP address kamu ke allowed IPs

## 📊 Fitur yang Tersedia

✅ **Auto-sync**: Transaksi otomatis tersimpan ke cloud
✅ **Multi-device**: Data bisa diakses dari berbagai device
✅ **Backup lokal**: Data tetap tersimpan di localStorage sebagai backup
✅ **Export/Import**: Bisa backup data ke file JSON
✅ **Real-time**: Data langsung tersimpan tanpa reload

## 🛠️ Troubleshooting

### Masalah: "Tidak terhubung ke Supabase"
**Solusi:**
- Cek anon key sudah benar
- Pastikan project URL benar
- Buka console browser (F12) untuk lihat error

### Masalah: Data tidak muncul di device lain
**Solusi:**
- Pastikan kedua device menggunakan anon key yang sama
- Cek koneksi internet
- Refresh halaman untuk load data terbaru

### Masalah: "Tabel transactions belum dibuat"
**Solusi:**
- Ini normal! Kamu hanya perlu membuat tabel di Supabase
- Ikuti langkah **#3** di panduan di atas
- Setelah tabel dibuat, refresh halaman

### Masalah: Error saat sync
**Solusi:**
- Cek tabel `transactions` sudah dibuat
- Pastikan kolom-kolom sesuai dengan schema
- Cek Supabase logs di dashboard

## 💡 Tips

1. **Backup berkala**: Gunakan tombol "Export JSON" untuk backup lokal
2. **Test dulu**: Coba tambah transaksi test untuk memastikan sync berjalan
3. **Monitor**: Cek Supabase dashboard untuk memantau penggunaan (gratis tier cukup untuk pemakaian pribadi)

## 📞 Bantuan

Jika mengalami masalah:
- Cek console browser (F12) untuk error message
- Pastikan internet connection stable
- Verify Supabase project status di dashboard

---

**Selamat menggunakan Sales Tracker dengan Supabase! 🎉**