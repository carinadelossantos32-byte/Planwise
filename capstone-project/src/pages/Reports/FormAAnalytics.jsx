import "./FormAAnalytics.css";

function FormAAnalytics() {
    const classesHeld = [
        { label: "4Ps", value: 24 },
        { label: "Non-4Ps", value: 18 },
        { label: "USAPAN", value: 15 },
        { label: "PMOC", value: 9 },
        { label: "House to House", value: 22 },
        { label: "Profiled Only", value: 12 },
        { label: "Others", value: 4 },
    ];

    const individualsReached = [
        { label: "4Ps", value: 420 },
        { label: "Non-4Ps", value: 356 },
        { label: "USAPAN", value: 278 },
        { label: "PMOC", value: 184 },
        { label: "House to House", value: 510 },
        { label: "Profiled Only", value: 245 },
        { label: "Others", value: 88 },
    ];

    const monthlySummary = [
        {
            month: "January",
            classes: 5,
            reached: 85,
            target: 40,
            participants: 78,
        },
        {
            month: "February",
            classes: 4,
            reached: 71,
            target: 35,
            participants: 62,
        },
        {
            month: "March",
            classes: 6,
            reached: 98,
            target: 48,
            participants: 87,
        },
        {
            month: "April",
            classes: 3,
            reached: 63,
            target: 30,
            participants: 56,
        },
    ];

    return (
        <div className="form-a-analytics">

            <h2>Form A Analytics</h2>

            {/* KPI CARDS */}

            <div className="analytics-cards">

                <div className="analytics-card blue">
                    <h4>Total Classes Held</h4>
                    <span>104</span>
                </div>

                <div className="analytics-card green">
                    <h4>Individuals Reached</h4>
                    <span>2,081</span>
                </div>

                <div className="analytics-card orange">
                    <h4>Target Couples</h4>
                    <span>856</span>
                </div>

                <div className="analytics-card purple">
                    <h4>Total Participants</h4>
                    <span>1,642</span>
                </div>

            </div>

            {/* TWO PANELS */}

            <div className="analytics-grid">

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

            </div>

            {/* SECOND GRID */}

            <div className="analytics-grid">

                <div className="analytics-panel">

                    <h3>Solo / Couple Summary</h3>

                    <div className="summary-row">
                        <span>Male Solo Attendees</span>
                        <strong>345</strong>
                    </div>

                    <div className="summary-row">
                        <span>Female Solo Attendees</span>
                        <strong>512</strong>
                    </div>

                    <div className="summary-row">
                        <span>Total Solo Attendees</span>
                        <strong>857</strong>
                    </div>

                    <div className="summary-row">
                        <span>Couple Attendees</span>
                        <strong>392</strong>
                    </div>

                </div>

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

            </div>

            {/* OFFICIAL REPORT TABLE */}

            <div className="analytics-panel report-table-panel">

                <div className="panel-header">
                    <h3>Official Form A Report</h3>

                    <button className="export-btn">
                        Export to Excel
                    </button>
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
                                        <td key={index}>-</td>
                                    ))}

                                </tr>

                            ))}

                        </tbody>

                        <tfoot>

                            <tr>

                                <td>Grand Total</td>

                                {[...Array(14)].map((_, index) => (
                                    <td key={index}>-</td>
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