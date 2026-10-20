# Al-Fath — Offline Pharmacy Management System

A 100% offline desktop pharmacy management application built with **Flutter (Windows)** and local **SQLite (via Drift)**, supporting English and Arabic (RTL).

---

## Key Features

- **100% Offline Native Desktop**: Operates without external database servers (PostgreSQL/Node.js). Powered by embedded SQLite via Drift with WAL mode.
- **FEFO Inventory & Dispensing**: Automated First Expired, First Out stock deduction for both over-the-counter POS and doctor prescriptions.
- **Master Data**: Medicines, categories, medicine packages, suppliers (PBF), and patients.
- **Purchases & Receiving**: Purchase orders (PO) and partial/full goods receipt with batch numbers and expiration tracking.
- **Prescription Workflow**: Doctor prescription recording, partial dispensing, and direct conversion to POS sales.
- **Reports & Analytics**: Real-time sales summary, accurate batch-level COGS, gross margin %, top selling medicines, and Excel (.xlsx) / PDF receipt export.
- **Multi-Language (English & Arabic RTL)**: Instant language switching toggle (🇬🇧 English / 🇸🇦 العربية) on setup, login, and sidebar.

---

## Tech Stack

- **Framework**: Flutter 3.x (Windows Desktop & Android ARM64)
- **Database**: Drift 2.x (SQLite with sqlite3_flutter_libs)
- **State Management**: Riverpod 2.x
- **Routing**: GoRouter
- **Design**: Material Design 3 (M3)
- **Security**: BCrypt password hashing

---

## Getting Started

### Prerequisites

- Flutter SDK (^3.11.0 or latest stable)
- Visual Studio with C++ desktop development workload (for Windows native compilation)

### Setup & Run

```bash
cd pharmacy_flutter
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run -d windows
```

### Run Tests

```bash
cd pharmacy_flutter
flutter test
```
