
import "./ModernFPUsersAnalytics.css";
import { useMemo } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";




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

const methodHeaders = [
    "Condom",
    "IUD",
    "Pills",
    "Injectable",
    "Vasectomy",
    "Tubal Ligation",
    "Implant",
    "CCM",
    "BBT",
    "STM",
    "SDM",
    "LAM",
];

/*
=================================
SAFE FIRESTORE FIELD READER
=================================
*/

function getFieldValue(client, keys) {

    for (const key of keys) {

        const value = client?.[key];

        if (value === undefined || value === null)
            continue;

        if (typeof value === "string") {

            const text = value.trim();

            if (text)
                return text;

        }

        if (typeof value === "number")
            return value;

        if (value?.toDate)
            return value.toDate();

    }

    return "";

}

/*
=================================
TEXT NORMALIZER
=================================
*/

function normalizeText(value) {

    if (typeof value !== "string")
        return "";

    return value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

}

/*
=================================
MONTH PARSER
=================================
*/

function parseMonth(value) {

    if (!value)
        return "";

    if (value?.toDate) {

        return monthNames[value.toDate().getMonth()];

    }

    if (value instanceof Date) {

        return monthNames[value.getMonth()];

    }

    if (typeof value === "string") {

        const parsed = new Date(value);

        if (!Number.isNaN(parsed.getTime())) {

            return monthNames[parsed.getMonth()];

        }

        const text = normalizeText(value);

        return (
            monthNames.find(month =>
                text.includes(month.toLowerCase())
            ) || ""
        );

    }

    return "";

}

/*
=================================
FP METHOD NORMALIZER
=================================
*/

function getMethodLabel(value) {

    const method = normalizeText(value);

    const methodMap = {

        // Barrier
        "condom": "Condom",

        // Short Acting
        "pill": "Pills",
        "pills": "Pills",

        "injectable": "Injectable",
        "injection": "Injectable",

        // Long Acting
        "iud": "IUD",

        "implant": "Implant",
        "subdermal": "Implant",
        "subdermal implant": "Implant",

        // Permanent
        "nsv": "Vasectomy",
        "vasectomy": "Vasectomy",

        "btl": "Tubal Ligation",
        "tubal ligation": "Tubal Ligation",

        // Natural
        "ccm": "CCM",
        "calendar method": "CCM",

        "bbt": "BBT",
        "basal body temperature": "BBT",

        "stm": "STM",
        "sympto thermal": "STM",
        "symptothermal": "STM",
        "sympto thermal method": "STM",

        "sdm": "SDM",
        "standard days method": "SDM",

        "lam": "LAM",
        "lactational amenorrhea": "LAM",

    };

    return methodMap[method] || "";

}


/*
=================================
COMPONENT
=================================
*/


