import 'package:flutter/material.dart';
import '../config/constants.dart';
import 'colors.dart';
import 'typography.dart';

class AppTheme {
  static final dark = ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.bg0,
    primaryColor: AppColors.accent,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.bg0,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: AppColors.card,
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppConstants.radius20)),
    ),
    textTheme: const TextTheme(
      headlineSmall: AppTypography.headline,
      titleMedium: AppTypography.title,
      bodyMedium: AppTypography.body,
      bodySmall: AppTypography.caption,
    ).apply(
      bodyColor: AppColors.textPrimary,
      displayColor: AppColors.textPrimary,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.bg1,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppConstants.radius16),
        borderSide: const BorderSide(color: AppColors.stroke),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppConstants.radius16),
        borderSide: const BorderSide(color: AppColors.stroke),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppConstants.radius16),
        borderSide: const BorderSide(color: AppColors.accent),
      ),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: AppColors.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppConstants.radius24)),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.bg1,
      selectedColor: AppColors.accent.withAlpha(51),
      labelStyle: const TextStyle(color: AppColors.textPrimary),
      secondaryLabelStyle: const TextStyle(color: AppColors.textPrimary),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppConstants.radius20)),
    ),
    dividerColor: AppColors.stroke,
  );
}
