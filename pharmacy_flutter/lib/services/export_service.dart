import 'dart:typed_data';

import 'package:excel/excel.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../core/utils/formatters.dart';
import '../data/daos/report_dao.dart';
import '../data/daos/sale_dao.dart';

abstract class IExportService {
  Future<Uint8List> generateReceiptPdf(
    SaleWithDetails sale,
    String pharmacyName,
  );
  Future<List<int>> generateSalesReportExcel({
    required SalesFinancialSummary summary,
    required List<TopSellingMedicine> topSelling,
    required List<SaleWithDetails> sales,
  });
}

class ExportService implements IExportService {
  const ExportService();

  @override
  Future<Uint8List> generateReceiptPdf(
    SaleWithDetails sale,
    String pharmacyName,
  ) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        margin: const pw.EdgeInsets.all(10),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Center(
                child: pw.Text(
                  pharmacyName,
                  style: pw.TextStyle(
                    fontSize: 14,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
              ),
              pw.SizedBox(height: 4),
              pw.Center(
                child: pw.Text(
                  'No: ${sale.sale.invoiceNumber}',
                  style: const pw.TextStyle(fontSize: 9),
                ),
              ),
              pw.Center(
                child: pw.Text(
                  DateFormat('dd/MM/yyyy HH:mm').format(sale.sale.saleDate),
                  style: const pw.TextStyle(fontSize: 9),
                ),
              ),
              pw.Divider(thickness: 0.5),
              ...sale.items.map((item) {
                return pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(vertical: 2),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        item.medicine.name,
                        style: pw.TextStyle(
                          fontSize: 9,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.Row(
                        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                        children: [
                          pw.Text(
                            '${AppFormatters.quantity(item.item.quantity)} x ${AppFormatters.currency(item.item.unitPrice)}',
                            style: const pw.TextStyle(fontSize: 8),
                          ),
                          pw.Text(
                            AppFormatters.currency(item.item.total),
                            style: const pw.TextStyle(fontSize: 8),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),
              pw.Divider(thickness: 0.5),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Subtotal', style: const pw.TextStyle(fontSize: 9)),
                  pw.Text(
                    AppFormatters.currency(sale.sale.subtotal),
                    style: const pw.TextStyle(fontSize: 9),
                  ),
                ],
              ),
              if (sale.sale.discount > 0)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Diskon', style: const pw.TextStyle(fontSize: 9)),
                    pw.Text(
                      '-${AppFormatters.currency(sale.sale.discount)}',
                      style: const pw.TextStyle(fontSize: 9),
                    ),
                  ],
                ),
              if (sale.sale.tax > 0)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Pajak', style: const pw.TextStyle(fontSize: 9)),
                    pw.Text(
                      AppFormatters.currency(sale.sale.tax),
                      style: const pw.TextStyle(fontSize: 9),
                    ),
                  ],
                ),
              pw.Divider(thickness: 0.5),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'TOTAL',
                    style: pw.TextStyle(
                      fontSize: 10,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.Text(
                    AppFormatters.currency(sale.sale.total),
                    style: pw.TextStyle(
                      fontSize: 10,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ],
              ),
              pw.SizedBox(height: 10),
              pw.Center(
                child: pw.Text(
                  'Kasir: ${sale.soldBy.name}',
                  style: const pw.TextStyle(fontSize: 8),
                ),
              ),
              pw.Center(
                child: pw.Text(
                  'Terima kasih atas kunjungan Anda',
                  style: pw.TextStyle(
                    fontSize: 8,
                    fontStyle: pw.FontStyle.italic,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  @override
  Future<List<int>> generateSalesReportExcel({
    required SalesFinancialSummary summary,
    required List<TopSellingMedicine> topSelling,
    required List<SaleWithDetails> sales,
  }) async {
    final excel = Excel.createExcel();
    final Sheet sheet = excel['Sales Summary'];

    sheet.appendRow([TextCellValue('PHARMACY SALES SUMMARY REPORT')]);
    sheet.appendRow([TextCellValue('')]);
    sheet.appendRow([TextCellValue('Metric'), TextCellValue('Value')]);
    sheet.appendRow([
      TextCellValue('Total Transactions'),
      IntCellValue(summary.totalTransactions),
    ]);
    sheet.appendRow([
      TextCellValue('Gross Sales'),
      DoubleCellValue(summary.grossSales),
    ]);
    sheet.appendRow([
      TextCellValue('Total Discount'),
      DoubleCellValue(summary.totalDiscount),
    ]);
    sheet.appendRow([
      TextCellValue('Net Sales'),
      DoubleCellValue(summary.netSales),
    ]);
    sheet.appendRow([
      TextCellValue('COGS (Cost of Goods)'),
      DoubleCellValue(summary.totalCogs),
    ]);
    sheet.appendRow([
      TextCellValue('Gross Profit'),
      DoubleCellValue(summary.grossProfit),
    ]);
    sheet.appendRow([
      TextCellValue('Margin (%)'),
      DoubleCellValue(summary.grossMarginPercentage),
    ]);

    sheet.appendRow([TextCellValue('')]);
    sheet.appendRow([TextCellValue('TOP SELLING MEDICINES')]);
    sheet.appendRow([
      TextCellValue('Medicine Name'),
      TextCellValue('Units Sold'),
      TextCellValue('Total Revenue'),
    ]);
    for (final item in topSelling) {
      sheet.appendRow([
        TextCellValue(item.medicineName),
        DoubleCellValue(item.totalQuantity),
        DoubleCellValue(item.totalRevenue),
      ]);
    }

    final bytes = excel.encode();
    return bytes ?? [];
  }
}
