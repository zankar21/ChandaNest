import '../../../core/network/contracts/home_contract.dart';
import '../../../shared/models/home_payload.dart';
import '../../../shared/models/mock_data.dart';

class HomeRepositoryMock implements HomeRepositoryContract {
  @override
  Future<HomePayload> getHome(String citySlug) async {
    final properties = MockData.properties
        .where((item) => item.citySlug == citySlug)
        .take(6)
        .toList();
    final projects = MockData.projects.take(4).toList();
    return HomePayload(featuredProperties: properties, featuredProjects: projects);
  }
}
