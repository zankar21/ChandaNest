import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/config/constants.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_input.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_chip.dart';
import '../../../shared/widgets/section_header.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/theme/app_text.dart';
import '../../../shared/theme/app_colors.dart';
import '../state/owner_post_provider.dart';
import '../../owner_listings/state/owner_listings_provider.dart';

class OwnerPostPage extends ConsumerStatefulWidget {
  const OwnerPostPage({super.key, this.propertyId});

  final String? propertyId;

  @override
  ConsumerState<OwnerPostPage> createState() => _OwnerPostPageState();
}

class _OwnerPostPageState extends ConsumerState<OwnerPostPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _priceController = TextEditingController();
  final _localityController = TextEditingController();
  final _addressController = TextEditingController();
  final _latController = TextEditingController();
  final _lngController = TextEditingController();
  final _picker = ImagePicker();
  String _propertyType = 'land';
  String _listingType = 'sale';
  String _citySlug = AppConstants.citySlugToName.keys.first;
  bool _loading = false;
  String? _error;
  final List<_LocalMedia> _media = [];
  final List<String> _existingPaths = [];
  String? _heroPath;

  @override
  void initState() {
    super.initState();
    if (widget.propertyId != null) {
      _loadListing(widget.propertyId!);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _priceController.dispose();
    _localityController.dispose();
    _addressController.dispose();
    _latController.dispose();
    _lngController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.propertyId != null;
    return AppScaffold(
      title: isEdit ? 'Edit Property' : 'Post Property',
      body: Form(
        key: _formKey,
        child: ListView(
          children: [
            const SectionHeader(title: 'Basics'),
            const SizedBox(height: AppTokens.s12),
            Text('Title', style: AppText.caption),
            const SizedBox(height: AppTokens.s8),
            AppInput(
              controller: _titleController,
              hintText: 'Title',
              validator: (value) => value == null || value.trim().isEmpty ? 'Title is required' : null,
            ),
            const SizedBox(height: AppTokens.s12),
            DropdownButtonFormField<String>(
              key: ValueKey('propertyType_$_propertyType'),
              initialValue: _propertyType,
              decoration: _fieldDecoration('Property type'),
              items: _propertyTypes()
                  .map((type) => DropdownMenuItem(value: type, child: Text(_labelForType(type))))
                  .toList(),
              onChanged: (value) => setState(() => _propertyType = value ?? 'land'),
            ),
            const SizedBox(height: AppTokens.s12),
            Text(_listingType == 'rent' ? 'Rent per month' : 'Total price', style: AppText.caption),
            const SizedBox(height: AppTokens.s8),
            AppInput(
              controller: _priceController,
              hintText: _listingType == 'rent' ? 'Rent per month' : 'Total price',
              keyboardType: TextInputType.number,
              validator: (value) => value == null || value.trim().isEmpty ? 'Price is required' : null,
            ),
            const SizedBox(height: AppTokens.s12),
            DropdownButtonFormField<String>(
              key: ValueKey('listingType_$_listingType'),
              initialValue: _listingType,
              decoration: _fieldDecoration('Listing type'),
              items: const [
                DropdownMenuItem(value: 'sale', child: Text('Sale')),
                DropdownMenuItem(value: 'rent', child: Text('Rent')),
              ],
              onChanged: (value) => setState(() => _listingType = value ?? 'sale'),
            ),
            const SizedBox(height: AppTokens.s24),
            const SectionHeader(title: 'Location'),
            const SizedBox(height: AppTokens.s12),
            DropdownButtonFormField<String>(
              key: ValueKey('citySlug_$_citySlug'),
              initialValue: _citySlug,
              decoration: _fieldDecoration('City'),
              items: AppConstants.citySlugToName.keys
                  .map((slug) => DropdownMenuItem(value: slug, child: Text(AppConstants.cityNameForSlug(slug))))
                  .toList(),
              onChanged: (value) => setState(() => _citySlug = value ?? _citySlug),
            ),
            const SizedBox(height: AppTokens.s12),
            Text('Locality', style: AppText.caption),
            const SizedBox(height: AppTokens.s8),
            AppInput(
              controller: _localityController,
              hintText: 'Locality',
              validator: (value) {
                final locality = value?.trim() ?? '';
                if (locality.isEmpty) return 'Locality is required';
                return null;
              },
            ),
            const SizedBox(height: AppTokens.s12),
            Text('Address', style: AppText.caption),
            const SizedBox(height: AppTokens.s8),
            AppInput(
              controller: _addressController,
              hintText: 'Address',
            ),
            const SizedBox(height: AppTokens.s12),
            Row(
              children: [
                Expanded(
                  child: AppInput(
                    controller: _latController,
                    hintText: 'Latitude (optional)',
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  ),
                ),
                const SizedBox(width: AppTokens.s12),
                Expanded(
                  child: AppInput(
                    controller: _lngController,
                    hintText: 'Longitude (optional)',
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppTokens.s24),
            const SectionHeader(title: 'Media'),
            const SizedBox(height: AppTokens.s12),
            Wrap(
              spacing: AppTokens.s12,
              runSpacing: AppTokens.s12,
              children: [
                AppButton(
                  label: 'Add images',
                  icon: Icons.add_photo_alternate_outlined,
                  onPressed: _loading ? null : _pickImages,
                ),
                if (_media.isEmpty && _existingPaths.isEmpty)
                  Text('No images selected', style: AppText.caption.copyWith(color: AppThemeColors.textMuted)),
              ],
            ),
            const SizedBox(height: AppTokens.s12),
            ..._media.map((item) => _MediaRow(
                  item: item,
                  isHero: false,
                  onDelete: _loading ? null : () => _removeMedia(item),
                )),
            ..._existingPaths.map((path) => _MediaRow(
                  item: _LocalMedia.existing(path),
                  isHero: path == _heroPath,
                  onDelete: _loading ? null : () => _removeExisting(path),
                  onSetHero: _loading ? null : () => _setHero(path),
                )),
            const SizedBox(height: AppTokens.s24),
            if (_error != null) ...[
              Text(_error!, style: AppText.caption.copyWith(color: AppThemeColors.danger)),
              const SizedBox(height: AppTokens.s12),
            ],
            AppButton(
              label: isEdit ? 'Save changes' : 'Create listing',
              onPressed: _loading ? null : _submit,
              fullWidth: true,
            ),
          ],
        ),
      ),
    );
  }

  List<String> _propertyTypes() {
    return ['land', 'plot', 'flat', 'house', 'villa', 'office', 'shop', 'warehouse', 'other'];
  }

  InputDecoration _fieldDecoration(String label) {
    return InputDecoration(
      labelText: label,
      filled: true,
      fillColor: AppThemeColors.bg1.withAlpha(220),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTokens.r16),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTokens.r16),
        borderSide: BorderSide(color: AppThemeColors.primary),
      ),
    );
  }

  String _labelForType(String type) {
    switch (type) {
      case 'land':
        return 'Land';
      case 'plot':
        return 'Plot';
      case 'flat':
        return 'Flat';
      case 'house':
        return 'House';
      case 'villa':
        return 'Villa';
      case 'office':
        return 'Office';
      case 'shop':
        return 'Shop';
      case 'warehouse':
        return 'Warehouse';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  }

  Future<void> _pickImages() async {
    final files = await _picker.pickMultiImage();
    if (files.isEmpty) return;
    setState(() {
      _media.addAll(files.map((file) => _LocalMedia(file: file)));
    });
  }

  Future<void> _loadListing(String listingId) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = ref.read(ownerPostRepositoryProvider);
      final listing = await repo.getListing(listingId);
      final location = listing['location'] as Map<String, dynamic>? ?? {};
      final geo = location['geo'] as Map<String, dynamic>? ?? {};
      final pricing = listing['pricing'] as Map<String, dynamic>? ?? {};
      final media = listing['media'] as Map<String, dynamic>? ?? {};
      final hero = media['hero'] as Map<String, dynamic>? ?? {};
      final gallery = media['gallery'] as List<dynamic>? ?? [];
      final heroPath = hero['objectPath']?.toString() ?? '';
      final galleryPaths = gallery
          .map((item) => (item as Map<String, dynamic>)['objectPath']?.toString() ?? '')
          .where((path) => path.isNotEmpty)
          .toList();
      setState(() {
        _titleController.text = listing['title']?.toString() ?? '';
        final loadedType = (listing['propertyType'] ?? listing['type'] ?? 'land').toString();
        _propertyType = _propertyTypes().contains(loadedType) ? loadedType : 'land';
        final loadedListingType = (listing['type'] ?? 'sale').toString();
        _listingType = (loadedListingType == 'rent' || loadedListingType == 'sale') ? loadedListingType : 'sale';
        _priceController.text = (pricing['totalPrice'] ?? pricing['rentPerMonth'] ?? pricing['rate'] ?? '').toString();
        _citySlug = (location['citySlug'] ?? _citySlug).toString();
        _localityController.text = location['locality']?.toString() ?? '';
        _addressController.text = location['addressLine']?.toString() ?? '';
        _latController.text = geo['lat']?.toString() ?? '';
        _lngController.text = geo['lng']?.toString() ?? '';
        _existingPaths.clear();
        if (heroPath.isNotEmpty) {
          _existingPaths.add(heroPath);
        }
        _existingPaths.addAll(galleryPaths.where((path) => path != heroPath));
        _heroPath = heroPath.isNotEmpty
            ? heroPath
            : (_existingPaths.isNotEmpty ? _existingPaths.first : null);
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load listing.';
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
    });
    if (!_formKey.currentState!.validate()) {
      return;
    }
    setState(() => _loading = true);
    try {
      final repo = ref.read(ownerPostRepositoryProvider);
      final listingId = widget.propertyId;
      final payload = _buildPayload();
      final id = listingId ?? await repo.createListing(payload);
      if (listingId != null) {
        await repo.updateListing(id, payload);
      }
      final uploadedPaths = <String>[];
      uploadedPaths.addAll(_existingPaths);
      for (final item in _media) {
        final result = await repo.uploadMedia(id, item.file!);
        uploadedPaths.add(result.objectPath);
      }
      if (uploadedPaths.isNotEmpty) {
        await repo.patchListingMedia(id, uploadedPaths, heroPath: _heroPath);
      }
      if (!mounted) return;
      ref.read(ownerListingsProvider.notifier).refresh();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Listing saved')));
      Navigator.of(context).pop();
    } catch (e) {
      setState(() {
        _error = 'Failed to save listing. Check details and try again.';
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Map<String, dynamic> _buildPayload() {
    final price = int.tryParse(_priceController.text.trim()) ?? 0;
    final lat = double.tryParse(_latController.text.trim());
    final lng = double.tryParse(_lngController.text.trim());
    final pricing = _listingType == 'rent' ? {'rentPerMonth': price} : {'totalPrice': price};
    return {
      'mode': 'independent',
      'type': _listingType,
      'title': _titleController.text.trim(),
      'propertyType': _propertyType,
      'pricing': pricing,
      'brokeragePartnerId': AppConstants.brokeragePartnerId,
      'location': {
        'citySlug': _citySlug,
        'locality': _localityController.text.trim(),
        if (_addressController.text.trim().isNotEmpty) 'addressLine': _addressController.text.trim(),
        if (lat != null && lng != null) 'geo': {'lat': lat, 'lng': lng},
      },
    };
  }

  void _removeMedia(_LocalMedia item) {
    setState(() {
      _media.remove(item);
    });
  }

  void _removeExisting(String path) {
    setState(() {
      _existingPaths.remove(path);
      if (_heroPath == path) {
        _heroPath = _existingPaths.isNotEmpty ? _existingPaths.first : null;
      }
    });
  }

  void _setHero(String path) {
    setState(() {
      _heroPath = path;
    });
  }
}

class _LocalMedia {
  _LocalMedia({required this.file}) : objectPath = null;

  _LocalMedia.existing(this.objectPath) : file = null;

  final XFile? file;
  final String? objectPath;
}

class _MediaRow extends StatelessWidget {
  const _MediaRow({required this.item, required this.isHero, this.onDelete, this.onSetHero});

  final _LocalMedia item;
  final bool isHero;
  final VoidCallback? onDelete;
  final VoidCallback? onSetHero;

  @override
  Widget build(BuildContext context) {
    final label = item.file?.name ?? item.objectPath ?? 'Image';
    return Padding(
      padding: const EdgeInsets.only(bottom: AppTokens.s8),
      child: Row(
        children: [
          Icon(Icons.image_outlined, size: 18, color: AppThemeColors.textMuted),
          const SizedBox(width: AppTokens.s8),
          Expanded(child: Text(label, style: AppText.caption)),
          if (item.objectPath != null)
            AppChip(label: isHero ? 'Hero' : 'Set hero', isActive: isHero, onTap: onSetHero),
          IconButton(
            onPressed: onDelete,
            icon: const Icon(Icons.delete_outline, size: 18),
          ),
        ],
      ),
    );
  }
}
