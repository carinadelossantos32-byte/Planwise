import "./reports.css";
import { barangays } from "../../data/barangays";
import { familyPlanningMethods } from "../../data/familyPlanningMethods";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FormAAnalytics from "./form-reports/FormAAnalytics";
import FormBAnalytics from "./form-reports/FormBAnalytics";
import FormCAnalytics from "./form-reports/FormCAnalytics";
import ModernFPUsersAnalytics from "./additional-reports/ModernFPUsersAnalytics";
import ModernShifters from "./additional-reports/ModernShifters";
import InventoryReport from "./inventory-reports/InventoryReport";
import { db } from "../../firebase-config";
import { collection, getDocs } from "firebase/firestore";
import { RefreshCw } from "lucide-react";

function Reports() {
    const [activeTab, setActiveTab] = useState("client");
    const [period, setPeriod] = useState("all");
    const [year, setYear] = useState(new Date().getFullYear());
    const [importedYears, setImportedYears] = useState([]);
    const [barangayFilter, setBarangayFilter] = useState("all");
    const [methodFilter, setMethodFilter] = useState("all");
    const [reportType, setReportType] = useState("form-a");
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const isMountedRef = useRef(true);

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

    // 2010-2035, plus any imported year outside that range
    const years = useMemo(() => {
        const list = new Set(importedYears.map(Number));
        for (let y = 2010; y <= 2035; y++) list.add(y);
        return [...list].sort((a, b) => a - b);
    }, [importedYears]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Loads every client collection from Firestore (used on mount and by Refresh Data)
    const fetchClients = useCallback(async () => {
        const collectionNames = ["clients_public", "clients_private", "clients_referred"];

        const results = await Promise.all(
            collectionNames.map(async (collectionName) => {
                try {
                    const snapshot = await getDocs(collection(db, collectionName));
                    return {
                        collectionName,
                        ok: true,
                        docs: snapshot.docs.map((doc) => ({
                            id: doc.id,
                            sourceCollection: collectionName,
                            ...doc.data(),
                        })),
                    };
                } catch (err) {
                    console.error(`Unable to load ${collectionName}:`, err);
                    return { collectionName, ok: false, docs: [] };
                }
            })
        );

        if (!isMountedRef.current) return;

        const loadedClients = results.flatMap((r) => r.docs);
        const failed = results.filter((r) => !r.ok).map((r) => r.collectionName);

        if (failed.length === results.length) {
            // Everything failed: keep what is already on screen
            setError("Unable to load client data. Check your connection and try again.");
        } else {
            // A collection that failed keeps its previously loaded records
            setClients((prev) => [
                ...loadedClients,
                ...prev.filter((c) => failed.includes(c.sourceCollection)),
            ]);

            setError(
                failed.length
                    ? `Some data could not be refreshed (${failed.join(", ")}).`
                    : loadedClients.length
                        ? ""
                        : "No client data found in Firestore."
            );

            setLastUpdated(new Date());
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const handleRefresh = async () => {
        if (refreshing) return;

        setRefreshing(true);

        try {
            // Keep the spinner visible for at least 800ms, like the dashboard
            await Promise.all([
                fetchClients(),
                new Promise((resolve) => setTimeout(resolve, 800)),
            ]);
        } finally {
            if (isMountedRef.current) setRefreshing(false);
        }
    };

    const filteredClients = useMemo(() => {

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

        const normalizeText = (value) => {
            if (value === null || value === undefined) return "";
            return String(value).trim();
        };

        const slugify = (value) =>
            normalizeText(value)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");

        const parseDate = (value) => {

            if (!value) return null;

            // Firestore Timestamp
            if (value?.toDate) {
                const date = value.toDate();

                return Number.isNaN(date.getTime())
                    ? null
                    : date;
            }

            // JavaScript Date
            if (value instanceof Date) {
                return Number.isNaN(value.getTime())
                    ? null
                    : value;
            }

            // String / number date
            if (
                typeof value === "string" ||
                typeof value === "number"
            ) {

                const parsed = new Date(value);

                return Number.isNaN(parsed.getTime())
                    ? null
                    : parsed;

            }

            return null;
        };

        const getClientDate = (client) => {

            const possibleDates = [
                client.created_at,
                client.updated_at,
                client.date,
                client.month_of_service,
                client.service_month,
                client.report_month,
            ];

            for (const value of possibleDates) {

                const date = parseDate(value);

                if (date) {
                    return date;
                }

            }

            return null;
        };

        return clients.filter((client) => {

            /* =========================
               BARANGAY FILTER
            ========================= */

            const clientBarangay = slugify(
                client.barangay ||
                client.barangay_name ||
                client.barangayName
            );

            const selectedBarangay =
                slugify(barangayFilter);

            const matchesBarangay =
                selectedBarangay === "all" ||
                !selectedBarangay ||
                clientBarangay === selectedBarangay;


            /* =========================
               METHOD FILTER
            ========================= */

            const clientMethod = slugify(
                client.fp_method ||
                client.FP_method ||
                client.method ||
                client.family_planning_method ||
                client.familyPlanningMethod ||
                client.intention_to_shift
            );

            const selectedMethod =
                slugify(methodFilter);

            const matchesMethod =
                selectedMethod === "all" ||
                !selectedMethod ||
                clientMethod === selectedMethod;


            /* =========================
               DATE
            ========================= */

            const clientDate = getClientDate(client);

            let matchesYear = true;
            let matchesPeriod = true;


            /* =========================
               YEAR FILTER
            ========================= */

            if (year !== "all") {

                const selectedYear = Number(year);

                if (!clientDate) {

                    matchesYear = false;

                } else {

                    matchesYear =
                        clientDate.getFullYear() === selectedYear;

                }

            }


            /* =========================
               PERIOD FILTER
            ========================= */

            if (period !== "all") {

                if (!clientDate) {

                    matchesPeriod = false;

                } else {

                    const monthIndex =
                        clientDate.getMonth();

                    switch (period) {

                        case "q1":
                            matchesPeriod =
                                monthIndex >= 0 &&
                                monthIndex <= 2;
                            break;

                        case "q2":
                            matchesPeriod =
                                monthIndex >= 3 &&
                                monthIndex <= 5;
                            break;

                        case "q3":
                            matchesPeriod =
                                monthIndex >= 6 &&
                                monthIndex <= 8;
                            break;

                        case "q4":
                            matchesPeriod =
                                monthIndex >= 9 &&
                                monthIndex <= 11;
                            break;

                        default: {

                            const selectedMonth =
                                monthNames.findIndex(
                                    month =>
                                        month.toLowerCase() ===
                                        period.toLowerCase()
                                );

                            matchesPeriod =
                                monthIndex === selectedMonth;

                            break;
                        }

                    }

                }

            }


            return (
                matchesBarangay &&
                matchesMethod &&
                matchesYear &&
                matchesPeriod
            );

        });

    }, [
        clients,
        barangayFilter,
        methodFilter,
        period,
        year
    ]);

    const renderAnalytics = () => {
        switch (reportType) {
            case "form-b":
                return (
                    <FormBAnalytics
                        clients={filteredClients}
                        loading={loading}
                        error={error}
                        year={year}
                        period={period}
                        onYearChange={setYear}
                        onPeriodChange={setPeriod}
                        onImportedYearsChange={setImportedYears}
                    />
                );

            case "form-c":
                return (
                    <FormCAnalytics
                        clients={filteredClients}
                        loading={loading}
                        error={error}
                        year={year}
                        period={period}
                        onYearChange={setYear}
                        onPeriodChange={setPeriod}
                        onImportedYearsChange={setImportedYears}
                        barangayFilter={barangayFilter}
                        methodFilter={methodFilter}
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
                        year={year}
                        period={period}
                        onYearChange={setYear}
                        onPeriodChange={setPeriod}
                        onImportedYearsChange={setImportedYears}
                    />
                );
        }
    };

    return (
        <>
            <div className="reports-container">
                <h3>Reports & Analytics</h3>
                <div className="reports-header-actions">
                    
                    <button
                        type="button"
                        className="refresh-btn"
                        onClick={handleRefresh}
                        disabled={refreshing || loading}
                        style={{ cursor: refreshing ? "wait" : "pointer" }}
                    >
                        <RefreshCw size={14} className={refreshing ? "spin-icon" : ""} />
                        {refreshing ? "Refreshing..." : "Refresh Data"}
                    </button>
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
                                    <option value="all">All Years</option>
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

export default Reports