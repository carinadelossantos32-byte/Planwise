import "./FormBAnalytics.css";

function FormBAnalytics() {
    return (
        <div className="report-results-section">
            <h3>FORM B Analytics</h3>

            {/* Summary Cards */}
            <div className="analytics-summary-cards">
                <div className="analytics-card unmet-card">
                    <h4>Couples with Unmet Need</h4>
                    <span className="card-number">621</span>
                    <p>For Modern FP</p>
                </div>

                <div className="analytics-card traditional-card">
                    <h4>Traditional FP Users</h4>
                    <span className="card-number">401</span>
                    <p>Want to Shift</p>
                </div>

                <div className="analytics-card referred-card">
                    <h4>Total Referred/Served</h4>
                    <span className="card-number">1,022</span>
                    <p>This Quarter</p>
                </div>
            </div>

            {/* Breakdown Section */}
            <div className="analytics-breakdown-grid">

                <div className="analytics-panel">
                    <h4>Unmet Need Breakdown</h4>

                    <div className="stat-box">
                        <span>Unmet Need for Modern FP</span>
                        <strong>138</strong>
                    </div>

                    <div className="stat-box">
                        <span>Unmet Need for Modern FP Referred/Served</span>
                        <strong>138</strong>
                    </div>
                </div>

                <div className="analytics-panel">
                    <h4>Traditional FP Users Status</h4>

                    <div className="stat-box">
                        <span>Clients Referred/Served</span>
                        <strong>45</strong>
                    </div>

                    <div className="stat-box">
                        <span>Without Intention to Shift</span>
                        <strong>54</strong>
                    </div>

                    <div className="stat-box">
                        <span>With Intention to Shift</span>
                        <strong>52</strong>
                    </div>
                </div>

            </div>

            {/* Client Journey */}
            <div className="journey-section">
                <h4>Client Journey Flow</h4>

                <div className="journey-flow">

                    <div className="journey-box purple">
                        <strong>621</strong>
                        <span>Unmet Need Identified</span>
                    </div>

                    <div className="journey-arrow">→</div>

                    <div className="journey-box yellow">
                        <strong>401</strong>
                        <span>Traditional FP Users</span>
                    </div>

                    <div className="journey-arrow">→</div>

                    <div className="journey-box blue">
                        <strong>1022</strong>
                        <span>Referred/Served</span>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default FormBAnalytics;