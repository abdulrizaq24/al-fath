import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class AppLocalizations {
  final Locale locale;

  AppLocalizations(this.locale);

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations) ??
        AppLocalizations(const Locale('en'));
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  bool get isArabic => locale.languageCode == 'ar';

  static final Map<String, Map<String, String>> _localizedValues = {
    'en': {
      // General & Shell
      'appName': 'PharmaCare',
      'appSubtitle': 'Offline Pharmacy System',
      'dashboard': 'Dashboard',
      'pos': 'Point of Sale (POS)',
      'medicines': 'Medicines & Categories',
      'purchases': 'Purchases & Receiving',
      'prescriptions': 'Prescriptions',
      'inventory': 'Inventory & Stock',
      'reports': 'Reports & Analytics',
      'logout': 'Sign Out',
      'user': 'User',
      'english': 'English',
      'arabic': 'العربية',
      'language': 'Language',

      // Dashboard
      'welcomeBack': 'Welcome,',
      'todaySummary': "Today's pharmacy operational overview",
      'todaySales': "Today's Sales",
      'totalTransactions': 'Total Transactions',
      'lowStock': 'Low Stock Alerts',
      'expiringSoon': 'Expiring Soon (<60 days)',
      'recentSales': 'Recent Sales Transactions',
      'invoiceNo': 'Invoice No.',
      'time': 'Time',
      'cashier': 'Cashier',
      'total': 'Total',
      'status': 'Status',
      'noSalesYet': 'No sales transactions yet.',
      'completed': 'Completed',
      'voided': 'Voided',

      // POS / Cashier
      'searchMedicineHint': 'Search medicine name, generic, or scan barcode...',
      'cart': 'Cart',
      'clearCart': 'Clear',
      'cartEmpty': 'Cart is empty',
      'subtotal': 'Subtotal',
      'discount': 'Discount',
      'grandTotal': 'TOTAL:',
      'paymentMethod': 'Payment Method',
      'paidAmount': 'Amount Paid',
      'payNow': 'PAY NOW',
      'cash': 'Cash',
      'card': 'Credit / Debit Card',
      'bankTransfer': 'Bank Transfer',
      'mobilePayment': 'Mobile Payment / QR',
      'other': 'Other',
      'transactionSuccess': 'Transaction Successful!',
      'change': 'Change:',
      'printReceipt': 'Print Receipt',
      'close': 'Close',
      'outOfStock': 'Medicine is out of stock or expired!',
      'exceedsStock': 'Quantity exceeds available stock.',
      'insufficientPayment': 'Paid amount is less than total bill!',
      'stockAvailable': 'Stock:',
      'emptyStock': 'Out of Stock',

      // Medicines
      'medicineCatalogSubtitle': 'Manage pharmaceutical catalog, selling prices, and categories',
      'newMedicine': 'Add Medicine',
      'newCategory': 'Category',
      'medicineName': 'Medicine Name',
      'genericName': 'Generic Name',
      'barcode': 'Barcode / Code',
      'category': 'Category',
      'dosageForm': 'Dosage Form',
      'baseUnit': 'Base Unit',
      'sellingPrice': 'Selling Price',
      'minStockLevel': 'Reorder Level',
      'regulation': 'Regulation / Class',
      'otc': 'OTC (Over-The-Counter)',
      'prescriptionRequired': 'Prescription Required',
      'controlled': 'Controlled Substance',
      'save': 'Save',
      'cancel': 'Cancel',
      'noMedicinesFound': 'No medicines found.',
      'createCategoryFirst': 'Please add a category first.',
      'addCategoryTitle': 'Add Medicine Category',
      'categoryName': 'Category Name',
      'description': 'Description',

      // Purchases
      'purchasesSubtitle': 'Manage supplier orders and incoming batch stock',
      'newPO': 'Create Purchase Order',
      'distributors': 'Distributor',
      'newDistributor': 'Add Distributor',
      'distributorName': 'Supplier / Distributor Name',
      'phone': 'Phone / WhatsApp',
      'address': 'Address',
      'receiveGoods': 'Receive Goods',
      'supplier': 'Supplier',
      'date': 'Date',
      'estTotal': 'Estimated Total',
      'action': 'Action',
      'noPurchases': 'No purchase orders yet.',
      'receiveGoodsTitle': 'Goods Receipt for PO:',
      'deliveryNote': 'Delivery Note / Supplier Invoice No.',
      'batchNo': 'Batch No.',
      'expDate': 'Exp. Date',
      'orderedQty': 'Ordered Qty',
      'unitCost': 'Unit Cost',
      'saveAndAddStock': 'Save & Add to Stock',

      // Prescriptions
      'prescriptionsSubtitle': 'Patient prescription dispensing via automated FEFO',
      'newPatient': 'New Patient',
      'newRx': 'New Prescription',
      'patient': 'Patient',
      'doctorName': 'Prescriber Doctor',
      'directions': 'Directions / Dosage Signa',
      'dispense': 'Dispense',
      'noPrescriptions': 'No prescription records yet.',
      'dispenseTitle': 'Dispense Prescription:',
      'medicinesToDispense': 'Medicines to be dispensed:',
      'dispenseAndPay': 'Process Dispensing & Pay',
      'patientNumber': 'Medical Record No.',
      'patientFullName': 'Patient Full Name',

      // Inventory
      'inventorySubtitle': 'Batch monitoring, stock opname adjustments, and audit trail',
      'tabBatches': 'Batches & Stock List',
      'tabExpiring': 'Expiring Batches (<60 days)',
      'tabAudit': 'Stock Mutation Audit Trail',
      'adjustStock': 'Stock Adjustment (Opname)',
      'physicalQty': 'Actual Physical Quantity',
      'adjustmentReason': 'Adjustment Reason',
      'adjustmentType': 'Adjustment Type',
      'saveCorrection': 'Save Correction',
      'safeNoExpiring': 'All clear! No medicines expiring soon.',
      'noMutations': 'No stock mutations recorded yet.',

      // Reports
      'reportsSubtitle': 'Gross revenue, actual COGS, gross profit margins, and sales analytics',
      'filterToday': 'Today',
      'filter7Days': 'Last 7 Days',
      'filter30Days': 'Last 30 Days',
      'filterAllTime': 'All Time',
      'exportExcel': 'Export Excel (.xlsx)',
      'netRevenue': 'Net Revenue',
      'cogs': 'COGS (Cost of Goods)',
      'grossProfit': 'Gross Profit',
      'profitMargin': 'Gross Margin',
      'topSellingMedicines': 'Top Selling Medicines',
      'unitsSold': 'Units Sold',

      // Setup & Auth
      'setupTitle': 'Initial System Setup',
      'setupSubtitle': 'Configure your pharmacy details and create initial administrator',
      'pharmacyInfo': 'Pharmacy Information',
      'pharmacyName': 'Pharmacy Name',
      'licenseNumber': 'License / SIPA Number',
      'adminAccount': 'Initial Administrator Account',
      'adminFullName': 'Administrator Full Name',
      'username': 'Username',
      'password': 'Password',
      'completeSetup': 'Complete Setup & Launch',
      'loginTitle': 'Sign In to Pharmacy System',
      'loginButton': 'Sign In',
      'required': 'Required',
    },
    'ar': {
      // General & Shell
      'appName': 'فارماكير',
      'appSubtitle': 'نظام الصيدلية بدون إنترنت',
      'dashboard': 'لوحة التحكم',
      'pos': 'نقطة البيع (الكاشير)',
      'medicines': 'الأدوية والتصنيفات',
      'purchases': 'المشتريات والاستلام',
      'prescriptions': 'الوصفات الطبية',
      'inventory': 'المخزون والكميات',
      'reports': 'التقارير والأرباح',
      'logout': 'تسجيل الخروج',
      'user': 'المستخدم',
      'english': 'English',
      'arabic': 'العربية',
      'language': 'اللغة',

      // Dashboard
      'welcomeBack': 'مرحباً،',
      'todaySummary': 'نظرة عامة على عمليات الصيدلية اليوم',
      'todaySales': 'مبيعات اليوم',
      'totalTransactions': 'عدد الفواتير',
      'lowStock': 'تنبيهات انخفاض المخزون',
      'expiringSoon': 'أدوية تقترب من الصلاحية (<60 يوم)',
      'recentSales': 'أحدث عمليات البيع',
      'invoiceNo': 'رقم الفاتورة',
      'time': 'الوقت',
      'cashier': 'الكاشير',
      'total': 'الإجمالي',
      'status': 'الحالة',
      'noSalesYet': 'لا توجد فواتير مبيعات حتى الآن.',
      'completed': 'مكتمل',
      'voided': 'ملغي',

      // POS / Cashier
      'searchMedicineHint': 'ابحث باسم الدواء، الاسم العلمي، أو امسح الباركود...',
      'cart': 'سلة المشتريات',
      'clearCart': 'تفريغ',
      'cartEmpty': 'السلة فارغة',
      'subtotal': 'المجموع الفرعي',
      'discount': 'الخصم',
      'grandTotal': 'الإجمالي النهائي:',
      'paymentMethod': 'طريقة الدفع',
      'paidAmount': 'المبلغ المدفوع',
      'payNow': 'إتمام الدفع الآن',
      'cash': 'نقداً (كاش)',
      'card': 'بطاقة بنكية',
      'bankTransfer': 'تحويل بنكي',
      'mobilePayment': 'دفع إلكتروني / QR',
      'other': 'أخرى',
      'transactionSuccess': 'تمت العملية بنجاح!',
      'change': 'المتبقي (الباقي):',
      'printReceipt': 'طباعة الإيصال',
      'close': 'إغلاق',
      'outOfStock': 'الدواء غير متوفر أو منتهي الصلاحية!',
      'exceedsStock': 'الكمية المطلوبة تتجاوز المخزون المتاح.',
      'insufficientPayment': 'المبلغ المدفوع أقل من إجمالي الفاتورة!',
      'stockAvailable': 'المخزون:',
      'emptyStock': 'نفذ من المخزون',

      // Medicines
      'medicineCatalogSubtitle': 'إدارة دليل الأدوية، أسعار البيع، والتصنيفات الدوائية',
      'newMedicine': 'إضافة دواء جديد',
      'newCategory': 'تصنيف جديد',
      'medicineName': 'اسم الدواء',
      'genericName': 'الاسم العلمي',
      'barcode': 'الباركود / الكود',
      'category': 'التصنيف',
      'dosageForm': 'الشكل الصيدلاني',
      'baseUnit': 'الوحدة الأساسية',
      'sellingPrice': 'سعر البيع',
      'minStockLevel': 'حد إعادة الطلب',
      'regulation': 'التصنيف الرقابي',
      'otc': 'بدون وصفة (OTC)',
      'prescriptionRequired': 'بوصفة طبية فقط',
      'controlled': 'أدوية خاضعة للرقابة (مخدرات/مؤثرات)',
      'save': 'حفظ',
      'cancel': 'إلغاء',
      'noMedicinesFound': 'لم يتم العثور على أدوية.',
      'createCategoryFirst': 'يرجى إنشاء تصنيف أولاً.',
      'addCategoryTitle': 'إضافة تصنيف دواء',
      'categoryName': 'اسم التصنيف',
      'description': 'الوصف',

      // Purchases
      'purchasesSubtitle': 'إدارة أوامر الشراء من الموردين واستلام شحنات الأدوية',
      'newPO': 'أمر شراء جديد',
      'distributors': 'الموردين والمستودعات',
      'newDistributor': 'إضافة مورد جديد',
      'distributorName': 'اسم المورد / شركة التوزيع',
      'phone': 'رقم الهاتف / واتساب',
      'address': 'العنوان',
      'receiveGoods': 'استلام الشحنة',
      'supplier': 'المورد',
      'date': 'التاريخ',
      'estTotal': 'إجمالي الطلب',
      'action': 'إجراء',
      'noPurchases': 'لا توجد أوامر شراء حالياً.',
      'receiveGoodsTitle': 'استلام شحنة أمر الشراء:',
      'deliveryNote': 'رقم إشعار الاستلام / فاتورة المورد',
      'batchNo': 'رقم التشغيلة (Batch)',
      'expDate': 'تاريخ الصلاحية',
      'orderedQty': 'الكمية المطلوبة',
      'unitCost': 'سعر التكلفة للوحدة',
      'saveAndAddStock': 'حفظ وإضافة للمخزون',

      // Prescriptions
      'prescriptionsSubtitle': 'صرف الوصفات الطبية للمرضى عبر نظام الصرف الآلي FEFO',
      'newPatient': 'مريض جديد',
      'newRx': 'تسجيل وصفة طبية',
      'patient': 'المريض',
      'doctorName': 'اسم الطبيب المعالج',
      'directions': 'الجرعة وطريقة الاستخدام',
      'dispense': 'صرف الدواء',
      'noPrescriptions': 'لا توجد وصفات مسجلة.',
      'dispenseTitle': 'صرف الوصفة الطبية:',
      'medicinesToDispense': 'الأدوية الموصوفة المراد صرفها:',
      'dispenseAndPay': 'صرف الأدوية والدفع',
      'patientNumber': 'رقم الملف الطبي',
      'patientFullName': 'اسم المريض بالكامل',

      // Inventory
      'inventorySubtitle': 'متابعة التشغيلات، جرد المخزون، وسجل حركة الأصناف',
      'tabBatches': 'قائمة التشغيلات والمخزون',
      'tabExpiring': 'أدوية قريبة من الانتهاء (<60 يوم)',
      'tabAudit': 'سجل حركة المخزون (Audit Trail)',
      'adjustStock': 'تسوية المخزون (جرد)',
      'physicalQty': 'الكمية الفعلية على الرف',
      'adjustmentReason': 'سبب التسوية',
      'adjustmentType': 'نوع التسوية',
      'saveCorrection': 'حفظ التعديل',
      'safeNoExpiring': 'ممتاز! لا توجد أدوية تنتهي صلاحيتها قريباً.',
      'noMutations': 'لا توجد حركات مخزنية مسجلة.',

      // Reports
      'reportsSubtitle': 'المبيعات الإجمالية، تكلفة البضاعة المباعة COGS، وصافي الأرباح',
      'filterToday': 'اليوم',
      'filter7Days': 'آخر 7 أيام',
      'filter30Days': 'آخر 30 يوماً',
      'filterAllTime': 'كل الفترات',
      'exportExcel': 'تصدير إكسل (.xlsx)',
      'netRevenue': 'صافي الإيرادات',
      'cogs': 'تكلفة البضاعة (COGS)',
      'grossProfit': 'الربح الإجمالي',
      'profitMargin': 'هامش الربح',
      'topSellingMedicines': 'الأدوية الأكثر مبيعاً',
      'unitsSold': 'الكمية المباعة',

      // Setup & Auth
      'setupTitle': 'إعداد النظام لأول مرة',
      'setupSubtitle': 'أدخل بيانات الصيدلية وأنشئ حساب المسؤول الأول',
      'pharmacyInfo': 'بيانات الصيدلية',
      'pharmacyName': 'اسم الصيدلية',
      'licenseNumber': 'رقم الترخيص / السجل',
      'adminAccount': 'حساب المسؤول الأول (Admin)',
      'adminFullName': 'الاسم الكامل للمسؤول',
      'username': 'اسم المستخدم',
      'password': 'كلمة المرور',
      'completeSetup': 'إتمام الإعداد وبدء العمل',
      'loginTitle': 'تسجيل الدخول إلى نظام الصيدلية',
      'loginButton': 'تسجيل الدخول',
      'required': 'حقل مطلوب',
    },
  };

  String t(String key) {
    return _localizedValues[locale.languageCode]?[key] ??
        _localizedValues['en']?[key] ??
        key;
  }
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['en', 'ar'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(AppLocalizations(locale));
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}
