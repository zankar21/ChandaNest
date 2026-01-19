import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/owner_auth_contract.dart';
import '../data/owner_auth_api_repository.dart';
import '../data/owner_auth_repository.dart';
import 'auth_session_provider.dart';

class OwnerAuthState {
  OwnerAuthState({required this.isLoggedIn, required this.isLoading, this.error, this.sessionId});

  final bool isLoggedIn;
  final bool isLoading;
  final String? error;
  final String? sessionId;

  OwnerAuthState copyWith({bool? isLoggedIn, bool? isLoading, String? error, String? sessionId}) {
    return OwnerAuthState(
      isLoggedIn: isLoggedIn ?? this.isLoggedIn,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      sessionId: sessionId ?? this.sessionId,
    );
  }
}

final ownerAuthRepositoryProvider = Provider<OwnerAuthRepositoryContract>((ref) {
  final api = ref.watch(apiClientProvider);
  if (Env.useMockData) {
    return OwnerAuthRepositoryMock();
  }
  return OwnerAuthRepositoryApi(api);
});

final ownerAuthProvider = AsyncNotifierProvider<OwnerAuthNotifier, OwnerAuthState>(OwnerAuthNotifier.new);

class OwnerAuthNotifier extends AsyncNotifier<OwnerAuthState> {
  late final OwnerAuthRepositoryContract _repo;
  String? _sessionId;

  @override
  Future<OwnerAuthState> build() async {
    _repo = ref.read(ownerAuthRepositoryProvider);
    final session = await ref.watch(authSessionProvider.future);
    return OwnerAuthState(isLoggedIn: session.isLoggedIn, isLoading: false);
  }

  Future<void> sendOtp(String phone) async {
    if (!Env.useMockData) {
      state = AsyncValue.data(OwnerAuthState(isLoggedIn: false, isLoading: false, error: 'Use Firebase Auth'));
      return;
    }
    state = const AsyncLoading();
    try {
      final sessionId = await _repo.startOtp(phone);
      _sessionId = sessionId;
      state = AsyncValue.data(OwnerAuthState(isLoggedIn: false, isLoading: false, sessionId: sessionId));
    } catch (e) {
      state = AsyncValue.data(OwnerAuthState(isLoggedIn: false, isLoading: false, error: e.toString()));
    }
  }

  Future<void> verifyOtp(String phone, String otp) async {
    if (!Env.useMockData) {
      state = AsyncValue.data(OwnerAuthState(isLoggedIn: false, isLoading: false, error: 'Use Firebase Auth'));
      return;
    }
    state = const AsyncLoading();
    try {
      final token = await _repo.verifyOtp(phone: phone, otp: otp, sessionId: _sessionId);
      await ref.read(authSessionProvider.notifier).setToken(token);
      state = AsyncValue.data(OwnerAuthState(isLoggedIn: true, isLoading: false));
    } catch (e) {
      state = AsyncValue.data(OwnerAuthState(isLoggedIn: false, isLoading: false, error: e.toString()));
    }
  }

  Future<void> logout() async {
    await ref.read(authSessionProvider.notifier).logout();
    state = AsyncValue.data(OwnerAuthState(isLoggedIn: false, isLoading: false));
  }
}
