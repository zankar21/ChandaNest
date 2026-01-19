import 'package:flutter/material.dart';
import '../theme/tokens.dart';
import '../theme/app_text.dart';
import '../theme/app_colors.dart';
import 'app_button.dart';

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
    this.icon,
  });

  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon ?? Icons.search_off, size: 40, color: AppThemeColors.textMuted),
          const SizedBox(height: AppTokens.s12),
          Text(title, style: AppText.titleM),
          const SizedBox(height: AppTokens.s8),
          Text(subtitle, textAlign: TextAlign.center, style: AppText.muted),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: AppTokens.s16),
            AppButton(label: actionLabel!, onPressed: onAction, style: AppButtonStyle.secondary),
          ],
        ],
      ),
    );
  }
}
