import { notify } from "./notify";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";
import { drawReportHeader, drawSignatories, loadReportLogos, reportTableOptions } from "../pages/Reports/reportPdf.js";

const PDF_ROWS_PER_PAGE = 10;
const FORM1_COLUMN_WIDTHS = [
  5.63,
  28,
  5.88,
  10.75,
  11.88,
  23.13,
  9.75,
  6.88,
  7.13,
  10.25,
  7.63,
  8.75,
  12.63,
  28.38,
];
const PDF_EXPORT_BRANDING = {
  organization: "Responsible Parenthood and Family Planning (RPFP) Form 1",
  formNumber: "Form No. RP1-PMED-FM021",
  version: "Version No. 01",
  effectivity: "Effectivity Date: August 13, 2019",
  headerCode: "B 00+000_____",
};
const FORM1_DISCLOSURE = "We hereby certify that we have read and understood the Notice on Privacy and Disclosure written on the dorsal part of this Responsible Parenthood and Family Planning (RPFP) Form and by signing and submitting this, we hereby grant the Commission on Population (POPCOM), or any of its authorized agents and partners, the authority to collect, obtain, store and process the personal information that we provide below for the purpose/s of.";

async function loadClientSignatureImages(clients) {
  const signatures = new Map();
  const clientsWithSignatures = clients.filter((client) => client.id && client.signature_url);
  const getSignatureImages = httpsCallable(functions, "getClientSignatureImages", { timeout: 120000 });

  for (let i = 0; i < clientsWithSignatures.length; i += 10) {
    const batch = clientsWithSignatures.slice(i, i + 10);
    try {
      const result = await getSignatureImages({ documentIds: batch.map((client) => client.id) });

      for (const image of result.data.images || []) {
        try {
          const binary = atob(image.data);
          const bytes = new Uint8Array(binary.length);
          for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
          }

          const imageBitmap = await createImageBitmap(
            new Blob([bytes], { type: image.contentType })
          );
          const canvas = document.createElement("canvas");
          canvas.width = imageBitmap.width;
          canvas.height = imageBitmap.height;
          canvas.getContext("2d").drawImage(imageBitmap, 0, 0);
          imageBitmap.close();
          signatures.set(image.documentId, {
            data: canvas.toDataURL("image/png"),
            width: canvas.width,
            height: canvas.height,
          });
        } catch (error) {
          console.warn(`Could not decode signature for client ${image.documentId}:`, error);
        }
      }
    } catch (error) {
      console.warn("Could not load signature images for PDF export:", error);
    }
  }

  return signatures;
}

function drawForm1Header(pdf, formLogo, exportedAt, recordCount) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const left = 12;
  const width = pageWidth - left * 2;

  if (formLogo) {
    pdf.addImage(formLogo.data, formLogo.format, left + 2, 4, formLogo.width * 0.8, formLogo.height * 0.8);
  }

  pdf.setFont("times", "bold");
  pdf.setFontSize(9);
  pdf.text(PDF_EXPORT_BRANDING.organization, pageWidth / 2, 8, { align: "center" });
  pdf.setFont("times", "normal");
  pdf.setFontSize(5);
  pdf.text(PDF_EXPORT_BRANDING.headerCode, pageWidth - 12, 4, { align: "right" });

  const metadataY = 11;
  const metadataHeight = 5;
  pdf.setDrawColor(30, 30, 30);
  pdf.setLineWidth(0.2);
  pdf.rect(left, metadataY, width, metadataHeight);
  pdf.line(left + width / 3, metadataY, left + width / 3, metadataY + metadataHeight);
  pdf.line(left + (width * 2) / 3, metadataY, left + (width * 2) / 3, metadataY + metadataHeight);
  pdf.setFontSize(5.5);
  pdf.text(PDF_EXPORT_BRANDING.formNumber, left + width / 6, metadataY + 3.4, { align: "center" });
  pdf.text(PDF_EXPORT_BRANDING.version, left + width / 2, metadataY + 3.4, { align: "center" });
  pdf.text(PDF_EXPORT_BRANDING.effectivity, left + (width * 5) / 6, metadataY + 3.4, { align: "center" });

  pdf.rect(left, 17, width, 8);
  pdf.setFont("times", "bold");
  pdf.setFontSize(4.6);
  pdf.text("DISCLAIMER:", left + 1.5, 20);
  pdf.setFont("times", "normal");
  pdf.text(FORM1_DISCLOSURE, left + 18, 20, { maxWidth: width - 20 });

  const groupsY = 26;
  const groupsHeight = 13;
  const groupWidths = [100, 115, width - 215];
  let groupX = left;
  for (const groupWidth of groupWidths) {
    pdf.rect(groupX, groupsY, groupWidth, groupsHeight);
    groupX += groupWidth;
  }

  const checkbox = (x, y, label) => {
    pdf.rect(x, y - 2.3, 2.6, 2.6);
    pdf.text(label, x + 4, y);
  };
  pdf.setFontSize(4.8);
  ["4Ps", "Faith-Based Organization", "PMC", "Usapan"].forEach((label, index) => {
    checkbox(left + 3, groupsY + 3 + index * 2.8, label);
  });
  ["House-to-House", "Profile only", "Others, please specify: __________________"].forEach((label, index) => {
    checkbox(left + groupWidths[0] + 3, groupsY + 4 + index * 3.5, label);
  });
  const fieldsX = left + groupWidths[0] + groupWidths[1] + 3;
  ["Class No.", "Prov/City/Mun.:", "Barangay:", "Date Conducted:"].forEach((label, index) => {
    const y = groupsY + 3 + index * 2.8;
    pdf.text(label, fieldsX, y);
    pdf.line(fieldsX + 27, y + 0.5, left + width - 3, y + 0.5);
  });

  pdf.setFont("times", "normal");
  pdf.setFontSize(5);
  pdf.text(`${recordCount} records | Exported ${exportedAt}`, pageWidth - left, 41, { align: "right" });
}

