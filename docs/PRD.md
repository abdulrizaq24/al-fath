# Product Requirements Document (PRD)
## Offline Pharmacy Management System (Desktop - Windows)

---

## 1. Executive Summary & Vision
Aplikasi Sistem Manajemen Apotek (Pharmacy Management System) yang sebelumnya berupa arsitektur 3-tier (Electron + Next.js 16 + Express.js + PostgreSQL) dimigrasikan menjadi **satu aplikasi desktop monolitik native berbasis Flutter (Windows)** yang berjalan **100% offline** menggunakan database lokal **SQLite (via Drift)**.

### Tujuan Utama
1. **Zero External Dependency**: Tidak memerlukan instalasi Node.js, PostgreSQL Server, atau web server lokal. Cukup 1 file installer / executable `.exe`.
2. **High Performance & Responsive**: Waktu startup instan, penggunaan memori rendah (< 150 MB vs Electron > 500 MB).
3. **Data Integrity & Safety**: Transaksi stok berbasis SQLite ACID yang menjamin tidak ada stok minus atau selisih data.
4. **Modern UI/UX**: Tampilan berbasis **Material Design 3 (M3)** yang responsif untuk layar desktop kasir dan admin apotek.

---

## 2. User Roles & Permissions

| Role | Akses & Wewenang |
|------|-------------------|
| **ADMIN** | Akses penuh ke seluruh sistem: manajemen user/kasir, master obat & kategori, supplier, transaksi pembelian & penerimaan, penjualan kasir, resep dokter, penyesuaian stok, serta laporan finansial & laba-rugi lengkap. |
| **PHARMACIST** (Kasir / Petugas) | Terbatas pada operasional harian: melihat master obat, melakukan transaksi kasir (POS), melayani resep pasien, dan melihat ringkasan penjualan harian milik sendiri. Tidak dapat mengubah harga, supplier, atau mengakses laporan margin laba. |

---

## 3. Fitur Inti & Spesifikasi Fungsional

### 3.1. Autentikasi & Sesi Offline
- Autentikasi lokal berbasis username & password (password di-hash menggunakan algoritma `bcrypt`).
- Manajemen sesi berbasis in-memory state (Riverpod).
- Setup wizard saat pertama kali aplikasi dijalankan jika database masih kosong (membuat akun Admin dan data apotek pertama kali).

### 3.2. Master Data
- **Kategori Obat**: Nama, deskripsi, status aktif/non-aktif.
- **Obat (Medicines)**:
  - Kode/Barcode (EAN-13, custom barcode).
  - Nama obat, nama generik, merk dagang, pabrikan.
  - Bentuk sediaan (Tablet, Sirup, Kapsul, Injeksi, Salep, dll).
  - Kekuatan dosis (500mg, 10mg/5ml, dll).
  - Satuan dasar (Strip, Botol, Tube, Box, Tablet).
  - Status regulasi: `OTC` (Obat Bebas), `PRESCRIPTION` (Obat Keras/Resep), `CONTROLLED` (Narkotika/Psikotropika).
  - Harga jual dasar.
  - Batas minimum stok (*Reorder Level*).
- **Supplier (PBF / Distributor)**: Nama PBF, PIC/Contact person, nomor telepon, email, alamat, catatan, status aktif.
- **Pasien**: Nomor rekam medis/pasien, nama lengkap, jenis kelamin, tanggal lahir, no. telepon, alamat, catatan alergi/medis.

### 3.3. Pengadaan & Penerimaan Barang (Purchases)
- **Purchase Order (PO)**:
  - Pemilihan supplier, nomor PO, tanggal estimasi, daftar obat beserta kuantitas pesanan dan harga beli estimasi.
  - Status PO: `DRAFT`, `ORDERED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`.
- **Penerimaan Barang (Goods Receipt)**:
  - Input nomor surat jalan / faktur supplier.
  - Input kuantitas fisik yang diterima (validasi: tidak boleh melebihi sisa pesanan).
  - Input **Nomor Batch** dan **Tanggal Kadaluarsa (Expiry Date)** untuk setiap obat yang datang.
  - Otomatis mencatat mutasi stok masuk (`PURCHASE`) dan menambah stok pada tabel batch.

### 3.4. Kasir Penjualan (POS / Sales)
- Input cepat menggunakan Barcode Scanner atau pencarian nama/generik obat.
- Algoritma **FEFO (First Expired, First Out)** otomatis memilih batch obat dengan tanggal kadaluarsa terdekat.
- Diskon per-item (nominal atau persentase) dan diskon total faktur.
- Perhitungan pajak (PPN opsional).
- Metode Pembayaran: Tunai (*Cash*), Kartu Debit/Kredit, Transfer Bank, QRIS/Mobile Payment.
- Perhitungan uang kembali (*change*) untuk pembayaran tunai.
- Cetak struk kasir (*thermal receipt 58mm/80mm*) dan faktur penjualan format A4/PDF.

### 3.5. Pelayanan Resep Dokter (Prescriptions)
- Pencatatan resep masuk: Pasien, dokter peresep, nomor resep, tanggal, daftar obat, signa/aturan pakai, catatan.
- Status Resep: `PENDING` -> `PARTIALLY_DISPENSED` -> `DISPENSED` / `CANCELLED`.
- Fitur *Dispensing*: Mengambil stok dari batch obat via FEFO, mencatat kuantitas terlayani, dan mengonversi resep menjadi transaksi penjualan.

### 3.6. Manajemen Inventaris & Mutasi Stok
- Monitoring stok per batch dan total stok per obat.
- Indikator peringatan dini (*Early Warning*):
  - Stok kritis: Stok fisik $\le$ *Reorder Level*.
  - Mendekati kadaluarsa: Obat expired dalam 30, 60, atau 90 hari ke depan.
  - Sudah kadaluarsa: Obat melewati tanggal kadaluarsa (otomatis diblokir dari penjualan).
- Penyesuaian Stok (*Stock Opname* / *Adjustment*): Koreksi kuantitas dengan alasan (Rusak, Hilang, Kadaluarsa, Salah Input).
- Log Mutasi Lengkap (*Audit Trail*): Mencatat setiap pergerakan stok keluar/masuk dengan referensi dokumen terkait.

### 3.7. Laporan & Analitik Finansial
- Ringkasan Penjualan: Omzet kotor, total diskon, total pajak, pendapatan bersih.
- Analisis Profit & Margin:
  - **COGS (Cost of Goods Sold)** dihitung akurat berdasarkan harga beli asli per-batch yang terjual.
  - Laba kotor (*Gross Profit*) dan Margin (%) sebelum pajak.
- Laporan Obat Terlaris (*Fast Moving* vs *Slow Moving*).
- Laporan Pembelian per Supplier.
- Ekspor data laporan ke format **Excel (.xlsx)** dan **PDF**.

---

## 4. Non-Functional Requirements (NFR)
1. **Platform**: Windows 10 & 11 (64-bit).
2. **Kinerja Offline**: 100% fungsional tanpa jaringan internet.
3. **Database Concurrency**: Menggunakan SQLite WAL mode (*Write-Ahead Logging*) untuk performa baca-tulis optimal.
4. **Keyboard Friendly**: Shortcut navigasi kasir (F1: Cari obat, F2: Diskon, F10: Bayar, Esc: Batal).
5. **Bahasa (i18n)**: Dukungan multi-bahasa (Bahasa Indonesia & English, siap diekspansi ke Arabic RTL).
