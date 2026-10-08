import { notify } from "../../utils/notify";
import "./inventory.css"
import { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase-config"
import { CheckCircle, RefreshCw, Plus, X, SquarePen, SquarePlus, SquareMinus, Boxes, TriangleAlert, Building2, Users, MapPin, FileText, FileSpreadsheet } from "lucide-react";
import { doc, getDoc, getDocs, updateDoc, setDoc, collection, addDoc, increment, runTransaction, serverTimestamp,onSnapshot } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell, CartesianGrid } from "recharts";
import { exportInventoryExcel, exportInventoryPDF } from "../../utils/inventory-exports.js";
import { INVENTORY_FP_METHODS as FP_METHODS } from "../../data/inventoryMethods.js";
import ExportConfirmModal from "../Reports/ExportConfirmModal.jsx";
import ReportSelect from "../../components/ReportSelect/ReportSelect";
import PageHeader from "../../components/PageHeader/PageHeader";

const VISIBLE_LOW_METHODS = 1;

// blue = fine, orange-red = a method at or below its limit (checked for color-blind separation)
const CHART_COLORS = { normal: "#2f5bff", low: "#E0563D" };


function PopulationTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <p className="chart-tooltip-label">{payload[0].payload.name}</p>
            <p className="chart-tooltip-value">
                {Number(payload[0].value).toLocaleString()} residents
            </p>
        </div>
    );
}

function StockTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <p className="chart-tooltip-label">{payload[0].payload.name}</p>
            <p className="chart-tooltip-value">
                {Number(payload[0].value).toLocaleString()} stocks
            </p>
        </div>
    );
}

