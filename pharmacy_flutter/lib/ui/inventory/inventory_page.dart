import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/utils/formatters.dart';
import '../../data/daos/inventory_dao.dart';
import '../../data/daos/medicine_dao.dart';
import '../../data/database/database.dart';
import '../../domain/enums/app_enums.dart';
import '../../providers/app_providers.dart';
import '../../providers/auth_provider.dart';
import '../shared/status_badge.dart';

class InventoryPage extends ConsumerStatefulWidget {
  const InventoryPage({super.key});

  @override
  ConsumerState<InventoryPage> createState() => _InventoryPageState();
}

class _InventoryPageState extends ConsumerState<InventoryPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showAdjustStockDialog(
    BuildContext context,
    MedicineWithCategory medicine,
    Batche batch,
  ) {
    final loc = AppLocalizations.of(context);
    final formKey = GlobalKey<FormState>();
    final newQtyCtrl = TextEditingController(
      text: batch.currentQuantity.toString(),
    );
    final reasonCtrl = TextEditingController();
    InventoryTransactionType selectedType = InventoryTransactionType.adjustment;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          title: Text('${loc.t('adjustStock')}: ${medicine.medicine.name}'),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${loc.t('batchNumber')}: ${batch.batchNumber}'),
                Text(
                  'Current Stock: ${AppFormatters.quantity(batch.currentQuantity)} ${medicine.medicine.baseUnit}',
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<InventoryTransactionType>(
                  initialValue: selectedType,
                  decoration: InputDecoration(
                    labelText: loc.t('adjustmentType'),
                  ),
                  items: [
                    DropdownMenuItem(
                      value: InventoryTransactionType.adjustment,
                      child: Text(loc.t('inventoryAdjustment')),
                    ),
                    DropdownMenuItem(
                      value: InventoryTransactionType.damage,
                      child: Text(loc.t('physicalDamage')),
                    ),
                    DropdownMenuItem(
                      value: InventoryTransactionType.expiry,
                      child: Text(loc.t('expiredDamaged')),
                    ),
                  ],
                  onChanged: (v) {
                    if (v != null) setDlgState(() => selectedType = v);
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: newQtyCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: '${loc.t('actualQuantity')} *',
                  ),
                  validator: (v) => double.tryParse(v ?? '') == null
                      ? loc.t('validNumber')
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: reasonCtrl,
                  decoration: InputDecoration(
                    labelText: '${loc.t('adjustmentReason')} *',
                  ),
                  validator: (v) => v == null || v.trim().isEmpty
                      ? loc.t('adjustmentReasonRequired')
                      : null,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                final authState = ref.read(authStateProvider);
                final pharmacyId = authState.currentPharmacy?.id ?? '';
                final userId = authState.currentUser?.id ?? '';

                final inventoryService = ref.read(inventoryServiceProvider);
                try {
                  await inventoryService.adjustStock(
                    pharmacyId: pharmacyId,
                    medicineId: medicine.medicine.id,
                    batchId: batch.id,
                    newPhysicalQuantity: double.parse(newQtyCtrl.text.trim()),
                    type: selectedType,
                    reason: reasonCtrl.text.trim(),
                    userId: userId,
                  );
                  if (context.mounted) Navigator.pop(ctx);
                  setState(() {});
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
              child: const Text('Save Correction'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final pharmacyId = authState.currentPharmacy?.id ?? '';
    final inventoryService = ref.watch(inventoryServiceProvider);
    final inventoryDao = ref.watch(inventoryDaoProvider);
    final medicineDao = ref.watch(medicineDaoProvider);
    final batchDao = ref.watch(batchDaoProvider);
    final loc = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8F6),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              loc.t('inventory'),
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              loc.t('inventorySubtitle'),
              style: const TextStyle(color: Colors.grey, fontSize: 13),
            ),
            const SizedBox(height: 20),

            TabBar(
              controller: _tabController,
              isScrollable: true,
              tabs: [
                Tab(text: loc.t('tabBatches')),
                Tab(text: loc.t('tabExpiring')),
                Tab(text: loc.t('tabAudit')),
              ],
            ),
            const SizedBox(height: 16),

            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // Tab 1: Batch & Stock List
                  Card(
                    child: StreamBuilder<List<MedicineWithCategory>>(
                      stream: medicineDao.watchAll(pharmacyId),
                      builder: (context, medSnap) {
                        if (!medSnap.hasData) {
                          return const Center(
                            child: CircularProgressIndicator(),
                          );
                        }

                        final medicines = medSnap.data!;
                        if (medicines.isEmpty) {
                          return Center(child: Text(loc.t('noData')));
                        }

                        return ListView.separated(
                          itemCount: medicines.length,
                          separatorBuilder: (context, index) =>
                              const Divider(height: 1),
                          itemBuilder: (context, index) {
                            final med = medicines[index];

                            return FutureBuilder<List<Batche>>(
                              future: batchDao.getBatchesForMedicine(
                                pharmacyId,
                                med.medicine.id,
                              ),
                              builder: (context, batchSnap) {
                                final batches = batchSnap.data ?? [];
                                final totalStock = batches.fold<double>(
                                  0.0,
                                  (s, b) => s + b.currentQuantity,
                                );

                                return ExpansionTile(
                                  title: Text(
                                    med.medicine.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  subtitle: Text(
                                    'Total Stock: ${AppFormatters.quantity(totalStock)} ${med.medicine.baseUnit} | Reorder Level: ${AppFormatters.quantity(med.medicine.reorderLevel)}',
                                  ),
                                  children: batches.isEmpty
                                      ? [
                                          const Padding(
                                            padding: EdgeInsets.all(12),
                                            child: Text(
                                              'Belum ada batch barang masuk.',
                                            ),
                                          ),
                                        ]
                                      : batches.map((b) {
                                          return ListTile(
                                            dense: true,
                                            leading: const Icon(
                                              Icons.qr_code,
                                              size: 20,
                                            ),
                                            title: Text(
                                              'No. Batch: ${b.batchNumber}',
                                            ),
                                            subtitle: Text(
                                              'Exp: ${AppFormatters.date(b.expiryDate)} | Purchase Price: ${AppFormatters.currency(b.purchasePrice)}',
                                            ),
                                            trailing: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Text(
                                                  'Stok: ${AppFormatters.quantity(b.currentQuantity)}',
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                IconButton(
                                                  icon: const Icon(
                                                    Icons.edit_note,
                                                  ),
                                                  tooltip:
                                                      'Stock Adjustment (Stocktake)',
                                                  onPressed: () =>
                                                      _showAdjustStockDialog(
                                                        context,
                                                        med,
                                                        b,
                                                      ),
                                                ),
                                              ],
                                            ),
                                          );
                                        }).toList(),
                                );
                              },
                            );
                          },
                        );
                      },
                    ),
                  ),

                  // Tab 2: Expiring Batches
                  Card(
                    child: FutureBuilder<List<Batche>>(
                      future: inventoryService.getExpiringBatches(
                        pharmacyId,
                        daysThreshold: 60,
                      ),
                      builder: (context, snap) {
                        if (snap.connectionState == ConnectionState.waiting) {
                          return const Center(
                            child: CircularProgressIndicator(),
                          );
                        }

                        final batches = snap.data ?? [];
                        if (batches.isEmpty) {
                          return const Center(
                            child: Text(
                              'All clear! No medicines are nearing expiry.',
                            ),
                          );
                        }

                        return ListView.separated(
                          itemCount: batches.length,
                          separatorBuilder: (context, index) =>
                              const Divider(height: 1),
                          itemBuilder: (context, index) {
                            final b = batches[index];
                            final daysLeft = b.expiryDate
                                .difference(DateTime.now())
                                .inDays;

                            return ListTile(
                              leading: const Icon(
                                Icons.warning,
                                color: Colors.amber,
                              ),
                              title: Text('Batch: ${b.batchNumber}'),
                              subtitle: Text(
                                'Kadaluarsa: ${AppFormatters.date(b.expiryDate)} ($daysLeft days remaining)',
                              ),
                              trailing: StatusBadge.warning(
                                'Remaining: ${AppFormatters.quantity(b.currentQuantity)}',
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),

                  // Tab 3: Audit Trail Transactions
                  Card(
                    child: FutureBuilder<List<InventoryTransactionWithDetails>>(
                      future: inventoryDao.getTransactions(pharmacyId),
                      builder: (context, snap) {
                        if (snap.connectionState == ConnectionState.waiting) {
                          return const Center(
                            child: CircularProgressIndicator(),
                          );
                        }

                        final txs = snap.data ?? [];
                        if (txs.isEmpty) {
                          return Center(child: Text(loc.t('noMutations')));
                        }

                        return ListView.separated(
                          itemCount: txs.length,
                          separatorBuilder: (context, index) =>
                              const Divider(height: 1),
                          itemBuilder: (context, index) {
                            final tx = txs[index];
                            final isPlus = tx.transaction.quantity > 0;

                            return ListTile(
                              dense: true,
                              leading: Icon(
                                isPlus
                                    ? Icons.arrow_downward
                                    : Icons.arrow_upward,
                                color: isPlus ? Colors.green : Colors.red,
                              ),
                              title: Text(
                                '${tx.medicine.name} (Batch: ${tx.batch.batchNumber})',
                              ),
                              subtitle: Text(
                                '${tx.transaction.reason ?? loc.t(tx.transaction.transactionType.localizationKey)} • Oleh: ${tx.createdBy.name} • ${AppFormatters.dateTime(tx.transaction.createdAt)}',
                              ),
                              trailing: Text(
                                '${isPlus ? "+" : ""}${AppFormatters.quantity(tx.transaction.quantity)}',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: isPlus
                                      ? Colors.green.shade800
                                      : Colors.red.shade800,
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
