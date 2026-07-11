import { useMemo } from "react";
import "./FormBAnalytics.css";

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
        if (value === undefined || value === null) continue;

        if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed) return trimmed;
        } else if (typeof value === "number" || typeof value === "boolean") {
            return value;
        }
    }

    return "";
}

function normalizeText(value) {
    return typeof value === "string" ? value.trim() : "";
}

function getMonthLabel(client) {
    const rawValue = getFieldValue(client, ["month", "report_month", "service_month", "month_of_service", "created_at", "updated_at", "date"]);
    if (!rawValue) return "";

    const textValue = normalizeText(String(rawValue)).toLowerCase();

    if (textValue.includes("january")) return "January";
    if (textValue.includes("february")) return "February";
    if (textValue.includes("march")) return "March";
    if (textValue.includes("april")) return "April";
    if (textValue.includes("may")) return "May";
    if (textValue.includes("june")) return "June";
    if (textValue.includes("july")) return "July";
    if (textValue.includes("august")) return "August";
    if (textValue.includes("september")) return "September";
    if (textValue.includes("october")) return "October";
    if (textValue.includes("november")) return "November";
    if (textValue.includes("december")) return "December";

    const maybeDate = new Date(rawValue);
    if (!Number.isNaN(maybeDate.getTime())) {
        return monthNames[maybeDate.getMonth()];
    }

    return "";
}

