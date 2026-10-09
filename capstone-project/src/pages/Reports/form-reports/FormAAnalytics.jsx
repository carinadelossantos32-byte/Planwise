import { notify } from "../../../utils/notify";
import { useMemo, useState, useEffect, useRef, Fragment } from "react";
import "./FormAAnalytics.css";

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
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const categories = [
    "4Ps",
    "Non-4Ps",
    "USAPAN",
    "PMOC",
    "House to House",
    "Profiled Only",
    "Others",
];

// Quarter-end month -> months included in the sub-total
const quarterMonths = {
    March: ["January", "February", "March"],
    June: ["April", "May", "June"],
    September: ["July", "August", "September"],
    December: ["October", "November", "December"],
};

// Excel template layout (row where JANUARY starts).
// Change this if your template layout differs.
const TEMPLATE_FIRST_ROW = 14;

const createCategoryObject = () => ({
    "4Ps": 0,
    "Non-4Ps": 0,
    "USAPAN": 0,
    "PMOC": 0,
    "House to House": 0,
    "Profiled Only": 0,
    "Others": 0,
});

const sumValues = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);


function classifyClass(value) {

    const text = (value || "").toLowerCase().trim();

    if (text.includes("4ps") && !text.includes("non")) return "4Ps";
    if (text.includes("non")) return "Non-4Ps";
    if (text.includes("usapan")) return "USAPAN";
    if (text.includes("pmoc")) return "PMOC";
    if (text.includes("house")) return "House to House";
    if (text.includes("profile")) return "Profiled Only";

    return "Others";
}

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



const createMonthRecord = (month) => ({
    month,
    classesHeld: createCategoryObject(),
    individualsReached: createCategoryObject(),
    classes: 0,
    reached: 0,
    target: 0,
    participants: 0,
    maleSolo: 0,
    femaleSolo: 0,
    totalSolo: 0,
    coupleAttendees: 0,
});

// A record for every month, all zeros
const createEmptyMonthly = () => {
    const monthly = {};
    monthNames.forEach(m => { monthly[m] = createMonthRecord(m); });
    return monthly;
};

// Adds one month record (src) into another (target)
function addMonthRecord(target, src) {

    categories.forEach(cat => {
        target.classesHeld[cat] += src.classesHeld[cat];
        target.individualsReached[cat] += src.individualsReached[cat];
    });

    [
        "classes", "reached", "target", "participants",
        "maleSolo", "femaleSolo", "totalSolo", "coupleAttendees",
    ].forEach(key => {
        target[key] += src[key];
    });
}

/*
    Builds the monthly records from client data.
    includeYear(year) decides which years are counted.
*/
function buildMonthlyFromClients(clients, includeYear) {

    const monthly = createEmptyMonthly();

    clients.forEach(client => {

        // Form A is about the RPFP classes, which only the couple (public)
        // records come from. Private-institution and referred clients did
        // not attend a class, so they are not counted here.
        if (client.sourceCollection && client.sourceCollection !== "clients_public") return;

        const date = getClientDate(client);

        if (!date || !includeYear(date.getFullYear())) return;

        const row = monthly[monthNames[date.getMonth()]];

        const category = classifyClass(client.classes_held);

        row.classesHeld[category]++;
        row.classes++;

        const hasMale = !!client.name && client.name.trim() !== "";
        const hasFemale = !!client.spouse_name && client.spouse_name.trim() !== "";

        // TARGET COUPLES
        if (hasMale && hasFemale) {
            row.target++;
            row.coupleAttendees++;
        }

        // INDIVIDUALS REACHED
        [hasMale, hasFemale].forEach(present => {
            if (!present) return;

            row.individualsReached[category]++;
            row.reached++;
            row.participants++;
        });

        // SOLO ATTENDEES
        if (hasMale && !hasFemale) row.maleSolo++;
        if (hasFemale && !hasMale) row.femaleSolo++;

        row.totalSolo = row.maleSolo + row.femaleSolo;

    });

    return monthly;
}

