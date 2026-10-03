import "./reports.css";
import { barangays } from "../../data/barangays";
import { familyPlanningMethods } from "../../data/familyPlanningMethods";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FormAAnalytics from "./form-reports/FormAAnalytics";
import FormBAnalytics from "./form-reports/FormBAnalytics";
import FormCAnalytics from "./form-reports/FormCAnalytics";
import ModernFPUsersAnalytics from "./additional-reports/ModernFPUsersAnalytics";
import ModernShifters from "./additional-reports/ModernShifters";
import { db } from "../../firebase-config";
import { collection, getDocs } from "firebase/firestore";
import { RefreshCw } from "lucide-react";
import ReportSelect from "../../components/ReportSelect/ReportSelect";
import { getClientDate, isArchived, canonicalMethod } from "./reportData";

function Reports() {
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

    const reportTypeOptions = [
        { value: "form-a", label: "FORM A" },
        { value: "form-b", label: "FORM B" },
        { value: "form-c", label: "FORM C" },
        {
            group: "Additional Reports",
            options: [
                { value: "modern-fp", label: "Modern FP Users" },
                { value: "modern-shifters", label: "Modern FP Shifters" },
            ],
        },
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

        return clients.filter((client) => {

            // Archived records are never part of a report
            if (isArchived(client)) return false;

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

            const selectedMethod = slugify(methodFilter);

            // The dropdown lists full names ("Basal Body Temperature (BBT)") while
            // records hold short ones ("Bbt"), so both are reduced to one name first
            const matchesMethod =
                selectedMethod === "all" ||
                !selectedMethod ||
                canonicalMethod(
                    client.fp_method ||
                    client.FP_method ||
                    client.method ||
                    client.family_planning_method ||
                    client.familyPlanningMethod
                ) === canonicalMethod(methodFilter);


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

    const toSlug = (value) => value.toLowerCase().replace(/\s+/g, "-");

    // The four data filters: shown on the page and again in each report's
    // export confirmation, where they can still be changed before exporting
    const filterControls = [
        {
            key: "barangay",
            label: "Barangay",
            value: barangayFilter,
            onChange: (e) => setBarangayFilter(e.target.value),
            options: [
                { value: "all", label: "All Barangays" },
                ...barangays.map((barangay) => ({ value: toSlug(barangay), label: barangay })),
            ],
        },
        {
            key: "period",
            label: "Period",
            value: period,
            onChange: (e) => setPeriod(e.target.value),
            options: periods,
        },
        {
            key: "year",
            label: "Year",
            value: year,
            onChange: (e) => setYear(e.target.value),
            options: [
                { value: "all", label: "All Years" },
                ...years.map((yr) => ({ value: yr, label: yr })),
            ],
        },
        {
            key: "method",
            label: "Method",
            value: methodFilter,
            onChange: (e) => setMethodFilter(e.target.value),
            options: [
                { value: "all", label: "All Methods" },
                ...familyPlanningMethods.map((method) => ({ value: toSlug(method), label: method })),
            ],
        },
    ];

    const renderAnalytics = () => {
        switch (reportType) {
            case "form-b":
                return (
                    <FormBAnalytics
                        clients={filteredClients}
                        exportFilters={filterControls}
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
                        exportFilters={filterControls}
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
                        exportFilters={filterControls}
                        error={error}
                    />
                );

            case "modern-shifters":
                return (
                    <ModernShifters
                        clients={filteredClients}
                        exportFilters={filterControls}
                    />
                );

            case "form-a":
            default:
                return (
                    <FormAAnalytics
                        clients={filteredClients}
                        exportFilters={filterControls}
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
                <div className="clients-report-content">
                    <div className="filter-section">
                        <div>
                            <p>Report Type</p>
                            <ReportSelect
                                ariaLabel="Report Type"
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                options={reportTypeOptions}
                            />
                        </div>

                        {filterControls.map((control) => (
                            <div key={control.key}>
                                <p>{control.label}</p>
                                <ReportSelect
                                    ariaLabel={control.label}
                                    value={control.value}
                                    onChange={control.onChange}
                                    options={control.options}
                                />
                            </div>
                        ))}
                    </div>

                    <div className={`report-stage${loading || refreshing ? " is-loading" : ""}`}>
                        {renderAnalytics()}
                    </div>
                </div>
            </div>
        </>
    );


}

export default Reports