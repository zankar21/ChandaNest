import '../../../shared/models/property.dart';

abstract class PropertyDetailsRepositoryContract {
  Future<Property> getDetails(String propertyId);
}
