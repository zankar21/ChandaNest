import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/tokens.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import '../../core/utils/formatters.dart';
import '../../core/i18n/language_mode.dart';
import '../../core/i18n/translate.dart';
import '../models/property.dart';
import 'price_pill.dart';
import 'app_card.dart';

class PropertyCard extends ConsumerWidget {
  const PropertyCard({super.key, required this.property, this.onTap});

  final Property property;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(languageModeProvider);
    final areaText = trLocality(property.area, mode);
    final cityText = trCityFromSlug(property.citySlug, mode);
    final isVerified = property.badges.any((badge) => badge.toLowerCase() == 'verified');
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppTokens.r20),
      child: AppCard(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _MediaHeader(property: property, mode: mode, isVerified: isVerified),
            Padding(
              padding: const EdgeInsets.all(AppTokens.s16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    property.title,
                    style: AppText.titleM.copyWith(fontWeight: FontWeight.w700),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: AppTokens.s8),
                  Text(
                    _locationLine(areaText, cityText),
                    style: AppText.muted,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _locationLine(String area, String city) {
    final parts = [area, city].where((part) => part.trim().isNotEmpty).toList();
    return parts.join(' - ');
  }
}

class _MediaHeader extends StatelessWidget {
  const _MediaHeader({required this.property, required this.mode, required this.isVerified});

  final Property property;
  final LanguageMode mode;
  final bool isVerified;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(AppTokens.r20)),
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (property.coverUrl != null)
              Image.network(property.coverUrl!, fit: BoxFit.cover)
            else
              Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF1A2233), Color(0xFF0F141E)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Center(
                  child: Icon(Icons.image_outlined, color: Colors.white54, size: 32),
                ),
              ),
            const Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0x00000000), Color(0xAA000000)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
            ),
            Positioned(
              left: AppTokens.s12,
              top: AppTokens.s12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withAlpha(140),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.white12),
                ),
                child: Text(
                  trKey(ptypeKey(property.type), mode, fallback: shortTypeLabel(property.type)),
                  style: const TextStyle(fontSize: 12, color: Colors.white),
                ),
              ),
            ),
            if (isVerified)
              Positioned(
                left: AppTokens.s12,
                bottom: AppTokens.s12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppThemeColors.primary.withAlpha(160),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: AppThemeColors.primary.withAlpha(220)),
                  ),
                  child: Text(
                    trKey('ui.verified', mode, fallback: 'Verified'),
                    style: const TextStyle(fontSize: 11, color: Colors.white),
                  ),
                ),
              ),
            Positioned(
              right: AppTokens.s12,
              top: AppTokens.s12,
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Colors.black.withAlpha(128),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Icon(Icons.bookmark_border, size: 16, color: Colors.white),
              ),
            ),
            Positioned(
              right: AppTokens.s12,
              bottom: AppTokens.s12,
              child: PricePill(label: property.priceLabel),
            ),
          ],
        ),
      ),
    );
  }
}
