import 'package:flutter/material.dart';
import 'app_chip.dart';

class FilterChipWidget extends StatelessWidget {
  const FilterChipWidget({super.key, required this.label, this.isSelected = false, this.onTap});

  final String label;
  final bool isSelected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return AppChip(label: label, isActive: isSelected, onTap: onTap);
  }
}
