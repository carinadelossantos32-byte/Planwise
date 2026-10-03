import "../report-forms.css";
import MethodBadges from "../MethodBadges";
import { useMemo, useState, useEffect, useRef } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getClientDate, canonicalMethod } from "../reportData";
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

const methods = [
    "Condom", "IUD", "Pills", "Injectable", "NSV", "BTL",
    "Implant", "CCM", "BBT", "STM", "SDM", "LAM",
];

const naturalMethods = ["CCM", "BBT", "STM", "SDM", "LAM"];
const shortMethods = ["Pills", "Condom", "Injectable"];
const longMethods = [
    { label: "IUD", key: "IUD" },
    { label: "Implant", key: "Implant" },
    { label: "Vasectomy", key: "NSV" },
    { label: "Tubal Ligation", key: "BTL" },
];

// Excel template layout: JANUARY starts on row 13, Grand Total on row 25.
// Change these if your template layout differs.
const TEMPLATE_FIRST_ROW = 13;
const TEMPLATE_GRAND_ROW = 25;

const IMPORT_STORAGE_KEY = "modernShifters_imported_reports";

// This report's column names for the shared method names
const reportKeys = { Vasectomy: "NSV", "Tubal Ligation": "BTL", CMM: "CCM" };

// Any spelling of a modern FP method -> this report's column name ("" if not one)
function normalizeMethod(value) {
    const name = canonicalMethod(value);
    return reportKeys[name] || name;
}


function displayMethod(method) {
    switch (method) {
        case "NSV": return "Vasectomy";
        case "BTL": return "Tubal Ligation";
        default: return method;
    }
}

/*
====================================================
                    RECORD HELPERS
====================================================
*/

const createCounts = () =>
    Object.fromEntries(methods.map(m => [m, 0]));

const createMonthRecord = (month) => ({
    month,
    counts: createCounts(),
    total: 0,
});

const createEmptyMonthly = () => {
    const monthly = {};
    monthNames.forEach(m => { monthly[m] = createMonthRecord(m); });
    return monthly;
};

function addMonthRecord(target, src) {
    if (!src) return;
    methods.forEach(m => { target.counts[m] += src.counts?.[m] || 0; });
    target.total += src.total || 0;
}

function sumMonths(monthly, months) {
    const total = createMonthRecord("Total");
    months.forEach(m => addMonthRecord(total, monthly[m]));
    return total;
}

const monthHasData = (rec) => rec.total > 0;

