import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/private_media_signer.dart';
import '../../../core/network/contracts/owner_listings_contract.dart';
import '../../../shared/models/property.dart';
import '../../../core/auth/tenant_resolver.dart';
import '../data/owner_listings_api_repository.dart';
import '../data/owner_listings_repository.dart';

final ownerListingsRepositoryProvider = Provider<OwnerListingsRepositoryContract>((ref) {
  final api = ref.watch(apiClientProvider);
  final resolver = ref.watch(tenantResolverProvider);
  if (Env.useMockData) {
    return OwnerListingsRepositoryMock();
  }
  return OwnerListingsRepositoryApi(api, PrivateMediaSigner(api), resolver);
});

class OwnerListingsState {
  OwnerListingsState({required this.items, required this.busyIds});

  final List<Property> items;
  final Set<String> busyIds;

  OwnerListingsState copyWith({List<Property>? items, Set<String>? busyIds}) {
    return OwnerListingsState(items: items ?? this.items, busyIds: busyIds ?? this.busyIds);
  }
}

final ownerListingsProvider = AsyncNotifierProvider<OwnerListingsNotifier, OwnerListingsState>(OwnerListingsNotifier.new);

class OwnerListingsNotifier extends AsyncNotifier<OwnerListingsState> {
  late final OwnerListingsRepositoryContract _repo;

  @override
  Future<OwnerListingsState> build() async {
    _repo = ref.read(ownerListingsRepositoryProvider);
    final items = await _repo.getListings();
    return OwnerListingsState(items: items, busyIds: {});
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    final items = await _repo.getListings();
    state = AsyncValue.data(OwnerListingsState(items: items, busyIds: {}));
  }

  Future<void> submit(String listingId) async {
    await _runAction(
      listingId,
      () => _repo.submit(listingId),
      const {'listingStatus': 'submitted'},
    );
  }

  Future<void> publish(String listingId) async {
    await _runAction(
      listingId,
      () => _repo.publish(listingId),
      const {'visibility': 'published'},
    );
  }

  Future<void> unpublish(String listingId) async {
    await _runAction(
      listingId,
      () => _repo.unpublish(listingId),
      const {'visibility': 'draft'},
    );
  }

  Future<void> _runAction(
    String listingId,
    Future<void> Function() action,
    Map<String, String> updates,
  ) async {
    final current = state.value;
    if (current == null) return;
    final busy = {...current.busyIds, listingId};
    state = AsyncValue.data(current.copyWith(busyIds: busy));
    try {
      await action();
      final updated = current.items.map((item) {
        if (item.id != listingId) return item;
        return item.copyWith(attrs: {...item.attrs, ...updates});
      }).toList();
      state = AsyncValue.data(OwnerListingsState(items: updated, busyIds: busy..remove(listingId)));
    } catch (e) {
      state = AsyncValue.data(current.copyWith(busyIds: busy..remove(listingId)));
      rethrow;
    }
  }
}
