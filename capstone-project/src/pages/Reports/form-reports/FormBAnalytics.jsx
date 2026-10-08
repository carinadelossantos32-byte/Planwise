import { notify } from "../../../utils/notify";
import { useMemo, useState, useEffect, useRef } from "react";
import "../report-forms.css";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { tidyReportHeader } from "../reportExcel.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getClientDate } from "../reportData";
import ExportConfirmModal from "../ExportConfirmModal";
import { loadReportLogos, drawReportHeader, reportTableOptions, drawSignatories } from "../reportPdf";

/*
====================================================
                    CONSTANTS
====================================================
*/

const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

// "Traditional FP User Type" values that mean the couple uses a traditional method
// ("No Method" is not one of them: that couple has an unmet need)
const traditionalTypes = ["withdrawal", "rhythm", "calendar", "abstinence", "herbal"];

// Excel template layout: JANUARY starts on row 14, Grand Total on row 26.
// Change these if your template layout differs.
const TEMPLATE_FIRST_ROW = 14;
const TEMPLATE_GRAND_ROW = 26;

const IMPORT_STORAGE_KEY = "formB_imported_reports";

const numericKeys = [
    "unmet",
    "referred",
    "traditionalNoShift",
    "traditionalShift",
    "traditionalReferred",
    "traditional",
    "totalUnmet",
    "totalReferred",
];

const createMonthRecord = (month) => ({
    month,
    unmet: 0,
    referred: 0,
    traditionalNoShift: 0,
    traditionalShift: 0,
    traditionalReferred: 0,
    traditional: 0,
    totalUnmet: 0,
    totalReferred: 0,
});

// A record for every month, all zeros
const createEmptyMonthly = () => {
    const monthly = {};
    monthNames.forEach(m => { monthly[m] = createMonthRecord(m); });
    return monthly;
};

// Totals are always derived from the base columns
const finalizeRecord = (rec) => {
    rec.totalUnmet = rec.unmet + rec.traditionalNoShift + rec.traditionalShift;
    rec.totalReferred = rec.referred + rec.traditionalReferred;
    return rec;
};

// Adds one month record (src) into another (target)
function addMonthRecord(target, src) {
    numericKeys.forEach(key => { target[key] += src[key]; });
}

// Adds up several month records (used for the grand total)
function sumMonths(monthly, months) {

    const total = createMonthRecord("Total");

    months.forEach(m => addMonthRecord(total, monthly[m]));

    return total;
}

// True when a month record has any recorded value
const monthHasData = (rec) =>
    rec.unmet > 0 ||
    rec.referred > 0 ||
    rec.traditionalNoShift > 0 ||
    rec.traditionalShift > 0 ||
    rec.traditionalReferred > 0;

/*
    Period values match the page's Period filter:
    "all" | "q1" | "q2" | "q3" | "q4" | "january" ... "december"
*/
function periodToMonths(period) {

    const p = String(period ?? "all").toLowerCase();

    const q = /^q([1-4])$/.exec(p);
    if (q) {
        const start = (Number(q[1]) - 1) * 3;
        return monthNames.slice(start, start + 3);
    }

    const month = monthNames.find(m => m.toLowerCase() === p);
    return month ? [month] : monthNames;
}

// Best-fitting period for a list of recorded months
function monthsToPeriod(months) {

    if (months.length === 1) return months[0].toLowerCase();

    if (months.length > 1) {
        for (let q = 0; q < 4; q++) {
            const inQuarter = months.every(m => {
                const i = monthNames.indexOf(m);
                return i >= q * 3 && i < q * 3 + 3;
            });
            if (inQuarter) return `q${q + 1}`;
        }
    }

    return "all";
}

function periodLabel(period) {
    const months = periodToMonths(period);
    if (months.length === 12) return "";
    if (months.length === 1) return months[0];
    return `${months[0]} to ${months[months.length - 1]}`;
}

/*
====================================================
                CLIENT FIELD HELPERS
====================================================
*/

