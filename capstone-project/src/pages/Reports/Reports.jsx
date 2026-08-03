import "./reports.css";
import { barangays } from "../../data/barangays";
import { familyPlanningMethods } from "../../data/familyPlanningMethods";
import { useEffect, useMemo, useState } from "react";
import FormAAnalytics from "./form-reports/FormAAnalytics";
import FormBAnalytics from "./form-reports/FormBAnalytics";
import FormCAnalytics from "./form-reports/FormCAnalytics";
import Form1Analytics from "./form-reports/Form1Analytics";
import ModernFPUsersAnalytics from "./additional-reports/ModernFPUsersAnalytics";
import ModernShifters from "./additional-reports/ModernShifters";
import InventoryReport from "./inventory-reports/InventoryReport";
import { db } from "../../firebase-config";
import { collection, getDocs } from "firebase/firestore";

function Reports() {
    const [activeTab, setActiveTab] = useState("client");
    const [period, setPeriod] = useState("all");
    const [year, setYear] = useState(new Date().getFullYear());
    const [barangayFilter, setBarangayFilter] = useState("all");
    const [methodFilter, setMethodFilter] = useState("all");
    const [reportType, setReportType] = useState("form-a");
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

    useEffect(() => {
        let isMounted = true;

        const fetchClients = async () => {
            const collectionNames = ["clients_public", "clients_private", "clients_referred"];
            const loadedClients = [];

            for (const collectionName of collectionNames) {
                try {
                    const snapshot = await getDocs(collection(db, collectionName));
                    if (!snapshot.empty) {
                        snapshot.docs.forEach((doc) => {
                            loadedClients.push({
                                id: doc.id,
                                sourceCollection: collectionName,
                                ...doc.data(),
                            });
                        });
                    }
                } catch (err) {
                    console.error(`Unable to load ${collectionName}:`, err);
                }
            }

            if (isMounted) {
                setClients(loadedClients);
                setError(loadedClients.length ? "" : "No client data found in Firestore.");
                setLoading(false);
            }
        };

        fetchClients();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredClients = useMemo(() => {
        const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");
        const slugify = (value) =>
            normalizeText(value)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");

        const parseDate = (value) => {
            if (!value) return null;
            if (value?.toDate) return value.toDate();
            if (value instanceof Date) return value;
            if (typeof value === "string") {
                const parsed = new Date(value);
                return Number.isNaN(parsed.getTime()) ? null : parsed;
            }
            return null;
        };

        const getMonthLabel = (value) => {
            const parsedDate = parseDate(value);
            if (parsedDate) {
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
                return monthNames[parsedDate.getMonth()];
            }

            const textValue = normalizeText(String(value)).toLowerCase();
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
            return "";
        };

        return clients.filter((client) => {
            const barangayValue = normalizeText(client.barangay || client.barangay_name).toLowerCase().replace(/\s+/g, "-");
            const selectedBarangay = normalizeText(barangayFilter).toLowerCase().replace(/\s+/g, "-");
            const matchesBarangay = !selectedBarangay || selectedBarangay === "all" || barangayValue === selectedBarangay;

            const methodValue = slugify(
                client.fp_method ||
                client.FP_method ||
                client.method ||
                client.family_planning_method ||
                client.type ||
                client.category ||
                client.program ||
                client.intention_to_shift
            );
            const selectedMethod = slugify(methodFilter);
            const matchesMethod = !selectedMethod || selectedMethod === "all" || methodValue === selectedMethod;

            const selectedYearNumber = Number(year);
            const yearValueFromDate = parseDate(client.created_at || client.updated_at || client.date || client.month || client.report_month || client.service_month || client.month_of_service);
            const yearValue = yearValueFromDate?.getFullYear?.() ?? Number(normalizeText(client.year || client.report_year || client.service_year));
            const matchesYear = !selectedYearNumber || Number.isNaN(selectedYearNumber) || !yearValue || Number(yearValue) === selectedYearNumber || year === "all";

            const monthLabel = getMonthLabel(client.created_at || client.updated_at || client.date || client.month || client.report_month || client.service_month || client.month_of_service);
            let matchesPeriod = true;

            if (period !== "all") {
                const monthIndex = [
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
                ].indexOf(monthLabel);

                if (monthLabel) {
                    if (period === "q1") matchesPeriod = monthIndex <= 2;
                    if (period === "q2") matchesPeriod = monthIndex >= 3 && monthIndex <= 5;
                    if (period === "q3") matchesPeriod = monthIndex >= 6 && monthIndex <= 8;
                    if (period === "q4") matchesPeriod = monthIndex >= 9 && monthIndex <= 11;
                    if (period === "january") matchesPeriod = monthLabel === "January";
                    if (period === "february") matchesPeriod = monthLabel === "February";
                    if (period === "march") matchesPeriod = monthLabel === "March";
                    if (period === "april") matchesPeriod = monthLabel === "April";
                    if (period === "may") matchesPeriod = monthLabel === "May";
                    if (period === "june") matchesPeriod = monthLabel === "June";
                    if (period === "july") matchesPeriod = monthLabel === "July";
                    if (period === "august") matchesPeriod = monthLabel === "August";
                    if (period === "september") matchesPeriod = monthLabel === "September";
                    if (period === "october") matchesPeriod = monthLabel === "October";
                    if (period === "november") matchesPeriod = monthLabel === "November";
                    if (period === "december") matchesPeriod = monthLabel === "December";
                } else {
                    matchesPeriod = false;
                }
            }

            return matchesBarangay && matchesMethod && matchesYear && matchesPeriod;
        });
    }, [clients, barangayFilter, methodFilter, period, year]);

    const renderAnalytics = () => {
        switch (reportType) {
            case "form-b":
                return (
                    <FormBAnalytics
                        clients={filteredClients}
                        loading={loading}
                        error={error}
                    />
                );

            case "form-c":
                return (
                    <FormCAnalytics
                        clients={filteredClients}
                        loading={loading}
                        error={error}
                    />
                );

            case "form-1":
                return (
                    <Form1Analytics
                        clients={filteredClients}
                        loading={loading}
                        error={error}
                    />
                );

            case "modern-fp":
                return (
                    <ModernFPUsersAnalytics
                        clients={filteredClients}
                        loading={loading}
                        error={error}
                    />
                );

            case "modern-shifters":
                return (
                    <ModernShifters
                        clients={filteredClients}
                        loading={loading}
                    />
                );

            case "form-a":
            default:
                return (
                    <FormAAnalytics
                        clients={filteredClients}
                        loading={loading}
                        error={error}
                    />
                );
        }
    };

    return (
        <>
            <div className="reports-container">
                <h3>Reports & Analytics</h3>
                <div className="reports-header-actions">
                    <button className="refresh-btn">⟳ Refresh Data</button>
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
                            <div>
                                <p>Report Type</p>
                                <select
                                    value={reportType}
                                    onChange={(e) => setReportType(e.target.value)}
                                >
                                    <option value="form-a">FORM A</option>
                                    <option value="form-b">FORM B</option>
                                    <option value="form-c">FORM C</option>
                                    <option value="form-1">FORM 1</option>

                                    <optgroup label="Additional Reports">
                                        <option value="modern-fp">
                                            Modern FP Users
                                        </option>
                                        <option value="modern-shifters">
                                            Modern FP Shifters
                                        </option>
                                    </optgroup>
                                </select>
                            </div>

                            <div>
                                <p>Barangay</p>
                                <select value={barangayFilter} onChange={(e) => setBarangayFilter(e.target.value)}>
                                    <option value="all">All Barangays</option>
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

                            <div>
                                <p>Period</p>
                                <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                                    {periods.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <p>Year</p>
                                <select value={year} onChange={(e) => setYear(e.target.value)}>
                                    {years.map((yr) => (
                                        <option key={yr} value={yr}>
                                            {yr}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <p>Method</p>
                                <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                                    <option value="all">All Methods</option>
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
                    <InventoryReport />
                )}
            </div>
        </>
    );
}

export default Reports;