function drawPrivateHeader(pdf, logo, exportedAt, recordCount, title) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 12;

  if (logo) {
    const maxWidth = 19;
    const maxHeight = 19;
    const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);
    const width = logo.width * scale;
    const height = logo.height * scale;
    pdf.addImage(logo.data, logo.format, margin, 7, width, height);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(
    title,
    pageWidth / 2,
    17,
    { align: "center", maxWidth: pageWidth - 65 }
  );
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text(`${recordCount} records | Exported ${exportedAt}`, pageWidth - margin, 27, { align: "right" });
  pdf.setDrawColor(30, 30, 30);
  pdf.setLineWidth(0.25);
  pdf.line(margin, 31, pageWidth - margin, 31);
}

function drawPrivateFooter(pdf) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const blockWidth = (pageWidth - margin * 2) / 2;
  const labelY = pageHeight - 21;
  const lineY = pageHeight - 17;
  const roleY = pageHeight - 10;
  const signers = [
    { title: "Prepared By:", role: "Barangay Population Worker" },
    { title: "Reviewed By:", role: "Population Staff" },
  ];

  pdf.setDrawColor(30, 30, 30);
  pdf.setLineWidth(0.25);
  signers.forEach((signer, index) => {
    const x = margin + index * blockWidth;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(signer.title, x, labelY);
    pdf.line(x + 32, lineY, x + blockWidth - 5, lineY);
    pdf.setFontSize(7);
    pdf.text(signer.role, x + blockWidth / 2, roleY, { align: "center" });
  });
}

function drawCodePanel(pdf, x, y, width, title, entries) {
  const rowHeights = [];
  pdf.setFont("times", "normal");
  pdf.setFontSize(4.5);

  for (const [code, label] of entries) {
    const separator = /^[A-Z]$/.test(code) ? " - " : "- ";
    const lines = pdf.splitTextToSize(`${code}${separator}${label}`, width - 3);
    rowHeights.push({ lines, height: Math.max(3, lines.length * 1.45 + 0.55) });
  }

  pdf.setFont("times", "bold");
  pdf.setFontSize(5.2);
  const titleLines = pdf.splitTextToSize(title, width - 2);
  const titleHeight = Math.max(5.8, titleLines.length * 1.5 + 1.8);
  const height = titleHeight + rowHeights.reduce((total, row) => total + row.height, 0);
  pdf.text(titleLines, x + 1, y + 1.8);
  pdf.setFont("times", "normal");
  pdf.setFontSize(4.5);

  let rowY = y + titleHeight;
  for (const row of rowHeights) {
    pdf.text(row.lines, x + 1, rowY + 2);
    rowY += row.height;
  }

  return height;
}

