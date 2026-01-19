import 'package:flutter/material.dart';
import '../theme/tokens.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';

enum AppButtonStyle { primary, secondary, ghost }

class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.style = AppButtonStyle.primary,
    this.fullWidth = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final AppButtonStyle style;
  final bool fullWidth;

  @override
  Widget build(BuildContext context) {
    final button = ElevatedButton(
      onPressed: onPressed,
      style: _buttonStyle(),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 18),
            const SizedBox(width: AppTokens.s8),
          ],
          Text(label, style: AppText.body),
        ],
      ),
    );
    if (!fullWidth) return button;
    return SizedBox(width: double.infinity, child: button);
  }

  ButtonStyle _buttonStyle() {
    final base = ElevatedButton.styleFrom(
      minimumSize: const Size.fromHeight(54),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTokens.r16)),
      elevation: 0,
      textStyle: AppText.body,
    );
    switch (style) {
      case AppButtonStyle.secondary:
        return base.copyWith(
          backgroundColor: WidgetStateProperty.all(AppThemeColors.bg1),
          foregroundColor: WidgetStateProperty.all(AppThemeColors.textPrimary),
          side: WidgetStateProperty.all(BorderSide(color: AppTokens.stroke)),
        );
      case AppButtonStyle.ghost:
        return base.copyWith(
          backgroundColor: WidgetStateProperty.all(Colors.transparent),
          foregroundColor: WidgetStateProperty.all(AppThemeColors.textPrimary),
          side: WidgetStateProperty.all(BorderSide(color: Colors.transparent)),
          overlayColor: WidgetStateProperty.all(AppThemeColors.bg1.withAlpha(80)),
        );
      case AppButtonStyle.primary:
        return base.copyWith(
          backgroundColor: WidgetStateProperty.all(AppThemeColors.primary),
          foregroundColor: WidgetStateProperty.all(Colors.white),
        );
    }
  }
}
