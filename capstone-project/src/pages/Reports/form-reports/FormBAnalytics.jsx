import { useMemo, Fragment } from "react";
import "./FormBAnalytics.css";
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

function getMonth(client) {

    const value = getFieldValue(client, [

        "month",
        "report_month",
        "created_at",
        "updated_at",
        "date"

    ]);

    if (!value) return "";

    if (value?.toDate) {

        const date = value.toDate();

        return monthNames[date.getMonth()];

    }

    const date = new Date(value);

    if (!isNaN(date)) {

        return monthNames[date.getMonth()];

    }

    const text = String(value).toLowerCase();

    return (

        monthNames.find(month =>

            text.includes(month.toLowerCase())

        ) || ""

    );

}

function FormBAnalytics({

    clients = [],

    loading = false,

    error = "",

}) {


    const exportOfficialExcel = async () => {

        try {

            const response = await fetch(
                "/templates/FormB_Template.xlsx"
            );

            const buffer = await response.arrayBuffer();

            const workbook = new ExcelJS.Workbook();

            await workbook.xlsx.load(buffer);

            const sheet = workbook.worksheets[0];

            // January starts on row 14
            let currentRow = 14;

            monthNames.forEach(month => {

                const row = analytics.monthly[month];

                // Month
                sheet.getCell(`A${currentRow}`).value = month;

                // Couples with unmet need
                sheet.getCell(`B${currentRow}`).value = row.unmet;

                // Clients referred / served
                sheet.getCell(`C${currentRow}`).value = row.referred;

                // Traditional FP
                sheet.getCell(`D${currentRow}`).value = row.traditionalNoShift;
                sheet.getCell(`E${currentRow}`).value = row.traditionalShift;

                // Traditional FP referred
                sheet.getCell(`F${currentRow}`).value = row.traditionalReferred;

                // Total unmet need
                sheet.getCell(`G${currentRow}`).value = row.totalUnmet;

                // Total referred / served
                sheet.getCell(`H${currentRow}`).value = row.totalReferred;

                currentRow++;

            });

            // Grand Total row
            const grandRow = 26;

            sheet.getCell(`A${grandRow}`).value = "GRAND TOTAL";

            sheet.getCell(`B${grandRow}`).value =
                analytics.unmetNeed;

            sheet.getCell(`C${grandRow}`).value =
                analytics.referredServed;

            sheet.getCell(`D${grandRow}`).value =
                analytics.traditionalNoShift;

            sheet.getCell(`E${grandRow}`).value =
                analytics.traditionalShift;

            sheet.getCell(`F${grandRow}`).value =
                analytics.traditionalReferred;

            sheet.getCell(`G${grandRow}`).value =
                analytics.unmetNeed +
                analytics.traditionalNoShift +
                analytics.traditionalShift;

            sheet.getCell(`H${grandRow}`).value =
                analytics.referredServed +
                analytics.traditionalReferred;

            const excelBuffer =
                await workbook.xlsx.writeBuffer();

            saveAs(
                new Blob([excelBuffer]),
                "Official_Form_B_Report.xlsx"
            );

        }
        catch (error) {

            console.error(error);

            alert("Failed to export Form B.");

        }

    };

    const analytics = useMemo(() => {

        const monthly = {};

        monthNames.forEach(month => {

            monthly[month] = {

                unmet: 0,

                referred: 0,

                traditionalNoShift: 0,

                traditionalShift: 0,

                traditionalReferred: 0,

                traditional: 0,

                totalUnmet: 0,

                totalReferred: 0,

            };

        });

        const traditionalMethods = [

            "withdrawal",
            "calendar",
            "rhythm",
            "billings",
            "standard",
            "days",
            "lam",
            "lactational",
            "bbt",
            "sympto"

        ];

        let unmetNeed = 0;

        let referredServed = 0;

        let traditionalNoShift = 0;

        let traditionalShift = 0;

        let traditionalReferred = 0;

        clients.forEach(client => {

            if (client.is_archived) return;

            const month = getMonth(client);

            if (!month) return;

            const row = monthly[month];

            const method = normalize(
                getFieldValue(client, [
                    "fp_method",
                    "method"
                ])
            );

            const shiftOption = normalize(
                getFieldValue(client, [
                    "with_intention_to_shift",
                    "intention_to_shift"
                ])
            );

            const status = normalize(
                getFieldValue(client, [
                    "status"
                ])
            );

            const isTraditional = traditionalMethods.some(item =>
                method.includes(item)
            );

            /*
            ==================================
            COUPLES WITH UNMET NEED
            ==================================
            */

            if (!method && status !== "inactive") {

                unmetNeed++;

                row.unmet++;

            }

            /*
            ==================================
            CLIENTS REFERRED / SERVED
            ==================================
            */

            if (client.sourceCollection === "clients_referred") {

                referredServed++;

                row.referred++;

            }

            /*
            ==================================
            TRADITIONAL FP USERS
            ==================================
            */

            if (isTraditional) {

                row.traditional++;

                /*
                WITHOUT INTENTION
                */

                if (

                    shiftOption === "no intention" ||

                    shiftOption === "no intention to shift"

                ) {

                    traditionalNoShift++;

                    row.traditionalNoShift++;

                }

                /*
                WITH INTENTION
                */

                else if (shiftOption) {

                    traditionalShift++;

                    row.traditionalShift++;

                }

                /*
                REFERRED
                */

                if (client.sourceCollection === "clients_referred") {

                    traditionalReferred++;

                    row.traditionalReferred++;

                }

            }

            row.totalUnmet =

                row.unmet +

                row.traditionalNoShift +

                row.traditionalShift;

            row.totalReferred =

                row.referred +

                row.traditionalReferred;

        });

        return {

            monthly,

            unmetNeed,

            referredServed,

            traditionalNoShift,

            traditionalShift,

            traditionalReferred,

            traditionalUsers:

                traditionalNoShift +

                traditionalShift

        };

    }, [clients]);

    if (loading) {

        return (

            <div className="form-b-loading">

                Loading Form B...

            </div>

        );

    }

    if (error) {

        return (

            <div className="form-b-loading">

                {error}

            </div>

        );

    }

    const exportPDF = () => {

        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4",
        });

        doc.setFontSize(16);
        doc.text("Official Form B Report", 14, 15);

        doc.setFontSize(10);
        doc.text(
            "Responsible Parenthood and Family Planning",
            14,
            22
        );

        autoTable(doc, {
            startY: 30,

            head: [[
                "Month",
                "Couples with\nUnmet Need",
                "Clients\nReferred / Served",
                "Traditional FP\nWithout Intention",
                "Traditional FP\nWith Intention",
                "Traditional FP\nReferred",
                "Total\nUnmet Need",
                "Total\nReferred / Served"
            ]],

            body: monthNames.map(month => {

                const row = analytics.monthly[month];

                return [

                    month,

                    row.unmet,

                    row.referred,

                    row.traditionalNoShift,

                    row.traditionalShift,

                    row.traditionalReferred,

                    row.totalUnmet,

                    row.totalReferred,

                ];

            }),

            foot: [[

                "GRAND TOTAL",

                analytics.unmetNeed,

                analytics.referredServed,

                analytics.traditionalNoShift,

                analytics.traditionalShift,

                analytics.traditionalReferred,

                analytics.unmetNeed +
                analytics.traditionalNoShift +
                analytics.traditionalShift,

                analytics.referredServed +
                analytics.traditionalReferred,

            ]],

            theme: "grid",

            styles: {
                fontSize: 8,
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
                0: { cellWidth: 35 },
                1: { cellWidth: 30 },
                2: { cellWidth: 32 },
                3: { cellWidth: 32 },
                4: { cellWidth: 32 },
                5: { cellWidth: 30 },
                6: { cellWidth: 28 },
                7: { cellWidth: 30 },
            },
        });

        doc.save("Official_Form_B_Report.pdf");
    };



    return (

        <div className="form-b-container">

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
                        {
                            analytics.unmetNeed +
                            analytics.traditionalNoShift +
                            analytics.traditionalShift
                        }
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
                        <strong>
                            {
                                analytics.unmetNeed +
                                analytics.traditionalNoShift +
                                analytics.traditionalShift
                            }
                        </strong>
                    </div>

                    <div className="summary-row">
                        <span>Total Clients Referred</span>
                        <strong>
                            {
                                analytics.referredServed +
                                analytics.traditionalReferred
                            }
                        </strong>
                    </div>

                </div>

            </div>


            {/* ==========================
            MONTHLY SUMMARY
        ========================== */}

            <div className="monthly-summary">

                <h3>
                    Monthly Summary
                </h3>

                <table className="monthly-summary-table">

                    <thead>

                        <tr>

                            <th>Month</th>

                            <th>Couples with Unmet Need</th>

                            <th>Clients Referred / Served</th>

                            <th>Traditional Without Shift</th>

                            <th>Traditional With Shift</th>

                            <th>Traditional Referred</th>

                            <th>Total Unmet Need</th>

                            <th>Total Referred</th>

                        </tr>

                    </thead>

                    <tbody>

                        {monthNames.map(month => {

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

                        })}

                    </tbody>

                    <tfoot>

                        <tr>

                            <th>TOTAL</th>

                            <th>{analytics.unmetNeed}</th>

                            <th>{analytics.referredServed}</th>

                            <th>{analytics.traditionalNoShift}</th>

                            <th>{analytics.traditionalShift}</th>

                            <th>{analytics.traditionalReferred}</th>

                            <th>
                                {
                                    analytics.unmetNeed +
                                    analytics.traditionalNoShift +
                                    analytics.traditionalShift
                                }
                            </th>

                            <th>
                                {
                                    analytics.referredServed +
                                    analytics.traditionalReferred
                                }
                            </th>

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

                            Official Form B Report

                        </h2>

                        <p>

                            Responsible Parenthood and Family Planning

                        </p>

                    </div>

                    <div className="report-buttons">



                        <button
                            className="pdf-btn"
                            onClick={exportPDF}
                        >
                            Export PDF
                        </button>

                        <button
                            className="excel-btn"
                            onClick={exportOfficialExcel}
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

                                monthNames.map((month) => {

                                    const row = analytics.monthly[month];

                                    return (

                                        <tr key={month}>

                                            <td>

                                                {month}

                                            </td>

                                            {/* Couples with Unmet Need */}

                                            <td>

                                                {row.unmet}

                                            </td>

                                            {/* Clients Referred / Served */}

                                            <td>

                                                {row.referred}

                                            </td>

                                            {/* Traditional Without Intention */}

                                            <td>

                                                {row.traditionalNoShift}

                                            </td>

                                            {/* Traditional With Intention */}

                                            <td>

                                                {row.traditionalShift}

                                            </td>

                                            {/* Traditional FP Referred */}

                                            <td>

                                                {row.traditionalReferred}

                                            </td>

                                            {/* Total Unmet Need */}

                                            <td>

                                                {row.totalUnmet}

                                            </td>

                                            {/* Total Referred */}

                                            <td>

                                                {row.totalReferred}

                                            </td>

                                        </tr>

                                    );

                                })

                            }

                        </tbody>

                        <tfoot>

                            <tr>

                                <th className="grand-total-title">

                                    GRAND TOTAL

                                </th>

                                {/* Couples with Unmet Need */}

                                <th>

                                    {analytics.unmetNeed}

                                </th>

                                {/* Clients Referred / Served */}

                                <th>

                                    {analytics.referredServed}

                                </th>

                                {/* Traditional FP Without Intention */}

                                <th>

                                    {analytics.traditionalNoShift}

                                </th>

                                {/* Traditional FP With Intention */}

                                <th>

                                    {analytics.traditionalShift}

                                </th>

                                {/* Traditional FP Referred / Served */}

                                <th>

                                    {analytics.traditionalReferred}

                                </th>

                                {/* Total Unmet Need */}

                                <th>

                                    {analytics.unmetNeed +
                                        analytics.traditionalNoShift +
                                        analytics.traditionalShift}

                                </th>

                                {/* Total Clients Referred / Served */}

                                <th>

                                    {analytics.referredServed}

                                </th>

                            </tr>

                        </tfoot>

                    </table>

                </div>

            </div>

        </div>

    );

}

export default FormBAnalytics;