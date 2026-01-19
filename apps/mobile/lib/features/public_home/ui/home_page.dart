import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/routing/routes.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_bottom_nav.dart';
import '../../../shared/widgets/search_hero.dart';
import '../../../shared/widgets/project_card.dart';
import '../../../shared/widgets/property_card.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/skeletons.dart';
import '../../../shared/widgets/section_header.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_text.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../core/i18n/language_mode.dart';
import '../../../core/i18n/translate.dart';
import '../../owner_auth/state/owner_auth_provider.dart';
import '../state/home_provider.dart';
import 'package:go_router/go_router.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final home = ref.watch(homeProvider);
    final auth = ref.watch(ownerAuthProvider);
    final loggedIn = auth.value?.isLoggedIn ?? false;
    final mode = ref.watch(languageModeProvider);

    return AppScaffold(
      title: trKey('ui.home', mode, fallback: 'Home'),
      titleWidget: Row(
        children: [
          Image.asset('assets/brand/logo.png', height: 22, fit: BoxFit.contain),
          const SizedBox(width: AppTokens.s8),
          Text(trKey('ui.home', mode, fallback: 'Home')),
        ],
      ),
      appBarActions: [
        IconButton(
          onPressed: () => context.go(AppRoutes.saved),
          icon: const Icon(Icons.bookmark_border),
        ),
      ],
      bottomNav: AppBottomNav(currentIndex: 0, isLoggedIn: loggedIn),
      body: ListView(
        children: [
          const SearchHero(),
          Container(
            margin: const EdgeInsets.only(top: 4, bottom: AppTokens.s20),
            height: 1,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppThemeColors.stroke.withAlpha(0),
                  AppThemeColors.stroke.withAlpha(120),
                  AppThemeColors.stroke.withAlpha(0),
                ],
              ),
            ),
          ),
          SectionHeader(
            title: trKey('ui.featured_projects', mode, fallback: 'Featured projects'),
            actionLabel: trKey('ui.view_all', mode, fallback: 'View all'),
            onAction: () => context.go(AppRoutes.explore),
          ),
          const SizedBox(height: AppTokens.s12),
          home.when(
            data: (payload) {
              if (payload.featuredProjects.isEmpty) {
                return _MarketingEmpty(
                  title: trKey('ui.no_projects', mode, fallback: 'No projects yet'),
                  subtitle: trKey('ui.no_projects_subtitle', mode, fallback: 'Check back soon for new launches.'),
                  ctaLabel: trKey('ui.notify', mode, fallback: 'Notify me'),
                );
              }
              return SizedBox(
                height: 240,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemBuilder: (context, index) {
                    final project = payload.featuredProjects[index];
                    return SizedBox(
                      width: 240,
                      child: ProjectCard(
                        project: project,
                        onTap: () => context.go(AppRoutes.explore),
                      ),
                    );
                  },
                  separatorBuilder: (_, index) => const SizedBox(width: AppTokens.s12),
                  itemCount: payload.featuredProjects.length,
                ),
              );
            },
            loading: () => SizedBox(
              height: 240,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemBuilder: (context, index) => const ProjectCardSkeleton(),
                separatorBuilder: (_, _) => const SizedBox(width: AppTokens.s12),
                itemCount: 3,
              ),
            ),
            error: (error, stack) => Text(trKey('ui.projects_failed', mode, fallback: 'Failed to load projects')),
          ),
          const SizedBox(height: AppTokens.s20),
          SectionHeader(
            title: trKey('ui.featured_properties', mode, fallback: 'Featured properties'),
            actionLabel: trKey('ui.see_all', mode, fallback: 'See all'),
            onAction: () => context.go(AppRoutes.explore),
          ),
          const SizedBox(height: AppTokens.s12),
          home.when(
            data: (payload) {
              if (payload.featuredProperties.isEmpty) {
                return EmptyState(
                  title: trKey('ui.no_properties', mode, fallback: 'No properties yet'),
                  subtitle: trKey('ui.no_properties_subtitle', mode, fallback: 'Try another city or check back soon.'),
                );
              }
              return Column(
                children: payload.featuredProperties
                    .take(6)
                    .map((property) => Padding(
                          padding: const EdgeInsets.only(bottom: AppTokens.s12),
                          child: PropertyCard(
                            property: property,
                            onTap: () => context.go('/p/${property.id}'),
                          ),
                        ))
                    .toList(),
              );
            },
            loading: () => Column(
              children: List.generate(
                3,
                (index) => const Padding(
                  padding: EdgeInsets.only(bottom: AppTokens.s12),
                  child: PropertyCardSkeleton(),
                ),
              ),
            ),
            error: (error, stack) => Text(trKey('ui.properties_failed', mode, fallback: 'Failed to load properties')),
          ),
        ],
      ),
    );
  }
}

class _MarketingEmpty extends StatelessWidget {
  const _MarketingEmpty({required this.title, required this.subtitle, required this.ctaLabel});

  final String title;
  final String subtitle;
  final String ctaLabel;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppTokens.s16),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppThemeColors.primary.withAlpha(30),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.campaign_outlined, color: AppThemeColors.primary),
          ),
          const SizedBox(width: AppTokens.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppText.titleM),
                const SizedBox(height: AppTokens.s8),
                Text(subtitle, style: AppText.muted),
              ],
            ),
          ),
          const SizedBox(width: AppTokens.s12),
          AppButton(label: ctaLabel, onPressed: () {}, style: AppButtonStyle.secondary),
        ],
      ),
    );
  }
}
