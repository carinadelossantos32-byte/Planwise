import "./ModernFPUsersAnalytics.css";
import { useMemo } from "react";

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
    "CMM",
    "BBT",
    "STM",
    "SDM",
    "LAM",
];

function getFieldValue(client, keys) {
    for (const key of keys) {
        const value = client?.[key];

        if (value === undefined || value === null) continue;

        if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed) return trimmed;
        } else if (typeof value === "number") {
            return value;
        } else if (value?.toDate) {
            return value.toDate();
        }
    }

    return "";
}

function normalizeText(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function parseMonth(value) {
    if (!value) return "";

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
        if (text.includes("january")) return "January";
        if (text.includes("february")) return "February";
        if (text.includes("march")) return "March";
        if (text.includes("april")) return "April";
        if (text.includes("may")) return "May";
        if (text.includes("june")) return "June";
        if (text.includes("july")) return "July";
        if (text.includes("august")) return "August";
        if (text.includes("september")) return "September";
        if (text.includes("october")) return "October";
        if (text.includes("november")) return "November";
        if (text.includes("december")) return "December";
    }

    return "";
}

function getMethodLabel(value) {
    const normalized = normalizeText(value);

    const methodMap = {
        condom: "Condom",
        iud: "IUD",
        pills: "Pills",
        injectable: "Injectable",
        nsv: "Vasectomy",
        vasectomy: "Vasectomy",
        btl: "Tubal Ligation",
        "tubal ligation": "Tubal Ligation",
        implant: "Implant",
        subdermal: "Implant",
        ccm: "CMM",
        cmm: "CMM",
        bbt: "BBT",
        stm: "STM",
        "sympto-the": "STM",
        "sympto thermal": "STM",
        sdm: "SDM",
        lam: "LAM",
    };

    return methodMap[normalized] || "";
}

function ModernFPUsersAnalytics({ clients = [], loading = false, error = "" }) {
    const modernClients = useMemo(() => {
        return clients.filter((client) => {
            const methodValue = getMethodLabel(
                getFieldValue(client, [
                    "fp_method",
                    "FP_method",
                    "method",
                    "family_planning_method",
                    "type",
                    "category",
                    "program",
                    "intention_to_shift",
                ])
            );

            return Boolean(methodValue);
        });
    }, [clients]);

    const totalUsers = modernClients.length;
    const utilizationRate = clients.length > 0 ? ((totalUsers / clients.length) * 100).toFixed(1) : "0.0";

    const methodCounts = useMemo(() => {
        const counts = {};

        modernClients.forEach((client) => {
            const label = getMethodLabel(
                getFieldValue(client, [
                    "fp_method",
                    "FP_method",
                    "method",
                    "family_planning_method",
                    "type",
                    "category",
                    "program",
                    "intention_to_shift",
                ])
            );

            if (label) {
                counts[label] = (counts[label] || 0) + 1;
            }
        });

        return counts;
    }, [modernClients]);

    const topMethod = useMemo(() => {
        const entries = Object.entries(methodCounts);
        if (!entries.length) return "-";

        return entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best), entries[0])[0];
    }, [methodCounts]);

    const monthlySummary = useMemo(() => {
        return monthNames.map((month) => {
            const monthClients = modernClients.filter((client) => {
                return parseMonth(
                    getFieldValue(client, ["created_at", "updated_at", "date", "month", "report_month", "service_month", "month_of_service"])
                ) === month;
            });

            const methodCount = {};
            monthClients.forEach((client) => {
                const label = getMethodLabel(
                    getFieldValue(client, [
                        "fp_method",
                        "FP_method",
                        "method",
                        "family_planning_method",
                        "type",
                        "category",
                        "program",
                        "intention_to_shift",
                    ])
                );

                if (label) {
                    methodCount[label] = (methodCount[label] || 0) + 1;
                }
            });

            const top = Object.keys(methodCount).length
                ? Object.keys(methodCount).reduce((a, b) => (methodCount[a] > methodCount[b] ? a : b))
                : "-";

            return {
                month,
                total: monthClients.length,
                topMethod: top,
            };
        });
    }, [modernClients]);

    const monthlyMethodReport = useMemo(() => {
        return monthNames.map((month) => {
            const monthClients = modernClients.filter((client) => {
                return parseMonth(
                    getFieldValue(client, ["created_at", "updated_at", "date", "month", "report_month", "service_month", "month_of_service"])
                ) === month;
            });

            const row = { month, total: monthClients.length };

            methodHeaders.forEach((header) => {
                row[header] = monthClients.filter((client) => getMethodLabel(
                    getFieldValue(client, [
                        "fp_method",
                        "FP_method",
                        "method",
                        "family_planning_method",
                        "type",
                        "category",
                        "program",
                        "intention_to_shift",
                    ])
                ) === header).length;
            });

            return row;
        });
    }, [modernClients]);

    const grandTotals = useMemo(() => {
        const totals = { total: 0 };

        methodHeaders.forEach((header) => {
            totals[header] = 0;
        });

        monthlyMethodReport.forEach((row) => {
            totals.total += row.total;
            methodHeaders.forEach((header) => {
                totals[header] += row[header];
            });
        });

        return totals;
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
                            "CMM",
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

            <div className="official-report-card">

                <div className="official-report-header">

                    <div>
                        <h3>Official Modern Family Planning Users Report</h3>
                        <p>
                            Individuals Already Using Modern Family Planning Methods
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

                            {monthlyMethodReport.map((row) => (

                                <tr key={row.month}>

                                    <td>{row.month}</td>

                                    <td>{row.Condom || ""}</td>
                                    <td>{row.IUD || ""}</td>
                                    <td>{row.Pills || ""}</td>
                                    <td>{row.Injectable || ""}</td>
                                    <td>{row.NSV || ""}</td>
                                    <td>{row.BTL || ""}</td>
                                    <td>{row.Subdermal || ""}</td>
                                    <td>{row.CCM || ""}</td>
                                    <td>{row.BBT || ""}</td>
                                    <td>{row["Sympto-the"] || ""}</td>
                                    <td>{row.SDM || ""}</td>
                                    <td>{row.LAM || ""}</td>

                                    <td>{row.total || ""}</td>

                                </tr>

                            ))}

                        </tbody>

                        <tfoot>

                            <tr>

                                <th className="grand-total-title">
                                    GRAND TOTAL
                                </th>

                                <th>{grandTotals.Condom || ""}</th>
                                <th>{grandTotals.IUD || ""}</th>
                                <th>{grandTotals.Pills || ""}</th>
                                <th>{grandTotals.Injectable || ""}</th>
                                <th>{grandTotals.NSV || ""}</th>
                                <th>{grandTotals.BTL || ""}</th>
                                <th>{grandTotals.Subdermal || ""}</th>
                                <th>{grandTotals.CCM || ""}</th>
                                <th>{grandTotals.BBT || ""}</th>
                                <th>{grandTotals["Sympto-the"] || ""}</th>
                                <th>{grandTotals.SDM || ""}</th>
                                <th>{grandTotals.LAM || ""}</th>

                                <th>{grandTotals.total}</th>

                            </tr>

                        </tfoot>
                    </table>

                </div>

            </div>
        </div>
    );
}

export default ModernFPUsersAnalytics;