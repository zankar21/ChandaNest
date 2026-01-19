import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../../core/config/env.dart';
import '../../../core/routing/routes.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_input.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_text.dart';
import '../../../shared/theme/app_colors.dart';
import '../state/owner_auth_provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/auth/claims_parser.dart';

class OwnerLoginPage extends ConsumerStatefulWidget {
  const OwnerLoginPage({super.key, this.returnTo});

  final String? returnTo;

  @override
  ConsumerState<OwnerLoginPage> createState() => _OwnerLoginPageState();
}

class _OwnerLoginPageState extends ConsumerState<OwnerLoginPage> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool otpSent = false;
  String? _verificationId;
  bool _localLoading = false;
  String? _localError;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(ownerAuthProvider);
    final isMock = Env.useMockData;
    final isLoading = isMock ? auth.isLoading : _localLoading;
    final error = isMock ? auth.value?.error : _localError;

    return AppScaffold(
      title: 'Owner Login',
      body: ListView(
        children: [
          Text('Login with OTP', style: AppText.titleM),
          if (kDebugMode)
            Padding(
              padding: const EdgeInsets.only(top: AppTokens.s8),
              child: Text(
                'Mode: ${Env.useMockData ? 'MOCK' : 'REAL'}',
                style: AppText.caption.copyWith(color: AppThemeColors.textMuted),
              ),
            ),
          const SizedBox(height: AppTokens.s16),
          Text('Phone number', style: AppText.caption),
          const SizedBox(height: AppTokens.s8),
          AppInput(
            controller: _phoneController,
            hintText: 'Phone number',
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: AppTokens.s12),
          if (otpSent)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('OTP', style: AppText.caption),
                const SizedBox(height: AppTokens.s8),
                AppInput(
                  controller: _otpController,
                  hintText: 'OTP',
                  keyboardType: TextInputType.number,
                ),
              ],
            ),
          const SizedBox(height: AppTokens.s16),
          AppButton(
            label: otpSent ? 'Verify OTP' : 'Send OTP',
            onPressed: isLoading ? null : _handlePrimary,
            fullWidth: true,
          ),
          if (error != null) ...[
            const SizedBox(height: AppTokens.s12),
            Text(error, style: AppText.caption.copyWith(color: AppThemeColors.danger)),
          ],
          const SizedBox(height: AppTokens.s12),
          AppButton(
            label: 'Back to home',
            style: AppButtonStyle.ghost,
            onPressed: () => context.go(AppRoutes.home),
            fullWidth: true,
          ),
        ],
      ),
    );
  }

  Future<void> _handlePrimary() async {
    final router = GoRouter.of(context);
    final returnTo = widget.returnTo;
    if (Env.useMockData) {
      if (!otpSent) {
        await ref.read(ownerAuthProvider.notifier).sendOtp(_phoneController.text);
        if (mounted) {
          setState(() => otpSent = true);
        }
        return;
      }
      await ref.read(ownerAuthProvider.notifier).verifyOtp(_phoneController.text, _otpController.text);
      if (!mounted) return;
      final isLoggedIn = ref.read(ownerAuthProvider).value?.isLoggedIn ?? false;
      if (isLoggedIn) {
        final destination = await resolveRoleHome(ref, returnTo: returnTo);
        if (!mounted) return;
        router.go(destination);
      }
      return;
    }
    if (!otpSent) {
      await _startFirebaseOtp();
      return;
    }
    await _verifyFirebaseOtp();
    if (!mounted) return;
    final destination = await resolveRoleHome(ref, returnTo: returnTo);
    if (!mounted) return;
    router.go(destination);
  }

  Future<void> _startFirebaseOtp() async {
    setState(() {
      _localLoading = true;
      _localError = null;
    });
    await FirebaseAuth.instance.verifyPhoneNumber(
      phoneNumber: _phoneController.text,
      verificationCompleted: (credential) async {
        await FirebaseAuth.instance.signInWithCredential(credential);
        if (!mounted) return;
        setState(() {
          _localLoading = false;
        });
      },
      verificationFailed: (e) {
        if (!mounted) return;
        setState(() {
          _localError = e.message ?? 'Verification failed';
          _localLoading = false;
        });
      },
      codeSent: (verificationId, resendToken) {
        if (!mounted) return;
        setState(() {
          _verificationId = verificationId;
          otpSent = true;
          _localLoading = false;
        });
      },
      codeAutoRetrievalTimeout: (verificationId) {
        _verificationId = verificationId;
      },
    );
  }

  Future<void> _verifyFirebaseOtp() async {
    if (_verificationId == null || _verificationId!.isEmpty) {
      setState(() => _localError = 'OTP not requested');
      return;
    }
    setState(() {
      _localLoading = true;
      _localError = null;
    });
    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: _verificationId!,
        smsCode: _otpController.text,
      );
      await FirebaseAuth.instance.signInWithCredential(credential);
      if (!mounted) return;
      setState(() {
        _localLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _localError = 'Invalid code';
        _localLoading = false;
      });
    }
  }
}
