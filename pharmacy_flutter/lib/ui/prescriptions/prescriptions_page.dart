import 'package:drift/drift.dart' as drift;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/uuid_generator.dart';
import '../../data/daos/medicine_dao.dart';
import '../../data/daos/prescription_dao.dart';
import '../../data/database/database.dart';
import '../../domain/enums/app_enums.dart';
import '../../providers/app_providers.dart';
import '../../providers/auth_provider.dart';
import '../../services/prescription_service.dart';
import '../../services/sale_service.dart';
import '../shared/status_badge.dart';

class PrescriptionsPage extends ConsumerWidget {
  const PrescriptionsPage({super.key});

  void _showCreatePatientDialog(BuildContext context, WidgetRef ref) {
    final loc = AppLocalizations.of(context);
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final addressCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(loc.t('addPatient')),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Patient Full Name *',
                ),
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Wajib diisi' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: phoneCtrl,
                decoration: const InputDecoration(labelText: 'No. Telepon'),
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
              final patientDao = ref.read(patientDaoProvider);
              final pNum =
                  'RM-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';

              await patientDao.insert(
                PatientsCompanion(
                  id: drift.Value(UuidGenerator.v4()),
                  pharmacyId: drift.Value(pharmacyId),
                  patientNumber: drift.Value(pNum),
                  firstName: drift.Value(nameCtrl.text.trim()),
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

  void _showCreatePrescriptionDialog(
    BuildContext context,
    WidgetRef ref,
    List<Patient> patients,
    List<MedicineWithCategory> medicines,
  ) {
    final loc = AppLocalizations.of(context);
    if (patients.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(loc.t('patientAddedFirst')),
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
    String selectedPatientId = patients.first.id;
    String selectedMedicineId = medicines.first.medicine.id;
    final doctorCtrl = TextEditingController(text: 'dr. ');
    final qtyCtrl = TextEditingController(text: '10');
    final directionsCtrl = TextEditingController(text: loc.t('defaultDosage'));

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          title: const Text('Record Prescription'),
          content: SizedBox(
            width: 500,
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: selectedPatientId,
                    decoration: const InputDecoration(labelText: 'Patient *'),
                    items: patients.map((p) {
                      return DropdownMenuItem(
                        value: p.id,
                        child: Text('${p.firstName} (${p.patientNumber})'),
                      );
                    }).toList(),
                    onChanged: (v) {
                      if (v != null) setDlgState(() => selectedPatientId = v);
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: doctorCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Prescribing Doctor Name *',
                    ),
                    validator: (v) =>
                        v == null || v.trim().isEmpty ? 'Wajib diisi' : null,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: selectedMedicineId,
                    decoration: const InputDecoration(
                      labelText: 'Prescribed Medicine *',
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
                        flex: 1,
                        child: TextFormField(
                          controller: qtyCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Quantity *',
                          ),
                          validator: (v) => double.tryParse(v ?? '') == null
                              ? 'Wajib angka'
                              : null,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: TextFormField(
                          controller: directionsCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Signa / Aturan Pakai',
                          ),
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

                final prescriptionService = ref.read(
                  prescriptionServiceProvider,
                );
                await prescriptionService.createPrescription(
                  pharmacyId: pharmacyId,
                  patientId: selectedPatientId,
                  createdById: userId,
                  prescriberName: doctorCtrl.text.trim(),
                  prescriptionDate: DateTime.now(),
                  items: [
                    CreatePrescriptionItemInput(
                      medicineId: selectedMedicineId,
                      quantityPrescribed: double.parse(qtyCtrl.text.trim()),
                      directions: directionsCtrl.text.trim(),
                    ),
                  ],
                );
                if (context.mounted) Navigator.pop(ctx);
              },
              child: const Text('Save Prescription'),
            ),
          ],
        ),
      ),
    );
  }

  void _showDispenseDialog(
    BuildContext context,
    WidgetRef ref,
    PrescriptionWithDetails prescription,
  ) {
    final loc = AppLocalizations.of(context);
    final List<DispenseItemInput> dispenseInputs = [];
    double totalEstCost = 0.0;

    for (final it in prescription.items) {
      final remaining = it.item.quantityPrescribed - it.item.quantityDispensed;
      if (remaining > 0) {
        dispenseInputs.add(
          DispenseItemInput(
            prescriptionItemId: it.item.id,
            quantityToDispense: remaining,
          ),
        );
        totalEstCost += remaining * it.medicine.sellingPrice;
      }
    }

    if (dispenseInputs.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This prescription has already been fully dispensed.'),
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'Dispense Prescription: ${prescription.prescription.prescriptionNumber}',
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Patient: ${prescription.patient.firstName}'),
            Text('Dokter: ${prescription.prescription.prescriberName}'),
            const Divider(height: 20),
            const Text(
              'Medicines to dispense:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ...prescription.items.map((it) {
              final remaining =
                  it.item.quantityPrescribed - it.item.quantityDispensed;
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text(
                  '• ${it.medicine.name} — ${AppFormatters.quantity(remaining)} ${it.medicine.baseUnit} (${AppFormatters.currency(remaining * it.medicine.sellingPrice)})',
                ),
              );
            }),
            const Divider(height: 20),
            Text(
              'Total Biaya: ${AppFormatters.currency(totalEstCost)}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(loc.t('cancel')),
          ),
          ElevatedButton(
            onPressed: () async {
              final authState = ref.read(authStateProvider);
              final pharmacyId = authState.currentPharmacy?.id ?? '';
              final userId = authState.currentUser?.id ?? '';

              final prescriptionService = ref.read(prescriptionServiceProvider);
              try {
                await prescriptionService.dispensePrescription(
                  prescriptionId: prescription.prescription.id,
                  pharmacyId: pharmacyId,
                  dispensedById: userId,
                  itemsToDispense: dispenseInputs,
                  payment: SalePaymentInput(
                    method: PaymentMethod.cash,
                    amount: totalEstCost,
                  ),
                );
                if (ctx.mounted) Navigator.pop(ctx);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Prescription dispensed and stock deducted.',
                      ),
                      backgroundColor: Color(0xFF006D42),
                    ),
                  );
                }
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
            child: const Text('Process Dispensing & Pay'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final pharmacyId = authState.currentPharmacy?.id ?? '';
    final prescriptionDao = ref.watch(prescriptionDaoProvider);
    final patientDao = ref.watch(patientDaoProvider);
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
            StreamBuilder<List<Patient>>(
              stream: patientDao.watchAll(pharmacyId),
              builder: (context, patSnap) {
                final patients = patSnap.data ?? [];
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
                              loc.t('prescriptions'),
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              loc.t('prescriptionsSubtitle'),
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
                              icon: const Icon(Icons.person_add_outlined),
                              label: Text(loc.t('newPatient')),
                              onPressed: () =>
                                  _showCreatePatientDialog(context, ref),
                            ),
                            const SizedBox(width: 12),
                            ElevatedButton.icon(
                              icon: const Icon(Icons.add),
                              label: Text(loc.t('newRx')),
                              onPressed: () => _showCreatePrescriptionDialog(
                                context,
                                ref,
                                patients,
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

            // Prescriptions Table
            Expanded(
              child: Card(
                child: StreamBuilder<List<PrescriptionWithDetails>>(
                  stream: prescriptionDao.watchAll(pharmacyId),
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) {
                      return const Center(child: CircularProgressIndicator());
                    }

                    final list = snapshot.data!;
                    if (list.isEmpty) {
                      return const Center(
                        child: Text('No prescription records yet.'),
                      );
                    }

                    return ListView.separated(
                      itemCount: list.length + 1,
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
                                    'Prescription No.',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Expanded(
                                  flex: 2,
                                  child: Text(
                                    'Patient',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Expanded(
                                  flex: 2,
                                  child: Text(
                                    'Prescribing Doctor',
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

                        final item = list[index - 1];
                        final canDispense =
                            item.prescription.status ==
                                PrescriptionStatus.pending ||
                            item.prescription.status ==
                                PrescriptionStatus.partiallyDispensed;

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
                                  item.prescription.prescriptionNumber,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text(item.patient.firstName),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text(item.prescription.prescriberName),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text(
                                  AppFormatters.date(
                                    item.prescription.prescriptionDate,
                                  ),
                                ),
                              ),
                              Expanded(
                                flex: 2,
                                child: Align(
                                  alignment: Alignment.centerLeft,
                                  child:
                                      item.prescription.status ==
                                          PrescriptionStatus.dispensed
                                      ? StatusBadge.success(
                                          loc.t(
                                            item
                                                .prescription
                                                .status
                                                .localizationKey,
                                          ),
                                        )
                                      : item.prescription.status ==
                                            PrescriptionStatus
                                                .partiallyDispensed
                                      ? StatusBadge.warning(
                                          loc.t(
                                            item
                                                .prescription
                                                .status
                                                .localizationKey,
                                          ),
                                        )
                                      : StatusBadge.info(
                                          loc.t(
                                            item
                                                .prescription
                                                .status
                                                .localizationKey,
                                          ),
                                        ),
                                ),
                              ),
                              Expanded(
                                flex: 2,
                                child: canDispense
                                    ? OutlinedButton.icon(
                                        icon: const Icon(
                                          Icons.medical_services_outlined,
                                          size: 16,
                                        ),
                                        label: const Text('Dispensing'),
                                        onPressed: () => _showDispenseDialog(
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
