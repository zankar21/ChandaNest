import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../city/state/city_provider.dart';
import '../../../shared/models/property.dart';
import '../../../shared/models/property_pin.dart';
import '../data/map_repository.dart';
import '../../../core/config/env.dart';
import '../../../core/network/contracts/map_contract.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/media_signer.dart';
import '../data/map_api_repository.dart';

class MapState {
  MapState({required this.pins, required this.properties, this.selectedId});

  final List<PropertyPin> pins;
  final List<Property> properties;
  final String? selectedId;

  MapState copyWith({List<PropertyPin>? pins, List<Property>? properties, String? selectedId}) {
    return MapState(
      pins: pins ?? this.pins,
      properties: properties ?? this.properties,
      selectedId: selectedId ?? this.selectedId,
    );
  }
}

final mapRepositoryProvider = Provider<MapRepositoryContract>((ref) {
  final api = ref.watch(apiClientProvider);
  if (Env.useMockData) {
    return MapRepositoryMock();
  }
  return MapRepositoryApi(api, MediaSigner(api));
});

final mapProvider = AsyncNotifierProvider<MapNotifier, MapState>(MapNotifier.new);

class MapNotifier extends AsyncNotifier<MapState> {
  late final MapRepositoryContract _repo;

  @override
  Future<MapState> build() async {
    _repo = ref.read(mapRepositoryProvider);
    final city = ref.read(cityProvider);
    final properties = await _repo.getProperties(city);
    final pins = await _repo.getPins(city);
    return MapState(pins: pins, properties: properties);
  }

  void selectPin(String id) {
    state = AsyncValue.data(state.value!.copyWith(selectedId: id));
  }
}
