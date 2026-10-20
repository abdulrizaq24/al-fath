# Database Schema Reference
## Drift (SQLite) — Full Table Definitions

Dokumen ini mendefinisikan seluruh tabel database yang akan diimplementasikan menggunakan **Drift** di Flutter. Mapping 1:1 dari Prisma schema yang sudah ada, dengan penyesuaian untuk SQLite.

---

## Konvensi

- **Primary Key**: UUID v4, generated di Dart (`uuid` package).
- **Monetary fields**: Disimpan sebagai `REAL` (double). Untuk presisi absolut, bisa dikonversi ke `INTEGER` (satuan sen).
- **Quantity fields**: `REAL` — mendukung pecahan (2.5 strip, 0.5 botol).
- **DateTime**: ISO 8601 text internally.
- **Enum**: Disimpan sebagai `INTEGER` index, di-mapping ke Dart enum via Drift `TypeConverter`.
- **Soft Delete**: Menggunakan kolom `isActive` (`BOOLEAN`), bukan hard delete.

---

## 1. Pharmacies

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| name | TEXT | NOT NULL | - |
| licenseNumber | TEXT | NULLABLE | - |
| address | TEXT | NULLABLE | - |
| phone | TEXT | NULLABLE | - |
| email | TEXT | NULLABLE | - |
| country | TEXT | NOT NULL | 'Indonesia' |
| currency | TEXT | NOT NULL | 'IDR' |
| timezone | TEXT | NULLABLE | - |
| logoUrl | TEXT | NULLABLE | - |
| createdAt | DATETIME | NOT NULL | now() |
| updatedAt | DATETIME | NOT NULL | now() |

---

## 2. Roles

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| name | INTEGER | NOT NULL, UNIQUE | RoleName enum |
| description | TEXT | NULLABLE | - |
| createdAt | DATETIME | NOT NULL | now() |
| updatedAt | DATETIME | NOT NULL | now() |

**RoleName Enum**: `ADMIN (0)`, `PHARMACIST (1)`

---

## 3. Users

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| pharmacyId | TEXT | FK → Pharmacies | - |
| roleId | TEXT | FK → Roles | - |
| name | TEXT | NOT NULL | - |
| username | TEXT | NOT NULL, UNIQUE | - |
| email | TEXT | NULLABLE | - |
| passwordHash | TEXT | NOT NULL | - |
| isActive | BOOLEAN | NOT NULL | true |
| lastLoginAt | DATETIME | NULLABLE | - |
| createdAt | DATETIME | NOT NULL | now() |
| updatedAt | DATETIME | NOT NULL | now() |

**Index**: `(pharmacyId)`, `(roleId)`

---

## 4. Categories

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| pharmacyId | TEXT | FK → Pharmacies | - |
| name | TEXT | NOT NULL | - |
| description | TEXT | NULLABLE | - |
| isActive | BOOLEAN | NOT NULL | true |
| createdAt | DATETIME | NOT NULL | now() |
| updatedAt | DATETIME | NOT NULL | now() |

**Unique**: `(pharmacyId, name)`

---

## 5. Medicines

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| pharmacyId | TEXT | FK → Pharmacies | - |
| categoryId | TEXT | FK → Categories | - |
| name | TEXT | NOT NULL | - |
| genericName | TEXT | NULLABLE | - |
| brandName | TEXT | NULLABLE | - |
| manufacturer | TEXT | NULLABLE | - |
| dosageForm | TEXT | NOT NULL | - |
| strength | TEXT | NULLABLE | - |
| baseUnit | TEXT | NOT NULL | - |
| prescriptionStatus | INTEGER | NOT NULL | ControlledStatus.OTC |
| sellingPrice | REAL | NOT NULL | - |
| reorderLevel | REAL | NOT NULL | 0 |
| barcode | TEXT | NULLABLE | - |
| isActive | BOOLEAN | NOT NULL | true |
| notes | TEXT | NULLABLE | - |
| createdAt | DATETIME | NOT NULL | now() |
| updatedAt | DATETIME | NOT NULL | now() |

