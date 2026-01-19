import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/stat_card.dart';
import '../../../shared/widgets/skeletons.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_text.dart';
import '../../owner_auth/state/owner_auth_provider.dart';
import '../state/owner_dashboard_provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/routing/routes.dart';

class OwnerDashboardPage extends ConsumerWidget {
  const OwnerDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(ownerDashboardProvider);

    return AppScaffold(
      title: 'Owner Dashboard',
      appBarActions: [
        IconButton(
          onPressed: () => ref.read(ownerAuthProvider.notifier).logout(),
          icon: const Icon(Icons.logout),
        ),
      ],
      body: summary.when(
        data: (data) => ListView(
          children: [
            Text('Overview', style: AppText.titleM),
            const SizedBox(height: AppTokens.s12),
            Row(
              children: [
                Expanded(child: StatCard(label: 'My listings', value: '${data['listings'] ?? 0}')),
                const SizedBox(width: AppTokens.s12),
                Expanded(child: StatCard(label: 'Leads', value: '${data['leads'] ?? 0}')),
              ],
            ),
            const SizedBox(height: AppTokens.s24),
            AppButton(
              onPressed: () => context.go(AppRoutes.ownerListings),
              label: 'My Listings',
              fullWidth: true,
            ),
            const SizedBox(height: AppTokens.s12),
            AppButton(
              onPressed: () => context.go(AppRoutes.ownerPost),
              label: 'Post Property',
              style: AppButtonStyle.secondary,
              fullWidth: true,
            ),
            const SizedBox(height: AppTokens.s12),
            AppButton(
              onPressed: () => context.go(AppRoutes.ownerLeads),
              label: 'Leads',
              style: AppButtonStyle.secondary,
              fullWidth: true,
            ),
          ],
        ),
        loading: () => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            SectionHeaderSkeleton(width: 120),
            SizedBox(height: AppTokens.s12),
            Row(
              children: [
                Expanded(child: PropertyCardSkeleton()),
                SizedBox(width: AppTokens.s12),
                Expanded(child: PropertyCardSkeleton()),
              ],
            ),
          ],
        ),
        error: (error, stack) => const Center(child: Text('Failed to load dashboard')),
      ),
    );
  }
}
