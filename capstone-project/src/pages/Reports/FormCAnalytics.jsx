import "./FormCAnalytics.css";

function FormCAnalytics() {
    const monthlyMethodData = [
        { month: "January", condom: 18, iud: 24, pills: 42, injectable: 31 },
        { month: "February", condom: 21, iud: 27, pills: 39, injectable: 29 },
        { month: "March", condom: 19, iud: 30, pills: 45, injectable: 33 },
        { month: "April", condom: 23, iud: 29, pills: 43, injectable: 32 },
        { month: "May", condom: 24, iud: 31, pills: 47, injectable: 35 },
        { month: "June", condom: 25, iud: 33, pills: 49, injectable: 37 },
    ];

    const januaryData = monthlyMethodData[0];
    const januaryMethods = [
        { name: "Condom", value: januaryData.condom, color: "#ec4899" },
        { name: "IUD", value: januaryData.iud, color: "#4f7df5" },
        { name: "Pills", value: januaryData.pills, color: "#22c55e" },
        { name: "Injectable", value: januaryData.injectable, color: "#f59e0b" },
    ];
    const maxJanuaryValue = Math.max(...januaryMethods.map((method) => method.value));

    return (
        <div className="report-results-section">
            <h3>FORM C Analytics</h3>

            <div className="analytics-summary-cards">
                <div className="analytics-card blue-card">
                    <h4>Referred & Served</h4>
                    <span className="card-number">1,282</span>
                    <p>Total Individuals</p>
                </div>

                <div className="analytics-card green-card">
                    <h4>Current Users</h4>
                    <span className="card-number">8,415</span>
                    <p>Using FP Methods</p>
                </div>

                <div className="analytics-card yellow-card">
                    <h4>Most Used Method</h4>
                    <span className="card-number">Pills</span>
                    <p>2,156 Users</p>
                </div>
            </div>

            <div className="analytics-grid">

                <div className="analytics-panel">
                    <h4>Top Family Planning Methods</h4>

                    <div className="methods-comparison">
                        <div className="methods-column">
                            <h5>Current Users by Method</h5>

                            <div className="method-progress-row">
                                <span>IUD</span>
                                <div className="progress-bar">
                                    <div className="progress-fill blue" style={{ width: "22%" }}>
                                        1,834
                                    </div>
                                </div>
                                <small>21.8%</small>
                            </div>

                            <div className="method-progress-row">
                                <span>Pills</span>
                                <div className="progress-bar">
                                    <div className="progress-fill green" style={{ width: "26%" }}>
                                        2,156
                                    </div>
                                </div>
                                <small>25.6%</small>
                            </div>

                            <div className="method-progress-row">
                                <span>Injectable</span>
                                <div className="progress-bar">
                                    <div className="progress-fill yellow" style={{ width: "24%" }}>
                                        1,998
                                    </div>
                                </div>
                                <small>23.7%</small>
                            </div>

                            <div className="method-progress-row">
                                <span>Condom</span>
                                <div className="progress-bar">
                                    <div className="progress-fill pink" style={{ width: "11%" }}>
                                        92
                                    </div>
                                </div>
                                <small>10.6%</small>
                            </div>
                        </div>

                        <div className="methods-column">
                            <h5>Newly Referred by Method</h5>

                            <div className="method-progress-row">
                                <span>IUD</span>
                                <div className="progress-bar">
                                    <div className="progress-fill blue" style={{ width: "19%" }}>
                                        245
                                    </div>
                                </div>
                                <small>19.1%</small>
                            </div>

                            <div className="method-progress-row">
                                <span>Pills</span>
                                <div className="progress-bar">
                                    <div className="progress-fill green" style={{ width: "24%" }}>
                                        312
                                    </div>
                                </div>
                                <small>24.3%</small>
                            </div>

                            <div className="method-progress-row">
                                <span>Injectable</span>
                                <div className="progress-bar">
                                    <div className="progress-fill yellow" style={{ width: "23%" }}>
                                        289
                                    </div>
                                </div>
                                <small>22.5%</small>
                            </div>

                            <div className="method-progress-row">
                                <span>Condom</span>
                                <div className="progress-bar">
                                    <div className="progress-fill pink" style={{ width: "12%" }}>
                                        86
                                    </div>
                                </div>
                                <small>12.2%</small>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div className="modern-table-card">
                <div className="table-header">
                    <h4>Individuals Referred & Served with Unmet Need for Modern FP</h4>
                    <span>2026</span>
                </div>

                <div className="table-wrapper">
                    <table className="modern-fp-table">
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
                                <th>SDM</th>
                                <th>LAM</th>
                                <th>Total</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr>
                                <td>January</td>
                                <td>12</td>
                                <td>18</td>
                                <td>25</td>
                                <td>30</td>
                                <td>2</td>
                                <td>1</td>
                                <td>10</td>
                                <td>4</td>
                                <td>3</td>
                                <td className="total-cell">105</td>
                            </tr>

                            <tr>
                                <td>February</td>
                                <td>10</td>
                                <td>15</td>
                                <td>22</td>
                                <td>28</td>
                                <td>1</td>
                                <td>2</td>
                                <td>12</td>
                                <td>3</td>
                                <td>2</td>
                                <td className="total-cell">95</td>
                            </tr>
                        </tbody>

                        <tfoot>
                            <tr>
                                <td>Grand Total</td>
                                <td>220</td>
                                <td>350</td>
                                <td>510</td>
                                <td>620</td>
                                <td>25</td>
                                <td>18</td>
                                <td>190</td>
                                <td>45</td>
                                <td>30</td>
                                <td>2008</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default FormCAnalytics;