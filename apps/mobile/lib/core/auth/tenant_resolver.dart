import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/env.dart';
import 'claims_parser.dart';

class TenantResolver {
  Future<String?> resolveTenantId() async {
    if (Env.useMockData) {
      return Env.tenantId.isNotEmpty ? Env.tenantId : null;
    }
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return Env.tenantId.isNotEmpty ? Env.tenantId : null;
    }
    final token = await user.getIdTokenResult();
    final claimsInfo = ClaimsInfo.fromClaims(token.claims);
    final claimTenant = claimsInfo.tenantId;
    if (claimTenant != null && claimTenant.isNotEmpty) return claimTenant;
    return Env.tenantId.isNotEmpty ? Env.tenantId : null;
  }
}

final tenantResolverProvider = Provider<TenantResolver>((ref) => TenantResolver());
