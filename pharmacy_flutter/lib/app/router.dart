import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../ui/dashboard/dashboard_page.dart';
import '../ui/inventory/inventory_page.dart';
import '../ui/login/login_page.dart';
import '../ui/medicines/medicines_page.dart';
import '../ui/prescriptions/prescriptions_page.dart';
import '../ui/purchases/purchases_page.dart';
import '../ui/reports/reports_page.dart';
import '../ui/sales/sales_page.dart';
import '../ui/setup/setup_wizard_page.dart';
import '../ui/shell/app_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      if (authState.isLoading) {
        return null;
      }

      final isGoingToSetup = state.matchedLocation == '/setup';
      final isGoingToLogin = state.matchedLocation == '/login';

      if (authState.isSetupRequired) {
        return isGoingToSetup ? null : '/setup';
      }

      if (!authState.isAuthenticated) {
        return isGoingToLogin ? null : '/login';
      }

      if (isGoingToLogin || isGoingToSetup) {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/setup',
        builder: (context, state) => const SetupWizardPage(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const DashboardPage(),
          ),
          GoRoute(
            path: '/pos',
            builder: (context, state) => const SalesPage(),
          ),
          GoRoute(
            path: '/medicines',
            builder: (context, state) => const MedicinesPage(),
          ),
          GoRoute(
            path: '/purchases',
            builder: (context, state) => const PurchasesPage(),
          ),
          GoRoute(
            path: '/prescriptions',
            builder: (context, state) => const PrescriptionsPage(),
          ),
          GoRoute(
            path: '/inventory',
            builder: (context, state) => const InventoryPage(),
          ),
          GoRoute(
            path: '/reports',
            builder: (context, state) => const ReportsPage(),
          ),
        ],
      ),
    ],
  );
});
