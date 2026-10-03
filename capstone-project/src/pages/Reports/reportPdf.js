import bulacanSeal from "../../assets/bulacan-seal.webp";
import cpdLogo from "../../assets/cpd-logo.jpg";

/*
    Shared layout for every report's PDF export (landscape A4):
    letterhead with logos, "Date Created" at the top right, a table styled
    like the on-screen official report, and the signatories underneath.
*/

const SIDE_MARGIN = 8;
const PAGE_CENTER = 148;

const NAVY = [11, 31, 107];
const NAVY_LIGHT = [27, 49, 135];
const SUBTOTAL_FILL = [232, 238, 255];
const ZEBRA_FILL = [250, 251, 254];

// Loads a logo and re-encodes it as a small PNG that jsPDF can embed.
// Resolves to null if the image can't be loaded, so the export still works.
function loadLogo(src, size = 320) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = Math.round(size * (img.naturalHeight / img.naturalWidth));
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve({
                data: canvas.toDataURL("image/png"),
                ratio: canvas.height / canvas.width,
            });
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

export async function loadReportLogos() {
    const [seal, cpd] = await Promise.all([loadLogo(bulacanSeal), loadLogo(cpdLogo)]);
    return { seal, cpd };
}

// Letterhead, logos, date and the report's own title line
export function drawReportHeader(doc, subtitle, logos = {}) {

    const pageWidth = doc.internal.pageSize.getWidth();

    const dateCreated = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    // Date created, top right
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text(`Date Created: ${dateCreated}`, pageWidth - SIDE_MARGIN, 10, { align: "right" });

    doc.setFontSize(11);
    doc.text("Republic of the Philippines", PAGE_CENTER, 10, { align: "center" });
    doc.text("Province of Bulacan", PAGE_CENTER, 16, { align: "center" });

    doc.setFont("times", "bold");
    doc.text("Provincial Social Welfare and Development Office", PAGE_CENTER, 22, { align: "center" });

    const rpfpTitle = "Responsible Parenthood and Family Planning (RPFP)";

    doc.setFontSize(15);
    doc.text(rpfpTitle, PAGE_CENTER, 31, { align: "center" });

    // Logos beside the RPFP heading: Bulacan seal on its left, CPD on its right.
    // The CPD file has a white margin around it, so it is drawn larger to look the same size.
    const titleHalf = doc.getTextWidth(rpfpTitle) / 2;
    const titleMiddleY = 29;
    const logoGap = 6;

    if (logos.seal) {
        const w = 20, h = w * logos.seal.ratio;
        doc.addImage(logos.seal.data, "PNG", PAGE_CENTER - titleHalf - logoGap - w, titleMiddleY - h / 2, w, h);
    }

    if (logos.cpd) {
        const w = 26, h = w * logos.cpd.ratio;
        doc.addImage(logos.cpd.data, "PNG", PAGE_CENTER + titleHalf + logoGap - 3, titleMiddleY - h / 2, w, h);
    }

    // Sits below the logos so a long title can't run into them
    doc.setFontSize(11);
    doc.text(subtitle, PAGE_CENTER, 44, { align: "center" });

}

/*
    Base jspdf-autotable options. Spread into autoTable() and add head / body.
    rowKinds: one entry per body row - "month" | "subtotal" | "total".
*/
export function reportTableOptions(rowKinds, { fontSize = 7, cellPadding = 1.8, firstColumnWidth = 30 } = {}) {
    return {

        startY: 49,
        theme: "grid",
        margin: { left: SIDE_MARGIN, right: SIDE_MARGIN },

        styles: {
            font: "helvetica",
            fontSize,
            cellPadding,
            halign: "center",
            valign: "middle",
            textColor: [71, 85, 105],
            lineColor: [226, 231, 242],
            lineWidth: 0.1,
        },

        headStyles: {
            fillColor: NAVY_LIGHT,
            textColor: 255,
            fontStyle: "bold",
            lineColor: [70, 88, 160],
            lineWidth: 0.1,
        },

        columnStyles: {
            0: { cellWidth: firstColumnWidth, halign: "left", fontStyle: "bold", textColor: [15, 23, 42] },
        },

        didParseCell(data) {

            if (data.section === "head") {
                // Top header row (and the cells spanning down from it) is the darker navy
                if (data.row.index === 0) data.cell.styles.fillColor = NAVY;
                data.cell.styles.halign = "center";
                return;
            }

            const kind = rowKinds[data.row.index];

            if (kind === "subtotal") {
                data.cell.styles.fillColor = SUBTOTAL_FILL;
                data.cell.styles.textColor = NAVY;
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.lineColor = [205, 216, 251];
            } else if (kind === "total") {
                data.cell.styles.fillColor = NAVY;
                data.cell.styles.textColor = 255;
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.lineColor = [70, 88, 160];
            } else if (data.row.index % 2 === 1) {
                data.cell.styles.fillColor = ZEBRA_FILL;
            }

        },

    };
}

// "Prepared by / Reviewed by / Approved by" under the table
// (moved to a new page if they don't fit)
export function drawSignatories(doc) {

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const signatories = ["Prepared by:", "Reviewed by:", "Approved by:"];
    const blockHeight = 26;

    let signY = doc.lastAutoTable.finalY + 12;

    if (signY + blockHeight > pageHeight - 8) {
        doc.addPage();
        signY = 20;
    }

    const columnWidth = (pageWidth - SIDE_MARGIN * 2) / signatories.length;
    const lineWidth = 62;

    doc.setTextColor(0);
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);

    signatories.forEach((label, i) => {

        const x = SIDE_MARGIN + columnWidth * i + (columnWidth - lineWidth) / 2;

        doc.setFont("times", "bold");
        doc.setFontSize(10);
        doc.text(label, x, signY);

        doc.line(x, signY + 16, x + lineWidth, signY + 16);

        doc.setFont("times", "normal");
        doc.setFontSize(8);
        doc.text(
            "Signature over Printed Name",
            x + lineWidth / 2, signY + 20,
            { align: "center" }
        );

    });

}
