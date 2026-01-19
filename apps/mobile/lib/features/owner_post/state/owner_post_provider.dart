import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/auth/tenant_resolver.dart';
import '../data/owner_post_repository.dart';

final ownerPostRepositoryProvider = Provider<OwnerPostRepository>((ref) {
  final api = ref.watch(apiClientProvider);
  final resolver = ref.watch(tenantResolverProvider);
  return OwnerPostRepository(api, resolver);
});
