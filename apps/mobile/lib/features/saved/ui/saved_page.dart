import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/routing/routes.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_bottom_nav.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/property_card.dart';
import '../../../shared/widgets/skeletons.dart';
import '../../../shared/theme/tokens.dart';
import '../../owner_auth/state/owner_auth_provider.dart';
import '../state/saved_provider.dart';
import '../../../core/i18n/language_mode.dart';
import '../../../core/i18n/translate.dart';
import 'package:go_router/go_router.dart';

class SavedPage extends ConsumerWidget {
  const SavedPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(savedProvider);
    final auth = ref.watch(ownerAuthProvider);
    final loggedIn = auth.value?.isLoggedIn ?? false;
    final mode = ref.watch(languageModeProvider);

    return AppScaffold(
      title: trKey('ui.saved_tab', mode, fallback: 'Saved'),
      bottomNav: AppBottomNav(currentIndex: 3, isLoggedIn: loggedIn),
      body: saved.when(
        data: (state) {
          if (state.items.isEmpty) {
            return EmptyState(
              title: trKey('ui.no_saved', mode, fallback: 'No saved listings'),
              subtitle: trKey('ui.no_saved_subtitle', mode, fallback: 'Save listings to compare them later.'),
              actionLabel: trKey('ui.explore', mode, fallback: 'Explore'),
              onAction: () => context.go(AppRoutes.explore),
            );
          }
          return ListView.separated(
            itemBuilder: (context, index) {
              final property = state.items[index];
              return PropertyCard(
                property: property,
                onTap: () => context.go('/p/${property.id}'),
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
        error: (error, stack) =>
            Center(child: Text(trKey('ui.saved_failed', mode, fallback: 'Failed to load saved listings'))),
      ),
    );
  }
}
