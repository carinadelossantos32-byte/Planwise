import "./FormCAnalytics.css";

function FormCAnalytics() {

    const methods = [
        { name: "Condom", value: 95 },
        { name: "IUD", value: 142 },
        { name: "Pills", value: 318 },
        { name: "Injectable", value: 276 },
        { name: "NSV", value: 12 },
        { name: "BTL", value: 35 },
        { name: "Subdermal Implant", value: 108 },
        { name: "CCM/Billings", value: 18 },
        { name: "BBT", value: 15 },
        { name: "Sympto-Thermal", value: 22 },
        { name: "SDM", value: 29 },
        { name: "LAM", value: 46 },
    ];

    const months = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ];

    return (
        <div className="form-c-analytics">

            <h2>Form C Analytics</h2>

            {/* KPI Cards */}

            <div className="analytics-cards">

                <div className="analytics-card blue">
                    <h4>Total Referred & Served</h4>
                    <span>1,116</span>
                </div>

                <div className="analytics-card green">
                    <h4>Most Used Method</h4>
                    <span>Pills</span>
                </div>

                <div className="analytics-card orange">
                    <h4>Modern Methods</h4>
                    <span>988</span>
                </div>

                <div className="analytics-card purple">
                    <h4>Natural Methods</h4>
                    <span>128</span>
                </div>

            </div>

            <div className="analytics-grid">

                <div className="analytics-panel">

                    <h3>Family Planning Method Distribution</h3>

                    {methods.map(method => {

                        const percentage =
                            (method.value /
                                Math.max(...methods.map(m => m.value))) * 100;

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

                            {months.map(month => (

                                <tr key={month}>
                                    <td>{month}</td>
                                    <td>-</td>
                                    <td>-</td>
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

                            {months.map(month => (

                                <tr key={month}>

                                    <td>{month}</td>

                                    {[...Array(13)].map((_, i) => (
                                        <td key={i}>-</td>
                                    ))}

                                </tr>

                            ))}

                        </tbody>

                        <tfoot>

                            <tr>

                                <td>Grand Total</td>

                                {[...Array(13)].map((_, i) => (
                                    <td key={i}>-</td>
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