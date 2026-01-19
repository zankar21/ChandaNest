import '../../core/utils/formatters.dart';

class Project {
  Project({
    required this.id,
    required this.name,
    required this.area,
    required this.status,
    required this.minPrice,
    this.coverUrl,
  });

  final String id;
  final String name;
  final String area;
  final String status;
  final int minPrice;
  final String? coverUrl;

  String get priceLabel => formatINR(minPrice);

  Project copyWith({
    String? id,
    String? name,
    String? area,
    String? status,
    int? minPrice,
    String? coverUrl,
  }) {
    return Project(
      id: id ?? this.id,
      name: name ?? this.name,
      area: area ?? this.area,
      status: status ?? this.status,
      minPrice: minPrice ?? this.minPrice,
      coverUrl: coverUrl ?? this.coverUrl,
    );
  }
}