function ModernFPUsersAnalytics({
    clients = [],
    loading = false,
    error = ""
}) {


    const exportModernFPUsersPDF = () => {

        try {

            const doc = new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4",
            });

            // ==========================
            // HEADER
            // ==========================

            doc.setFont("times", "normal");

            doc.setFontSize(11);

            doc.text(
                "Republic of the Philippines",
                148,
                10,
                { align: "center" }
            );

            doc.text(
                "Province of Bulacan",
                148,
                16,
                { align: "center" }
            );

            doc.setFont("times", "bold");

            doc.text(
                "Provincial Social Welfare and Development Office",
                148,
                22,
                { align: "center" }
            );

            doc.setFontSize(15);

            doc.text(
                "Responsible Parenthood and Family Planning (RPFP)",
                148,
                31,
                { align: "center" }
            );

            doc.setFontSize(11);

            doc.text(
                "MODERN FAMILY PLANNING USERS REPORT",
                148,
                40,
                { align: "center" }
            );



            // ==========================
            // TABLE
            // ==========================

            autoTable(doc, {

                startY: 46,

                margin: {
                    left: 8,
                    right: 8,
                },

                head: [[
                    "Month",
                    "Condom",
                    "IUD",
                    "Pills",
                    "Injectable",
                    "NSV",
                    "BTL",
                    "Implant",
                    "CCM",
                    "BBT",
                    "STM",
                    "SDM",
                    "LAM",
                    "Total"
                ]],

                body: monthlyMethodReport.map(row => [

                    row.month,

                    row.Condom || 0,

                    row.IUD || 0,

                    row.Pills || 0,

                    row.Injectable || 0,

                    row.Vasectomy || 0,

                    row["Tubal Ligation"] || 0,

                    row.Implant || 0,

                    row.CCM || 0,

                    row.BBT || 0,

                    row.STM || 0,

                    row.SDM || 0,

                    row.LAM || 0,

                    row.total || 0,

                ]),

                foot: [[

                    "GRAND TOTAL",

                    grandTotals.Condom,

                    grandTotals.IUD,

                    grandTotals.Pills,

                    grandTotals.Injectable,

                    grandTotals.Vasectomy,

                    grandTotals["Tubal Ligation"],

                    grandTotals.Implant,

                    grandTotals.CCM,

                    grandTotals.BBT,

                    grandTotals.STM,

                    grandTotals.SDM,

                    grandTotals.LAM,

                    grandTotals.total,

                ]],



                theme: "grid",

                styles: {
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

            // ==========================
            // SAVE
            // ==========================

            doc.save(
                `Modern_FP_Users_Report_${new Date()
                    .toISOString()
                    .slice(0, 10)}.pdf`
            );

        }

        catch (error) {

            console.error(
                "Failed to export Modern FP Users PDF:",
                error
            );

            alert(
                "Failed to export Modern FP Users PDF."
            );

        }

    };


    const exportModernFPUsersExcel = async () => {

        const workbook = new ExcelJS.Workbook();

        await workbook.xlsx.load(
            await fetch("/templates/ModernFPUsers_Template.xlsx")
                .then(res => res.arrayBuffer())
        );

        const sheet = workbook.getWorksheet(1);

        const startRow = 13;

        monthlyMethodReport.forEach((row, index) => {

            const excelRow = startRow + index;

            sheet.getCell(`A${excelRow}`).value = row.month;

            sheet.getCell(`B${excelRow}`).value = row.Condom || 0;
            sheet.getCell(`C${excelRow}`).value = row.IUD || 0;
            sheet.getCell(`D${excelRow}`).value = row.Pills || 0;
            sheet.getCell(`E${excelRow}`).value = row.Injectable || 0;

            sheet.getCell(`F${excelRow}`).value =
                row.Vasectomy || 0;

            sheet.getCell(`G${excelRow}`).value =
                row["Tubal Ligation"] || 0;

            sheet.getCell(`H${excelRow}`).value =
                row.Implant || 0;

            sheet.getCell(`I${excelRow}`).value =
                row.CCM || 0;

            sheet.getCell(`J${excelRow}`).value =
                row.BBT || 0;

            sheet.getCell(`K${excelRow}`).value =
                row.STM || 0;

            sheet.getCell(`L${excelRow}`).value =
                row.SDM || 0;

            sheet.getCell(`M${excelRow}`).value =
                row.LAM || 0;

            sheet.getCell(`N${excelRow}`).value =
                row.total || 0;
        });

        // GRAND TOTAL

        sheet.getCell("A25").value = "GRAND TOTAL";

        sheet.getCell("B25").value = grandTotals.Condom;
        sheet.getCell("C25").value = grandTotals.IUD;
        sheet.getCell("D25").value = grandTotals.Pills;
        sheet.getCell("E25").value = grandTotals.Injectable;

        sheet.getCell("F25").value =
            grandTotals.Vasectomy;

        sheet.getCell("G25").value =
            grandTotals["Tubal Ligation"];

        sheet.getCell("H25").value =
            grandTotals.Implant;

        sheet.getCell("I25").value =
            grandTotals.CCM;

        sheet.getCell("J25").value =
            grandTotals.BBT;

        sheet.getCell("K25").value =
            grandTotals.STM;

        sheet.getCell("L25").value =
            grandTotals.SDM;

        sheet.getCell("M25").value =
            grandTotals.LAM;

        sheet.getCell("N25").value =
            grandTotals.total;

        const buffer = await workbook.xlsx.writeBuffer();

        saveAs(
            new Blob([
                buffer
            ]),
            `Modern_FP_Users_Report_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`
        );

    };

    /*
  =================================
  FILTER MODERN FP USERS
  =================================
  */

    const modernClients = useMemo(() => {

        return clients.filter(client => {

            const method = getMethodLabel(
                getFieldValue(client, [
                    "fp_method",
                    "FP_method",
                    "method",
                    "family_planning_method",
                    "familyPlanningMethod",
                    "method_used",
                    "contraceptive_method",
                    "program"
                ])
            );

            return Boolean(method);

        });

    }, [clients]);

    /*
    =================================
    MONTHLY REPORT
    (SINGLE SOURCE OF TRUTH)
    =================================
    */
    /*
    =================================
    MONTHLY METHOD REPORT
    =================================
    */

    const monthlyMethodReport = useMemo(() => {

        // Initialize all months first
        const report = {};

        monthNames.forEach(month => {

            report[month] = {
                month,
                total: 0
            };

            methodHeaders.forEach(method => {
                report[month][method] = 0;
            });

        });

        // Process every client only once
        modernClients.forEach(client => {

            const month = parseMonth(

                getFieldValue(client, [
                    "created_at",
                    "updated_at",
                    "date",
                    "date_of_service",
                    "service_date",
                    "fp_date",
                    "month"
                ])

            );

            if (!month || !report[month]) return;

            const method = getMethodLabel(

                getFieldValue(client, [
                    "fp_method",
                    "FP_method",
                    "method",
                    "family_planning_method",
                    "familyPlanningMethod",
                    "method_used",
                    "contraceptive_method",
                    "program"
                ])

            );

            if (!method) return;

            report[month].total++;

            report[month][method]++;

        });

        return monthNames.map(month => report[month]);

    }, [modernClients]);

    /*
    =================================
    METHOD COUNTS
    =================================
    */

    const methodCounts = useMemo(() => {

        const counts = {};

        methodHeaders.forEach(method => {

            counts[method] = 0;

        });

        monthlyMethodReport.forEach(row => {

            methodHeaders.forEach(method => {

                counts[method] += row[method];

            });

        });

        return counts;

    }, [monthlyMethodReport]);

    /*
    =================================
    TOTAL USERS
    =================================
    */

    const totalUsers = useMemo(() => {

        return monthlyMethodReport.reduce(

            (sum, row) => sum + row.total,

            0

        );

    }, [monthlyMethodReport]);

    /*
    =================================
    UTILIZATION RATE
    =================================
    */

    const utilizationRate = useMemo(() => {

        if (!clients.length)
            return "0.0";

        return (
            (totalUsers / clients.length) * 100
        ).toFixed(1);

    }, [totalUsers, clients]);

    /*
    =================================
    GRAND TOTALS
    =================================
    */

    const grandTotals = useMemo(() => {

        const totals = {
            month: "GRAND TOTAL",
            total: 0
        };

        methodHeaders.forEach(method => {

            totals[method] = 0;

        });

        monthlyMethodReport.forEach(row => {

            totals.total += row.total;

            methodHeaders.forEach(method => {

                totals[method] += row[method];

            });

        });

        return totals;

    }, [monthlyMethodReport]);

    /*
    =================================
    TOP METHOD
    =================================
    */

    const topMethod = useMemo(() => {

        const highest = Math.max(
            0,
            ...Object.values(methodCounts)
        );

        if (highest === 0)
            return "-";

        return Object.entries(methodCounts)
            .filter(([_, count]) => count === highest)
            .map(([method]) => method)
            .join(", ");

    }, [methodCounts]);

    /*
    =================================
    MONTHLY SUMMARY
    =================================
    */

    const monthlySummary = useMemo(() => {

        return monthlyMethodReport.map(row => {

            const highest = Math.max(
                0,
                ...methodHeaders.map(method => row[method] || 0)
            );

            return {

                month: row.month,

                total: row.total,

                topMethod:

                    highest === 0

                        ? "-"

                        : methodHeaders
                            .filter(method => row[method] === highest)
                            .join(", ")

            };

        });

    }, [monthlyMethodReport]);

    if (loading) {
        return <h3>Loading Modern FP Users report...</h3>;
    }

    if (error) {
        return <div className="modernfp-loading">{error}</div>;
    }

    return (
        <div className="modernfp-container">
            <div className="modernfp-cards">
                <div className="modernfp-card orange">
                    <small>Total Modern FP Users</small>
                    <h2>{totalUsers}</h2>
                </div>

                <div className="modernfp-card purple">
                    <small>Modern FP Utilization</small>
                    <h2>{utilizationRate}%</h2>
                </div>

                <div className="modernfp-card green">
                    <small>Most Used Method</small>
                    <h2>{topMethod}</h2>
                </div>
            </div>

            <div className="modernfp-distribution-card">
                <h3>Modern Family Planning Method Distribution</h3>
                <div className="modernfp-method-grid">
                    <div className="method-column">
                        <h4>Natural Methods</h4>
                        {[
                            "CCM",
                            "BBT",
                            "STM",
                            "SDM",
                            "LAM",
                        ].map((method) => (
                            <div className="method-row" key={method}>
                                <span>{method}</span>
                                <div className="method-progress">
                                    <div
                                        className="method-progress-fill orange"
                                        style={{
                                            width: `${((methodCounts[method] || 0) / (totalUsers || 1)) * 100}%`,
                                        }}
                                    />
                                </div>
                                <strong>{methodCounts[method] || 0}</strong>
                            </div>
                        ))}
                    </div>

                    <div className="method-column">
                        <h4>Long-Acting Methods</h4>
                        {[
                            "IUD",
                            "Implant",
                            "Vasectomy",
                            "Tubal Ligation",
                        ].map((method) => (
                            <div className="method-row" key={method}>
                                <span>{method}</span>
                                <div className="method-progress">
                                    <div
                                        className="method-progress-fill"
                                        style={{
                                            width: `${((methodCounts[method] || 0) / (totalUsers || 1)) * 100}%`,
                                        }}
                                    />
                                </div>
                                <strong>{methodCounts[method] || 0}</strong>
                            </div>
                        ))}
                    </div>

                    <div className="method-column">
                        <h4>Short-Acting Methods</h4>
                        {[
                            "Injectable",
                            "Pills",
                            "Condom",
                        ].map((method) => (
                            <div className="method-row" key={method}>
                                <span>{method}</span>
                                <div className="method-progress">
                                    <div
                                        className="method-progress-fill green"
                                        style={{
                                            width: `${((methodCounts[method] || 0) / (totalUsers || 1)) * 100}%`,
                                        }}
                                    />
                                </div>
                                <strong>{methodCounts[method] || 0}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="monthly-summary">

                <h3>Monthly Summary</h3>

                <table className="monthly-summary-table">

                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Total Modern FP Users</th>
                            <th>Top Method</th>
                        </tr>
                    </thead>

                    <tbody>

                        {monthlySummary.map((item) => (

                            <tr key={item.month}>

                                <td>{item.month}</td>

                                <td>{item.total}</td>

                                <td className="highlight-method">
                                    {item.topMethod || "-"}
                                </td>

                            </tr>

                        ))}

                    </tbody>

                    <tfoot>

                        <tr>

                            <th>TOTAL</th>

                            <th>
                                {monthlySummary.reduce(
                                    (sum, item) => sum + (item.total || 0),
                                    0
                                )}
                            </th>

                            <th>
                                {(() => {

                                    const highest = Math.max(
                                        ...Object.values(methodCounts)
                                    );

                                    if (highest === 0) return "-";

                                    return Object.entries(methodCounts)
                                        .filter(([_, value]) => value === highest)
                                        .map(([method]) => method)
                                        .join(", ");

                                })()}
                            </th>

                        </tr>

                    </tfoot>

                </table>

            </div>

            <div className="modernfp-report-card">
                <div className="modernfp-report-header">
                    <div>
                        <h3>Official Modern FP Users Report</h3>
                        <p>Modern Family Planning Users Summary</p>
                    </div>

                    <div className="modernfp-report-actions">

                        <button className="export-pdf-btn">Export PDF</button>
                        <button className="export-excel-btn">Export Excel</button>
                    </div>
                </div>

                <div className="modernfp-report-table-wrapper">
                    <table className="modernfp-report-table">

                        <thead>

                            <tr>

                                <th>Month</th>

                                <th>Condom</th>

                                <th>IUD</th>

                                <th>Pills</th>

                                <th>Injectable</th>

                                <th>NSV</th>

                                <th>BTL</th>

                                <th>Implant</th>

                                <th>CCM</th>

                                <th>BBT</th>

                                <th>STM</th>

                                <th>SDM</th>

                                <th>LAM</th>

                                <th>Total</th>

                            </tr>

                        </thead>

                        <tbody>

                            {
                                monthlyMethodReport.map((row) => (

                                    <tr key={row.month}>


                                        <td>{row.month}</td>


                                        <td>{row.Condom || ""}</td>

                                        <td>{row.IUD || ""}</td>

                                        <td>{row.Pills || ""}</td>

                                        <td>{row.Injectable || ""}</td>

                                        <td>{row.Vasectomy || ""}</td>

                                        <td>{row["Tubal Ligation"] || ""}</td>

                                        <td>{row.Implant || ""}</td>

                                        <td>{row.CCM || ""}</td>

                                        <td>{row.BBT || ""}</td>

                                        <td>{row.STM || ""}</td>

                                        <td>{row.SDM || ""}</td>

                                        <td>{row.LAM || ""}</td>


                                        <td>
                                            {row.total || ""}
                                        </td>


                                    </tr>


                                ))

                            }

                        </tbody>

                        <tfoot>

                            <tr>

                                <th>
                                    GRAND TOTAL
                                </th>


                                <th>{grandTotals.Condom}</th>

                                <th>{grandTotals.IUD}</th>

                                <th>{grandTotals.Pills}</th>

                                <th>{grandTotals.Injectable}</th>

                                <th>{grandTotals.Vasectomy}</th>

                                <th>{grandTotals["Tubal Ligation"]}</th>

                                <th>{grandTotals.Implant}</th>

                                <th>{grandTotals.CCM}</th>

                                <th>{grandTotals.BBT}</th>

                                <th>{grandTotals.STM}</th>

                                <th>{grandTotals.SDM}</th>

                                <th>{grandTotals.LAM}</th>


                                <th>
                                    {grandTotals.total}
                                </th>


                            </tr>


                        </tfoot>
                    </table>

                </div>

            </div>
        </div>
    );
}

export default ModernFPUsersAnalytics;