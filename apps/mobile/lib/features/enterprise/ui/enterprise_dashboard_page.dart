import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/stat_card.dart';
import '../../../shared/widgets/section_header.dart';
import '../../../shared/widgets/role_nav.dart';
import '../../../shared/widgets/skeletons.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_text.dart';
import '../../../core/routing/routes.dart';
import '../state/enterprise_provider.dart';

class EnterpriseDashboardPage extends ConsumerWidget {
  const EnterpriseDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(enterpriseDashboardProvider);
    return AppScaffold(
      title: 'Enterprise Dashboard',
      body: ListView(
        children: [
          RoleNav(
            activeRoute: AppRoutes.enterpriseDashboard,
            items: [
              RoleNavItem(label: 'Dashboard', route: AppRoutes.enterpriseDashboard),
            ],
          ),
          const SizedBox(height: AppTokens.s16),
          const SectionHeader(title: 'Enterprise summary'),
          const SizedBox(height: AppTokens.s12),
          stats.when(
            data: (data) => Column(
              children: [
                Row(
                  children: [
                    Expanded(child: StatCard(label: 'Projects', value: data['projects']?.toString() ?? '0')),
                    const SizedBox(width: AppTokens.s12),
                    Expanded(child: StatCard(label: 'Inventory', value: data['inventory']?.toString() ?? '0')),
                  ],
                ),
                const SizedBox(height: AppTokens.s12),
                StatCard(label: 'Leads', value: data['leads']?.toString() ?? '0', subtitle: 'Last 30 days'),
              ],
            ),
            loading: () => const Row(
              children: [
                Expanded(child: PropertyCardSkeleton()),
                SizedBox(width: AppTokens.s12),
                Expanded(child: PropertyCardSkeleton()),
              ],
            ),
            error: (error, stack) => const Text('Dashboard data unavailable'),
          ),
          const SizedBox(height: AppTokens.s24),
          const SectionHeader(title: 'Next steps'),
          const SizedBox(height: AppTokens.s12),
          const Text('Review project inventory updates and incoming leads.', style: AppText.body),
        ],
      ),
    );
  }
}
