import "./ModernShifters.css";
import { useMemo } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


function ModernShifters({


    clients = [],
    loading
}) {


    const exportModernShiftersPDF = () => {


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
                "MODERN FP USER WITH INTENTION TO SHIFT TO OTHER MODERN FP METHOD",
                148,
                40,
                { align: "center" }
            );

            // ==========================
            // METHODS
            // ==========================

            const pdfMethods = [
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
            ];

            // ==========================
            // MONTHLY TABLE
            // ==========================

            const tableBody = monthlySummary.map((row) => {

                const monthData = shifters.filter((client) => {

                    if (!client.intention_to_shift)
                        return false;

                    const date = client.created_at?.toDate
                        ? client.created_at.toDate()
                        : null;

                    if (!date)
                        return false;

                    const monthName = date.toLocaleString(
                        "default",
                        {
                            month: "long"
                        }
                    );

                    return monthName === row.month;

                });

                const getCount = (method) => {

                    return monthData.filter((client) =>
                        normalizeMethod(
                            client.intention_to_shift
                        ) === method
                    ).length;

                };

                return [
                    row.month,

                    getCount("Condom"),
                    getCount("IUD"),
                    getCount("Pills"),
                    getCount("Injectable"),
                    getCount("NSV"),
                    getCount("BTL"),
                    getCount("Implant"),
                    getCount("CCM"),
                    getCount("BBT"),
                    getCount("STM"),
                    getCount("SDM"),
                    getCount("LAM"),

                    row.total,
                ];

            });

            // ==========================
            // GRAND TOTAL
            // ==========================

            const grandTotalRow = [
                "GRAND TOTAL",

                ...pdfMethods.map((method) =>
                    shifters.filter((client) =>
                        normalizeMethod(
                            client.intention_to_shift
                        ) === method
                    ).length
                ),

                totalShifters,
            ];

            // ==========================
            // PDF TABLE
            // ==========================

            autoTable(doc, {

                startY: 46,

                theme: "grid",

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

                headStyles: {
                    fillColor: [0, 166, 81],
                    textColor: 255,
                    fontStyle: "bold",
                    fontSize: 7,
                },

                footStyles: {
                    fillColor: [38, 90, 200],
                    textColor: 255,
                    fontStyle: "bold",
                    fontSize: 7,
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
                    "Total",
                ]],

                body: tableBody,

                foot: [
                    grandTotalRow
                ],

            });

            // ==========================
            // SAVE
            // ==========================

            doc.save(
                `Modern_FP_Shifters_Report_${new Date()
                    .toISOString()
                    .slice(0, 10)}.pdf`
            );

        } catch (error) {

            console.error(
                "Failed to export Modern FP Shifters PDF:",
                error
            );

            alert(
                "Failed to export Modern FP Shifters PDF."
            );

        }


    };



    const exportModernShiftersExcel = async () => {

        const workbook = new ExcelJS.Workbook();

        await workbook.xlsx.load(
            await fetch("/templates/ModernFPShifters_Template.xlsx")
                .then(res => res.arrayBuffer())
        );

        const sheet = workbook.getWorksheet(1);

        const methods = [
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
        ];

        const months = [
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

        const startRow = 13;

        months.forEach((month, index) => {

            const excelRow = startRow + index;

            sheet.getCell(`A${excelRow}`).value = month;

            let rowTotal = 0;

            methods.forEach((method, i) => {

                const count = shifters.filter(client => {

                    if (!client.intention_to_shift)
                        return false;

                    const date = client.created_at?.toDate
                        ? client.created_at.toDate()
                        : null;

                    if (!date)
                        return false;

                    const monthName = date.toLocaleString(
                        "default",
                        { month: "long" }
                    );

                    return (
                        monthName === month &&
                        normalizeMethod(client.intention_to_shift) === method
                    );

                }).length;

                sheet.getCell(excelRow, i + 2).value = count;

                rowTotal += count;

            });

            sheet.getCell(`N${excelRow}`).value = rowTotal;

        });

        // GRAND TOTAL

        sheet.getCell("A25").value = "GRAND TOTAL";

        methods.forEach((method, i) => {

            const total = shifters.filter(client =>
                normalizeMethod(client.intention_to_shift) === method
            ).length;

            sheet.getCell(25, i + 2).value = total;

        });

        sheet.getCell("N25").value = totalShifters;

        const buffer = await workbook.xlsx.writeBuffer();

        saveAs(
            new Blob([buffer]),
            `Modern_FP_Shifters_Report_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`
        );

    };





    const displayMethod = (method) => {
        switch (method) {
            case "NSV":
                return "Vasectomy";
            case "BTL":
                return "Tubal Ligation";
            case "CCM":
                return "CCM";
            default:
                return method;
        }
    };


    if (loading) {
        return (
            <div className="analytics-loading">
                Loading analytics...
            </div>
        );
    }

    /* -------------------------------- */
    /* MODERN FP USERS                  */
    /* -------------------------------- */

    const modernUsers = clients.filter(client =>
        client.fp_method &&
        client.fp_method !== ""
    );

    /* -------------------------------- */
    /* MODERN FP SHIFTERS               */
    /* -------------------------------- */

    const normalizeMethod = (value) => {
        if (!value) return "";

        const normalized = value.toString().trim().toLowerCase();

        const methodMap = {
            condom: "Condom",
            pills: "Pills",
            injectable: "Injectable",
            iud: "IUD",
            implant: "Implant",
            subdermal: "Implant",
            nsv: "NSV",
            vasectomy: "NSV",
            btl: "BTL",
            "tubal ligation": "BTL",
            ccm: "CCM",
            ccm: "CCM",
            bbt: "BBT",
            stm: "STM",
            "sympto-thermal": "STM",
            "sympto thermal": "STM",
            sdM: "SDM",
            sdm: "SDM",
            lam: "LAM",
        };

        return methodMap[normalized] || value.toString().trim();
    };

    const methods = [
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
        "LAM"
    ];

    const shifters = modernUsers.filter(client => {
        const currentMethod = normalizeMethod(client.fp_method);
        const shiftMethod = normalizeMethod(client.intention_to_shift);

        return (
            currentMethod &&
            shiftMethod &&
            methods.includes(currentMethod) &&
            methods.includes(shiftMethod)
        );
    });

    /* -------------------------------- */
    /* TOTALS                           */
    /* -------------------------------- */

    const totalModernUsers = modernUsers.length;

    const totalShifters = shifters.length;

    /* -------------------------------- */
    /* MOST PREFERRED METHOD            */
    /* -------------------------------- */

    const preferredMethods = {};

    shifters.forEach(client => {

        const method = normalizeMethod(client.intention_to_shift);

        if (!preferredMethods[method]) {
            preferredMethods[method] = 0;
        }

        preferredMethods[method]++;

    });

    let mostPreferredMethod = "-";

    if (Object.keys(preferredMethods).length > 0) {

        mostPreferredMethod = Object.entries(preferredMethods)

            .sort((a, b) => b[1] - a[1])[0][0];

    }

    /* -------------------------------- */
    /* METHODS BY CATEGORY              */
    /* -------------------------------- */

    const naturalMethods = [
        "CCM",
        "BBT",
        "STM",
        "SDM",
        "LAM"
    ];

    const longMethods = [
        "IUD",
        "Implant",
        "Vasectomy",
        "Tubal Ligation"
    ];

    const shortMethods = [
        "Pills",
        "Condom",
        "Injectable"
    ];



    const shifterCount = method => preferredMethods[method] || 0;

    const percentage = method => {

        if (totalShifters === 0) return 0;

        return (
            (shifterCount(method) /
                totalShifters) *
            100
        ).toFixed(1);

    };

    /* -------------------------------- */
    /* MONTHLY SUMMARY                  */
    /* -------------------------------- */

    const months = [

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
        "December"

    ];

    const monthlySummary = months.map(month => {

        const count = shifters.filter(client => {

            if (!client.created_at) return false;

            const date =
                client.created_at.toDate();

            return (
                date.toLocaleString("default", {
                    month: "long"
                }) === month
            );

        });

        let topMethod = "-";

        if (count.length > 0) {

            const temp = {};

            count.forEach(client => {

                const method = normalizeMethod(client.intention_to_shift);

                temp[method] = (temp[method] || 0) + 1;

            });

            topMethod =
                Object.entries(temp)
                    .sort(
                        (a, b) =>
                            b[1] - a[1]
                    )[0][0];

        }

        return {

            month,

            total: count.length,

            topMethod

        };

    });

    return (

        <div className="modern-shifters">

            {/* KPI CARDS */}

            <div className="analytics-cards">

                <div className="analytics-card orange">

                    <h4>Total Modern FP Users</h4>

                    <span>{totalModernUsers}</span>

                </div>

                <div className="analytics-card purple">

                    <h4>Modern FP Shifters</h4>

                    <span>{totalShifters}</span>

                </div>

                <div className="analytics-card green">

                    <h4>Most Preferred Method</h4>

                    <span>{displayMethod(mostPreferredMethod)}</span>
                </div>

            </div>

            {/* ========================================= */}
            {/* PREFERRED METHODS DISTRIBUTION */}
            {/* ========================================= */}

            <div className="analytics-panel">

                <h3>
                    Preferred Modern FP Methods Among Shifters
                </h3>

                <div className="methods-grid">

                    {/* Natural */}

                    <div>

                        <h4>Natural Methods</h4>

                        {naturalMethods.map(method => (

                            <div
                                className="method-row"
                                key={method}
                            >

                                <span>{method}</span>

                                <div className="progress">

                                    <div
                                        className="progress-fill"
                                        style={{
                                            width:
                                                `${percentage(method)}%`
                                        }}
                                    />

                                </div>

                                <strong>

                                    {shifterCount(method)}

                                </strong>

                            </div>

                        ))}

                    </div>

                    {/* Long Acting */}

                    <div>

                        <h4>
                            Long-Acting Methods
                        </h4>

                        {[
                            { label: "IUD", key: "IUD" },
                            { label: "Implant", key: "Implant" },
                            { label: "Vasectomy", key: "NSV" },
                            { label: "Tubal Ligation", key: "BTL" },
                        ].map(({ label, key }) => (

                            <div className="method-row" key={key}>

                                <span>{label}</span>

                                <div className="progress">

                                    <div
                                        className="progress-fill"
                                        style={{
                                            width: `${percentage(key)}%`
                                        }}
                                    />

                                </div>

                                <strong>
                                    {shifterCount(key)}
                                </strong>

                            </div>

                        ))}

                    </div>

                    {/* Short Acting */}

                    <div>

                        <h4>
                            Short-Acting Methods
                        </h4>

                        {shortMethods.map(method => (

                            <div
                                className="method-row"
                                key={method}
                            >

                                <span>{method}</span>

                                <div className="progress">

                                    <div
                                        className="progress-fill"
                                        style={{
                                            width:
                                                `${percentage(method)}%`
                                        }}
                                    />

                                </div>

                                <strong>

                                    {shifterCount(method)}

                                </strong>

                            </div>

                        ))}

                    </div>

                </div>

            </div>

            {/* ========================================= */}
            {/* MONTHLY SUMMARY */}
            {/* ========================================= */}

            <div className="form-c-monthly-card">

                <h3>Monthly Summary</h3>

                <table className="monthly-summary-table">

                    <thead>

                        <tr>
                            <th>Month</th>
                            <th>Modern FP Shifters</th>
                            <th>Top Method</th>
                        </tr>

                    </thead>

                    <tbody>

                        {monthlySummary.map((item) => (

                            <tr key={item.month}>

                                <td>{item.month}</td>

                                <td>{item.total}</td>

                                <td className="highlight-method">
                                    {displayMethod(item.topMethod)}
                                </td>
                            </tr>

                        ))}

                    </tbody>

                    <tfoot>

                        <tr>

                            <th>TOTAL</th>

                            <th>{totalShifters}</th>

                            <th>{displayMethod(mostPreferredMethod)}</th>
                        </tr>

                    </tfoot>

                </table>

            </div>

            <div className="official-report-card">

                <div className="official-report-header">

                    <div>
                        <h3>Official Modern Family Planning Shifters Report</h3>
                        <p>
                            Individuals Already Using Modern Family Planning Methods Who Intend to Shift to Another Modern Method
                        </p>
                    </div>

                    <div className="report-buttons">


                        <button
                            type="button"
                            className="pdf-btn"
                            onClick={exportModernShiftersPDF}
                        >
                            Export PDF
                        </button>

                        <button
                            type="button"
                            className="excel-btn"
                            onClick={exportModernShiftersExcel}
                        >
                            Export Excel
                        </button>
                    </div>

                </div>

                <div className="report-table-wrapper">
                    <table className="official-report-table">



                        <thead>

                            <tr>

                                <th>Month</th>

                                {methods.map((method) => (
                                    <th key={method}>
                                        {method}
                                    </th>
                                ))}

                                <th>Total</th>

                            </tr>

                        </thead>

                        <tbody>

                            {monthlySummary.map((month) => (

                                <tr key={month.month}>

                                    <td>{month.month}</td>

                                    {methods.map((method) => {

                                        const total = shifters.filter((client) => {

                                            if (!client.intention_to_shift)
                                                return false;

                                            const date =
                                                client.created_at?.toDate
                                                    ? client.created_at.toDate()
                                                    : null;

                                            if (!date)
                                                return false;

                                            const monthName = date.toLocaleString(
                                                "default",
                                                { month: "long" }
                                            );

                                            return (
                                                monthName === month.month &&
                                                normalizeMethod(client.intention_to_shift) === method
                                            );

                                        }).length;

                                        return (

                                            <td key={method}>
                                                {total || ""}
                                            </td>

                                        );

                                    })}

                                    <td>{month.total || ""}</td>

                                </tr>

                            ))}

                        </tbody>

                        <tfoot>

                            <tr>

                                <th className="grand-total-title">
                                    GRAND TOTAL
                                </th>

                                {methods.map((method) => {

                                    const total = shifters.filter(
                                        (client) =>
                                            normalizeMethod(client.intention_to_shift) === method
                                    ).length;

                                    return (

                                        <th key={method}>
                                            {total || ""}
                                        </th>

                                    );

                                })}

                                <th>
                                    {totalShifters}
                                </th>

                            </tr>

                        </tfoot>

                    </table>

                </div>

            </div>

        </div>

    );

}

export default ModernShifters;