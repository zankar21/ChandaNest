import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/owner_dashboard_repository.dart';

final ownerDashboardProvider = AsyncNotifierProvider<OwnerDashboardNotifier, Map<String, int>>(OwnerDashboardNotifier.new);

class OwnerDashboardNotifier extends AsyncNotifier<Map<String, int>> {
  late final OwnerDashboardRepository _repo;

  @override
  Future<Map<String, int>> build() async {
    _repo = OwnerDashboardRepository();
    return _repo.loadSummary();
  }
}
