import 'package:flutter/material.dart';
import '../models/project.dart';
import 'price_pill.dart';
import '../theme/tokens.dart';
import '../theme/app_colors.dart';
import '../theme/app_text.dart';
import 'app_card.dart';

class ProjectCard extends StatelessWidget {
  const ProjectCard({super.key, required this.project, this.onTap});

  final Project project;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppTokens.r20),
      child: AppCard(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(AppTokens.r20)),
              child: SizedBox(
                height: 110,
                width: double.infinity,
                child: project.coverUrl != null
                    ? Image.network(project.coverUrl!, fit: BoxFit.cover)
                    : Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Color(0xFF1A2233), Color(0xFF0F141E)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Center(
                          child: Text('No image', style: AppText.caption.copyWith(color: AppThemeColors.textMuted)),
                        ),
                      ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppTokens.s12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(project.name, style: AppText.titleM, maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: AppTokens.s8),
                  Text(
                    project.area,
                    style: AppText.caption.copyWith(color: AppThemeColors.textMuted),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: AppTokens.s8),
                  PricePill(label: project.priceLabel),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
