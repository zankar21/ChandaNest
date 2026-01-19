import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/media_signer.dart';
import '../../../core/network/contracts/home_contract.dart';
import '../../../shared/models/home_payload.dart';
import '../../city/state/city_provider.dart';
import '../data/home_api_repository.dart';
import '../data/home_repository.dart';

final homeRepositoryProvider = Provider<HomeRepositoryContract>((ref) {
  final api = ref.watch(apiClientProvider);
  if (Env.useMockData) {
    return HomeRepositoryMock();
  }
  return HomeRepositoryApi(api, MediaSigner(api));
});

final homeProvider = AsyncNotifierProvider<HomeNotifier, HomePayload>(HomeNotifier.new);

class HomeNotifier extends AsyncNotifier<HomePayload> {
  late final HomeRepositoryContract _repo;

  @override
  Future<HomePayload> build() async {
    _repo = ref.read(homeRepositoryProvider);
    final city = ref.watch(cityProvider);
    return _repo.getHome(city);
  }

  Future<void> reload() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _repo.getHome(ref.read(cityProvider)));
  }
}