function FormBAnalytics({ clients = [], loading = false, error = "" }) {
    const unmetNeed = useMemo(() => {
        const couplesWithUnmetNeed = clients.filter((client) => {
            const spouseName = normalizeText(getFieldValue(client, ["spouse_name", "spouseName", "partner_name", "partnerName"]));
            const methodValue = normalizeText(getFieldValue(client, ["fp_method", "FP_method", "method", "intention_to_shift"]));
            return spouseName && (!methodValue || !["condom", "iud", "pills", "injectable", "implant"].some((item) => methodValue.toLowerCase().includes(item)));
        }).length;

        const referredServed = clients.filter((client) => client.sourceCollection === "clients_referred").length;

        return [
            { title: "Couples with Unmet Need for Modern FP", value: couplesWithUnmetNeed },
            { title: "Clients with Unmet Need Referred / Served", value: referredServed },
            { title: "Total Unmet Need", value: couplesWithUnmetNeed + referredServed },
        ];
    }, [clients]);

    const traditionalUsers = useMemo(() => {
        const noShift = clients.filter((client) => {
            const intention = normalizeText(getFieldValue(client, ["intention_to_shift", "shift_intention"])).toLowerCase();
            return !intention;
        }).length;

        const withShift = clients.filter((client) => {
            const intention = normalizeText(getFieldValue(client, ["intention_to_shift", "shift_intention"])).toLowerCase();
            return Boolean(intention);
        }).length;

        const referredTraditional = clients.filter((client) => {
            const methodValue = normalizeText(getFieldValue(client, ["fp_method", "FP_method", "method"])).toLowerCase();
            return ["lam", "sdm", "sympto-thermal", "sympto thermal", "bbt", "ccm", "billings", "nsv", "btl"].some((item) => methodValue.includes(item));
        }).length;

        return [
            { title: "Without Intention to Shift", value: noShift },
            { title: "With Intention to Shift", value: withShift },
            { title: "Traditional FP Users Referred / Served", value: referredTraditional },
        ];
    }, [clients]);

    const monthlySummary = useMemo(() => {
        const monthCounts = {};

        clients.forEach((client) => {
            const month = getMonthLabel(client);
            if (!month) return;

            const current = monthCounts[month] || { unmet: 0, traditional: 0, referred: 0, total: 0 };
            const methodValue = normalizeText(getFieldValue(client, ["fp_method", "FP_method", "method"])).toLowerCase();
            const isTraditional = ["lam", "sdm", "sympto-thermal", "sympto thermal", "bbt", "ccm", "billings", "nsv", "btl"].some((item) => methodValue.includes(item));
            const isReferred = client.sourceCollection === "clients_referred";

            current.unmet += 1;
            if (isTraditional) current.traditional += 1;
            if (isReferred) current.referred += 1;
            current.total += 1;
            monthCounts[month] = current;
        });

        return monthNames.map((month) => {
            const current = monthCounts[month];
            return {
                month,
                unmet: current?.unmet || "",
                traditional: current?.traditional || "",
                referred: current?.referred || "",
                total: current?.total || "",
            };
        });
    }, [clients]);

    const months = monthNames;

    if (loading) {
        return (
            <div className="form-b-analytics">
                <h2>Form B Analytics</h2>
                <p>Loading Form B data from Firestore...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="form-b-analytics">
                <h2>Form B Analytics</h2>
                <p>{error}</p>
            </div>
        );
    }

    return (

        <div className="form-b-analytics">

            <h2>Form B Analytics</h2>

            {/* KPI CARDS */}

            <div className="analytics-cards">

                <div className="analytics-card blue">
                    <h4>Couples with Unmet Need</h4>
                    <span>{unmetNeed[0]?.value || 0}</span>
                </div>

                <div className="analytics-card orange">
                    <h4>Traditional FP Users</h4>
                    <span>{traditionalUsers[2]?.value || 0}</span>
                </div>

                <div className="analytics-card red">
                    <h4>Total Unmet Need</h4>
                    <span>{unmetNeed[2]?.value || 0}</span>
                </div>

                <div className="analytics-card green">
                    <h4>Total Referred / Served</h4>
                    <span>{unmetNeed[1]?.value || 0}</span>
                </div>

            </div>

            {/* SUMMARY PANELS */}

            <div className="analytics-grid">

                <div className="analytics-panel">

                    <h3>Unmet Need Breakdown</h3>

                    {unmetNeed.map((item) => (

                        <div
                            className="summary-row"
                            key={item.title}
                        >
                            <span>{item.title}</span>
                            <strong>{item.value}</strong>
                        </div>

                    ))}

                </div>

                <div className="analytics-panel">

                    <h3>Traditional FP Summary</h3>

                    {traditionalUsers.map((item) => (

                        <div
                            className="summary-row"
                            key={item.title}
                        >
                            <span>{item.title}</span>
                            <strong>{item.value}</strong>
                        </div>

                    ))}

                </div>

            </div>

            {/* MONTHLY SUMMARY */}

            <div className="analytics-panel">

                <h3>Monthly Summary</h3>

                <table className="summary-table">

                    <thead>

                        <tr>

                            <th>Month</th>
                            <th>Unmet Need</th>
                            <th>Traditional FP</th>
                            <th>Referred / Served</th>
                            <th>Total</th>

                        </tr>

                    </thead>

                    <tbody>

                        {monthlySummary.map((row) => (

                            <tr key={row.month}>

                                <td>{row.month}</td>
                                <td>{row.unmet}</td>
                                <td>{row.traditional}</td>
                                <td>{row.referred}</td>
                                <td>{row.total}</td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

            {/* OFFICIAL REPORT */}

            <div className="analytics-panel report-table-panel">

                <div className="panel-header">

                    <h3>Official Form B Report</h3>

                    <button className="export-btn">
                        Export to Excel
                    </button>

                </div>

                <div className="table-wrapper">

                    <table className="report-table">

                        <thead>

                            <tr>

                                <th>Month</th>

                                <th>Unmet Need (1a)</th>

                                <th>Referred / Served (1b)</th>

                                <th>No Shift (2a)</th>

                                <th>Want to Shift (2a)</th>

                                <th>Traditional FP Referred (2b)</th>

                                <th>Total Unmet Need</th>

                                <th>Total Referred / Served</th>

                            </tr>

                        </thead>

                        <tbody>

                            {months.map((month) => (

                                <tr key={month}>

                                    <td>{month}</td>

                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>

                                </tr>

                            ))}

                        </tbody>

                        <tfoot>

                            <tr>

                                <td>Grand Total</td>

                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>

                            </tr>

                        </tfoot>

                    </table>

                </div>

            </div>

        </div>

    );

}

export default FormBAnalytics;