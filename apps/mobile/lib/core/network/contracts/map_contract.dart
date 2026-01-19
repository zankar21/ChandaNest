import '../../../shared/models/property.dart';
import '../../../shared/models/property_pin.dart';

abstract class MapRepositoryContract {
  Future<List<Property>> getProperties(String citySlug);
  Future<List<PropertyPin>> getPins(String citySlug);
}
