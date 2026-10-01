import { useMemo, useState, useEffect, useRef } from "react";
import "./FormCAnalytics.css";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/*
====================================================
                    CONSTANTS
====================================================
*/

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const methodCatalog = [
    {
        category: "Natural Methods",
        methods: [
            { name: "CCM", aliases: ["ccm", "billings"] },
            { name: "BBT", aliases: ["bbt"] },
            { name: "STM", aliases: ["stm", "sympto"] },
            { name: "SDM", aliases: ["sdm", "standard days"] },
            { name: "LAM", aliases: ["lam", "lactational"] },
        ],
    },
    {
        category: "Long-Acting Methods",
        methods: [
            { name: "IUD", aliases: ["iud"] },
            { name: "Implant", aliases: ["implant"] },
            { name: "NSV", aliases: ["nsv", "vasectomy"] },
            { name: "BTL", aliases: ["btl", "tubal ligation"] },
        ],
    },
    {
        category: "Short-Acting Methods",
        methods: [
            { name: "Injectable", aliases: ["injectable", "dmpa"] },
            { name: "Pills", aliases: ["pill", "pills", "ocp"] },
            { name: "Condom", aliases: ["condom"] },
        ],
    },
];

const summaryColors = ["#16a34a", "#2563eb", "#ea580c"];

const methodNames = methodCatalog.flatMap(g => g.methods.map(m => m.name));

// Column order of the official Form C (Excel columns B to M, then N = Total)
const formColumns = [
    "Condom", "IUD", "Pills", "Injectable", "NSV", "BTL",
    "Implant", "CCM", "BBT", "STM", "SDM", "LAM",
];

// Excel template layout: row where JANUARY starts (Grand Total is 12 rows below)
const TEMPLATE_FIRST_ROW = 13;

// Cell that holds the form title in the template (set to e.g. "A9" to stamp the year)
const TEMPLATE_TITLE_CELL = null;

const IMPORT_STORAGE_KEY = "formC_imported_reports";

/*
====================================================
                    HELPERS
====================================================
*/

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

