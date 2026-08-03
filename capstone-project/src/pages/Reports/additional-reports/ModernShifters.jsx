import "./ModernShifters.css";
import { useMemo } from "react";


function ModernShifters({


    clients = [],
    loading
}) {


    const displayMethod = (method) => {
        switch (method) {
            case "NSV":
                return "Vasectomy";
            case "BTL":
                return "Tubal Ligation";
            case "CCM":
                return "CMM";
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
            ccm: "CMM",
            cmm: "CMM",
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
        "CMM",
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
        "CMM",
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
                            className="refresh-btn"
                        >
                            ↻ Refresh Data
                        </button>

                        <button
                            type="button"
                            className="pdf-btn"
                        >
                            Export PDF
                        </button>

                        <button
                            type="button"
                            className="excel-btn"
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