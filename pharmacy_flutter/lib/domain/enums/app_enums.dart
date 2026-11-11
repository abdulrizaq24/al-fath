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
        return 'OTC';
      case ControlledStatus.prescription:
        return 'Prescription';
      case ControlledStatus.controlled:
        return 'Controlled Substance';
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
        return 'Ordered';
      case PurchaseStatus.partiallyReceived:
        return 'Partially Received';
      case PurchaseStatus.received:
        return 'Received';
      case PurchaseStatus.cancelled:
        return 'Cancelled';
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
        return 'Pending';
      case PrescriptionStatus.partiallyDispensed:
        return 'Partially Dispensed';
      case PrescriptionStatus.dispensed:
        return 'Dispensed';
      case PrescriptionStatus.cancelled:
        return 'Cancelled';
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
        return 'Completed';
      case SaleStatus.voided:
        return 'Voided';
      case SaleStatus.refunded:
        return 'Refunded';
      case SaleStatus.partiallyRefunded:
        return 'Partially Refunded';
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
        return 'Cash';
      case PaymentMethod.card:
        return 'Debit/Credit Card';
      case PaymentMethod.bankTransfer:
        return 'Bank Transfer';
      case PaymentMethod.mobilePayment:
        return 'Mobile / E-Wallet';
      case PaymentMethod.other:
        return 'Other';
    }
  }
}

extension PaymentMethodLocalization on PaymentMethod {
  String get localizationKey => switch (this) {
    PaymentMethod.cash => 'cash',
    PaymentMethod.card => 'card',
    PaymentMethod.bankTransfer => 'bankTransfer',
    PaymentMethod.mobilePayment => 'mobilePayment',
    PaymentMethod.other => 'other',
  };
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
        return 'Paid';
      case PaymentStatus.failed:
        return 'Failed';
      case PaymentStatus.refunded:
        return 'Refunded';
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
        return 'Purchase';
      case InventoryTransactionType.sale:
        return 'Sale';
      case InventoryTransactionType.customerReturn:
        return 'Customer Return';
      case InventoryTransactionType.supplierReturn:
        return 'Supplier Return';
      case InventoryTransactionType.damage:
        return 'Damage';
      case InventoryTransactionType.expiry:
        return 'Expired';
      case InventoryTransactionType.adjustment:
        return 'Stock Adjustment';
    }
  }
}

extension ControlledStatusLocalization on ControlledStatus {
  String get localizationKey => switch (this) {
    ControlledStatus.otc => 'otc',
    ControlledStatus.prescription => 'prescriptionRequired',
    ControlledStatus.controlled => 'controlled',
  };
}

extension PurchaseStatusLocalization on PurchaseStatus {
  String get localizationKey =>
      'purchaseStatus${name[0].toUpperCase()}${name.substring(1)}';
}

extension PrescriptionStatusLocalization on PrescriptionStatus {
  String get localizationKey =>
      'prescriptionStatus${name[0].toUpperCase()}${name.substring(1)}';
}

extension SaleStatusLocalization on SaleStatus {
  String get localizationKey => switch (this) {
    SaleStatus.completed => 'completed',
    SaleStatus.voided => 'voided',
    SaleStatus.refunded => 'refunded',
    SaleStatus.partiallyRefunded => 'partiallyRefunded',
  };
}

extension InventoryTransactionLocalization on InventoryTransactionType {
  String get localizationKey =>
      'inventory${name[0].toUpperCase()}${name.substring(1)}';
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
        return 'Purchase Receipt';
      case ReferenceType.sale:
        return 'POS Sale';
      case ReferenceType.customerReturn:
        return 'Customer Return';
      case ReferenceType.supplierReturn:
        return 'Supplier Return';
      case ReferenceType.adjustment:
        return 'Stock Adjustment';
      case ReferenceType.other:
        return 'Other';
    }
  }
}
