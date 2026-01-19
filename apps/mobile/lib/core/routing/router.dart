import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/city/ui/city_picker_page.dart';
import '../../features/public_home/ui/home_page.dart';
import '../../features/public_home/ui/splash_page.dart';
import '../../features/onboarding/ui/welcome_page.dart';
import '../../features/onboarding/ui/city_select_page.dart';
import '../../features/onboarding/ui/language_select_page.dart';
import '../../features/explore/ui/explore_page.dart';
import '../../features/map_view/ui/map_page.dart';
import '../../features/saved/ui/saved_page.dart';
import '../../features/property_details/ui/property_details_page.dart';
import '../../features/enquiry/ui/enquiry_page.dart';
import '../../features/owner_auth/ui/owner_login_page.dart';
import '../../features/owner_dashboard/ui/owner_dashboard_page.dart';
import '../../features/owner_listings/ui/owner_listings_page.dart';
import '../../features/owner_post/ui/owner_post_page.dart';
import '../../features/owner_leads/ui/owner_leads_page.dart';
import '../../features/owner_auth/state/auth_session_provider.dart';
import '../../features/agent/ui/agent_dashboard_page.dart';
import '../../features/agent/ui/agent_leads_page.dart';
import '../../features/agent/ui/agent_listings_page.dart';
import '../../features/agency/ui/agency_dashboard_page.dart';
import '../../features/enterprise/ui/enterprise_dashboard_page.dart';
import '../../features/authz/ui/access_denied_page.dart';
import '../auth/claims_parser.dart';
import '../storage/local_store.dart';
import 'role_guard.dart';
import 'routes.dart';

