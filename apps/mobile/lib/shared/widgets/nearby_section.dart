import 'package:flutter/material.dart';
import '../../core/i18n/language_mode.dart';
import '../../core/i18n/translate.dart';
import '../theme/tokens.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import '../widgets/app_card.dart';

class NearbySection extends StatelessWidget {
  const NearbySection({super.key, required this.hasLocation, required this.mode});

  final bool hasLocation;
  final LanguageMode mode;

  @override
  Widget build(BuildContext context) {
    final items = [
      _NearbyItem(label: trKey('ui.hospital', mode, fallback: 'Hospital'), icon: Icons.local_hospital_outlined),
      _NearbyItem(label: trKey('ui.school', mode, fallback: 'School'), icon: Icons.school_outlined),
      _NearbyItem(label: trKey('ui.market', mode, fallback: 'Market'), icon: Icons.storefront_outlined),
      _NearbyItem(label: trKey('ui.police', mode, fallback: 'Police'), icon: Icons.local_police_outlined),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(trKey('ui.nearby', mode, fallback: 'Nearby essentials'), style: AppText.titleM),
        const SizedBox(height: AppTokens.s12),
        if (!hasLocation)
          Text(
            trKey('ui.nearby_soon', mode, fallback: 'Coming soon for this location.'),
            style: AppText.caption.copyWith(color: AppThemeColors.textMuted),
          ),
        const SizedBox(height: AppTokens.s8),
        Wrap(
          spacing: AppTokens.s12,
          runSpacing: AppTokens.s12,
          children: items
              .map((item) => _NearbyCard(
                    label: item.label,
                    icon: item.icon,
                    subtitle: hasLocation
                        ? trKey('ui.tap_details', mode, fallback: 'Tap for details')
                        : trKey('ui.coming_soon', mode, fallback: 'Coming soon'),
                  ))
              .toList(),
        ),
      ],
    );
  }
}

class _NearbyItem {
  _NearbyItem({required this.label, required this.icon});

  final String label;
  final IconData icon;
}

class _NearbyCard extends StatelessWidget {
  const _NearbyCard({required this.label, required this.icon, required this.subtitle});

  final String label;
  final IconData icon;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 140,
      child: AppCard(
        padding: const EdgeInsets.all(AppTokens.s12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: AppThemeColors.primary),
            const SizedBox(height: AppTokens.s8),
            Text(label, style: AppText.body),
            const SizedBox(height: AppTokens.s8),
            Text(subtitle, style: AppText.caption.copyWith(color: AppThemeColors.textMuted)),
          ],
        ),
      ),
    );
  }
}
