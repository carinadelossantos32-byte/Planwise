import "./ModernFPUsersAnalytics.css";
import { useMemo, useState, useEffect, useRef } from "react";
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

// Official column order (Excel columns B to M, then N = Total)
const methodHeaders = [
    "Condom", "IUD", "Pills", "Injectable", "Vasectomy", "Tubal Ligation",
    "Implant", "CCM", "BBT", "STM", "SDM", "LAM",
];

// Short headers used on the official form
const headerLabels = {
    "Vasectomy": "NSV",
    "Tubal Ligation": "BTL",
};

const labelOf = (method) => headerLabels[method] || method;

const methodAliases = [
    { name: "Condom", aliases: ["condom"] },
    { name: "Pills", aliases: ["pill", "pills", "ocp"] },
    { name: "Injectable", aliases: ["injectable", "injection", "dmpa"] },
    { name: "IUD", aliases: ["iud"] },
    { name: "Implant", aliases: ["implant", "subdermal"] },
    { name: "Vasectomy", aliases: ["nsv", "vasectomy"] },
    { name: "Tubal Ligation", aliases: ["btl", "tubal ligation"] },
    { name: "CCM", aliases: ["ccm", "calendar", "billings"] },
    { name: "BBT", aliases: ["bbt", "basal body"] },
    { name: "STM", aliases: ["stm", "sympto"] },
    { name: "SDM", aliases: ["sdm", "standard days"] },
    { name: "LAM", aliases: ["lam", "lactational"] },
];

const methodGroups = [
    { title: "Natural Methods", fill: "orange", methods: ["CCM", "BBT", "STM", "SDM", "LAM"] },
    { title: "Long-Acting Methods", fill: "", methods: ["IUD", "Implant", "Vasectomy", "Tubal Ligation"] },
    { title: "Short-Acting Methods", fill: "green", methods: ["Injectable", "Pills", "Condom"] },
];

// Excel template layout: row where JANUARY starts (Grand Total is 12 rows below)
const TEMPLATE_FIRST_ROW = 13;

// Cell holding the report title in the template (e.g. "A9" to stamp the year)
const TEMPLATE_TITLE_CELL = null;

const IMPORT_STORAGE_KEY = "modernFP_imported_reports";

/*
====================================================
                    HELPERS
====================================================
*/

/*
    Period values match the page's Period filter:
    "all" | "q1".."q4" | "january".."december"
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

// Same date fields the Reports page filters on first, then extra service-date fields
function getClientDate(client) {
    const candidates = [
        client.created_at,
        client.updated_at,
        client.date,
        client.month_of_service,
        client.service_month,
        client.report_month,
        client.date_of_service,
        client.service_date,
        client.fp_date,
    ];
    for (const value of candidates) {
        const d = toDate(value);
        if (d) return d;
    }
    return null;
}

const methodFields = [
    "fp_method",
    "FP_method",
    "method",
    "family_planning_method",
    "familyPlanningMethod",
    "method_used",
    "contraceptive_method",
    "preferred_method",
    "service_method",
    "intention_to_shift",
    "program",
];

function getMethod(client) {

    let raw = "";

    for (const key of methodFields) {
        const value = client?.[key];
        if (typeof value === "string" && value.trim()) {
            raw = value;
            break;
        }
    }

    // "Sympto-Thermal" / "sympto_thermal" -> "sympto thermal"
    const text = raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

    if (!text) return "";

    const tokens = text.split(" ");

    for (const method of methodAliases) {

        const matched = method.aliases.some(alias =>
            // short aliases (CCM, IUD, LAM...) must be a whole word
            alias.length <= 3 ? tokens.includes(alias) : text.includes(alias)
        );

        if (matched) return method.name;
    }

    return "";
}

const sumMethods = (rec) =>
    methodHeaders.reduce((sum, name) => sum + (rec?.[name] || 0), 0);

function topMethods(rec) {

    const highest = Math.max(0, ...methodHeaders.map(name => rec[name] || 0));

    if (highest === 0) return "-";

    return methodHeaders.filter(name => (rec[name] || 0) === highest).join(", ");
}

/*
    total       = modern FP users (sum of the method columns)
    allClients  = every client record in scope (client data only)
    clientUsers = modern FP users coming from client data only
    The last two feed the utilization rate; imported reports don't have them.
*/
const createMonthRecord = (month) => ({
    month,
    total: 0,
    allClients: 0,
    clientUsers: 0,
    ...Object.fromEntries(methodHeaders.map(name => [name, 0])),
});

