import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_input.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_text.dart';
import '../../../shared/theme/app_colors.dart';
import '../state/enquiry_provider.dart';
import '../../../core/i18n/language_mode.dart';
import '../../../core/i18n/translate.dart';
import '../../property_details/state/property_details_provider.dart';
import '../../../shared/models/property.dart';
import '../../../core/config/constants.dart';

class EnquiryPage extends ConsumerStatefulWidget {
  const EnquiryPage({super.key, required this.propertyId});

  final String propertyId;

  @override
  ConsumerState<EnquiryPage> createState() => _EnquiryPageState();
}

class _EnquiryPageState extends ConsumerState<EnquiryPage> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _messageController = TextEditingController();
  String? _formError;
  bool _submitted = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final enquiry = ref.watch(enquiryProvider);
    final mode = ref.watch(languageModeProvider);
    final property = ref.watch(propertyDetailsProvider(widget.propertyId)).valueOrNull;

    return AppScaffold(
      title: trKey('ui.enquiry', mode, fallback: 'Enquiry'),
      body: ListView(
        children: [
          Text(trKey('ui.send_enquiry', mode, fallback: 'Send your enquiry'), style: AppText.titleM),
          const SizedBox(height: AppTokens.s12),
          Text(trKey('ui.name', mode, fallback: 'Name'), style: AppText.caption),
          const SizedBox(height: AppTokens.s8),
          AppInput(controller: _nameController, hintText: trKey('ui.name', mode, fallback: 'Name')),
          const SizedBox(height: AppTokens.s12),
          Text(trKey('ui.phone', mode, fallback: 'Phone'), style: AppText.caption),
          const SizedBox(height: AppTokens.s8),
          AppInput(
            controller: _phoneController,
            hintText: trKey('ui.phone', mode, fallback: 'Phone'),
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: AppTokens.s12),
          Text(trKey('ui.email', mode, fallback: 'Email (optional)'), style: AppText.caption),
          const SizedBox(height: AppTokens.s8),
          AppInput(
            controller: _emailController,
            hintText: trKey('ui.email', mode, fallback: 'Email (optional)'),
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: AppTokens.s12),
          Text(trKey('ui.message', mode, fallback: 'Message'), style: AppText.caption),
          const SizedBox(height: AppTokens.s8),
          AppInput(
            controller: _messageController,
            hintText: trKey('ui.message', mode, fallback: 'Message'),
            maxLines: 4,
          ),
          const SizedBox(height: AppTokens.s16),
          if (_formError != null) ...[
            Text(_formError!, style: AppText.caption.copyWith(color: AppThemeColors.danger)),
            const SizedBox(height: AppTokens.s12),
          ],
          AppButton(
            label: trKey('ui.submit_enquiry', mode, fallback: 'Submit enquiry'),
            onPressed: enquiry.isLoading ? null : () => _submit(context, property),
            fullWidth: true,
          ),
          const SizedBox(height: AppTokens.s12),
          enquiry.whenOrNull(
            error: (err, _) =>
                Text(trKey('ui.enquiry_failed', mode, fallback: 'Failed to send enquiry'),
                    style: AppText.caption.copyWith(color: AppThemeColors.textMuted)),
            data: (id) => !_submitted
                ? const SizedBox.shrink()
                : (id == null ? const SizedBox.shrink() : Text(trKey('ui.enquiry_sent', mode, fallback: 'Enquiry sent'))),
          ) ?? const SizedBox.shrink(),
        ],
      ),
    );
  }

  Future<void> _submit(BuildContext context, Property? property) async {
    final mode = ref.read(languageModeProvider);
    setState(() {
      _formError = null;
      _submitted = false;
    });
    if (_nameController.text.trim().isEmpty || _phoneController.text.trim().isEmpty) {
      setState(() => _formError = trKey('ui.error_required', mode, fallback: 'Name and phone are required.'));
      return;
    }
    if (_phoneController.text.trim().length < 10) {
      setState(() => _formError = trKey('ui.error_phone', mode, fallback: 'Enter a valid phone number.'));
      return;
    }
    if (_emailController.text.trim().isNotEmpty && !_emailController.text.contains('@')) {
      setState(() => _formError = trKey('ui.error_email', mode, fallback: 'Enter a valid email address.'));
      return;
    }
    await ref.read(enquiryProvider.notifier).submit(
      propertyId: widget.propertyId,
      name: _nameController.text,
      phone: _phoneController.text,
      email: _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
      message: _messageController.text,
      subjectTitle: property?.title,
      subjectCity: property?.citySlug != null && property!.citySlug.isNotEmpty
          ? AppConstants.cityNameForSlug(property.citySlug)
          : null,
      subjectArea: property?.area,
      subjectHref: '/p/${widget.propertyId}',
    );
    final state = ref.read(enquiryProvider);
    state.whenOrNull(
      data: (id) {
        if (id != null && mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(trKey('ui.enquiry_sent', mode, fallback: 'Enquiry sent'))));
          setState(() => _submitted = true);
        }
      },
      error: (err, _) {
        if (!mounted) return;
        setState(() => _formError = trKey('ui.error_generic', mode, fallback: 'Something went wrong. Please try again.'));
      },
    );
  }
}