**Index**: `(pharmacyId)`, `(categoryId)`, `(name)`, `(genericName)`, `(barcode)`

**ControlledStatus Enum**: `OTC (0)`, `PRESCRIPTION (1)`, `CONTROLLED (2)`

---

## 6. MedicinePackages

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| medicineId | TEXT | FK → Medicines | - |
| name | TEXT | NOT NULL | - |
| quantityInBaseUnits | REAL | NOT NULL | - |
| barcode | TEXT | NULLABLE | - |
| isDefault | BOOLEAN | NOT NULL | false |
| createdAt | DATETIME | NOT NULL | now() |
| updatedAt | DATETIME | NOT NULL | now() |

**Index**: `(medicineId)`, `(barcode)`

---

## 7. Batches

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| pharmacyId | TEXT | FK → Pharmacies | - |
| medicineId | TEXT | FK → Medicines | - |
| batchNumber | TEXT | NOT NULL | - |
| expiryDate | DATETIME | NOT NULL | - |
| purchasePrice | REAL | NOT NULL | - |
| receivedQuantity | REAL | NOT NULL | - |
| currentQuantity | REAL | NOT NULL | - |
| receivedAt | DATETIME | NOT NULL | now() |
| createdAt | DATETIME | NOT NULL | now() |
| updatedAt | DATETIME | NOT NULL | now() |

**Unique**: `(pharmacyId, medicineId, batchNumber)`
**Index**: `(pharmacyId)`, `(medicineId)`, `(expiryDate)`

---

## 8. Suppliers

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| pharmacyId | TEXT | FK → Pharmacies | - |
| name | TEXT | NOT NULL | - |
| contactPerson | TEXT | NULLABLE | - |
| phone | TEXT | NULLABLE | - |
| email | TEXT | NULLABLE | - |
| address | TEXT | NULLABLE | - |
| isActive | BOOLEAN | NOT NULL | true |
| notes | TEXT | NULLABLE | - |
| createdAt | DATETIME | NOT NULL | now() |
| updatedAt | DATETIME | NOT NULL | now() |

**Index**: `(pharmacyId)`, `(name)`

---

## 9. Purchases

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| pharmacyId | TEXT | FK → Pharmacies | - |
| supplierId | TEXT | FK → Suppliers | - |
| createdById | TEXT | FK → Users | - |
| purchaseNumber | TEXT | NOT NULL | - |
| status | INTEGER | NOT NULL | PurchaseStatus.DRAFT |
| purchaseDate | DATETIME | NOT NULL | now() |
| expectedDate | DATETIME | NULLABLE | - |
| totalAmount | REAL | NOT NULL | 0 |
| notes | TEXT | NULLABLE | - |
| createdAt | DATETIME | NOT NULL | now() |
| updatedAt | DATETIME | NOT NULL | now() |

**Unique**: `(pharmacyId, purchaseNumber)`
**Index**: `(pharmacyId)`, `(supplierId)`, `(status)`

**PurchaseStatus Enum**: `DRAFT (0)`, `ORDERED (1)`, `PARTIALLY_RECEIVED (2)`, `RECEIVED (3)`, `CANCELLED (4)`

---

## 10. PurchaseItems

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| purchaseId | TEXT | FK → Purchases | - |
| medicineId | TEXT | FK → Medicines | - |
| orderedQuantity | REAL | NOT NULL | - |
| unitCost | REAL | NOT NULL | - |
| totalCost | REAL | NOT NULL | - |
| createdAt | DATETIME | NOT NULL | now() |
| updatedAt | DATETIME | NOT NULL | now() |

**Index**: `(purchaseId)`, `(medicineId)`

---

## 11. PurchaseReceipts

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| pharmacyId | TEXT | FK → Pharmacies | - |
| purchaseId | TEXT | FK → Purchases | - |
| createdById | TEXT | FK → Users | - |
| receiptNumber | TEXT | NOT NULL | - |
| receivedAt | DATETIME | NOT NULL | now() |
| notes | TEXT | NULLABLE | - |
| createdAt | DATETIME | NOT NULL | now() |

