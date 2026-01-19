import '../../core/utils/formatters.dart';

class Property {
  Property({
    required this.id,
    required this.title,
    required this.type,
    required this.price,
    required this.area,
    required this.citySlug,
    required this.badges,
    required this.description,
    required this.attrs,
    this.coverUrl,
    this.lat,
    this.lng,
  });

  final String id;
  final String title;
  final String type;
  final int price;
  final String area;
  final String citySlug;
  final String? coverUrl;
  final double? lat;
  final double? lng;
  final List<String> badges;
  final String description;
  final Map<String, dynamic> attrs;

  String get priceLabel => formatINR(price);
  String get typeLabel => shortTypeLabel(type);

  Property copyWith({
    String? id,
    String? title,
    String? type,
    int? price,
    String? area,
    String? citySlug,
    String? coverUrl,
    double? lat,
    double? lng,
    List<String>? badges,
    String? description,
    Map<String, dynamic>? attrs,
  }) {
    return Property(
      id: id ?? this.id,
      title: title ?? this.title,
      type: type ?? this.type,
      price: price ?? this.price,
      area: area ?? this.area,
      citySlug: citySlug ?? this.citySlug,
      coverUrl: coverUrl ?? this.coverUrl,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      badges: badges ?? this.badges,
      description: description ?? this.description,
      attrs: attrs ?? this.attrs,
    );
  }
}
