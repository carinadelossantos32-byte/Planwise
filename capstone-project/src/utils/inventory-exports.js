import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function getInventoryMatrix(rhuData, fpMethods) {
  const methods = fpMethods.map(({ id, label }) => ({ id, label }));
  const rows = rhuData.map((rhu) => {
    const methodStocks = methods.map(({ id }) => Number(rhu.stockByMethod?.[id] ?? 0));
    return {
      name: rhu.name || "Unnamed RHU",
      methodStocks,
      total: methodStocks.reduce((sum, stock) => sum + stock, 0),
    };
  });
  const methodTotals = methods.map((_, index) =>
    rows.reduce((sum, row) => sum + row.methodStocks[index], 0)
  );

  return {
    methods,
    rows,
    methodTotals,
    grandTotal: methodTotals.reduce((sum, stock) => sum + stock, 0),
  };
}

function hasInventoryRows(rows) {
  if (rows.length > 0) return true;
  alert("There are no inventory records to export.");
  return false;
}

export function exportInventoryPDF(rhuData, fpMethods) {
  const { methods, rows, methodTotals, grandTotal } = getInventoryMatrix(rhuData, fpMethods);
  if (!hasInventoryRows(rows)) return;

  try {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageCenter = pdf.internal.pageSize.getWidth() / 2;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("Inventory Stocks Matrix by FP Method", pageCenter, 16, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`Generated ${new Date().toLocaleString()}`, pageCenter, 23, { align: "center" });

    autoTable(pdf, {
      startY: 29,
      head: [["RHU", ...methods.map(({ label }) => label), "TOTAL"]],
      body: rows.map(({ name, methodStocks, total }) => [
        name,
        ...methodStocks,
        total,
      ]),
      foot: [["TOTAL", ...methodTotals, grandTotal]],
      theme: "grid",
      styles: { fontSize: 7, halign: "center", valign: "middle" },
      headStyles: { fillColor: [20, 8, 109], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [230, 234, 245], textColor: 20, fontStyle: "bold" },
      columnStyles: { 0: { halign: "left", cellWidth: 35 } },
    });

    pdf.save("Inventory_Stocks_Matrix.pdf");
  } catch (error) {
    console.error("Failed to export inventory PDF:", error);
    alert("Failed to export the inventory PDF. Please try again.");
  }
}

export async function exportInventoryExcel(rhuData, fpMethods) {
  const { methods, rows, methodTotals, grandTotal } = getInventoryMatrix(rhuData, fpMethods);
  if (!hasInventoryRows(rows)) return;

  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Stocks Matrix");
    const columnCount = methods.length + 2;

    sheet.mergeCells(1, 1, 1, columnCount);
    const title = sheet.getCell(1, 1);
    title.value = "Inventory Stocks Matrix by FP Method";
    title.font = { bold: true, size: 16, color: { argb: "FF14086D" } };
    title.alignment = { horizontal: "center" };

    sheet.mergeCells(2, 1, 2, columnCount);
    const generatedAt = sheet.getCell(2, 1);
    generatedAt.value = `Generated ${new Date().toLocaleString()}`;
    generatedAt.alignment = { horizontal: "center" };

    const headerRow = sheet.addRow(["RHU", ...methods.map(({ label }) => label), "TOTAL"]);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14086D" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    rows.forEach(({ name, methodStocks, total }) => {
      sheet.addRow([name, ...methodStocks, total]);
    });

    const totalRow = sheet.addRow(["TOTAL", ...methodTotals, grandTotal]);
    totalRow.font = { bold: true };
    totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6EAF5" } };

    sheet.columns = [
      { width: 28 },
      ...methods.map(() => ({ width: 20 })),
      { width: 14 },
    ];
    sheet.views = [{ state: "frozen", ySplit: 3 }];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      "Inventory_Stocks_Matrix.xlsx"
    );
  } catch (error) {
    console.error("Failed to export inventory Excel:", error);
    alert("Failed to export the inventory Excel file. Please try again.");
  }
}
