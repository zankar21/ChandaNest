String normalize(String input) {
  final lower = input.toLowerCase();
  final buffer = StringBuffer();
  bool lastSpace = false;
  for (int i = 0; i < lower.length; i++) {
    final code = lower.codeUnitAt(i);
    final isAlphaNum = (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
    if (isAlphaNum) {
      buffer.writeCharCode(code);
      lastSpace = false;
    } else {
      if (!lastSpace) {
        buffer.write(' ');
        lastSpace = true;
      }
    }
  }
  return buffer.toString().trim().replaceAll(RegExp(r'\s+'), ' ');
}
