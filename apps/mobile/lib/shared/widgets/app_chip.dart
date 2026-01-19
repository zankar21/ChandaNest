import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';

class AppChip extends StatelessWidget {
  const AppChip({super.key, required this.label, this.isActive = false, this.onTap});

  final String label;
  final bool isActive;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? AppThemeColors.primary.withAlpha(50) : AppThemeColors.bg1.withAlpha(210),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: isActive ? AppThemeColors.primary : AppThemeColors.textMuted.withAlpha(80)),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: AppThemeColors.primary.withAlpha(160),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ]
              : [],
        ),
        child: Text(label, style: AppText.caption.copyWith(color: AppThemeColors.textPrimary)),
      ),
    );
  }
}
