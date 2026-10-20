import 'package:drift/drift.dart' as drift;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/uuid_generator.dart';
import '../../data/daos/medicine_dao.dart';
import '../../data/database/database.dart';
import '../../domain/enums/app_enums.dart';
import '../../providers/app_providers.dart';
import '../../providers/auth_provider.dart';
import '../shared/status_badge.dart';

class MedicinesPage extends ConsumerStatefulWidget {
  const MedicinesPage({super.key});

  @override
  ConsumerState<MedicinesPage> createState() => _MedicinesPageState();
}

class _MedicinesPageState extends ConsumerState<MedicinesPage> {
  final _searchController = TextEditingController();
  String? _selectedCategoryId;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showAddMedicineDialog(List<Category> categories) {
    if (categories.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Buat kategori obat terlebih dahulu.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final genericCtrl = TextEditingController();
    final barcodeCtrl = TextEditingController();
    final dosageCtrl = TextEditingController(text: 'Tablet');
    final baseUnitCtrl = TextEditingController(text: 'Strip');
    final priceCtrl = TextEditingController();
    final reorderCtrl = TextEditingController(text: '10');
    String selectedCatId = categories.first.id;
    ControlledStatus selectedStatus = ControlledStatus.otc;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          title: const Text('Tambah Obat Baru'),
          content: SizedBox(
            width: 500,
            child: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextFormField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(labelText: 'Nama Obat *'),
                      validator: (v) => v == null || v.trim().isEmpty
                          ? 'Nama obat wajib diisi'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: genericCtrl,
                            decoration: const InputDecoration(
                                labelText: 'Nama Generik'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: barcodeCtrl,
                            decoration:
                                const InputDecoration(labelText: 'Barcode / Kode'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: selectedCatId,
                      decoration: const InputDecoration(labelText: 'Kategori *'),
                      items: categories.map((c) {
                        return DropdownMenuItem(value: c.id, child: Text(c.name));
                      }).toList(),
                      onChanged: (v) {
                        if (v != null) setDlgState(() => selectedCatId = v);
                      },
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: dosageCtrl,
                            decoration: const InputDecoration(
                                labelText: 'Bentuk Sediaan *'),
                            validator: (v) => v == null || v.trim().isEmpty
                                ? 'Wajib diisi'
                                : null,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: baseUnitCtrl,
                            decoration: const InputDecoration(
                                labelText: 'Satuan Dasar *'),
                            validator: (v) => v == null || v.trim().isEmpty
                                ? 'Wajib diisi'
                                : null,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: priceCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                                labelText: 'Harga Jual (Rp) *'),
                            validator: (v) => double.tryParse(v ?? '') == null
                                ? 'Harga valid wajib'
                                : null,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: reorderCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                                labelText: 'Batas Minimum Stok'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<ControlledStatus>(
                      initialValue: selectedStatus,
                      decoration:
                          const InputDecoration(labelText: 'Regulasi / Golongan'),
                      items: ControlledStatus.values.map((s) {
                        return DropdownMenuItem(value: s, child: Text(s.label));
                      }).toList(),
                      onChanged: (v) {
                        if (v != null) setDlgState(() => selectedStatus = v);
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Batal'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                final authState = ref.read(authStateProvider);
                final pharmacyId = authState.currentPharmacy?.id ?? '';

                final medicineDao = ref.read(medicineDaoProvider);
                await medicineDao.insert(
                  MedicinesCompanion(
                    id: drift.Value(UuidGenerator.v4()),
                    pharmacyId: drift.Value(pharmacyId),
                    categoryId: drift.Value(selectedCatId),
                    name: drift.Value(nameCtrl.text.trim()),
                    genericName: drift.Value(genericCtrl.text.trim().isEmpty
                        ? null
                        : genericCtrl.text.trim()),
                    barcode: drift.Value(barcodeCtrl.text.trim().isEmpty
                        ? null
                        : barcodeCtrl.text.trim()),
                    dosageForm: drift.Value(dosageCtrl.text.trim()),
                    baseUnit: drift.Value(baseUnitCtrl.text.trim()),
                    sellingPrice:
                        drift.Value(double.parse(priceCtrl.text.trim())),
                    reorderLevel: drift.Value(
                        double.tryParse(reorderCtrl.text.trim()) ?? 0.0),
                    prescriptionStatus: drift.Value(selectedStatus),
                    isActive: const drift.Value(true),
                    createdAt: drift.Value(DateTime.now()),
                    updatedAt: drift.Value(DateTime.now()),
                  ),
                );

                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Simpan'),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddCategoryDialog() {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Tambah Kategori Obat'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Nama Kategori *'),
                validator: (v) => v == null || v.trim().isEmpty
                    ? 'Nama kategori wajib diisi'
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: descCtrl,
                decoration: const InputDecoration(labelText: 'Deskripsi'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              final authState = ref.read(authStateProvider);
              final pharmacyId = authState.currentPharmacy?.id ?? '';

              final categoryDao = ref.read(categoryDaoProvider);
              await categoryDao.insert(
                CategoriesCompanion(
                  id: drift.Value(UuidGenerator.v4()),
                  pharmacyId: drift.Value(pharmacyId),
                  name: drift.Value(nameCtrl.text.trim()),
                  description: drift.Value(descCtrl.text.trim().isEmpty
                      ? null
                      : descCtrl.text.trim()),
                  isActive: const drift.Value(true),
                  createdAt: drift.Value(DateTime.now()),
                  updatedAt: drift.Value(DateTime.now()),
                ),
              );

              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final pharmacyId = authState.currentPharmacy?.id ?? '';
    final categoryDao = ref.watch(categoryDaoProvider);
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
            StreamBuilder<List<Category>>(
              stream: categoryDao.watchAll(pharmacyId),
              builder: (context, catSnap) {
                final categories = catSnap.data ?? [];

                return Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          loc.t('medicines'),
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          loc.t('medicineCatalogSubtitle'),
                          style: const TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        OutlinedButton.icon(
                          icon: const Icon(Icons.category_outlined),
                          label: Text(loc.t('newCategory')),
                          onPressed: _showAddCategoryDialog,
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton.icon(
                          icon: const Icon(Icons.add),
                          label: Text(loc.t('newMedicine')),
                          onPressed: () => _showAddMedicineDialog(categories),
                        ),
                      ],
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 20),

            // Search Bar
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: loc.t('searchMedicineHint'),
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {});
                        },
                      )
                    : null,
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 16),

            // Medicines Table
            Expanded(
              child: Card(
                child: StreamBuilder<List<MedicineWithCategory>>(
                  stream: medicineDao.watchAll(
                    pharmacyId,
                    searchQuery: _searchController.text,
                    categoryId: _selectedCategoryId,
                  ),
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) {
                      return const Center(child: CircularProgressIndicator());
                    }

                    final medicines = snapshot.data!;
                    if (medicines.isEmpty) {
                      return const Center(
                        child: Text('Belum ada data obat.'),
                      );
                    }

                    return ListView.separated(
                      itemCount: medicines.length + 1,
                      separatorBuilder: (context, index) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          return Container(
                            color: Colors.grey.shade100,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 12),
                            child: const Row(
                              children: [
                                Expanded(
                                    flex: 3,
                                    child: Text('Nama Obat',
                                        style: TextStyle(
                                            fontWeight: FontWeight.bold))),
                                Expanded(
                                    flex: 2,
                                    child: Text('Kategori',
                                        style: TextStyle(
                                            fontWeight: FontWeight.bold))),
                                Expanded(
                                    flex: 2,
                                    child: Text('Bentuk & Satuan',
                                        style: TextStyle(
                                            fontWeight: FontWeight.bold))),
                                Expanded(
                                    flex: 2,
                                    child: Text('Harga Jual',
                                        style: TextStyle(
                                            fontWeight: FontWeight.bold))),
                                Expanded(
                                    flex: 2,
                                    child: Text('Golongan',
                                        style: TextStyle(
                                            fontWeight: FontWeight.bold))),
                              ],
                            ),
                          );
                        }

                        final item = medicines[index - 1];
                        return Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 12),
                          child: Row(
                            children: [
                              Expanded(
                                flex: 3,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.medicine.name,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold),
                                    ),
                                    if (item.medicine.genericName != null)
                                      Text(
                                        item.medicine.genericName!,
                                        style: TextStyle(
                                          color: Colors.grey.shade600,
                                          fontSize: 11,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text(item.category?.name ?? '-'),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text(
                                  '${item.medicine.dosageForm} / ${item.medicine.baseUnit}',
                                ),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text(
                                  AppFormatters.currency(
                                      item.medicine.sellingPrice),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold),
                                ),
                              ),
                              Expanded(
                                flex: 2,
                                child: Align(
                                  alignment: Alignment.centerLeft,
                                  child: StatusBadge.info(
                                    item.medicine.prescriptionStatus.label,
                                  ),
                                ),
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