/*
    Adds up several month records (used for quarter sub-totals
    and the grand total) so every total is computed the same way.
*/
function sumMonths(monthly, months) {

    const total = {
        classesHeld: createCategoryObject(),
        individualsReached: createCategoryObject(),
        classes: 0,
        target: 0,
        reached: 0,
        maleSolo: 0,
        femaleSolo: 0,
        totalSolo: 0,
        coupleAttendees: 0,
    };

    months.forEach(m => {

        const data = monthly[m];

        categories.forEach(cat => {
            total.classesHeld[cat] += data.classesHeld[cat];
            total.individualsReached[cat] += data.individualsReached[cat];
        });

        total.classes += data.classes;
        total.target += data.target;
        total.reached += data.reached;
        total.maleSolo += data.maleSolo;
        total.femaleSolo += data.femaleSolo;
        total.totalSolo += data.totalSolo;
        total.coupleAttendees += data.coupleAttendees;

    });

    return total;
}

/*
    Turns a month / sub-total / grand-total record into the 21 values
    that fill columns B to V of Form A (in order).
*/
function rowToValues(r) {
    return [
        ...categories.map(cat => r.classesHeld[cat]),       // B - H
        r.classes,                                           // I
        r.target,                                            // J
        ...categories.map(cat => r.individualsReached[cat]), // K - Q
        r.reached,                                           // R
        r.maleSolo,                                          // S
        r.femaleSolo,                                        // T
        r.totalSolo,                                         // U
        r.coupleAttendees,                                   // V
    ];
}

