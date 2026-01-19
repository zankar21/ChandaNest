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

class AgentListingsPage extends ConsumerWidget {
  const AgentListingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listings = ref.watch(agentListingsProvider);
    return AppScaffold(
      title: 'Agent Listings',
      body: ListView(
        children: [
          RoleNav(
            activeRoute: AppRoutes.agentListings,
            items: [
              RoleNavItem(label: 'Dashboard', route: AppRoutes.agentDashboard),
              RoleNavItem(label: 'Leads', route: AppRoutes.agentLeads),
              RoleNavItem(label: 'Listings', route: AppRoutes.agentListings),
            ],
          ),
          const SizedBox(height: AppTokens.s16),
          const SectionHeader(title: 'My listings'),
          const SizedBox(height: AppTokens.s12),
          listings.when(
            data: (items) {
              if (items.isEmpty) {
                return const Text('No listings available yet.');
              }
              return Column(
                children: items
                    .map((listing) => Padding(
                          padding: const EdgeInsets.only(bottom: AppTokens.s12),
                          child: AppCard(
                            padding: const EdgeInsets.all(AppTokens.s16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  listing['title']?.toString() ?? 'Listing',
                                  style: AppText.titleM,
                                ),
                                const SizedBox(height: AppTokens.s8),
                                Text(
                                  listing['status']?.toString() ?? 'draft',
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
            error: (error, stack) => const Text('Failed to load listings'),
          ),
        ],
      ),
    );
  }
}
