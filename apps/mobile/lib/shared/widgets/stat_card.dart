import 'package:flutter/material.dart';
import '../theme/tokens.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import 'app_card.dart';

class StatCard extends StatelessWidget {
  const StatCard({super.key, required this.label, required this.value, this.subtitle});

  final String label;
  final String value;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppTokens.s16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppText.caption.copyWith(color: AppThemeColors.textMuted)),
          const SizedBox(height: AppTokens.s8),
          Text(value, style: AppText.titleL),
          if (subtitle != null) ...[
            const SizedBox(height: AppTokens.s8),
            Text(subtitle!, style: AppText.caption.copyWith(color: AppThemeColors.textMuted)),
          ],
        ],
      ),
    );
  }
}
