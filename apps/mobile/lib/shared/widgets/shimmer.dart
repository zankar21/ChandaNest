import 'package:flutter/material.dart';

class ShimmerBox extends StatefulWidget {
  const ShimmerBox({super.key, required this.width, required this.height, this.radius = 12});

  final double width;
  final double height;
  final double radius;

  @override
  State<ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<ShimmerBox> {
  bool _toggle = false;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 400), _flip);
  }

  void _flip() {
    if (!mounted) return;
    setState(() => _toggle = !_toggle);
    Future.delayed(const Duration(milliseconds: 400), _flip);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 400),
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: _toggle ? Colors.white12 : Colors.white24,
        borderRadius: BorderRadius.circular(widget.radius),
      ),
    );
  }
}
