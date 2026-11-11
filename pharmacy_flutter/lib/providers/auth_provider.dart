import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/database/database.dart';
import 'app_providers.dart';

class AuthState {
  final bool isLoading;
  final bool isSetupRequired;
  final User? currentUser;
  final Pharmacy? currentPharmacy;
  final String? errorMessage;

  const AuthState({
    this.isLoading = false,
    this.isSetupRequired = false,
    this.currentUser,
    this.currentPharmacy,
    this.errorMessage,
  });

  bool get isAuthenticated => currentUser != null;

  AuthState copyWith({
    bool? isLoading,
    bool? isSetupRequired,
    User? currentUser,
    Pharmacy? currentPharmacy,
    String? errorMessage,
    bool clearError = false,
    bool clearUser = false,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isSetupRequired: isSetupRequired ?? this.isSetupRequired,
      currentUser: clearUser ? null : (currentUser ?? this.currentUser),
      currentPharmacy: currentPharmacy ?? this.currentPharmacy,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final Ref _ref;

  AuthNotifier(this._ref) : super(const AuthState(isLoading: true)) {
    initialize();
  }

  Future<void> initialize() async {
    try {
      state = state.copyWith(isLoading: true, clearError: true);
      final authDao = _ref.read(authDaoProvider);
      final pharmacy = await authDao.getPharmacy();

      if (pharmacy == null) {
        state = state.copyWith(
          isLoading: false,
          isSetupRequired: true,
          clearUser: true,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          isSetupRequired: false,
          currentPharmacy: pharmacy,
        );
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> login(String username, String password) async {
    try {
      state = state.copyWith(isLoading: true, clearError: true);
      final authService = _ref.read(authServiceProvider);
      final authDao = _ref.read(authDaoProvider);

      final user = await authService.login(username, password);
      final pharmacy = await authDao.getPharmacy();

      state = state.copyWith(
        isLoading: false,
        currentUser: user,
        currentPharmacy: pharmacy,
        isSetupRequired: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      rethrow;
    }
  }

  Future<void> setupPharmacy({
    required String pharmacyName,
    String? licenseNumber,
    String? address,
    String? phone,
    required String adminName,
    required String adminUsername,
    required String adminPassword,
  }) async {
    try {
      state = state.copyWith(isLoading: true, clearError: true);
      final authService = _ref.read(authServiceProvider);
      final authDao = _ref.read(authDaoProvider);

      final adminUser = await authService.setupInitialPharmacy(
        pharmacyName: pharmacyName,
        licenseNumber: licenseNumber,
        address: address,
        phone: phone,
        adminName: adminName,
        adminUsername: adminUsername,
        adminPassword: adminPassword,
      );

      final pharmacy = await authDao.getPharmacy();

      state = state.copyWith(
        isLoading: false,
        isSetupRequired: false,
        currentUser: adminUser,
        currentPharmacy: pharmacy,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      rethrow;
    }
  }

  void logout() {
    state = state.copyWith(clearUser: true, clearError: true);
  }
}

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});
