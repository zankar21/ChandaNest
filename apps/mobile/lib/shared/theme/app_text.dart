import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppText {
  static const titleXL = TextStyle(
    fontSize: 26,
    fontWeight: FontWeight.w700,
    color: AppThemeColors.textPrimary,
    letterSpacing: -0.2,
  );

  static const titleL = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w700,
    color: AppThemeColors.textPrimary,
  );

  static const titleM = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: AppThemeColors.textPrimary,
  );

  static const body = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    color: AppThemeColors.textPrimary,
  );

  static const muted = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: AppThemeColors.textMuted,
  );

  static const caption = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    color: AppThemeColors.textMuted,
  );
}
