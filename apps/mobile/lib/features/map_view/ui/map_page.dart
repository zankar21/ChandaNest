import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_bottom_nav.dart';
import '../../../shared/widgets/property_card.dart';
import '../../../shared/widgets/skeletons.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_text.dart';
import '../../../shared/models/property.dart';
import '../../owner_auth/state/owner_auth_provider.dart';
import '../state/map_provider.dart';
import '../../../shared/models/property_pin.dart';
import '../../../core/i18n/language_mode.dart';
import '../../../core/i18n/translate.dart';
import 'package:go_router/go_router.dart';

class MapPage extends ConsumerWidget {
  const MapPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final map = ref.watch(mapProvider);
    final auth = ref.watch(ownerAuthProvider);
    final loggedIn = auth.value?.isLoggedIn ?? false;
    final mode = ref.watch(languageModeProvider);

    return AppScaffold(
      title: trKey('ui.map', mode, fallback: 'Map'),
      bottomNav: AppBottomNav(currentIndex: 2, isLoggedIn: loggedIn),
      body: map.when(
        data: (state) => Stack(
          children: [
            _MapCanvas(
              pins: state.pins,
              selectedId: state.selectedId,
              onSelect: (id) => ref.read(mapProvider.notifier).selectPin(id),
            ),
            Align(
              alignment: Alignment.bottomCenter,
              child: _MapBottomSheet(
                properties: state.properties,
                selectedId: state.selectedId,
                onSelect: (id) => ref.read(mapProvider.notifier).selectPin(id),
                mode: mode,
              ),
            ),
          ],
        ),
        loading: () => Column(
          children: [
            Expanded(
              child: AppCard(
                padding: EdgeInsets.zero,
                child: Container(color: AppThemeColors.bg1),
              ),
            ),
            const SizedBox(height: AppTokens.s16),
            SizedBox(
              height: 220,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemBuilder: (_, _) => const ProjectCardSkeleton(width: 240),
                separatorBuilder: (_, _) => const SizedBox(width: AppTokens.s12),
                itemCount: 2,
              ),
            ),
          ],
        ),
        error: (error, stack) => Center(child: Text(trKey('ui.map_failed', mode, fallback: 'Failed to load map'))),
      ),
    );
  }
}

class _MapCanvas extends StatelessWidget {
  const _MapCanvas({required this.pins, required this.selectedId, required this.onSelect});

  final List<PropertyPin> pins;
  final String? selectedId;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final bounds = _Bounds.fromPins(pins);
        return Container(
          width: double.infinity,
          height: double.infinity,
          decoration: BoxDecoration(
            color: AppThemeColors.bg1,
            borderRadius: BorderRadius.circular(AppTokens.r20),
            border: Border.all(color: AppTokens.stroke),
          ),
          child: Stack(
            children: [
              CustomPaint(
                size: Size(constraints.maxWidth, constraints.maxHeight),
                painter: _GridPainter(),
              ),
              for (final pin in pins)
                _MapPin(
                  pin: pin,
                  bounds: bounds,
                  canvasSize: Size(constraints.maxWidth, constraints.maxHeight),
                  isSelected: pin.id == selectedId,
                  onTap: () => onSelect(pin.id),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _MapPin extends StatelessWidget {
  const _MapPin({
    required this.pin,
    required this.bounds,
    required this.canvasSize,
    required this.isSelected,
    required this.onTap,
  });

  final PropertyPin pin;
  final _Bounds bounds;
  final Size canvasSize;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final padding = 24.0;
    final x = bounds.normalizeLng(pin.lng);
    final y = 1 - bounds.normalizeLat(pin.lat);
    final left = padding + (canvasSize.width - padding * 2) * x;
    final top = padding + (canvasSize.height - padding * 2) * y;
    return Positioned(
      left: left,
      top: top,
      child: GestureDetector(
        onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: isSelected ? AppThemeColors.primary : Colors.black.withAlpha(204),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white.withAlpha(isSelected ? 153 : 51)),
              boxShadow: [
                BoxShadow(
                  color: AppThemeColors.primary.withAlpha(isSelected ? 102 : 51),
                  blurRadius: isSelected ? 12 : 6,
                ),
              ],
            ),
          child: const Icon(Icons.place, size: 16, color: Colors.white),
        ),
      ),
    );
  }
}

class _MapBottomSheet extends StatelessWidget {
  const _MapBottomSheet({
    required this.properties,
    required this.selectedId,
    required this.onSelect,
    required this.mode,
  });

