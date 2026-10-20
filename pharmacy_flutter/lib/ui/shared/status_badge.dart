import 'package:flutter/material.dart';

class StatusBadge extends StatelessWidget {
  final String label;
  final Color backgroundColor;
  final Color textColor;

  const StatusBadge({
    super.key,
    required this.label,
    required this.backgroundColor,
    required this.textColor,
  });

  factory StatusBadge.success(String label) {
    return StatusBadge(
      label: label,
      backgroundColor: const Color(0xFFE8F5E9),
      textColor: const Color(0xFF2E7D32),
    );
  }

  factory StatusBadge.warning(String label) {
    return StatusBadge(
      label: label,
      backgroundColor: const Color(0xFFFFF8E1),
      textColor: const Color(0xFFF57F17),
    );
  }

  factory StatusBadge.error(String label) {
    return StatusBadge(
      label: label,
      backgroundColor: const Color(0xFFFFEBEE),
      textColor: const Color(0xFFC62828),
    );
  }

  factory StatusBadge.info(String label) {
    return StatusBadge(
      label: label,
      backgroundColor: const Color(0xFFE3F2FD),
      textColor: const Color(0xFF1565C0),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: textColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
