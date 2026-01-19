import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/tokens.dart';

class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    required this.title,
    required this.body,
    this.bottomNav,
    this.floatingActionButton,
    this.appBarActions,
    this.titleWidget,
  });

  final String title;
  final Widget body;
  final Widget? bottomNav;
  final Widget? floatingActionButton;
  final List<Widget>? appBarActions;
  final Widget? titleWidget;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppThemeColors.bg0,
      appBar: AppBar(
        title: titleWidget ?? Text(title),
        actions: appBarActions,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppTokens.s16),
          child: body,
        ),
      ),
      bottomNavigationBar: bottomNav,
      floatingActionButton: floatingActionButton,
    );
  }
}
