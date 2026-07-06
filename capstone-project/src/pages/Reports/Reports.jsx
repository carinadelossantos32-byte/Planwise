import "./reports.css";
import { barangays } from "../../data/barangays";
import { familyPlanningMethods } from "../../data/familyPlanningMethods";
import { useState } from "react";
import FormAAnalytics from "./FormAAnalytics";
import FormBAnalytics from "./FormBAnalytics";
import FormCAnalytics from "./FormCAnalytics";
import MonthlyReportTable from "./MonthlyReportTable";

function Reports() {
    const [activeTab, setActiveTab] = useState("client");
    const [period, setPeriod] = useState("all");
    const [year, setYear] = useState(new Date().getFullYear());
    const [reportType, setReportType] = useState("form-a");

    const periods = [
    { value: "all", label: "All Year" },

    { value: "q1", label: "Q1 (Jan - Mar)" },
    { value: "q2", label: "Q2 (Apr - Jun)" },
    { value: "q3", label: "Q3 (Jul - Sep)" },
    { value: "q4", label: "Q4 (Oct - Dec)" },

    { value: "january", label: "January" },
    { value: "february", label: "February" },
    { value: "march", label: "March" },
    { value: "april", label: "April" },
    { value: "may", label: "May" },
    { value: "june", label: "June" },
    { value: "july", label: "July" },
    { value: "august", label: "August" },
    { value: "september", label: "September" },
    { value: "october", label: "October" },
    { value: "november", label: "November" },
    { value: "december", label: "December" },
];

const years = [];

for (let y = 2024; y <= 2035; y++) {
    years.push(y);
}

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
                        className={`tab-btn ${activeTab === "monthly" ? "active" : ""}`}
                        onClick={() => setActiveTab("monthly")}
                    >
                        Monthly Report
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

                            {/* Period */}

<div>

    <p>Period</p>

    <select
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
    >

        {periods.map((item) => (

            <option
                key={item.value}
                value={item.value}
            >
                {item.label}
            </option>

        ))}

    </select>

</div>

{/* Year */}

<div>

    <p>Year</p>

    <select
        value={year}
        onChange={(e) => setYear(e.target.value)}
    >

        {years.map((yr) => (

            <option
                key={yr}
                value={yr}
            >
                {yr}
            </option>

        ))}

    </select>

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

                {activeTab === "monthly" && (
                    <div className="monthly-report-content">
                        <MonthlyReportTable />
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