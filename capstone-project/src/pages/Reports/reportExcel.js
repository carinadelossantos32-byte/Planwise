/*
    Shared touches for the Excel report exports. Only the look is adjusted;
    the wording of the template's headings is never changed.
*/

/*
    Cells in a template that look alike share ONE style object, so writing
    `cell.font = ...` on one of them restyles all the others too (that is how the
    small grey "Date Created" style ended up on the RPFP heading). Always restyle
    through this, which gives the cell its own copy first.
*/
export function restyleCell(cell, { font, alignment }) {
    cell.style = {
        ...cell.style,
        font: { ...cell.style.font, ...font },
        alignment: { ...cell.style.alignment, ...alignment },
    };
}

export function tidyReportHeader(sheet) {
    centerProgramHeading(sheet);
    fitFormTitle(sheet);
}

/*
    "Responsible Parenthood and Family Planning (RPFP)" in A6 keeps the template's
    format (bold 16pt, centered). The text is followed by a long run of spaces in
    the template, which pushes it left of center, so those are dropped.
*/
function centerProgramHeading(sheet, cellAddress = "A6") {
    const cell = sheet.getCell(cellAddress);

    if (typeof cell.value === "string") {
        cell.value = cell.value.trim();
    }

    restyleCell(cell, {
        font: { bold: true },
        alignment: { horizontal: "center", vertical: "middle" },
    });
}

/*
    The form title in A9 ("FORM A", "FORM B", ...) has the same 16pt bold, wrapped
    style as the letterhead, but it sits in one narrow column, so it wraps and
    gets cut off. This makes it smaller and keeps it on one line.
*/
function fitFormTitle(sheet, cellAddress = "A9") {
    const cell = sheet.getCell(cellAddress);

    restyleCell(cell, {
        font: { size: 12 },
        // a title merged across several columns has room to wrap; a single cell does not
        alignment: { wrapText: cell.isMerged, shrinkToFit: false },
    });
}