// Most preferred method(s) of a record, as display names ("-" when empty).
// Methods tied for the highest count are all listed, comma-separated.
function topMethodOf(record) {
    const highest = Math.max(0, ...Object.values(record.counts));
    if (highest === 0) return "-";
    return Object.entries(record.counts)
        .filter(([, count]) => count === highest)
        .map(([method]) => displayMethod(method))
        .join(", ");
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



// Modern FP user who intends to shift to another modern method
function getShiftMethod(client) {

    const current = normalizeMethod(client.fp_method);

    // public records store it in intention_to_shift, referred ones in with_intention_to_shift
    const shift = normalizeMethod(
        client.intention_to_shift || client.with_intention_to_shift
    );

    // "No Intention", a blank, or the method they already use is not a shift
    if (!current || !shift || shift === current) return null;

    return shift;
}

/*
    Builds the monthly records from client data.
    includeYear(year) decides which years are counted.
*/
function buildMonthlyFromClients(clients, includeYear) {

    const monthly = createEmptyMonthly();

    clients.forEach(client => {

        const shift = getShiftMethod(client);
        if (!shift) return;

        const date = getClientDate(client);
        if (!date || !includeYear(date.getFullYear())) return;

        const row = monthly[monthNames[date.getMonth()]];

        row.counts[shift]++;
        row.total++;

    });

    return monthly;
}

// Counts all modern FP users (not only shifters) in the chosen years / months
function countModernUsers(clients, includeYear, months) {
    return clients.filter(client => {
        if (!normalizeMethod(client.fp_method)) return false;

        const date = getClientDate(client);
        if (!date || !includeYear(date.getFullYear())) return false;

        return months.includes(monthNames[date.getMonth()]);
    }).length;
}

// Row values for columns B to N: 12 methods + total
const rowToValues = (r) => [...methods.map(m => r.counts[m]), r.total];

/*
====================================================
                EXCEL IMPORT / TEMPLATE
====================================================
*/

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

function cellToNumber(cell) {
    let v = cell.value;
    if (v && typeof v === "object" && "result" in v) v = v.result;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

/*
    Parses a filled-in Modern FP Shifters workbook
    (A = month, B-M = the 12 methods in template order, N = total).
    Rows are found by month name in column A. Grand Total row is skipped
    and totals are recomputed by the app.
*/
async function parseShiftersWorkbook(buffer) {

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error("The file has no worksheet.");

    const monthly = createEmptyMonthly();
    const seen = new Set();

    sheet.eachRow(row => {

        const label = cellToText(row.getCell(1)).trim().toLowerCase();
        const month = monthNames.find(m => m.toLowerCase() === label);

        if (!month || seen.has(month)) return;

        seen.add(month);

        const rec = monthly[month];

        methods.forEach((method, i) => {
            rec.counts[method] = cellToNumber(row.getCell(2 + i));
        });

        rec.total = methods.reduce((sum, m) => sum + rec.counts[m], 0);

    });

    if (seen.size === 0) {
        throw new Error(
            "No month rows (January to December) were found in column A. " +
            "Make sure this is a Modern FP Shifters workbook."
        );
    }

    const withData = monthNames.filter(m => seen.has(m) && monthHasData(monthly[m]));
    const months = withData.length > 0
        ? withData
        : monthNames.filter(m => seen.has(m));

    return { monthly, months };
}

/*
    Tries ModernFPShifters_Template_<year>.xlsx first, then the generic
    ModernFPShifters_Template.xlsx. "all" uses only the generic one.
*/
async function loadTemplateBuffer(year) {

    const candidates = [
        ...(year && year !== "all" ? [`/templates/ModernFPShifters_Template_${year}.xlsx`] : []),
        "/templates/ModernFPShifters_Template.xlsx",
    ];

    for (const url of candidates) {
        try {
            const res = await fetch(url);
            const type = res.headers.get("content-type") || "";

            // Dev servers return index.html with status 200 for missing files
            if (res.ok && !type.includes("text/html")) {
                return await res.arrayBuffer();
            }
        } catch {
            /* try next candidate */
        }
    }

    throw new Error("No Modern FP Shifters template found in /templates.");
}

/*
====================================================
                    COMPONENT
====================================================
*/

/*
    Props
    - clients:                 client records
    - year:                    year from the page's filter (number / numeric string) or "all".
                               Falls back to the current year.
    - period:                  "all" | "q1".."q4" | "january".."december". Falls back to internal.
    - onYearChange(year) / onPeriodChange(period): called after an import
    - onImportedYearsChange(years): list of imported years for the page's year options
    - onImportReport(year, monthly) / onRemoveImport(year): optional persistence
*/
function ModernShifters({
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

    const [internalYear, setInternalYear] = useState(new Date().getFullYear());
    const isAllYears = String(yearProp) === "all";
    const parentYear = Number(yearProp);
    const selectedYear = isAllYears
        ? "all"
        : Number.isInteger(parentYear) && parentYear > 0 ? parentYear : internalYear;
    const yearLabel = isAllYears ? "All Years" : selectedYear;

    const [internalPeriod, setInternalPeriod] = useState("all");
    const selectedPeriod = periodProp !== undefined ? periodProp : internalPeriod;

    const activeMonths = periodToMonths(selectedPeriod);
    const isFiltered = activeMonths.length < 12;

    const [toast, setToast] = useState(null);

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

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, [toast]);

    useEffect(() => {
        onImportedYearsChange?.(
            Object.keys(importedReports).map(Number).sort((x, y) => y - x)
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importedReports]);

    /*
        - Single year: an imported report for that year replaces client records.
        - All years: imported reports + client records for years without one.
    */
    const analytics = useMemo(() => {

        let monthly;
        let modernUsers;

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

            modernUsers = countModernUsers(clients, y => !importedReports[y], activeMonths);

        } else if (importedReports[selectedYear]) {

            monthly = importedReports[selectedYear];
            modernUsers = null;   // not stored in an imported report

        } else {

            monthly = buildMonthlyFromClients(clients, y => y === selectedYear);
            modernUsers = countModernUsers(clients, y => y === selectedYear, activeMonths);

        }

        return { monthly, modernUsers, grand: sumMonths(monthly, activeMonths) };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clients, selectedYear, importedReports, selectedPeriod]);

    const grandTotal = analytics.grand;
    const totalShifters = grandTotal.total;
    const mostPreferredMethod = topMethodOf(grandTotal);

    // Whole-year totals (exports keep the official form complete)
    const yearTotal = sumMonths(analytics.monthly, monthNames);

    const shifterCount = (method) => grandTotal.counts[method] || 0;

    const percentage = (method) =>
        totalShifters === 0
            ? 0
            : ((shifterCount(method) / totalShifters) * 100).toFixed(1);

    /*
    ====================================================
                    PDF EXPORT
    ====================================================
    */

    // Default export file name (without extension); it can be changed in the confirmation
    const exportBaseName = `Modern_FP_Shifters_Report_${yearLabel}`;

    const exportModernShiftersPDF = async (fileName = `${exportBaseName}.pdf`) => {

        try {

            const logos = await loadReportLogos();

            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

            drawReportHeader(
                doc,
                `MODERN FP USER WITH INTENTION TO SHIFT TO OTHER MODERN FP METHOD (CY ${yearLabel})`,
                logos
            );

            // Same columns as the on-screen report
            const toCells = (record) => rowToValues(record).map(value => value || 0);

            const body = monthNames.map(month => [month, ...toCells(analytics.monthly[month])]);
            const rowKinds = monthNames.map(() => "month");

            body.push(["GRAND TOTAL", ...toCells(yearTotal)]);
            rowKinds.push("total");

            autoTable(doc, {

                ...reportTableOptions(rowKinds, { firstColumnWidth: 27 }),

                head: [["Month", ...methods, "Total"]],

                body,

            });

            drawSignatories(doc);

            doc.save(fileName);

        } catch (error) {
            console.error("Failed to export Modern FP Shifters PDF:", error);
            alert("Failed to export Modern FP Shifters PDF.");
        }

    };

    /*
    ====================================================
                EXCEL TEMPLATE EXPORT
    ====================================================
    */

    const exportModernShiftersExcel = async (fileName = `${exportBaseName}.xlsx`) => {

        try {

            const buffer = await loadTemplateBuffer(selectedYear);

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            const sheet = workbook.worksheets[0];

            const writeRow = (rowNumber, label, record) => {
                sheet.getCell(rowNumber, 1).value = label;
                rowToValues(record).forEach((value, i) => {
                    sheet.getCell(rowNumber, i + 2).value = value;
                });
            };

            monthNames.forEach((month, index) => {
                writeRow(TEMPLATE_FIRST_ROW + index, month, analytics.monthly[month]);
            });

            writeRow(TEMPLATE_GRAND_ROW, "GRAND TOTAL", yearTotal);

            const excelBuffer = await workbook.xlsx.writeBuffer();

            saveAs(
                new Blob([excelBuffer]),
                fileName
            );

        } catch (error) {
            console.error(error);
            alert("Failed to export Modern FP Shifters Excel.");
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
            const { monthly, months } = await parseShiftersWorkbook(buffer);

            setImportedReports(prev => ({ ...prev, [year]: monthly }));

            onImportReport?.(year, monthly);

            setInternalYear(year);
            onYearChange?.(year);

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

    const renderMethodRow = (label, key) => (
        <div className="method-row" key={key}>
            <span>{label}</span>
            <div className="progress">
                <div
                    className="progress-fill"
                    style={{ width: `${percentage(key)}%` }}
                />
            </div>
            <strong>{shifterCount(key)}</strong>
        </div>
    );

    /*
    ====================================================
                        RENDER
    ====================================================
    */

    return (

        <div className="modern-shifters">

            {/* TOP BAR */}

            <div className="shifters-topbar"
            style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                }}>

                <div className="shifters-topbar-status" />

            </div>

            {/* KPI CARDS */}

            <div className="analytics-cards">

                <div className="analytics-card orange">
                    <h4>Total Modern FP Users</h4>
                    <span>{analytics.modernUsers ?? "-"}</span>
                </div>

                <div className="analytics-card purple">
                    <h4>Modern FP Shifters</h4>
                    <span>{totalShifters}</span>
                </div>

                <div className="analytics-card green">
                    <h4>Most Preferred Method</h4>
                    <span><MethodBadges value={mostPreferredMethod} pillSingle={false} /></span>
                </div>

            </div>

            {/* PREFERRED METHODS DISTRIBUTION */}

            <div className="analytics-panel">

                <h3>Preferred Modern FP Methods Among Shifters</h3>

                <div className="methods-grid">

                    <div>
                        <h4>Natural Methods</h4>
                        {naturalMethods.map(m => renderMethodRow(m, m))}
                    </div>

                    <div>
                        <h4>Long-Acting Methods</h4>
                        {longMethods.map(({ label, key }) => renderMethodRow(label, key))}
                    </div>

                    <div>
                        <h4>Short-Acting Methods</h4>
                        {shortMethods.map(m => renderMethodRow(m, m))}
                    </div>

                </div>

            </div>

            {/* MONTHLY SUMMARY */}

            <div className="form-c-monthly-card">

                <h3>
                    Monthly Summary ({periodLabel(selectedPeriod) ? `${periodLabel(selectedPeriod)} ` : ""}{yearLabel})
                </h3>

                <table className="monthly-summary-table">

                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Modern FP Shifters</th>
                            <th>Top Method</th>
                        </tr>
                    </thead>

                    <tbody>
                        {activeMonths.map(month => {
                            const row = analytics.monthly[month];
                            return (
                                <tr key={month}>
                                    <td>{month}</td>
                                    <td>{row.total}</td>
                                    <td className="highlight-method">
                                        <MethodBadges value={topMethodOf(row)} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    <tfoot>
                        <tr>
                            <th>TOTAL</th>
                            <th>{totalShifters}</th>
                            <th><MethodBadges value={mostPreferredMethod} /></th>
                        </tr>
                    </tfoot>

                </table>

            </div>

            {/* OFFICIAL REPORT */}

            <div className="official-report-card">

                <div className="official-report-header">

                    <div>
                        <h3>Official Modern Family Planning Shifters Report - CY {yearLabel}</h3>
                        <p>
                            Individuals Already Using Modern Family Planning Methods Who Intend to Shift to Another Modern Method
                        </p>
                    </div>

                    <div className="report-buttons">

                        <button type="button" className="import-btn" onClick={openPicker}>
                            Import
                        </button>


                        <button type="button" className="pdf-btn" onClick={() => setExportFormat("pdf")}>
                            Export PDF
                        </button>

                        <button type="button" className="excel-btn" onClick={() => setExportFormat("excel")}>
                            Export Excel
                        </button>

                    </div>

                </div>

                <div className="report-table-wrapper">

                    <table className="official-report-table">

                        <thead>
                            <tr>
                                <th>Month</th>
                                {methods.map(method => <th key={method}>{method}</th>)}
                                <th>Total</th>
                            </tr>
                        </thead>

                        <tbody>
                            {activeMonths.map(month => {
                                const row = analytics.monthly[month];
                                return (
                                    <tr key={month}>
                                        <td>{month}</td>
                                        {methods.map(method => (
                                            <td key={method}>{row.counts[method] || 0}</td>
                                        ))}
                                        <td>{row.total || 0}</td>
                                    </tr>
                                );
                            })}
                        </tbody>

                        <tfoot>
                            <tr>
                                <th className="grand-total-title">
                                    {isFiltered ? "TOTAL" : "GRAND TOTAL"}
                                </th>
                                {methods.map(method => (
                                    <th key={method}>{grandTotal.counts[method] || 0}</th>
                                ))}
                                <th>{totalShifters}</th>
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
                    reportName="Modern FP Shifters"
                    filters={exportFilters}
                    defaultFileName={exportBaseName}
                    imported={isAllYears ? Object.keys(importedReports).length > 0 : !!importedReports[selectedYear]}
                    onCancel={() => setExportFormat(null)}
                    onConfirm={(fileName) => {
                        const run = exportFormat === "pdf" ? exportModernShiftersPDF : exportModernShiftersExcel;
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
                        aria-labelledby="import-pick-title-shifters"
                        onClick={e => e.stopPropagation()}
                    >

                        <h3 id="import-pick-title-shifters">Import Modern FP Shifters report</h3>

                        <p className="import-hint">
                            Upload the filled-in Modern FP Shifters Excel file (.xlsx).
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
                        aria-labelledby="import-title-shifters"
                        onClick={e => e.stopPropagation()}
                    >

                        <h3 id="import-title-shifters">Import Modern FP Shifters report</h3>

                        <p className="import-file">{pendingFile.name}</p>

                        <label htmlFor="import-year-shifters">
                            Which year is this report for?
                        </label>

                        <input
                            id="import-year-shifters"
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

                            <button type="button" onClick={closeImportModal} disabled={importing}>
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

            {/* IMPORT ALERT */}

            {toast && (
                <div className="import-toast" role="status" aria-live="polite">
                    {toast.text}
                </div>
            )}

        </div>

    );

}

export default ModernShifters;