import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/price_pill.dart';
import '../../../shared/widgets/sticky_cta_bar.dart';
import '../../../shared/widgets/filter_chip.dart';
import '../../../shared/widgets/shimmer.dart';
import '../../../shared/widgets/nearby_section.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_text.dart';
import '../../../shared/theme/app_colors.dart';
import '../../saved/state/saved_provider.dart';
import '../state/property_details_provider.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/models/property.dart';
import '../../../core/i18n/language_mode.dart';
import '../../../core/i18n/translate.dart';

class PropertyDetailsPage extends ConsumerStatefulWidget {
  const PropertyDetailsPage({super.key, required this.propertyId});

  final String propertyId;

  @override
  ConsumerState<PropertyDetailsPage> createState() => _PropertyDetailsPageState();
}

class _PropertyDetailsPageState extends ConsumerState<PropertyDetailsPage> {
  bool expanded = false;
  int _galleryIndex = 0;
  final PageController _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final details = ref.watch(propertyDetailsProvider(widget.propertyId));
    final saved = ref.watch(savedProvider).valueOrNull;
    final mode = ref.watch(languageModeProvider);
    return AppScaffold(
      title: trKey('ui.property', mode, fallback: 'Property'),
      body: details.when(
        data: (property) {
          final isSaved = saved?.savedIds.contains(property.id) ?? false;
          final typeLabel = trKey(ptypeKey(property.type), mode, fallback: shortTypeLabel(property.type));
          final cityLabel = trCityFromSlug(property.citySlug, mode);
          final areaLabel = trLocality(property.area, mode);
          return Stack(
            children: [
              ListView(
                padding: const EdgeInsets.only(bottom: 96),
                children: [
                  _Gallery(
                    urls: _galleryUrls(property),
                    controller: _pageController,
                    index: _galleryIndex,
                    onPageChanged: (value) => setState(() => _galleryIndex = value),
                    mode: mode,
                  ),
                  const SizedBox(height: AppTokens.s16),
                  _KeyFacts(
                    priceLabel: formatINR(property.price),
                    title: property.title,
                    area: areaLabel,
                    typeLabel: typeLabel,
                    city: cityLabel,
                    badges: property.badges,
                    mode: mode,
                  ),
                  const SizedBox(height: AppTokens.s16),
                  _Description(
                    text: property.description,
                    expanded: expanded,
                    onToggle: () => setState(() => expanded = !expanded),
                    mode: mode,
                  ),
                  const SizedBox(height: AppTokens.s16),
                  _LocationSection(
                    lat: property.lat,
                    lng: property.lng,
                    area: areaLabel,
                    mode: mode,
                  ),
                  const SizedBox(height: AppTokens.s16),
                  NearbySection(
                    hasLocation: property.lat != null && property.lng != null,
                    mode: mode,
                  ),
                  const SizedBox(height: AppTokens.s16),
                  Row(
                    children: [
                      Expanded(
                        child: AppButton(
                          label: trKey('ui.share', mode, fallback: 'Share'),
                          icon: Icons.share_outlined,
                          style: AppButtonStyle.secondary,
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(trKey('ui.share_soon', mode, fallback: 'Share coming soon'))),
                            );
                          },
                        ),
                      ),
                      const SizedBox(width: AppTokens.s12),
                      Expanded(
                        child: AppButton(
                          label: isSaved ? trKey('ui.saved', mode, fallback: 'Saved') : trKey('ui.save', mode, fallback: 'Save'),
                          icon: isSaved ? Icons.favorite : Icons.favorite_border,
                          onPressed: () => ref.read(savedProvider.notifier).toggle(property.id),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: StickyCtaBar(
                  onCall: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(trKey('ui.call_soon', mode, fallback: 'Calling soon'))),
                    );
                  },
                  onWhatsapp: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(trKey('ui.whatsapp_soon', mode, fallback: 'WhatsApp soon'))),
                    );
                  },
                  onEnquire: () => context.go('/enquiry/${property.id}'),
                ),
              ),
            ],
          );
        },
        loading: () => Center(child: ShimmerBox(width: double.infinity, height: 220, radius: AppTokens.r20)),
        error: (error, stack) => Center(child: Text(trKey('ui.property_failed', mode, fallback: 'Failed to load property'))),
      ),
    );
  }

  List<String> _galleryUrls(Property property) {
    final urls = <String>[];
    final gallery = property.attrs['gallery'];
    if (gallery is List<dynamic>) {
      urls.addAll(gallery.map((item) => item.toString()).where((item) => item.isNotEmpty));
    }
    if (property.coverUrl != null && property.coverUrl!.isNotEmpty) {
      if (!urls.contains(property.coverUrl)) {
        urls.insert(0, property.coverUrl!);
      }
    }
    return urls;
  }
}

class _Gallery extends StatelessWidget {
  const _Gallery({
    required this.urls,
    required this.controller,
    required this.index,
    required this.onPageChanged,
    required this.mode,
  });

