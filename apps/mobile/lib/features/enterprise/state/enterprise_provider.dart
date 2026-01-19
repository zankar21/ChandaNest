import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../../core/auth/tenant_resolver.dart';
import '../../../core/network/contracts/enterprise_contract.dart';
import '../data/enterprise_repository.dart';

final enterpriseRepositoryProvider = Provider<EnterpriseRepositoryContract>((ref) {
  final api = ref.watch(apiClientProvider);
  final resolver = ref.watch(tenantResolverProvider);
  if (Env.useMockData) {
    return EnterpriseRepositoryMock();
  }
  return EnterpriseRepositoryApi(api, resolver);
});

final enterpriseDashboardProvider = FutureProvider<Map<String, int>>((ref) async {
  final repo = ref.watch(enterpriseRepositoryProvider);
  return repo.getDashboard();
});
