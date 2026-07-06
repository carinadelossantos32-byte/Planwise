import { useState } from "react";
import "./monthly-report-table.css";

function MonthlyReportTable() {
    const [expandedMonth, setExpandedMonth] = useState(null);

    // Sample data structure - replace with actual data from your database
    const monthlyData = [
        {
            month: "January",
            classesHeld: 6,
            individualsReached: 110,
            solo: 43,
            couples: 41,
            details: {
                classesBreakdown: {
                    "4Ps": 2,
                    "Non-4Ps": 1,
                    "USAPAN": 1,
                    "PMOC": 0,
                    "House-to-House": 2,
                    "Profiled Only": 0,
                    "Others": 1,
                },
                individualsBreakdown: {
                    "4Ps": 35,
                    "Non-4Ps": 18,
                    "USAPAN": 20,
                    "PMOC": 9,
                    "House-to-House": 16,
                    "Profiled Only": 5,
                    "Others": 7,
                },
                soloAttendees: {
                    male: 18,
                    female: 25,
                },
                coupleAttendees: 41,
            },
        },
        {
            month: "February",
            classesHeld: 4,
            individualsReached: 98,
            solo: 39,
            couples: 38,
            details: {
                classesBreakdown: {
                    "4Ps": 1,
                    "Non-4Ps": 1,
                    "USAPAN": 1,
                    "PMOC": 0,
                    "House-to-House": 1,
                    "Profiled Only": 0,
                    "Others": 0,
                },
                individualsBreakdown: {
                    "4Ps": 28,
                    "Non-4Ps": 15,
                    "USAPAN": 18,
                    "PMOC": 8,
                    "House-to-House": 14,
                    "Profiled Only": 4,
                    "Others": 11,
                },
                soloAttendees: {
                    male: 16,
                    female: 23,
                },
                coupleAttendees: 38,
            },
        },
        {
            month: "March",
            classesHeld: 8,
            individualsReached: 125,
            solo: 51,
            couples: 52,
            details: {
                classesBreakdown: {
                    "4Ps": 3,
                    "Non-4Ps": 1,
                    "USAPAN": 2,
                    "PMOC": 1,
                    "House-to-House": 1,
                    "Profiled Only": 0,
                    "Others": 0,
                },
                individualsBreakdown: {
                    "4Ps": 42,
                    "Non-4Ps": 22,
                    "USAPAN": 25,
                    "PMOC": 12,
                    "House-to-House": 14,
                    "Profiled Only": 6,
                    "Others": 4,
                },
                soloAttendees: {
                    male: 21,
                    female: 30,
                },
                coupleAttendees: 52,
            },
        },
        {
            month: "April",
            classesHeld: 7,
            individualsReached: 112,
            solo: 45,
            couples: 44,
            details: {
                classesBreakdown: {
                    "4Ps": 2,
                    "Non-4Ps": 1,
                    "USAPAN": 1,
                    "PMOC": 1,
                    "House-to-House": 2,
                    "Profiled Only": 0,
                    "Others": 0,
                },
                individualsBreakdown: {
                    "4Ps": 38,
                    "Non-4Ps": 19,
                    "USAPAN": 21,
                    "PMOC": 10,
                    "House-to-House": 15,
                    "Profiled Only": 5,
                    "Others": 4,
                },
                soloAttendees: {
                    male: 19,
                    female: 26,
                },
                coupleAttendees: 44,
            },
        },
        {
            month: "May",
            classesHeld: 6,
            individualsReached: 105,
            solo: 42,
            couples: 40,
            details: {
                classesBreakdown: {
                    "4Ps": 2,
                    "Non-4Ps": 1,
                    "USAPAN": 1,
                    "PMOC": 0,
                    "House-to-House": 2,
                    "Profiled Only": 0,
                    "Others": 0,
                },
                individualsBreakdown: {
                    "4Ps": 35,
                    "Non-4Ps": 17,
                    "USAPAN": 19,
                    "PMOC": 8,
                    "House-to-House": 15,
                    "Profiled Only": 6,
                    "Others": 5,
                },
                soloAttendees: {
                    male: 17,
                    female: 25,
                },
                coupleAttendees: 40,
            },
        },
        {
            month: "June",
            classesHeld: 9,
            individualsReached: 131,
            solo: 54,
            couples: 50,
            details: {
                classesBreakdown: {
                    "4Ps": 3,
                    "Non-4Ps": 2,
                    "USAPAN": 1,
                    "PMOC": 1,
                    "House-to-House": 1,
                    "Profiled Only": 1,
                    "Others": 0,
                },
                individualsBreakdown: {
                    "4Ps": 44,
                    "Non-4Ps": 24,
                    "USAPAN": 22,
                    "PMOC": 11,
                    "House-to-House": 15,
                    "Profiled Only": 7,
                    "Others": 8,
                },
                soloAttendees: {
                    male: 22,
                    female: 32,
                },
                coupleAttendees: 50,
            },
        },
        {
            month: "July",
            classesHeld: 8,
            individualsReached: 118,
            solo: 48,
            couples: 45,
            details: {
                classesBreakdown: {
                    "4Ps": 2,
                    "Non-4Ps": 2,
                    "USAPAN": 1,
                    "PMOC": 1,
                    "House-to-House": 1,
                    "Profiled Only": 1,
                    "Others": 0,
                },
                individualsBreakdown: {
                    "4Ps": 39,
                    "Non-4Ps": 21,
                    "USAPAN": 20,
                    "PMOC": 10,
                    "House-to-House": 14,
                    "Profiled Only": 6,
                    "Others": 8,
                },
                soloAttendees: {
                    male: 20,
                    female: 28,
                },
                coupleAttendees: 45,
            },
        },
        {
            month: "August",
            classesHeld: 7,
            individualsReached: 108,
            solo: 44,
            couples: 42,
            details: {
                classesBreakdown: {
                    "4Ps": 2,
                    "Non-4Ps": 1,
                    "USAPAN": 2,
                    "PMOC": 0,
                    "House-to-House": 1,
                    "Profiled Only": 1,
                    "Others": 0,
                },
                individualsBreakdown: {
                    "4Ps": 36,
                    "Non-4Ps": 19,
                    "USAPAN": 19,
                    "PMOC": 8,
                    "House-to-House": 13,
                    "Profiled Only": 5,
                    "Others": 8,
                },
                soloAttendees: {
                    male: 18,
                    female: 26,
                },
                coupleAttendees: 42,
            },
        },
        {
            month: "September",
            classesHeld: 9,
            individualsReached: 128,
            solo: 52,
            couples: 48,
            details: {
                classesBreakdown: {
                    "4Ps": 3,
                    "Non-4Ps": 2,
                    "USAPAN": 1,
                    "PMOC": 1,
                    "House-to-House": 1,
                    "Profiled Only": 1,
                    "Others": 0,
                },
                individualsBreakdown: {
                    "4Ps": 43,
                    "Non-4Ps": 23,
                    "USAPAN": 21,
                    "PMOC": 10,
                    "House-to-House": 15,
                    "Profiled Only": 7,
                    "Others": 9,
                },
                soloAttendees: {
                    male: 21,
                    female: 31,
                },
                coupleAttendees: 48,
            },
        },
        {
            month: "October",
            classesHeld: 8,
            individualsReached: 120,
            solo: 49,
            couples: 46,
            details: {
                classesBreakdown: {
                    "4Ps": 2,
                    "Non-4Ps": 2,
                    "USAPAN": 1,
                    "PMOC": 1,
                    "House-to-House": 1,
                    "Profiled Only": 1,
                    "Others": 0,
                },
                individualsBreakdown: {
                    "4Ps": 40,
                    "Non-4Ps": 21,
                    "USAPAN": 20,
                    "PMOC": 9,
                    "House-to-House": 14,
                    "Profiled Only": 7,
                    "Others": 9,
                },
                soloAttendees: {
                    male: 20,
                    female: 29,
                },
                coupleAttendees: 46,
            },
        },
        {
            month: "November",
            classesHeld: 7,
            individualsReached: 110,
            solo: 45,
            couples: 43,
            details: {
                classesBreakdown: {
                    "4Ps": 2,
                    "Non-4Ps": 1,
                    "USAPAN": 1,
                    "PMOC": 1,
                    "House-to-House": 1,
                    "Profiled Only": 1,
                    "Others": 0,
                },
                individualsBreakdown: {
                    "4Ps": 37,
                    "Non-4Ps": 20,
                    "USAPAN": 19,
                    "PMOC": 8,
                    "House-to-House": 13,
                    "Profiled Only": 6,
                    "Others": 7,
                },
                soloAttendees: {
                    male: 18,
                    female: 27,
                },
                coupleAttendees: 43,
            },
        },
        {
            month: "December",
            classesHeld: 10,
            individualsReached: 135,
            solo: 56,
            couples: 52,
            details: {
                classesBreakdown: {
                    "4Ps": 3,
                    "Non-4Ps": 2,
                    "USAPAN": 2,
                    "PMOC": 1,
                    "House-to-House": 1,
                    "Profiled Only": 1,
                    "Others": 0,
                },
                individualsBreakdown: {
                    "4Ps": 45,
                    "Non-4Ps": 25,
                    "USAPAN": 23,
                    "PMOC": 11,
                    "House-to-House": 15,
                    "Profiled Only": 8,
                    "Others": 8,
                },
                soloAttendees: {
                    male: 23,
                    female: 33,
                },
                coupleAttendees: 52,
            },
        },
    ];

    // Calculate quarterly totals
    const q1Total = monthlyData.slice(0, 3).reduce(
        (acc, m) => ({
            classes: acc.classes + m.classesHeld,
            individuals: acc.individuals + m.individualsReached,
            couples: acc.couples + m.couples,
        }),
        { classes: 0, individuals: 0, couples: 0 }
    );

    const q2Total = monthlyData.slice(3, 6).reduce(
        (acc, m) => ({
            classes: acc.classes + m.classesHeld,
            individuals: acc.individuals + m.individualsReached,
            couples: acc.couples + m.couples,
        }),
        { classes: 0, individuals: 0, couples: 0 }
    );

    const q3Total = monthlyData.slice(6, 9).reduce(
        (acc, m) => ({
            classes: acc.classes + m.classesHeld,
            individuals: acc.individuals + m.individualsReached,
            couples: acc.couples + m.couples,
        }),
        { classes: 0, individuals: 0, couples: 0 }
    );

    const q4Total = monthlyData.slice(9, 12).reduce(
        (acc, m) => ({
            classes: acc.classes + m.classesHeld,
            individuals: acc.individuals + m.individualsReached,
            couples: acc.couples + m.couples,
        }),
        { classes: 0, individuals: 0, couples: 0 }
    );

    // Calculate annual totals
    const annualTotal = monthlyData.reduce(
        (acc, m) => ({
            classes: acc.classes + m.classesHeld,
            individuals: acc.individuals + m.individualsReached,
            solo: acc.solo + m.solo,
            couples: acc.couples + m.couples,
            soloMale: acc.soloMale + m.details.soloAttendees.male,
            soloFemale: acc.soloFemale + m.details.soloAttendees.female,
        }),
        { classes: 0, individuals: 0, solo: 0, couples: 0, soloMale: 0, soloFemale: 0 }
    );

    const toggleMonth = (month) => {
        setExpandedMonth(expandedMonth === month ? null : month);
    };

    return (
        <div className="monthly-report-container">
            {/* Clean Monthly Summary Table */}
            <div className="monthly-table-section">
                <h3>Monthly Summary</h3>
                <table className="monthly-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Month</th>
                            <th>Classes Held</th>
                            <th>Individuals</th>
                            <th>Solo</th>
                            <th>Couples</th>
                        </tr>
                    </thead>
                    <tbody>
                        {monthlyData.map((data) => (
                            <tr key={data.month} className={expandedMonth === data.month ? "expanded-row" : ""}>
                                <td className="expand-cell">
                                    <button
                                        className={`expand-btn ${expandedMonth === data.month ? "open" : ""}`}
                                        onClick={() => toggleMonth(data.month)}
                                        title="View details"
                                    >
                                        ▶
                                    </button>
                                </td>
                                <td className="month-cell">{data.month}</td>
                                <td>{data.classesHeld}</td>
                                <td>{data.individualsReached}</td>
                                <td>{data.solo}</td>
                                <td>{data.couples}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Expanded Monthly Details */}
            {expandedMonth && (
                <div className="expanded-details-section">
                    <div className="expanded-header">
                        <h4>{expandedMonth} - Detailed Breakdown</h4>
                        <button className="close-btn" onClick={() => setExpandedMonth(null)}>✕</button>
                    </div>

                    <div className="details-grid">
                        {/* Classes Held Breakdown */}
                        <div className="detail-card">
                            <h5>Classes Held</h5>
                            <div className="breakdown-list">
                                {Object.entries(
                                    monthlyData.find((m) => m.month === expandedMonth).details.classesBreakdown
                                ).map(([category, count]) => (
                                    <div key={category} className="breakdown-item">
                                        <span className="category">{category}</span>
                                        <span className="dots"></span>
                                        <span className="value">{count}</span>
                                    </div>
                                ))}
                                <div className="breakdown-item total">
                                    <span className="category">Total</span>
                                    <span className="dots"></span>
                                    <span className="value">
                                        {monthlyData.find((m) => m.month === expandedMonth).classesHeld}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Individuals Reached Breakdown */}
                        <div className="detail-card">
                            <h5>Individuals Reached</h5>
                            <div className="breakdown-list">
                                {Object.entries(
                                    monthlyData.find((m) => m.month === expandedMonth).details
                                        .individualsBreakdown
                                ).map(([category, count]) => (
                                    <div key={category} className="breakdown-item">
                                        <span className="category">{category}</span>
                                        <span className="dots"></span>
                                        <span className="value">{count}</span>
                                    </div>
                                ))}
                                <div className="breakdown-item total">
                                    <span className="category">Total</span>
                                    <span className="dots"></span>
                                    <span className="value">
                                        {monthlyData.find((m) => m.month === expandedMonth).individualsReached}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Solo Attendees */}
                        <div className="detail-card">
                            <h5>Solo Attendees</h5>
                            <div className="breakdown-list">
                                <div className="breakdown-item">
                                    <span className="category">Male</span>
                                    <span className="dots"></span>
                                    <span className="value">
                                        {
                                            monthlyData.find((m) => m.month === expandedMonth).details.soloAttendees
                                                .male
                                        }
                                    </span>
                                </div>
                                <div className="breakdown-item">
                                    <span className="category">Female</span>
                                    <span className="dots"></span>
                                    <span className="value">
                                        {
                                            monthlyData.find((m) => m.month === expandedMonth).details.soloAttendees
                                                .female
                                        }
                                    </span>
                                </div>
                                <div className="breakdown-item total">
                                    <span className="category">Total</span>
                                    <span className="dots"></span>
                                    <span className="value">
                                        {monthlyData.find((m) => m.month === expandedMonth).solo}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Couple Attendees */}
                        <div className="detail-card">
                            <h5>Couple Attendees</h5>
                            <div className="breakdown-list">
                                <div className="breakdown-item total">
                                    <span className="category">Total Couples</span>
                                    <span className="dots"></span>
                                    <span className="value">
                                        {monthlyData.find((m) => m.month === expandedMonth).couples}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quarterly Totals */}
            <div className="quarterly-section">
                <h3>Quarterly Totals</h3>
                <div className="quarterly-cards">
                    <div className="quarterly-card">
                        <h4>Quarter 1</h4>
                        <div className="quarterly-metric">
                            <span className="label">Classes Held</span>
                            <span className="number">{q1Total.classes}</span>
                        </div>
                        <div className="quarterly-metric">
                            <span className="label">Individuals</span>
                            <span className="number">{q1Total.individuals}</span>
                        </div>
                        <div className="quarterly-metric">
                            <span className="label">Target Couples</span>
                            <span className="number">{q1Total.couples}</span>
                        </div>
                    </div>

                    <div className="quarterly-card">
                        <h4>Quarter 2</h4>
                        <div className="quarterly-metric">
                            <span className="label">Classes Held</span>
                            <span className="number">{q2Total.classes}</span>
                        </div>
                        <div className="quarterly-metric">
                            <span className="label">Individuals</span>
                            <span className="number">{q2Total.individuals}</span>
                        </div>
                        <div className="quarterly-metric">
                            <span className="label">Target Couples</span>
                            <span className="number">{q2Total.couples}</span>
                        </div>
                    </div>

                    <div className="quarterly-card">
                        <h4>Quarter 3</h4>
                        <div className="quarterly-metric">
                            <span className="label">Classes Held</span>
                            <span className="number">{q3Total.classes}</span>
                        </div>
                        <div className="quarterly-metric">
                            <span className="label">Individuals</span>
                            <span className="number">{q3Total.individuals}</span>
                        </div>
                        <div className="quarterly-metric">
                            <span className="label">Target Couples</span>
                            <span className="number">{q3Total.couples}</span>
                        </div>
                    </div>

                    <div className="quarterly-card">
                        <h4>Quarter 4</h4>
                        <div className="quarterly-metric">
                            <span className="label">Classes Held</span>
                            <span className="number">{q4Total.classes}</span>
                        </div>
                        <div className="quarterly-metric">
                            <span className="label">Individuals</span>
                            <span className="number">{q4Total.individuals}</span>
                        </div>
                        <div className="quarterly-metric">
                            <span className="label">Target Couples</span>
                            <span className="number">{q4Total.couples}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Annual Totals */}
            <div className="annual-section">
                <h3>Annual Totals</h3>
                <div className="annual-cards">
                    <div className="annual-card">
                        <h5>Classes Held</h5>
                        <span className="number">{annualTotal.classes}</span>
                    </div>
                    <div className="annual-card">
                        <h5>Target Couples</h5>
                        <span className="number">{annualTotal.couples}</span>
                    </div>
                    <div className="annual-card">
                        <h5>Individuals</h5>
                        <span className="number">{annualTotal.individuals}</span>
                    </div>
                    <div className="annual-card">
                        <h5>Solo Male</h5>
                        <span className="number">{annualTotal.soloMale}</span>
                    </div>
                    <div className="annual-card">
                        <h5>Solo Female</h5>
                        <span className="number">{annualTotal.soloFemale}</span>
                    </div>
                    <div className="annual-card">
                        <h5>Couple Attendees</h5>
                        <span className="number">{annualTotal.couples}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MonthlyReportTable;
