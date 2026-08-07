import "./FormBAnalytics.css";

function FormBAnalytics() {

    const unmetNeed = [
        {
            title: "Couples with Unmet Need for Modern FP",
            value: 138,
        },
        {
            title: "Clients with Unmet Need Referred / Served",
            value: 95,
        },
        {
            title: "Total Unmet Need",
            value: 192,
        },
    ];

    const traditionalUsers = [
        {
            title: "Without Intention to Shift",
            value: 87,
        },
        {
            title: "With Intention to Shift",
            value: 45,
        },
        {
            title: "Traditional FP Users Referred / Served",
            value: 76,
        },
    ];

    const monthlySummary = [
        {
            month: "January",
            unmet: 12,
            traditional: 18,
            referred: 10,
            total: 30,
        },
        {
            month: "February",
            unmet: 10,
            traditional: 15,
            referred: 9,
            total: 25,
        },
        {
            month: "March",
            unmet: 16,
            traditional: 21,
            referred: 15,
            total: 37,
        },
        {
            month: "April",
            unmet: 11,
            traditional: 13,
            referred: 8,
            total: 24,
        },
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

    return (

        <div className="form-b-analytics">

            <h2>Form B Analytics</h2>

            {/* KPI CARDS */}

            <div className="analytics-cards">

                <div className="analytics-card blue">
                    <h4>Couples with Unmet Need</h4>
                    <span>621</span>
                </div>

                <div className="analytics-card orange">
                    <h4>Traditional FP Users</h4>
                    <span>401</span>
                </div>

                <div className="analytics-card red">
                    <h4>Total Unmet Need</h4>
                    <span>842</span>
                </div>

                <div className="analytics-card green">
                    <h4>Total Referred / Served</h4>
                    <span>296</span>
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

                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>

                                </tr>

                            ))}

                        </tbody>

                        <tfoot>

                            <tr>

                                <td>Grand Total</td>

                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>

                            </tr>

                        </tfoot>

                    </table>

                </div>

            </div>

        </div>

    );

}

export default FormBAnalytics;