final authRouterRefreshProvider = Provider<ChangeNotifier>((ref) {
  final notifier = ValueNotifier<int>(0);
  ref.listen<AsyncValue<AuthSessionState>>(authSessionProvider, (previous, next) {
    notifier.value++;
  });
  ref.onDispose(notifier.dispose);
  return notifier;
});

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authSessionProvider);
  final authValue = auth.valueOrNull;
  final loggedIn = authValue?.isLoggedIn ?? false;

  return GoRouter(
    initialLocation: AppRoutes.splash,
    refreshListenable: ref.watch(authRouterRefreshProvider),
    redirect: (context, state) async {
      final isOwnerRoute = state.matchedLocation.startsWith('/owner');
      final isAgentRoute = state.matchedLocation.startsWith('/agent');
      final isAgencyRoute = state.matchedLocation.startsWith('/agency');
      final isEnterpriseRoute = state.matchedLocation.startsWith('/enterprise');
      final isLogin = state.matchedLocation == AppRoutes.ownerLogin;
      final isAccessDenied = state.matchedLocation == AppRoutes.accessDenied;
      final requiresAuth = isOwnerRoute || isAgentRoute || isAgencyRoute || isEnterpriseRoute;
      if (requiresAuth && !isLogin && !loggedIn) {
        final returnTo = Uri.encodeComponent(state.uri.toString());
        return '${AppRoutes.ownerLogin}?returnTo=$returnTo';
      }
      final isSplash = state.matchedLocation == AppRoutes.splash;
      final isWelcome = state.matchedLocation == AppRoutes.welcome;
      final isOnboardingCity = state.matchedLocation == AppRoutes.onboardingCity;
      final isOnboardingLang = state.matchedLocation == AppRoutes.onboardingLanguage;
      final isOnboarding = isWelcome || isOnboardingCity || isOnboardingLang;
      final store = LocalStore();
      final onboardingDone = await store.getOnboardingDone();
      if (onboardingDone && isOnboarding) {
        return AppRoutes.home;
      }
      if (!onboardingDone) {
        final citySlug = await store.getCitySlug();
        final languageCode = await store.getLanguageCode();
        final returnTo = state.uri.queryParameters['returnTo'] ?? state.uri.toString();
        final encoded = Uri.encodeComponent(returnTo);
        if (!isSplash && !isOnboarding) {
          if (citySlug == null || citySlug.isEmpty) {
            return '${AppRoutes.onboardingCity}?returnTo=$encoded';
          }
          if (languageCode == null || languageCode.isEmpty) {
            return '${AppRoutes.onboardingLanguage}?returnTo=$encoded';
          }
          await store.setOnboardingDone(true);
        }
        if (isOnboardingLang && (citySlug == null || citySlug.isEmpty)) {
          return '${AppRoutes.onboardingCity}?returnTo=$encoded';
        }
      }
      if (loggedIn && !isAccessDenied) {
        final claims = ref.read(claimsProvider).valueOrNull;
        final guard = checkRoleAccess(claims, state.matchedLocation);
        if (!guard.allowed) {
          final required = guard.requiredRole ?? '';
          final from = Uri.encodeComponent(state.uri.toString());
          return '${AppRoutes.accessDenied}?required=$required&from=$from';
        }
      }
      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: AppRoutes.welcome,
        builder: (context, state) => WelcomePage(
          returnTo: state.uri.queryParameters['returnTo'],
        ),
      ),
      GoRoute(
        path: AppRoutes.onboardingCity,
        builder: (context, state) => CitySelectPage(
          returnTo: state.uri.queryParameters['returnTo'],
        ),
      ),
      GoRoute(
        path: AppRoutes.onboardingLanguage,
        builder: (context, state) => LanguageSelectPage(
          returnTo: state.uri.queryParameters['returnTo'],
        ),
      ),
      GoRoute(
        path: AppRoutes.city,
        builder: (context, state) => const CityPickerPage(),
      ),
      GoRoute(
        path: AppRoutes.home,
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        path: AppRoutes.explore,
        builder: (context, state) => const ExplorePage(),
      ),
      GoRoute(
        path: AppRoutes.map,
        builder: (context, state) => const MapPage(),
      ),
      GoRoute(
        path: AppRoutes.saved,
        builder: (context, state) => const SavedPage(),
      ),
      GoRoute(
        path: AppRoutes.propertyDetails,
        builder: (context, state) => PropertyDetailsPage(
          propertyId: state.pathParameters['propertyId'] ?? 'unknown',
        ),
      ),
      GoRoute(
        path: AppRoutes.enquiry,
        builder: (context, state) => EnquiryPage(
          propertyId: state.pathParameters['propertyId'] ?? 'unknown',
        ),
      ),
      GoRoute(
        path: AppRoutes.ownerLogin,
        builder: (context, state) => OwnerLoginPage(
          returnTo: state.uri.queryParameters['returnTo'],
        ),
      ),
      GoRoute(
        path: AppRoutes.ownerDashboard,
        builder: (context, state) => const OwnerDashboardPage(),
      ),
      GoRoute(
        path: AppRoutes.ownerListings,
        builder: (context, state) => const OwnerListingsPage(),
      ),
      GoRoute(
        path: AppRoutes.ownerPost,
        builder: (context, state) => const OwnerPostPage(),
      ),
      GoRoute(
        path: AppRoutes.ownerEdit,
        builder: (context, state) => OwnerPostPage(
          propertyId: state.pathParameters['propertyId'],
        ),
      ),
      GoRoute(
        path: AppRoutes.ownerLeads,
        builder: (context, state) => const OwnerLeadsPage(),
      ),
      GoRoute(
        path: AppRoutes.agentDashboard,
        builder: (context, state) => const AgentDashboardPage(),
      ),
      GoRoute(
        path: AppRoutes.agentLeads,
        builder: (context, state) => const AgentLeadsPage(),
      ),
      GoRoute(
        path: AppRoutes.agentListings,
        builder: (context, state) => const AgentListingsPage(),
      ),
      GoRoute(
        path: AppRoutes.agencyDashboard,
        builder: (context, state) => const AgencyDashboardPage(),
      ),
      GoRoute(
        path: AppRoutes.enterpriseDashboard,
        builder: (context, state) => const EnterpriseDashboardPage(),
      ),
      GoRoute(
        path: AppRoutes.accessDenied,
        builder: (context, state) => AccessDeniedPage(
          requiredRole: state.uri.queryParameters['required'],
          fromPath: state.uri.queryParameters['from'],
        ),
      ),
    ],
  );
});
