import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/localization/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../shared/language_toggle.dart';

class AppShell extends ConsumerWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final authState = ref.watch(authStateProvider);
    final currentRoute = GoRouterState.of(context).uri.toString();
    final loc = AppLocalizations.of(context);

    final navItems = [
      _NavItem(
        icon: Icons.dashboard_outlined,
        activeIcon: Icons.dashboard,
        label: loc.t('dashboard'),
        route: '/',
      ),
      _NavItem(
        icon: Icons.point_of_sale_outlined,
        activeIcon: Icons.point_of_sale,
        label: loc.t('pos'),
        route: '/pos',
      ),
      _NavItem(
        icon: Icons.medication_outlined,
        activeIcon: Icons.medication,
        label: loc.t('medicines'),
        route: '/medicines',
      ),
      _NavItem(
        icon: Icons.shopping_bag_outlined,
        activeIcon: Icons.shopping_bag,
        label: loc.t('purchases'),
        route: '/purchases',
      ),
      _NavItem(
        icon: Icons.receipt_long_outlined,
        activeIcon: Icons.receipt_long,
        label: loc.t('prescriptions'),
        route: '/prescriptions',
      ),
      _NavItem(
        icon: Icons.inventory_2_outlined,
        activeIcon: Icons.inventory_2,
        label: loc.t('inventory'),
        route: '/inventory',
      ),
      _NavItem(
        icon: Icons.analytics_outlined,
        activeIcon: Icons.analytics,
        label: loc.t('reports'),
        route: '/reports',
      ),
    ];

    return Scaffold(
      body: Row(
        children: [
          // Sidebar
          Container(
            width: 250,
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(
                right: BorderSide(color: Colors.grey.shade200, width: 1),
              ),
            ),
            child: Column(
              children: [
                // Header Logo & Pharmacy name
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 20,
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary.withValues(
                            alpha: 0.12,
                          ),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Icons.local_pharmacy,
                          color: theme.colorScheme.primary,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              authState.currentPharmacy?.name ?? 'PharmaCare',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                            Text(
                              loc.t('appSubtitle'),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                // Language Toggle Bar inside Sidebar
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Center(child: LanguageToggle(compact: true)),
                ),
                const SizedBox(height: 12),
                const Divider(height: 1),
                const SizedBox(height: 8),

                // Navigation list
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    children: navItems.map((item) {
                      final isSelected = currentRoute == item.route;
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Material(
                          color: Colors.transparent,
                          child: ListTile(
                            dense: true,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            selected: isSelected,
                            selectedTileColor: theme.colorScheme.primary
                                .withValues(alpha: 0.08),
                            selectedColor: theme.colorScheme.primary,
                            leading: Icon(
                              isSelected ? item.activeIcon : item.icon,
                              color: isSelected
                                  ? theme.colorScheme.primary
                                  : Colors.grey.shade700,
                              size: 20,
                            ),
                            title: Text(
                              item.label,
                              style: TextStyle(
                                fontWeight: isSelected
                                    ? FontWeight.bold
                                    : FontWeight.w500,
                                fontSize: 13,
                              ),
                            ),
                            onTap: () {
                              if (!isSelected) {
                                context.go(item.route);
                              }
                            },
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),

                const Divider(height: 1),
                // Footer User info & logout
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 18,
                        backgroundColor: theme.colorScheme.primary.withValues(
                          alpha: 0.15,
                        ),
                        child: Text(
                          (authState.currentUser?.name.isNotEmpty == true)
                              ? authState.currentUser!.name[0].toUpperCase()
                              : 'U',
                          style: TextStyle(
                            color: theme.colorScheme.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              authState.currentUser?.name ?? loc.t('user'),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                            Text(
                              '@${authState.currentUser?.username ?? 'user'}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.logout, size: 18),
                        tooltip: loc.t('logout'),
                        onPressed: () {
                          ref.read(authStateProvider.notifier).logout();
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Main Content View
          Expanded(child: child),
        ],
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final String route;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.route,
  });
}
