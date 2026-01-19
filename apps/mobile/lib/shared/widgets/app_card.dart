import 'package:flutter/material.dart';
import '../theme/tokens.dart';
import '../theme/app_colors.dart';

class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding,
    this.radius,
    this.borderColor,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double? radius;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    final cardRadius = radius ?? AppTokens.r20;
    return Container(
      decoration: BoxDecoration(
        color: AppThemeColors.bg2,
        borderRadius: BorderRadius.circular(cardRadius),
        border: Border.all(color: borderColor ?? AppTokens.stroke),
        boxShadow: AppTokens.softShadow(opacity: 0.28),
      ),
      child: Padding(
        padding: padding ?? const EdgeInsets.all(AppTokens.s16),
        child: child,
      ),
    );
  }
}
