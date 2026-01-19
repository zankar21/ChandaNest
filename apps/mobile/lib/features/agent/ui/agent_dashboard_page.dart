import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/stat_card.dart';
import '../../../shared/widgets/section_header.dart';
import '../../../shared/widgets/role_nav.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/skeletons.dart';
import '../../../shared/theme/tokens.dart';
import '../../../core/routing/routes.dart';
import 'package:go_router/go_router.dart';
import '../state/agent_provider.dart';

class AgentDashboardPage extends ConsumerWidget {
  const AgentDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(agentDashboardProvider);
    return AppScaffold(
      title: 'Agent Dashboard',
      body: ListView(
        children: [
          RoleNav(
            activeRoute: AppRoutes.agentDashboard,
            items: [
              RoleNavItem(label: 'Dashboard', route: AppRoutes.agentDashboard),
              RoleNavItem(label: 'Leads', route: AppRoutes.agentLeads),
              RoleNavItem(label: 'Listings', route: AppRoutes.agentListings),
            ],
          ),
          const SizedBox(height: AppTokens.s16),
          const SectionHeader(title: 'Quick stats'),
          const SizedBox(height: AppTokens.s12),
          stats.when(
            data: (data) => Row(
              children: [
                Expanded(child: StatCard(label: 'My Leads', value: data['leads']?.toString() ?? '0')),
                const SizedBox(width: AppTokens.s12),
                Expanded(child: StatCard(label: 'My Listings', value: data['listings']?.toString() ?? '0')),
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
          const SectionHeader(title: 'Actions'),
          const SizedBox(height: AppTokens.s12),
          Wrap(
            spacing: AppTokens.s12,
            runSpacing: AppTokens.s12,
            children: [
              _ActionCard(label: 'My Leads', route: AppRoutes.agentLeads),
              _ActionCard(label: 'My Listings', route: AppRoutes.agentListings),
              _ActionCard(label: 'Search Properties', route: AppRoutes.explore),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({required this.label, required this.route});

  final String label;
  final String route;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 160,
      child: AppButton(
        label: label,
        onPressed: () => context.go(route),
        style: AppButtonStyle.secondary,
      ),
    );
  }
}
