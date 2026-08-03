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
    {
        category: "Natural Methods",
        methods: [
            { name: "CCM", aliases: ["ccm", "billings", "ccm/billings"] },
            { name: "BBT", aliases: ["bbt"] },
            { name: "STM", aliases: ["stm", "sympto thermal", "sympto-thermal"] },
            { name: "SDM", aliases: ["sdm"] },
            { name: "LAM", aliases: ["lam"] },
        ],
    },
    {
        category: "Long-Acting Methods",
        methods: [
            { name: "IUD", aliases: ["iud"] },
            { name: "Implant", aliases: ["implant", "subdermal"] },
            { name: "Vasectomy", aliases: ["vasectomy", "nsv"] },
            { name: "Tubal Ligation", aliases: ["tubal ligation", "btl"] },
        ],
    },
    {
        category: "Short-Acting Methods",
        methods: [
            { name: "Injectable", aliases: ["injectable"] },
            { name: "Pills", aliases: ["pill", "pills"] },
            { name: "Condom", aliases: ["condom"] },

        ],
    },
];

const summaryColors = ["#16a34a", "#2563eb", "#ea580c"];

function getFieldValue(client, keys) {
    for (const key of keys) {
        const value = client?.[key];

        if (value === undefined || value === null) continue;

        if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed) return trimmed;
        } else if (typeof value === "number" || typeof value === "boolean") {
            return value;
        } else if (value instanceof Date) {
            return value;
        } else if (value?.toDate) {
            return value.toDate();
        }
    }

    return "";
}

function normalize(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value?.toDate) return value.toDate();

    if (typeof value === "string") {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
}

function getMonth(client) {
    const raw = getFieldValue(client, ["created_at", "updated_at", "date", "month", "service_month", "report_month"]);
    const parsed = parseDate(raw);

    if (parsed) {
        return monthNames[parsed.getMonth()];
    }

    const text = normalize(String(raw));
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

    return "";
}

function getMethod(client) {
    const raw = getFieldValue(client, [
        "fp_method",
        "FP_method",
        "method",
        "family_planning_method",
        "preferred_method",
        "service_method",
        "intended_method",
        "type",
    ]);

    const value = normalize(raw);

    for (const group of methodCatalog) {
        for (const method of group.methods) {
            if (method.aliases.some((alias) => value.includes(alias))) {
                return method.name;
            }
        }
    }

    return typeof raw === "string" ? raw.trim() : "";
}

function isArchived(client) {
    return client?.is_archived === true || client?.archived === true;
}

