import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/colors.dart';
import '../../core/i18n/language_mode.dart';
import '../../core/i18n/translate.dart';

class StickyCtaBar extends ConsumerWidget {
  const StickyCtaBar({super.key, required this.onCall, required this.onWhatsapp, required this.onEnquire});

  final VoidCallback onCall;
  final VoidCallback onWhatsapp;
  final VoidCallback onEnquire;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(languageModeProvider);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: const BoxDecoration(
        color: AppColors.bg1,
        border: Border(top: BorderSide(color: AppColors.stroke)),
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(onPressed: onCall, child: Text(trKey('ui.call', mode, fallback: 'Call'))),
          ),
          const SizedBox(width: 8),
          Expanded(
            child:
                OutlinedButton(onPressed: onWhatsapp, child: Text(trKey('ui.whatsapp', mode, fallback: 'WhatsApp'))),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: ElevatedButton(onPressed: onEnquire, child: Text(trKey('ui.enquiry', mode, fallback: 'Enquiry'))),
          ),
        ],
      ),
    );
  }
}
