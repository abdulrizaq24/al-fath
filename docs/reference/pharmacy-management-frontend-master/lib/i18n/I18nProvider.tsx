"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "ar";

const translations = {
  en: {
    common: {
      language: "Language",
      english: "English",
      arabic: "Arabic",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      search: "Search",
      loading: "Loading application...",
      close: "Close",
      confirm: "Confirm",
      loggedInAs: "Logged in as",
      signOut: "Sign out",
    },

    navigation: {
      dashboard: "Dashboard",
      medicines: "Medicines",
      inventory: "Inventory",
      purchases: "Purchases",
      sales: "Sales",
      patients: "Patients",
      suppliers: "Suppliers",
      prescriptions: "Prescriptions",
      transactions: "Transactions",
      reports: "Reports",
    },

    dashboard: {
      title: "Dashboard",
      description: "Overview of your pharmacy operations.",
      loading: "Loading dashboard...",

      errors: {
        loadFailed: "Unable to load dashboard.",
      },

      stats: {
        totalMedicines: "Total Medicines",
        totalMedicinesDescription: "Active medicines",
        totalStock: "Total Stock",
        totalStockDescription: "Units in inventory",
        lowStock: "Low Stock",
        lowStockDescription: "Need attention",
        expiringSoon: "Expiring Soon",
        expiringSoonDescription: "Within 90 days",
      },

      sales: {
        todaySales: "Today's Sales",
        todaySalesDescription: "Completed sales today",
        todayRevenue: "Today's Revenue",
        todayRevenueDescription: "Revenue generated today",
      },

      inventory: {
        title: "Inventory Overview",
        description: "Current inventory status.",
        viewInventory: "View inventory",
        totalStock: "Total stock",
        lowStockMedicines: "Low stock medicines",
        expiringInventory: "Expiring inventory",
        expiredInventory: "Expired inventory",
      },

      transactions: {
        title: "Recent Transactions",
        description: "Latest inventory activity.",
        viewAll: "View all",
        medicineTransaction: "Medicine transaction",
        noTransactions: "No recent transactions.",
      },
    },

    medicines: {
      title: "Medicines",
      description: "Manage medicines available in your pharmacy.",
      addMedicine: "Add Medicine",
      searchPlaceholder: "Search medicines...",
      medicineCount: "medicine",
      medicineCountPlural: "medicines",

      list: {
        title: "Medicine List",
        description: "Active medicines registered in your pharmacy.",
        loading: "Loading medicines...",
        noMedicines: "No medicines found",
        tryDifferentSearch: "Try a different search.",
        noRegisteredMedicines: "No medicines have been registered yet.",
      },

      fields: {
        medicine: "Medicine",
        category: "Category",
        dosage: "Dosage",
        unit: "Unit",
        price: "Price",
        reorder: "Reorder",
        type: "Type",
        actions: "Actions",
        medicineName: "Medicine Name",
        genericName: "Generic Name",
        brandName: "Brand Name",
        manufacturer: "Manufacturer",
        dosageForm: "Dosage Form",
        strength: "Strength",
        baseUnit: "Base Unit",
        prescriptionType: "Prescription Type",
        sellingPrice: "Selling Price",
        reorderLevel: "Reorder Level",
        barcode: "Barcode",
        notes: "Notes",
      },

      actions: {
        view: "View",
        addMedicine: "Add Medicine",
        editMedicine: "Edit Medicine",
        createMedicine: "Create Medicine",
        saveChanges: "Save Changes",
        close: "Close",
        cancel: "Cancel",
        edit: "Edit",
      },

      forms: {
        basicInformation: "Basic Information",
        medicineDetails: "Medicine Details",
        pricingInventory: "Pricing & Inventory",

        registerDescription: "Register a new medicine in your pharmacy.",
        updateDescription: "Update medicine information.",
        viewDescription: "View medicine information and inventory details.",

        selectCategory: "Select category",
        loadingCategories: "Loading categories...",

        noGenericName: "No generic name",
        noNotes: "No notes",

        optional: "Optional",

        placeholders: {
          medicineName: "e.g. Amoxicillin 500mg",
          genericName: "e.g. Amoxicillin",
          dosageForm: "e.g. Capsule",
          strength: "e.g. 500 mg",
          baseUnit: "e.g. Capsule",
          sellingPrice: "3000",
          reorderLevel: "10",
          notes: "Optional notes about this medicine...",
        },
      },

      prescription: {
        otc: "OTC",
        prescription: "Prescription",
        controlled: "Controlled",

        otcArabic: "Over the Counter",
        prescriptionArabic: "Prescription",
        controlledArabic: "Controlled",
      },

      validation: {
        required:
          "Category, name, dosage form, base unit, and selling price are required.",

        price: "Selling price must be a valid positive number.",

        reorder: "Reorder level must be a valid number.",

        noMedicineSelected: "No medicine selected for editing.",
      },

      errors: {
        retrieveMedicines: "Unable to retrieve medicines.",
        retrieveCategories: "Unable to retrieve categories.",
        retrieveMedicine: "Unable to retrieve medicine.",
        createMedicine: "Unable to create medicine.",
        updateMedicine: "Unable to update medicine.",
      },

      details: {
        title: "Medicine Details",
        description: "View medicine information and inventory details.",
      },
    },

    inventory: {
      title: "Inventory",
      description: "Manage medicine batches and current stock.",
      loading: "Loading inventory...",

      stats: {
        batches: "Inventory Batches",
        batchesDescription: "Active batches",
        totalStock: "Total Stock",
        totalStockDescription: "Units currently available",
        lowStock: "Low Stock Batches",
        lowStockDescription: "Need attention",
      },

      table: {
        title: "Current Inventory",
        description: "Medicine batches currently available in your pharmacy.",
      },

      fields: {
        medicine: "Medicine",
        batch: "Batch",
        stock: "Stock",
        received: "Received",
        expiry: "Expiry",
        status: "Status",
      },

      status: {
        lowStock: "Low Stock",
        inStock: "In Stock",
      },

      empty: {
        title: "No inventory found.",
        description: "There are currently no batches with available stock.",
      },

      actions: {
        adjust: "Adjust",
        cancel: "Cancel",
        saving: "Saving...",
        saveAdjustment: "Save Adjustment",
      },

      adjustment: {
        label: "Stock Adjustment",
        batch: "Batch",
        currentStock: "Current stock",
        quantity: "Adjustment quantity",

        quantityHelp:
          "Use a positive number to add stock or a negative number to remove stock.",

        quantityPlaceholder: "Example: -5 or 10",
        reason: "Reason",
        reasonPlaceholder: "Example: 5 units damaged",
      },

      validation: {
        quantity: "Adjustment quantity must be a non-zero integer.",
        reason: "Adjustment reason is required.",
      },

      errors: {
        load: "Unable to load inventory.",
        adjust: "Unable to adjust stock.",
      },
    },

    purchases: {
      title: "Purchases",

      description:
        "Manage purchase orders and receive medicines into inventory.",

      loading: "Loading purchases...",

      unknownSupplier: "Unknown supplier",
      unknownMedicine: "Unknown medicine",

      fields: {
        date: "Date",
        purchaseNumber: "Purchase Number",
        purchaseNumberRequired: "Purchase Number *",
        supplier: "Supplier",
        supplierRequired: "Supplier *",
        items: "Items",
        total: "Total",
        purchaseTotal: "Purchase Total",
        status: "Status",
        actions: "Actions",

        expectedDate: "Expected Date",
        notes: "Notes",

        medicine: "Medicine",
        quantity: "Quantity",
        unitCost: "Unit Cost",
        lineTotal: "Line Total",

        receiptNumberRequired: "Receipt Number *",
        quantityReceivedRequired: "Quantity Received *",
        batchNumberRequired: "Batch Number *",
        expiryDateRequired: "Expiry Date *",
      },

      status: {
        received: "Received",
        partiallyReceived: "Partially Received",
        cancelled: "Cancelled",
        draft: "Draft",
      },

      list: {
        title: "Purchase Orders",
        description: "Purchase orders registered in your pharmacy.",
      },

      empty: {
        title: "No purchases found.",
        description: "No purchase orders have been created yet.",
      },

      actions: {
        createPurchase: "Create Purchase",
        addItem: "Add Item",
        remove: "Remove",
        receive: "Receive",
        noAction: "No action",
        creating: "Creating...",
        receiving: "Receiving...",
        receivePurchase: "Receive Purchase",
      },

      create: {
        title: "Create Purchase",
        description: "Create a new purchase order for your pharmacy.",

        purchaseInformation: "Purchase Information",

        purchaseItems: "Purchase Items",

        purchaseItemsDescription:
          "Add the medicines and quantities included in this purchase.",
      },

      receive: {
        title: "Receive Purchase",

        description: "Receive medicines from purchase order",

        receiptInformation: "Receipt Information",

        itemsReceived: "Items Received",

        itemsReceivedDescription:
          "Enter the received quantity, batch number, and expiry date for each medicine.",

        orderedQuantity: "Ordered quantity",
      },

      placeholders: {
        purchaseNumber: "e.g. PO-2026-001",
        selectSupplier: "Select supplier",
        selectMedicine: "Select medicine",
        optionalNotes: "Optional notes",
        receiptNumber: "e.g. GR-2026-001",
        batchNumber: "e.g. BATCH-001",
      },

      validation: {
        supplier: "Supplier is required.",
        purchaseNumber: "Purchase number is required.",
        items: "At least one purchase item is required.",
        medicine: "Please select a medicine for every purchase item.",
        quantity: "Ordered quantity must be greater than zero.",
        unitCost: "Unit cost must be a valid non-negative number.",
        noPurchase: "No purchase selected.",
        receiptNumber: "Receipt number is required.",
        receiptItems: "At least one item must be received.",
        invalidItem: "Invalid purchase item.",
        batchRequired: "Batch number is required for {medicine}.",
        expiryRequired: "Expiry date is required for {medicine}.",
        receivedQuantity:
          "Received quantity must be greater than zero for {medicine}.",
        quantityExceeded:
          "Received quantity cannot exceed the ordered quantity for {medicine}.",
      },

      errors: {
        load: "Unable to load purchases.",
        create: "Unable to create purchase.",
        receive: "Unable to receive purchase.",
      },
    },

    suppliers: {
      title: "Suppliers",

      description: "Manage medicine suppliers for your pharmacy.",

      loading: "Loading suppliers...",

      actions: {
        add: "Add Supplier",
        saving: "Saving...",
        saveChanges: "Save Changes",
        create: "Create Supplier",
        updating: "Updating...",
        activate: "Activate",
        deactivate: "Deactivate",
      },

      form: {
        addTitle: "Add Supplier",
        editTitle: "Edit Supplier",

        addDescription: "Enter the supplier information below.",

        editDescription: "Update supplier information.",
      },

      fields: {
        name: "Supplier Name",
        contactPerson: "Contact Person",
        phone: "Phone",
        email: "Email",
        address: "Address",
        notes: "Notes",
      },

      placeholders: {
        name: "Supplier name",
        contactPerson: "Contact person",
        phone: "Phone number",
        email: "supplier@example.com",
        address: "Supplier address",
        notes: "Optional notes",
      },

      directory: {
        title: "Supplier Directory",

        description: "View and manage suppliers for your pharmacy.",
      },

      table: {
        supplier: "Supplier",
        contact: "Contact",
        phone: "Phone",
        email: "Email",
        status: "Status",
        actions: "Actions",
      },

      status: {
        active: "Active",
        inactive: "Inactive",
      },

      empty: {
        title: "No suppliers found",

        description: "Add your first supplier to get started.",
      },

      confirm: {
        status: "Are you sure you want to",
      },

      messages: {
        created: "Supplier created successfully.",
        updated: "Supplier updated successfully.",
        activated: "Supplier activated successfully.",
        deactivated: "Supplier deactivated successfully.",
      },

      errors: {
        load: "Unable to load suppliers.",
        save: "Unable to save supplier.",
        status: "Unable to update supplier status.",
        nameRequired: "Supplier name is required.",
      },
    },

    prescriptions: {
      title: "Prescriptions",
      subtitle: "Manage patient prescriptions and prescribed medicines.",
      create: "Create Prescription",

      history: "Prescription History",
      historyDescription: "View prescriptions created for your pharmacy.",

      date: "Date",
      prescription: "Prescription",
      patient: "Patient",
      prescriber: "Prescriber",
      items: "Items",
      status: "Status",
      action: "Action",
      view: "View",

      loading: "Loading prescriptions...",
      noPrescriptions: "No prescriptions found",
      noPrescriptionsDescription:
        "Create your first prescription to see it here.",

      details: "Prescription Details",
      detailsDescription: "Prescription details and prescribed medicines.",

      information: "Prescription Information",

      prescriptionNumber: "Prescription Number",

      prescriptionDate: "Prescription Date",

      prescribedMedicines: "Prescribed Medicines",

      prescribedMedicinesDescription:
        "Medicines included in this prescription.",

      medicine: "Medicine",
      prescribed: "Prescribed",
      dispensed: "Dispensed",
      directions: "Directions",
      notes: "Notes",

      created: "Created",

      backToPrescriptions: "Back to Prescriptions",

      dispense: "Dispense Prescription",
      dispenseRemaining: "Dispense Remaining",
      dispensing: "Dispensing...",

      cancelPrescription: "Cancel Prescription",
      cancelling: "Cancelling...",

      pending: "PENDING",
      partiallyDispensed: "PARTIALLY DISPENSED",
      dispensedStatus: "DISPENSED",
      cancelled: "CANCELLED",

      unknownPatient: "Unknown patient",
      unknownMedicine: "Unknown medicine",

      invalidId: "Invalid prescription ID",
      notFound: "Prescription not found",
      unableToLoad: "Unable to load prescription",
      invalidResponse: "Invalid prescription response",
      invalidDispenseResponse: "Invalid dispense response",
      invalidStatusResponse: "Invalid status update response",

      dispenseConfirm:
        "Are you sure you want to dispense this prescription?\n\nThis will deduct the prescribed medicine from inventory.",

      cancelConfirm: "Are you sure you want to cancel this prescription?",

      dispenseSuccess: "Prescription dispensed successfully.",

      cancelSuccess: "Prescription cancelled successfully.",
    },

    reports: {
      title: "Reports",
      refresh: "Refresh",
      reportPeriod: "Report Period",
      selectDateRange: "Select the date range for the analytical report.",
      invalidDateRange: "The start date cannot be after the end date.",
      salesPerformance: "Sales performance for the selected period.",
      completedTransactions: "Completed transactions",
      completedSaleRevenue: "Total completed-sale revenue",
      averageSale: "Average Sale",
      saleLevelDiscounts: "Sale-level discounts",
      dailyRevenue: "Daily revenue during the selected period.",
      noSalesData: "No sales data for this period.",
      grossProfitability: "Gross profitability for the selected period.",
      revenueBeforeTax: "Revenue before tax",
      medicineSalesDescription: "Revenue, cost, and profitability by medicine.",
      noMedicineSales: "No medicine sales for this period.",
      quantitySoldShort: "Qty Sold",
      salesByPaymentMethod: "Sales by Payment Method",
      paymentDistribution: "Revenue distribution by payment method.",
      noPaymentData: "No payment data for this period.",
      paymentDetails: "Payment Details",
      transactionPaymentDescription: "Transaction count and payment value.",
      purchaseAnalysis: "Purchase Analysis",
      purchaseDescription: "Purchasing activity during the selected period.",
      purchases: "Purchases",
      purchaseValue: "Purchase Value",
      supplierPurchaseDescription:
        "Supplier purchasing activity for the selected period.",
      noSupplierPurchases: "No supplier purchases for this period.",
      medicinePurchaseDescription:
        "Medicines purchased during the selected period.",
      noMedicinePurchases: "No medicine purchases for this period.",
      reportFrom: "Report From",
      reportTo: "Report To",
      profitMarginAnalysis: "Profit & Margin Analysis",
      grossProfitShort: "Profit",
      metric: "Metric",
      value: "Value",
      pdfTitle: "PHARMACY ANALYTICAL REPORT",
      pharmacyManagementSystem: "Pharmacy Management System",
      page: "Page",
      of: "of",
      cash: "Cash",
      card: "Card",
      bankTransfer: "Bank Transfer",
      qris: "QRIS",
      eWallet: "E-Wallet",
      description: "Analyze sales, revenue, purchases, and profitability.",
      loading: "Loading analytical reports...",
      error: "Unable to load analytical reports.",
      dateRange: "Date Range",
      from: "From",
      to: "To",
      applyFilter: "Apply Filter",
      tryAgain: "Try Again",
      exportExcel: "Export Excel",
      exportPdf: "Export PDF",
      refreshing: "Refreshing...",

      salesSummary: "Sales Summary",
      totalSales: "Total Sales",
      subtotal: "Subtotal",
      discounts: "Discounts",
      tax: "Tax",
      revenue: "Revenue",
      netRevenueBeforeTax: "Net Revenue Before Tax",
      averageSaleValue: "Average Sale Value",

      profitMargin: "Profit & Margin",
      costOfGoodsSold: "Cost of Goods Sold",
      grossProfit: "Gross Profit",
      grossMargin: "Gross Margin",

      purchaseSummary: "Purchase Summary",
      totalPurchases: "Total Purchases",
      totalPurchaseAmount: "Total Purchase Amount",
      draft: "Draft",
      ordered: "Ordered",
      partiallyReceived: "Partially Received",
      received: "Received",
      cancelled: "Cancelled",

      revenueTrend: "Revenue Trend",
      paymentMethods: "Payment Methods",
      salesByMedicine: "Sales by Medicine",
      purchasesBySupplier: "Purchases by Supplier",
      purchasesByMedicine: "Purchases by Medicine",

      date: "Date",
      sales: "Sales",
      paymentMethod: "Payment Method",
      amount: "Amount",
      transactions: "Transactions",
      medicine: "Medicine",
      genericName: "Generic Name",
      quantitySold: "Quantity Sold",
      grossRevenue: "Gross Revenue",
      saleDiscount: "Sale Discount",
      cogs: "COGS",
      margin: "Margin",
      supplier: "Supplier",
      purchaseCount: "Purchases",
      totalAmount: "Total Amount",
      quantityOrdered: "Quantity Ordered",
      totalCost: "Total Cost",

      noData: "No data available.",
      percentage: "Percentage",
      marginPercent: "Margin %",
      grossMarginPercent: "Gross Margin %",
    },

    transactions: {
      title: "Transactions",
      subtitle: "View inventory transaction history.",

      inventoryTransactions: "Inventory Transactions",

      inventoryTransactionsDescription: "Complete history of stock movements.",

      loading: "Loading transactions...",

      noTransactions: "No transactions found.",

      unableToLoad: "Unable to load transactions.",

      date: "Date",
      type: "Type",
      medicine: "Medicine",
      batch: "Batch",
      quantity: "Quantity",
      reason: "Reason",
      createdBy: "Created By",

      unknownMedicine: "Unknown medicine",
    },
  },

  ar: {
    common: {
      language: "اللغة",
      english: "الإنجليزية",
      arabic: "العربية",
      save: "حفظ",
      cancel: "إلغاء",
      delete: "حذف",
      edit: "تعديل",
      add: "إضافة",
      search: "بحث",
      loading: "جارٍ تحميل التطبيق...",
      close: "إغلاق",
      confirm: "تأكيد",
      loggedInAs: "تم تسجيل الدخول باسم",
      signOut: "تسجيل الخروج",
    },

    navigation: {
      dashboard: "لوحة التحكم",
      medicines: "الأدوية",
      inventory: "المخزون",
      purchases: "المشتريات",
      sales: "المبيعات",
      patients: "المرضى",
      suppliers: "الموردون",
      prescriptions: "الوصفات الطبية",
      transactions: "المعاملات",
      reports: "التقارير",
    },

    dashboard: {
      title: "لوحة التحكم",
      description: "نظرة عامة على عمليات الصيدلية.",
      loading: "جارٍ تحميل لوحة التحكم...",

      errors: {
        loadFailed: "تعذر تحميل لوحة التحكم.",
      },

      stats: {
        totalMedicines: "إجمالي الأدوية",
        totalMedicinesDescription: "الأدوية النشطة",
        totalStock: "إجمالي المخزون",
        totalStockDescription: "الوحدات في المخزون",
        lowStock: "انخفاض المخزون",
        lowStockDescription: "يحتاج إلى انتباه",
        expiringSoon: "تنتهي صلاحيتها قريبًا",
        expiringSoonDescription: "خلال 90 يومًا",
      },

      sales: {
        todaySales: "مبيعات اليوم",
        todaySalesDescription: "المبيعات المكتملة اليوم",
        todayRevenue: "إيرادات اليوم",
        todayRevenueDescription: "الإيرادات المحققة اليوم",
      },

      inventory: {
        title: "نظرة عامة على المخزون",
        description: "حالة المخزون الحالية.",
        viewInventory: "عرض المخزون",
        totalStock: "إجمالي المخزون",
        lowStockMedicines: "الأدوية منخفضة المخزون",
        expiringInventory: "المخزون الذي تنتهي صلاحيته قريبًا",
        expiredInventory: "المخزون منتهي الصلاحية",
      },

      transactions: {
        title: "المعاملات الأخيرة",
        description: "أحدث أنشطة المخزون.",
        viewAll: "عرض الكل",
        medicineTransaction: "معاملة دواء",
        noTransactions: "لا توجد معاملات حديثة.",
      },
    },

    medicines: {
      title: "الأدوية",
      description: "إدارة الأدوية المتوفرة في الصيدلية.",
      addMedicine: "إضافة دواء",
      searchPlaceholder: "البحث عن الأدوية...",
      medicineCount: "دواء",
      medicineCountPlural: "أدوية",

      list: {
        title: "قائمة الأدوية",
        description: "الأدوية النشطة المسجلة في الصيدلية.",
        loading: "جارٍ تحميل الأدوية...",
        noMedicines: "لم يتم العثور على أدوية",
        tryDifferentSearch: "حاول البحث باستخدام كلمة أخرى.",
        noRegisteredMedicines: "لم يتم تسجيل أي أدوية حتى الآن.",
      },

      fields: {
        medicine: "الدواء",
        category: "الفئة",
        dosage: "الجرعة",
        unit: "الوحدة",
        price: "السعر",
        reorder: "إعادة الطلب",
        type: "النوع",
        actions: "الإجراءات",
        medicineName: "اسم الدواء",
        genericName: "الاسم العلمي",
        brandName: "الاسم التجاري",
        manufacturer: "الشركة المصنعة",
        dosageForm: "الشكل الدوائي",
        strength: "التركيز",
        baseUnit: "الوحدة الأساسية",
        prescriptionType: "نوع الوصفة",
        sellingPrice: "سعر البيع",
        reorderLevel: "حد إعادة الطلب",
        barcode: "الباركود",
        notes: "ملاحظات",
      },

      actions: {
        view: "عرض",
        addMedicine: "إضافة دواء",
        editMedicine: "تعديل الدواء",
        createMedicine: "إنشاء الدواء",
        saveChanges: "حفظ التغييرات",
        close: "إغلاق",
        cancel: "إلغاء",
        edit: "تعديل",
      },

      forms: {
        basicInformation: "المعلومات الأساسية",
        medicineDetails: "تفاصيل الدواء",
        pricingInventory: "السعر والمخزون",

        registerDescription: "تسجيل دواء جديد في الصيدلية.",

        updateDescription: "تحديث معلومات الدواء.",

        viewDescription: "عرض معلومات الدواء وتفاصيل المخزون.",

        selectCategory: "اختر الفئة",
        loadingCategories: "جارٍ تحميل الفئات...",

        noGenericName: "لا يوجد اسم علمي",
        noNotes: "لا توجد ملاحظات",

        optional: "اختياري",

        placeholders: {
          medicineName: "مثال: أموكسيسيلين 500 ملغ",
          genericName: "مثال: أموكسيسيلين",
          dosageForm: "مثال: كبسولة",
          strength: "مثال: 500 ملغ",
          baseUnit: "مثال: كبسولة",
          sellingPrice: "3000",
          reorderLevel: "10",
          notes: "ملاحظات اختيارية عن هذا الدواء...",
        },
      },

      prescription: {
        otc: "بدون وصفة",
        prescription: "بوصفة طبية",
        controlled: "دواء خاضع للرقابة",

        otcArabic: "بدون وصفة طبية",
        prescriptionArabic: "وصفة طبية",
        controlledArabic: "دواء خاضع للرقابة",
      },

      validation: {
        required:
          "الفئة والاسم والشكل الدوائي والوحدة الأساسية وسعر البيع مطلوبة.",

        price: "يجب أن يكون سعر البيع رقمًا صالحًا وموجبًا.",

        reorder: "يجب أن يكون حد إعادة الطلب رقمًا صالحًا.",

        noMedicineSelected: "لم يتم اختيار دواء للتعديل.",
      },

      errors: {
        retrieveMedicines: "تعذر استرداد الأدوية.",
        retrieveCategories: "تعذر استرداد الفئات.",
        retrieveMedicine: "تعذر استرداد الدواء.",
        createMedicine: "تعذر إنشاء الدواء.",
        updateMedicine: "تعذر تحديث الدواء.",
      },

      details: {
        title: "تفاصيل الدواء",
        description: "عرض معلومات الدواء وتفاصيل المخزون.",
      },
    },

    inventory: {
      title: "المخزون",

      description: "إدارة دفعات الأدوية والمخزون الحالي.",

      loading: "جارٍ تحميل المخزون...",

      stats: {
        batches: "دفعات المخزون",
        batchesDescription: "الدفعات النشطة",

        totalStock: "إجمالي المخزون",
        totalStockDescription: "الوحدات المتاحة حاليًا",

        lowStock: "دفعات منخفضة المخزون",
        lowStockDescription: "تحتاج إلى الانتباه",
      },

      table: {
        title: "المخزون الحالي",
        description: "دفعات الأدوية المتاحة حاليًا في الصيدلية.",
      },

      fields: {
        medicine: "الدواء",
        batch: "الدفعة",
        stock: "المخزون",
        received: "المستلم",
        expiry: "انتهاء الصلاحية",
        status: "الحالة",
      },

      status: {
        lowStock: "مخزون منخفض",
        inStock: "متوفر",
      },

      empty: {
        title: "لم يتم العثور على مخزون.",
        description: "لا توجد حاليًا دفعات تحتوي على مخزون متاح.",
      },

      actions: {
        adjust: "تعديل",
        cancel: "إلغاء",
        saving: "جارٍ الحفظ...",
        saveAdjustment: "حفظ التعديل",
      },

      adjustment: {
        label: "تعديل المخزون",
        batch: "الدفعة",
        currentStock: "المخزون الحالي",
        quantity: "كمية التعديل",

        quantityHelp:
          "استخدم رقمًا موجبًا لإضافة المخزون أو رقمًا سالبًا لإزالة المخزون.",

        quantityPlaceholder: "مثال: -5 أو 10",

        reason: "السبب",

        reasonPlaceholder: "مثال: تلف 5 وحدات",
      },

      validation: {
        quantity: "يجب أن تكون كمية التعديل عددًا صحيحًا غير صفري.",
        reason: "سبب التعديل مطلوب.",
      },

      errors: {
        load: "تعذر تحميل المخزون.",
        adjust: "تعذر تعديل المخزون.",
      },
    },

    purchases: {
      title: "المشتريات",

      description: "إدارة أوامر الشراء واستلام الأدوية في المخزون.",

      loading: "جارٍ تحميل المشتريات...",

      unknownSupplier: "مورد غير معروف",

      unknownMedicine: "دواء غير معروف",

      fields: {
        date: "التاريخ",
        purchaseNumber: "رقم الشراء",
        purchaseNumberRequired: "رقم الشراء *",
        supplier: "المورد",
        supplierRequired: "المورد *",
        items: "العناصر",
        total: "الإجمالي",
        purchaseTotal: "إجمالي الشراء",
        status: "الحالة",
        actions: "الإجراءات",

        expectedDate: "التاريخ المتوقع",
        notes: "ملاحظات",

        medicine: "الدواء",
        quantity: "الكمية",
        unitCost: "تكلفة الوحدة",
        lineTotal: "إجمالي البند",

        receiptNumberRequired: "رقم الاستلام *",
        quantityReceivedRequired: "الكمية المستلمة *",
        batchNumberRequired: "رقم الدفعة *",
        expiryDateRequired: "تاريخ انتهاء الصلاحية *",
      },

      status: {
        received: "تم الاستلام",
        partiallyReceived: "تم الاستلام جزئيًا",
        cancelled: "ملغى",
        draft: "مسودة",
      },

      list: {
        title: "أوامر الشراء",
        description: "أوامر الشراء المسجلة في الصيدلية.",
      },

      empty: {
        title: "لم يتم العثور على مشتريات.",
        description: "لم يتم إنشاء أي أوامر شراء حتى الآن.",
      },

      actions: {
        createPurchase: "إنشاء عملية شراء",
        addItem: "إضافة عنصر",
        remove: "إزالة",
        receive: "استلام",
        noAction: "لا يوجد إجراء",
        creating: "جارٍ الإنشاء...",
        receiving: "جارٍ الاستلام...",
        receivePurchase: "استلام الشراء",
      },

      create: {
        title: "إنشاء عملية شراء",
        description: "إنشاء أمر شراء جديد للصيدلية.",

        purchaseInformation: "معلومات الشراء",

        purchaseItems: "عناصر الشراء",

        purchaseItemsDescription:
          "أضف الأدوية والكميات الموجودة في عملية الشراء هذه.",
      },

      receive: {
        title: "استلام الشراء",

        description: "استلام الأدوية من أمر الشراء",

        receiptInformation: "معلومات الاستلام",

        itemsReceived: "العناصر المستلمة",

        itemsReceivedDescription:
          "أدخل الكمية المستلمة ورقم الدفعة وتاريخ انتهاء الصلاحية لكل دواء.",

        orderedQuantity: "الكمية المطلوبة",
      },

      placeholders: {
        purchaseNumber: "مثال: PO-2026-001",
        selectSupplier: "اختر المورد",
        selectMedicine: "اختر الدواء",
        optionalNotes: "ملاحظات اختيارية",
        receiptNumber: "مثال: GR-2026-001",
        batchNumber: "مثال: BATCH-001",
      },

      validation: {
        supplier: "المورد مطلوب.",

        purchaseNumber: "رقم الشراء مطلوب.",

        items: "يجب إضافة عنصر شراء واحد على الأقل.",

        medicine: "يرجى اختيار دواء لكل عنصر من عناصر الشراء.",

        quantity: "يجب أن تكون الكمية المطلوبة أكبر من صفر.",

        unitCost: "يجب أن تكون تكلفة الوحدة رقمًا صالحًا وغير سالب.",

        noPurchase: "لم يتم اختيار عملية شراء.",

        receiptNumber: "رقم الاستلام مطلوب.",

        receiptItems: "يجب استلام عنصر واحد على الأقل.",

        invalidItem: "عنصر شراء غير صالح.",

        batchRequired: "رقم الدفعة مطلوب للدواء {medicine}.",

        expiryRequired: "تاريخ انتهاء الصلاحية مطلوب للدواء {medicine}.",

        receivedQuantity:
          "يجب أن تكون الكمية المستلمة أكبر من صفر للدواء {medicine}.",

        quantityExceeded:
          "لا يمكن أن تتجاوز الكمية المستلمة الكمية المطلوبة للدواء {medicine}.",
      },

      errors: {
        load: "تعذر تحميل المشتريات.",
        create: "تعذر إنشاء عملية الشراء.",
        receive: "تعذر استلام عملية الشراء.",
      },
    },

    suppliers: {
      title: "الموردون",

      description: "إدارة موردي الأدوية في الصيدلية.",

      loading: "جارٍ تحميل الموردين...",

      actions: {
        add: "إضافة مورد",
        saving: "جارٍ الحفظ...",
        saveChanges: "حفظ التغييرات",
        create: "إنشاء مورد",
        updating: "جارٍ التحديث...",
        activate: "تفعيل",
        deactivate: "إلغاء التفعيل",
      },

      form: {
        addTitle: "إضافة مورد",
        editTitle: "تعديل المورد",

        addDescription: "أدخل معلومات المورد أدناه.",

        editDescription: "تحديث معلومات المورد.",
      },

      fields: {
        name: "اسم المورد",
        contactPerson: "الشخص المسؤول",
        phone: "الهاتف",
        email: "البريد الإلكتروني",
        address: "العنوان",
        notes: "ملاحظات",
      },

      placeholders: {
        name: "اسم المورد",
        contactPerson: "الشخص المسؤول",
        phone: "رقم الهاتف",
        email: "supplier@example.com",
        address: "عنوان المورد",
        notes: "ملاحظات اختيارية",
      },

      directory: {
        title: "دليل الموردين",

        description: "عرض وإدارة موردي الصيدلية.",
      },

      table: {
        supplier: "المورد",
        contact: "جهة الاتصال",
        phone: "الهاتف",
        email: "البريد الإلكتروني",
        status: "الحالة",
        actions: "الإجراءات",
      },

      status: {
        active: "نشط",
        inactive: "غير نشط",
      },

      empty: {
        title: "لم يتم العثور على موردين",

        description: "أضف أول مورد للبدء.",
      },

      confirm: {
        status: "هل أنت متأكد أنك تريد",
      },

      messages: {
        created: "تم إنشاء المورد بنجاح.",
        updated: "تم تحديث المورد بنجاح.",
        activated: "تم تفعيل المورد بنجاح.",
        deactivated: "تم إلغاء تفعيل المورد بنجاح.",
      },

      errors: {
        load: "تعذر تحميل الموردين.",
        save: "تعذر حفظ المورد.",
        status: "تعذر تحديث حالة المورد.",
        nameRequired: "اسم المورد مطلوب.",
      },
    },

    prescriptions: {
      title: "الوصفات الطبية",

      subtitle: "إدارة وصفات المرضى والأدوية الموصوفة.",

      create: "إنشاء وصفة طبية",

      history: "سجل الوصفات الطبية",

      historyDescription: "عرض الوصفات الطبية التي تم إنشاؤها لصيدليتك.",

      date: "التاريخ",

      prescription: "الوصفة الطبية",

      patient: "المريض",

      prescriber: "الطبيب الواصف",

      items: "الأدوية",

      status: "الحالة",

      action: "الإجراء",

      view: "عرض",

      loading: "جارٍ تحميل الوصفات الطبية...",

      noPrescriptions: "لم يتم العثور على وصفات طبية",

      noPrescriptionsDescription: "أنشئ أول وصفة طبية لك لتظهر هنا.",

      details: "تفاصيل الوصفة الطبية",

      detailsDescription: "تفاصيل الوصفة الطبية والأدوية الموصوفة.",

      information: "معلومات الوصفة الطبية",

      prescriptionNumber: "رقم الوصفة الطبية",

      prescriptionDate: "تاريخ الوصفة الطبية",

      prescribedMedicines: "الأدوية الموصوفة",

      prescribedMedicinesDescription: "الأدوية الموجودة في هذه الوصفة الطبية.",

      medicine: "الدواء",

      prescribed: "الكمية الموصوفة",

      dispensed: "الكمية المصروفة",

      directions: "طريقة الاستخدام",

      notes: "ملاحظات",

      created: "تم الإنشاء",

      backToPrescriptions: "العودة إلى الوصفات الطبية",

      dispense: "صرف الوصفة الطبية",

      dispenseRemaining: "صرف الكمية المتبقية",

      dispensing: "جارٍ صرف الوصفة...",

      cancelPrescription: "إلغاء الوصفة الطبية",

      cancelling: "جارٍ الإلغاء...",

      pending: "قيد الانتظار",

      partiallyDispensed: "مصروفة جزئيًا",

      dispensedStatus: "تم صرفها",

      cancelled: "ملغاة",

      unknownPatient: "مريض غير معروف",

      unknownMedicine: "دواء غير معروف",

      invalidId: "معرّف الوصفة الطبية غير صالح",

      notFound: "لم يتم العثور على الوصفة الطبية",

      unableToLoad: "تعذر تحميل الوصفة الطبية",

      invalidResponse: "استجابة الوصفة الطبية غير صالحة",

      invalidDispenseResponse: "استجابة صرف الوصفة غير صالحة",

      invalidStatusResponse: "استجابة تحديث حالة الوصفة غير صالحة",

      dispenseConfirm:
        "هل أنت متأكد من أنك تريد صرف هذه الوصفة الطبية؟\n\nسيتم خصم الأدوية الموصوفة من المخزون.",

      cancelConfirm: "هل أنت متأكد من أنك تريد إلغاء هذه الوصفة الطبية؟",

      dispenseSuccess: "تم صرف الوصفة الطبية بنجاح.",

      cancelSuccess: "تم إلغاء الوصفة الطبية بنجاح.",
    },

    reports: {
      title: "التقارير",
      refresh: "تحديث",
      reportPeriod: "فترة التقرير",
      selectDateRange: "حدد نطاق التاريخ للتقرير التحليلي.",
      invalidDateRange: "لا يمكن أن يكون تاريخ البدء بعد تاريخ الانتهاء.",
      salesPerformance: "أداء المبيعات للفترة المحددة.",
      completedTransactions: "المعاملات المكتملة",
      completedSaleRevenue: "إجمالي إيرادات المبيعات المكتملة",
      averageSale: "متوسط البيع",
      saleLevelDiscounts: "خصومات على مستوى البيع",
      dailyRevenue: "الإيرادات اليومية خلال الفترة المحددة.",
      noSalesData: "لا توجد بيانات مبيعات لهذه الفترة.",
      grossProfitability: "الربحية الإجمالية للفترة المحددة.",
      revenueBeforeTax: "الإيرادات قبل الضريبة",
      medicineSalesDescription: "الإيرادات والتكلفة والربحية حسب الدواء.",
      noMedicineSales: "لا توجد مبيعات أدوية لهذه الفترة.",
      quantitySoldShort: "الكمية المباعة",
      salesByPaymentMethod: "المبيعات حسب طريقة الدفع",
      paymentDistribution: "توزيع الإيرادات حسب طريقة الدفع.",
      noPaymentData: "لا توجد بيانات دفع لهذه الفترة.",
      paymentDetails: "تفاصيل الدفع",
      transactionPaymentDescription: "عدد المعاملات وقيمة المدفوعات.",
      purchaseAnalysis: "تحليل المشتريات",
      purchaseDescription: "نشاط المشتريات خلال الفترة المحددة.",
      purchases: "المشتريات",
      purchaseValue: "قيمة المشتريات",
      supplierPurchaseDescription:
        "نشاط الشراء من الموردين خلال الفترة المحددة.",
      noSupplierPurchases: "لا توجد مشتريات من الموردين لهذه الفترة.",
      medicinePurchaseDescription:
        "الأدوية التي تم شراؤها خلال الفترة المحددة.",
      noMedicinePurchases: "لا توجد مشتريات أدوية لهذه الفترة.",
      reportFrom: "من تاريخ التقرير",
      reportTo: "إلى تاريخ التقرير",
      profitMarginAnalysis: "تحليل الربح والهامش",
      grossProfitShort: "الربح",
      metric: "المؤشر",
      value: "القيمة",
      pdfTitle: "التقرير التحليلي للصيدلية",
      pharmacyManagementSystem: "نظام إدارة الصيدلية",
      page: "صفحة",
      of: "من",
      cash: "نقدًا",
      card: "بطاقة",
      bankTransfer: "تحويل بنكي",
      qris: "QRIS",
      eWallet: "محفظة إلكترونية",
      description: "تحليل المبيعات والإيرادات والمشتريات والربحية.",
      loading: "جارٍ تحميل التقارير التحليلية...",
      error: "تعذر تحميل التقارير التحليلية.",
      dateRange: "نطاق التاريخ",
      from: "من",
      to: "إلى",
      applyFilter: "تطبيق الفلتر",
      tryAgain: "حاول مرة أخرى",
      exportExcel: "تصدير Excel",
      exportPdf: "تصدير PDF",
      refreshing: "جارٍ التحديث...",

      salesSummary: "ملخص المبيعات",
      totalSales: "إجمالي المبيعات",
      subtotal: "المجموع الفرعي",
      discounts: "الخصومات",
      tax: "الضريبة",
      revenue: "الإيرادات",
      netRevenueBeforeTax: "صافي الإيرادات قبل الضريبة",
      averageSaleValue: "متوسط قيمة البيع",

      profitMargin: "الربح والهامش",
      costOfGoodsSold: "تكلفة البضائع المباعة",
      grossProfit: "إجمالي الربح",
      grossMargin: "هامش الربح الإجمالي",

      purchaseSummary: "ملخص المشتريات",
      totalPurchases: "إجمالي المشتريات",
      totalPurchaseAmount: "إجمالي مبلغ المشتريات",
      draft: "مسودة",
      ordered: "تم الطلب",
      partiallyReceived: "تم الاستلام جزئيًا",
      received: "تم الاستلام",
      cancelled: "ملغاة",

      revenueTrend: "اتجاه الإيرادات",
      paymentMethods: "طرق الدفع",
      salesByMedicine: "المبيعات حسب الدواء",
      purchasesBySupplier: "المشتريات حسب المورد",
      purchasesByMedicine: "المشتريات حسب الدواء",

      date: "التاريخ",
      sales: "المبيعات",
      paymentMethod: "طريقة الدفع",
      amount: "المبلغ",
      transactions: "المعاملات",
      medicine: "الدواء",
      genericName: "الاسم العلمي",
      quantitySold: "الكمية المباعة",
      grossRevenue: "إجمالي الإيرادات",
      saleDiscount: "خصم البيع",
      cogs: "تكلفة البضائع المباعة",
      margin: "الهامش",
      supplier: "المورد",
      purchaseCount: "المشتريات",
      totalAmount: "المبلغ الإجمالي",
      quantityOrdered: "الكمية المطلوبة",
      totalCost: "التكلفة الإجمالية",

      noData: "لا توجد بيانات متاحة.",
      percentage: "النسبة المئوية",
      marginPercent: "نسبة الهامش %",
      grossMarginPercent: "نسبة هامش الربح الإجمالي %",
    },

    transactions: {
      title: "المعاملات",

      subtitle: "عرض سجل معاملات المخزون.",

      inventoryTransactions: "معاملات المخزون",

      inventoryTransactionsDescription: "السجل الكامل لحركات المخزون.",

      loading: "جارٍ تحميل المعاملات...",

      noTransactions: "لم يتم العثور على معاملات.",

      unableToLoad: "تعذر تحميل المعاملات.",

      date: "التاريخ",

      type: "النوع",

      medicine: "الدواء",

      batch: "الدفعة",

      quantity: "الكمية",

      reason: "السبب",

      createdBy: "تم الإنشاء بواسطة",

      unknownMedicine: "دواء غير معروف",
    },
  },
} as const;