**Unique**: `(pharmacyId, receiptNumber)`
**Index**: `(purchaseId)`

---

## 12. PurchaseReceiptItems

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| receiptId | TEXT | FK → PurchaseReceipts | - |
| purchaseItemId | TEXT | FK → PurchaseItems | - |
| batchId | TEXT | FK → Batches | - |
| quantityReceived | REAL | NOT NULL | - |
| unitCost | REAL | NOT NULL | - |
| createdAt | DATETIME | NOT NULL | now() |

**Index**: `(receiptId)`, `(purchaseItemId)`, `(batchId)`

---

## 13. Patients

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| pharmacyId | TEXT | FK → Pharmacies | - |
| patientNumber | TEXT | NOT NULL | - |
| firstName | TEXT | NOT NULL | - |
| lastName | TEXT | NULLABLE | - |
| dateOfBirth | DATETIME | NULLABLE | - |
| sex | TEXT | NULLABLE | - |
| phone | TEXT | NULLABLE | - |
| address | TEXT | NULLABLE | - |
| notes | TEXT | NULLABLE | - |
| createdAt | DATETIME | NOT NULL | now() |
| updatedAt | DATETIME | NOT NULL | now() |

**Unique**: `(pharmacyId, patientNumber)`
**Index**: `(pharmacyId)`, `(lastName)`

---

## 14. Prescriptions

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| pharmacyId | TEXT | FK → Pharmacies | - |
| patientId | TEXT | FK → Patients | - |
| createdById | TEXT | FK → Users | - |
| prescriptionNumber | TEXT | NOT NULL | - |
| prescriberName | TEXT | NOT NULL | - |
| prescriptionDate | DATETIME | NOT NULL | - |
| status | INTEGER | NOT NULL | PrescriptionStatus.PENDING |
| notes | TEXT | NULLABLE | - |
| createdAt | DATETIME | NOT NULL | now() |
| updatedAt | DATETIME | NOT NULL | now() |

**Unique**: `(pharmacyId, prescriptionNumber)`
**Index**: `(patientId)`, `(pharmacyId)`

**PrescriptionStatus Enum**: `PENDING (0)`, `PARTIALLY_DISPENSED (1)`, `DISPENSED (2)`, `CANCELLED (3)`

---

## 15. PrescriptionItems

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| prescriptionId | TEXT | FK → Prescriptions | - |
| medicineId | TEXT | FK → Medicines | - |
| quantityPrescribed | REAL | NOT NULL | - |
| quantityDispensed | REAL | NOT NULL | 0 |
| directions | TEXT | NULLABLE | - |
| notes | TEXT | NULLABLE | - |
| createdAt | DATETIME | NOT NULL | now() |
| updatedAt | DATETIME | NOT NULL | now() |

**Index**: `(prescriptionId)`, `(medicineId)`

---

## 16. Sales

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| pharmacyId | TEXT | FK → Pharmacies | - |
| patientId | TEXT | FK → Patients, NULLABLE | - |
| soldById | TEXT | FK → Users | - |
| invoiceNumber | TEXT | NOT NULL | - |
| subtotal | REAL | NOT NULL | - |
| discount | REAL | NOT NULL | 0 |
| tax | REAL | NOT NULL | 0 |
| total | REAL | NOT NULL | - |
| status | INTEGER | NOT NULL | SaleStatus.COMPLETED |
| saleDate | DATETIME | NOT NULL | now() |
| createdAt | DATETIME | NOT NULL | now() |
| updatedAt | DATETIME | NOT NULL | now() |

**Unique**: `(pharmacyId, invoiceNumber)`
**Index**: `(pharmacyId)`, `(patientId)`, `(saleDate)`

**SaleStatus Enum**: `COMPLETED (0)`, `VOIDED (1)`, `REFUNDED (2)`, `PARTIALLY_REFUNDED (3)`

---