/*
    Loads the Excel template for a given year.
    Tries FormA_Template_<year>.xlsx first (for years whose form layout
    was different), then falls back to the generic FormA_Template.xlsx.
    When the year is "all", only the generic template is used.
*/
async function loadTemplateBuffer(year) {

    const candidates = [
        ...(year && year !== "all" ? [`/templates/FormA_Template_${year}.xlsx`] : []),
        "/templates/FormA_Template.xlsx",
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

    throw new Error("No Form A template found in /templates.");
}

const IMPORT_STORAGE_KEY = "formA_imported_reports";

// True when a month record has any recorded value
const monthHasData = (rec) =>
    rec.classes > 0 ||
    rec.reached > 0 ||
    rec.target > 0 ||
    rec.totalSolo > 0 ||
    rec.coupleAttendees > 0;

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
    Parses a filled-in Form A workbook (same column layout as the template:
    A = month, B-H classes, I total, J target, K-Q reached, R total,
    S/T solo male/female, U total solo, V couples).

    Rows are found by the month name in column A, not by fixed row numbers,
    so older reports with a slightly different layout still import.
    Sub-total and Grand Total rows are skipped; the app recomputes them.

    Returns:
      monthly - a record for all 12 months
      months  - the months that actually have recorded data (calendar order).
                If the file has no data at all, falls back to the months found.
*/
async function parseFormAWorkbook(buffer) {

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

        categories.forEach((cat, i) => {
            rec.classesHeld[cat] = num(2 + i);          // B - H
            rec.individualsReached[cat] = num(11 + i);  // K - Q
        });

        rec.classes = sumValues(rec.classesHeld);
        rec.reached = sumValues(rec.individualsReached);
        rec.participants = rec.reached;
        rec.target = num(10);                            // J
        rec.maleSolo = num(19);                          // S
        rec.femaleSolo = num(20);                        // T
        rec.totalSolo = rec.maleSolo + rec.femaleSolo;
        rec.coupleAttendees = num(22);                   // V

    });

    if (found === 0) {
        throw new Error(
            "No month rows (January to December) were found in column A. " +
            "Make sure this is a Form A workbook."
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
    Small reusable progress panel (Classes Conducted / Individuals Reached)
*/
function ProgressPanel({ title, counts, fillClass = "" }) {

    const max = Math.max(...Object.values(counts), 1);

    return (
        <div className="summary-panel">

            <div className="panel-title">
                <h3>{title}</h3>
                <strong>{sumValues(counts)}</strong>
            </div>

            {categories.map(category => (
                <div className="progress-row" key={category}>

                    <span>{category}</span>

                    <div className="progress">
                        <div
                            className={`progress-fill ${fillClass}`.trim()}
                            style={{ width: `${(counts[category] / max) * 100}%` }}
                        />
                    </div>

                    <strong>{counts[category]}</strong>

                </div>
            ))}

        </div>
    );
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
function FormAAnalytics({
    exportFilters,
    clients = [],
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
        Analytics for the selected year and month.
        - A single year: if a report was imported for that year, it is used
          instead of the client records.
        - All years: every imported report, plus client records for each
          year that has no imported report, summed month by month.
        Totals follow the month filter.
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
            overallClasses: grand.classesHeld,
            overallReached: grand.individualsReached,
            totalParticipants: grand.reached,
            maleSolo: grand.maleSolo,
            femaleSolo: grand.femaleSolo,
            totalSolo: grand.totalSolo,
            coupleAttendees: grand.coupleAttendees,
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clients, selectedYear, importedReports, selectedPeriod]);

    const monthlySummary = activeMonths.map(month => analytics.monthly[month]);
    const categoryCounts = analytics.overallClasses;
    const reachedCounts = analytics.overallReached;
    const { totalParticipants, maleSolo, femaleSolo, totalSolo, coupleAttendees } = analytics;

    // Display totals (respect the month filter)
    const grandTotal = sumMonths(analytics.monthly, activeMonths);

    // Whole-year totals (used by the exports so the official form stays complete)
    const yearTotal = sumMonths(analytics.monthly, monthNames);

    /*
    ====================================================
                    PDF EXPORT
    ====================================================
    */

    // Default export file name (without extension); it can be changed in the confirmation
    const exportBaseName = `Official_Form_A_Report_${yearLabel}`;

    const exportPDF = async (fileName = `${exportBaseName}.pdf`) => {

        const logos = await loadReportLogos();

        const doc = new jsPDF("landscape", "mm", "a4");

        drawReportHeader(
            doc,
            `FORM A - Family Planning Classes and Individuals Reached (CY ${yearLabel})`,
            logos
        );

        // Same table as the on-screen Official Form A Report:
        // grouped three-row header, tinted sub-totals, navy grand total
        const toCells = (record) => rowToValues(record);

        const body = [];
        const rowKinds = [];

        monthNames.forEach(month => {

            body.push([month, ...toCells(analytics.monthly[month])]);
            rowKinds.push("month");

            if (quarterMonths[month]) {
                body.push([
                    "Sub-total",
                    ...toCells(sumMonths(analytics.monthly, quarterMonths[month])),
                ]);
                rowKinds.push("subtotal");
            }

        });

        body.push(["Grand Total", ...toCells(yearTotal)]);
        rowKinds.push("total");

        const span = (content, rowSpan, colSpan = 1) => ({ content, rowSpan, colSpan });

        autoTable(doc, {

            ...reportTableOptions(rowKinds, { fontSize: 6, cellPadding: 1.4 }),

            head: [
                [
                    span("Month", 3),
                    span("No. of Classes Held", 1, 7),
                    span("TOTAL", 3),
                    span("No. of Target Couples", 3),
                    span("No. of Individuals Reached", 1, 7),
                    span("TOTAL", 3),
                    span("Solo / Couple", 1, 4),
                ],
                [
                    ...categories.map(cat => span(cat, 2)),
                    ...categories.map(cat => span(cat, 2)),
                    span("Solo", 1, 2),
                    span("TOTAL SOLO", 2),
                    span("TOTAL COUPLE", 2),
                ],
                ["Male", "Female"],
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

            // Stamp the year into the header (template has "FORM A" in A9)
            sheet.getCell("A9").value = `FORM A - CY ${yearLabel}`;
            tidyReportHeader(sheet);

            // Writes one label + the 21 data values (columns B to V)
            const writeRow = (rowNumber, label, record) => {

                sheet.getCell(rowNumber, 1).value = label;

                rowToValues(record).forEach((value, i) => {
                    sheet.getCell(rowNumber, i + 2).value = value;
                });

            };

            let currentRow = TEMPLATE_FIRST_ROW;

            monthNames.forEach(month => {

                writeRow(currentRow++, month, analytics.monthly[month]);

                if (quarterMonths[month]) {
                    writeRow(
                        currentRow++,
                        "Sub-total",
                        sumMonths(analytics.monthly, quarterMonths[month])
                    );
                }

            });

            // Grand total goes on the row right after December's sub-total
            writeRow(currentRow, "Grand Total", yearTotal);

            const excelBuffer = await workbook.xlsx.writeBuffer();

            saveAs(
                new Blob([excelBuffer]),
                fileName
            );

        } catch (error) {

            console.error(error);
            notify("Failed to export Form A.");

        }

    };

    /*
    ====================================================
                    IMPORT REPORT
    ====================================================
    */

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

    // Step 2: year confirmed -> parse, save, and move the year + month filters
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
            const { monthly, months } = await parseFormAWorkbook(buffer);

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

    // Kept for pages that want a "remove imported report" control
    // eslint-disable-next-line no-unused-vars
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

    // Renders the 21 data cells of a row as <td> or <th>
    const renderCells = (record, Tag, keyPrefix) =>
        rowToValues(record).map((value, i) => (
            <Tag key={`${keyPrefix}-${i}`}>{value}</Tag>
        ));

    /*
    ====================================================
                        RENDER
    ====================================================
    */

    return (

        <div className="form-a-container">

            {/* KPI CARDS */}

            <div className="form-a-cards">

                <div className="fa-card blue">
                    <small>Total Classes Held</small>
                    <h2>{sumValues(categoryCounts)}</h2>
                </div>

                <div className="fa-card green">
                    <small>Individuals Reached</small>
                    <h2>{totalParticipants}</h2>
                </div>

                <div className="fa-card purple">
                    <small>Target Couples</small>
                    <h2>{coupleAttendees}</h2>
                </div>

            </div>

            {/* SUMMARY GRID */}

            <div className="summary-grid">

                <ProgressPanel
                    title="Classes Conducted"
                    counts={categoryCounts}
                />

                <ProgressPanel
                    title="Individuals Reached"
                    counts={reachedCounts}
                    fillClass="green"
                />

            </div>

            {/* ATTENDANCE SUMMARY */}

            <div className="solo-couple-summary">

                <h3>Attendance Summary</h3>

                <div className="attendance-summary">

                    <div>
                        <small>Male Solo</small>
                        <h2>{maleSolo}</h2>
                    </div>

                    <div>
                        <small>Female Solo</small>
                        <h2>{femaleSolo}</h2>
                    </div>

                    <div>
                        <small>Total Solo</small>
                        <h2>{totalSolo}</h2>
                    </div>

                    <div>
                        <small>Couple Attendees</small>
                        <h2>{coupleAttendees}</h2>
                    </div>

                </div>

            </div>

            {/* MONTHLY SUMMARY */}

            <div className="monthly-summary">

                <h3>
                    Monthly Summary ({periodLabel(selectedPeriod) ? `${periodLabel(selectedPeriod)} ` : ""}{yearLabel})
                </h3>

                <table className="monthly-summary-table">

                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Classes Held</th>
                            <th>Target Couples</th>
                            <th>Individuals Reached</th>
                            <th>Male Solo</th>
                            <th>Female Solo</th>
                            <th>Total Solo</th>
                            <th>Total Couple Attendees</th>
                        </tr>
                    </thead>

                    <tbody>
                        {monthlySummary.map(row => (
                            <tr key={row.month}>
                                <td>{row.month}</td>
                                <td>{row.classes}</td>
                                <td>{row.target}</td>
                                <td>{row.reached}</td>
                                <td>{row.maleSolo}</td>
                                <td>{row.femaleSolo}</td>
                                <td>{row.totalSolo}</td>
                                <td>{row.coupleAttendees}</td>
                            </tr>
                        ))}
                    </tbody>

                    <tfoot>
                        <tr>
                            <th>TOTAL</th>
                            <th>{grandTotal.classes}</th>
                            <th>{grandTotal.target}</th>
                            <th>{grandTotal.reached}</th>
                            <th>{grandTotal.maleSolo}</th>
                            <th>{grandTotal.femaleSolo}</th>
                            <th>{grandTotal.totalSolo}</th>
                            <th>{grandTotal.coupleAttendees}</th>
                        </tr>
                    </tfoot>

                </table>

            </div>

            {/* OFFICIAL FORM A REPORT */}

            <div className="official-report">

                <div className="official-header">

                    <div>
                        <h2>Official Form A Report - CY {yearLabel}</h2>
                        <p>Family Planning Classes and Individuals Reached</p>
                    </div>

                    <div className="report-buttons">

                        <button
                            type="button"
                            className="import-btn"
                            onClick={openPicker}
                        >
                            Import
                        </button>

                        <button className="pdf-btn" onClick={() => setExportFormat("pdf")}>
                            Export PDF
                        </button>

                        <button className="excel-btn" onClick={() => setExportFormat("excel")}>
                            Export Excel
                        </button>

                    </div>

                </div>

                <div className="official-table-wrapper">

                    <table className="official-table">

                        <thead>

                            <tr>
                                <th rowSpan="3" style={{ width: "180px" }}>Month</th>
                                <th colSpan="7">No. of Classes Held</th>
                                <th rowSpan="3">TOTAL</th>
                                <th rowSpan="3">No. of Target Couples</th>
                                <th colSpan="7">No. of Individuals Reached</th>
                                <th rowSpan="3">TOTAL</th>
                                <th colSpan="4">Solo / Couple</th>
                            </tr>

                            <tr>
                                {categories.map(cat => (
                                    <th key={cat} rowSpan="2">{cat}</th>
                                ))}

                                {categories.map(cat => (
                                    <th key={"r" + cat} rowSpan="2">{cat}</th>
                                ))}

                                <th colSpan="2">Solo</th>
                                <th rowSpan="2">TOTAL SOLO</th>
                                <th rowSpan="2">TOTAL COUPLE</th>
                            </tr>

                            <tr>
                                <th>Male</th>
                                <th>Female</th>
                            </tr>

                        </thead>

                        <tbody>

                            {activeMonths.map(month => (

                                <Fragment key={month}>

                                    {/* MONTH ROW */}
                                    <tr>
                                        <td>{month}</td>
                                        {renderCells(analytics.monthly[month], "td", month)}
                                    </tr>

                                    {/* QUARTER SUBTOTAL (only when every month is shown) */}
                                    {quarterMonths[month] &&
                                        quarterMonths[month].every(m => activeMonths.includes(m)) && (
                                            <tr className="quarter-subtotal">
                                                <th>Sub-total</th>
                                                {renderCells(
                                                    sumMonths(analytics.monthly, quarterMonths[month]),
                                                    "th",
                                                    `sub-${month}`
                                                )}
                                            </tr>
                                        )}

                                </Fragment>

                            ))}

                        </tbody>

                        <tfoot>
                            <tr>
                                <th className="grand-total-title">
                                    {isFiltered ? "Total" : "Grand Total"}
                                </th>
                                {renderCells(grandTotal, "th", "grand")}
                            </tr>
                        </tfoot>

                    </table>

                </div>

            </div>

            {/* IMPORT: hidden file input (opened by the "Choose file" button) */}

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
                    reportName="Form A"
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
                        aria-labelledby="import-pick-title"
                        onClick={e => e.stopPropagation()}
                    >

                        <h3 id="import-pick-title">Import Form A report</h3>

                        <p className="import-hint">
                            Upload the filled-in Form A Excel file (.xlsx).
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
                        aria-labelledby="import-title"
                        onClick={e => e.stopPropagation()}
                    >

                        <h3 id="import-title">Import Form A report</h3>

                        <p className="import-file">{pendingFile.name}</p>

                        <label htmlFor="import-year">
                            Which year is this report for?
                        </label>

                        <input
                            id="import-year"
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

export default FormAAnalytics;