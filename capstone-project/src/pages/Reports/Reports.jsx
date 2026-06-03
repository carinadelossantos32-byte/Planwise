import "./reports.css";
import { barangays } from "../../data/barangays";
import { familyPlanningMethods } from "../../data/familyPlanningMethods";
import { useState } from "react";

function Reports() {
    const [activeTab, setActiveTab] = useState("client");
    const [dateRange, setDateRange] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    return (
        <>
            <div className="reports-container">
                <h3>Reports & Analytics</h3>
                <div className="reports-header-actions">
                    <button className="refresh-btn">⟳ Refresh Data</button>
                    <button className="export-pdf-btn"> Export as PDF</button>
                    <button className="export-excel-btn"> Export as Excel</button>
                </div>
            </div>

            <div className="report-tabs-container">
                <div className="tabs-header">
                    <button
                        className={`tab-btn ${activeTab === "client" ? "active" : ""}`}
                        onClick={() => setActiveTab("client")}
                    >
                        Client Reports
                    </button>
                    <button
                        className={`tab-btn ${activeTab === "inventory" ? "active" : ""}`}
                        onClick={() => setActiveTab("inventory")}
                    >
                        Inventory Report
                    </button>
                </div>

                {activeTab === "client" && (
                    <div className="clients-report-content">

                        <div className="filter-section">

                            {/* Report Type */}
                            <div>
                                <p>Report Type</p>
                                <select>
                                    <option value="form-a">FORM A</option>
                                    <option value="form-b">Form B</option>
                                    <option value="form-c">Form C</option>
                                </select>
                            </div>

                            {/* Barangay */}
                            <div>
                                <p>Barangay</p>
                                <select>
                                    {barangays.map((barangay, index) => (
                                        <option
                                            key={index}
                                            value={barangay.toLowerCase().replace(/\s+/g, "-")}
                                        >
                                            {barangay}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Range */}
                            <div>
                                <p>Date Range</p>

                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />

                                <span> to </span>

                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            {/* Method */}
                            <div>
                                <p>Method</p>
                                <select>
                                    {familyPlanningMethods.map((method, index) => (
                                        <option
                                            key={index}
                                            value={method.toLowerCase().replace(/\s+/g, "-")}
                                        >
                                            {method}
                                        </option>
                                    ))}
                                </select>
                            </div>

                        </div>

                        <div className="report-results-section">

                            <div className="client-records-cards">
                                <div className="total-classes-card">
                                    <h4>Total Classes Held</h4>
                                    <span className="card-number">248</span>
                                    <p className="card-subtitle">This Quarter</p>
                                </div>

                                <div className="individuals-reached-card">
                                    <h4>Individuals Reached</h4>
                                    <span className="card-number">2,093</span>
                                    <p className="card-subtitle">Reproductive Age</p>
                                </div>

                                <div className="solo-attendees-card">
                                    <h4>Solo Attendees</h4>
                                    <span className="card-number">856</span>
                                    <p className="card-subtitle">Solo, SFPPI Couple, 3+</p>
                                </div>

                                <div className="couple-attendees-card">
                                    <h4>Couple Attendees</h4>
                                    <span className="card-number">1,237</span>
                                    <p className="card-subtitle">Couple Classes</p>
                                </div>
                            </div>

                            <div className="chart-section">
                                <h3>Classes & Reach by Program Type</h3>
                                <div className="bar-chart">
                                    <div className="bar-item">
                                        <div className="bar-label">4Ps</div>
                                        <div className="bar-container">
                                            <div className="bar" style={{ width: "70%", backgroundColor: "#4f46e5" }}>
                                                <span className="bar-value">66 classes</span>
                                            </div>
                                        </div>
                                        <div className="bar-reach">524 people</div>
                                    </div>
                                    <div className="bar-item">
                                        <div className="bar-label">Non-4Ps</div>
                                        <div className="bar-container">
                                            <div className="bar" style={{ width: "50%", backgroundColor: "#4f46e5" }}>
                                                <span className="bar-value">45 classes</span>
                                            </div>
                                        </div>
                                        <div className="bar-reach">389 people</div>
                                    </div>
                                    <div className="bar-item">
                                        <div className="bar-label">USAPAN</div>
                                        <div className="bar-container">
                                            <div className="bar" style={{ width: "55%", backgroundColor: "#4f46e5" }}>
                                                <span className="bar-value">52 classes</span>
                                            </div>
                                        </div>
                                        <div className="bar-reach">456 people</div>
                                    </div>
                                    <div className="bar-item">
                                        <div className="bar-label">PMOC</div>
                                        <div className="bar-container">
                                            <div className="bar" style={{ width: "38%", backgroundColor: "#4f46e5" }}>
                                                <span className="bar-value">38 classes</span>
                                            </div>
                                        </div>
                                        <div className="bar-reach">312 people</div>
                                    </div>
                                    <div className="bar-item">
                                        <div className="bar-label">House to House</div>
                                        <div className="bar-container">
                                            <div className="bar" style={{ width: "33%", backgroundColor: "#4f46e5" }}>
                                                <span className="bar-value">30 classes</span>
                                            </div>
                                        </div>
                                        <div className="bar-reach">267 people</div>
                                    </div>
                                    <div className="bar-item">
                                        <div className="bar-label">Profiled Only</div>
                                        <div className="bar-container">
                                            <div className="bar" style={{ width: "17%", backgroundColor: "#4f46e5" }}>
                                                <span className="bar-value">15 classes</span>
                                            </div>
                                        </div>
                                        <div className="bar-reach">145 people</div>
                                    </div>
                                </div>
                            </div>

                            <div className="charts-grid">
                                <div className="pie-chart-container">
                                    <h4>Attendance Type</h4>
                                    <div className="pie-chart">
                                        <svg viewBox="0 0 200 200">
                                            <circle cx="100" cy="100" r="70" fill="none" stroke="#4f46e5" strokeWidth="40"
                                                strokeDasharray="182 443" strokeDashoffset="0" />
                                            <circle cx="100" cy="100" r="70" fill="none" stroke="#10b981" strokeWidth="40"
                                                strokeDasharray="261 443" strokeDashoffset="-182" />
                                        </svg>
                                        <div className="pie-center">2,093<br /><small>Total</small></div>
                                    </div>
                                    <div className="pie-legend">
                                        <div className="legend-item">
                                            <span className="dot" style={{ backgroundColor: "#4f46e5" }}></span>
                                            <span>Solo (41%)</span>
                                        </div>
                                        <div className="legend-item">
                                            <span className="dot" style={{ backgroundColor: "#10b981" }}></span>
                                            <span>Couple (59%)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bar-chart-container">
                                    <h4>Gender Distribution (Solo)</h4>
                                    <div className="gender-bars">
                                        <div className="gender-item">
                                            <div className="gender-label">Male</div>
                                            <div className="gender-bar-container">
                                                <div className="gender-bar" style={{ width: "40%", backgroundColor: "#4f46e5" }}></div>
                                            </div>
                                            <div className="gender-count">342 (40%)</div>
                                        </div>
                                        <div className="gender-item">
                                            <div className="gender-label">Female</div>
                                            <div className="gender-bar-container">
                                                <div className="gender-bar" style={{ width: "60%", backgroundColor: "#ec4899" }}></div>
                                            </div>
                                            <div className="gender-count">514 (60%)</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>
                )}

                {activeTab === "inventory" && (
                    <div className="clients-report-content">
                        <p>Inventory Report content will go here</p>
                    </div>
                )}

            </div>
        </>
    );
}

export default Reports;