  final List<Property> properties;
  final String? selectedId;
  final ValueChanged<String> onSelect;
  final LanguageMode mode;

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      minChildSize: 0.2,
      initialChildSize: 0.25,
      maxChildSize: 0.6,
      builder: (context, controller) {
        return Container(
          margin: const EdgeInsets.only(top: AppTokens.s12),
          decoration: BoxDecoration(
            color: AppThemeColors.bg2,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(AppTokens.r24)),
          ),
          child: ListView(
            controller: controller,
            padding: const EdgeInsets.all(AppTokens.s16),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(51),
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: AppTokens.s12),
              AppButton(
                label: trKey('ui.use_my_location', mode, fallback: 'Use my location'),
                style: AppButtonStyle.secondary,
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        trKey('ui.location_prompt', mode, fallback: 'Location permission will be requested here.'),
                      ),
                    ),
                  );
                },
                fullWidth: true,
              ),
              const SizedBox(height: AppTokens.s12),
              Text(trKey('ui.nearby_listings', mode, fallback: 'Nearby listings'), style: AppText.titleM),
              const SizedBox(height: AppTokens.s12),
              SizedBox(
                height: 230,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemBuilder: (context, index) {
                    final property = properties[index];
                    final isActive = property.id == selectedId;
                    return SizedBox(
                      width: 240,
                      child: AppCard(
                        padding: EdgeInsets.zero,
                        borderColor: isActive ? AppThemeColors.primary : AppTokens.stroke,
                        child: PropertyCard(
                          property: property,
                          onTap: () {
                            onSelect(property.id);
                            context.go('/p/${property.id}');
                          },
                        ),
                      ),
                    );
                  },
                  separatorBuilder: (_, index) => const SizedBox(width: AppTokens.s12),
                  itemCount: math.min(properties.length, 6),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Bounds {
  _Bounds({required this.minLat, required this.maxLat, required this.minLng, required this.maxLng});

  final double minLat;
  final double maxLat;
  final double minLng;
  final double maxLng;

  factory _Bounds.fromPins(List<PropertyPin> pins) {
    if (pins.isEmpty) {
      return _Bounds(minLat: 0, maxLat: 1, minLng: 0, maxLng: 1);
    }
    var minLat = pins.first.lat;
    var maxLat = pins.first.lat;
    var minLng = pins.first.lng;
    var maxLng = pins.first.lng;
    for (final pin in pins) {
      minLat = math.min(minLat, pin.lat);
      maxLat = math.max(maxLat, pin.lat);
      minLng = math.min(minLng, pin.lng);
      maxLng = math.max(maxLng, pin.lng);
    }
    final padding = 0.001;
    return _Bounds(
      minLat: minLat - padding,
      maxLat: maxLat + padding,
      minLng: minLng - padding,
      maxLng: maxLng + padding,
    );
  }

  double normalizeLat(double lat) {
    if (maxLat - minLat == 0) return 0.5;
    return ((lat - minLat) / (maxLat - minLat)).clamp(0, 1);
  }

  double normalizeLng(double lng) {
    if (maxLng - minLng == 0) return 0.5;
    return ((lng - minLng) / (maxLng - minLng)).clamp(0, 1);
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withAlpha(13)
      ..strokeWidth = 1;
    const step = 40.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