function Inventory() {
    const [editingRHUId, setEditingRHUId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [viewRHUId, setViewRHUId] = useState(null);
    const [exportFormat, setExportFormat] = useState(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showAllocateError, setShowAllocateError] = useState(false);
    const [showConfirmAllocate, setShowConfirmAllocate] = useState(false);
    const [showAllocateModal, setshowAllocateModal] = useState(false);
    const [showAddStockModal, setshowAddStockModal] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastTitle, setToastTitle] = useState("");
    const [toastMessage, setToastMessage] = useState("");
    const [stockValue, setStockValue] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const [showDeductModal, setShowDeductModal] = useState(false);
    const [showConfirmDeduct, setShowConfirmDeduct] = useState(false);
    const [deductValue, setDeductValue] = useState({});
    const [deductError, setDeductError] = useState("");
    const [showDeductError, setShowDeductError] = useState(false);

    const [rhuData, setRhuData] = useState([]);
    const [stockPerRHU, setstockPerRHU] = useState(0);
    const [remainder, setRemainder] = useState(0);
    const [lowStockLimit, setLowStockLimit] = useState(0);

    const [showRHUInfo, setshowRHUInfo] = useState(false);
    const [selectedRHU, setSelectedRHU] = useState(null);

    const [chartRefreshKey, setChartRefreshKey] = useState(0);

    const [showRhuAllocate, setShowRhuAllocate] = useState(false);
    const [allocRHU, setAllocRHU] = useState(null);
    const [allocQty, setAllocQty] = useState("");
    const [allocMethod, setAllocMethod] = useState("");
    const [allocError, setAllocError] = useState("");

    const [showRhuDeduct, setShowRhuDeduct] = useState(false);
    const [deductRHU, setDeductRHU] = useState(null);
    const [singleDeductQty, setSingleDeductQty] = useState("");
    const [singleDeductMethod, setSingleDeductMethod] = useState("");
    const [singleDeductError, setSingleDeductError] = useState("");

    const [bulkDeductMethod, setBulkDeductMethod] = useState("");

    const [limitsByMethod, setLimitsByMethod] = useState({});
    const [lowStockModal, setLowStockModal] = useState(null);

        useEffect(() => {
            const ref = doc(db, "lowStock", "lowStockLimit");
            const unsub = onSnapshot(ref, (snap) => {
                setLimitsByMethod(snap.data()?.limitsByMethod ?? {});
            });
            return () => unsub();
        }, []);

    function openRhuAllocate(item) {
        setAllocRHU(item);
        setAllocQty("");
        setAllocMethod("");
        setAllocError("");
        setShowRhuAllocate(true);
    }

    function closeRhuAllocate() {
        setShowRhuAllocate(false);
        setAllocRHU(null);
    }
    // 1. Triggered when clicking "Allocate" / "Confirm" inside the input form
    function handleRhuAllocate() {
        const qty = Number(allocQty);

        if (!allocMethod) return setAllocError("Please select an FP method.");
        if (!Number.isInteger(qty) || qty <= 0) return setAllocError("Enter a whole number greater than 0.");

        setAllocError("");
        setShowConfirmAllocate(true);
    }

    // 2. Triggered when clicking "Confirm" inside the confirmation overlay
    async function ConfirmRhuAllocation() {
        const qty = Number(allocQty);

        try {
            await updateDoc(doc(db, "rhu", allocRHU.id), {
                stock: increment(qty),
                [`stockByMethod.${allocMethod}`]: increment(qty),
            });

            await setDoc(
                doc(db, "inventory", "allocation"),
                { totalAllocation: increment(qty), rhuCount: rhuData.length },
                { merge: true }
            );

            await addDoc(collection(db, "inventory", "allocation", "history"), {
                rhuId: allocRHU.id,
                rhuName: allocRHU.name,
                method: allocMethod,
                quantity: qty,
                createdAt: serverTimestamp(),
            });

            await fetchRHUData();

            const label = FP_METHODS.find(m => m.id === allocMethod)?.label;

            setShowConfirmAllocate(false);
            closeRhuAllocate();

            setToastTitle("Allocation Successful");
            setToastMessage(`${qty} units of ${label} allocated to ${allocRHU.name}.`);
            setShowToast(true);

            setTimeout(() => {
                setShowToast(false);
                setToastTitle("");
                setToastMessage("");
            }, 4000);

        } catch (err) {
            console.error("rhu allocation error:", err);
            setShowConfirmAllocate(false);
            setAllocError("Failed to allocate. Please try again.");
        }
    }


    function openRhuDeduct(item) {
        setDeductRHU(item);
        setSingleDeductQty("");
        setSingleDeductMethod("");
        setSingleDeductError("");
        setShowRhuDeduct(true);
    }

    function closeRhuDeduct() {
        setShowRhuDeduct(false);
        setDeductRHU(null);
    }

    async function handleSingleRhuDeduct() {
        const qty = Number(singleDeductQty);

        if (!singleDeductMethod) {
            return setSingleDeductError("Please select an FP method.");
        }
        if (!Number.isInteger(qty) || qty <= 0) {
            return setSingleDeductError("Enter a whole number greater than 0.");
        }

        const available = Number(deductRHU?.stockByMethod?.[singleDeductMethod] ?? 0);
        if (qty > available) {
            return setSingleDeductError(`Only ${available} units available for this method.`);
        }

        try {
            await updateDoc(doc(db, "rhu", deductRHU.id), {
                stock: increment(-qty),
                [`stockByMethod.${singleDeductMethod}`]: increment(-qty),
            });

            await addDoc(collection(db, "inventory", "allocation", "history"), {
                type: "deduct",
                rhuId: deductRHU.id,
                rhuName: deductRHU.name,
                method: singleDeductMethod,
                quantity: qty,
                createdAt: serverTimestamp(),
            });

            await fetchRHUData();
            const label = FP_METHODS.find(m => m.id === singleDeductMethod)?.label;
            closeRhuDeduct();

            setToastTitle("Deduction Successful");
            setToastMessage(`${qty} units of ${label} deducted from ${deductRHU.name}.`);
            setShowToast(true);
            setTimeout(() => {
                setShowToast(false);
                setToastTitle("");
                setToastMessage("");
            }, 4000);
        } catch (err) {
            console.error("Single RHU deduction error:", err);
            setSingleDeductError("Failed to deduct. Please try again.");
        }
    }

    async function fetchRHUData() {
        setIsLoading(true);
        const refreshed = await getDocs(collection(db, "rhu"));
        const data = [];
        refreshed.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => a.id.localeCompare(b.id));
        setRhuData(data);
        setChartRefreshKey(prevKey => prevKey + 1);
        setIsLoading(false);
    }
    useEffect(() => {

        async function fetchInventoryData() {
            const inventorySnap = await getDoc(doc(db, "lowStock", "lowStockLimit"));
            if (inventorySnap.exists()) {
                setLowStockLimit(inventorySnap.data().lowStockLimit || 0);
            }
        }

        fetchRHUData();
        fetchInventoryData();
    }, []);


    function handleAllocateValue(value) {
        const number = Number(value);

        return number > 0;
    }

    function handleConfirmDeduct() {
        const fail = (msg) => {
            setDeductError(msg);
            setTimeout(() => setDeductError(""), 3000);
        };

        if (!bulkDeductMethod) return fail("Please select an FP method.");

        const entries = Object.entries(deductValue).filter(([_, q]) => Number(q) > 0);
        if (entries.length === 0) return fail("Please enter at least 1 deduction amount.");

        for (const [id, q] of entries) {
            const qty = Number(q);
            const item = rhuData.find((r) => r.id === id);
            const available = Number(item?.stockByMethod?.[bulkDeductMethod] ?? 0);
            if (!Number.isInteger(qty)) return fail(`${item?.name}: quantity must be a whole number.`);
            if (qty > available) return fail(`${item?.name}: only ${available} available for this method.`);
        }

        setDeductError("");
        setShowConfirmDeduct(true);
        setShowDeductModal(false);
    }

    async function ConfirmDeduction() {
        const entries = Object.entries(deductValue).filter(([_, q]) => Number(q) > 0);
        if (!bulkDeductMethod || entries.length === 0) return;

        const label = FP_METHODS.find((m) => m.id === bulkDeductMethod)?.label;
        const totalDeducted = entries.reduce((sum, [_, q]) => sum + Number(q), 0);

        try {
            await runTransaction(db, async (tx) => {
                // reads first
                const refs = entries.map(([id]) => doc(db, "rhu", id));
                const snaps = await Promise.all(refs.map((r) => tx.get(r)));

                snaps.forEach((snap, i) => {
                    if (!snap.exists()) throw new Error("An RHU was not found.");
                    const qty = Number(entries[i][1]);
                    const available = Number(snap.data().stockByMethod?.[bulkDeductMethod] ?? 0);
                    if (qty > available) {
                        throw new Error(`${snap.data().name}: only ${available} in stock for this method.`);
                    }
                });

                // then writes
                snaps.forEach((snap, i) => {
                    const qty = Number(entries[i][1]);
                    tx.update(refs[i], {
                        stock: increment(-qty),
                        [`stockByMethod.${bulkDeductMethod}`]: increment(-qty),
                    });
                    tx.set(doc(collection(db, "inventory", "allocation", "history")), {
                        type: "deduct",
                        rhuId: refs[i].id,
                        rhuName: snap.data().name,
                        method: bulkDeductMethod,
                        quantity: qty,
                        createdAt: serverTimestamp(),
                    });
                });
            });

            setDeductValue({});
            setBulkDeductMethod("");
            await fetchRHUData();
            setShowConfirmDeduct(false);
            setToastTitle("Deduction Successful");
            setToastMessage(`${totalDeducted} units of ${label} deducted from ${entries.length} RHU(s).`);
            setShowToast(true);
            setTimeout(() => {
                setShowToast(false);
                setToastTitle("");
                setToastMessage("");
            }, 4000);
        } catch (error) {
            console.error("deduction:", error);
            // go back to the input modal so the user can fix it
            setShowConfirmDeduct(false);
            setShowDeductModal(true);
            setDeductError(error.message || "Deduction failed. No changes were saved.");
            setTimeout(() => setDeductError(""), 4000);
        }
    }

    async function ConfirmAllocation() {
        try {
            const totalPopulation = rhuData.reduce((sum, item) => sum + Number(item.total_population || 0), 0);

            await setDoc(doc(db, "inventory", "allocation"), {
                totalAllocation: Number(stockValue),
                rhuCount: rhuData.length

            });

            const updates = rhuData.map((item) => {
                const pop = Number(item.total_population || 0);
                const allocated = totalPopulation > 0 ? Math.round((pop / totalPopulation) * Number(stockValue)) : 0;
                return updateDoc(doc(db, "rhu", item.id), {
                    stock: item.stock + allocated
                });
            });

            await Promise.all(updates);
            await fetchRHUData();



        }
        catch (error) {
            console.error("allocation:", error);
        }

        setShowConfirmAllocate(false);
        setshowAllocateModal(false);
        setToastTitle("Allocation Successful");
        setToastMessage(`Allocation successful. ${stockValue} units distributed to all RHUs.`);
        setShowToast(true);
        setStockValue("");
        setTimeout(() => {
            setShowToast(false);
            setToastTitle("");
            setToastMessage("");
        }, 4000);
    }



    function handleStockValue() {

        const currentNumber = Number(stockValue);

        if (!stockValue || currentNumber <= 0) {
            setShowAllocateError(true);
            setTimeout(() => { setShowAllocateError(false); }, 3000);
            return;
        }
        setShowAllocateError(false);
        setShowConfirmAllocate(true);

    }

    const sortedRHUData = useMemo(() => [...rhuData].sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, ""));
        const numB = parseInt(b.name.replace(/\D/g, ""));
        return numA - numB;
    }), [rhuData]);

    // Chart data is rebuilt only when the stock data changes. A fresh array on every render
    // made the charts replay their animation (and re-show the labels) whenever a modal opened.
    const populationChartData = useMemo(() => sortedRHUData.map((item) => ({
        name: item.name,
        population: Number(item.total_population || 0),
    })), [sortedRHUData]);

    const stockChartData = useMemo(() => sortedRHUData.map((item) => ({
        name: item.name,
        stock: FP_METHODS.reduce((sum, m) => sum + Number(item.stockByMethod?.[m.id] ?? 0), 0),
    })), [sortedRHUData]);

    const population = (value) => {
        return value.replace(/[^\d]/g, '');
    };

    const handleTotalPopulation = (value) => {
        setSelectedRHU((prev) => ({
            ...prev,
            total_population: population(value) === '' ? '' : Number(population(value)),
        }));
    };


    function handleBarangay(index, value) {
        if (!selectedRHU) return;
        const updatedBarangays = [...(selectedRHU.barangays || [])];
        updatedBarangays[index] = value;
        setSelectedRHU({ ...selectedRHU, barangays: updatedBarangays });
    }

    function handleRemoveBarangay(index) {
        if (!selectedRHU) return;
        setSelectedRHU({
            ...selectedRHU,
            barangays: (selectedRHU.barangays || []).filter((_, i) => i !== index)
        });
    }

    function handleAddBarangay() {
        if (!selectedRHU) return;
        setSelectedRHU({
            ...selectedRHU,
            barangays: [...(selectedRHU.barangays || []), ""]
        });
    }


    async function handleSaveBarangayChanges() {
        if (!selectedRHU) return;
        const updatedBarangays = (selectedRHU.barangays || []).filter((item) => item && item.trim() !== "");
        const updatedPopulation = Number(selectedRHU.total_population || 0);
        try {
            await updateDoc(doc(db, "rhu", selectedRHU.id), {
                barangays: updatedBarangays,
                total_population: updatedPopulation,
            });

            const updatedRHU = {
                ...selectedRHU,
                barangays: updatedBarangays,
                total_population: updatedPopulation,
            };
            setshowRHUInfo(false);
            setSelectedRHU(updatedRHU);
            setRhuData((prev) => prev.map((item) => (item.id === updatedRHU.id ? updatedRHU : item)));
            setEditingRHUId(null);
            setToastTitle("Barangay Changes Saved");
            setToastMessage("New information have been saved successfully.");
            setShowToast(true);
            setTimeout(() => {
                setShowToast(false);
                setToastTitle("");
                setToastMessage("");
            }, 4000);
        } catch (err) {
            console.error("Failed to update RHU:", err);
            notify("Failed to save changes.");
        }


    }
    const stockTotal = (item) => FP_METHODS.reduce((sum, m) => sum + Number(item.stockByMethod?.[m.id] ?? 0), 0);
    const maxStock = Math.max(...sortedRHUData.map(stockTotal), 1);

    // An RHU is low when any method is at or under the limit set for it in Settings
    const isRhuLow = (item) => FP_METHODS.some((m) => {
        const limit = Number(limitsByMethod?.[m.id] ?? 0);
        return limit > 0 && Number(item.stockByMethod?.[m.id] ?? 0) <= limit;
    });

    // keeps the refresh visible for a moment even when the data comes back instantly
    async function handleRefresh() {
        setIsRefreshing(true);
        await Promise.all([fetchRHUData(), new Promise((resolve) => setTimeout(resolve, 700))]);
        setIsRefreshing(false);
    }

    // the RHU whose details are open, read from the live list so it stays current
    const viewedRHU = rhuData.find((item) => item.id === viewRHUId) || null;
    const viewedMethods = viewedRHU
        ? FP_METHODS.map((m) => {
            const qty = Number(viewedRHU.stockByMethod?.[m.id] ?? 0);
            const limit = Number(limitsByMethod?.[m.id] ?? 0);
            return { ...m, qty, limit, isLow: limit > 0 && qty <= limit };
        })
        : [];
    const viewedMaxQty = Math.max(...viewedMethods.map((m) => m.qty), 1);
    const viewedLowCount = viewedMethods.filter((m) => m.isLow).length;

    const summaryCards = [
        {
            label: "Overall Stocks",
            value: rhuData.reduce((total, item) => total + stockTotal(item), 0),
            note: "Units on hand across all RHUs",
            icon: Boxes,
            tone: "navy",
        },
        {
            label: "RHU with Low Stocks",
            value: rhuData.filter(isRhuLow).length,
            note: "Need restocking",
            icon: TriangleAlert,
            tone: "red",
        },
        {
            label: "Total RHU",
            value: rhuData.length,
            note: "Rural health units",
            icon: Building2,
            tone: "green",
        },
        {
            label: "Overall Population",
            value: rhuData.reduce((sum, item) => sum + Number(item.total_population || 0), 0),
            note: "Residents covered",
            icon: Users,
            tone: "violet",
        },
    ];

    return (
        <>
            <div className="inv-page">
                <PageHeader title="Inventory">
                    <button
                        type="button"
                        className="page-head-btn"
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading}
                    >
                        <RefreshCw size={14} className={isRefreshing || isLoading ? "page-head-spin" : ""} />
                        {isRefreshing || isLoading ? "Refreshing..." : "Refresh Data"}
                    </button>
                </PageHeader>

                <div className={`inv-content${isRefreshing ? " is-refreshing" : ""}${isLoading && !isRefreshing ? " is-loading" : ""}`}>
                    <div className="inv-kpis">
                        {summaryCards.map(({ label, value, note, icon: Icon, tone }) => (
                            <div className={`inv-kpi inv-kpi--${tone}`} key={label}>
                                <span className="inv-kpi-icon"><Icon size={20} /></span>
                                <div>
                                    <span className="inv-kpi-label">{label}</span>
                                    <span className="inv-kpi-value">{value.toLocaleString()}</span>
                                    <span className="inv-kpi-note">{note}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="inv-charts">
                        <section className="inv-panel">
                            <div className="inv-panel-head">
                                <h2>Population per RHU</h2>
                                <p>Residents covered by each health unit</p>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart key={`population-${chartRefreshKey}`}
                                    layout="vertical"
                                    data={populationChartData}
                                    margin={{ top: 0, right: 56, left: 0, bottom: 0 }}
                                    barCategoryGap="28%"
                                >
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={64}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fontWeight: 600, fill: "#334155" }}
                                    />
                                    <Tooltip cursor={{ fill: "rgba(47, 91, 255, 0.06)" }} content={<PopulationTooltip />} />
                                    <Bar
                                        dataKey="population"
                                        fill={CHART_COLORS.normal}
                                        radius={[0, 4, 4, 0]}
                                        maxBarSize={14}
                                        background={{ fill: "#eef1f8", radius: [0, 4, 4, 0] }}
                                        isAnimationActive={true}
                                        animationDuration={500}
                                        animationEasing="ease-out"
                                    >
                                        <LabelList
                                            dataKey="population"
                                            position="right"
                                            offset={10}
                                            formatter={(val) => Number(val).toLocaleString()}
                                            style={{ fontSize: 12, fontWeight: 600, fill: "#0f172a" }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </section>

                        <section className="inv-panel">
                            <div className="inv-panel-head">
                                <h2>Stock per RHU</h2>
                                <p>Units on hand in each health unit</p>
                            </div>
                            <div className="inv-chart-legend">
                                <span><i style={{ backgroundColor: CHART_COLORS.normal }}></i> Sufficient</span>
                                <span><i style={{ backgroundColor: CHART_COLORS.low }}></i> Has a method at or below its limit</span>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart key={`stock-${chartRefreshKey}`}
                                    data={stockChartData}
                                    margin={{ top: 22, right: 8, left: 0, bottom: 0 }}
                                    barCategoryGap="30%"
                                >
                                    <CartesianGrid vertical={false} stroke="#eef1f6" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={{ stroke: "#d5dbe9" }}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fontWeight: 600, fill: "#475569" }}
                                        interval={0}
                                    />
                                    <YAxis
                                        type="number"
                                        width={34}
                                        allowDecimals={false}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: "#64748b" }}
                                    />
                                    <Tooltip cursor={{ fill: "rgba(47, 91, 255, 0.06)" }} content={<StockTooltip />} />
                                    <Bar
                                        dataKey="stock"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={32}
                                        isAnimationActive={true}
                                        animationDuration={500}
                                        animationEasing="ease-out"
                                    >
                                        {sortedRHUData.map((item) => {
                                            const hasLowMethod = FP_METHODS.some((m) => {
                                                const limit = Number(limitsByMethod?.[m.id] ?? 0);
                                                const qty = Number(item.stockByMethod?.[m.id] ?? 0);
                                                return limit > 0 && qty <= limit;
                                            });

                                            return (
                                                <Cell
                                                    key={item.id}
                                                    fill={hasLowMethod ? CHART_COLORS.low : CHART_COLORS.normal}
                                                />
                                            );
                                        })}
                                        <LabelList
                                            dataKey="stock"
                                            position="top"
                                            formatter={(val) => (Number(val) > 0 ? Number(val).toLocaleString() : "")}
                                            style={{ fontSize: 12, fontWeight: 600, fill: "#0f172a" }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </section>
                    </div>

                    <section className="inv-card">
                        <div className="inv-card-head">
                            <div>
                                <h2>City Health Center</h2>
                            </div>
                        </div>

                        <div className="inv-table-scroll">
                            <table className="inv-table inv-table--units">
                                <thead>
                                    <tr>
                                        <th>RHU</th>
                                        <th>Population</th>
                                        <th>Current Stocks</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {sortedRHUData.map((item) => {
                                        const rowTotal = stockTotal(item);

                                        const lowMethods = FP_METHODS
                                            .map((m) => ({
                                                id: m.id,
                                                label: m.label,
                                                qty: Number(item.stockByMethod?.[m.id] ?? 0),
                                                limit: Number(limitsByMethod?.[m.id] ?? 0),
                                            }))
                                            .filter((m) => m.limit > 0 && m.qty <= m.limit)
                                            .sort((a, b) => a.qty - b.qty);

                                        const hiddenCount = lowMethods.length - VISIBLE_LOW_METHODS;

                                        return (
                                            <tr
                                                key={item.id}
                                                className="inv-row-clickable"
                                                tabIndex={0}
                                                aria-label={`View ${item.name} details`}
                                                onClick={() => setViewRHUId(item.id)}
                                                onKeyDown={(event) => {
                                                    if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                                                        event.preventDefault();
                                                        setViewRHUId(item.id);
                                                    }
                                                }}
                                            >
                                                <td className="inv-rhu-name">{item.name}</td>
                                                <td className="inv-num">{Number(item.total_population).toLocaleString()}</td>
                                                <td>
                                                    <div className="inv-stock">
                                                        <div className="inv-stock-track">
                                                            <div
                                                                className={`inv-stock-fill${lowMethods.length > 0 ? " is-low" : ""}`}
                                                                style={{ width: `${(rowTotal / maxStock) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="inv-stock-count">{rowTotal.toLocaleString()} stocks</span>
                                                    </div>
                                                </td>

                                                <td>
                                                    {lowMethods.length > 0 ? (
                                                        <div className="low-methods">
                                                            {lowMethods.slice(0, VISIBLE_LOW_METHODS).map((m) => (
                                                                <span key={m.id} className="low-chip">
                                                                    {m.label} <small>{m.qty} left</small>
                                                                </span>
                                                            ))}

                                                            {hiddenCount > 0 && (
                                                                <button
                                                                    type="button"
                                                                    className="low-more-btn"
                                                                    onClick={(event) => { event.stopPropagation(); setLowStockModal({ rhuName: item.name, methods: lowMethods }); }}
                                                                    title="View all low stock methods"
                                                                >
                                                                    <Plus size={12} /> {hiddenCount} more
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="inv-ok-chip">Sufficient</span>
                                                    )}
                                                </td>

                                                <td>
                                                    <div className="inv-actions">
                                                        <button type="button" className="inv-btn inv-btn--icon inv-btn--primary" title="Allocate stock" aria-label={`Allocate stock to ${item.name}`} onClick={(event) => { event.stopPropagation(); openRhuAllocate(item); }}>
                                                            <SquarePlus size={16} />
                                                        </button>
                                                        <button type="button" className="inv-btn inv-btn--icon inv-btn--danger" title="Deduct stock" aria-label={`Deduct stock from ${item.name}`} onClick={(event) => { event.stopPropagation(); openRhuDeduct(item); }}>
                                                            <SquareMinus size={16} />
                                                        </button>
                                                        <button type="button" className="inv-btn inv-btn--icon inv-btn--outline" title="Edit details" aria-label={`Edit ${item.name}`} onClick={(event) => { event.stopPropagation(); setSelectedRHU(item); setshowRHUInfo(true); setEditingRHUId(null); }}>
                                                            <SquarePen size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="inv-card">
                        <div className="inv-card-head">
                            <div>
                                <h2>Stocks Matrix by FP Method</h2>
                            </div>
                            <div className="inv-card-actions">
                                <button type="button" className="inv-btn inv-btn--pdf" onClick={() => setExportFormat("pdf")}>
                                    <FileText size={14} /> Export PDF
                                </button>
                                <button type="button" className="inv-btn inv-btn--excel" onClick={() => setExportFormat("excel")}>
                                    <FileSpreadsheet size={14} /> Export Excel
                                </button>
                            </div>
                        </div>

                        <div className="inv-table-scroll">
                            <table className="inv-table inv-table--matrix">
                                <thead>
                                    <tr>
                                        <th>RHU</th>
                                        {FP_METHODS.map((method) => (
                                            <th key={method.id} className="inv-center">{method.label}</th>
                                        ))}
                                        <th className="inv-center">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedRHUData.map((item) => (
                                        <tr key={item.id}>
                                            <td className="inv-rhu-name">{item.name}</td>
                                            {FP_METHODS.map((method) => {
                                                const count = Number(item.stockByMethod?.[method.id] ?? 0);
                                                return (
                                                    <td key={method.id} className={`inv-center inv-num${count === 0 ? " is-zero" : ""}`}>
                                                        {count.toLocaleString()}
                                                    </td>
                                                );
                                            })}
                                            <td className="inv-center inv-num inv-total">{stockTotal(item).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td>Total</td>
                                        {FP_METHODS.map((method) => (
                                            <td key={method.id} className="inv-center inv-num">
                                                {sortedRHUData
                                                    .reduce((sum, item) => sum + Number(item.stockByMethod?.[method.id] ?? 0), 0)
                                                    .toLocaleString()}
                                            </td>
                                        ))}
                                        <td className="inv-center inv-num">
                                            {sortedRHUData.reduce((total, item) => total + stockTotal(item), 0).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>
                </div>

                {exportFormat && (
                    <ExportConfirmModal
                        format={exportFormat}
                        reportName="Stocks Matrix"
                        defaultFileName="Inventory_Stocks_Matrix"
                        onCancel={() => setExportFormat(null)}
                        onConfirm={(fileName) => {
                            const exportFile = exportFormat === "pdf" ? exportInventoryPDF : exportInventoryExcel;
                            setExportFormat(null);
                            exportFile(sortedRHUData, FP_METHODS, fileName);
                        }}
                    />
                )}

                {viewedRHU && (
                    <div className="inv-detail-overlay" onClick={() => setViewRHUId(null)}>
                        <div className="inv-detail" role="dialog" aria-modal="true" aria-label={`${viewedRHU.name} details`} onClick={(e) => e.stopPropagation()}>
                            <div className="inv-detail-head">
                                <div className="inv-detail-head-text">
                                    <h3>{viewedRHU.name}</h3>
                                    <p>Rural health unit overview</p>
                                </div>
                                <span className={`inv-detail-status${viewedLowCount > 0 ? " is-low" : ""}`}>
                                    {viewedLowCount > 0
                                        ? <><TriangleAlert size={14} /> {viewedLowCount} of {viewedMethods.length} low</>
                                        : <><CheckCircle size={14} /> All stocked</>}
                                </span>
                                <button type="button" className="inv-detail-close" onClick={() => setViewRHUId(null)} aria-label="Close">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="inv-detail-body">
                                <div className="inv-detail-stats">
                                    <div>
                                        <span className="inv-detail-stat-icon"><Users size={18} /></span>
                                        <div>
                                            <strong>{Number(viewedRHU.total_population || 0).toLocaleString()}</strong>
                                            <span>Population</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="inv-detail-stat-icon"><Boxes size={18} /></span>
                                        <div>
                                            <strong>{stockTotal(viewedRHU).toLocaleString()}</strong>
                                            <span>Total stocks</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="inv-detail-stat-icon"><MapPin size={18} /></span>
                                        <div>
                                            <strong>{(viewedRHU.barangays || []).length}</strong>
                                            <span>Barangays</span>
                                        </div>
                                    </div>
                                </div>

                                <section className="inv-detail-section">
                                    <h4 className="inv-detail-title">Stocks by FP method</h4>
                                    <ul className="inv-detail-methods">
                                        {viewedMethods.map((m) => (
                                            <li key={m.id} className={m.isLow ? (m.qty === 0 ? "is-low is-out" : "is-low") : ""}>
                                                <div className="inv-detail-method-top">
                                                    <span className="inv-detail-method-name">{m.label}</span>
                                                    {m.isLow
                                                        ? <span className={`low-chip${m.qty === 0 ? "" : " low-chip--warn"}`}>{m.qty === 0 ? "Out of stock" : "Low"}</span>
                                                        : <span className="inv-ok-chip">OK</span>}
                                                </div>
                                                <div className="inv-detail-qty">
                                                    <strong>{m.qty.toLocaleString()}</strong>
                                                    <span>units{m.limit > 0 ? ` · limit ${m.limit.toLocaleString()}` : ""}</span>
                                                </div>
                                                <div className="inv-stock-track">
                                                    <div
                                                        className={`inv-stock-fill${m.isLow ? " is-low" : ""}`}
                                                        style={{ width: `${(m.qty / viewedMaxQty) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>

                                <section className="inv-detail-section">
                                    <h4 className="inv-detail-title">
                                        Barangays covered
                                        <span>{(viewedRHU.barangays || []).length}</span>
                                    </h4>
                                    {(viewedRHU.barangays || []).length > 0 ? (
                                        <div className="inv-detail-barangays">
                                            {viewedRHU.barangays.map((barangay, index) => (
                                                <span key={`${barangay}-${index}`}>{barangay}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="inv-detail-empty">No barangays listed for this unit yet. Use Edit details to add them.</p>
                                    )}
                                </section>
                            </div>

                            <div className="inv-detail-foot">
                                <button type="button" className="inv-btn inv-btn--outline" onClick={() => { setViewRHUId(null); setSelectedRHU(viewedRHU); setshowRHUInfo(true); setEditingRHUId(null); }}>
                                    <SquarePen size={15} /> Edit details
                                </button>
                                <div className="inv-detail-foot-stock">
                                    <button type="button" className="inv-btn inv-btn--danger" onClick={() => { setViewRHUId(null); openRhuDeduct(viewedRHU); }}>
                                        <SquareMinus size={15} /> Deduct stock
                                    </button>
                                    <button type="button" className="inv-btn inv-btn--primary" onClick={() => { setViewRHUId(null); openRhuAllocate(viewedRHU); }}>
                                        <SquarePlus size={15} /> Allocate stock
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showRHUInfo && selectedRHU && (
                    <div className="modal-overlay">
                        <div className="modal-content rhu-allocate-box inv-edit-box">
                            <div className="modal-header-inventory">
                                <h3 className="modal-title-with-tag">
                                    Edit Details
                                    <span className="modal-title-tag">{selectedRHU.name}</span>
                                </h3>
                            </div>

                            <div className="inv-edit-body">
                                <label className="inv-edit-label" htmlFor="inv-edit-population">Total population</label>
                                <input
                                    id="inv-edit-population"
                                    type="text"
                                    inputMode="numeric"
                                    className="allocate-input"
                                    value={selectedRHU ? selectedRHU.total_population : 0}
                                    onChange={(e) => handleTotalPopulation(e.target.value)}
                                />

                                <div className="inv-edit-row">
                                    <span className="inv-edit-label">Barangays covered</span>
                                    <span className="inv-edit-count">{(selectedRHU.barangays || []).length}</span>
                                </div>

                                <div className="inv-edit-barangays">
                                    {selectedRHU.barangays?.map((brgy, index) => (
                                        <div className="inv-edit-barangay" key={index}>
                                            <input
                                                value={brgy}
                                                onChange={(e) => handleBarangay(index, e.target.value)}
                                                className="allocate-input"
                                                placeholder="Barangay name"
                                                aria-label={`Barangay ${index + 1}`}
                                            />
                                            <button
                                                type="button"
                                                className="inv-edit-remove"
                                                title="Remove barangay"
                                                aria-label={`Remove ${brgy || "barangay"}`}
                                                onClick={() => handleRemoveBarangay(index)}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button type="button" onClick={handleAddBarangay} className="inv-edit-add">
                                    <Plus size={15} /> Add barangay
                                </button>
                            </div>

                            <div className="modal-footer">
                                <button className="btn-cancel" onClick={() => { setshowRHUInfo(false); setSelectedRHU(null); setEditingRHUId(null); }}>
                                    Cancel
                                </button>

                                <button className="btn-save-changes" onClick={handleSaveBarangayChanges}>
                                    Save changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showRhuAllocate && allocRHU && (
                    <div className="modal-overlay">
                        <div className="modal-content allocate-box rhu-allocate-box">
                            <div className="modal-header-inventory">
                                <h3 className="modal-title-with-tag">
                                    Allocate Stock
                                    <span className="modal-title-tag">{allocRHU.name}</span>
                                </h3>
                            </div>

                            <div className="allocate-input-section">
                                <h3>FP Method:</h3>
                                <div className="inv-method-select">
                                    <ReportSelect
                                        value={allocMethod}
                                        onChange={(e) => { setAllocMethod(e.target.value); setAllocError(""); }}
                                        options={FP_METHODS.map((m) => ({ value: m.id, label: m.label }))}
                                        ariaLabel="FP method"
                                        placeholder="Select FP method"
                                    />
                                </div>

                                <h3>Quantity to Allocate:</h3>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={allocQty}
                                    placeholder="e.g. 100"
                                    onChange={(e) => { setAllocQty(e.target.value); setAllocError(""); }}
                                    className="allocate-input"
                                />

                                {allocError && <p className="error-text">{allocError}</p>}
                            </div>

                            <div className="modal-footer">
                                <button className="btn-cancel" onClick={closeRhuAllocate}>Cancel</button>
                                <button className="btn-confirm-success" onClick={ConfirmRhuAllocation}>Confirm</button>
                            </div>

                            {showConfirmAllocate && (
                                <div className="modal-overlay confirm-overlay">
                                    <div className="modal-content confirm-box">
                                        <h3 className="confirm-title">Confirm Stock Allocation</h3>
                                        <p className="confirm-note"> Note: This action will allocate stocks to all RHUs. </p>
                                        <p className="confirm-detail" >Please ensure you have reviewed the current stock levels and the allocation quantities for each RHU before confirming. Click Confirm to authorize the automated ledger updates and finalize the distribution process.</p>


                                        <div className="modal-footer confirm-footer">
                                            <button className="btn-cancel-large" onClick={() => { setShowConfirmAllocate(false); setshowAllocateModal(true); }}
                                            >Cancel
                                            </button>
                                            <button className="btn-confirm-success-large" onClick={ConfirmAllocation}
                                            >Confirm
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>



            {showRhuDeduct && deductRHU && (
                <div className="modal-overlay">
                    <div className="modal-content allocate-box rhu-allocate-box is-deduct">
                        <div className="modal-header-inventory">
                            <h3 className="modal-title-with-tag">
                                Deduct Stock
                                <span className="modal-title-tag">{deductRHU.name}</span>
                            </h3>
                        </div>

                        <div className="allocate-input-section">
                            <h3>FP METHOD:</h3>
                            <div className="inv-method-select">
                                <ReportSelect
                                    value={singleDeductMethod}
                                    onChange={(e) => {
                                        setSingleDeductMethod(e.target.value);
                                        setSingleDeductError("");
                                    }}
                                    options={FP_METHODS.map((m) => ({ value: m.id, label: m.label }))}
                                    ariaLabel="FP method"
                                    placeholder="Select FP method"
                                />
                            </div>

                            <h3>QUANTITY TO DEDUCT:</h3>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={singleDeductQty}
                                placeholder="e.g. 100"
                                onChange={(e) => {
                                    setSingleDeductQty(e.target.value);
                                    setSingleDeductError("");
                                }}
                                className="allocate-input"
                            />

                            {singleDeductError && <p className="error-text">{singleDeductError}</p>}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={closeRhuDeduct}>Cancel</button>
                            <button className="btn-confirm-solid" onClick={handleSingleRhuDeduct}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}


            {showAllocateModal && (
                <div className="modal-overlay">
                    <div className="modal-content allocate-box">

                        <div className="modal-header-inventory">
                            <h3>  Allocate Stock</h3>
                            <p className="modal-subtext-inventory">Enter total quantity to allocate. It will auto-distributed to each RHU</p>
                        </div>

                        <div className="allocate-input-section">
                            <h3>Total Quantity:</h3>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={stockValue}
                                placeholder="e.g. 1000"
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setStockValue(value);
                                    if (Number(value) > 0) {
                                        setShowAllocateError(false);
                                    }
                                }}
                                className="allocate-input"
                            />

                            {showAllocateError && (
                                <p className="error-text">Please enter a number</p>
                            )}
                        </div>

                        <div className="modal-table-wrapper">
                            <table className="modal-table">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>RHU</th>
                                        <th>Current Stock</th>
                                        <th>Population</th>
                                        <th>Allocated</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedRHUData.map((item, index) => {
                                        const totalPopulation = rhuData.reduce((sum, row) => sum + Number(row.total_population || 0), 0);
                                        const population = Number(item.total_population || 0);
                                        const allocated = stockValue ? (totalPopulation > 0 ? Math.round((population / totalPopulation) * parseInt(stockValue)) : 0) : 0;
                                        return (
                                            <tr key={item.id} className="text-base">
                                                <th>{index + 1}</th>
                                                <td>{item.name}</td>
                                                <td>{item.stock} stocks</td>
                                                <td>{Number(population).toLocaleString()}</td>
                                                <td>{stockValue ? Number(allocated).toLocaleString() : <span className="text-gray-500">-</span>}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>


                        </div>

                        <div className="modal-footer">

                            <button className="btn-cancel" onClick={() => setshowAllocateModal(false)}>
                                Cancel</button>

                            <button className="btn-confirm-success" onClick={handleStockValue}>Confirm</button>
                        </div>
                        {showConfirmAllocate && (
                            <div className="modal-overlay confirm-overlay">
                                <div className="modal-content confirm-box">
                                    <h3 className="confirm-title">Confirm Stock Allocation</h3>
                                    <p className="confirm-note"> Note: This action will allocate stocks to all RHUs. </p>
                                    <p className="confirm-detail" >Please ensure you have reviewed the current stock levels and the allocation quantities for each RHU before confirming. Click Confirm to authorize the automated ledger updates and finalize the distribution process.</p>


                                    <div className="modal-footer confirm-footer">
                                        <button className="btn-cancel-large" onClick={() => { setShowConfirmAllocate(false); setshowAllocateModal(true); }}
                                        >Cancel
                                        </button>
                                        <button className="btn-confirm-success-large" onClick={ConfirmAllocation}
                                        >Confirm
                                        </button>
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>






                </div>



            )}

            {showDeductModal && (
                <div className="modal-overlay">
                    <div className="modal-content deduct-box ">
                        <div className="modal-header-inventory">
                            <div className="allocate-input-section">
                                <h3>FP Method:</h3>
                                <div className="inv-method-select">
                                    <ReportSelect
                                        value={bulkDeductMethod}
                                        onChange={(e) => { setBulkDeductMethod(e.target.value); setDeductError(""); }}
                                        options={FP_METHODS.map((m) => ({ value: m.id, label: m.label }))}
                                        ariaLabel="FP method"
                                        placeholder="Select FP method"
                                    />
                                </div>
                            </div>
                            <h3>Deduct Stock</h3>
                            <p className="modal-subtext-inventory">Enter deduction quantities for each health unit below</p>
                        </div>

                        <div className="modal-table-wrapper">
                            <table className="modal-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>RHU Name</th>
                                        <th>Current Stock</th>
                                        <th>Status</th>
                                        <th>Available</th>
                                        <th>Deduct Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedRHUData.map((item, index) => (
                                        <tr key={item.id}>
                                            <th>{index + 1}</th>
                                            <td>{item.name}</td>
                                            <td>{item.stock} stocks</td>

                                            <td>
                                                <span className={`status-badge ${isRhuLow(item) ? "status-low" : "status-sufficient"}`}>
                                                    {isRhuLow(item) ? 'Low Stock' : 'Sufficient'}
                                                </span>
                                            </td>

                                            <td>
                                                {bulkDeductMethod ? Number(item.stockByMethod?.[bulkDeductMethod] ?? 0) : "-"}
                                            </td>

                                            <td>
                                                <input
                                                    type="number"
                                                    placeholder="qty"
                                                    min="1"
                                                    max={bulkDeductMethod ? Number(item.stockByMethod?.[bulkDeductMethod] ?? 0) : item.stock}
                                                    value={deductValue[item.id] || ""}
                                                    onChange={(e) => setDeductValue(prev => ({
                                                        ...prev,
                                                        [item.id]: e.target.value
                                                    }))}
                                                    className="deduct-qty-input"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel"
                                onClick={() => { setShowDeductModal(false); setBulkDeductMethod(""); setDeductValue({}); }}>
                                Cancel</button>

                            <button className="btn-confirm-solid"
                                onClick={handleConfirmDeduct}>
                                Confirm Deduct</button>
                        </div>
                        {deductError && (
                            <div className="error-banner deduct-error-banner">
                                <span>{deductError}</span>
                            </div>
                        )}

                    </div>
                </div>
            )}




            {showConfirmDeduct && (
                <div className="modal-overlay confirm-overlay">
                    <div className="modal-content confirm-box">

                        <h3 className="confirm-title">Confirm Stock Deduction</h3>
                        <p className="confirm-note"> Warning: This will permanently deduct stocks from the selected RHUs.</p>
                        <p className="confirm-detail" >Please review the quantities you entered for each RHU. Only RHUs with a filled quantity will be affected. This action cannot be undone.</p>


                        <div className="modal-footer confirm-footer">
                            <button className="btn-cancel-large"
                                onClick={() => { setShowConfirmDeduct(false); setShowDeductModal(true); }}
                            >Cancel
                            </button>
                            <button className="btn-confirm-success-large"
                                onClick={ConfirmDeduction}
                            >Confirm
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {lowStockModal && (
                <div className="low-modal-overlay" onClick={() => setLowStockModal(null)}>
                    <div className="low-modal" role="dialog" aria-modal="true" aria-label={`Low stock methods for ${lowStockModal.rhuName}`} onClick={(e) => e.stopPropagation()}>
                        <div className="low-modal-header">
                            <div>
                                <h4>
                                    Low Stock Methods
                                    <span className="low-modal-tag">{lowStockModal.rhuName}</span>
                                </h4>
                            </div>
                            <button type="button" className="low-modal-close" onClick={() => setLowStockModal(null)} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>

                        <ul className="low-modal-list">
                            {lowStockModal.methods.map((m) => {
                                const isOut = m.qty === 0;
                                return (
                                    <li key={m.id} className={isOut ? "is-out" : ""}>
                                        <div className="low-modal-row">
                                            <span className="low-modal-name">{m.label}</span>
                                            <span className="low-modal-qty">
                                                <strong>{m.qty.toLocaleString()}</strong> of {m.limit.toLocaleString()} limit
                                            </span>
                                            <span className={`low-chip${isOut ? "" : " low-chip--warn"}`}>{isOut ? "Out of stock" : "Low"}</span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            )}




            {showToast && (
                <div id="toast-container">
                    <div id="toast-alert">
                        <CheckCircle size={20} />
                        <div>
                            <span id="toast-title">{toastTitle || "Success"}</span>
                            <span id="toast-message">
                                {toastMessage}
                            </span>
                        </div>
                    </div>
                </div>
            )}
















        </>
    )
}

export default Inventory;