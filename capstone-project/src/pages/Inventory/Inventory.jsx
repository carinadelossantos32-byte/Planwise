import "./inventory.css"
import { useEffect, useState } from "react";
import { db } from "../../firebase-config"
import { doc, getDoc, getDocs, updateDoc, setDoc, collection, addDoc, increment, serverTimestamp } from "firebase/firestore";
import { CheckCircle, RefreshCw, Upload, FileText, SquarePen, SquarePlus, SquareMinus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell } from "recharts";
import { exportInventoryExcel, exportInventoryPDF } from "../../utils/inventory-exports.js";

const FP_METHODS = [
    { id: "condom", label: "Condom" },
    { id: "iud", label: "IUD" },
    { id: "pills", label: "Pills" },
    { id: "injectable", label: "Injectable" },
    { id: "vasectomy", label: "Vasectomy" },
    { id: "tubal_ligation", label: "Tubal Ligation" },
    { id: "implant", label: "Implant" },
    { id: "cmm_billings", label: "CMM/Billings" },
    { id: "bbt", label: "Basal Body Temperature(BBT)" },
    { id: "stm", label: "Sympto-Thermal Method(STM)" },
    { id: "sdm", label: "Standard Days Method(SDM)" },
    { id: "lam", label: "Lactational Amenorrhea Method(LAM)" },
];
function Inventory() {
    const [editingRHUId, setEditingRHUId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
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
        setShowConfirmAllocate(true); // Opens confirmation overlay
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

            // Close both confirmation and allocation modals
            setShowConfirmAllocate(false);
            closeRhuAllocate();

            // Trigger Toast Notification
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

    const sortedRHUData = [...rhuData].sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, ""));
        const numB = parseInt(b.name.replace(/\D/g, ""));
        return numA - numB;
    });

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
            alert("Failed to save changes.");
        }


    }
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


    return (
        <>
            <div id="inventory-container">
                <div id="inventory-topbar">
                    <h1>CHC Stocks</h1>
                    <button id="refresh-button" onClick={fetchRHUData}>
                        <RefreshCw className={isLoading ? "spin-icon" : ""} />
                        {isLoading ? "Refreshing..." : "Refresh Data"}
                    </button>

                </div>

                <div id="inventory-report-label">
                    <h3>Inventory Report</h3>
                </div>

                <div className="cards-container">
                    <div className="inventory-header-content" id="overall-stocks-card">
                        <h3 >Overall Stocks</h3>
                        <h2>{rhuData.reduce((totalSum, item) => totalSum + FP_METHODS.reduce((mSum, m) => mSum + Number(item.stockByMethod?.[m.id] ?? 0), 0), 0).toLocaleString()}</h2>
                    </div>

                    <div className="inventory-header-content" id="low-stock-card">
                        <h3 >RHU with Low Stocks</h3>
                        <h2>{rhuData.filter((item) => {
                            const itemTotal = FP_METHODS.reduce((sum, m) => sum
                                + Number(item.stockByMethod?.[m.id] ?? 0), 0); return itemTotal <= lowStockLimit;
                        }).length}</h2>
                    </div>

                    <div className="inventory-header-content" id="overall-rhu-card">
                        <h3 >Total RHU</h3>
                        <h2>{rhuData.length}</h2>
                    </div>

                    <div className="inventory-header-content" id="overall-population-card">
                        <h3 >Overall Population</h3>
                        <h2>{rhuData.reduce((sum, item) => sum + Number(item.total_population || 0), 0).toLocaleString()}</h2>
                    </div>

                </div>

                <div id="inventory-chart-container">
                    <div id="population-chart-section" className="chart-card">
                        <h3 id="rhu-title">Population per RHU</h3>
                        <ResponsiveContainer width="100%" height={290}>
                            <BarChart key={`population-${chartRefreshKey}`}
                                layout="vertical"
                                data={sortedRHUData.map((item) => ({
                                    name: item.name,
                                    population: Number(item.total_population || 0),
                                }))}
                                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                                barCategoryGap="20%"
                            >
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={70}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fontWeight: 600, fill: "#1B1B2F" }}
                                />
                                <Tooltip cursor={{ fill: "rgba(20, 8, 109, 0.04)" }} content={<PopulationTooltip />} />
                                <Bar
                                    dataKey="population"
                                    fill="url(#indigoGradient)"
                                    radius={[0, 8, 8, 0]}
                                    maxBarSize={20}
                                    isAnimationActive={true}
                                    animationDuration={300}
                                    animationEasing="ease-out"

                                >
                                    <LabelList
                                        dataKey="population"
                                        position="right"
                                        formatter={(val) => Number(val).toLocaleString()}
                                        style={{ fontSize: 11, fontWeight: 600, fill: "#5B5B76" }}
                                    />
                                </Bar>
                                <defs>
                                    <linearGradient id="indigoGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#14086D" />
                                        <stop offset="100%" stopColor="#4B3FD1" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div id="stock-chart-section" className="chart-card">
                        <h3 id="rhu-title">Stock per RHU</h3>
                        <ResponsiveContainer width="100%" height={290}>
                            <BarChart key={`stock-${chartRefreshKey}`}
                                data={sortedRHUData.map((item) => ({
                                    name: item.name,
                                    stock: FP_METHODS.reduce((sum, m) => sum + Number(item.stockByMethod?.[m.id] ?? 0), 0),
                                }))}
                                margin={{ top: 20, right: 6, left: 0, bottom: 0 }}
                                barCategoryGap="20%"
                            >
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fontWeight: 600, fill: "#5B5B76" }}
                                    interval={0}
                                />
                                <YAxis type="number" hide />
                                <Tooltip cursor={{ fill: "rgba(20, 8, 109, 0.04)" }} content={<StockTooltip />} />
                                <Bar
                                    dataKey="stock"
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={28}
                                    isAnimationActive={true}
                                    animationDuration={300}
                                    animationEasing="ease-out"
                                >
                                    {sortedRHUData.map((item) => (
                                        <Cell
                                            key={item.id}
                                            fill={
                                                item.stock <= lowStockLimit
                                                    ? "url(#amberGradientVertical)"
                                                    : "url(#indigoGradientVertical)"
                                            }
                                        />
                                    ))}
                                    <LabelList
                                        dataKey="stock"
                                        position="top"
                                        formatter={(val) => Number(val).toLocaleString()}
                                        style={{ fontSize: 11, fontWeight: 600, fill: "#1B1B2F" }}
                                    />
                                </Bar>
                                <defs>
                                    <linearGradient id="indigoGradientVertical" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#4B3FD1" />
                                        <stop offset="100%" stopColor="#14086D" />
                                    </linearGradient>
                                    <linearGradient id="amberGradientVertical" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#EF8264" />
                                        <stop offset="100%" stopColor="#E0563D" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div id="inventory-content">
                    <h3 id="rhu-title">City Health Center</h3>

                    <table className="rhu-table">
                        <thead>
                            <tr>
                                <th>RHU</th>
                                <th>POPULATION</th>
                                <th>CURRENT STOCKS</th>
                                <th>STATUS</th>
                                <th></th>
                            </tr>
                        </thead>

                        <tbody>
                            {sortedRHUData.map((item) => {
                                const rowTotal = FP_METHODS.reduce(
                                    (sum, m) => sum + Number(item.stockByMethod?.[m.id] ?? 0),
                                    0
                                );

                                return (
                                    <tr key={item.id}>
                                        <td className="rhu-name">{item.name}</td>
                                        <td className="rhu-population">{Number(item.total_population).toLocaleString()}</td>
                                        <td>
                                            <div className="rhu-progress-container">
                                                <progress
                                                    className="rhu-progress"
                                                    value={rowTotal}
                                                    max={Math.max(
                                                        ...sortedRHUData.map((r) =>
                                                            FP_METHODS.reduce(
                                                                (sum, m) => sum + Number(r.stockByMethod?.[m.id] ?? 0),
                                                                0
                                                            )
                                                        ),
                                                        1
                                                    )}
                                                ></progress>
                                                <span className="rhu-stock-count">{rowTotal} stocks</span>
                                            </div>
                                        </td>

                                        <td>
                                            <span className={`status-badge ${rowTotal <= lowStockLimit ? "status-low" : "status-sufficient"}`}>
                                                {rowTotal <= lowStockLimit ? 'Low Stock' : 'Sufficient'}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="rhu-row-actions">
                                                <button className="row-btn row-btn-allocate" onClick={() => openRhuAllocate(item)} title="Allocate">
                                                    <SquarePlus size={14} />
                                                </button>
                                                <button className="row-btn row-btn-deduct" onClick={() => openRhuDeduct(item)} title="Deduct">
                                                    <SquareMinus size={14} />
                                                </button>

                                                <button className="rhu-edit-icon" onClick={() => { setSelectedRHU(item); setshowRHUInfo(true); setEditingRHUId(null); }} title="Edit">
                                                    <SquarePen color="#14086d" size={16} strokeWidth={1.5} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div id="inventory-matrix-content">
                    <div className="matrix-header">
                        <h3 id="rhu-title">Stocks Matrix by FP Method</h3>
                        <div className="matrix-export-buttons">
                            <button type="button" className="matrix-btn-pdf" onClick={() => exportInventoryPDF(sortedRHUData, FP_METHODS)}>Export PDF</button>
                            <button type="button" className="matrix-btn-excel" onClick={() => exportInventoryExcel(sortedRHUData, FP_METHODS)}>Export Excel</button>
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table className="rhu-table matrix-table">
                            <thead>
                                <tr>
                                    <th>RHU</th>
                                    {FP_METHODS.map((method) => (
                                        <th key={method.id} className="text-center">
                                            {method.label}
                                        </th>
                                    ))}
                                    <th>TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRHUData.map((item) => {
                                    const rowTotal = FP_METHODS.reduce(
                                        (sum, m) => sum + Number(item.stockByMethod?.[m.id] ?? 0),
                                        0
                                    );

                                    return (
                                        <tr key={item.id}>
                                            <td className="rhu-name">{item.name}</td>
                                            {FP_METHODS.map((method) => {
                                                const count = Number(item.stockByMethod?.[method.id] ?? 0);
                                                return (
                                                    <td key={method.id} className="text-center">
                                                        <span className={count === 0 ? "stock-zero" : "stock-active"}>
                                                            {count}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                            <td className="font-bold">{rowTotal}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="matrix-footer-row">
                                    <td>Total</td>
                                    {FP_METHODS.map((method) => {
                                        const colTotal = sortedRHUData.reduce(
                                            (sum, item) => sum + Number(item.stockByMethod?.[method.id] ?? 0),
                                            0
                                        );
                                        return (
                                            <td key={method.id} className="text-center font-bold">
                                                {colTotal}
                                            </td>
                                        );
                                    })}
                                    <td className="font-bold">
                                        {sortedRHUData.reduce((total, item) => {
                                            const rowTotal = FP_METHODS.reduce(
                                                (sum, m) => sum + Number(item.stockByMethod?.[m.id] ?? 0),
                                                0
                                            );
                                            return total + rowTotal;
                                        }, 0)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>



                {showRHUInfo && selectedRHU && (
                    <div className="modal-overlay">
                        <div className="modal-content rhu-info-box">

                            <div className="rhu-detail-header">
                                <p className="rhu-detail-name"> {selectedRHU.name}</p>

                                <div className="rhu-stat-card">
                                    <p className="rhu-stat">Total Population:</p>
                                    <input type="text" className="rhu-stat" value={selectedRHU ? selectedRHU.total_population : 0} onChange={(e) => handleTotalPopulation(e.target.value)} />
                                </div>

                                <div className="barangay-section">
                                    <div className="barangay-header">
                                        <p>Barangays: </p>

                                    </div>


                                    <div className="barangay-edit-list">
                                        {selectedRHU.barangays?.map((brgy, index) => (
                                            <input
                                                key={index}
                                                value={brgy}
                                                onChange={(e) => handleBarangay(index, e.target.value)}
                                                className="barangay-input"
                                            />
                                        ))}
                                        <button onClick={handleAddBarangay} className="add-barangay-link">
                                            + Add Barangay
                                        </button>


                                    </div>

                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancel" onClick={() => { setshowRHUInfo(false); setSelectedRHU(null); setEditingRHUId(null); }}>
                                    Cancel
                                </button>

                                <button className="btn-save-changes" onClick={handleSaveBarangayChanges}>
                                    Update Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showRhuAllocate && allocRHU && (
                    <div className="modal-overlay">
                        <div className="modal-content allocate-box rhu-allocate-box">
                            <div className="modal-header-inventory">
                                <h3>Allocate Stock — {allocRHU.name}</h3>
                                <p className="modal-subtext-inventory">Choose the FP method and quantity to add to this RHU.</p>
                            </div>

                            <div className="allocate-input-section">
                                <h3>FP Method:</h3>
                                <select
                                    className="allocate-input allocate-select"
                                    value={allocMethod}
                                    onChange={(e) => { setAllocMethod(e.target.value); setAllocError(""); }}
                                >
                                    <option value="" disabled>Select FP method</option>
                                    {FP_METHODS.map(m => (
                                        <option key={m.id} value={m.id}>{m.label}</option>
                                    ))}
                                </select>

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
                    <div className="modal-content allocate-box rhu-allocate-box">
                        <div className="modal-header-inventory">
                            <h3>Deduct Stock — {deductRHU.name}</h3>
                            <p className="modal-subtext-inventory">Choose the FP method and quantity to deduct from this RHU.</p>
                        </div>

                        <div className="allocate-input-section">
                            <h3>FP METHOD:</h3>
                            <select
                                className="allocate-input allocate-select"
                                value={singleDeductMethod}
                                onChange={(e) => {
                                    setSingleDeductMethod(e.target.value);
                                    setSingleDeductError("");
                                }}
                            >
                                <option value="" disabled>Select FP method</option>
                                {FP_METHODS.map(m => (
                                    <option key={m.id} value={m.id}>{m.label}</option>
                                ))}
                            </select>

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
                                {/* head */}
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
                                <select
                                    className="allocate-input allocate-select"
                                    value={bulkDeductMethod}
                                    onChange={(e) => { setBulkDeductMethod(e.target.value); setDeductError(""); }}
                                >
                                    <option value="" disabled>Select FP method</option>
                                    {FP_METHODS.map((m) => (
                                        <option key={m.id} value={m.id}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <h3>Deduct Stock</h3>
                            <p className="modal-subtext-inventory">Enter deduction quantities for each health unit below</p>
                        </div>

                        <div className="modal-table-wrapper">
                            <table className="modal-table">
                                {/* head */}
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
                                    {/* row 1 */}
                                    {sortedRHUData.map((item, index) => (
                                        <tr key={item.id}>
                                            <th>{index + 1}</th>
                                            <td>{item.name}</td>
                                            <td>{item.stock} stocks</td>

                                            <td>
                                                <span className={`status-badge ${item.stock <= lowStockLimit ? "status-low" : "status-sufficient"}`}>
                                                    {item.stock <= lowStockLimit ? 'Low Stock' : 'Sufficient'}
                                                </span>
                                            </td>

                                            {/* Added cell after Status */}
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