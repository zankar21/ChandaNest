import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/skeletons.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_text.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../core/network/errors.dart';
import '../state/owner_leads_provider.dart';

class OwnerLeadsPage extends ConsumerWidget {
  const OwnerLeadsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leads = ref.watch(ownerLeadsProvider);
    return AppScaffold(
      title: 'Leads',
      body: leads.when(
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('No leads yet'));
          }
          return ListView.separated(
            itemBuilder: (context, index) {
              final lead = items[index];
              return AppCard(
                padding: const EdgeInsets.all(AppTokens.s16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(lead.propertyTitle, style: AppText.titleM),
                    const SizedBox(height: AppTokens.s8),
                    Text(lead.message, style: AppText.body),
                    const SizedBox(height: AppTokens.s8),
                    Text(
                      lead.createdAt.toIso8601String(),
                      style: AppText.caption.copyWith(color: AppThemeColors.textMuted),
                    ),
                  ],
                ),
              );
            },
            separatorBuilder: (_, index) => const SizedBox(height: AppTokens.s12),
            itemCount: items.length,
          );
        },
        loading: () => ListView.separated(
          itemBuilder: (_, _) => const PropertyCardSkeleton(),
          separatorBuilder: (_, _) => const SizedBox(height: AppTokens.s12),
          itemCount: 3,
        ),
        error: (error, stack) {
          final message = error is ApiException ? error.message : 'Failed to load leads';
          return EmptyState(
            title: 'Not available yet',
            subtitle: message,
          );
        },
      ),
    );
  }
}
