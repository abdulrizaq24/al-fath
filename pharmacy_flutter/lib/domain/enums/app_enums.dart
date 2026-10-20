enum RoleName {
  admin,
  pharmacist;

  String get label {
    switch (this) {
      case RoleName.admin:
        return 'Admin';
      case RoleName.pharmacist:
        return 'Pharmacist';
    }
  }
}

enum ControlledStatus {
  otc,
  prescription,
  controlled;

  String get label {
    switch (this) {
      case ControlledStatus.otc:
        return 'OTC (Bebas)';
      case ControlledStatus.prescription:
        return 'Resep Dokter';
      case ControlledStatus.controlled:
        return 'Narkotika / Psikotropika';
    }
  }
}

enum PurchaseStatus {
  draft,
  ordered,
  partiallyReceived,
  received,
  cancelled;

  String get label {
    switch (this) {
      case PurchaseStatus.draft:
        return 'Draft';
      case PurchaseStatus.ordered:
        return 'Dipesan';
      case PurchaseStatus.partiallyReceived:
        return 'Diterima Sebagian';
      case PurchaseStatus.received:
        return 'Selesai Diterima';
      case PurchaseStatus.cancelled:
        return 'Dibatalkan';
    }
  }
}

enum PrescriptionStatus {
  pending,
  partiallyDispensed,
  dispensed,
  cancelled;

  String get label {
    switch (this) {
      case PrescriptionStatus.pending:
        return 'Menunggu';
      case PrescriptionStatus.partiallyDispensed:
        return 'Dilayani Sebagian';
      case PrescriptionStatus.dispensed:
        return 'Selesai';
      case PrescriptionStatus.cancelled:
        return 'Dibatalkan';
    }
  }
}

enum SaleStatus {
  completed,
  voided,
  refunded,
  partiallyRefunded;

  String get label {
    switch (this) {
      case SaleStatus.completed:
        return 'Selesai';
      case SaleStatus.voided:
        return 'Dibatalkan (Void)';
      case SaleStatus.refunded:
        return 'Dikembalikan (Refund)';
      case SaleStatus.partiallyRefunded:
        return 'Refund Sebagian';
    }
  }
}

enum PaymentMethod {
  cash,
  card,
  bankTransfer,
  mobilePayment,
  other;

  String get label {
    switch (this) {
      case PaymentMethod.cash:
        return 'Tunai';
      case PaymentMethod.card:
        return 'Kartu Debit/Kredit';
      case PaymentMethod.bankTransfer:
        return 'Transfer Bank';
      case PaymentMethod.mobilePayment:
        return 'QRIS / E-Wallet';
      case PaymentMethod.other:
        return 'Lainnya';
    }
  }
}

enum PaymentStatus {
  pending,
  completed,
  failed,
  refunded;

  String get label {
    switch (this) {
      case PaymentStatus.pending:
        return 'Pending';
      case PaymentStatus.completed:
        return 'Lunas';
      case PaymentStatus.failed:
        return 'Gagal';
      case PaymentStatus.refunded:
        return 'Dikembalikan';
    }
  }
}

enum InventoryTransactionType {
  purchase,
  sale,
  customerReturn,
  supplierReturn,
  damage,
  expiry,
  adjustment;

  String get label {
    switch (this) {
      case InventoryTransactionType.purchase:
        return 'Pembelian';
      case InventoryTransactionType.sale:
        return 'Penjualan';
      case InventoryTransactionType.customerReturn:
        return 'Retur Pelanggan';
      case InventoryTransactionType.supplierReturn:
        return 'Retur Supplier';
      case InventoryTransactionType.damage:
        return 'Kerusakan';
      case InventoryTransactionType.expiry:
        return 'Kadaluarsa';
      case InventoryTransactionType.adjustment:
        return 'Penyesuaian (Opname)';
    }
  }
}

enum ReferenceType {
  purchaseReceipt,
  sale,
  customerReturn,
  supplierReturn,
  adjustment,
  other;

  String get label {
    switch (this) {
      case ReferenceType.purchaseReceipt:
        return 'Penerimaan Pembelian';
      case ReferenceType.sale:
        return 'Penjualan Kasir';
      case ReferenceType.customerReturn:
        return 'Retur Pelanggan';
      case ReferenceType.supplierReturn:
        return 'Retur Supplier';
      case ReferenceType.adjustment:
        return 'Penyesuaian Stok';
      case ReferenceType.other:
        return 'Lainnya';
    }
  }
}
