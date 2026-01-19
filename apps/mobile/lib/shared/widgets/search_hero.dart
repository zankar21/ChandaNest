import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/tokens.dart';
import '../theme/app_text.dart';
import '../../core/routing/routes.dart';
import '../../core/i18n/language_mode.dart';
import '../../core/i18n/translate.dart';
import 'app_input.dart';
import 'app_chip.dart';
import 'package:go_router/go_router.dart';

class SearchHero extends ConsumerWidget {
  const SearchHero({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(languageModeProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 300,
          margin: const EdgeInsets.symmetric(horizontal: -AppTokens.s16),
          width: double.infinity,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.asset(
                'assets/brand/home_hero.png',
                fit: BoxFit.cover,
              ),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0x110B0F18), Color(0x990B0F18), Color(0xE60B0F18)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment(0.2, -0.2),
                    radius: 1.2,
                    colors: [Color(0x33000000), Color(0xCC000000)],
                  ),
                ),
              ),
              SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16, vertical: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 8),
                      Text(
                        trKey('ui.find_next_place', mode, fallback: 'Find your next place'),
                        style: AppText.titleXL.copyWith(color: Colors.white),
                      ),
                      const SizedBox(height: AppTokens.s16),
                      AppInput(
                        readOnly: true,
                        onTap: () => context.go(AppRoutes.explore),
                        hintText: trKey('ui.search_hint', mode, fallback: 'Search by area, landmark, or builder'),
                        prefixIcon: Icons.search,
                      ),
                      const SizedBox(height: AppTokens.s8),
                      Text(
                        'Verified listings across your city',
                        style: AppText.caption.copyWith(color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        Transform.translate(
          offset: const Offset(0, -18),
          child: Padding(
            padding: const EdgeInsets.only(left: AppTokens.s16),
            child: SizedBox(
              height: 42,
              child: ListView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                children: [
                  _QuickChip(
                    label: trKey('ptype.land', mode, fallback: 'Land'),
                    isActive: true,
                    onTap: () => context.go(AppRoutes.explore),
                  ),
                  _QuickChip(
                    label: trKey('ptype.flat', mode, fallback: 'Flat'),
                    onTap: () => context.go(AppRoutes.explore),
                  ),
                  _QuickChip(
                    label: trKey('ui.projects', mode, fallback: 'Projects'),
                    onTap: () => context.go(AppRoutes.explore),
                  ),
                  _QuickChip(
                    label: trKey('ui.filters', mode, fallback: 'Filters'),
                    onTap: () => context.go(AppRoutes.explore),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _QuickChip extends StatelessWidget {
  const _QuickChip({required this.label, this.isActive = false, this.onTap});

  final String label;
  final bool isActive;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: AppTokens.s12),
      child: AppChip(label: label, isActive: isActive, onTap: onTap),
    );
  }
}
