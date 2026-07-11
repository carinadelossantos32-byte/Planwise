import { useMemo } from "react";
import "./FormAAnalytics.css";

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
        } else if (value?.toDate) {
            return value.toDate();
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

    if (rawValue instanceof Date) {
        return monthNames[rawValue.getMonth()];
    }

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

function FormAAnalytics({ clients = [], loading = false, error = "" }) {
    const totalParticipants = clients.length;

    const maleParticipants = clients.filter((client) => {
        const maleValue = normalizeText(getFieldValue(client, ["sex", "gender", "birthdate_male", "civil_status_male"])).toLowerCase();
        return maleValue === "male" || Boolean(normalizeText(getFieldValue(client, ["birthdate_male", "civil_status_male"])));
    }).length;

    const femaleParticipants = clients.filter((client) => {
        const femaleValue = normalizeText(getFieldValue(client, ["sex", "gender", "birthdate_female", "civil_status_female"])).toLowerCase();
        return femaleValue === "female" || Boolean(normalizeText(getFieldValue(client, ["birthdate_female", "civil_status_female"])));
    }).length;

    const coupleParticipants = clients.filter((client) => {
        const spouseName = normalizeText(
            getFieldValue(client, ["spouse_name", "spouseName", "partner_name", "partnerName"])
        );
        return spouseName.length > 0;
    }).length;

    const categorySummary = useMemo(() => {
        const counts = {};

        clients.forEach((client) => {
            const rawCategory = normalizeText(
                getFieldValue(client, [
                    "category",
                    "category_name",
                    "program",
                    "program_category",
                    "activity",
                    "activity_type",
                    "type",
                    "service_type",
                    "report_type",
                    "class_type",
                    "classType",
                ])
            );

            if (!rawCategory) return;

            const normalized = rawCategory.toLowerCase();
            const label = normalized.includes("4ps")
                ? "4Ps"
                : normalized.includes("non-4ps") || normalized.includes("non 4ps") || normalized.includes("non4ps")
                    ? "Non-4Ps"
                    : normalized.includes("usapan")
                        ? "USAPAN"
                        : normalized.includes("pmoc")
                            ? "PMOC"
                            : normalized.includes("house") || normalized.includes("house to house")
                                ? "House to House"
                                : normalized.includes("profiled")
                                    ? "Profiled Only"
                                    : "Others";

            counts[label] = (counts[label] || 0) + 1;
        });

        return [
            { label: "4Ps", value: counts["4Ps"] || "" },
            { label: "Non-4Ps", value: counts["Non-4Ps"] || "" },
            { label: "USAPAN", value: counts["USAPAN"] || "" },
            { label: "PMOC", value: counts["PMOC"] || "" },
            { label: "House to House", value: counts["House to House"] || "" },
            { label: "Profiled Only", value: counts["Profiled Only"] || "" },
            { label: "Others", value: counts["Others"] || "" },
        ];
    }, [clients]);

    const classesHeld = useMemo(() => categorySummary, [categorySummary]);

    const individualsReached = useMemo(() => categorySummary, [categorySummary]);

    const monthlySummary = useMemo(() => {
        const monthCounts = {};

        clients.forEach((client) => {
            const matchedMonth = getMonthLabel(client);
            if (!matchedMonth) return;

            const current = monthCounts[matchedMonth] || { classes: 0, reached: 0, participants: 0 };
            current.classes += 1;
            current.reached += 1;
            current.participants += 1;
            monthCounts[matchedMonth] = current;
        });

        return monthNames.map((month) => {
            const current = monthCounts[month];
            return {
                month,
                classes: current?.classes || "",
                reached: current?.reached || "",
                target: "",
                participants: current?.participants || "",
            };
        });
    }, [clients]);

    if (loading) {
        return (
            <div className="form-a-analytics">
                <h2>Form A Analytics</h2>
                <p>Loading Form A data from Firestore...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="form-a-analytics">
                <h2>Form A Analytics</h2>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="form-a-analytics">
            <h2>Form A Analytics</h2>

            <div className="analytics-cards">
                <div className="analytics-card blue">
                    <h4>Total Classes Held</h4>
                    <span>{classesHeld.reduce((total, item) => total + (Number(item.value) || 0), 0)}</span>
                </div>

                <div className="analytics-card green">
                    <h4>Individuals Reached</h4>
                    <span>{totalParticipants}</span>
                </div>

                <div className="analytics-card orange">
                    <h4>Target Couples</h4>
                    <span>{coupleParticipants}</span>
                </div>

                <div className="analytics-card purple">
                    <h4>Total Participants</h4>
                    <span>{totalParticipants}</span>
                </div>
            </div>

            <div className="analytics-grid analytics-grid-three">
                <div className="analytics-panel">
                    <h3>Classes Conducted</h3>
                    {classesHeld.map((item) => (
                        <div className="summary-row" key={item.label}>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                        </div>
                    ))}
                </div>

                <div className="analytics-panel">
                    <h3>Individuals Reached</h3>
                    {individualsReached.map((item) => (
                        <div className="summary-row" key={item.label}>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                        </div>
                    ))}
                </div>

                <div className="analytics-panel">
                    <h3>Solo / Couple Summary</h3>

                    <div className="summary-row">
                        <span>Male Solo Attendees</span>
                        <strong>{maleParticipants}</strong>
                    </div>

                    <div className="summary-row">
                        <span>Female Solo Attendees</span>
                        <strong>{femaleParticipants}</strong>
                    </div>

                    <div className="summary-row">
                        <span>Total Solo Attendees</span>
                        <strong>{maleParticipants + femaleParticipants}</strong>
                    </div>

                    <div className="summary-row">
                        <span>Couple Attendees</span>
                        <strong>{coupleParticipants}</strong>
                    </div>
                </div>
            </div>

            <div className="analytics-grid analytics-grid-two">
                <div className="analytics-panel">
                    <h3>Monthly Summary</h3>
                    <table className="summary-table">
                        <thead>
                            <tr>
                                <th>Month</th>
                                <th>Classes</th>
                                <th>Reached</th>
                                <th>Target</th>
                                <th>Participants</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlySummary.map((row) => (
                                <tr key={row.month}>
                                    <td>{row.month}</td>
                                    <td>{row.classes}</td>
                                    <td>{row.reached}</td>
                                    <td>{row.target}</td>
                                    <td>{row.participants}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="analytics-panel">
                    <h3>Quarterly Summary</h3>
                    <table className="summary-table">
                        <thead>
                            <tr>
                                <th>Quarter</th>
                                <th>Classes</th>
                                <th>Reached</th>
                                <th>Participants</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Q1</td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                            <tr>
                                <td>Q2</td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                            <tr>
                                <td>Q3</td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                            <tr>
                                <td>Q4</td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="analytics-panel report-table-panel">
                <div className="panel-header">
                    <h3>Official Form A Report</h3>
                    <button className="export-btn">Export to Excel</button>
                </div>

                <div className="table-wrapper">
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Month</th>
                                <th>4Ps</th>
                                <th>Non-4Ps</th>
                                <th>USAPAN</th>
                                <th>PMOC</th>
                                <th>House to House</th>
                                <th>Profiled Only</th>
                                <th>Others</th>
                                <th>Total Classes</th>
                                <th>Target Couples</th>
                                <th>Individuals Reached</th>
                                <th>Solo Male</th>
                                <th>Solo Female</th>
                                <th>Total Solo</th>
                                <th>Couples</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
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
                            ].map((month) => (
                                <tr key={month}>
                                    <td>{month}</td>
                                    {[...Array(14)].map((_, index) => (
                                        <td key={index}></td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td>Grand Total</td>
                                {[...Array(14)].map((_, index) => (
                                    <td key={index}></td>
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default FormAAnalytics;