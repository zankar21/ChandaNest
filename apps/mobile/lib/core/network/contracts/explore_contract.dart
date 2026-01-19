import '../../../shared/models/property.dart';

abstract class ExploreRepositoryContract {
  Future<List<Property>> search(
    String citySlug, {
    String? type,
    String? query,
    String? sort,
    int? minPrice,
    int? maxPrice,
  });
}
