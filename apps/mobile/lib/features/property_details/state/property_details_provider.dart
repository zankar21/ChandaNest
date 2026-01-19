import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/details_contract.dart';
import '../../../core/network/media_signer.dart';
import '../../../shared/models/property.dart';
import '../data/property_details_api_repository.dart';
import '../data/property_details_repository.dart';

final propertyDetailsRepositoryProvider = Provider<PropertyDetailsRepositoryContract>((ref) {
  final api = ref.watch(apiClientProvider);
  if (Env.useMockData) {
    return PropertyDetailsRepositoryMock();
  }
  return PropertyDetailsRepositoryApi(api, MediaSigner(api));
});

final propertyDetailsProvider = FutureProvider.family<Property, String>((ref, id) async {
  final repo = ref.read(propertyDetailsRepositoryProvider);
  return repo.getDetails(id);
});