// Same date fallbacks the Reports page uses for its filters
function toDate(value) {
    if (!value) return null;
    if (value?.toDate) {
        const d = value.toDate();
        return Number.isNaN(d.getTime()) ? null : d;
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === "string" || typeof value === "number") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function getClientDate(client) {
    const candidates = [
        client.created_at,
        client.updated_at,
        client.date,
        client.month_of_service,
        client.service_month,
        client.report_month,
    ];
    for (const value of candidates) {
        const d = toDate(value);
        if (d) return d;
    }
    return null;
}

// Same method fields the Reports page uses for its Method filter
function getMethodText(client) {
    const candidates = [
        client?.fp_method,
        client?.FP_method,
        client?.method,
        client?.family_planning_method,
        client?.familyPlanningMethod,
        client?.preferred_method,
        client?.service_method,
        client?.intention_to_shift,
    ];
    for (const value of candidates) {
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

function getMethod(client) {

    // "Sympto-Thermal" / "sympto_thermal" -> "sympto thermal"
    const text = getMethodText(client).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

    if (!text) return "";

    const tokens = text.split(" ");

    for (const category of methodCatalog) {
        for (const method of category.methods) {

            const matched = method.aliases.some(alias =>
                // short aliases (CCM, IUD, LAM...) must be a whole word
                alias.length <= 3 ? tokens.includes(alias) : text.includes(alias)
            );

            if (matched) return method.name;
        }
    }

    return "";
}

function isArchived(client) {
    return client?.is_archived === true || client?.archived === true;
}

const sumMethods = (rec) =>
    formColumns.reduce((sum, name) => sum + (rec?.[name] || 0), 0);

function topMethods(rec) {

    const highest = Math.max(...methodNames.map(name => rec[name] || 0));

    if (highest <= 0) return "-";

    return methodNames.filter(name => (rec[name] || 0) === highest).join(", ");
}

const createMonthRecord = (month) => ({
    month,
    total: 0,
    referred: 0,
    unmetNeed: 0,
    ...Object.fromEntries(methodNames.map(name => [name, 0])),
});

// A record for every month, all zeros
const createEmptyMonthly = () => {
    const monthly = {};
    monthNames.forEach(m => { monthly[m] = createMonthRecord(m); });
    return monthly;
};

const numericKeys = ["total", "referred", "unmetNeed", ...methodNames];

function addMonthRecord(target, src) {
    numericKeys.forEach(key => {
        target[key] += src?.[key] || 0;
    });
}

// Adds up several months so every total is computed the same way
function sumMonths(monthly, months) {
    const total = createMonthRecord("Total");
    months.forEach(m => addMonthRecord(total, monthly[m]));
    return total;
}

// The 13 values of an official row: 12 methods + Total
const rowToValues = (rec) => [
    ...formColumns.map(name => rec[name] || 0),
    sumMethods(rec),
];

/*
    Builds monthly records from client data.
    includeYear(year) decides which years are counted.
*/
function buildMonthlyFromClients(clients, includeYear) {

    const monthly = createEmptyMonthly();

    clients.forEach(client => {

        if (isArchived(client)) return;

        const date = getClientDate(client);

        if (!date || !includeYear(date.getFullYear())) return;

        const row = monthly[monthNames[date.getMonth()]];

        row.total++;

        if (client.sourceCollection === "clients_referred") {
            row.referred++;
        } else {
            row.unmetNeed++;
        }

        const method = getMethod(client);

        if (method) row[method]++;

    });

    return monthly;
}

/*
====================================================
                    EXCEL HELPERS
====================================================
*/

/*
    Loads the Excel template for a given year.
    Tries FormC_Template_<year>.xlsx first, then the generic FormC_Template.xlsx.
*/
async function loadTemplateBuffer(year) {

    const candidates = [
        ...(year && year !== "all" ? [`/templates/FormC_Template_${year}.xlsx`] : []),
        "/templates/FormC_Template.xlsx",
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

    throw new Error("No Form C template found in /templates.");
}

const monthHasData = (rec) => sumMethods(rec) > 0;

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
    Parses a filled-in Form C workbook.
    Layout: A = month, B-M = Condom, IUD, Pills, Injectable, NSV, BTL,
    Implant, CCM, BBT, STM, SDM, LAM, N = Total.

    Rows are found by the month name in column A (not by fixed row numbers),
    so older reports with a slightly different layout still import.
    Total rows are ignored; the app recomputes them.

    Returns:
      monthly - a record for all 12 months
      months  - months that actually have data (calendar order)
*/
async function parseFormCWorkbook(buffer) {

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

        formColumns.forEach((name, i) => {
            rec[name] = cellToNumber(row.getCell(2 + i));   // B - M
        });

        rec.total = sumMethods(rec);

    });

    if (seen.size === 0) {
        throw new Error(
            "No month rows (January to December) were found in column A. " +
            "Make sure this is a Form C workbook."
        );
    }

    const withData = monthNames.filter(m => seen.has(m) && monthHasData(monthly[m]));

    const months = withData.length > 0
        ? withData
        : monthNames.filter(m => seen.has(m));

    return { monthly, months };
}

/*
====================================================
                    COMPONENT
====================================================
*/

/*
    Props
    - clients:                 client records (already narrowed by the page's filters)
    - loading / error:         load state from the page
    - year:                    page's Year filter (number / numeric string / "all")
    - period:                  page's Period filter ("all" | "q1".."q4" | "january".."december")
    - onYearChange(year):      called after an import so the Year filter jumps to it
    - onPeriodChange(period):  called after an import so the Period filter follows it
    - onImportedYearsChange(years): imported years, so the Year filter can list them
    - onImportReport(year, monthly) / onRemoveImport(year): optional, to persist imports
*/
function FormCAnalytics({
    clients = [],
    loading = false,
    error = "",
    year: yearProp,
    period: periodProp,
    onYearChange,
    onPeriodChange,
    onImportedYearsChange,
    onImportReport,
    onRemoveImport,
}) {

    // Year comes from the page's filter; internal fallback if none is passed
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

    const activeMonths = periodToMonths(selectedPeriod);
    const isFiltered = activeMonths.length < 12;
    const periodText = periodLabel(selectedPeriod);

    const [toast, setToast] = useState(null);

    // Imported (older) reports, keyed by year
    const [importedReports, setImportedReports] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(IMPORT_STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    });

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

    // Tell the page which years exist as imported reports
    useEffect(() => {
        onImportedYearsChange?.(
            Object.keys(importedReports).map(Number).sort((x, y) => y - x)
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importedReports]);

    /*
        Analytics for the selected year and period.
        - A single year: an imported report for that year replaces client records.
        - All years: imported reports + client records for years with no import.
        Every total follows the Period filter.
    */
    const analytics = useMemo(() => {

        const months = periodToMonths(selectedPeriod);

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

        const totals = sumMonths(monthly, months);

        const totalRecognizedMethods = sumMethods(totals);

        const methodCounts = Object.fromEntries(
            methodNames.map(name => [name, totals[name]])
        );

        const monthlySummary = months.map(month => ({
            ...monthly[month],
            topMethod: topMethods(monthly[month]),
        }));

        const categorySummary = methodCatalog.map((group, index) => ({
            category: group.category,
            methods: group.methods.map(method => {

                const count = methodCounts[method.name];

                return {
                    ...method,
                    count,
                    percent: totalRecognizedMethods
                        ? Math.round((count / totalRecognizedMethods) * 100)
                        : 0,
                    color: summaryColors[index % summaryColors.length],
                };

            }),
        }));

        return {
            monthly,
            monthlySummary,
            categorySummary,
            totals,
            methods: methodCounts,
            totalRecords: totals.total,
            totalReferredServed: totals.referred,
            totalUnmetNeed: totals.unmetNeed,
            totalRecognizedMethods,
        };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clients, selectedYear, importedReports, selectedPeriod]);

    const usesImported = isAllYears
        ? Object.keys(importedReports).length > 0
        : !!importedReports[selectedYear];

    /*
    ====================================================
                    PDF EXPORT
    ====================================================
    */

    const exportPDF = () => {

        try {

            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

            doc.setFont("times", "normal");
            doc.setFontSize(11);
            doc.text("Republic of the Philippines", 148, 10, { align: "center" });
            doc.text("Province of Bulacan", 148, 16, { align: "center" });

            doc.setFont("times", "bold");
            doc.text("Provincial Social Welfare and Development Office", 148, 22, { align: "center" });

            doc.setFontSize(15);
            doc.text("Responsible Parenthood and Family Planning (RPFP)", 148, 31, { align: "center" });

            doc.setFontSize(11);
            doc.text(
                `FORM C - Individuals Referred and Served with Unmet Need for Modern Family Planning (CY ${yearLabel}${periodText ? `, ${periodText}` : ""})`,
                148, 40, { align: "center" }
            );

            autoTable(doc, {

                startY: 46,
                theme: "grid",
                margin: { left: 8, right: 8 },

                styles: {
                    font: "times",
                    fontSize: 7,
                    halign: "center",
                    valign: "middle",
                    cellPadding: 2,
                    lineWidth: 0.1,
                },

                head: [["Month", ...formColumns, "Total"]],

                body: activeMonths.map(month => [
                    month,
                    ...rowToValues(analytics.monthly[month]),
                ]),

                foot: [[
                    isFiltered ? "TOTAL" : "GRAND TOTAL",
                    ...rowToValues(analytics.totals),
                ]],

                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontStyle: "bold",
                },

                footStyles: {
                    fillColor: [230, 230, 230],
                    textColor: 0,
                    fontStyle: "bold",
                },

                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 17 },
                    2: { cellWidth: 15 },
                    3: { cellWidth: 15 },
                    4: { cellWidth: 19 },
                    5: { cellWidth: 15 },
                    6: { cellWidth: 15 },
                    7: { cellWidth: 17 },
                    8: { cellWidth: 15 },
                    9: { cellWidth: 15 },
                    10: { cellWidth: 15 },
                    11: { cellWidth: 15 },
                    12: { cellWidth: 15 },
                    13: { cellWidth: 17 },
                },

            });

            doc.save(`Official_Form_C_Report_${yearLabel}.pdf`);

        } catch (err) {

            console.error("Form C PDF export error:", err);
            alert("Failed to export Form C PDF.");

        }

    };

    /*
    ====================================================
                EXCEL TEMPLATE EXPORT
    ====================================================
    */

    const exportOfficialExcel = async () => {

        try {

            const buffer = await loadTemplateBuffer(selectedYear);

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            const sheet = workbook.worksheets[0];

            if (TEMPLATE_TITLE_CELL) {
                sheet.getCell(TEMPLATE_TITLE_CELL).value = `FORM C - CY ${yearLabel}`;
            }

            // Months outside the Period filter are left blank
            monthNames.forEach((month, i) => {

                const rowNumber = TEMPLATE_FIRST_ROW + i;
                const active = activeMonths.includes(month);
                const values = rowToValues(analytics.monthly[month]);

                sheet.getCell(rowNumber, 1).value = month;

                values.forEach((value, j) => {
                    sheet.getCell(rowNumber, j + 2).value = active ? value : null;
                });

            });

            const grandRow = TEMPLATE_FIRST_ROW + 12;

            sheet.getCell(grandRow, 1).value = "GRAND TOTAL";

            rowToValues(analytics.totals).forEach((value, j) => {
                sheet.getCell(grandRow, j + 2).value = value;
            });

            const excelBuffer = await workbook.xlsx.writeBuffer();

            saveAs(
                new Blob([excelBuffer]),
                `Official_Form_C_Report_${yearLabel}.xlsx`
            );

        } catch (err) {

            console.error(err);
            alert("Failed to export Form C.");

        }

    };

    /*
    ====================================================
                    IMPORT REPORT
    ====================================================
    */

    // Step 1: person picks a file -> we ask for the report year
    const handleFileChosen = (e) => {

        const file = e.target.files?.[0];

        e.target.value = "";   // lets the same file be picked again later

        if (!file) return;

        setImportError("");
        setImportYear("");
        setPendingFile(file);

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
            const { monthly, months } = await parseFormCWorkbook(buffer);

            setImportedReports(prev => ({ ...prev, [year]: monthly }));

            onImportReport?.(year, monthly);

            // Year filter -> the imported year
            setInternalYear(year);
            onYearChange?.(year);

            // Period filter -> the recorded month, the quarter holding the
            // recorded months, or the whole year
            const periodToShow = monthsToPeriod(months);
            setInternalPeriod(periodToShow);
            onPeriodChange?.(periodToShow);

            const recorded =
                months.length === 12 ? "January to December"
                : months.length <= 3 ? months.join(", ")
                : `${months[0]} to ${months[months.length - 1]}`;

            setToast({ id: Date.now(), text: `Imported ${year} report (${recorded})` });

            setPendingFile(null);

        } catch (err) {

            console.error(err);
            setImportError(err.message || "Could not read this file.");

        } finally {

            setImporting(false);

        }

    };

    const removeImportedReport = () => {

        if (isAllYears) return;

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

    if (loading) {
        return <div className="form-c-loading">Loading Form C...</div>;
    }

    /*
    ====================================================
                        RENDER
    ====================================================
    */

    return (

        <div className="form-c-container">

            {/* TOP BAR */}

            <div className="form-c-topbar"
            style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                }}>

                <div className="form-c-topbar-status">
                    {usesImported && (
                        <>
                            <span>
                                Showing imported report data
                                {!isAllYears ? ` for ${selectedYear}` : ""}. Barangay and
                                method filters do not apply to imported data.
                            </span>
                            {!isAllYears && (
                                <button
                                    type="button"
                                    className="link-btn"
                                    onClick={removeImportedReport}
                                >
                                    Remove import
                                </button>
                            )}
                        </>
                    )}
                </div>

                <button
                    type="button"
                    className="import-btn"
                    onClick={() => fileInputRef.current?.click()}
                >
                    Import Excel
                </button>

            </div>

            {error && !usesImported && (
                <div className="form-c-loading">{error}</div>
            )}

            {/* KPI CARDS */}

            <div className="form-c-cards">

                <div className="form-c-card blue">
                    <small>Total Records</small>
                    <h2>{analytics.totalRecords}</h2>
                </div>

                <div className="form-c-card green">
                    <small>Individuals Referred &amp; Served</small>
                    <h2>{analytics.totalReferredServed}</h2>
                </div>

                <div className="form-c-card orange">
                    <small>Individuals with Unmet Need</small>
                    <h2>{analytics.totalUnmetNeed}</h2>
                </div>

            </div>

            {/* METHOD SUMMARY */}

            <div className="form-c-summary-card">

                <h3>Family Planning Methods Summary</h3>

                <div className="method-summary-grid">

                    {analytics.categorySummary.map(group => (

                        <div key={group.category} className="method-category">

                            <h4>{group.category}</h4>

                            {group.methods.map(method => (

                                <div key={method.name} className="method-row">

                                    <span>{method.name}</span>

                                    <div className="method-progress">
                                        <div
                                            className="method-progress-fill"
                                            style={{
                                                width: `${method.percent}%`,
                                                background: method.color,
                                            }}
                                        />
                                    </div>

                                    <strong>{method.count}</strong>

                                </div>

                            ))}

                        </div>

                    ))}

                </div>

            </div>

            {/* MONTHLY SUMMARY */}

            <div className="form-c-monthly-card">

                <h3>
                    Monthly Summary ({periodText ? `${periodText} ` : ""}{yearLabel})
                </h3>

                <table className="monthly-summary-table">

                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Unmet Need</th>
                            <th>Referred &amp; Served</th>
                            <th>Top FP Method</th>
                            <th>Total Clients</th>
                        </tr>
                    </thead>

                    <tbody>
                        {analytics.monthlySummary.map(row => (
                            <tr key={row.month}>
                                <td>{row.month}</td>
                                <td>{row.unmetNeed}</td>
                                <td>{row.referred}</td>
                                <td className="highlight-method">{row.topMethod}</td>
                                <td>{row.total}</td>
                            </tr>
                        ))}
                    </tbody>

                    <tfoot>
                        <tr>
                            <th>TOTAL</th>
                            <th>{analytics.totalUnmetNeed}</th>
                            <th>{analytics.totalReferredServed}</th>
                            <th>{topMethods(analytics.totals)}</th>
                            <th>{analytics.totalRecords}</th>
                        </tr>
                    </tfoot>

                </table>

            </div>

            {/* OFFICIAL FORM C REPORT */}

            <div className="official-report-card">

                <div className="official-report-header">

                    <div>
                        <h3>Official Form C Report - CY {yearLabel}</h3>
                        <p>Individuals Referred and Served with Unmet Need for Modern Family Planning</p>
                    </div>

                    <div className="report-buttons">

                        <button type="button" className="pdf-btn" onClick={exportPDF}>
                            Export PDF
                        </button>

                        <button type="button" className="excel-btn" onClick={exportOfficialExcel}>
                            Export Excel
                        </button>

                    </div>

                </div>

                <div className="table-wrapper">

                    <table className="official-report-table">

                        <thead>
                            <tr>
                                <th>Month</th>
                                {formColumns.map(name => (
                                    <th key={name}>{name}</th>
                                ))}
                                <th>Total</th>
                            </tr>
                        </thead>

                        <tbody>
                            {activeMonths.map(month => (
                                <tr key={month}>
                                    <td>{month}</td>
                                    {rowToValues(analytics.monthly[month]).map((value, i) => (
                                        <td key={i}>{value}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>

                        <tfoot>
                            <tr>
                                <th className="grand-total-title">
                                    {isFiltered ? "TOTAL" : "GRAND TOTAL"}
                                </th>
                                {rowToValues(analytics.totals).map((value, i) => (
                                    <th key={i}>{value}</th>
                                ))}
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

            {pendingFile && (
                <div className="import-modal-backdrop" onClick={closeImportModal}>

                    <div
                        className="import-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="import-title-c"
                        onClick={e => e.stopPropagation()}
                    >

                        <h3 id="import-title-c">Import Form C report</h3>

                        <p className="import-file">{pendingFile.name}</p>

                        <label htmlFor="import-year-c">
                            Which year is this report for?
                        </label>

                        <input
                            id="import-year-c"
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

            {/* IMPORT ALERT */}

            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    style={{
                        position: "fixed",
                        left: "50%",
                        bottom: "24px",
                        transform: "translateX(-50%)",
                        background: "#1f2937",
                        color: "#fff",
                        padding: "12px 20px",
                        borderRadius: "8px",
                        boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                        fontSize: "14px",
                        zIndex: 1100,
                        maxWidth: "90vw",
                    }}
                >
                    {toast.text}
                </div>
            )}

        </div>

    );

}

export default FormCAnalytics;