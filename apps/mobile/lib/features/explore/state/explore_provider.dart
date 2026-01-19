import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/media_signer.dart';
import '../../../core/network/contracts/explore_contract.dart';
import '../../../shared/models/property.dart';
import '../../city/state/city_provider.dart';
import '../data/explore_api_repository.dart';
import '../data/explore_repository.dart';

class ExploreState {
  ExploreState({required this.items, this.type, this.query, this.sort, this.minPrice, this.maxPrice});

  final List<Property> items;
  final String? type;
  final String? query;
  final String? sort;
  final int? minPrice;
  final int? maxPrice;
}

final exploreRepositoryProvider = Provider<ExploreRepositoryContract>((ref) {
  final api = ref.watch(apiClientProvider);
  if (Env.useMockData) {
    return ExploreRepositoryMock();
  }
  return ExploreRepositoryApi(api, MediaSigner(api));
});

final exploreProvider = AsyncNotifierProvider<ExploreNotifier, ExploreState>(ExploreNotifier.new);

class ExploreNotifier extends AsyncNotifier<ExploreState> {
  late final ExploreRepositoryContract _repo;

  @override
  Future<ExploreState> build() async {
    _repo = ref.read(exploreRepositoryProvider);
    final city = ref.watch(cityProvider);
    final items = await _repo.search(city);
    return ExploreState(items: items);
  }

  Future<void> applyFilters({
    String? type,
    String? query,
    String? sort,
    int? minPrice,
    int? maxPrice,
  }) async {
    state = const AsyncLoading();
    final city = ref.read(cityProvider);
    final items = await _repo.search(
      city,
      type: type,
      query: query,
      sort: sort,
      minPrice: minPrice,
      maxPrice: maxPrice,
    );
    state = AsyncValue.data(
      ExploreState(items: items, type: type, query: query, sort: sort, minPrice: minPrice, maxPrice: maxPrice),
    );
  }
}
