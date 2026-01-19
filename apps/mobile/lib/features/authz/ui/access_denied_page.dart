import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_text.dart';
import '../../../core/routing/routes.dart';
import '../../../core/auth/claims_parser.dart';
import 'package:go_router/go_router.dart';

class AccessDeniedPage extends ConsumerWidget {
  const AccessDeniedPage({
    super.key,
    required this.requiredRole,
    required this.fromPath,
  });

  final String? requiredRole;
  final String? fromPath;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final claims = ref.watch(claimsProvider).valueOrNull;
    final roles = claims?.roles.toList() ?? [];
    final roleLabel = requiredRole ?? 'authorized';
    return AppScaffold(
      title: 'Access denied',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'You do not have access to this section.',
            style: AppText.titleM,
          ),
          const SizedBox(height: AppTokens.s12),
          Text('Required role: $roleLabel', style: AppText.body),
          const SizedBox(height: AppTokens.s8),
          Text('Your roles: ${roles.isEmpty ? 'none' : roles.join(', ')}', style: AppText.body),
          if (fromPath != null) ...[
            const SizedBox(height: AppTokens.s8),
            Text('Requested: $fromPath', style: AppText.body),
          ],
          const SizedBox(height: AppTokens.s20),
          AppButton(
            label: 'Go to my dashboard',
            onPressed: () {
              final destination = claims?.homeRoute ?? AppRoutes.home;
              context.go(destination);
            },
            fullWidth: true,
          ),
          const SizedBox(height: AppTokens.s12),
          AppButton(
            label: 'Request access',
            onPressed: () => context.go('/business/request'),
            style: AppButtonStyle.secondary,
            fullWidth: true,
          ),
        ],
      ),
    );
  }
}
