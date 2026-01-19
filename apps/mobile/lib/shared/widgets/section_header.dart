import 'package:flutter/material.dart';
import '../theme/tokens.dart';
import '../theme/app_text.dart';
import '../theme/app_colors.dart';

class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.actionLabel, this.onAction});

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: AppText.titleM,
        ),
        if (actionLabel != null && onAction != null)
          TextButton(
            onPressed: onAction,
            style: TextButton.styleFrom(foregroundColor: AppThemeColors.primary),
            child: Text(actionLabel!),
          ),
        if (actionLabel == null || onAction == null)
          Container(
            width: 32,
            height: 2,
            decoration: BoxDecoration(
              color: AppThemeColors.primary,
              borderRadius: BorderRadius.circular(AppTokens.r20),
            ),
          ),
      ],
    );
  }
}
