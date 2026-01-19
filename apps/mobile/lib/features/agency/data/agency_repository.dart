import '../../../core/auth/tenant_resolver.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/agency_contract.dart';

class AgencyRepositoryApi implements AgencyRepositoryContract {
  AgencyRepositoryApi(this._api, this._tenantResolver);

  final ApiClient _api;
  final TenantResolver _tenantResolver;

  @override
  Future<Map<String, int>> getDashboard() async {
    try {
      final agents = await listAgents();
      final listings = await listOrgListings();
      final leads = await listLeads();
      return {
        'agents': agents.length,
        'listings': listings.length,
        'leads': leads.length,
      };
    } catch (_) {
      return _fallbackDashboard();
    }
  }

  @override
  Future<List<Map<String, dynamic>>> listAgents() async {
    try {
      final tenantId = await _tenantResolver.resolveTenantId();
      if (tenantId == null || tenantId.isEmpty) return [];
      final payload = await _api.get('/v1/tenants/$tenantId/principals/me');
      return _api.unwrapOkData<List<Map<String, dynamic>>>(payload, (data) {
        final list = data?['principals'] as List<dynamic>? ?? <dynamic>[];
        return list.map((item) => item as Map<String, dynamic>).toList();
      });
    } catch (_) {
      return [];
    }
  }

  @override
  Future<List<Map<String, dynamic>>> listOrgListings() async {
    try {
      final tenantId = await _tenantResolver.resolveTenantId();
      if (tenantId == null || tenantId.isEmpty) return [];
      final payload = await _api.get('/v1/tenants/$tenantId/org-listings', queryParameters: {
        'principalType': 'agency',
      });
      return _api.unwrapOkData<List<Map<String, dynamic>>>(payload, (data) {
        final list = data?['items'] as List<dynamic>? ?? <dynamic>[];
        return list.map((item) => item as Map<String, dynamic>).toList();
      });
    } catch (_) {
      return [];
    }
  }

  @override
  Future<List<Map<String, dynamic>>> listLeads() async {
    try {
      final tenantId = await _tenantResolver.resolveTenantId();
      if (tenantId == null || tenantId.isEmpty) return [];
      final payload = await _api.get('/v1/admin/leads', queryParameters: {'tenantId': tenantId, 'limit': 10});
      return _api.unwrapOkData<List<Map<String, dynamic>>>(payload, (data) {
        final list = data?['items'] as List<dynamic>? ?? <dynamic>[];
        return list.map((item) => item as Map<String, dynamic>).toList();
      });
    } catch (_) {
      return [];
    }
  }

  Map<String, int> _fallbackDashboard() {
    return {'agents': 0, 'listings': 0, 'leads': 0};
  }
}

class AgencyRepositoryMock implements AgencyRepositoryContract {
  @override
  Future<Map<String, int>> getDashboard() async {
    return {'agents': 8, 'listings': 24, 'leads': 15};
  }

  @override
  Future<List<Map<String, dynamic>>> listAgents() async {
    return [
      {'name': 'Agent A'},
      {'name': 'Agent B'},
    ];
  }

  @override
  Future<List<Map<String, dynamic>>> listOrgListings() async {
    return [
      {'title': 'Urban Heights 3 BHK'},
      {'title': 'Greenview Residency Plot'},
    ];
  }

  @override
  Future<List<Map<String, dynamic>>> listLeads() async {
    return [
      {'title': 'Lead from website', 'status': 'new'},
    ];
  }
}
