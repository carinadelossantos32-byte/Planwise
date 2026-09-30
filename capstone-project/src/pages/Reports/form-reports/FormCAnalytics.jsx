import { useMemo, Fragment } from "react";
import "./FormCAnalytics.css";
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

const methodCatalog = [
    {
        category: "Natural Methods",
        methods: [
            { name: "CCM", aliases: ["ccm", "billings"] },
            { name: "BBT", aliases: ["bbt"] },
            { name: "STM", aliases: ["stm", "sympto", "sympto thermal"] },
            { name: "SDM", aliases: ["sdm"] },
            { name: "LAM", aliases: ["lam"] },
        ],
    },
    {
        category: "Long-Acting Methods",
        methods: [
            { name: "IUD", aliases: ["iud"] },
            { name: "Implant", aliases: ["implant"] },
            { name: "NSV", aliases: ["vasectomy", "nsv, NSV"] },
            { name: "BTL", aliases: ["tubal ligation", "btl, BTL"] },
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

const summaryColors = [
    "#16a34a",
    "#2563eb",
    "#ea580c",
];

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

        }

        else {

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

function getMonth(client) {

    const value =
        getFieldValue(client, [

            "created_at",
            "updated_at",
            "date",
            "month",
            "report_month",
            "service_month"

        ]);

    if (!value) return "";

    if (value?.toDate) {

        const d = value.toDate();

        return monthNames[d.getMonth()];

    }

    const d = new Date(value);

    if (!isNaN(d)) {

        return monthNames[d.getMonth()];

    }

    const text =
        String(value).toLowerCase();

    return (
        monthNames.find(month =>
            text.includes(month.toLowerCase())
        ) || ""
    );

}

function getMethod(client) {

    const value = normalize(

        getFieldValue(client, [

            "fp_method",
            "FP_method",
            "method",
            "family_planning_method",
            "preferred_method",
            "service_method"

        ])

    );

    for (const category of methodCatalog) {

        for (const method of category.methods) {

            if (
                method.aliases.some(alias =>
                    value.includes(alias)
                )
            ) {

                return method.name;

            }

        }

    }

    return "";

}

function isArchived(client) {

    return (
        client?.is_archived === true ||
        client?.archived === true
    );

}
function FormCAnalytics({ clients = [], loading = false, error = "" }) {



    const exportPDF = () => {
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
                "FORM C - Individuals Referred and Served with Unmet Need for Modern Family Planning",
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



                styles: {
                    font: "times",
                    fontSize: 7,
                    halign: "center",
                    valign: "middle",
                    lineWidth: 0.1,
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

                body: monthNames.map(month => {

                    const row =
                        analytics.monthly[month];

                    return [
                        month,
                        row.Condom,
                        row.IUD,
                        row.Pills,
                        row.Injectable,
                        row.NSV,
                        row.BTL,
                        row.Implant,
                        row.CCM,
                        row.BBT,
                        row.STM,
                        row.SDM,
                        row.LAM,
                        row.total
                    ];

                }),

                foot: [[

                    "GRAND TOTAL",

                    analytics.methods.Condom,
                    analytics.methods.IUD,
                    analytics.methods.Pills,
                    analytics.methods.Injectable,
                    analytics.methods.NSV,
                    analytics.methods.BTL,
                    analytics.methods.Implant,
                    analytics.methods.CCM,
                    analytics.methods.BBT,
                    analytics.methods.STM,
                    analytics.methods.SDM,
                    analytics.methods.LAM,
                    analytics.totalRecords

                ]],

                theme: "grid",

                styles: {
                    fontSize: 7,
                    halign: "center",
                    valign: "middle",
                    cellPadding: 2,
                    lineWidth: 0.1,
                },

                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontStyle: "bold",
                    fontSize: 7,
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

            // ==========================
            // SAVE
            // ==========================

            doc.save(
                "Official_Form_C_Report.pdf"
            );

        } catch (error) {

            console.error(
                "Form C PDF export error:",
                error
            );

            alert(
                "Failed to export Form C PDF."
            );

        }
    };

    const exportOfficialExcel = async () => {

        try {

            const response = await fetch("/templates/FormC_Template.xlsx");

            const buffer = await response.arrayBuffer();

            const workbook = new ExcelJS.Workbook();

            await workbook.xlsx.load(buffer);

            const sheet = workbook.worksheets[0];

            /*
                January starts at Row 13
            */

            let currentRow = 13;

            monthNames.forEach(month => {

                const row = analytics.monthly[month];

                sheet.getCell(`A${currentRow}`).value = month;

                sheet.getCell(`B${currentRow}`).value = row.Condom;
                sheet.getCell(`C${currentRow}`).value = row.IUD;
                sheet.getCell(`D${currentRow}`).value = row.Pills;
                sheet.getCell(`E${currentRow}`).value = row.Injectable;
                sheet.getCell(`F${currentRow}`).value = row.NSV;
                sheet.getCell(`G${currentRow}`).value = row.BTL;
                sheet.getCell(`H${currentRow}`).value = row.Implant;
                sheet.getCell(`I${currentRow}`).value = row.CCM;
                sheet.getCell(`J${currentRow}`).value = row.BBT;
                sheet.getCell(`K${currentRow}`).value = row.STM;
                sheet.getCell(`L${currentRow}`).value = row.SDM;
                sheet.getCell(`M${currentRow}`).value = row.LAM;
                sheet.getCell(`N${currentRow}`).value = row.total;

                currentRow++;

            });

            /*
            ==========================
                GRAND TOTAL
            ==========================
            */

            const grandRow = 25;

            sheet.getCell(`A${grandRow}`).value = "GRAND TOTAL";

            sheet.getCell(`B${grandRow}`).value = analytics.methods.Condom;
            sheet.getCell(`C${grandRow}`).value = analytics.methods.IUD;
            sheet.getCell(`D${grandRow}`).value = analytics.methods.Pills;
            sheet.getCell(`E${grandRow}`).value = analytics.methods.Injectable;
            sheet.getCell(`F${grandRow}`).value = analytics.methods.NSV;
            sheet.getCell(`G${grandRow}`).value = analytics.methods.BTL;
            sheet.getCell(`H${grandRow}`).value = analytics.methods.Implant;
            sheet.getCell(`I${grandRow}`).value = analytics.methods.CCM;
            sheet.getCell(`J${grandRow}`).value = analytics.methods.BBT;
            sheet.getCell(`K${grandRow}`).value = analytics.methods.STM;
            sheet.getCell(`L${grandRow}`).value = analytics.methods.SDM;
            sheet.getCell(`M${grandRow}`).value = analytics.methods.LAM;
            sheet.getCell(`N${grandRow}`).value = analytics.totalRecords;

            const excelBuffer = await workbook.xlsx.writeBuffer();

            saveAs(
                new Blob([excelBuffer]),
                "Official_Form_C_Report.xlsx"
            );

        }

        catch (error) {

            console.error(error);

            alert("Failed to export Form C.");

        }

    };

    const analytics = useMemo(() => {


        const methodNames =
            methodCatalog.flatMap(group =>
                group.methods.map(method => method.name)
            );

        const methodCounts = {};

        methodNames.forEach(name => {

            methodCounts[name] = 0;

        });

        const monthly = {};

        monthNames.forEach(month => {

            monthly[month] = {

                month,

                total: 0,

                referred: 0,

                unmetNeed: 0,

                ...Object.fromEntries(
                    methodNames.map(name => [name, 0])
                )

            };

        });

        let totalRecords = 0;

        let totalReferredServed = 0;

        let totalUnmetNeed = 0;

        let totalRecognizedMethods = 0;

        clients.forEach(client => {

            if (isArchived(client)) return;

            const month = getMonth(client);

            if (!month) return;

            const row = monthly[month];

            const method = getMethod(client);

            totalRecords++;

            row.total++;

            /*
            =====================================
            REFERRED / SERVED
            =====================================
            */

            if (
                client.sourceCollection ===
                "clients_referred"
            ) {

                totalReferredServed++;

                row.referred++;

            }

            /*
            =====================================
            UNMET NEED
            =====================================
            */

            else {

                totalUnmetNeed++;

                row.unmetNeed++;

            }

            /*
            =====================================
            FAMILY PLANNING METHOD
            =====================================
            */

            if (
                method &&
                methodCounts.hasOwnProperty(method)
            ) {

                methodCounts[method]++;

                row[method]++;

                totalRecognizedMethods++;

            }

        });

        const monthlySummary = monthNames.map(month => {

            const row = monthly[month];

            const highest = Math.max(

                ...methodNames.map(name => row[name])

            );

            let topMethod = "-";

            if (highest > 0) {

                topMethod = methodNames

                    .filter(name => row[name] === highest)

                    .join(", ");

            }

            return {

                ...row,

                topMethod,

            };

        });

        const categorySummary = methodCatalog.map(

            (group, index) => ({

                category: group.category,

                methods: group.methods.map(method => {

                    const count =
                        methodCounts[method.name];

                    return {

                        ...method,

                        count,

                        percent:

                            totalRecognizedMethods

                                ? Math.round(

                                    count /

                                    totalRecognizedMethods *

                                    100

                                )

                                : 0,

                        color:
                            summaryColors[
                            index %
                            summaryColors.length
                            ],

                    };

                })

            })

        );

        return {

            monthly,

            monthlySummary,

            categorySummary,

            methods: methodCounts,

            totalRecords,

            totalRecognizedMethods,

            totalReferredServed,

            totalUnmetNeed,

        };

    }, [clients]);
    if (loading) {
        return <div className="form-c-loading">Loading Form C...</div>;
    }

    if (error) {
        return <div className="form-c-loading">{error}</div>;
    }

    return (
        <div className="form-c-container">
            {/* =========================================
   KPI CARDS
========================================= */}

            <div className="form-c-cards">

                <div className="form-c-card blue">

                    <small>Total Records</small>

                    <h2>{analytics.totalRecords}</h2>

                </div>

                <div className="form-c-card green">

                    <small>Individuals Referred & Served</small>

                    <h2>{analytics.totalReferredServed}</h2>

                </div>

                <div className="form-c-card orange">

                    <small>Individuals with Unmet Need</small>

                    <h2>{analytics.totalUnmetNeed}</h2>

                </div>

            </div>


            {/* =========================================
   METHOD SUMMARY
========================================= */}

            <div className="form-c-summary-card">

                <h3>

                    Family Planning Methods Summary

                </h3>

                <div className="method-summary-grid">

                    {

                        analytics.categorySummary.map(group => (

                            <div
                                key={group.category}
                                className="method-category"
                            >

                                <h4>

                                    {group.category}

                                </h4>

                                {

                                    group.methods.map(method => (

                                        <div
                                            key={method.name}
                                            className="method-row"
                                        >

                                            <span>

                                                {method.name}

                                            </span>

                                            <div className="method-progress">

                                                <div

                                                    className="method-progress-fill"

                                                    style={{

                                                        width: `${method.percent}%`,

                                                        background: method.color,

                                                    }}

                                                />

                                            </div>

                                            <strong>

                                                {method.count}

                                            </strong>

                                        </div>

                                    ))

                                }

                            </div>

                        ))

                    }

                </div>

            </div>

            {/* =========================================
    MONTHLY SUMMARY
========================================= */}

            <div className="form-c-monthly-card">

                <h3>

                    Monthly Summary

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

                        {

                            analytics.monthlySummary.map(row => (

                                <tr key={row.month}>

                                    <td>

                                        {row.month}

                                    </td>

                                    <td>

                                        {row.unmetNeed}

                                    </td>

                                    <td>

                                        {row.referred}

                                    </td>

                                    <td className="highlight-method">

                                        {row.topMethod}

                                    </td>

                                    <td>

                                        {row.total}

                                    </td>

                                </tr>

                            ))

                        }

                    </tbody>

                    <tfoot>

                        <tr>

                            <th>

                                TOTAL

                            </th>

                            <th>

                                {analytics.totalUnmetNeed}

                            </th>

                            <th>

                                {analytics.totalReferredServed}

                            </th>

                            <th>

                                {

                                    (() => {

                                        const highest = Math.max(

                                            ...Object.values(
                                                analytics.methods
                                            )

                                        );

                                        if (highest === 0)

                                            return "-";

                                        return Object.entries(
                                            analytics.methods
                                        )

                                            .filter(
                                                ([, value]) =>
                                                    value === highest
                                            )

                                            .map(
                                                ([method]) => method
                                            )

                                            .join(", ");

                                    })()

                                }

                            </th>

                            <th>

                                {analytics.totalRecords}

                            </th>

                        </tr>

                    </tfoot>

                </table>

            </div>

            <div className="official-report-card">
                <div className="official-report-header">
                    <div>
                        <h3>Official Form C Report</h3>
                        <p>Individuals Referred and Served with Unmet Need for Modern Family Planning</p>
                    </div>
                    <div className="report-buttons">

                        <button
                            type="button"
                            className="pdf-btn"
                            onClick={exportPDF}
                        >
                            Export PDF
                        </button>
                        <button
                            type="button"
                            className="excel-btn"
                            onClick={exportOfficialExcel}
                        >
                            Export Excel
                        </button>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="official-report-table">
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

                                monthNames.map((month) => {

                                    const row =
                                        analytics.monthly[month];

                                    const quarterMonths = {

                                        March: [

                                            "January",
                                            "February",
                                            "March"

                                        ],

                                        June: [

                                            "April",
                                            "May",
                                            "June"

                                        ],

                                        September: [

                                            "July",
                                            "August",
                                            "September"

                                        ],

                                        December: [

                                            "October",
                                            "November",
                                            "December"

                                        ],

                                    };

                                    const isQuarterEnd =
                                        Object.keys(quarterMonths)
                                            .includes(month);

                                    return (

                                        <Fragment key={month}>

                                            {/* MONTH ROW */}

                                            <tr>

                                                <td>{month}</td>

                                                <td>{row.Condom}</td>

                                                <td>{row.IUD}</td>

                                                <td>{row.Pills}</td>

                                                <td>{row.Injectable}</td>

                                                <td>{row.NSV}</td>

                                                <td>{row.BTL}</td>

                                                <td>{row.Implant}</td>

                                                <td>{row.CCM}</td>

                                                <td>{row.BBT}</td>

                                                <td>{row.STM}</td>

                                                <td>{row.SDM}</td>

                                                <td>{row.LAM}</td>

                                                <td>{row.total}</td>

                                            </tr>



                                        </Fragment>

                                    );

                                })

                            }

                        </tbody>
                        <tfoot>

                            <tr>

                                <th className="grand-total-title">

                                    GRAND TOTAL

                                </th>

                                <th>

                                    {analytics.methods.Condom}

                                </th>

                                <th>

                                    {analytics.methods.IUD}

                                </th>

                                <th>

                                    {analytics.methods.Pills}

                                </th>

                                <th>

                                    {analytics.methods.Injectable}

                                </th>

                                <th>

                                    {analytics.methods.NSV}

                                </th>

                                <th>

                                    {analytics.methods.BTL}

                                </th>

                                <th>

                                    {analytics.methods.Implant}

                                </th>

                                <th>

                                    {analytics.methods.CCM}

                                </th>

                                <th>

                                    {analytics.methods.BBT}

                                </th>

                                <th>

                                    {analytics.methods.STM}

                                </th>

                                <th>

                                    {analytics.methods.SDM}

                                </th>

                                <th>

                                    {analytics.methods.LAM}

                                </th>

                                <th>

                                    {analytics.totalRecords}

                                </th>

                            </tr>

                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default FormCAnalytics;
