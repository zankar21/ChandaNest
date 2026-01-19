String formatINR(int value) {
  final digits = value.toString();
  if (digits.length <= 3) return 'INR $digits';
  final last3 = digits.substring(digits.length - 3);
  final rest = digits.substring(0, digits.length - 3);
  final buffer = StringBuffer();
  for (var i = 0; i < rest.length; i++) {
    final idx = rest.length - i;
    buffer.write(rest[i]);
    if (idx > 1 && idx % 2 == 1) {
      buffer.write(',');
    }
  }
  return 'INR ${buffer.toString()},$last3';
}

String shortTypeLabel(String type) {
  switch (type) {
    case 'land':
      return 'Land';
    case 'flat':
      return 'Flat';
    case 'rent':
      return 'Rent';
    case 'project':
      return 'Project';
    default:
      return type.isEmpty ? '-' : type[0].toUpperCase() + type.substring(1);
  }
}