  final List<String> urls;
  final PageController controller;
  final int index;
  final ValueChanged<int> onPageChanged;
  final LanguageMode mode;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppTokens.r20),
      child: SizedBox(
        height: 220,
        child: urls.isNotEmpty
            ? Stack(
                children: [
                  PageView.builder(
                    controller: controller,
                    itemCount: urls.length,
                    onPageChanged: onPageChanged,
                    itemBuilder: (context, index) => Image.network(urls[index], fit: BoxFit.cover),
                  ),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 12,
                    child: _GalleryDots(count: urls.length, index: index),
                  ),
                ],
              )
            : Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF1B2233), Color(0xFF0F141E)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Center(
                  child: Text(
                    trKey('ui.no_image', mode, fallback: 'No image'),
                    style: AppText.caption.copyWith(color: AppThemeColors.textMuted),
                  ),
                ),
              ),
      ),
    );
  }
}

class _GalleryDots extends StatelessWidget {
  const _GalleryDots({required this.count, required this.index});

  final int count;
  final int index;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (i) {
        final active = i == index;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: active ? 16 : 8,
          height: 8,
          decoration: BoxDecoration(
            color: active ? AppThemeColors.textPrimary : AppThemeColors.textMuted,
            borderRadius: BorderRadius.circular(999),
          ),
        );
      }),
    );
  }
}

class _KeyFacts extends StatelessWidget {
  const _KeyFacts({
    required this.priceLabel,
    required this.title,
    required this.area,
    required this.typeLabel,
    required this.city,
    required this.badges,
    required this.mode,
  });

  final String priceLabel;
  final String title;
  final String area;
  final String typeLabel;
  final String city;
  final List<String> badges;
  final LanguageMode mode;

  @override
  Widget build(BuildContext context) {
    final verified = badges.any((badge) => badge.toLowerCase() == 'verified');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        PricePill(label: priceLabel),
        const SizedBox(height: AppTokens.s12),
        Text(title, style: AppText.titleL),
        const SizedBox(height: AppTokens.s8),
        Text(area, style: AppText.body.copyWith(color: AppThemeColors.textMuted)),
        const SizedBox(height: AppTokens.s12),
        Wrap(
          spacing: AppTokens.s8,
          runSpacing: AppTokens.s8,
          children: [
            FilterChipWidget(label: typeLabel, isSelected: true),
            FilterChipWidget(label: city, isSelected: true),
            if (verified)
              FilterChipWidget(label: trKey('ui.verified', mode, fallback: 'Verified'), isSelected: true),
          ],
        ),
        if (badges.isNotEmpty) ...[
          const SizedBox(height: AppTokens.s12),
          Wrap(
            spacing: AppTokens.s8,
            runSpacing: AppTokens.s8,
            children:
                badges.map((badge) => FilterChipWidget(label: trText(badge, mode), isSelected: true)).toList(),
          ),
        ],
      ],
    );
  }
}

class _LocationSection extends StatelessWidget {
  const _LocationSection({required this.lat, required this.lng, required this.area, required this.mode});

  final double? lat;
  final double? lng;
  final String area;
  final LanguageMode mode;

  @override
  Widget build(BuildContext context) {
    final hasLocation = lat != null && lng != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(trKey('ui.location', mode, fallback: 'Location'), style: AppText.titleM),
        const SizedBox(height: AppTokens.s12),
        AppCard(
          padding: const EdgeInsets.all(AppTokens.s16),
          child: SizedBox(
            height: 128,
            width: double.infinity,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.map_outlined, color: AppThemeColors.textMuted, size: 32),
                  const SizedBox(height: AppTokens.s8),
                  Text(
                    hasLocation
                        ? 'Lat ${lat!.toStringAsFixed(4)}, Lng ${lng!.toStringAsFixed(4)}'
                        : trKey('ui.location_unavailable', mode, fallback: 'Location unavailable'),
                    style: AppText.caption.copyWith(color: AppThemeColors.textMuted),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: AppTokens.s8),
        Row(
          children: [
            Icon(Icons.place_outlined, size: 16, color: AppThemeColors.textMuted),
            const SizedBox(width: 6),
            Expanded(
              child: Text(area, style: AppText.caption.copyWith(color: AppThemeColors.textMuted)),
            ),
            AppButton(
              label: trKey('ui.open_in_maps', mode, fallback: 'Open in maps'),
              style: AppButtonStyle.ghost,
              onPressed: hasLocation
                  ? () => ScaffoldMessenger.of(context)
                      .showSnackBar(SnackBar(content: Text(trKey('ui.map_soon', mode, fallback: 'Open in maps coming soon'))))
                  : null,
            ),
          ],
        ),
      ],
    );
  }
}

class _Description extends StatelessWidget {
  const _Description({required this.text, required this.expanded, required this.onToggle, required this.mode});

  final String text;
  final bool expanded;
  final VoidCallback onToggle;
  final LanguageMode mode;

  @override
  Widget build(BuildContext context) {
    final shouldTrim = text.length > 120;
    final display = expanded || !shouldTrim ? text : '${text.substring(0, 120)}...';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(trKey('ui.about', mode, fallback: 'About'), style: AppText.titleM),
        const SizedBox(height: AppTokens.s8),
        Text(display, style: AppText.body.copyWith(color: AppThemeColors.textMuted)),
        if (shouldTrim)
          AppButton(
            label: expanded ? trKey('ui.read_less', mode, fallback: 'Read less') : trKey('ui.read_more', mode, fallback: 'Read more'),
            style: AppButtonStyle.ghost,
            onPressed: onToggle,
          ),
      ],
    );
  }
}
