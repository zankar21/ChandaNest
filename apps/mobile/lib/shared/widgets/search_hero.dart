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
    final screenWidth = MediaQuery.of(context).size.width;
    final heroWidth = screenWidth + (AppTokens.s16 * 2);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 272,
          width: heroWidth,
          child: Transform.translate(
            offset: const Offset(-AppTokens.s16, 0),
            child: SizedBox(
              width: heroWidth,
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
                      padding: const EdgeInsets.symmetric(horizontal: AppTokens.s16, vertical: 18),
                      child: Container(
                        padding: const EdgeInsets.all(AppTokens.s16),
                        decoration: BoxDecoration(
                          color: Colors.black.withAlpha(80),
                          borderRadius: BorderRadius.circular(AppTokens.r20),
                          border: Border.all(color: Colors.white10),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              trKey('ui.find_next_place', mode, fallback: 'Find your next place'),
                              style: AppText.titleXL.copyWith(color: Colors.white),
                            ),
                            const SizedBox(height: AppTokens.s12),
                            AppInput(
                              readOnly: true,
                              onTap: () => context.go(AppRoutes.explore),
                              hintText: trKey('ui.search_hint', mode, fallback: 'Search by area, landmark, or builder'),
                              prefixIcon: Icons.search,
                              backgroundColor: Colors.white.withAlpha(18),
                              borderColor: Colors.white24,
                            ),
                            const SizedBox(height: AppTokens.s8),
                            Text(
                              'Verified listings across your city',
                              style: AppText.body.copyWith(color: Colors.white70),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
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
        Container(
          margin: const EdgeInsets.only(left: AppTokens.s16, right: AppTokens.s16, top: AppTokens.s8),
          height: 1,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.white.withAlpha(0),
                Colors.white.withAlpha(90),
                Colors.white.withAlpha(0),
              ],
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
