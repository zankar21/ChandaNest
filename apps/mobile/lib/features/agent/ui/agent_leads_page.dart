import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/role_nav.dart';
import '../../../shared/widgets/section_header.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/skeletons.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_text.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../core/routing/routes.dart';
import '../state/agent_provider.dart';

class AgentLeadsPage extends ConsumerWidget {
  const AgentLeadsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leads = ref.watch(agentLeadsProvider);
    return AppScaffold(
      title: 'Agent Leads',
      body: ListView(
        children: [
          RoleNav(
            activeRoute: AppRoutes.agentLeads,
            items: [
              RoleNavItem(label: 'Dashboard', route: AppRoutes.agentDashboard),
              RoleNavItem(label: 'Leads', route: AppRoutes.agentLeads),
              RoleNavItem(label: 'Listings', route: AppRoutes.agentListings),
            ],
          ),
          const SizedBox(height: AppTokens.s16),
          const SectionHeader(title: 'Recent leads'),
          const SizedBox(height: AppTokens.s12),
          leads.when(
            data: (items) {
              if (items.isEmpty) {
                return const Text('No leads available yet.');
              }
              return Column(
                children: items
                    .map((lead) => Padding(
                          padding: const EdgeInsets.only(bottom: AppTokens.s12),
                          child: AppCard(
                            padding: const EdgeInsets.all(AppTokens.s16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(lead['title']?.toString() ?? 'Lead', style: AppText.titleM),
                                const SizedBox(height: AppTokens.s8),
                                Text(
                                  lead['status']?.toString() ?? 'new',
                                  style: AppText.caption.copyWith(color: AppThemeColors.textMuted),
                                ),
                              ],
                            ),
                          ),
                        ))
                    .toList(),
              );
            },
            loading: () => ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemBuilder: (_, _) => const PropertyCardSkeleton(),
              separatorBuilder: (_, _) => const SizedBox(height: AppTokens.s12),
              itemCount: 3,
            ),
            error: (error, stack) => const Text('Failed to load leads'),
          ),
        ],
      ),
    );
  }
}
