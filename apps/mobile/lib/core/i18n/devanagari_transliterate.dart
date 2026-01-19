String devToLatin(String input) {
  final buffer = StringBuffer();
  final chars = input.runes.toList();
  for (int i = 0; i < chars.length; i++) {
    final code = chars[i];
    final next = i + 1 < chars.length ? chars[i + 1] : null;
    final mapped = _mapChar(code, next);
    if (mapped.skipNext && next != null) {
      i++;
    }
    buffer.write(mapped.value);
  }
  return buffer.toString();
}

class _Mapped {
  _Mapped(this.value, {this.skipNext = false});
  final String value;
  final bool skipNext;
}

_Mapped _mapChar(int code, int? next) {
  switch (code) {
    case 0x0905:
      return _Mapped('a');
    case 0x0906:
      return _Mapped('aa');
    case 0x0907:
      return _Mapped('i');
    case 0x0908:
      return _Mapped('ii');
    case 0x0909:
      return _Mapped('u');
    case 0x090A:
      return _Mapped('uu');
    case 0x090F:
      return _Mapped('e');
    case 0x0910:
      return _Mapped('ai');
    case 0x0913:
      return _Mapped('o');
    case 0x0914:
      return _Mapped('au');
    case 0x0915:
      return _withMatra('k', next);
    case 0x0916:
      return _withMatra('kh', next);
    case 0x0917:
      return _withMatra('g', next);
    case 0x0918:
      return _withMatra('gh', next);
    case 0x091A:
      return _withMatra('ch', next);
    case 0x091B:
      return _withMatra('chh', next);
    case 0x091C:
      return _withMatra('j', next);
    case 0x091D:
      return _withMatra('jh', next);
    case 0x091F:
      return _withMatra('t', next);
    case 0x0920:
      return _withMatra('th', next);
    case 0x0921:
      return _withMatra('d', next);
    case 0x0922:
      return _withMatra('dh', next);
    case 0x0923:
      return _withMatra('n', next);
    case 0x0924:
      return _withMatra('t', next);
    case 0x0925:
      return _withMatra('th', next);
    case 0x0926:
      return _withMatra('d', next);
    case 0x0927:
      return _withMatra('dh', next);
    case 0x0928:
      return _withMatra('n', next);
    case 0x092A:
      return _withMatra('p', next);
    case 0x092B:
      return _withMatra('ph', next);
    case 0x092C:
      return _withMatra('b', next);
    case 0x092D:
      return _withMatra('bh', next);
    case 0x092E:
      return _withMatra('m', next);
    case 0x092F:
      return _withMatra('y', next);
    case 0x0930:
      return _withMatra('r', next);
    case 0x0932:
      return _withMatra('l', next);
    case 0x0935:
      return _withMatra('v', next);
    case 0x0936:
      return _withMatra('sh', next);
    case 0x0937:
      return _withMatra('sh', next);
    case 0x0938:
      return _withMatra('s', next);
    case 0x0939:
      return _withMatra('h', next);
    case 0x0902:
      return _Mapped('n');
    case 0x0901:
      return _Mapped('n');
    case 0x094D:
      return _Mapped('');
    case 0x0940:
      return _Mapped('ii');
    case 0x0941:
      return _Mapped('u');
    case 0x0942:
      return _Mapped('uu');
    case 0x0947:
      return _Mapped('e');
    case 0x0948:
      return _Mapped('ai');
    case 0x094B:
      return _Mapped('o');
    case 0x094C:
      return _Mapped('au');
    default:
      return _Mapped(String.fromCharCode(code));
  }
}

_Mapped _withMatra(String base, int? next) {
  if (next == null) return _Mapped(base);
  final matra = _matra(next);
  if (matra != null) {
    return _Mapped(base + matra, skipNext: true);
  }
  return _Mapped(base);
}

String? _matra(int code) {
  switch (code) {
    case 0x093E:
      return 'aa';
    case 0x093F:
      return 'i';
    case 0x0940:
      return 'ii';
    case 0x0941:
      return 'u';
    case 0x0942:
      return 'uu';
    case 0x0947:
      return 'e';
    case 0x0948:
      return 'ai';
    case 0x094B:
      return 'o';
    case 0x094C:
      return 'au';
    default:
      return null;
  }
}
