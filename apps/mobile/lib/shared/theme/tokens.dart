import 'package:flutter/material.dart';
import '../../core/theme/colors.dart';

class AppTokens {
  static const double s8 = 8;
  static const double s12 = 12;
  static const double s16 = 16;
  static const double s20 = 20;
  static const double s24 = 24;
  static const double s32 = 32;

  static const double r12 = 12;
  static const double r16 = 16;
  static const double r20 = 20;
  static const double r24 = 24;

  static const Color stroke = AppColors.stroke;

  static List<BoxShadow> softShadow({double opacity = 0.25}) {
    return [
      BoxShadow(
        color: Colors.black.withAlpha((255 * opacity).round()),
        blurRadius: 24,
        offset: const Offset(0, 12),
      ),
    ];
  }
}