## 17. SaleItems

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| saleId | TEXT | FK → Sales | - |
| medicineId | TEXT | FK → Medicines | - |
| quantity | REAL | NOT NULL | - |
| unitPrice | REAL | NOT NULL | - |
| discount | REAL | NOT NULL | 0 |
| total | REAL | NOT NULL | - |
| createdAt | DATETIME | NOT NULL | now() |

**Index**: `(saleId)`, `(medicineId)`

---

## 18. SaleItemBatches

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| saleItemId | TEXT | FK → SaleItems | - |
| batchId | TEXT | FK → Batches | - |
| quantity | REAL | NOT NULL | - |
| createdAt | DATETIME | NOT NULL | now() |

**Index**: `(saleItemId)`, `(batchId)`

---

## 19. Payments

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| saleId | TEXT | FK → Sales | - |
| paymentMethod | INTEGER | NOT NULL | PaymentMethod enum |
| amount | REAL | NOT NULL | - |
| status | INTEGER | NOT NULL | PaymentStatus.COMPLETED |
| transactionReference | TEXT | NULLABLE | - |
| paidAt | DATETIME | NOT NULL | now() |
| createdAt | DATETIME | NOT NULL | now() |

**Index**: `(saleId)`

**PaymentMethod Enum**: `CASH (0)`, `CARD (1)`, `BANK_TRANSFER (2)`, `MOBILE_PAYMENT (3)`, `OTHER (4)`
**PaymentStatus Enum**: `PENDING (0)`, `COMPLETED (1)`, `FAILED (2)`, `REFUNDED (3)`

---

## 20. InventoryTransactions

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| pharmacyId | TEXT | FK → Pharmacies | - |
| medicineId | TEXT | FK → Medicines | - |
| batchId | TEXT | FK → Batches | - |
| transactionType | INTEGER | NOT NULL | InventoryTransactionType enum |
| quantity | REAL | NOT NULL | - |
| referenceType | INTEGER | NOT NULL | ReferenceType enum |
| referenceId | TEXT | NULLABLE | - |
| reason | TEXT | NULLABLE | - |
| createdById | TEXT | FK → Users | - |
| createdAt | DATETIME | NOT NULL | now() |

**Index**: `(pharmacyId)`, `(medicineId)`, `(batchId)`, `(createdAt)`

**InventoryTransactionType Enum**: `PURCHASE (0)`, `SALE (1)`, `CUSTOMER_RETURN (2)`, `SUPPLIER_RETURN (3)`, `DAMAGE (4)`, `EXPIRY (5)`, `ADJUSTMENT (6)`
**ReferenceType Enum**: `PURCHASE_RECEIPT (0)`, `SALE (1)`, `CUSTOMER_RETURN (2)`, `SUPPLIER_RETURN (3)`, `ADJUSTMENT (4)`, `OTHER (5)`

---

## 21. AuditLogs

| Column | Type | Constraint | Default |
|--------|------|------------|---------|
| id | TEXT | PK | uuid |
| pharmacyId | TEXT | FK → Pharmacies | - |
| userId | TEXT | FK → Users | - |
| action | TEXT | NOT NULL | - |
| entityType | TEXT | NOT NULL | - |
| entityId | TEXT | NULLABLE | - |
| oldValues | TEXT | NULLABLE | JSON string |
| newValues | TEXT | NULLABLE | JSON string |
| ipAddress | TEXT | NULLABLE | - |
| userAgent | TEXT | NULLABLE | - |
| createdAt | DATETIME | NOT NULL | now() |

**Index**: `(pharmacyId)`, `(userId)`, `(entityType, entityId)`, `(createdAt)`

---

## Entity Relationship Summary

```
Pharmacy ──┬── Users ──── Role
            ├── Categories ── Medicines ──┬── Batches ──── SaleItemBatches
            ├── Suppliers ── Purchases     │               PurchaseReceiptItems
            ├── Patients ── Prescriptions  │               InventoryTransactions
            ├── Sales ── SaleItems         ├── MedicinePackages
            ├── InventoryTransactions      ├── PurchaseItems
            └── AuditLogs                  ├── PrescriptionItems
                                           └── SaleItems
```
