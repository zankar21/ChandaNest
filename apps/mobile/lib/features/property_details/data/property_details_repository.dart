import '../../../core/network/contracts/details_contract.dart';
import '../../../shared/models/mock_data.dart';
import '../../../shared/models/property.dart';

class PropertyDetailsRepositoryMock implements PropertyDetailsRepositoryContract {
  @override
  Future<Property> getDetails(String propertyId) async {
    return MockData.properties.firstWhere((item) => item.id == propertyId);
  }
}
