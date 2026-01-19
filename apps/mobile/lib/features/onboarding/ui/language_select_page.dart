import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_chip.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_text.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../core/i18n/language_mode.dart';
import '../../../core/i18n/translate.dart';
import '../../../core/storage/local_store.dart';
import '../../../core/routing/routes.dart';
import 'package:go_router/go_router.dart';

class LanguageSelectPage extends ConsumerWidget {
  const LanguageSelectPage({super.key, this.returnTo});

  final String? returnTo;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(languageModeProvider);
    return AppScaffold(
      title: trKey('ui.select_language', mode, fallback: 'Select language'),
      body: ListView(
        children: [
          Text(
            trKey('ui.language_headline', mode, fallback: 'Choose your language'),
            style: AppText.titleL,
          ),
          const SizedBox(height: AppTokens.s12),
          Text(
            trKey('ui.language_subtitle', mode, fallback: 'You can change this anytime in settings.'),
            style: AppText.body.copyWith(color: AppThemeColors.textMuted),
          ),
          const SizedBox(height: AppTokens.s24),
          Row(
            children: [
              AppChip(
                label: trKey('lang.en', mode, fallback: 'English'),
                isActive: mode == LanguageMode.en,
                onTap: () => ref.read(languageModeProvider.notifier).setMode(LanguageMode.en),
              ),
              const SizedBox(width: AppTokens.s12),
              AppChip(
                label: trKey('lang.mr', mode, fallback: 'Marathi'),
                isActive: mode == LanguageMode.mr,
                onTap: () => ref.read(languageModeProvider.notifier).setMode(LanguageMode.mr),
              ),
              const SizedBox(width: AppTokens.s12),
              AppChip(
                label: trKey('lang.hi', mode, fallback: 'Hindi'),
                isActive: mode == LanguageMode.hi,
                onTap: () => ref.read(languageModeProvider.notifier).setMode(LanguageMode.hi),
              ),
            ],
          ),
          const SizedBox(height: AppTokens.s24),
          AppButton(
            label: trKey('ui.continue', mode, fallback: 'Continue'),
            onPressed: () => _finish(context, ref, returnTo),
            fullWidth: true,
          ),
        ],
      ),
    );
  }

  Future<void> _finish(BuildContext context, WidgetRef ref, String? returnTo) async {
    final store = LocalStore();
    await store.setOnboardingDone(true);
    if (!context.mounted) return;
    final safeReturn = _sanitizeReturnTo(returnTo);
    context.go(safeReturn ?? AppRoutes.home);
  }

  String? _sanitizeReturnTo(String? value) {
    if (value == null || value.isEmpty) return null;
    if (value.startsWith(AppRoutes.onboardingCity) ||
        value.startsWith(AppRoutes.onboardingLanguage) ||
        value.startsWith(AppRoutes.welcome) ||
        value.startsWith(AppRoutes.splash)) {
      return null;
    }
    return value;
  }
}
