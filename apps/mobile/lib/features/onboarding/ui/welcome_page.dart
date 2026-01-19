import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_text.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../core/routing/routes.dart';
import '../../../core/i18n/language_mode.dart';
import '../../../core/i18n/translate.dart';
import 'package:go_router/go_router.dart';

class WelcomePage extends ConsumerWidget {
  const WelcomePage({super.key, this.returnTo});

  final String? returnTo;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(languageModeProvider);
    return AppScaffold(
      title: trKey('ui.welcome', mode, fallback: 'Welcome'),
      appBarActions: [
        TextButton(
          onPressed: () => _goToCity(context, returnTo),
          child: Text(
            trKey('ui.skip', mode, fallback: 'Skip'),
            style: AppText.caption.copyWith(color: AppThemeColors.textMuted),
          ),
        ),
      ],
      body: ListView(
        children: [
          Text(
            trKey('ui.welcome_title', mode, fallback: 'A premium way to find property'),
            style: AppText.titleL,
          ),
          const SizedBox(height: AppTokens.s12),
          Text(
            trKey('ui.welcome_subtitle', mode, fallback: 'Trusted listings, curated for your city.'),
            style: AppText.body.copyWith(color: AppThemeColors.textMuted),
          ),
          const SizedBox(height: AppTokens.s24),
          _ValueCard(
            title: trKey('ui.value_verified', mode, fallback: 'Verified listings'),
            subtitle: trKey('ui.value_verified_sub', mode, fallback: 'Quality checks so you can browse with confidence.'),
            icon: Icons.verified_outlined,
          ),
          const SizedBox(height: AppTokens.s12),
          _ValueCard(
            title: trKey('ui.value_local', mode, fallback: 'Local expertise'),
            subtitle: trKey('ui.value_local_sub', mode, fallback: 'Discover property options across key cities.'),
            icon: Icons.location_on_outlined,
          ),
          const SizedBox(height: AppTokens.s12),
          _ValueCard(
            title: trKey('ui.value_updates', mode, fallback: 'Fresh updates'),
            subtitle: trKey('ui.value_updates_sub', mode, fallback: 'Stay on top of new listings and launches.'),
            icon: Icons.bolt_outlined,
          ),
          const SizedBox(height: AppTokens.s24),
          AppButton(
            label: trKey('ui.explore_now', mode, fallback: 'Explore now'),
            onPressed: () => _goToCity(context, returnTo),
            fullWidth: true,
          ),
          const SizedBox(height: AppTokens.s12),
          AppButton(
            label: trKey('ui.list_property', mode, fallback: 'Login to list property'),
            style: AppButtonStyle.secondary,
            onPressed: () {
              final dest = returnTo ?? AppRoutes.ownerDashboard;
              final encoded = Uri.encodeComponent(dest);
              context.go('${AppRoutes.ownerLogin}?returnTo=$encoded');
            },
            fullWidth: true,
          ),
        ],
      ),
    );
  }

  void _goToCity(BuildContext context, String? returnTo) {
    final next = returnTo == null ? '' : '?returnTo=${Uri.encodeComponent(returnTo)}';
    context.go('${AppRoutes.onboardingCity}$next');
  }
}

class _ValueCard extends StatelessWidget {
  const _ValueCard({required this.title, required this.subtitle, required this.icon});

  final String title;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppTokens.s16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppThemeColors.primary.withAlpha(30),
              borderRadius: BorderRadius.circular(AppTokens.r16),
            ),
            child: Icon(icon, color: AppThemeColors.primary),
          ),
          const SizedBox(width: AppTokens.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppText.titleM),
                const SizedBox(height: AppTokens.s8),
                Text(subtitle, style: AppText.caption.copyWith(color: AppThemeColors.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
