import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../../core/config/env.dart';
import '../../../core/storage/secure_store.dart';

class AuthSessionState {
  AuthSessionState({required this.token, required this.userId});

  final String? token;
  final String? userId;

  bool get isLoggedIn => (token != null && token!.isNotEmpty) || (userId != null && userId!.isNotEmpty);
}

final authSessionProvider = AsyncNotifierProvider<AuthSessionNotifier, AuthSessionState>(AuthSessionNotifier.new);

class AuthSessionNotifier extends AsyncNotifier<AuthSessionState> {
  late final SecureStore _store;
  StreamSubscription<User?>? _sub;

  @override
  Future<AuthSessionState> build() async {
    _store = SecureStore();
    if (Env.useMockData) {
      final token = await _store.readToken();
      return AuthSessionState(token: token, userId: token != null ? 'mock' : null);
    }
    final auth = FirebaseAuth.instance;
    _sub = auth.idTokenChanges().listen((user) {
      state = AsyncValue.data(AuthSessionState(token: null, userId: user?.uid));
    });
    ref.onDispose(() => _sub?.cancel());
    return AuthSessionState(token: null, userId: auth.currentUser?.uid);
  }

  Future<String?> getIdToken({bool forceRefresh = false}) async {
    if (Env.useMockData) {
      return _store.readToken();
    }
    final user = FirebaseAuth.instance.currentUser;
    return user?.getIdToken(forceRefresh);
  }

  Future<void> bootstrap() async {
    if (Env.useMockData) {
      final token = await _store.readToken();
      state = AsyncValue.data(AuthSessionState(token: token, userId: token != null ? 'mock' : null));
      return;
    }
    final user = FirebaseAuth.instance.currentUser;
    state = AsyncValue.data(AuthSessionState(token: null, userId: user?.uid));
  }

  Future<void> setToken(String token) async {
    if (!Env.useMockData) {
      return;
    }
    await _store.writeToken(token);
    state = AsyncValue.data(AuthSessionState(token: token, userId: 'mock'));
  }

  Future<void> logout() async {
    if (Env.useMockData) {
      await _store.clearToken();
      state = AsyncValue.data(AuthSessionState(token: null, userId: null));
      return;
    }
    await FirebaseAuth.instance.signOut();
    state = AsyncValue.data(AuthSessionState(token: null, userId: null));
  }
}