function getFieldValue(client, keys) {

    for (const key of keys) {

        const value = client?.[key];

        if (
            value === undefined ||
            value === null
        ) continue;

        if (typeof value === "string") {

            if (value.trim()) {
                return value.trim();
            }

        } else {

            return value;

        }

    }

    return "";

}

function normalize(value) {

    return typeof value === "string"
        ? value.trim().toLowerCase()
        : "";

}




/*
    Builds the monthly records from client data.
    includeYear(year) decides which years are counted
    (year is null when a client has no usable date).
*/
// Month a record is reported under ("" when it has no usable date)
function getMonth(client) {
    const date = getClientDate(client);
    return date ? monthNames[date.getMonth()] : "";
}

function buildMonthlyFromClients(clients, includeYear) {

    const monthly = createEmptyMonthly();

    clients.forEach(client => {

        if (client.is_archived) return;

        const month = getMonth(client);

        if (!month) return;

        const year = getClientDate(client)?.getFullYear() ?? null;

        if (!includeYear(year)) return;

        const row = monthly[month];

        const method = normalize(getFieldValue(client, ["fp_method", "method"]));
        const type = normalize(getFieldValue(client, ["type"]));
        const status = normalize(getFieldValue(client, ["status"]));

        const isTraditional = traditionalTypes.some(item => type.includes(item));
        const isReferred = client.sourceCollection === "clients_referred";

        /*
        ==================================
        REFERRED / SERVED
        Each referred client is counted once: under Traditional FP
        if they were a traditional user, otherwise under unmet need.
        ==================================
        */

        if (isReferred) {
            if (isTraditional) row.traditionalReferred++;
            else row.referred++;
            return;
        }

        /*
        ==================================
        TRADITIONAL FP USERS
        "With intention to shift" = status A (Expressing Intention to
        Use Modern FP). Undecided, Currently Pregnant, No Intention to
        Use and a blank status all count as without intention.
        ==================================
        */

        if (isTraditional) {

            row.traditional++;

            if (status.startsWith("expressing intention")) row.traditionalShift++;
            else row.traditionalNoShift++;

            return;
        }

        /*
        ==================================
        COUPLES WITH UNMET NEED
        No FP method at all (Type "No Method" or nothing recorded)
        ==================================
        */

        if (!method) row.unmet++;

    });

    monthNames.forEach(m => finalizeRecord(monthly[m]));

    return monthly;
}

/*
====================================================
                EXCEL IMPORT / TEMPLATE
====================================================
*/

// Reads plain text from an ExcelJS cell (handles rich text / formulas)
function cellToText(cell) {
    const v = cell.value;
    if (v == null) return "";
    if (typeof v === "object") {
        if (v.richText) return v.richText.map(t => t.text).join("");
        if ("result" in v) return String(v.result ?? "");
        if ("text" in v) return String(v.text ?? "");
    }
    return String(v);
}

