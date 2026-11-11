import 'package:drift/drift.dart' as drift;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/uuid_generator.dart';
import '../../data/daos/medicine_dao.dart';
import '../../data/daos/purchase_dao.dart';
import '../../data/database/database.dart';
import '../../domain/enums/app_enums.dart';
import '../../providers/app_providers.dart';
import '../../providers/auth_provider.dart';
import '../../services/purchase_service.dart';
import '../shared/status_badge.dart';

class PurchasesPage extends ConsumerWidget {
  const PurchasesPage({super.key});

  void _showCreateSupplierDialog(BuildContext context, WidgetRef ref) {
    final loc = AppLocalizations.of(context);
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final addressCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(loc.t('addSupplier')),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Supplier / Distributor Name *',
                ),
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Wajib diisi' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: phoneCtrl,
                decoration: const InputDecoration(
                  labelText: 'No. Telepon / WhatsApp',
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: addressCtrl,
                decoration: const InputDecoration(labelText: 'Alamat'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(loc.t('cancel')),
          ),
          ElevatedButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              final pharmacyId =
                  ref.read(authStateProvider).currentPharmacy?.id ?? '';
              final supplierDao = ref.read(supplierDaoProvider);
              await supplierDao.insert(
                SuppliersCompanion(
                  id: drift.Value(UuidGenerator.v4()),
                  pharmacyId: drift.Value(pharmacyId),
                  name: drift.Value(nameCtrl.text.trim()),
                  phone: drift.Value(
                    phoneCtrl.text.trim().isEmpty
                        ? null
                        : phoneCtrl.text.trim(),
                  ),
                  address: drift.Value(
                    addressCtrl.text.trim().isEmpty
                        ? null
                        : addressCtrl.text.trim(),
                  ),
                  isActive: const drift.Value(true),
                  createdAt: drift.Value(DateTime.now()),
                  updatedAt: drift.Value(DateTime.now()),
                ),
              );
              if (context.mounted) Navigator.pop(ctx);
            },
            child: Text(loc.t('save')),
          ),
        ],
      ),
    );
  }

  void _showReceiveGoodsDialog(
    BuildContext context,
    WidgetRef ref,
    PurchaseWithDetails purchase,
  ) {
    final loc = AppLocalizations.of(context);
    final formKey = GlobalKey<FormState>();
    final receiptNumCtrl = TextEditingController();
    final List<_ReceiveRowData> receiveRows = purchase.items.map((it) {
      return _ReceiveRowData(
        purchaseItem: it,
        batchCtrl: TextEditingController(),
        expiryDate: DateTime.now().add(const Duration(days: 365)),
        qtyCtrl: TextEditingController(
          text: it.item.orderedQuantity.toString(),
        ),
        costCtrl: TextEditingController(text: it.item.unitCost.toString()),
      );
    }).toList();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          title: Text(
            '${loc.t('receiveGoodsTitle')} ${purchase.purchase.purchaseNumber}',
          ),
          content: SizedBox(
            width: 700,
            child: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextFormField(
                      controller: receiptNumCtrl,
                      decoration: const InputDecoration(
                        labelText: 'No. Surat Jalan / Faktur Supplier *',
                      ),
                      validator: (v) =>
                          v == null || v.trim().isEmpty ? 'Wajib diisi' : null,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Daftar Barang Masuk & Nomor Batch:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    ...receiveRows.map((row) {
                      return Card(
                        margin: const EdgeInsets.symmetric(vertical: 6),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${row.purchaseItem.medicine.name} (Pesan: ${AppFormatters.quantity(row.purchaseItem.item.orderedQuantity)})',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(
                                    flex: 2,
                                    child: TextFormField(
                                      controller: row.batchCtrl,
                                      decoration: const InputDecoration(
                                        labelText: 'No. Batch *',
                                      ),
                                      validator: (v) =>
                                          v == null || v.trim().isEmpty
                                          ? 'Wajib'
                                          : null,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    flex: 2,
                                    child: InkWell(
                                      onTap: () async {
                                        final picked = await showDatePicker(
                                          context: ctx,
                                          initialDate: row.expiryDate,
                                          firstDate: DateTime.now(),
                                          lastDate: DateTime(2040),
                                        );
                                        if (picked != null) {
                                          setDlgState(
                                            () => row.expiryDate = picked,
                                          );
                                        }
                                      },
                                      child: InputDecorator(
                                        decoration: const InputDecoration(
                                          labelText: 'Exp Date *',
                                        ),
                                        child: Text(
                                          AppFormatters.date(row.expiryDate),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    flex: 1,
                                    child: TextFormField(
                                      controller: row.qtyCtrl,
                                      keyboardType: TextInputType.number,
                                      decoration: const InputDecoration(
                                        labelText: 'Qty *',
                                      ),
                                      validator: (v) =>
                                          double.tryParse(v ?? '') == null
                                          ? 'Valid'
                                          : null,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    flex: 2,
                                    child: TextFormField(
                                      controller: row.costCtrl,
                                      keyboardType: TextInputType.number,
                                      decoration: const InputDecoration(
                                        labelText: 'Purchase Price (SDG) *',
                                      ),
                                      validator: (v) =>
                                          double.tryParse(v ?? '') == null
                                          ? 'Valid'
                                          : null,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(loc.t('cancel')),
            ),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                final authState = ref.read(authStateProvider);
                final pharmacyId = authState.currentPharmacy?.id ?? '';
                final userId = authState.currentUser?.id ?? '';

                final purchaseService = ref.read(purchaseServiceProvider);
                final receiveInputs = receiveRows.map((r) {
                  return ReceiveItemInput(
                    purchaseItemId: r.purchaseItem.item.id,
                    medicineId: r.purchaseItem.medicine.id,
                    batchNumber: r.batchCtrl.text.trim(),
                    expiryDate: r.expiryDate,
                    quantityReceived: double.parse(r.qtyCtrl.text.trim()),
                    unitCost: double.parse(r.costCtrl.text.trim()),
                  );
                }).toList();

                try {
                  await purchaseService.receiveGoods(
                    purchaseId: purchase.purchase.id,
                    pharmacyId: pharmacyId,
                    receiptNumber: receiptNumCtrl.text.trim(),
                    receivedById: userId,
                    items: receiveInputs,
                  );
                  if (context.mounted) Navigator.pop(ctx);
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(e.toString()),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              },
              child: const Text('Save & Add to Stock'),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreatePoDialog(
    BuildContext context,
    WidgetRef ref,
    List<Supplier> suppliers,
    List<MedicineWithCategory> medicines,
  ) {
    final loc = AppLocalizations.of(context);
    if (suppliers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(loc.t('supplierAddedFirst')),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }
    if (medicines.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(loc.t('medicineAddedFirst')),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final formKey = GlobalKey<FormState>();
    String selectedSupplierId = suppliers.first.id;
    String selectedMedicineId = medicines.first.medicine.id;
    final qtyCtrl = TextEditingController(text: '10');
    final costCtrl = TextEditingController(text: '10000');

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          title: const Text('Buat Purchase Order (PO)'),
          content: SizedBox(
            width: 500,
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: selectedSupplierId,
                    decoration: const InputDecoration(
                      labelText: 'Supplier / PBF *',
                    ),
                    items: suppliers.map((s) {
                      return DropdownMenuItem(value: s.id, child: Text(s.name));
                    }).toList(),
                    onChanged: (v) {
                      if (v != null) setDlgState(() => selectedSupplierId = v);
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: selectedMedicineId,
                    decoration: const InputDecoration(
                      labelText: 'Ordered Medicine *',
                    ),
                    items: medicines.map((m) {
                      return DropdownMenuItem(
                        value: m.medicine.id,
                        child: Text(
                          '${m.medicine.name} (${m.medicine.dosageForm})',
                        ),
                      );
                    }).toList(),
                    onChanged: (v) {
                      if (v != null) setDlgState(() => selectedMedicineId = v);
                    },
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: qtyCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Quantity *',
                          ),
                          validator: (v) => double.tryParse(v ?? '') == null
                              ? loc.t('validNumber')
                              : null,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: costCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Est. Purchase Price (SDG) *',
                          ),
                          validator: (v) => double.tryParse(v ?? '') == null
                              ? 'A valid price is required'
                              : null,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(loc.t('cancel')),
            ),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                final authState = ref.read(authStateProvider);
                final pharmacyId = authState.currentPharmacy?.id ?? '';
                final userId = authState.currentUser?.id ?? '';

                final purchaseService = ref.read(purchaseServiceProvider);
                await purchaseService.createPurchaseOrder(
                  pharmacyId: pharmacyId,
                  supplierId: selectedSupplierId,
                  createdById: userId,
                  items: [
                    CreatePurchaseItemInput(
                      medicineId: selectedMedicineId,
                      orderedQuantity: double.parse(qtyCtrl.text.trim()),
                      unitCost: double.parse(costCtrl.text.trim()),
                    ),
                  ],
                );
                if (context.mounted) Navigator.pop(ctx);
              },
              child: const Text('Save PO'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final pharmacyId = authState.currentPharmacy?.id ?? '';
    final purchaseDao = ref.watch(purchaseDaoProvider);
    final supplierDao = ref.watch(supplierDaoProvider);
    final medicineDao = ref.watch(medicineDaoProvider);
    final loc = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8F6),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row
            StreamBuilder<List<Supplier>>(
              stream: supplierDao.watchAll(pharmacyId),
              builder: (context, supSnap) {
                final suppliers = supSnap.data ?? [];
                return StreamBuilder<List<MedicineWithCategory>>(
                  stream: medicineDao.watchAll(pharmacyId),
                  builder: (context, medSnap) {
                    final medicines = medSnap.data ?? [];

                    return Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              loc.t('purchases'),
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              loc.t('purchasesSubtitle'),
                              style: const TextStyle(
                                color: Colors.grey,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            OutlinedButton.icon(
                              icon: const Icon(Icons.business_outlined),
                              label: Text(loc.t('distributors')),
                              onPressed: () =>
                                  _showCreateSupplierDialog(context, ref),
                            ),
                            const SizedBox(width: 12),
                            ElevatedButton.icon(
                              icon: const Icon(Icons.add),
                              label: Text(loc.t('newPO')),
                              onPressed: () => _showCreatePoDialog(
                                context,
                                ref,
                                suppliers,
                                medicines,
                              ),
                            ),
                          ],
                        ),
                      ],
                    );
                  },
                );
              },
            ),
            const SizedBox(height: 20),

            // Purchases List
            Expanded(
              child: Card(
                child: StreamBuilder<List<PurchaseWithDetails>>(
                  stream: purchaseDao.watchAll(pharmacyId),
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) {
                      return const Center(child: CircularProgressIndicator());
                    }

                    final purchases = snapshot.data!;
                    if (purchases.isEmpty) {
                      return const Center(
                        child: Text('Belum ada Purchase Order (PO).'),
                      );
                    }

                    return ListView.separated(
                      itemCount: purchases.length + 1,
                      separatorBuilder: (context, index) =>
                          const Divider(height: 1),
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          return Container(
                            color: Colors.grey.shade100,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            child: const Row(
                              children: [
                                Expanded(
                                  flex: 2,
                                  child: Text(
                                    'No. PO',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Expanded(
                                  flex: 2,
                                  child: Text(
                                    'Supplier',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Expanded(
                                  flex: 2,
                                  child: Text(
                                    'Date',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Expanded(
                                  flex: 2,
                                  child: Text(
                                    'Estimated Total',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Expanded(
                                  flex: 2,
                                  child: Text(
                                    'Status',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Expanded(
                                  flex: 2,
                                  child: Text(
                                    'Aksi',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }

                        final item = purchases[index - 1];
                        final canReceive =
                            item.purchase.status == PurchaseStatus.ordered ||
                            item.purchase.status ==
                                PurchaseStatus.partiallyReceived;

                        return Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                flex: 2,
                                child: Text(
                                  item.purchase.purchaseNumber,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text(item.supplier.name),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text(
                                  AppFormatters.date(
                                    item.purchase.purchaseDate,
                                  ),
                                ),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text(
                                  AppFormatters.currency(
                                    item.purchase.totalAmount,
                                  ),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              Expanded(
                                flex: 2,
                                child: Align(
                                  alignment: Alignment.centerLeft,
                                  child:
                                      item.purchase.status ==
                                          PurchaseStatus.received
                                      ? StatusBadge.success(
                                          loc.t(
                                            item
                                                .purchase
                                                .status
                                                .localizationKey,
                                          ),
                                        )
                                      : item.purchase.status ==
                                            PurchaseStatus.partiallyReceived
                                      ? StatusBadge.warning(
                                          loc.t(
                                            item
                                                .purchase
                                                .status
                                                .localizationKey,
                                          ),
                                        )
                                      : StatusBadge.info(
                                          loc.t(
                                            item
                                                .purchase
                                                .status
                                                .localizationKey,
                                          ),
                                        ),
                                ),
                              ),
                              Expanded(
                                flex: 2,
                                child: canReceive
                                    ? OutlinedButton.icon(
                                        icon: const Icon(
                                          Icons.inventory_outlined,
                                          size: 16,
                                        ),
                                        label: const Text('Terima Barang'),
                                        onPressed: () =>
                                            _showReceiveGoodsDialog(
                                              context,
                                              ref,
                                              item,
                                            ),
                                      )
                                    : const Text('-'),
                              ),
                            ],
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReceiveRowData {
  final PurchaseItemWithMedicine purchaseItem;
  final TextEditingController batchCtrl;
  DateTime expiryDate;
  final TextEditingController qtyCtrl;
  final TextEditingController costCtrl;

  _ReceiveRowData({
    required this.purchaseItem,
    required this.batchCtrl,
    required this.expiryDate,
    required this.qtyCtrl,
    required this.costCtrl,
  });
}
