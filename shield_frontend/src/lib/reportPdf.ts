import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportTable } from "./reportData";

export function downloadPdf(reportName: string, table: ReportTable, filters?: { dateFrom?: string; dateTo?: string; tier?: string; segment?: string }) {
  const doc = new jsPDF({ orientation: table.columns.length > 5 ? "landscape" : "portrait" });

  doc.setFillColor(10, 12, 15);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, "F");
  doc.setTextColor(47, 174, 102);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SHIELD", 14, 14);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Mule Account Risk Console — Prototype Report", 40, 14);

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(reportName, 14, 32);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  const generated = `Generated ${new Date().toLocaleString()}`;
  const filterLine = filters
    ? `Filters — Date: ${filters.dateFrom || "any"} to ${filters.dateTo || "any"} · Tier: ${filters.tier ?? "All"} · Segment: ${filters.segment ?? "All"}`
    : "";
  doc.text(generated, 14, 38);
  if (filterLine) doc.text(filterLine, 14, 43);

  autoTable(doc, {
    startY: filterLine ? 48 : 43,
    head: [table.columns],
    body: table.rows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [27, 74, 50], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 245] },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? 60;
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text(
    "SHIELD output — XGBoost trained on binary FRAUD_TGT; SHIELD score combines supervised fraud probability with an independent anomaly signal.",
    14,
    Math.min(finalY + 8, doc.internal.pageSize.getHeight() - 10)
  );

  doc.save(`${reportName.replace(/\s+/g, "_")}.pdf`);
}