function drawModernMethodPanel(pdf, x, y, width) {
  const title = "Modern FP Method Used (Columns 8 and 9)";
  const subheadHeight = 5.2;
  const columnWidth = width / 2;
  const methodGroups = [
    {
      title: "Artificial Methods:",
      entries: [
        ["1", "Condom"],
        ["2", "IUD"],
        ["3", "Pills"],
        ["4", "Injectable"],
        ["5", "Vasectomy"],
        ["6", "Tubal Ligation"],
        ["7", "Implant"],
      ],
    },
    {
      title: "Modern NFP Methods:",
      entries: [
        ["8", "CMM / Billings"],
        ["9", "BBT"],
        ["10", "Sympto-Thermal"],
        ["11", "SDM"],
        ["12", "LAM"],
      ],
    },
  ];

  pdf.setFont("times", "bold");
  pdf.setFontSize(5.2);
  const titleHeight = Math.max(5.8, pdf.splitTextToSize(title, width - 2).length * 1.5 + 1.8);
  pdf.setFontSize(4.5);
  const groups = methodGroups.map((group) => {
    const rows = group.entries.map(([code, label]) => {
      const lines = pdf.splitTextToSize(`${code}- ${label}`, columnWidth - 3);
      return { lines, height: Math.max(3, lines.length * 1.45 + 0.55) };
    });
    return { ...group, rows, height: rows.reduce((total, row) => total + row.height, 0) };
  });
  const height = titleHeight + subheadHeight + Math.max(...groups.map((group) => group.height));

  pdf.setDrawColor(30, 30, 30);
  pdf.setLineWidth(0.2);
  pdf.line(x + columnWidth, y + titleHeight, x + columnWidth, y + height);
  pdf.setFont("times", "bold");
  pdf.setFontSize(5.2);
  pdf.text(title, x + width / 2, y + 2, { align: "center", maxWidth: width - 2 });

  groups.forEach((group, groupIndex) => {
    const groupX = x + groupIndex * columnWidth;
    pdf.setFont("times", "bold");
    pdf.setFontSize(4.7);
    pdf.text(group.title, groupX + 1.5, y + titleHeight + 3.1);

    let rowY = y + titleHeight + subheadHeight;
    pdf.setFont("times", "normal");
    pdf.setFontSize(4.5);
    group.rows.forEach((row) => {
      pdf.text(row.lines, groupX + 1.5, rowY + 2);
      rowY += row.height;
    });
  });

  return height;
}

