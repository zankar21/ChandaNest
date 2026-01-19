import '../../../core/storage/local_store.dart';
import '../../../core/network/contracts/details_contract.dart';
import '../../../shared/models/property.dart';

class SavedRepository {
  SavedRepository({required this.store, required this.detailsRepository});

  final LocalStore store;
  final PropertyDetailsRepositoryContract detailsRepository;

  Future<Set<String>> _loadIds() async {
    return store.getSavedIds();
  }

  Future<void> toggleSaved(String id) async {
    final ids = await _loadIds();
    if (ids.contains(id)) {
      ids.remove(id);
    } else {
      ids.add(id);
    }
    await store.setSavedIds(ids);
  }

  Future<List<Property>> listSaved() async {
    final ids = await _loadIds();
    final items = await Future.wait(ids.map(detailsRepository.getDetails));
    return items;
  }
}
