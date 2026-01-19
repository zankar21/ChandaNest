import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/tokens.dart';
import 'app_chip.dart';

class RoleNavItem {
  RoleNavItem({required this.label, required this.route});

  final String label;
  final String route;
}

class RoleNav extends StatelessWidget {
  const RoleNav({super.key, required this.items, required this.activeRoute});

  final List<RoleNavItem> items;
  final String activeRoute;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppTokens.s8,
      runSpacing: AppTokens.s8,
      children: items.map((item) {
        final isActive = activeRoute == item.route;
        return AppChip(
          label: item.label,
          isActive: isActive,
          onTap: () => context.go(item.route),
        );
      }).toList(),
    );
  }
}
