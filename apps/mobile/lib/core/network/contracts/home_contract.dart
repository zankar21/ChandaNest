import '../../../shared/models/home_payload.dart';

abstract class HomeRepositoryContract {
  Future<HomePayload> getHome(String citySlug);
}
