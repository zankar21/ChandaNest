import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/models/property.dart';
import '../../../core/storage/local_store.dart';
import '../../property_details/state/property_details_provider.dart';
import '../data/saved_repository.dart';

class SavedState {
  SavedState({required this.items, required this.savedIds});

  final List<Property> items;
  final Set<String> savedIds;

  SavedState copyWith({List<Property>? items, Set<String>? savedIds}) {
    return SavedState(items: items ?? this.items, savedIds: savedIds ?? this.savedIds);
  }
}

final savedProvider = AsyncNotifierProvider<SavedNotifier, SavedState>(SavedNotifier.new);

class SavedNotifier extends AsyncNotifier<SavedState> {
  late final SavedRepository _repo;

  @override
  Future<SavedState> build() async {
    final detailsRepo = ref.read(propertyDetailsRepositoryProvider);
    _repo = SavedRepository(store: LocalStore(), detailsRepository: detailsRepo);
    final items = await _repo.listSaved();
    return SavedState(items: items, savedIds: items.map((e) => e.id).toSet());
  }

  Future<void> toggle(String id) async {
    await _repo.toggleSaved(id);
    final items = await _repo.listSaved();
    state = AsyncValue.data(SavedState(items: items, savedIds: items.map((e) => e.id).toSet()));
  }

  bool isSaved(String id) => state.value?.savedIds.contains(id) ?? false;
}
