import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/property_card.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_chip.dart';
import '../../../shared/widgets/skeletons.dart';
import '../../../shared/theme/tokens.dart';
import '../state/owner_listings_provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/routing/routes.dart';

class OwnerListingsPage extends ConsumerWidget {
  const OwnerListingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listings = ref.watch(ownerListingsProvider);
    return AppScaffold(
      title: 'My Listings',
      body: listings.when(
        data: (state) {
          if (state.items.isEmpty) {
            return EmptyState(
              title: 'No listings yet',
              subtitle: 'Create your first listing to get started.',
              actionLabel: 'Create listing',
              onAction: () => context.go(AppRoutes.ownerPost),
            );
          }
          return ListView.separated(
            itemBuilder: (context, index) {
              final property = state.items[index];
              final visibility = property.attrs['visibility']?.toString();
              final listingStatus = property.attrs['listingStatus']?.toString() ?? 'draft';
              final isPublished = visibility == 'published';
              final isSubmitted = listingStatus == 'submitted';
              final isBusy = state.busyIds.contains(property.id);
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  PropertyCard(
                    property: property,
                    onTap: () => context.go('/p/${property.id}'),
                  ),
                  const SizedBox(height: AppTokens.s8),
                  Row(
                    children: [
                      AppChip(label: isPublished ? 'Published' : 'Draft', isActive: isPublished),
                      const SizedBox(width: AppTokens.s8),
                      AppChip(label: 'Status: $listingStatus', isActive: isSubmitted),
                      const SizedBox(width: AppTokens.s8),
                      AppButton(
                        label: 'Edit',
                        style: AppButtonStyle.secondary,
                        onPressed: () => context.go('${AppRoutes.ownerEditBase}/${property.id}'),
                      ),
                      const SizedBox(width: AppTokens.s8),
                      if (!isPublished && !isSubmitted)
                        AppButton(
                          label: 'Submit',
                          onPressed: isBusy
                              ? null
                              : () => _confirmAction(
                                    context,
                                    'Submit',
                                    () async => ref.read(ownerListingsProvider.notifier).submit(property.id),
                                  ),
                        ),
                      if (!isPublished && isSubmitted)
                        AppButton(
                          label: 'Publish',
                          onPressed: isBusy
                              ? null
                              : () => _confirmAction(
                                    context,
                                    'Publish',
                                    () async => ref.read(ownerListingsProvider.notifier).publish(property.id),
                                  ),
                        ),
                      if (isPublished)
                        AppButton(
                          label: 'Unpublish',
                          onPressed: isBusy
                              ? null
                              : () => _confirmAction(
                                    context,
                                    'Unpublish',
                                    () async => ref.read(ownerListingsProvider.notifier).unpublish(property.id),
                                  ),
                        ),
                    ],
                  ),
                ],
              );
            },
            separatorBuilder: (_, index) => const SizedBox(height: AppTokens.s12),
            itemCount: state.items.length,
          );
        },
        loading: () => ListView.separated(
          itemBuilder: (_, _) => const PropertyCardSkeleton(),
          separatorBuilder: (_, _) => const SizedBox(height: AppTokens.s12),
          itemCount: 4,
        ),
        error: (error, stack) => const Center(child: Text('Failed to load listings')),
      ),
      appBarActions: [
        IconButton(
          onPressed: () => context.go(AppRoutes.ownerPost),
          icon: const Icon(Icons.add),
        ),
      ],
    );
  }

  Future<void> _confirmAction(BuildContext context, String action, Future<void> Function() onConfirm) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('$action listing'),
        content: Text('Are you sure you want to ${action.toLowerCase()} this listing?'),
        actions: [
          AppButton(
            label: 'Cancel',
            style: AppButtonStyle.ghost,
            onPressed: () => Navigator.of(context).pop(false),
          ),
          AppButton(
            label: action,
            onPressed: () => Navigator.of(context).pop(true),
          ),
        ],
      ),
    );
    if (result == true) {
      try {
        await onConfirm();
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$action successful')));
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Action failed. Try again.')));
        }
      }
    }
  }
}
