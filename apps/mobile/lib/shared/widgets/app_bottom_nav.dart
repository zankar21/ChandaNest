import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/routing/routes.dart';
import '../../core/i18n/language_mode.dart';
import '../../core/i18n/translate.dart';

class AppBottomNav extends ConsumerWidget {
  const AppBottomNav({super.key, required this.currentIndex, required this.isLoggedIn});

  final int currentIndex;
  final bool isLoggedIn;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(languageModeProvider);
    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: (index) {
        switch (index) {
          case 0:
            context.go(AppRoutes.home);
            break;
          case 1:
            context.go(AppRoutes.explore);
            break;
          case 2:
            context.go(AppRoutes.map);
            break;
          case 3:
            context.go(AppRoutes.saved);
            break;
          case 4:
            context.go(isLoggedIn ? AppRoutes.ownerDashboard : AppRoutes.ownerLogin);
            break;
        }
      },
      items: [
        BottomNavigationBarItem(icon: const Icon(Icons.home), label: trKey('ui.home', mode, fallback: 'Home')),
        BottomNavigationBarItem(icon: const Icon(Icons.search), label: trKey('ui.explore', mode, fallback: 'Explore')),
        BottomNavigationBarItem(icon: const Icon(Icons.map_outlined), label: trKey('ui.map', mode, fallback: 'Map')),
        BottomNavigationBarItem(icon: const Icon(Icons.bookmark_border), label: trKey('ui.saved_tab', mode, fallback: 'Saved')),
        BottomNavigationBarItem(icon: const Icon(Icons.person_outline), label: trKey('ui.profile', mode, fallback: 'Profile')),
      ],
    );
  }
}
