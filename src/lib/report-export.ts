import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string
) {
  const headers = columns.map(c => c.header);
  const rows = data.map(row => columns.map(c => row[c.key] ?? ''));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = columns.map(c => ({ wch: c.width || 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPdf(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  title: string,
  filename: string,
  dateRange?: { start: string; end: string }
) {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const dateInfo = dateRange
    ? `Período: ${formatDateBR(dateRange.start)} a ${formatDateBR(dateRange.end)}`
    : '';
  const generated = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(dateInfo ? `${dateInfo}  |  ${generated}` : generated, 14, 28);

  autoTable(doc, {
    startY: 35,
    head: [columns.map(c => c.header)],
    body: data.map(row => columns.map(c => String(row[c.key] ?? '-'))),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
