import '../../../core/auth/tenant_resolver.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/agent_contract.dart';

class AgentRepositoryApi implements AgentRepositoryContract {
  AgentRepositoryApi(this._api, this._tenantResolver);

  final ApiClient _api;
  final TenantResolver _tenantResolver;

  @override
  Future<Map<String, int>> getDashboard() async {
    try {
      final tenantId = await _tenantResolver.resolveTenantId();
      if (tenantId == null || tenantId.isEmpty) return _fallbackDashboard();
      final listings = await listListings();
      final leads = await listLeads();
      return {
        'listings': listings.length,
        'leads': leads.length,
      };
    } catch (_) {
      return _fallbackDashboard();
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

  @override
  Future<List<Map<String, dynamic>>> listListings() async {
    try {
      final tenantId = await _tenantResolver.resolveTenantId();
      if (tenantId == null || tenantId.isEmpty) return [];
      final payload = await _api.get('/v1/tenants/$tenantId/org-listings', queryParameters: {
        'principalType': 'agent',
      });
      return _api.unwrapOkData<List<Map<String, dynamic>>>(payload, (data) {
        final list = data?['items'] as List<dynamic>? ?? <dynamic>[];
        return list.map((item) => item as Map<String, dynamic>).toList();
      });
    } catch (_) {
      return [];
    }
  }

  Map<String, int> _fallbackDashboard() {
    return {'listings': 0, 'leads': 0};
  }
}

class AgentRepositoryMock implements AgentRepositoryContract {
  @override
  Future<Map<String, int>> getDashboard() async {
    return {'listings': 4, 'leads': 7};
  }

  @override
  Future<List<Map<String, dynamic>>> listLeads() async {
    return [
      {'title': 'Owner enquiry', 'status': 'new'},
      {'title': 'Site visit request', 'status': 'contacted'},
    ];
  }

  @override
  Future<List<Map<String, dynamic>>> listListings() async {
    return [
      {'title': 'Central Plaza Shop', 'status': 'published'},
      {'title': 'Greenview Residency Plot', 'status': 'draft'},
    ];
  }
}
