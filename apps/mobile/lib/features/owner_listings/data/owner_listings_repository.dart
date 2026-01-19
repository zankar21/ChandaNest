import '../../../core/network/contracts/owner_listings_contract.dart';
import '../../../shared/models/mock_data.dart';
import '../../../shared/models/property.dart';

class OwnerListingsRepositoryMock implements OwnerListingsRepositoryContract {
  final Map<String, String> _visibility = {};
  final Map<String, String> _listingStatus = {};

  @override
  Future<List<Property>> getListings() async {
    return MockData.properties.take(3).map((item) {
      final visibility = _visibility[item.id];
      final status = _listingStatus[item.id];
      if (visibility == null) return item;
      return item.copyWith(attrs: {...item.attrs, 'visibility': visibility, if (status != null) 'listingStatus': status});
    }).toList();
  }

  @override
  Future<void> submit(String listingId) async {
    _listingStatus[listingId] = 'submitted';
  }

  @override
  Future<void> publish(String listingId) async {
    _visibility[listingId] = 'published';
  }

  @override
  Future<void> unpublish(String listingId) async {
    _visibility[listingId] = 'draft';
  }
}
