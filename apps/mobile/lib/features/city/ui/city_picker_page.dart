import 'package:flutter/material.dart';
import '../../../shared/widgets/app_scaffold.dart';

class CityPickerPage extends StatelessWidget {
  const CityPickerPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const AppScaffold(
      title: 'City Picker',
      body: Center(child: Text('City picker placeholder')),
    );
  }
}
