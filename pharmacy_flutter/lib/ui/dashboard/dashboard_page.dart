import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/utils/formatters.dart';
import '../../domain/enums/app_enums.dart';
import '../../providers/app_providers.dart';
import '../../providers/auth_provider.dart';
import '../shared/status_badge.dart';

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final authState = ref.watch(authStateProvider);
    final pharmacyId = authState.currentPharmacy?.id ?? '';
    final loc = AppLocalizations.of(context);

    final now = DateTime.now();
    final startOfToday = DateTime(now.year, now.month, now.day);
    final endOfToday = DateTime(now.year, now.month, now.day, 23, 59, 59);

    final reportDao = ref.watch(reportDaoProvider);
    final inventoryService = ref.watch(inventoryServiceProvider);
    final saleDao = ref.watch(saleDaoProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8F6),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${loc.t('welcomeBack')} ${authState.currentUser?.name ?? "Admin"}',
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${loc.t('todaySummary')} (${AppFormatters.date(DateTime.now())})',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Top Stat Cards
            FutureBuilder(
              future: Future.wait([
                reportDao.getFinancialSummary(
                  pharmacyId,
                  startDate: startOfToday,
                  endDate: endOfToday,
                ),
                inventoryService.getLowStockMedicines(pharmacyId),
                inventoryService.getExpiringBatches(pharmacyId, daysThreshold: 60),
              ]),
              builder: (context, AsyncSnapshot<List<dynamic>> snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                final summary = snapshot.data?[0];
                final lowStock = snapshot.data?[1] as List? ?? [];
                final expiring = snapshot.data?[2] as List? ?? [];

                final todayRevenue = summary?.netSales ?? 0.0;
                final transactionCount = summary?.totalTransactions ?? 0;

                final cards = [
                  _StatCard(
                    title: loc.t('todaySales'),
                    value: AppFormatters.currency(todayRevenue),
                    icon: Icons.payments_outlined,
                    color: theme.colorScheme.primary,
                  ),
                  _StatCard(
                    title: loc.t('totalTransactions'),
                    value: '$transactionCount',
                    icon: Icons.receipt_outlined,
                    color: const Color(0xFF1976D2),
                  ),
                  _StatCard(
                    title: loc.t('lowStock'),
                    value: '${lowStock.length}',
                    icon: Icons.warning_amber_rounded,
                    color: const Color(0xFFE65100),
                  ),
                  _StatCard(
                    title: loc.t('expiringSoon'),
                    value: '${expiring.length}',
                    icon: Icons.hourglass_bottom_outlined,
                    color: const Color(0xFFC2185B),
                  ),
                ];

                return LayoutBuilder(
                  builder: (context, constraints) {
                    if (constraints.maxWidth < 900) {
                      return GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 2.4,
                        children: cards,
                      );
                    }
                    return Row(
                      children: cards
                          .map((c) => Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6),
                                  child: c,
                                ),
                              ))
                          .toList(),
                    );
                  },
                );
              },
            ),

            const SizedBox(height: 28),

            // Recent Transactions Section
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      loc.t('recentSales'),
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    StreamBuilder(
                      stream: saleDao.watchAll(pharmacyId),
                      builder: (context, snapshot) {
                        if (!snapshot.hasData) {
                          return const Center(
                            child: Padding(
                              padding: EdgeInsets.all(24),
                              child: CircularProgressIndicator(),
                            ),
                          );
                        }

                        final sales = snapshot.data!;
                        if (sales.isEmpty) {
                          return Padding(
                            padding: const EdgeInsets.all(32),
                            child: Center(
                              child: Text(loc.t('noSalesYet')),
                            ),
                          );
                        }

                        final displaySales = sales.take(5).toList();

                        return Table(
                          columnWidths: const {
                            0: FlexColumnWidth(2),
                            1: FlexColumnWidth(2),
                            2: FlexColumnWidth(2),
                            3: FlexColumnWidth(1.5),
                            4: FlexColumnWidth(1.5),
                          },
                          children: [
                            TableRow(
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              children: [
                                Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Text(loc.t('invoiceNo'),
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12)),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Text(loc.t('time'),
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12)),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Text(loc.t('cashier'),
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12)),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Text(loc.t('total'),
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12)),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Text(loc.t('status'),
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12)),
                                ),
                              ],
                            ),
                            ...displaySales.map((s) {
                              return TableRow(
                                children: [
                                  Padding(
                                    padding: const EdgeInsets.all(10),
                                    child: Text(s.sale.invoiceNumber,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 12)),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(10),
                                    child: Text(
                                        AppFormatters.dateTime(s.sale.saleDate),
                                        style: const TextStyle(fontSize: 12)),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(10),
                                    child: Text(s.soldBy.name,
                                        style: const TextStyle(fontSize: 12)),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(10),
                                    child: Text(
                                        AppFormatters.currency(s.sale.total),
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12)),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(8),
                                    child: Align(
                                      alignment: Alignment.centerLeft,
                                      child: s.sale.status ==
                                              SaleStatus.completed
                                          ? StatusBadge.success(loc.t('completed'))
                                          : StatusBadge.error(loc.t('voided')),
                                    ),
                                  ),
                                ],
                              );
                            }),
                          ],
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
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