function FormCAnalytics({ clients = [], loading = false, error = "" }) {
    const analytics = useMemo(() => {
        const methodNames = methodCatalog.flatMap((group) => group.methods.map((method) => method.name));
        const methodCounts = Object.fromEntries(methodNames.map((name) => [name, 0]));

        const monthRows = Object.fromEntries(
            monthNames.map((month) => [
                month,
                {
                    month,
                    unmetNeed: 0,
                    referred: 0,
                    total: 0,
                    ...Object.fromEntries(methodNames.map((name) => [name, 0])),
                },
            ])
        );

        let totalRecords = 0;
        let totalRecognizedMethods = 0;
        let totalReferredServed = 0;
        let totalUnmetNeed = 0;

        clients.forEach((client) => {
            if (isArchived(client)) return;

            const month = getMonth(client);
            const methodName = getMethod(client);

            totalRecords += 1;

            if (month) {
                monthRows[month].total += 1;
            }

            if (client.sourceCollection === "clients_referred") {
                totalReferredServed += 1;
                if (month) monthRows[month].referred += 1;
            } else {
                totalUnmetNeed += 1;
                if (month) monthRows[month].unmetNeed += 1;
            }

            if (methodName && methodCounts[methodName] !== undefined) {
                methodCounts[methodName] += 1;
                totalRecognizedMethods += 1;
                if (month) monthRows[month][methodName] += 1;
            }
        });

        const monthlySummary = monthNames.map((month) => {
            const row = monthRows[month];

            const methodsInMonth = methodNames
                .map((name) => ({
                    name,
                    count: row[name],
                }))
                .filter((method) => method.count > 0);

            let topMethod = "-";

            if (methodsInMonth.length > 0) {
                const highest = Math.max(...methodsInMonth.map(m => m.count));

                topMethod = methodsInMonth
                    .filter(m => m.count === highest)
                    .map(m => m.name)
                    .join(", ");
            }

            return {
                month,
                unmetNeed: row.unmetNeed,
                referred: row.referred,
                topMethod,
                total: row.total,
                ...Object.fromEntries(
                    methodNames.map((name) => [name, row[name]])
                ),
            };
        });

        const categorySummary = methodCatalog.map((group, groupIndex) => ({
            category: group.category,
            methods: group.methods.map((method) => {
                const count = methodCounts[method.name] || 0;
                const percent = totalRecognizedMethods ? Math.round((count / totalRecognizedMethods) * 100) : 0;
                return {
                    ...method,
                    count,
                    percent,
                    color: summaryColors[groupIndex % summaryColors.length],
                };
            }),
        }));

        return {
            categorySummary,
            monthlySummary,
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
            <div className="form-c-cards">
                <div className="form-c-card blue">
                    <small>Total Records</small>
                    <h2>{analytics.totalRecords}</h2>

                </div>
                <div className="form-c-card green">
                    <small>Referred &amp; Served</small>
                    <h2>{analytics.totalReferredServed}</h2>

                </div>
                <div className="form-c-card orange">
                    <small>Unmet Need</small>
                    <h2>{analytics.totalUnmetNeed}</h2>

                </div>
            </div>

            <div className="form-c-summary-card">
                <h3>Referred &amp; Served Family Planning Methods</h3>
                <div className="method-summary-grid">
                    {analytics.categorySummary.map((group) => (
                        <div className="method-category" key={group.category}>
                            <h4>{group.category}</h4>
                            {group.methods.map((method) => (
                                <div className="method-row" key={method.name}>
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
                                    <strong>{method.percent}%</strong>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className="form-c-monthly-card">
                <h3>Monthly Summary</h3>
                <table className="monthly-summary-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Unmet Need</th>
                            <th>Referred &amp; Served</th>
                            <th>Top Method</th>
                        </tr>
                    </thead>
                    <tbody>
                        {analytics.monthlySummary.map((row) => (
                            <tr key={row.month}>
                                <td>{row.month}</td>
                                <td>{row.unmetNeed}</td>
                                <td>{row.referred}</td>
                                <td className="highlight-method">
                                    {row.topMethod}
                                </td>
                            </tr>
                        ))}
                    </tbody>

                    <tfoot>
                        <tr>

                            <th>TOTAL</th>

                            <th>{analytics.totalUnmetNeed}</th>

                            <th>{analytics.totalReferredServed}</th>

                            <th>
                                {(() => {

                                    const highest = Math.max(
                                        ...Object.values(analytics.methods)
                                    );

                                    if (highest === 0) return "-";

                                    return Object.entries(analytics.methods)
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
                        <h3>Official Form C Report</h3>
                        <p>Individuals Referred and Served with Unmet Need for Modern Family Planning</p>
                    </div>
                    <div className="report-buttons">
                        <button type="button" className="refresh-btn">↻ Refresh Data</button>
                        <button type="button" className="pdf-btn">Export PDF</button>
                        <button type="button" className="excel-btn">Export Excel</button>
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

    {analytics.monthlySummary.map((row) => (

        <tr key={row.month}>

            <td>{row.month}</td>

            <td>{row.Condom || ""}</td>
            <td>{row.IUD || ""}</td>
            <td>{row.Pills || ""}</td>
            <td>{row.Injectable || ""}</td>
            <td>{row.NSV || ""}</td>
            <td>{row.BTL || ""}</td>
            <td>{row.Implant || ""}</td>
            <td>{row.CCM || ""}</td>
            <td>{row.BBT || ""}</td>
            <td>{row.STM || ""}</td>
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

    <th>{analytics.methods.Condom || ""}</th>
    <th>{analytics.methods.IUD || ""}</th>
    <th>{analytics.methods.Pills || ""}</th>
    <th>{analytics.methods.Injectable || ""}</th>
    <th>{analytics.methods.NSV || ""}</th>
    <th>{analytics.methods.BTL || ""}</th>
    <th>{analytics.methods.Implant || ""}</th>
    <th>{analytics.methods.CCM || ""}</th>
    <th>{analytics.methods.BBT || ""}</th>
    <th>{analytics.methods.STM || ""}</th>
    <th>{analytics.methods.SDM || ""}</th>
    <th>{analytics.methods.LAM || ""}</th>

    <th>{analytics.totalReferredServed}</th>

</tr>

</tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default FormCAnalytics;
