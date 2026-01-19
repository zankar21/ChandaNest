class Lead {
  Lead({
    required this.id,
    required this.propertyId,
    required this.propertyTitle,
    required this.name,
    required this.phone,
    required this.message,
    required this.createdAt,
  });

  final String id;
  final String propertyId;
  final String propertyTitle;
  final String name;
  final String phone;
  final String message;
  final DateTime createdAt;
}