const createEmptyMonthly = () => {
    const monthly = {};
    monthNames.forEach(m => { monthly[m] = createMonthRecord(m); });
    return monthly;
};

const numericKeys = ["total", "allClients", "clientUsers", ...methodHeaders];

function addMonthRecord(target, src) {
    numericKeys.forEach(key => {
        target[key] += src?.[key] || 0;
    });
}

function sumMonths(monthly, months) {
    const total = createMonthRecord("Total");
    months.forEach(m => addMonthRecord(total, monthly[m]));
    return total;
}

// 12 methods + Total
const rowToValues = (rec) => [
    ...methodHeaders.map(name => rec[name] || 0),
    sumMethods(rec),
];

function buildMonthlyFromClients(clients, includeYear) {

    const monthly = createEmptyMonthly();

    clients.forEach(client => {

        const date = getClientDate(client);

        if (!date || !includeYear(date.getFullYear())) return;

        const row = monthly[monthNames[date.getMonth()]];

        row.allClients++;

        const method = getMethod(client);

        if (!method) return;

        row.total++;
        row.clientUsers++;
        row[method]++;

    });

    return monthly;
}

/*
====================================================
                    EXCEL HELPERS
====================================================
*/

async function loadTemplateBuffer(year) {

    const candidates = [
        ...(year && year !== "all" ? [`/templates/ModernFPUsers_Template_${year}.xlsx`] : []),
        "/templates/ModernFPUsers_Template.xlsx",
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

    throw new Error("No Modern FP Users template found in /templates.");
}

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
    Parses a filled-in Modern FP Users workbook.
    A = month, B-M = Condom, IUD, Pills, Injectable, NSV, BTL, Implant,
    CCM, BBT, STM, SDM, LAM, N = Total.
    Rows are found by month name in column A; total rows are ignored
    (the app recomputes them).
*/
async function parseWorkbook(buffer) {

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

        methodHeaders.forEach((name, i) => {
            rec[name] = cellToNumber(row.getCell(2 + i));   // B - M
        });

        rec.total = sumMethods(rec);

    });

    if (seen.size === 0) {
        throw new Error(
            "No month rows (January to December) were found in column A. " +
            "Make sure this is a Modern FP Users workbook."
        );
    }

    const withData = monthNames.filter(m => seen.has(m) && sumMethods(monthly[m]) > 0);

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
    - year / period:           the page's Year and Period filters
    - onYearChange / onPeriodChange:   move the page's filters after an import
    - onImportedYearsChange(years):    imported years, for the Year filter options
    - onImportReport(year, monthly) / onRemoveImport(year): optional, to persist imports
