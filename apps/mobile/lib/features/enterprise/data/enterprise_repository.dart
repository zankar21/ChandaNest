import '../../../core/auth/tenant_resolver.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/contracts/enterprise_contract.dart';

class EnterpriseRepositoryApi implements EnterpriseRepositoryContract {
  EnterpriseRepositoryApi(this._api, this._tenantResolver);

  final ApiClient _api;
  final TenantResolver _tenantResolver;

  @override
  Future<Map<String, int>> getDashboard() async {
    try {
      final projects = await listProjects();
      final inventory = await listInventory();
      final leads = await listLeads();
      return {
        'projects': projects.length,
        'inventory': inventory.length,
        'leads': leads.length,
      };
    } catch (_) {
      return _fallbackDashboard();
    }
  }

  @override
  Future<List<Map<String, dynamic>>> listProjects() async {
    try {
      final tenantId = await _tenantResolver.resolveTenantId();
      if (tenantId == null || tenantId.isEmpty) return [];
      final payload = await _api.get('/v1/tenants/$tenantId/projects');
      return _api.unwrapOkData<List<Map<String, dynamic>>>(payload, (data) {
        final list = data?['items'] as List<dynamic>? ?? <dynamic>[];
        return list.map((item) => item as Map<String, dynamic>).toList();
      });
    } catch (_) {
      return [];
    }
  }

  @override
  Future<List<Map<String, dynamic>>> listInventory() async {
    return [];
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
    return {'projects': 0, 'inventory': 0, 'leads': 0};
  }
}

class EnterpriseRepositoryMock implements EnterpriseRepositoryContract {
  @override
  Future<Map<String, int>> getDashboard() async {
    return {'projects': 3, 'inventory': 120, 'leads': 28};
  }

  @override
  Future<List<Map<String, dynamic>>> listProjects() async {
    return [
      {'name': 'Skyline Heights'},
      {'name': 'Emerald Enclave'},
    ];
  }

  @override
  Future<List<Map<String, dynamic>>> listInventory() async {
    return [
      {'unit': '2 BHK', 'status': 'available'},
    ];
  }

  @override
  Future<List<Map<String, dynamic>>> listLeads() async {
    return [
      {'title': 'Project enquiry', 'status': 'new'},
    ];
  }
}
