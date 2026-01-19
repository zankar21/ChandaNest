import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_text.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../core/routing/routes.dart';
import '../../../core/config/constants.dart';
import '../../../features/city/state/city_provider.dart';
import '../../../core/i18n/language_mode.dart';
import '../../../core/i18n/translate.dart';
import 'package:go_router/go_router.dart';

class CitySelectPage extends ConsumerWidget {
  const CitySelectPage({super.key, this.returnTo});

  final String? returnTo;

  static const _citySlugs = [
    'chandrapur',
    'nagpur',
    'gadchiroli',
    'wardha',
    'yavatmal',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(languageModeProvider);
    return AppScaffold(
      title: trKey('ui.select_city', mode, fallback: 'Select city'),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              trKey('ui.city_headline', mode, fallback: 'Where are you exploring today?'),
              style: AppText.titleL,
            ),
            const SizedBox(height: AppTokens.s12),
            Text(
              trKey('ui.city_subtitle', mode, fallback: 'Pick a city to personalize listings.'),
              style: AppText.body.copyWith(color: AppThemeColors.textMuted),
            ),
            const SizedBox(height: AppTokens.s20),
            ..._citySlugs.map((slug) => Padding(
                  padding: const EdgeInsets.only(bottom: AppTokens.s12),
                  child: AppCard(
                    padding: const EdgeInsets.all(AppTokens.s16),
                    child: Row(
                      children: [
                        Icon(Icons.location_city_outlined, color: AppThemeColors.primary),
                        const SizedBox(width: AppTokens.s12),
                        Expanded(
                          child: Text(
                            AppConstants.cityNameForSlug(slug),
                            style: AppText.titleM,
                          ),
                        ),
                        AppButton(
                          label: trKey('ui.select', mode, fallback: 'Select'),
                          style: AppButtonStyle.secondary,
                          onPressed: () => _selectCity(context, ref, slug, returnTo),
                        ),
                      ],
                    ),
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Future<void> _selectCity(BuildContext context, WidgetRef ref, String slug, String? returnTo) async {
    await ref.read(cityProvider.notifier).setCity(slug);
    if (!context.mounted) return;
    final next = returnTo == null ? '' : '?returnTo=${Uri.encodeComponent(returnTo)}';
    context.go('${AppRoutes.onboardingLanguage}$next');
  }
}
