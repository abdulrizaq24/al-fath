import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/utils/formatters.dart';
import '../../data/daos/medicine_dao.dart';
import '../../domain/enums/app_enums.dart';
import '../../providers/app_providers.dart';
import '../../providers/auth_provider.dart';
import '../../services/sale_service.dart';

class SalesPage extends ConsumerStatefulWidget {
  const SalesPage({super.key});

  @override
  ConsumerState<SalesPage> createState() => _SalesPageState();
}

class _SalesPageState extends ConsumerState<SalesPage> {
  final _searchController = TextEditingController();
  final List<SaleCartItemInput> _cart = [];
  PaymentMethod _selectedPaymentMethod = PaymentMethod.cash;
  final _paidAmountController = TextEditingController();
  bool _isProcessing = false;

  @override
  void dispose() {
    _searchController.dispose();
    _paidAmountController.dispose();
    super.dispose();
  }

  double get _subtotal =>
      _cart.fold(0.0, (s, i) => s + (i.quantity * i.unitPrice));
  double get _totalDiscount => _cart.fold(0.0, (s, i) => s + i.discount);
  double get _grandTotal => _subtotal - _totalDiscount;

  void _addToCart(MedicineWithCategory med, double availableStock) {
    final loc = AppLocalizations.of(context);
    if (availableStock <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(loc.t('medicineExpired')),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final existingIndex = _cart.indexWhere(
      (i) => i.medicineId == med.medicine.id,
    );
    if (existingIndex >= 0) {
      final current = _cart[existingIndex];
      if (current.quantity + 1 > availableStock) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(loc.t('exceedsStock')),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }
      setState(() {
        _cart[existingIndex] = SaleCartItemInput(
          medicineId: current.medicineId,
          medicineName: current.medicineName,
          quantity: current.quantity + 1,
          unitPrice: current.unitPrice,
          discount: current.discount,
        );
      });
    } else {
      setState(() {
        _cart.add(
          SaleCartItemInput(
            medicineId: med.medicine.id,
            medicineName: med.medicine.name,
            quantity: 1,
            unitPrice: med.medicine.sellingPrice,
          ),
        );
      });
    }
  }

  void _updateQuantity(int index, double newQty) {
    if (newQty <= 0) {
      setState(() => _cart.removeAt(index));
    } else {
      final current = _cart[index];
      setState(() {
        _cart[index] = SaleCartItemInput(
          medicineId: current.medicineId,
          medicineName: current.medicineName,
          quantity: newQty,
          unitPrice: current.unitPrice,
          discount: current.discount,
        );
      });
    }
  }

