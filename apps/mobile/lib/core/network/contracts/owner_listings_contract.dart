import '../../../shared/models/property.dart';

abstract class OwnerListingsRepositoryContract {
  Future<List<Property>> getListings();
  Future<void> submit(String listingId);
  Future<void> publish(String listingId);
  Future<void> unpublish(String listingId);
}