// Reads a number from an ExcelJS cell (handles formula cells, blanks, "-")
function cellToNumber(cell) {
    let v = cell.value;
    if (v && typeof v === "object" && "result" in v) v = v.result;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

/*
    Parses a filled-in Form B workbook (same column layout as the template:
    A = month, B = couples with unmet need, C = clients referred / served,
    D = traditional FP without intention, E = traditional FP with intention,
    F = traditional FP referred, G/H = totals).

    Rows are found by the month name in column A, not by fixed row numbers,
    so older reports with a slightly different layout still import.
    The Grand Total row is skipped and columns G/H are recomputed by the app.

    Returns:
      monthly - a record for all 12 months
      months  - the months that actually have recorded data (calendar order).
                If the file has no data at all, falls back to the months found.
*/
async function parseFormBWorkbook(buffer) {

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.worksheets[0];

    if (!sheet) throw new Error("The file has no worksheet.");

    const monthly = createEmptyMonthly();

    let found = 0;
    const seen = new Set();

    sheet.eachRow(row => {

        const label = cellToText(row.getCell(1)).trim().toLowerCase();
        const month = monthNames.find(m => m.toLowerCase() === label);

        if (!month || seen.has(month)) return;

        seen.add(month);
        found++;

        const num = (col) => cellToNumber(row.getCell(col));
        const rec = monthly[month];

        rec.unmet = num(2);                  // B
        rec.referred = num(3);               // C
        rec.traditionalNoShift = num(4);     // D
        rec.traditionalShift = num(5);       // E
        rec.traditionalReferred = num(6);    // F
        rec.traditional = rec.traditionalNoShift + rec.traditionalShift;

        finalizeRecord(rec);

    });

    if (found === 0) {
        throw new Error(
            "No month rows (January to December) were found in column A. " +
            "Make sure this is a Form B workbook."
        );
    }

    // Months that were actually recorded in the file
    const withData = monthNames.filter(m => seen.has(m) && monthHasData(monthly[m]));
    const months = withData.length > 0
        ? withData
        : monthNames.filter(m => seen.has(m));

    return { monthly, months };
}

/*
    Loads the Excel template for a given year.
    Tries FormB_Template_<year>.xlsx first (for years whose form layout
    was different), then falls back to the generic FormB_Template.xlsx.
    When the year is "all", only the generic template is used.
*/
async function loadTemplateBuffer(year) {

    const candidates = [
        ...(year && year !== "all" ? [`/templates/FormB_Template_${year}.xlsx`] : []),
        "/templates/FormB_Template.xlsx",
    ];

    for (const url of candidates) {
        try {
            const res = await fetch(url);
            const type = res.headers.get("content-type") || "";

            // Dev servers (Vite / CRA) return index.html with status 200
            // for missing files, so res.ok alone is not enough.
            if (res.ok && !type.includes("text/html")) {
                return await res.arrayBuffer();
            }
        } catch {
            /* try next candidate */
        }
    }

    throw new Error("No Form B template found in /templates.");
}

/*
====================================================
                    COMPONENT
====================================================
*/

/*
    Props
    - clients:                 client records (already narrowed by the page's own filters)
    - year:                    the year chosen in the page's filter (number or numeric string),
                               or "all" for every year combined.
                               Falls back to the current year when not given.
    - period:                  the page's Period filter ("all" | "q1".."q4" | "january".."december").
                               Falls back to an internal period when not given.
    - onYearChange(year):      called after an import so the page's year filter jumps to it
    - onPeriodChange(period):  called after an import so the page's Period filter follows
                               the recorded months (a month, a quarter, or "all")
    - onImportedYearsChange(years): list of imported years, for the page's year options
    - onImportReport(year, monthly) / onRemoveImport(year): optional, to persist imports
*/
function FormBAnalytics({
    exportFilters,

    clients = [],

    error = "",

    year: yearProp,
    period: periodProp,
    onYearChange,
    onPeriodChange,
    onImportedYearsChange,
    onImportReport,
    onRemoveImport,

}) {

    // Year comes from the page's filter; internal fallback if none is passed.
    // "all" means every year is combined.
    const [internalYear, setInternalYear] = useState(new Date().getFullYear());
    const isAllYears = String(yearProp) === "all";
    const parentYear = Number(yearProp);
    const selectedYear = isAllYears
        ? "all"
        : Number.isInteger(parentYear) && parentYear > 0 ? parentYear : internalYear;
    const yearLabel = isAllYears ? "All Years" : selectedYear;

    // Period comes from the page's filter; internal fallback if none is passed
    const [internalPeriod, setInternalPeriod] = useState("all");
    const selectedPeriod = periodProp !== undefined ? periodProp : internalPeriod;

    // Months shown on screen (all 12, a quarter, or a single month)
    const activeMonths = periodToMonths(selectedPeriod);
    const isFiltered = activeMonths.length < 12;

    // Short-lived bottom alert shown after an import
    const [toast, setToast] = useState(null);

    // Imported (older) reports, keyed by year. Kept in localStorage so they
    // survive a refresh; also reported to the parent via onImportReport.
    const [importedReports, setImportedReports] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(IMPORT_STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    });

    // Export waiting for confirmation: "pdf" | "excel" | null
    const [exportFormat, setExportFormat] = useState(null);

    // Import flow: step 1 = "choose a file" modal, step 2 = "which year" modal
    const [showImport, setShowImport] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    const [importYear, setImportYear] = useState("");
    const [importError, setImportError] = useState("");
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        try {
            localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(importedReports));
        } catch {
            /* storage unavailable */
        }
    }, [importedReports]);

    // Hide the import alert after a few seconds
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, [toast]);

    // Tell the page which years exist as imported reports, so its filter can list them
    useEffect(() => {
        onImportedYearsChange?.(
            Object.keys(importedReports).map(Number).sort((x, y) => y - x)
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importedReports]);

    /*
        Analytics for the selected year and period.
        - A single year: if a report was imported for that year, it is used
          instead of the client records.
        - All years: every imported report, plus client records for each
          year that has no imported report, summed month by month.
        Totals follow the period filter.
    */
    const analytics = useMemo(() => {

        let monthly;

        if (isAllYears) {

            monthly = createEmptyMonthly();

            Object.values(importedReports).forEach(imported => {
                monthNames.forEach(m => addMonthRecord(monthly[m], imported[m]));
            });

            const fromClients = buildMonthlyFromClients(
                clients,
                y => !importedReports[y]
            );

            monthNames.forEach(m => addMonthRecord(monthly[m], fromClients[m]));

        } else {

            monthly =
                importedReports[selectedYear] ||
                buildMonthlyFromClients(clients, y => y === selectedYear);

        }

        const grand = sumMonths(monthly, activeMonths);

        return {

            monthly,

            unmetNeed: grand.unmet,

            referredServed: grand.referred,

            traditionalNoShift: grand.traditionalNoShift,

            traditionalShift: grand.traditionalShift,

            traditionalReferred: grand.traditionalReferred,

            traditionalUsers:
                grand.traditionalNoShift +
                grand.traditionalShift,

            totalUnmet: grand.totalUnmet,

            totalReferred: grand.totalReferred,

        };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clients, selectedYear, importedReports, selectedPeriod]);

    // Whole-year totals (used by the exports so the official form stays complete)
    const yearTotal = sumMonths(analytics.monthly, monthNames);

    const hasImported = Object.keys(importedReports).length > 0;

    /*
    ====================================================
                    PDF EXPORT
    ====================================================
    */

    // Default export file name (without extension); it can be changed in the confirmation
    const exportBaseName = `Official_Form_B_Report_${yearLabel}`;

    const exportPDF = async (fileName = `${exportBaseName}.pdf`) => {

        const logos = await loadReportLogos();

        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4",
        });

        drawReportHeader(doc, `FORM B (CY ${yearLabel})`, logos);

        // Same columns as the on-screen Official Form B Report
        const toCells = (row) => [
            row.unmet,
            row.referred,
            row.traditionalNoShift,
            row.traditionalShift,
            row.traditionalReferred,
            row.totalUnmet,
            row.totalReferred,
        ];

        const body = monthNames.map(month => [month, ...toCells(analytics.monthly[month])]);
        const rowKinds = monthNames.map(() => "month");

        body.push(["GRAND TOTAL", ...toCells(yearTotal)]);
        rowKinds.push("total");

        const span = (content, rowSpan, colSpan = 1) => ({ content, rowSpan, colSpan });

        autoTable(doc, {

            ...reportTableOptions(rowKinds, { fontSize: 8, cellPadding: 1.5, firstColumnWidth: 35 }),

            head: [
                [
                    span("Month", 2),
                    span("No. of couples with unmet need\nfor Modern FP", 2),
                    span("No. of Clients with unmet need\nfor Modern FP referred / served", 2),
                    span("No. of couples who are currently\nusing Traditional FP", 1, 2),
                    span("No. of Clients currently using\nTraditional FP referred / served", 2),
                    span("Total No. of\nUnmet Need", 2),
                    span("Total No. of Clients\nreferred / served", 2),
                ],
                [
                    "Without intention\nto shift",
                    "With intention\nto shift",
                ],
            ],

            body,

        });

        drawSignatories(doc);

        doc.save(fileName);
    };

    /*
    ====================================================
                EXCEL TEMPLATE EXPORT
    ====================================================
    */

    const exportOfficialExcel = async (fileName = `${exportBaseName}.xlsx`) => {

        try {

            const buffer = await loadTemplateBuffer(selectedYear);

            const workbook = new ExcelJS.Workbook();

            await workbook.xlsx.load(buffer);

            const sheet = workbook.worksheets[0];

            tidyReportHeader(sheet);

            // Writes one label + the 7 data values (columns B to H)
            const writeRow = (rowNumber, label, record) => {

                sheet.getCell(`A${rowNumber}`).value = label;

                sheet.getCell(`B${rowNumber}`).value = record.unmet;
                sheet.getCell(`C${rowNumber}`).value = record.referred;
                sheet.getCell(`D${rowNumber}`).value = record.traditionalNoShift;
                sheet.getCell(`E${rowNumber}`).value = record.traditionalShift;
                sheet.getCell(`F${rowNumber}`).value = record.traditionalReferred;
                sheet.getCell(`G${rowNumber}`).value = record.totalUnmet;
                sheet.getCell(`H${rowNumber}`).value = record.totalReferred;

            };

            let currentRow = TEMPLATE_FIRST_ROW;

            monthNames.forEach(month => {
                writeRow(currentRow++, month, analytics.monthly[month]);
            });

            writeRow(TEMPLATE_GRAND_ROW, "GRAND TOTAL", yearTotal);

            const excelBuffer =
                await workbook.xlsx.writeBuffer();

            saveAs(
                new Blob([excelBuffer]),
                fileName
            );

        }
        catch (error) {

            console.error(error);

            notify("Failed to export Form B.");

        }

    };

    /*
    ====================================================
                    IMPORT REPORT
    ====================================================
    */

    // Step 1: person picks a file -> we ask for the report year
    // Step 1 -> Step 2: a valid .xlsx was picked (or dropped); ask for the report year
    const acceptFile = (file) => {

        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".xlsx")) {
            setImportError("Please choose an .xlsx file.");
            return;
        }

        setImportError("");
        setImportYear("");   // no default, so the year is always chosen deliberately
        setPendingFile(file);
        setShowImport(false);

    };

    // File explorer result
    const handleFileChosen = (e) => {

        const file = e.target.files?.[0];

        e.target.value = "";   // lets the same file be picked again later

        acceptFile(file);

    };

    // Drag and drop result
    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        acceptFile(e.dataTransfer.files?.[0]);
    };

    const openPicker = () => {
        setImportError("");
        setShowImport(true);
    };

    const closePicker = () => {
        setShowImport(false);
        setImportError("");
        setDragOver(false);
    };

    const closeImportModal = () => {
        if (importing) return;
        setPendingFile(null);
        setImportError("");
    };

    // Step 2: year confirmed -> parse, save, and move the year + period filters
    const confirmImport = async () => {

        const year = Number(importYear);
        const maxYear = new Date().getFullYear() + 1;

        if (!Number.isInteger(year) || year < 2000 || year > maxYear) {
            setImportError(`Enter a valid year between 2000 and ${maxYear}.`);
            return;
        }

        const hasClientData = clients.some(c =>
            getClientDate(c)?.getFullYear() === year
        );

        if (importedReports[year] || hasClientData) {

            const ok = window.confirm(
                `${year} already has data. The imported report will be shown ` +
                `for ${year} instead (your client records are not deleted). Continue?`
            );

            if (!ok) return;

        }

        try {

            setImporting(true);
            setImportError("");

            const buffer = await pendingFile.arrayBuffer();
            const { monthly, months } = await parseFormBWorkbook(buffer);

            setImportedReports(prev => ({ ...prev, [year]: monthly }));

            onImportReport?.(year, monthly);          // optional: save to Firestore etc.

            // Year filter -> the imported year
            setInternalYear(year);
            onYearChange?.(year);

            // Period filter -> the recorded month, or the quarter that holds
            // the recorded months, otherwise the whole year
            const periodToShow = monthsToPeriod(months);
            setInternalPeriod(periodToShow);
            onPeriodChange?.(periodToShow);

            const recorded =
                months.length === 12 ? "January to December"
                : months.length <= 3 ? months.join(", ")
                : `${months[0]} to ${months[months.length - 1]}`;

            setToast({ id: Date.now(), text: `Imported ${year} report (${recorded})` });

            setPendingFile(null);

        } catch (error) {

            console.error(error);
            setImportError(error.message || "Could not read this file.");

        } finally {

            setImporting(false);

        }

    };

    const removeImportedReport = () => {

        if (!window.confirm(
            `Remove the imported report for ${selectedYear}? ` +
            `The page will go back to using client records for that year.`
        )) return;

        setImportedReports(prev => {
            const { [selectedYear]: _removed, ...rest } = prev;
            return rest;
        });

        onRemoveImport?.(selectedYear);

    };

    /*
    ====================================================
                        RENDER
    ====================================================
    */

    return (

        <div className="form-b-container">

            {/* TOP BAR: status on the left, Import on the right */}

            <div className="form-b-topbar"
            style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                }}>

                <div className="form-b-topbar-status">

                    {error && !hasImported ? error : ""}

                </div>

            </div>

            {/* ==========================
            KPI CARDS
        ========================== */}

            <div className="form-b-cards">

                <div className="fb-card green">

                    <small>
                        Couples with Unmet Need
                    </small>

                    <h2>
                        {analytics.unmetNeed}
                    </h2>

                </div>

                <div className="fb-card orange">

                    <small>
                        Traditional FP Users
                    </small>

                    <h2>
                        {analytics.traditionalUsers}
                    </h2>

                </div>

                <div className="fb-card blue">

                    <small>
                        Clients Referred / Served
                    </small>

                    <h2>
                        {analytics.referredServed}
                    </h2>

                </div>

                <div className="fb-card red">

                    <small>
                        Total Unmet Need
                    </small>

                    <h2>
                        {analytics.totalUnmet}
                    </h2>

                </div>

            </div>


            {/* ==========================
            SUMMARY GRID
        ========================== */}

            <div className="summary-grid">

                <div className="summary-panel">

                    <h3>
                        Unmet Need Breakdown
                    </h3>

                    <div className="summary-row">
                        <span>Couples with Unmet Need</span>
                        <strong>{analytics.unmetNeed}</strong>
                    </div>

                    <div className="summary-row">
                        <span>Clients Referred / Served</span>
                        <strong>{analytics.referredServed}</strong>
                    </div>

                </div>

                <div className="summary-panel">

                    <h3>
                        Traditional FP Summary
                    </h3>

                    <div className="summary-row">
                        <span>Without Intention to Shift</span>
                        <strong>{analytics.traditionalNoShift}</strong>
                    </div>

                    <div className="summary-row">
                        <span>With Intention to Shift</span>
                        <strong>{analytics.traditionalShift}</strong>
                    </div>

                    <div className="summary-row">
                        <span>Traditional FP Users</span>
                        <strong>{analytics.traditionalUsers}</strong>
                    </div>

                    <div className="summary-row">
                        <span>Traditional FP Referred</span>
                        <strong>{analytics.traditionalReferred}</strong>
                    </div>

                </div>

                <div className="summary-panel">

                    <h3>
                        Overall Summary
                    </h3>

                    <div className="summary-row">
                        <span>Total Unmet Need</span>
                        <strong>{analytics.totalUnmet}</strong>
                    </div>

                    <div className="summary-row">
                        <span>Total Clients Referred</span>
                        <strong>{analytics.totalReferred}</strong>
                    </div>

                </div>

            </div>


            {/* ==========================
            MONTHLY SUMMARY
        ========================== */}

            <div className="monthly-summary">

                <h3>
                    Monthly Summary ({periodLabel(selectedPeriod) ? `${periodLabel(selectedPeriod)} ` : ""}{yearLabel})
                </h3>

                {/* Summary only: the full breakdown is in the official report below */}
                <table className="monthly-summary-table">

                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Unmet Need</th>
                            <th>Traditional FP Users</th>
                            <th>Total Unmet Need</th>
                            <th>Total Referred / Served</th>
                        </tr>
                    </thead>

                    <tbody>
                        {activeMonths.map(month => {

                            const row = analytics.monthly[month];

                            return (
                                <tr key={month}>
                                    <td>{month}</td>
                                    <td>{row.unmet}</td>
                                    <td>{row.traditionalNoShift + row.traditionalShift}</td>
                                    <td>{row.totalUnmet}</td>
                                    <td>{row.totalReferred}</td>
                                </tr>
                            );

                        })}
                    </tbody>

                    <tfoot>
                        <tr>
                            <th>TOTAL</th>
                            <th>{analytics.unmetNeed}</th>
                            <th>{analytics.traditionalUsers}</th>
                            <th>{analytics.totalUnmet}</th>
                            <th>{analytics.totalReferred}</th>
                        </tr>
                    </tfoot>

                </table>

            </div>


            {/* ================================
    OFFICIAL FORM B REPORT
================================ */}

            <div className="official-report">

                <div className="official-header">

                    <div>

                        <h2>

                            Official Form B Report - CY {yearLabel}

                        </h2>

                        <p>

                            Responsible Parenthood and Family Planning

                        </p>

                    </div>

                    <div className="report-buttons">

                        <button type="button" className="import-btn" onClick={openPicker}>
                            Import
                        </button>


                        <button
                            className="pdf-btn"
                            onClick={() => setExportFormat("pdf")}
                        >
                            Export PDF
                        </button>

                        <button
                            className="excel-btn"
                            onClick={() => setExportFormat("excel")}
                        >
                            Export Excel
                        </button>

                    </div>

                </div>

                <div className="official-table-wrapper">

                    <table className="official-table">

                        <thead>

                            <tr>

                                <th rowSpan="2" id="month-header">

                                    Month

                                </th>

                                <th rowSpan="2">

                                    No. of couples with unmet need
                                    <br />
                                    for Modern FP

                                </th>

                                <th rowSpan="2">

                                    No. of Clients with unmet need
                                    <br />
                                    for Modern FP referred / served

                                </th>

                                <th colSpan="2">

                                    No. of couples who are currently
                                    <br />
                                    using Traditional FP

                                </th>

                                <th rowSpan="2">

                                    No. of Clients currently using
                                    <br />
                                    Traditional FP referred / served

                                </th>

                                <th rowSpan="2">

                                    Total No. of
                                    <br />
                                    Unmet Need

                                </th>

                                <th rowSpan="2">

                                    Total No. of Clients
                                    <br />
                                    referred / served

                                </th>

                            </tr>

                            <tr>

                                <th>

                                    Without intention
                                    <br />
                                    to shift

                                </th>

                                <th>

                                    With intention
                                    <br />
                                    to shift

                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {

                                activeMonths.map((month) => {

                                    const row = analytics.monthly[month];

                                    return (

                                        <tr key={month}>

                                            <td>{month}</td>

                                            <td>{row.unmet}</td>

                                            <td>{row.referred}</td>

                                            <td>{row.traditionalNoShift}</td>

                                            <td>{row.traditionalShift}</td>

                                            <td>{row.traditionalReferred}</td>

                                            <td>{row.totalUnmet}</td>

                                            <td>{row.totalReferred}</td>

                                        </tr>

                                    );

                                })

                            }

                        </tbody>

                        <tfoot>

                            <tr>

                                <th className="grand-total-title">

                                    {isFiltered ? "TOTAL" : "GRAND TOTAL"}

                                </th>

                                <th>{analytics.unmetNeed}</th>

                                <th>{analytics.referredServed}</th>

                                <th>{analytics.traditionalNoShift}</th>

                                <th>{analytics.traditionalShift}</th>

                                <th>{analytics.traditionalReferred}</th>

                                <th>{analytics.totalUnmet}</th>

                                <th>{analytics.totalReferred}</th>

                            </tr>

                        </tfoot>

                    </table>

                </div>

            </div>

            {/* IMPORT: hidden file picker + year prompt */}

            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                style={{ display: "none" }}
                onChange={handleFileChosen}
            />

            {/* EXPORT: confirm what will be exported */}

            {exportFormat && (
                <ExportConfirmModal
                    format={exportFormat}
                    reportName="Form B"
                    filters={exportFilters}
                    defaultFileName={exportBaseName}
                    imported={isAllYears ? Object.keys(importedReports).length > 0 : !!importedReports[selectedYear]}
                    onCancel={() => setExportFormat(null)}
                    onConfirm={(fileName) => {
                        const run = exportFormat === "pdf" ? exportPDF : exportOfficialExcel;
                        setExportFormat(null);
                        run(fileName);
                    }}
                />
            )}

            {/* IMPORT STEP 1: choose a file */}

            {showImport && !pendingFile && (
                <div className="import-modal-backdrop" onClick={closePicker}>

                    <div
                        className="import-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="import-pick-title-b"
                        onClick={e => e.stopPropagation()}
                    >

                        <h3 id="import-pick-title-b">Import Form B report</h3>

                        <p className="import-hint">
                            Upload the filled-in Form B Excel file (.xlsx).
                        </p>

                        <div
                            className={`import-dropzone${dragOver ? " is-over" : ""}`}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                        >
                            <strong>Drag and drop your file here</strong>
                            <span>or</span>
                            <button
                                type="button"
                                className="excel-btn"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Choose file
                            </button>
                        </div>

                        {importError && (
                            <p className="import-error" role="alert">{importError}</p>
                        )}

                        <div className="import-modal-actions">
                            <button type="button" onClick={closePicker}>
                                Cancel
                            </button>
                        </div>

                    </div>

                </div>
            )}

            {/* IMPORT STEP 2: which year is this report for */}

            {pendingFile && (
                <div className="import-modal-backdrop" onClick={closeImportModal}>

                    <div
                        className="import-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="import-title-b"
                        onClick={e => e.stopPropagation()}
                    >

                        <h3 id="import-title-b">Import Form B report</h3>

                        <p className="import-file">{pendingFile.name}</p>

                        <label htmlFor="import-year-b">
                            Which year is this report for?
                        </label>

                        <input
                            id="import-year-b"
                            type="number"
                            min="2000"
                            max={new Date().getFullYear() + 1}
                            value={importYear}
                            autoFocus
                            onChange={e => setImportYear(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") confirmImport(); }}
                        />

                        {importError && (
                            <p className="import-error" role="alert">{importError}</p>
                        )}

                        <div className="import-modal-actions">

                            <button
                                type="button"
                                onClick={closeImportModal}
                                disabled={importing}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="excel-btn"
                                onClick={confirmImport}
                                disabled={importing}
                            >
                                {importing ? "Importing..." : "Import"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {/* IMPORT ALERT: bottom of the screen, disappears by itself */}

            {toast && (
                <div className="import-toast" role="status" aria-live="polite">
                    {toast.text}
                </div>
            )}

        </div>

    );

}

export default FormBAnalytics;