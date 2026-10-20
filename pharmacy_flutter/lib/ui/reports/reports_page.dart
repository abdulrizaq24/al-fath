import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/utils/formatters.dart';
import '../../data/daos/report_dao.dart';
import '../../data/daos/sale_dao.dart';
import '../../providers/app_providers.dart';
import '../../providers/auth_provider.dart';

class ReportsPage extends ConsumerStatefulWidget {
  const ReportsPage({super.key});

  @override
  ConsumerState<ReportsPage> createState() => _ReportsPageState();
}

class _ReportsPageState extends ConsumerState<ReportsPage> {
  int _selectedFilterDays = 30; // 0: today, 7: last 7 days, 30: last 30 days

  DateTime? get _startDate {
    final now = DateTime.now();
    if (_selectedFilterDays == 0) {
      return DateTime(now.year, now.month, now.day);
    } else if (_selectedFilterDays > 0) {
      return now.subtract(Duration(days: _selectedFilterDays));
    }
    return null;
  }

  Future<void> _exportToExcel(
    SalesFinancialSummary summary,
    List<TopSellingMedicine> topSelling,
    List<SaleWithDetails> sales,
  ) async {
    try {
      final exportService = ref.read(exportServiceProvider);
      final bytes = await exportService.generateSalesReportExcel(
        summary: summary,
        topSelling: topSelling,
        sales: sales,
      );

      final dir = await getApplicationDocumentsDirectory();
      final filePath =
          '${dir.path}/Laporan_Penjualan_${DateTime.now().millisecondsSinceEpoch}.xlsx';
      final file = File(filePath);
      await file.writeAsBytes(bytes);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Laporan Excel berhasil disimpan di: $filePath'),
            backgroundColor: const Color(0xFF006D42),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal mengekspor Excel: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authStateProvider);
    final pharmacyId = authState.currentPharmacy?.id ?? '';
    final reportDao = ref.watch(reportDaoProvider);
    final saleDao = ref.watch(saleDaoProvider);
    final loc = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8F6),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      loc.t('reports'),
                      style:
                          const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      loc.t('reportsSubtitle'),
                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                  ],
                ),
                // Filter Dropdown
                Row(
                  children: [
                    DropdownButton<int>(
                      value: _selectedFilterDays,
                      items: [
                        DropdownMenuItem(value: 0, child: Text(loc.t('filterToday'))),
                        DropdownMenuItem(
                            value: 7, child: Text(loc.t('filter7Days'))),
                        DropdownMenuItem(
                            value: 30, child: Text(loc.t('filter30Days'))),
                        DropdownMenuItem(
                            value: -1, child: Text(loc.t('filterAllTime'))),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _selectedFilterDays = v);
                      },
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Financial Metrics Cards
            FutureBuilder(
              future: Future.wait([
                reportDao.getFinancialSummary(pharmacyId,
                    startDate: _startDate),
                reportDao.getTopSellingMedicines(pharmacyId,
                    startDate: _startDate),
                saleDao.getAll(pharmacyId, startDate: _startDate),
              ]),
              builder: (context, AsyncSnapshot<List<dynamic>> snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: CircularProgressIndicator(),
                    ),
                  );
                }

                final summary = snap.data![0] as SalesFinancialSummary;
                final topSelling = snap.data![1] as List<TopSellingMedicine>;
                final sales = snap.data![2] as List<SaleWithDetails>;

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Export Button
                    Align(
                      alignment: Alignment.centerRight,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.file_download_outlined),
                        label: Text(loc.t('exportExcel')),
                        onPressed: () =>
                            _exportToExcel(summary, topSelling, sales),
                      ),
                    ),
                    const SizedBox(height: 16),

                    Row(
                      children: [
                        Expanded(
                          child: _MetricCard(
                            label: loc.t('netRevenue'),
                            value: AppFormatters.currency(summary.netSales),
                            color: theme.colorScheme.primary,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _MetricCard(
                            label: loc.t('cogs'),
                            value: AppFormatters.currency(summary.totalCogs),
                            color: const Color(0xFFE65100),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _MetricCard(
                            label: loc.t('grossProfit'),
                            value: AppFormatters.currency(summary.grossProfit),
                            color: const Color(0xFF1976D2),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _MetricCard(
                            label: loc.t('profitMargin'),
                            value:
                                '${summary.grossMarginPercentage.toStringAsFixed(1)}%',
                            color: const Color(0xFF6A1B9A),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Top Selling Table
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              loc.t('topSellingMedicines'),
                              style: const TextStyle(
                                  fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 16),
                            if (topSelling.isEmpty)
                              const Padding(
                                padding: EdgeInsets.all(20),
                                child: Center(
                                    child: Text('Belum ada transaksi.')),
                              )
                            else
                              ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: topSelling.length,
                                separatorBuilder: (context, index) =>
                                    const Divider(height: 1),
                                itemBuilder: (context, i) {
                                  final item = topSelling[i];
                                  return ListTile(
                                    leading: CircleAvatar(
                                      child: Text('${i + 1}'),
                                    ),
                                    title: Text(item.medicineName,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold)),
                                    subtitle: Text(
                                        'Terjual: ${AppFormatters.quantity(item.totalQuantity)} unit'),
                                    trailing: Text(
                                      AppFormatters.currency(item.totalRevenue),
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: theme.colorScheme.primary,
                                      ),
                                    ),
                                  );
                                },
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
