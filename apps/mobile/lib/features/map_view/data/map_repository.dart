import '../../../core/network/contracts/map_contract.dart';
import '../../../shared/models/mock_data.dart';
import '../../../shared/models/property.dart';
import '../../../shared/models/property_pin.dart';

class MapRepositoryMock implements MapRepositoryContract {
  @override
  Future<List<Property>> getProperties(String citySlug) async {
    return MockData.properties.where((item) => item.citySlug == citySlug).toList();
  }

  @override
  Future<List<PropertyPin>> getPins(String citySlug) async {
    return MockData.properties
        .where((item) => item.citySlug == citySlug)
        .where((item) => item.lat != null && item.lng != null)
        .map((item) => PropertyPin(
              id: item.id,
              lat: item.lat ?? 0,
              lng: item.lng ?? 0,
              price: item.price,
              type: item.type,
            ))
        .toList();
  }
}
