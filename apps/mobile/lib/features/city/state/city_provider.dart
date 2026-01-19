import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/env.dart';
import '../../../core/storage/local_store.dart';

final cityProvider = StateNotifierProvider<CityNotifier, String>((ref) => CityNotifier());

class CityNotifier extends StateNotifier<String> {
  CityNotifier() : super(Env.defaultCitySlug) {
    _load();
  }

  Future<void> _load() async {
    final store = LocalStore();
    final saved = await store.getCitySlug();
    if (saved != null && saved.isNotEmpty) {
      state = saved;
    }
  }

  Future<void> setCity(String citySlug) async {
    state = citySlug;
    final store = LocalStore();
    await store.setCitySlug(citySlug);
  }
}