  Future<void> _handleCheckout() async {
    final loc = AppLocalizations.of(context);
    if (_cart.isEmpty) return;

    final authState = ref.read(authStateProvider);
    final pharmacyId = authState.currentPharmacy?.id ?? '';
    final userId = authState.currentUser?.id ?? '';
    final pharmacyName = authState.currentPharmacy?.name ?? 'PharmaCare';

    final paidAmount =
        double.tryParse(_paidAmountController.text) ?? _grandTotal;

    if (paidAmount < _grandTotal) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(loc.t('paymentInsufficient')),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isProcessing = true);
    try {
      final saleService = ref.read(saleServiceProvider);
      final saleResult = await saleService.createSale(
        pharmacyId: pharmacyId,
        soldById: userId,
        items: _cart,
        payment: SalePaymentInput(
          method: _selectedPaymentMethod,
          amount: paidAmount,
        ),
      );

      final change = paidAmount - _grandTotal;

      if (!mounted) return;

      setState(() {
        _cart.clear();
        _paidAmountController.clear();
      });

      // Show Success Dialog with Change & Print Receipt option
      await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Row(
            children: [
              Icon(Icons.check_circle, color: Color(0xFF2E7D32)),
              SizedBox(width: 8),
              Text(loc.t('transactionSuccess')),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${loc.t('invoiceNo')} ${saleResult.sale.invoiceNumber}'),
              const SizedBox(height: 8),
              Text('${loc.t('total')}: ${AppFormatters.currency(_grandTotal)}'),
              Text(
                '${loc.t('paidAmount')}: ${AppFormatters.currency(paidAmount)}',
              ),
              const Divider(height: 20),
              Text(
                '${loc.t('change')} ${AppFormatters.currency(change)}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF006D42),
                ),
              ),
            ],
          ),
          actions: [
            OutlinedButton.icon(
              icon: const Icon(Icons.print),
              label: Text(loc.t('printReceipt')),
              onPressed: () async {
                final exportService = ref.read(exportServiceProvider);
                await exportService.generateReceiptPdf(
                  saleResult,
                  pharmacyName,
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(loc.t('exportSuccess'))),
                  );
                }
              },
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(loc.t('close')),
            ),
          ],
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authStateProvider);
    final pharmacyId = authState.currentPharmacy?.id ?? '';
    final medicineDao = ref.watch(medicineDaoProvider);
    final batchDao = ref.watch(batchDaoProvider);
    final loc = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8F6),
      body: Row(
        children: [
          // Left side: Medicine Catalog & Search
          Expanded(
            flex: 6,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
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

                  // Medicines Grid / List
                  Expanded(
                    child: StreamBuilder<List<MedicineWithCategory>>(
                      stream: medicineDao.watchAll(
                        pharmacyId,
                        searchQuery: _searchController.text,
                      ),
                      builder: (context, snapshot) {
                        if (!snapshot.hasData) {
                          return const Center(
                            child: CircularProgressIndicator(),
                          );
                        }

                        final medicines = snapshot.data!;
                        if (medicines.isEmpty) {
                          return Center(child: Text(loc.t('noMedicinesFound')));
                        }

                        return GridView.builder(
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 3,
                                childAspectRatio: 1.6,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                              ),
                          itemCount: medicines.length,
                          itemBuilder: (context, index) {
                            final med = medicines[index];

                            return FutureBuilder<double>(
                              future: batchDao.getTotalAvailableStock(
                                pharmacyId,
                                med.medicine.id,
                              ),
                              builder: (context, stockSnap) {
                                final stock = stockSnap.data ?? 0.0;
                                final hasStock = stock > 0;

                                return Card(
                                  clipBehavior: Clip.antiAlias,
                                  child: InkWell(
                                    onTap: hasStock
                                        ? () => _addToCart(med, stock)
                                        : null,
                                    child: Padding(
                                      padding: const EdgeInsets.all(12),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                med.medicine.name,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 14,
                                                ),
                                              ),
                                              Text(
                                                med.medicine.dosageForm,
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  color: Colors.grey.shade600,
                                                ),
                                              ),
                                            ],
                                          ),
                                          Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                AppFormatters.currency(
                                                  med.medicine.sellingPrice,
                                                ),
                                                style: TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  color:
                                                      theme.colorScheme.primary,
                                                  fontSize: 13,
                                                ),
                                              ),
                                              Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                      horizontal: 6,
                                                      vertical: 2,
                                                    ),
                                                decoration: BoxDecoration(
                                                  color: hasStock
                                                      ? Colors.green.shade50
                                                      : Colors.red.shade50,
                                                  borderRadius:
                                                      BorderRadius.circular(4),
                                                ),
                                                child: Text(
                                                  hasStock
                                                      ? '${loc.t('stockAvailable')} ${AppFormatters.quantity(stock)}'
                                                      : loc.t('emptyStock'),
                                                  style: TextStyle(
                                                    color: hasStock
                                                        ? Colors.green.shade800
                                                        : Colors.red.shade800,
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            );
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Right side: Active Cart & Checkout Panel
          Container(
            width: 380,
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(
                left: BorderSide(color: Colors.grey.shade200, width: 1),
              ),
            ),
            child: Column(
              children: [
                // Cart Header
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.shopping_cart_outlined, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            '${loc.t('cart')} (${_cart.length})',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      if (_cart.isNotEmpty)
                        TextButton(
                          onPressed: () => setState(() => _cart.clear()),
                          child: Text(
                            loc.t('clearCart'),
                            style: const TextStyle(
                              color: Colors.red,
                              fontSize: 12,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const Divider(height: 1),

                // Cart Items List
                Expanded(
                  child: _cart.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.remove_shopping_cart_outlined,
                                size: 48,
                                color: Colors.grey.shade300,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                loc.t('cartEmpty'),
                                style: TextStyle(color: Colors.grey.shade500),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(12),
                          itemCount: _cart.length,
                          separatorBuilder: (context, index) =>
                              const Divider(height: 12),
                          itemBuilder: (context, index) {
                            final item = _cart[index];
                            return Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.medicineName,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 13,
                                        ),
                                      ),
                                      Text(
                                        AppFormatters.currency(item.unitPrice),
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Row(
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.remove, size: 16),
                                      onPressed: () => _updateQuantity(
                                        index,
                                        item.quantity - 1,
                                      ),
                                    ),
                                    Text(
                                      AppFormatters.quantity(item.quantity),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.add, size: 16),
                                      onPressed: () => _updateQuantity(
                                        index,
                                        item.quantity + 1,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  AppFormatters.currency(item.total),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                ),

                const Divider(height: 1),

                // Summary & Payment Section
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('${loc.t('subtotal')}:'),
                          Text(AppFormatters.currency(_subtotal)),
                        ],
                      ),
                      if (_totalDiscount > 0) ...[
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('${loc.t('discount')}:'),
                            Text(
                              '-${AppFormatters.currency(_totalDiscount)}',
                              style: const TextStyle(color: Colors.red),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            loc.t('grandTotal'),
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          Text(
                            AppFormatters.currency(_grandTotal),
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Payment Method Selector
                      DropdownButtonFormField<PaymentMethod>(
                        initialValue: _selectedPaymentMethod,
                        decoration: InputDecoration(
                          labelText: loc.t('paymentMethod'),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                        ),
                        items: PaymentMethod.values.map((m) {
                          String label;
                          switch (m) {
                            case PaymentMethod.cash:
                              label = loc.t('cash');
                              break;
                            case PaymentMethod.card:
                              label = loc.t('card');
                              break;
                            case PaymentMethod.bankTransfer:
                              label = loc.t('bankTransfer');
                              break;
                            case PaymentMethod.mobilePayment:
                              label = loc.t('mobilePayment');
                              break;
                            case PaymentMethod.other:
                              label = loc.t('other');
                              break;
                          }
                          return DropdownMenuItem(value: m, child: Text(label));
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedPaymentMethod = val);
                          }
                        },
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _paidAmountController,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: loc.t('paidAmount'),
                          hintText: AppFormatters.currency(_grandTotal),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _cart.isEmpty || _isProcessing
                              ? null
                              : _handleCheckout,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          child: _isProcessing
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : Text(
                                  loc.t('payNow'),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