*/
function ModernFPUsersAnalytics({
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
    const periodText = periodLabel(selectedPeriod);

    const [toast, setToast] = useState(null);

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

        const methodCounts = Object.fromEntries(
            methodHeaders.map(name => [name, totals[name]])
        );

        const monthlySummary = months.map(month => ({
            month,
            total: monthly[month].total,
            topMethod: topMethods(monthly[month]),
        }));

        const utilizationRate = totals.allClients
            ? `${((totals.clientUsers / totals.allClients) * 100).toFixed(1)}%`
            : "N/A";

        return {
            monthly,
            totals,
            methodCounts,
            monthlySummary,
            totalUsers: totals.total,
            utilizationRate,
            topMethod: topMethods(totals),
        };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clients, selectedYear, importedReports, selectedPeriod]);

    const { monthly, totals, methodCounts, monthlySummary, totalUsers, utilizationRate, topMethod } = analytics;

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
                `MODERN FAMILY PLANNING USERS REPORT (CY ${yearLabel}${periodText ? `, ${periodText}` : ""})`,
                148, 40, { align: "center" }
            );

            autoTable(doc, {

                startY: 46,
                theme: "grid",
                margin: { left: 8, right: 8 },

                head: [["Month", ...methodHeaders.map(labelOf), "Total"]],

                body: activeMonths.map(month => [month, ...rowToValues(monthly[month])]),

                foot: [[isFiltered ? "TOTAL" : "GRAND TOTAL", ...rowToValues(totals)]],

                styles: {
                    font: "times",
                    fontSize: 7,
                    halign: "center",
                    valign: "middle",
                    lineWidth: 0.1,
                },

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
                    0: { cellWidth: 27 },
                    1: { cellWidth: 18 },
                    2: { cellWidth: 15 },
                    3: { cellWidth: 15 },
                    4: { cellWidth: 20 },
                    5: { cellWidth: 15 },
                    6: { cellWidth: 18 },
                    7: { cellWidth: 17 },
                    8: { cellWidth: 15 },
                    9: { cellWidth: 15 },
                    10: { cellWidth: 15 },
                    11: { cellWidth: 15 },
                    12: { cellWidth: 15 },
                    13: { cellWidth: 18 },
                },

            });

            doc.save(`Modern_FP_Users_Report_${yearLabel}.pdf`);

        } catch (err) {

            console.error("Failed to export Modern FP Users PDF:", err);
            alert("Failed to export Modern FP Users PDF.");

        }

    };

    /*
    ====================================================
                EXCEL TEMPLATE EXPORT
    ====================================================
    */

    const exportExcel = async () => {

        try {

            const buffer = await loadTemplateBuffer(selectedYear);

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            const sheet = workbook.worksheets[0];

            if (TEMPLATE_TITLE_CELL) {
                sheet.getCell(TEMPLATE_TITLE_CELL).value =
                    `MODERN FP USERS - CY ${yearLabel}`;
            }

            // Months outside the Period filter are left blank
            monthNames.forEach((month, i) => {

                const rowNumber = TEMPLATE_FIRST_ROW + i;
                const active = activeMonths.includes(month);

                sheet.getCell(rowNumber, 1).value = month;

                rowToValues(monthly[month]).forEach((value, j) => {
                    sheet.getCell(rowNumber, j + 2).value = active ? value : null;
                });

            });

            const grandRow = TEMPLATE_FIRST_ROW + 12;

            sheet.getCell(grandRow, 1).value = "GRAND TOTAL";

            rowToValues(totals).forEach((value, j) => {
                sheet.getCell(grandRow, j + 2).value = value;
            });

            const excelBuffer = await workbook.xlsx.writeBuffer();

            saveAs(
                new Blob([excelBuffer]),
                `Modern_FP_Users_Report_${yearLabel}.xlsx`
            );

        } catch (err) {

            console.error(err);
            alert("Failed to export Modern FP Users Excel.");

        }

    };

    /*
    ====================================================
                    IMPORT REPORT
    ====================================================
    */

    const handleFileChosen = (e) => {

        const file = e.target.files?.[0];

        e.target.value = "";

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
            const { monthly: imported, months } = await parseWorkbook(buffer);

            setImportedReports(prev => ({ ...prev, [year]: imported }));

            onImportReport?.(year, imported);

            // Year filter -> the imported year
            setInternalYear(year);
            onYearChange?.(year);

            // Period filter -> the recorded month / quarter / whole year
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
        return <div className="modernfp-loading">Loading Modern FP Users report...</div>;
    }

    /*
    ====================================================
                        RENDER
    ====================================================
    */

    return (
        <div className="modernfp-container">

            {/* TOP BAR: status on the left, Import on the right */}

            <div
                className="modernfp-topbar"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                }}
            >

                <div className="modernfp-topbar-status">
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
                    style={{ marginLeft: "auto" }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    Import Excel
                </button>

            </div>

            {error && !usesImported && (
                <div className="modernfp-loading">{error}</div>
            )}

            {/* KPI CARDS */}

            <div className="modernfp-cards">

                <div className="modernfp-card orange">
                    <small>Total Modern FP Users</small>
                    <h2>{totalUsers}</h2>
                </div>

                <div className="modernfp-card purple">
                    <small>Modern FP Utilization</small>
                    <h2>{utilizationRate}</h2>
                </div>

                <div className="modernfp-card green">
                    <small>Most Used Method</small>
                    <h2>{topMethod}</h2>
                </div>

            </div>

            {/* METHOD DISTRIBUTION */}

            <div className="modernfp-distribution-card">

                <h3>Modern Family Planning Method Distribution</h3>

                <div className="modernfp-method-grid">

                    {methodGroups.map(group => (

                        <div className="method-column" key={group.title}>

                            <h4>{group.title}</h4>

                            {group.methods.map(method => (

                                <div className="method-row" key={method}>

                                    <span>{labelOf(method)}</span>

                                    <div className="method-progress">
                                        <div
                                            className={`method-progress-fill ${group.fill}`.trim()}
                                            style={{
                                                width: `${((methodCounts[method] || 0) / (totalUsers || 1)) * 100}%`,
                                            }}
                                        />
                                    </div>

                                    <strong>{methodCounts[method] || 0}</strong>

                                </div>

                            ))}

                        </div>

                    ))}

                </div>

            </div>

            {/* MONTHLY SUMMARY */}

            <div className="monthly-summary">

                <h3>
                    Monthly Summary ({periodText ? `${periodText} ` : ""}{yearLabel})
                </h3>

                <table className="monthly-summary-table">

                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Total Modern FP Users</th>
                            <th>Top Method</th>
                        </tr>
                    </thead>

                    <tbody>
                        {monthlySummary.map(item => (
                            <tr key={item.month}>
                                <td>{item.month}</td>
                                <td>{item.total}</td>
                                <td className="highlight-method">{item.topMethod}</td>
                            </tr>
                        ))}
                    </tbody>

                    <tfoot>
                        <tr>
                            <th>TOTAL</th>
                            <th>{totalUsers}</th>
                            <th>{topMethod}</th>
                        </tr>
                    </tfoot>

                </table>

            </div>

            {/* OFFICIAL REPORT */}

            <div className="modernfp-report-card">

                <div className="modernfp-report-header">

                    <div>
                        <h3>Official Modern FP Users Report - CY {yearLabel}</h3>
                        <p>Modern Family Planning Users Summary</p>
                    </div>

                    <div className="modernfp-report-actions">

                        <button type="button" className="export-pdf-btn" onClick={exportPDF}>
                            Export PDF
                        </button>

                        <button type="button" className="export-excel-btn" onClick={exportExcel}>
                            Export Excel
                        </button>

                    </div>

                </div>

                <div className="modernfp-report-table-wrapper">

                    <table className="modernfp-report-table">

                        <thead>
                            <tr>
                                <th>Month</th>
                                {methodHeaders.map(name => (
                                    <th key={name}>{labelOf(name)}</th>
                                ))}
                                <th>Total</th>
                            </tr>
                        </thead>

                        <tbody>
                            {activeMonths.map(month => (
                                <tr key={month}>
                                    <td>{month}</td>
                                    {rowToValues(monthly[month]).map((value, i) => (
                                        <td key={i}>{value || ""}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>

                        <tfoot>
                            <tr>
                                <th>{isFiltered ? "TOTAL" : "GRAND TOTAL"}</th>
                                {rowToValues(totals).map((value, i) => (
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
                        aria-labelledby="import-title-mfp"
                        onClick={e => e.stopPropagation()}
                    >

                        <h3 id="import-title-mfp">Import Modern FP Users report</h3>

                        <p className="import-file">{pendingFile.name}</p>

                        <label htmlFor="import-year-mfp">
                            Which year is this report for?
                        </label>

                        <input
                            id="import-year-mfp"
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
                                className="export-excel-btn"
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

export default ModernFPUsersAnalytics;