import 'package:flutter/material.dart';
import '../theme/tokens.dart';
import '../theme/app_colors.dart';
import 'app_card.dart';

class SectionHeaderSkeleton extends StatelessWidget {
  const SectionHeaderSkeleton({super.key, this.width = 140});

  final double width;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 22,
      width: width,
      decoration: BoxDecoration(
        color: AppThemeColors.bg1,
        borderRadius: BorderRadius.circular(8),
      ),
    );
  }
}

class PropertyCardSkeleton extends StatelessWidget {
  const PropertyCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(AppTokens.r20)),
            child: AspectRatio(
              aspectRatio: 16 / 9,
              child: Container(
                color: AppThemeColors.bg1,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppTokens.s16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 16,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppThemeColors.bg1,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                const SizedBox(height: AppTokens.s8),
                Container(
                  height: 12,
                  width: 180,
                  decoration: BoxDecoration(
                    color: AppThemeColors.bg1,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ProjectCardSkeleton extends StatelessWidget {
  const ProjectCardSkeleton({super.key, this.width = 240});

  final double width;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: AppCard(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(AppTokens.r20)),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Container(color: AppThemeColors.bg1),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppTokens.s16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 14,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: AppThemeColors.bg1,
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                  const SizedBox(height: AppTokens.s8),
                  Container(
                    height: 12,
                    width: 120,
                    decoration: BoxDecoration(
                      color: AppThemeColors.bg1,
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