/* =========================================================
   TRANSLATION KEYS
   ========================================================= */

type TranslationKey =
  | "common.language"
  | "common.english"
  | "common.arabic"
  | "common.save"
  | "common.cancel"
  | "common.delete"
  | "common.edit"
  | "common.add"
  | "common.search"
  | "common.loading"
  | "common.close"
  | "common.confirm"
  | "common.loggedInAs"
  | "common.signOut"
  | "navigation.dashboard"
  | "navigation.medicines"
  | "navigation.inventory"
  | "navigation.purchases"
  | "navigation.sales"
  | "navigation.patients"
  | "navigation.suppliers"
  | "navigation.prescriptions"
  | "navigation.transactions"
  | "navigation.reports"
  | "dashboard.title"
  | "dashboard.description"
  | "dashboard.loading"
  | "dashboard.errors.loadFailed"
  | "dashboard.stats.totalMedicines"
  | "dashboard.stats.totalMedicinesDescription"
  | "dashboard.stats.totalStock"
  | "dashboard.stats.totalStockDescription"
  | "dashboard.stats.lowStock"
  | "dashboard.stats.lowStockDescription"
  | "dashboard.stats.expiringSoon"
  | "dashboard.stats.expiringSoonDescription"
  | "dashboard.sales.todaySales"
  | "dashboard.sales.todaySalesDescription"
  | "dashboard.sales.todayRevenue"
  | "dashboard.sales.todayRevenueDescription"
  | "dashboard.inventory.title"
  | "dashboard.inventory.description"
  | "dashboard.inventory.viewInventory"
  | "dashboard.inventory.totalStock"
  | "dashboard.inventory.lowStockMedicines"
  | "dashboard.inventory.expiringInventory"
  | "dashboard.inventory.expiredInventory"
  | "dashboard.transactions.title"
  | "dashboard.transactions.description"
  | "dashboard.transactions.viewAll"
  | "dashboard.transactions.medicineTransaction"
  | "dashboard.transactions.noTransactions"
  | "medicines.title"
  | "medicines.description"
  | "medicines.addMedicine"
  | "medicines.searchPlaceholder"
  | "medicines.medicineCount"
  | "medicines.medicineCountPlural"
  | "medicines.list.title"
  | "medicines.list.description"
  | "medicines.list.loading"
  | "medicines.list.noMedicines"
  | "medicines.list.tryDifferentSearch"
  | "medicines.list.noRegisteredMedicines"
  | "medicines.fields.medicine"
  | "medicines.fields.category"
  | "medicines.fields.dosage"
  | "medicines.fields.unit"
  | "medicines.fields.price"
  | "medicines.fields.reorder"
  | "medicines.fields.type"
  | "medicines.fields.actions"
  | "medicines.fields.medicineName"
  | "medicines.fields.genericName"
  | "medicines.fields.brandName"
  | "medicines.fields.manufacturer"
  | "medicines.fields.dosageForm"
  | "medicines.fields.strength"
  | "medicines.fields.baseUnit"
  | "medicines.fields.prescriptionType"
  | "medicines.fields.sellingPrice"
  | "medicines.fields.reorderLevel"
  | "medicines.fields.barcode"
  | "medicines.fields.notes"
  | "medicines.actions.view"
  | "medicines.actions.addMedicine"
  | "medicines.actions.editMedicine"
  | "medicines.actions.createMedicine"
  | "medicines.actions.saveChanges"
  | "medicines.actions.close"
  | "medicines.actions.cancel"
  | "medicines.actions.edit"
  | "medicines.forms.basicInformation"
  | "medicines.forms.medicineDetails"
  | "medicines.forms.pricingInventory"
  | "medicines.forms.registerDescription"
  | "medicines.forms.updateDescription"
  | "medicines.forms.viewDescription"
  | "medicines.forms.selectCategory"
  | "medicines.forms.loadingCategories"
  | "medicines.forms.noGenericName"
  | "medicines.forms.noNotes"
  | "medicines.forms.optional"
  | "medicines.forms.placeholders.medicineName"
  | "medicines.forms.placeholders.genericName"
  | "medicines.forms.placeholders.dosageForm"
  | "medicines.forms.placeholders.strength"
  | "medicines.forms.placeholders.baseUnit"
  | "medicines.forms.placeholders.sellingPrice"
  | "medicines.forms.placeholders.reorderLevel"
  | "medicines.forms.placeholders.notes"
  | "medicines.prescription.otc"
  | "medicines.prescription.prescription"
  | "medicines.prescription.controlled"
  | "medicines.prescription.otcArabic"
  | "medicines.prescription.prescriptionArabic"
  | "medicines.prescription.controlledArabic"
  | "medicines.validation.required"
  | "medicines.validation.price"
  | "medicines.validation.reorder"
  | "medicines.validation.noMedicineSelected"
  | "medicines.errors.retrieveMedicines"
  | "medicines.errors.retrieveCategories"
  | "medicines.errors.retrieveMedicine"
  | "medicines.errors.createMedicine"
  | "medicines.errors.updateMedicine"
  | "medicines.details.title"
  | "medicines.details.description"
  | "inventory.title"
  | "inventory.description"
  | "inventory.loading"
  | "inventory.stats.batches"
  | "inventory.stats.batchesDescription"
  | "inventory.stats.totalStock"
  | "inventory.stats.totalStockDescription"
  | "inventory.stats.lowStock"
  | "inventory.stats.lowStockDescription"
  | "inventory.table.title"
  | "inventory.table.description"
  | "inventory.fields.medicine"
  | "inventory.fields.batch"
  | "inventory.fields.stock"
  | "inventory.fields.received"
  | "inventory.fields.expiry"
  | "inventory.fields.status"
  | "inventory.status.lowStock"
  | "inventory.status.inStock"
  | "inventory.empty.title"
  | "inventory.empty.description"
  | "inventory.actions.adjust"
  | "inventory.actions.cancel"
  | "inventory.actions.saving"
  | "inventory.actions.saveAdjustment"
  | "inventory.adjustment.label"
  | "inventory.adjustment.batch"
  | "inventory.adjustment.currentStock"
  | "inventory.adjustment.quantity"
  | "inventory.adjustment.quantityHelp"
  | "inventory.adjustment.quantityPlaceholder"
  | "inventory.adjustment.reason"
  | "inventory.adjustment.reasonPlaceholder"
  | "inventory.validation.quantity"
  | "inventory.validation.reason"
  | "inventory.errors.load"
  | "inventory.errors.adjust"
  | "purchases.title"
  | "purchases.description"
  | "purchases.loading"
  | "purchases.unknownSupplier"
  | "purchases.unknownMedicine"
  | "purchases.fields.date"
  | "purchases.fields.purchaseNumber"
  | "purchases.fields.purchaseNumberRequired"
  | "purchases.fields.supplier"
  | "purchases.fields.supplierRequired"
  | "purchases.fields.items"
  | "purchases.fields.total"
  | "purchases.fields.purchaseTotal"
  | "purchases.fields.status"
  | "purchases.fields.actions"
  | "purchases.fields.expectedDate"
  | "purchases.fields.notes"
  | "purchases.fields.medicine"
  | "purchases.fields.quantity"
  | "purchases.fields.unitCost"
  | "purchases.fields.lineTotal"
  | "purchases.fields.receiptNumberRequired"
  | "purchases.fields.quantityReceivedRequired"
  | "purchases.fields.batchNumberRequired"
  | "purchases.fields.expiryDateRequired"
  | "purchases.status.received"
  | "purchases.status.partiallyReceived"
  | "purchases.status.cancelled"
  | "purchases.status.draft"
  | "purchases.list.title"
  | "purchases.list.description"
  | "purchases.empty.title"
  | "purchases.empty.description"
  | "purchases.actions.createPurchase"
  | "purchases.actions.addItem"
  | "purchases.actions.remove"
  | "purchases.actions.receive"
  | "purchases.actions.noAction"
  | "purchases.actions.creating"
  | "purchases.actions.receiving"
  | "purchases.actions.receivePurchase"
  | "purchases.create.title"
  | "purchases.create.description"
  | "purchases.create.purchaseInformation"
  | "purchases.create.purchaseItems"
  | "purchases.create.purchaseItemsDescription"
  | "purchases.receive.title"
  | "purchases.receive.description"
  | "purchases.receive.receiptInformation"
  | "purchases.receive.itemsReceived"
  | "purchases.receive.itemsReceivedDescription"
  | "purchases.receive.orderedQuantity"
  | "purchases.placeholders.purchaseNumber"
  | "purchases.placeholders.selectSupplier"
  | "purchases.placeholders.selectMedicine"
  | "purchases.placeholders.optionalNotes"
  | "purchases.placeholders.receiptNumber"
  | "purchases.placeholders.batchNumber"
  | "purchases.validation.supplier"
  | "purchases.validation.purchaseNumber"
  | "purchases.validation.items"
  | "purchases.validation.medicine"
  | "purchases.validation.quantity"
  | "purchases.validation.unitCost"
  | "purchases.validation.noPurchase"
  | "purchases.validation.receiptNumber"
  | "purchases.validation.receiptItems"
  | "purchases.validation.invalidItem"
  | "purchases.validation.batchRequired"
  | "purchases.validation.expiryRequired"
  | "purchases.validation.receivedQuantity"
  | "purchases.validation.quantityExceeded"
  | "purchases.errors.load"
  | "purchases.errors.create"
  | "purchases.errors.receive"
  | "suppliers.title"
  | "suppliers.description"
  | "suppliers.loading"
  | "suppliers.actions.add"
  | "suppliers.actions.saving"
  | "suppliers.actions.saveChanges"
  | "suppliers.actions.create"
  | "suppliers.actions.updating"
  | "suppliers.actions.activate"
  | "suppliers.actions.deactivate"
  | "suppliers.form.addTitle"
  | "suppliers.form.editTitle"
  | "suppliers.form.addDescription"
  | "suppliers.form.editDescription"
  | "suppliers.fields.name"
  | "suppliers.fields.contactPerson"
  | "suppliers.fields.phone"
  | "suppliers.fields.email"
  | "suppliers.fields.address"
  | "suppliers.fields.notes"
  | "suppliers.placeholders.name"
  | "suppliers.placeholders.contactPerson"
  | "suppliers.placeholders.phone"
  | "suppliers.placeholders.email"
  | "suppliers.placeholders.address"
  | "suppliers.placeholders.notes"
  | "suppliers.directory.title"
  | "suppliers.directory.description"
  | "suppliers.table.supplier"
  | "suppliers.table.contact"
  | "suppliers.table.phone"
  | "suppliers.table.email"
  | "suppliers.table.status"
  | "suppliers.table.actions"
  | "suppliers.status.active"
  | "suppliers.status.inactive"
  | "suppliers.empty.title"
  | "suppliers.empty.description"
  | "suppliers.confirm.status"
  | "suppliers.messages.created"
  | "suppliers.messages.updated"
  | "suppliers.messages.activated"
  | "suppliers.messages.deactivated"
  | "suppliers.errors.load"
  | "suppliers.errors.save"
  | "suppliers.errors.status"
  | "suppliers.errors.nameRequired"
  | "prescriptions.title"
  | "prescriptions.subtitle"
  | "prescriptions.create"
  | "prescriptions.history"
  | "prescriptions.historyDescription"
  | "prescriptions.date"
  | "prescriptions.prescription"
  | "prescriptions.patient"
  | "prescriptions.prescriber"
  | "prescriptions.items"
  | "prescriptions.status"
  | "prescriptions.action"
  | "prescriptions.view"
  | "prescriptions.loading"
  | "prescriptions.noPrescriptions"
  | "prescriptions.noPrescriptionsDescription"
  | "prescriptions.details"
  | "prescriptions.detailsDescription"
  | "prescriptions.information"
  | "prescriptions.prescriptionNumber"
  | "prescriptions.prescriptionDate"
  | "prescriptions.prescribedMedicines"
  | "prescriptions.prescribedMedicinesDescription"
  | "prescriptions.medicine"
  | "prescriptions.prescribed"
  | "prescriptions.dispensed"
  | "prescriptions.directions"
  | "prescriptions.notes"
  | "prescriptions.created"
  | "prescriptions.backToPrescriptions"
  | "prescriptions.dispense"
  | "prescriptions.dispenseRemaining"
  | "prescriptions.dispensing"
  | "prescriptions.cancelPrescription"
  | "prescriptions.cancelling"
  | "prescriptions.pending"
  | "prescriptions.partiallyDispensed"
  | "prescriptions.dispensedStatus"
  | "prescriptions.cancelled"
  | "prescriptions.unknownPatient"
  | "prescriptions.unknownMedicine"
  | "prescriptions.invalidId"
  | "prescriptions.notFound"
  | "prescriptions.unableToLoad"
  | "prescriptions.invalidResponse"
  | "prescriptions.invalidDispenseResponse"
  | "prescriptions.invalidStatusResponse"
  | "prescriptions.dispenseConfirm"
  | "prescriptions.cancelConfirm"
  | "prescriptions.dispenseSuccess"
  | "prescriptions.cancelSuccess"
  | "reports.title"
  | "reports.refresh"
  | "reports.reportPeriod"
  | "reports.selectDateRange"
  | "reports.invalidDateRange"
  | "reports.salesPerformance"
  | "reports.completedTransactions"
  | "reports.completedSaleRevenue"
  | "reports.averageSale"
  | "reports.saleLevelDiscounts"
  | "reports.dailyRevenue"
  | "reports.noSalesData"
  | "reports.grossProfitability"
  | "reports.revenueBeforeTax"
  | "reports.medicineSalesDescription"
  | "reports.noMedicineSales"
  | "reports.quantitySoldShort"
  | "reports.salesByPaymentMethod"
  | "reports.paymentDistribution"
  | "reports.noPaymentData"
  | "reports.paymentDetails"
  | "reports.transactionPaymentDescription"
  | "reports.purchaseAnalysis"
  | "reports.purchaseDescription"
  | "reports.purchases"
  | "reports.purchaseValue"
  | "reports.supplierPurchaseDescription"
  | "reports.noSupplierPurchases"
  | "reports.medicinePurchaseDescription"
  | "reports.noMedicinePurchases"
  | "reports.reportFrom"
  | "reports.reportTo"
  | "reports.profitMarginAnalysis"
  | "reports.grossProfitShort"
  | "reports.metric"
  | "reports.value"
  | "reports.pdfTitle"
  | "reports.pharmacyManagementSystem"
  | "reports.page"
  | "reports.of"
  | "reports.cash"
  | "reports.card"
  | "reports.bankTransfer"
  | "reports.qris"
  | "reports.eWallet"
  | "reports.description"
  | "reports.loading"
  | "reports.error"
  | "reports.dateRange"
  | "reports.from"
  | "reports.to"
  | "reports.applyFilter"
  | "reports.tryAgain"
  | "reports.exportExcel"
  | "reports.exportPdf"
  | "reports.refreshing"
  | "reports.salesSummary"
  | "reports.totalSales"
  | "reports.subtotal"
  | "reports.discounts"
  | "reports.tax"
  | "reports.revenue"
  | "reports.netRevenueBeforeTax"
  | "reports.averageSaleValue"
  | "reports.profitMargin"
  | "reports.costOfGoodsSold"
  | "reports.grossProfit"
  | "reports.grossMargin"
  | "reports.purchaseSummary"
  | "reports.totalPurchases"
  | "reports.totalPurchaseAmount"
  | "reports.draft"
  | "reports.ordered"
  | "reports.partiallyReceived"
  | "reports.received"
  | "reports.cancelled"
  | "reports.revenueTrend"
  | "reports.paymentMethods"
  | "reports.salesByMedicine"
  | "reports.purchasesBySupplier"
  | "reports.purchasesByMedicine"
  | "reports.date"
  | "reports.sales"
  | "reports.paymentMethod"
  | "reports.amount"
  | "reports.transactions"
  | "reports.medicine"
  | "reports.genericName"
  | "reports.quantitySold"
  | "reports.grossRevenue"
  | "reports.saleDiscount"
  | "reports.cogs"
  | "reports.margin"
  | "reports.supplier"
  | "reports.purchaseCount"
  | "reports.totalAmount"
  | "reports.quantityOrdered"
  | "reports.totalCost"
  | "reports.noData"
  | "reports.percentage"
  | "reports.marginPercent"
  | "reports.grossMarginPercent"
  | "transactions.title"
  | "transactions.subtitle"
  | "transactions.inventoryTransactions"
  | "transactions.inventoryTransactionsDescription"
  | "transactions.loading"
  | "transactions.noTransactions"
  | "transactions.unableToLoad"
  | "transactions.date"
  | "transactions.type"
  | "transactions.medicine"
  | "transactions.batch"
  | "transactions.quantity"
  | "transactions.reason"
  | "transactions.createdBy"
  | "transactions.unknownMedicine";

/* =========================================================
   CONTEXT
   ========================================================= */

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

/* =========================================================
   TRANSLATION FUNCTION
   ========================================================= */

function getTranslation(language: Language, key: TranslationKey): string {
  const parts = key.split(".");

  let current: unknown = translations[language];

  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return key;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : key;
}

/* =========================================================
   PROVIDER
   ========================================================= */

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem(
      "pharmacy-language",
    ) as Language | null;

    if (savedLanguage === "en" || savedLanguage === "ar") {
      setLanguageState(savedLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;

    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  function setLanguage(language: Language) {
    setLanguageState(language);

    localStorage.setItem("pharmacy-language", language);
  }

  function t(key: TranslationKey) {
    return getTranslation(language, key);
  }

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

/* =========================================================
   HOOK
   ========================================================= */

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return context;
}
