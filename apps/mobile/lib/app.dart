import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/routing/router.dart';
import 'core/theme/theme.dart';
import 'core/config/env.dart';
import 'features/owner_auth/state/auth_session_provider.dart';
import 'core/auth/tenant_resolver.dart';
import 'core/network/api_log.dart';

class App extends ConsumerWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      builder: (context, child) {
        if (!kDebugMode || child == null) return child ?? const SizedBox.shrink();
        final auth = ref.watch(authSessionProvider).valueOrNull;
        final signedIn = auth?.isLoggedIn ?? false;
        final tenantId = ref.watch(tenantResolverProvider).resolveTenantId();
        return Stack(
          children: [
            child,
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              child: Material(
                color: Colors.transparent,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  color: Colors.black.withAlpha(180),
                  child: Text(
                    'Mode: ${Env.useMockData ? 'MOCK' : 'REAL'} | API: ${Env.apiBaseUrl} | User: ${signedIn ? 'signed-in' : 'signed-out'}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white),
                  ),
                ),
              ),
            ),
            Positioned(
              right: 12,
              top: 36,
              child: IconButton(
                onPressed: () => _showReportIssue(context, signedIn, tenantId),
                icon: const Icon(Icons.bug_report, color: Colors.white, size: 18),
              ),
            ),
          ],
        );
      },
      routerConfig: router,
    );
  }
}

Future<void> _showReportIssue(BuildContext context, bool signedIn, Future<String?> tenantIdFuture) async {
  final tenantId = await tenantIdFuture;
  final lastError = ApiLog.lastError.value;
  final buffer = StringBuffer()
    ..writeln('Mode: ${Env.useMockData ? 'MOCK' : 'REAL'}')
    ..writeln('API: ${Env.apiBaseUrl}')
    ..writeln('Version: ${Env.appVersion} (${Env.buildNumber})')
    ..writeln('User: ${signedIn ? 'signed-in' : 'signed-out'}')
    ..writeln('TenantId: ${tenantId ?? 'unknown'}');
  if (lastError != null) {
    buffer
      ..writeln('LastError: ${lastError.method} ${lastError.path}')
      ..writeln('Status: ${lastError.statusCode ?? 'unknown'}')
      ..writeln('RequestId: ${lastError.requestId ?? 'none'}')
      ..writeln('Message: ${lastError.message}');
  } else {
    buffer.writeln('LastError: none');
  }
  if (!context.mounted) return;
  await showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Report issue'),
      content: SingleChildScrollView(
        child: Text(buffer.toString(), style: Theme.of(context).textTheme.bodySmall),
      ),
      actions: [
        TextButton(
          onPressed: () {
            debugPrint(buffer.toString());
            Navigator.of(context).pop();
          },
          child: const Text('Print to console'),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Close'),
        ),
      ],
    ),
  );
}
