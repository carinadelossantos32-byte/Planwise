import { useMemo } from "react";
import "./FormCAnalytics.css";

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
    { name: "Condom", aliases: ["condom"] },
    { name: "IUD", aliases: ["iud"] },
    { name: "Pills", aliases: ["pills", "pill"] },
    { name: "Injectable", aliases: ["injectable"] },
    { name: "NSV", aliases: ["nsv"] },
    { name: "BTL", aliases: ["btl", "tubal ligation"] },
    { name: "Subdermal Implant", aliases: ["subdermal implant", "implant", "subdermal"] },
    { name: "CCM/Billings", aliases: ["ccm", "billings", "ccm/billings"] },
    { name: "BBT", aliases: ["bbt"] },
    { name: "Sympto-Thermal", aliases: ["sympto-thermal", "sympto thermal"] },
    { name: "SDM", aliases: ["sdm"] },
    { name: "LAM", aliases: ["lam"] },
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

function getMethodLabel(client) {
    const methodValue = normalizeText(getFieldValue(client, ["fp_method", "FP_method", "intention_to_shift", "type", "method", "family_planning_method"]));
    if (!methodValue) return "";

    const normalized = methodValue.toLowerCase();
    for (const method of methodCatalog) {
        if (method.aliases.some((alias) => normalized.includes(alias))) {
            return method.name;
        }
    }

    return methodValue;
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

function FormCAnalytics({ clients = [], loading = false, error = "" }) {
    const methods = useMemo(() => {
        const counts = {};

        clients.forEach((client) => {
            const label = getMethodLabel(client);
            if (!label) return;
            counts[label] = (counts[label] || 0) + 1;
        });

        return methodCatalog
            .map((method) => ({
                name: method.name,
                value: counts[method.name] || "",
            }))
            .filter((method) => method.value !== "" || methodCatalog.some((item) => item.name === method.name));
    }, [clients]);

    const monthlySummary = useMemo(() => {
        const monthCounts = {};

        clients.forEach((client) => {
            const month = getMonthLabel(client);
            if (!month) return;

            const current = monthCounts[month] || { served: 0, topMethod: "" };
            current.served += 1;
            const methodLabel = getMethodLabel(client);
            if (methodLabel) {
                current.topMethod = current.topMethod || methodLabel;
            }
            monthCounts[month] = current;
        });

        return monthNames.map((month) => {
            const current = monthCounts[month];
            return {
                month,
                served: current?.served || "",
                topMethod: current?.topMethod || "",
            };
        });
    }, [clients]);

    const totalReferredServed = clients.length;
    const mostUsedMethod = methods.reduce((best, current) => {
        if (current.value === "") return best;
        if (!best || Number(current.value) > Number(best.value)) return current;
        return best;
    }, null);

    const modernMethods = methods.filter((method) =>
        ["Condom", "IUD", "Pills", "Injectable", "Subdermal Implant"].includes(method.name)
    ).reduce((total, method) => total + (Number(method.value) || 0), 0);

    const naturalMethods = methods.filter((method) =>
        ["NSV", "BTL", "CCM/Billings", "BBT", "Sympto-Thermal", "SDM", "LAM"].includes(method.name)
    ).reduce((total, method) => total + (Number(method.value) || 0), 0);

    if (loading) {
        return (
            <div className="form-c-analytics">
                <h2>Form C Analytics</h2>
                <p>Loading Form C data from Firestore...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="form-c-analytics">
                <h2>Form C Analytics</h2>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="form-c-analytics">

            <h2>Form C Analytics</h2>

            {/* KPI Cards */}

            <div className="analytics-cards">

                <div className="analytics-card blue">
                    <h4>Total Referred & Served</h4>
                    <span>{totalReferredServed}</span>
                </div>

                <div className="analytics-card green">
                    <h4>Most Used Method</h4>
                    <span>{mostUsedMethod?.name || ""}</span>
                </div>

                <div className="analytics-card orange">
                    <h4>Modern Methods</h4>
                    <span>{modernMethods}</span>
                </div>

                <div className="analytics-card purple">
                    <h4>Natural Methods</h4>
                    <span>{naturalMethods}</span>
                </div>

            </div>

            <div className="analytics-grid">

                <div className="analytics-panel">

                    <h3>Family Planning Method Distribution</h3>

                    {methods.map((method) => {
                        const percentages = methods
                            .map((item) => Number(item.value) || 0)
                            .filter((value) => value > 0);
                        const maxValue = percentages.length ? Math.max(...percentages) : 0;
                        const percentage = maxValue > 0 ? (Number(method.value || 0) / maxValue) * 100 : 0;

                        return (
                            <div className="method-row" key={method.name}>
                                <div className="method-header">
                                    <span>{method.name}</span>
                                    <strong>{method.value}</strong>
                                </div>

                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}

                </div>

                <div className="analytics-panel">

                    <h3>Monthly Summary</h3>

                    <table className="summary-table">

                        <thead>

                            <tr>
                                <th>Month</th>
                                <th>Served</th>
                                <th>Top Method</th>
                            </tr>

                        </thead>

                        <tbody>

                            {monthlySummary.map((row) => (
                                <tr key={row.month}>
                                    <td>{row.month}</td>
                                    <td>{row.served}</td>
                                    <td>{row.topMethod}</td>
                                </tr>
                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

            <div className="analytics-panel report-table-panel">

                <div className="panel-header">

                    <h3>Official Form C Report</h3>

                    <button className="export-btn">
                        Export to Excel
                    </button>

                </div>

                <div className="table-wrapper">

                    <table className="report-table">

                        <thead>

                            <tr>

                                <th>Month</th>
                                <th>Condom</th>
                                <th>IUD</th>
                                <th>Pills</th>
                                <th>Injectable</th>
                                <th>NSV</th>
                                <th>BTL</th>
                                <th>Subdermal</th>
                                <th>CCM</th>
                                <th>BBT</th>
                                <th>Sympto-Thermal</th>
                                <th>SDM</th>
                                <th>LAM</th>
                                <th>Total</th>

                            </tr>

                        </thead>

                        <tbody>

                            {monthNames.map((month) => (
                                <tr key={month}>
                                    <td>{month}</td>
                                    {[...Array(13)].map((_, i) => (
                                        <td key={i}></td>
                                    ))}
                                </tr>
                            ))}

                        </tbody>

                        <tfoot>

                            <tr>

                                <td>Grand Total</td>

                                {[...Array(13)].map((_, i) => (
                                    <td key={i}></td>
                                ))}

                            </tr>

                        </tfoot>

                    </table>

                </div>

            </div>

        </div>
    );

}

export default FormCAnalytics;