import '../auth/claims_parser.dart';

class RoleGuardResult {
  RoleGuardResult({required this.allowed, this.requiredRole});

  final bool allowed;
  final String? requiredRole;
}

String? requiredRoleForPath(String path) {
  if (path.startsWith('/owner')) return 'owner';
  if (path.startsWith('/agent')) return 'agent';
  if (path.startsWith('/agency')) return 'agency';
  if (path.startsWith('/enterprise')) return 'enterprise';
  return null;
}

RoleGuardResult checkRoleAccess(ClaimsInfo? claims, String path) {
  final required = requiredRoleForPath(path);
  if (required == null) {
    return RoleGuardResult(allowed: true);
  }
  if (claims == null) {
    return RoleGuardResult(allowed: false, requiredRole: required);
  }
  final roles = claims.roles;
  final allowed = _roleAllowed(roles, required);
  return RoleGuardResult(allowed: allowed, requiredRole: required);
}

bool _roleAllowed(Set<String> roles, String required) {
  if (required == 'owner') return roles.contains('owner');
  if (required == 'agent') return roles.contains('agent') || roles.contains('broker');
  if (required == 'agency') return roles.contains('agency');
  if (required == 'enterprise') return roles.contains('enterprise') || roles.contains('builder');
  return false;
}
