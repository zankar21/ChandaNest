import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_bottom_nav.dart';
import '../../../shared/widgets/property_card.dart';
import '../../../shared/widgets/filter_chip.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/skeletons.dart';
import '../../../shared/widgets/app_input.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_chip.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_text.dart';
import '../../../core/i18n/language_mode.dart';
import '../../../core/i18n/translate.dart';
import '../state/explore_provider.dart';
import '../../owner_auth/state/owner_auth_provider.dart';
import 'package:go_router/go_router.dart';

class ExplorePage extends ConsumerStatefulWidget {
  const ExplorePage({super.key});

  @override
  ConsumerState<ExplorePage> createState() => _ExplorePageState();
}

class _ExplorePageState extends ConsumerState<ExplorePage> {
  final _searchController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final explore = ref.watch(exploreProvider);
    final auth = ref.watch(ownerAuthProvider);
    final loggedIn = auth.value?.isLoggedIn ?? false;
    final mode = ref.watch(languageModeProvider);

    return AppScaffold(
      title: trKey('ui.explore', mode, fallback: 'Explore'),
      bottomNav: AppBottomNav(currentIndex: 1, isLoggedIn: loggedIn),
      body: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: AppInput(
                  controller: _searchController,
                  onSubmitted: (value) => ref.read(exploreProvider.notifier).applyFilters(query: value),
                  hintText: trKey('ui.search_listings', mode, fallback: 'Search listings'),
                  prefixIcon: Icons.search,
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.tune),
                    onPressed: () => _openFilters(context),
                  ),
                ),
              ),
              const SizedBox(width: AppTokens.s8),
              _LanguageToggle(
                mode: mode,
                onChanged: (value) => ref.read(languageModeProvider.notifier).setMode(value),
              ),
            ],
          ),
          const SizedBox(height: AppTokens.s16),
          Expanded(
            child: explore.when(
              data: (state) {
                if (state.items.isEmpty) {
                  return EmptyState(
                    title: trKey('ui.no_results', mode, fallback: 'No results'),
                    subtitle: trKey('ui.no_results_subtitle', mode, fallback: 'Try adjusting filters or search terms.'),
                    actionLabel: trKey('ui.reset', mode, fallback: 'Reset'),
                    onAction: () => ref.read(exploreProvider.notifier).applyFilters(type: 'all', query: ''),
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
                itemBuilder: (context, index) => const PropertyCardSkeleton(),
                separatorBuilder: (_, index) => const SizedBox(height: AppTokens.s12),
                itemCount: 5,
              ),
              error: (error, stack) =>
                  Center(child: Text(trKey('ui.listings_failed', mode, fallback: 'Failed to load listings'))),
            ),
          ),
        ],
      ),
    );
  }

  void _openFilters(BuildContext context) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (context) => _FilterSheet(onApply: (filters) {
        ref.read(exploreProvider.notifier).applyFilters(
          type: filters.type,
          sort: filters.sort,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        );
      }),
    );
  }
}

class _FilterSheet extends ConsumerStatefulWidget {
  const _FilterSheet({required this.onApply});

  final void Function(_Filters filters) onApply;

  @override
  ConsumerState<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends ConsumerState<_FilterSheet> {
  String type = 'all';
  String sort = 'recent';
  int? minPrice;
  int? maxPrice;

  @override
  Widget build(BuildContext context) {
    final mode = ref.watch(languageModeProvider);
    return Padding(
      padding: const EdgeInsets.all(AppTokens.s16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(trKey('ui.type', mode, fallback: 'Type'), style: AppText.titleM),
          const SizedBox(height: AppTokens.s8),
          Wrap(
            spacing: AppTokens.s8,
            children: [
              _typeChip('all', trKey('ui.all', mode, fallback: 'All')),
              _typeChip('land', trKey('ptype.land', mode, fallback: 'Land')),
              _typeChip('plot', trKey('ptype.plot', mode, fallback: 'Plot')),
              _typeChip('flat', trKey('ptype.flat', mode, fallback: 'Flat')),
              _typeChip('house', trKey('ptype.house', mode, fallback: 'House')),
              _typeChip('villa', 'Villa'),
              _typeChip('office', 'Office'),
              _typeChip('shop', 'Shop'),
              _typeChip('warehouse', 'Warehouse'),
              _typeChip('rent', 'Rent'),
            ],
          ),
          const SizedBox(height: AppTokens.s16),
          Text(trKey('ui.price', mode, fallback: 'Price'), style: AppText.titleM),
          const SizedBox(height: AppTokens.s8),
          Wrap(
            spacing: AppTokens.s8,
            children: [
              _priceChip(0, 5000000, '<5L'),
              _priceChip(5000000, 15000000, '5-15L'),
              _priceChip(15000000, 50000000, '15-50L'),
              _priceChip(50000000, null, '50L+'),
            ],
          ),
          const SizedBox(height: AppTokens.s16),
          Text(trKey('ui.sort', mode, fallback: 'Sort'), style: AppText.titleM),
          const SizedBox(height: AppTokens.s8),
          Wrap(
            spacing: AppTokens.s8,
            children: [
              _sortChip('recent', trKey('ui.recent', mode, fallback: 'Recent')),
              _sortChip('price_low', trKey('ui.price_low', mode, fallback: 'Price low-high')),
              _sortChip('price_high', trKey('ui.price_high', mode, fallback: 'Price high-low')),
            ],
          ),
          const SizedBox(height: AppTokens.s16),
          AppButton(
            label: trKey('ui.apply_filters', mode, fallback: 'Apply filters'),
            onPressed: () {
              widget.onApply(_Filters(type: type, sort: sort, minPrice: minPrice, maxPrice: maxPrice));
              Navigator.of(context).pop();
            },
            fullWidth: true,
          ),
        ],
      ),
    );
  }

  Widget _typeChip(String value, String label) {
    return FilterChipWidget(
      label: label,
      isSelected: type == value,
      onTap: () => setState(() => type = value),
    );
  }

  Widget _sortChip(String value, String label) {
    return FilterChipWidget(
      label: label,
      isSelected: sort == value,
      onTap: () => setState(() => sort = value),
    );
  }

  Widget _priceChip(int? min, int? max, String label) {
    final selected = minPrice == min && maxPrice == max;
    return FilterChipWidget(
      label: label,
      isSelected: selected,
      onTap: () => setState(() {
        minPrice = min;
        maxPrice = max;
      }),
    );
  }
}

class _Filters {
  _Filters({required this.type, required this.sort, this.minPrice, this.maxPrice});

  final String type;
  final String sort;
  final int? minPrice;
  final int? maxPrice;
}

class _LanguageToggle extends StatelessWidget {
  const _LanguageToggle({required this.mode, required this.onChanged});

  final LanguageMode mode;
  final ValueChanged<LanguageMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        AppChip(
          label: 'EN',
          isActive: mode == LanguageMode.en,
          onTap: () => onChanged(LanguageMode.en),
        ),
        const SizedBox(width: AppTokens.s8),
        AppChip(
          label: 'MR',
          isActive: mode == LanguageMode.mr,
          onTap: () => onChanged(LanguageMode.mr),
        ),
        const SizedBox(width: AppTokens.s8),
        AppChip(
          label: 'HI',
          isActive: mode == LanguageMode.hi,
          onTap: () => onChanged(LanguageMode.hi),
        ),
      ],
    );
  }
}
