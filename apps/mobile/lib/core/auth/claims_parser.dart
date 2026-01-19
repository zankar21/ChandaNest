import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/env.dart';
import '../routing/routes.dart';

class ClaimsInfo {
  ClaimsInfo({required this.roles, this.tenantId});

  final Set<String> roles;
  final String? tenantId;

  bool get isOwner => roles.contains('owner');
  bool get isAgent => roles.contains('agent') || roles.contains('broker');
  bool get isAgency => roles.contains('agency');
  bool get isEnterprise => roles.contains('enterprise') || roles.contains('builder');

  String get homeRoute {
    if (isEnterprise) return AppRoutes.enterpriseDashboard;
    if (isAgency) return AppRoutes.agencyDashboard;
    if (isAgent) return AppRoutes.agentDashboard;
    if (isOwner) return AppRoutes.ownerDashboard;
    return AppRoutes.home;
  }

  static ClaimsInfo mockOwner() {
    return ClaimsInfo(roles: {'owner'}, tenantId: Env.tenantId);
  }

  static ClaimsInfo fromClaims(Map<String, dynamic>? claims) {
    final roles = <String>{};
    final role = claims?['role'];
    if (role is String && role.isNotEmpty) {
      roles.add(role);
    }
    final rolesList = claims?['roles'];
    if (rolesList is List) {
      for (final item in rolesList) {
        if (item is String && item.isNotEmpty) {
          roles.add(item);
        }
      }
    }
    final tenantRole = claims?['tenantRole'];
    if (tenantRole is String && tenantRole.isNotEmpty) {
      roles.add(tenantRole);
    }
    final tenantId = claims?['tenantId']?.toString();
    return ClaimsInfo(roles: roles, tenantId: tenantId);
  }
}

final claimsProvider = StreamProvider<ClaimsInfo?>((ref) {
  if (Env.useMockData) {
    return Stream.value(ClaimsInfo.mockOwner());
  }
  return FirebaseAuth.instance.idTokenChanges().asyncMap((user) async {
    if (user == null) return null;
    final token = await user.getIdTokenResult();
    return ClaimsInfo.fromClaims(token.claims);
  });
});

Future<String> resolveRoleHome(WidgetRef ref, {String? returnTo}) async {
  if (returnTo != null && returnTo.isNotEmpty) {
    return returnTo;
  }
  final claims = await ref.read(claimsProvider.future);
  return claims?.homeRoute ?? AppRoutes.home;
}
