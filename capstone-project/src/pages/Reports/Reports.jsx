import "./reports.css";
import { barangays } from "../../data/barangays";
import { familyPlanningMethods } from "../../data/familyPlanningMethods";
import { useState } from "react";
import FormAAnalytics from "./FormAAnalytics";
import FormBAnalytics from "./FormBAnalytics";
import FormCAnalytics from "./FormCAnalytics";

function Reports() {
    const [activeTab, setActiveTab] = useState("client");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reportType, setReportType] = useState("form-a");

    const renderAnalytics = () => {
        switch (reportType) {
            case "form-b":
                return <FormBAnalytics />;
            case "form-c":
                return <FormCAnalytics />;
            case "form-a":
            default:
                return <FormAAnalytics />;
        }
    };

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
                                <select
                                    value={reportType}
                                    onChange={(e) => setReportType(e.target.value)}
                                >
                                    <option value="form-a">FORM A</option>
                                    <option value="form-b">FORM B</option>
                                    <option value="form-c">FORM C</option>
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

                            {renderAnalytics()}

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