function drawForm1Footer(pdf) {
  const left = 12;
  const top = 146;
  const widths = [18, 89, 132, 20, 36, 36];
  const panels = [
    { title: "Civil Status (Column 3)", entries: [["1", "Married"], ["2", "Single"], ["3", "Widow/Widower"], ["4", "Separated"], ["5", "Live-in"]] },
    { title: "Highest Educational Attainment (Column 6)", entries: [["1", "No Education"], ["2", "Elementary Level"], ["3", "Elementary Graduate"], ["4", "High School Level"], ["5", "High School Graduate"], ["6", "Vocational"], ["7", "College Level"], ["8", "College Graduate"], ["9", "Post Graduate"]] },
    { draw: drawModernMethodPanel },
    { title: "Reason for Using FP / Intending to Use (Column 12)", entries: [["1", "Spacing"], ["2", "Limiting"], ["3", "Achieving"]] },
    { title: "Traditional FP User: Type (Column 10)", entries: [["1", "Withdrawal"], ["2", "Rhythm"], ["3", "Calendar"], ["4", "Abstinence"], ["5", "Herbal"], ["6", "No Method"]] },
    { title: "Non-Modern FP User: Status (Column 11)", entries: [["A", "Expressing intention to use modern FP method; indicate method code"], ["B", "Undecided"], ["C", "Currently Pregnant"], ["D", "No Intention to Use"]] },
  ];

  let x = left;
  const panelHeights = panels.map((panel, index) => {
    const height = panel.draw
      ? panel.draw(pdf, x, top, widths[index])
      : drawCodePanel(pdf, x, top, widths[index], panel.title, panel.entries);
    x += widths[index];
    return height;
  });
  pdf.setDrawColor(30, 30, 30);
  pdf.setLineWidth(0.2);
  const footerWidth = widths.reduce((total, width) => total + width, 0);
  const footerHeight = Math.max(...panelHeights);
  pdf.rect(left, top, footerWidth, footerHeight);
  let dividerX = left;
  widths.slice(0, -1).forEach((width) => {
    dividerX += width;
    pdf.line(dividerX, top, dividerX, top + footerHeight);
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setFont("times", "normal");
  pdf.setFontSize(4.2);
  pdf.text(
    "NOTE: Please use CODE NUMBER below for Civil Status, Educational Attainment and Method Used",
    pageWidth / 2,
    top - 2,
    { align: "center" }
  );
  const warningY = top + Math.max(...panelHeights) + 5;
  const warning = "NOTE: BEFORE AFFIXING YOUR SIGNATURE, MAKE SURE THAT ALL INFORMATION PROVIDED ABOVE ARE TRUE, ACCURATE, AND CORRECT WITH THE BEST OF YOUR KNOWLEDGE. PROVISION OF FALSE AND FAKE INFORMATION WILL BE PUNISHABLE UNDER THE LAW.";
  pdf.setFont("times", "bold");
  pdf.setFontSize(5.1);
  pdf.text(warning, pageWidth / 2, warningY, { align: "center", maxWidth: pageWidth - 24 });

  const signers = [
    { title: "Prepared by:", caption: "Signature over Printed Name" },
    { title: "Reviewed by:", caption: "Signature over Printed Name" },
    { title: "Approved by:", caption: "Signature over Printed Name" },
  ];
  const blockWidth = (pageWidth - 24) / signers.length;
  const signerTitleY = warningY + 7;
  const signerLineY = signerTitleY + 10;
  const signerCaptionY = signerLineY + 3.5;
  pdf.setDrawColor(30, 30, 30);
  pdf.setLineWidth(0.2);
  pdf.line(12 + blockWidth, signerTitleY - 2, 12 + blockWidth, signerCaptionY + 2);
  pdf.line(12 + blockWidth * 2, signerTitleY - 2, 12 + blockWidth * 2, signerCaptionY + 2);
  pdf.setFont("times", "bold");
  pdf.setFontSize(5.8);
  signers.forEach((signer, index) => {
    const x = 12 + index * blockWidth;
    pdf.text(signer.title, x + 2, signerTitleY);
    pdf.line(x + 2, signerLineY, x + blockWidth - 2, signerLineY);
    pdf.setFont("times", "normal");
    pdf.setFontSize(4.8);
    pdf.text(signer.caption, x + blockWidth / 2, signerCaptionY, { align: "center", maxWidth: blockWidth - 4 });
    pdf.setFont("times", "bold");
    pdf.setFontSize(5.8);
  });
}

const EXPORT_CONFIG = {
  public: {
    template: "/RPFP_Form1_Template.xlsx",
    filename: "RPFP_Form1_Template.xlsx",
    writeRows: writePublicRows,
  },
  private: {
    template: "/Private_Template.xlsx",
    filename: "FP_User_Private.xlsx",
    writeRows: writePrivateRows,
  },
  referred: {
    template: "/Export_Template_Referred.xlsx",
    filename: "Referred_and_Served.xlsx",
    writeRows: writeReferredRows,
  },
};

const CLIENT_REPORT_EXPORTS = {
  private: {
    title: "Family Planning Users Served by Private Institutions, Clinics, Hospitals, and Lying-In Facilities",
    filename: "FP_User_Private",
    headers: [
      "No.",
      "Name",
      "Age",
      "Birthday",
      "Barangay",
      "Family Planning Method",
      "FP Issued By (Name of Clinic, Hospital, Lying-In)",
    ],
    rows: (client, index) => [
      index + 1,
      client.name || "-",
      client.age || "-",
      client.birthdate || "-",
      client.barangay || "-",
      client.fp_method || "-",
      client.fp_issued_by || "-",
    ],
  },
  referred: {
    title: "Referred and Served User",
    filename: "Referred_and_Served",
    headers: [
      "No.",
      "Client",
      "Address",
      "FP Method",
      "Facility",
      "Facility Address",
      "Referred By",
      "Volunteer Contact",
      "Date",
    ],
    rows: (client, index) => [
      index + 1,
      client.name || "-",
      client.address || "-",
      client.fp_method || "-",
      client.facility_name || "-",
      client.facility_address || "-",
      client.referred_by || "-",
      client.volunteer_contact || "-",
      client.date || "-",
    ],
  },
};

async function exportClientRecordsReportPDF(activeTab, clients, fileName) {
  const config = CLIENT_REPORT_EXPORTS[activeTab];
  const logos = await loadReportLogos();
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const rows = clients.map((client, index) => config.rows(client, index));
  const rowKinds = rows.map(() => "month");
  const firstColumnWidth = activeTab === "private" ? 10 : 9;

  autoTable(pdf, {
    ...reportTableOptions(rowKinds, {
      fontSize: activeTab === "private" ? 7 : 6,
      cellPadding: 1.4,
      firstColumnWidth,
    }),
    head: [config.headers],
    body: rows,
    didDrawPage: () => drawReportHeader(pdf, config.title, logos),
  });

  drawSignatories(pdf);
  pdf.save(fileName || `${config.filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

const thin = { style: "thin" };
const border = { top: thin, bottom: thin, left: thin, right: thin };
const noBorder = { top: { style: null }, bottom: { style: null }, left: { style: null }, right: { style: null } };
const center = { horizontal: "center", vertical: "middle", wrapText: true };
const left = { horizontal: "left", vertical: "middle", wrapText: true };

const setCell = (sheet, ref, value, align = center) => {
  const cell = sheet.getCell(ref);
  cell.value = value;
  cell.border = border;
  cell.alignment = align;
  cell.font = { name: "Arial", size: 10 };
};

function writePublicRows(sheet, filteredClients) {
  const allCols = ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];

  // 1. Linisin ang data rows simula Row 9 hanggang 500 (huwag galawin ang Rows 1-8 dahil naroon ang headers)
  for (let r = 9; r <= 500; r++) {
    allCols.forEach((col) => {
      const cell = sheet.getCell(`${col}${r}`);
      cell.value = null;
      cell.style = {
        border: noBorder,
        fill: { type: "pattern", pattern: "none" },
        font: {},
        alignment: {},
      };
    });
  }

  // 2. Isulat ang bawat client record (2 rows bawat pares: Husband at Wife)
  filteredClients.forEach((client, index) => {
    // Nagsisimula sa Row 9 (Index 0 -> Row 9 & 10, Index 1 -> Row 11 & 12, etc.)
    const husbandRow = 9 + index * 2;
    const wifeRow = husbandRow + 1;

    // Mga column na naka-merge vertical para sa mag-asawa:
    // B (#), H (Address), J (Children), K (FP Method), L (Shift), M (Type), N (Status), O (Reason), P (Signature)
    const merges = ["B", "H", "J", "K", "L", "M", "N", "O", "P"];
    merges.forEach((col) => {
      try {
        sheet.mergeCells(`${col}${husbandRow}:${col}${wifeRow}`);
      } catch { /* cells already merged */ }
    });

    // Merge C at D para sa Name column (Name width spans Col C and Col D)
    try { sheet.mergeCells(`C${husbandRow}:D${husbandRow}`); } catch { /* already merged */ }
    try { sheet.mergeCells(`C${wifeRow}:D${wifeRow}`); } catch { /* already merged */ }

    // ── HUSBAND ROW (Row 9, 11, 13...) ──
    setCell(sheet, `B${husbandRow}`, index + 1);
    setCell(sheet, `C${husbandRow}`, client.name || "", left);
    setCell(sheet, `E${husbandRow}`, "M");
    setCell(sheet, `F${husbandRow}`, client.civil_status_male || "");
    setCell(sheet, `G${husbandRow}`, client.birthdate_male || "");
    setCell(sheet, `H${husbandRow}`, client.address || "", left);
    setCell(sheet, `I${husbandRow}`, client.educational_attainment_male || "");
    setCell(sheet, `J${husbandRow}`, client.no_of_children ? Number(client.no_of_children) : "");
    setCell(sheet, `K${husbandRow}`, client.fp_method || "");
    setCell(sheet, `L${husbandRow}`, client.intention_to_shift || "");
    setCell(sheet, `M${husbandRow}`, client.type || "");
    setCell(sheet, `N${husbandRow}`, client.status || "");
    setCell(sheet, `O${husbandRow}`, client.reason || "");
    
    // Column P: PARTICIPANT'S SIGNATURE (Kung may pirma sa system)
    setCell(sheet, `P${husbandRow}`, client.signature_url ? "Signed" : "");

    // ── WIFE ROW (Row 10, 12, 14...) ──
    setCell(sheet, `C${wifeRow}`, client.spouse_name || "", left);
    setCell(sheet, `E${wifeRow}`, "F");
    setCell(sheet, `F${wifeRow}`, client.civil_status_female || "");
    setCell(sheet, `G${wifeRow}`, client.birthdate_female || "");
    setCell(sheet, `I${wifeRow}`, client.educational_attainment_female || "");

    // I-apply ang borders sa ibabang merged cells (wife row)
    merges.forEach((col) => {
      sheet.getCell(`${col}${wifeRow}`).border = border;
    });
  });
}

function writePrivateRows(sheet, filteredClients) {
  const allCols = ["B", "C", "D", "E", "F", "G"];

  for (let r = 7; r <= 100; r++) {
    allCols.forEach((col) => {
      const cell = sheet.getCell(`${col}${r}`);
      cell.value = null;
      cell.style = {
        border: noBorder,
        fill: { type: "pattern", pattern: "none" },
        font: {},
        alignment: {},
      };
    });
  }

  filteredClients.forEach((client, index) => {
    const row = 7 + index;
    setCell(sheet, `B${row}`, client.name || "", left);
    setCell(sheet, `C${row}`, client.age || "");
    setCell(sheet, `D${row}`, client.birthdate || "");
    setCell(sheet, `E${row}`, client.barangay || "", left);
    setCell(sheet, `F${row}`, client.fp_method || "");
    setCell(sheet, `G${row}`, client.fp_issued_by || "", left);
  });
}

function writeReferredRows(sheet, filteredClients) {
  const allCols = ["B", "C", "D", "E", "F", "G", "H", "I", "J"];

  for (let r = 5; r <= 200; r++) {
    allCols.forEach((col) => {
      const cell = sheet.getCell(`${col}${r}`);
      cell.value = null;
      cell.style = {
        border: noBorder,
        fill: { type: "pattern", pattern: "none" },
        font: {},
        alignment: {},
      };
    });
  }

  filteredClients.forEach((client, index) => {
    const row = 5 + index;
    setCell(sheet, `B${row}`, index + 1);
    setCell(sheet, `C${row}`, client.name || "", left);
    setCell(sheet, `D${row}`, client.address || "", left);
    setCell(sheet, `E${row}`, client.fp_method || "");
    setCell(sheet, `F${row}`, client.facility_name || "", left);
    setCell(sheet, `G${row}`, client.facility_address || "", left);
    setCell(sheet, `H${row}`, client.referred_by || "", left);
    setCell(sheet, `I${row}`, client.volunteer_contact || "");
    setCell(sheet, `J${row}`, client.date || "");
  });
}

export async function exportClientRecordsExcel(activeTab, filteredClients, fileName) {
  const config = EXPORT_CONFIG[activeTab];
  if (!config) return;

  try {
    const response = await fetch(config.template);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const sheet = workbook.getWorksheet(1);
    config.writeRows(sheet, filteredClients);
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName || config.filename);
  } catch (error) {
    console.error("Export failed:", error);
    notify(`Could not export. Make sure '${config.template.replace("/", "")}' is in your public folder!`);
  }
}

export async function exportClientRecordsPDF(activeTab, filteredClients, fileName) {
  if (filteredClients.length === 0) {
    notify("There are no records to export.");
    return;
  }

  if (CLIENT_REPORT_EXPORTS[activeTab]) {
    try {
      await exportClientRecordsReportPDF(activeTab, filteredClients, fileName);
    } catch (error) {
      console.error("Client records PDF export failed:", error);
      notify("Could not export the PDF. Please try again.");
    }
    return;
  }

  const value = (field) => field == null || field === "" ? "-" : String(field);
  const exportConfig = {
    public: {
      title: "RPFP Form 1 - List of Family Planning Users",
      format: "legal",
      orientation: "landscape",
      fontSize: 6,
      rowsPerRecord: 2,
      headRows: [
        [
          { content: "No.", rowSpan: 3 },
          { content: "Name of Participant/Couple", rowSpan: 2 },
          { content: "PROFILE", colSpan: 6 },
          { content: "Modern FP User", colSpan: 2 },
          { content: "Traditional FP User", colSpan: 3 },
          { content: "PARTICIPANT'S SIGNATURE", rowSpan: 3 },
        ],
        [
          "Sex (M/F)", "Civil Status", "Birthdate / Age", "Address & Contact Number",
          "Highest Educational Attainment", "No. of Children", "Method Used",
          "Intention to shift to other FP Method", "Type", "Status",
          "Reason for Intending to use FP Method",
        ],
        ["(1)", "(2)", "(3)", "(4)", "(5)", "(6)", "(7)", "(8)", "(9)", "(10)", "(11)", "(12)"],
      ],
      rows: filteredClients.flatMap((client, index) => {
        const addressAndContact = [client.address, client.contact_number || client.phone_number]
          .filter(Boolean)
          .map(value)
          .join("\n") || "-";

        return [
          [
            { content: index + 1, rowSpan: 2 },
            value(client.name),
            "M",
            value(client.civil_status_male),
            value(client.birthdate_male),
            { content: addressAndContact, rowSpan: 2 },
            value(client.educational_attainment_male),
            { content: value(client.no_of_children || "0"), rowSpan: 2 },
            { content: value(client.fp_method), rowSpan: 2 },
            { content: value(client.intention_to_shift), rowSpan: 2 },
            { content: value(client.type), rowSpan: 2 },
            { content: value(client.status), rowSpan: 2 },
            { content: value(client.reason), rowSpan: 2 },
            { content: "", rowSpan: 2 },
          ],
          [
            value(client.spouse_name),
            "F",
            value(client.civil_status_female),
            value(client.birthdate_female),
            value(client.educational_attainment_female),
          ],
        ];
      }),
      filename: "client-records-public",
    },
    private: {
      title: "Family Planning Users Served by Private Institutions, Clinics, Hospitals, Lying Inns",
      format: "a4",
      orientation: "landscape",
      fontSize: 10,
      rowsPerRecord: 1,
      recordsPerPage: 20,
      headers: [
        "Name:",
        "Age:",
        "Birthday:",
        "Barangay:",
        "Family Planning Method",
        "FP Issued By (Name of Clinic, Hospital, Lying-In)",
      ],
      rows: filteredClients.map((client, index) => [
        value(client.name),
        value(client.age),
        value(client.birthdate),
        value(client.barangay),
        value(client.fp_method),
        value(client.fp_issued_by),
      ]),
      filename: "client-records-private",
    },
    referred: {
      title: "Referred and Served Users",
      format: "a4",
      orientation: "landscape",
      fontSize: 10,
      rowsPerRecord: 1,
      recordsPerPage: 20,
      headers: [
        "No.", "Client", "Address", "FP Method", "Facility", "Facility Address",
        "Referred By", "Volunteer Contact", "Date",
      ],
      rows: filteredClients.map((client, index) => [
        index + 1,
        value(client.name),
        value(client.address),
        value(client.fp_method),
        value(client.facility_name),
        value(client.facility_address),
        value(client.referred_by),
        value(client.volunteer_contact),
        value(client.date),
      ]),
      filename: "client-records-referred",
    },
  }[activeTab];

  if (!exportConfig) return;

  try {
    const pdf = new jsPDF({
      orientation: exportConfig.orientation,
      unit: "mm",
      format: exportConfig.format,
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const formColumnScale = (pageWidth - 16) /
      FORM1_COLUMN_WIDTHS.reduce((total, width) => total + width, 0);
    const formColumnStyles = Object.fromEntries(
      FORM1_COLUMN_WIDTHS.map((width, index) => [index, {
        cellWidth: width * formColumnScale,
        ...(index === 0 || index === 2 || index === 7 ? { halign: "center" } : {}),
      }])
    );
    const privateColumnWidths = [28.44, 10.33, 15.55, 17.66, 21, 28.44];
    const privateColumnScale = (pageWidth - 24) /
      privateColumnWidths.reduce((total, width) => total + width, 0);
    const privateColumnStyles = Object.fromEntries(
      privateColumnWidths.map((width, index) => [index, {
        cellWidth: width * privateColumnScale,
        ...(index === 1 || index === 2 ? { halign: "center" } : {}),
      }])
    );
    const exportedAt = new Date().toLocaleString();
    const signatureImages = activeTab === "public"
      ? await loadClientSignatureImages(filteredClients)
      : new Map();
    let formLogo = null;

    const logoTemplate = activeTab === "public"
      ? "/RPFP_Form_1.xlsx"
      : activeTab === "private" || activeTab === "referred"
        ? "/Private_Template.xlsx"
        : null;

    if (logoTemplate) {
      try {
        const response = await fetch(logoTemplate);
        if (response.ok) {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(await response.arrayBuffer());
          const formSheet = workbook.getWorksheet(1);
          const image = formSheet?.getImages()[0];
          const media = image && workbook.model.media[image.imageId];
          const imageWidth = image?.range?.ext?.width || 100;
          const imageHeight = image?.range?.ext?.height || 100;

          if (media?.buffer) {
            const scale = Math.min(
              20 / imageWidth,
              14 / imageHeight
            );
            formLogo = {
              data: new Uint8Array(media.buffer),
              format: media.extension.toUpperCase() === "JPG"
                ? "JPEG"
                : media.extension.toUpperCase(),
              width: imageWidth * scale,
              height: imageHeight * scale,
            };
          }
        }
      } catch (error) {
        console.warn("Could not load the Form 1 logo for PDF export:", error);
      }
    }

    const usesPrivateLayout = activeTab === "private";
    const usesReferredLayout = activeTab === "referred";
    const usesBrandedLayout = usesPrivateLayout || usesReferredLayout;
    const rowsPerPage = (exportConfig.recordsPerPage || PDF_ROWS_PER_PAGE) * exportConfig.rowsPerRecord;
    const usesFormLayout = activeTab === "public";
    for (let i = 0; i < exportConfig.rows.length; i += rowsPerPage) {
      if (i > 0) pdf.addPage();

      const pageRows = exportConfig.rows.slice(i, i + rowsPerPage);
      if (usesFormLayout) {
        while (pageRows.length < rowsPerPage) {
          pageRows.push([
            { content: "", rowSpan: 2 },
            "",
            "",
            "",
            "",
            { content: "", rowSpan: 2 },
            "",
            { content: "", rowSpan: 2 },
            { content: "", rowSpan: 2 },
            { content: "", rowSpan: 2 },
            { content: "", rowSpan: 2 },
            { content: "", rowSpan: 2 },
            { content: "", rowSpan: 2 },
            { content: "", rowSpan: 2 },
          ]);
          pageRows.push(["", "", "", "", ""]);
        }
      }

      autoTable(pdf, {
        startY: usesFormLayout ? 42 : usesBrandedLayout ? 35 : 32,
        head: exportConfig.headRows || [exportConfig.headers],
        body: pageRows,
        theme: "grid",
        margin: {
          top: usesFormLayout ? 42 : usesBrandedLayout ? 35 : 32,
          left: usesFormLayout ? 8 : 12,
          right: usesFormLayout ? 8 : 12,
          bottom: usesFormLayout ? 72 : usesBrandedLayout ? 30 : 16,
        },
        rowPageBreak: "avoid",
        styles: {
          font: usesFormLayout ? "times" : "helvetica",
          fontSize: exportConfig.rowsPerRecord === 2 ? 5 : exportConfig.fontSize,
          cellPadding: exportConfig.rowsPerRecord === 2 ? 1.1 : usesBrandedLayout ? 1.4 : 2,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: usesFormLayout || usesBrandedLayout ? [255, 255, 255] : [9, 31, 122],
          textColor: usesFormLayout || usesBrandedLayout ? [0, 0, 0] : 255,
          lineColor: usesFormLayout || usesBrandedLayout ? [30, 30, 30] : [9, 31, 122],
          lineWidth: usesFormLayout || usesBrandedLayout ? 0.15 : 0.1,
          fontStyle: "bold",
        },
        alternateRowStyles: usesFormLayout || usesBrandedLayout ? { fillColor: [255, 255, 255] } : { fillColor: [245, 248, 252] },
        ...((usesFormLayout || usesBrandedLayout) && {
          didParseCell: (data) => {
            if (data.section === "head") {
              data.cell.styles.font = usesFormLayout ? "times" : "helvetica";
              data.cell.styles.fontSize = usesFormLayout
                ? (data.row.index === 0 ? 6 : 4.4)
                : exportConfig.fontSize;
              data.cell.styles.halign = "center";
              data.cell.styles.valign = "middle";
            } else {
              data.cell.styles.font = usesFormLayout ? "times" : "helvetica";
              data.cell.styles.lineColor = [30, 30, 30];
              data.cell.styles.lineWidth = 0.15;
            }
          },
          didDrawCell: (data) => {
            if (
              data.section !== "body" ||
              data.column.index !== 13 ||
              data.row.index % 2 !== 0
            ) {
              return;
            }

            const clientIndex = i / exportConfig.rowsPerRecord + data.row.index / exportConfig.rowsPerRecord;
            const client = filteredClients[clientIndex];
            const signature = client && signatureImages.get(client.id);
            if (!signature) return;

            const padding = 1;
            const scale = Math.min(
              (data.cell.width - padding * 2) / signature.width,
              (data.cell.height - padding * 2) / signature.height
            );
            const imageWidth = signature.width * scale;
            const imageHeight = signature.height * scale;
            pdf.addImage(
              signature.data,
              "PNG",
              data.cell.x + (data.cell.width - imageWidth) / 2,
              data.cell.y + (data.cell.height - imageHeight) / 2,
              imageWidth,
              imageHeight
            );
          },
        }),
        ...(activeTab === "public" && {
          columnStyles: formColumnStyles,
        }),
        ...(usesPrivateLayout && {
          columnStyles: privateColumnStyles,
        }),
      });
    }

    const pageCount = pdf.internal.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page);
      if (usesFormLayout) {
        drawForm1Header(pdf, formLogo, exportedAt, filteredClients.length);
        drawForm1Footer(pdf);
        continue;
      }

      if (usesBrandedLayout) {
        drawPrivateHeader(pdf, formLogo, exportedAt, filteredClients.length, exportConfig.title);
        drawPrivateFooter(pdf);
        continue;
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text(PDF_EXPORT_BRANDING.headerCode, pageWidth - 12, 7, { align: "right" });
      if (formLogo) {
        pdf.addImage(
          formLogo.data,
          formLogo.format,
          12,
          8,
          formLogo.width,
          formLogo.height
        );
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(PDF_EXPORT_BRANDING.organization, pageWidth / 2, 12, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(
        `${PDF_EXPORT_BRANDING.formNumber}     ${PDF_EXPORT_BRANDING.version}     ${PDF_EXPORT_BRANDING.effectivity}`,
        pageWidth / 2,
        19,
        { align: "center" }
      );
      pdf.setFontSize(7);
      pdf.text(
        `${filteredClients.length} records | Exported ${exportedAt}`,
        pageWidth - 12,
        25,
        { align: "right" }
      );
      pdf.setDrawColor(190, 198, 214);
      pdf.line(12, pdf.internal.pageSize.getHeight() - 12, pageWidth - 12, pdf.internal.pageSize.getHeight() - 12);
      pdf.setFontSize(8);
      pdf.text(
        `Page ${page} of ${pageCount}`,
        pageWidth - 12,
        pdf.internal.pageSize.getHeight() - 6,
        { align: "right" }
      );
    }

    pdf.save(fileName || `${exportConfig.filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error("PDF export failed:", error);
    notify("Could not export the PDF. Please try again.");
  }
}
