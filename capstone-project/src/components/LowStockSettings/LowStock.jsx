import { useState, useEffect } from "react";
import { db } from "../../firebase-config"
import { doc, getDoc, setDoc } from "firebase/firestore";
import "./notification-settings.css";
import { INVENTORY_FP_METHODS as FP_METHODS } from "../../data/inventoryMethods.js";
import { STOCK_CONFIG } from "../ReceiveStockModal/AllocateStockModal.jsx";
import ReportSelect from "../ReportSelect/ReportSelect";

// limitsByMethod stays in base units (what the rest of the app compares stock against);
// limitEntryByMethod remembers how the user typed it: { qty, unit: base unit | "box", packSize }
const baseOf = (methodId) => STOCK_CONFIG[methodId]?.base ?? "pcs";
const toBase = (entry) => Number(entry.qty) * (entry.unit === "box" ? Number(entry.packSize) : 1);

function LowStockSettings() {
    const [alertsEnabled, setAlertsEnabled] = useState(true);
    const [limits, setLimits] = useState({});       // { [methodId]: { qty, unit, packSize } }
    const [shelfLife, setShelfLife] = useState({}); // { [methodId]: months after Date Arrived until a batch expires }
    const [notice, setNotice] = useState({});       // { [methodId]: months before expiry the email goes out }
    const [globalValue, setGlobalValue] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [toastTitle, setToastTitle] = useState("");
    const [toastMessage, setToastMessage] = useState("");

    useEffect(() => {
        async function loadSettings() {
            const snap = await getDoc(doc(db, "lowStock", "lowStockLimit"));
            if (snap.exists()) {
                const data = snap.data();
                const saved = data.limitsByMethod || {};
                const entries = data.limitEntryByMethod || {};
                setAlertsEnabled(data.enabled ?? true);
                setLimits(Object.fromEntries(FP_METHODS.map((m) => [
                    m.id,
                    entries[m.id] ?? { qty: saved[m.id] ?? "", unit: baseOf(m.id), packSize: "" },
                ])));
                setShelfLife(data.shelfLifeMonthsByMethod || {});
                setNotice(data.expiryNoticeMonthsByMethod || {});
            }
        }
        loadSettings();
    }, []);

    const entryOf = (methodId) => limits[methodId] ?? { qty: "", unit: baseOf(methodId), packSize: "" };

    const handleLimitChange = (methodId, field, value) => {
        setLimits(prev => {
            const entry = { ...entryOf(methodId), ...prev[methodId] };
            if (field === "unit") {
                entry.unit = value;
                // suggest the usual box size where one is known
                if (value === "box" && !entry.packSize) entry.packSize = STOCK_CONFIG[methodId]?.defaultPack ?? "";
            } else {
                entry[field] = value === "" ? "" : Math.max(0, Number(value));
            }
            return { ...prev, [methodId]: entry };
        });
    };

    // whole months only
    const monthsHandler = (setter) => (methodId, value) => {
        setter(prev => ({
            ...prev,
            [methodId]: value === "" ? "" : Math.max(0, Math.floor(Number(value)))
        }));
    };
    const handleShelfLifeChange = monthsHandler(setShelfLife);
    const handleNoticeChange = monthsHandler(setNotice);

    const handleApplyGlobal = () => {
        if (!globalValue && globalValue !== 0) return;
        setLimits(prev => Object.fromEntries(FP_METHODS.map((m) => [
            m.id,
            { ...entryOf(m.id), ...prev[m.id], qty: Number(globalValue) },
        ])));
    };

    const handleSave = async () => {
        const missingBox = FP_METHODS.find((m) => {
            const e = entryOf(m.id);
            return e.qty !== "" && e.unit === "box" && !(Number(e.packSize) > 0);
        });

        try {
            if (missingBox) throw new Error(`Enter how many ${baseOf(missingBox.id)} are in one box of ${missingBox.label}.`);

            const limitsByMethod = {};
            FP_METHODS.forEach((m) => {
                const e = entryOf(m.id);
                limitsByMethod[m.id] = e.qty === "" ? "" : toBase(e);
            });

            await setDoc(doc(db, "lowStock", "lowStockLimit"), {
                enabled: alertsEnabled,
                limitsByMethod,
                limitEntryByMethod: limits,
                shelfLifeMonthsByMethod: shelfLife,
                expiryNoticeMonthsByMethod: notice,
            }, { merge: true });

            setToastTitle("Low Stock Thresholds Updated");
            setToastMessage("Your changes have been saved.");
        } catch (err) {
            console.error("Error saving thresholds:", err);
            setToastTitle("Save Failed");
            setToastMessage(missingBox ? err.message : "Could not save thresholds. Please try again.");
        }

        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
    };

    return (
        <>
        <div className="settings-page">
        <h1 className="settings-page-title">Low Stock</h1>
        <p className="settings-page-sub">Set the stock level at which each FP method is flagged as low, and when each batch is flagged as nearing expiry.</p>

        <div className="low-stock-card settings-card">
            <div className="low-stock-header">
                <div>
                    <h2 className="settings-card-title">Low Stock Alerts</h2>
                    <p className="settings-card-sub">Get notified when commodity levels fall below method thresholds.</p>
                </div>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={alertsEnabled}
                        onChange={(e) => setAlertsEnabled(e.target.checked)}
                    />
                    <span className="slider round"></span>
                </label>
            </div>

            <hr className="divider" />

            {/* Quick Bulk Set Section */}
            <div className="bulk-set-container">
                <label htmlFor="low-stock-quick-set">Quick set all limits</label>
                <input
                    id="low-stock-quick-set"
                    type="number"
                    placeholder="e.g. 10"
                    value={globalValue}
                    onChange={(e) => setGlobalValue(e.target.value)}
                    className="threshold-input"
                />
                <button className="settings-btn settings-btn--outline" onClick={handleApplyGlobal}>Apply to All</button>
            </div>

            {/* Per-Method Settings: one row per FP method */}
            <div className="method-table-scroll">
                <table className="method-table">
                    <thead>
                        <tr>
                            <th scope="col"><span className="sr-only">FP method</span></th>
                            <th scope="col">Low Stock Limit</th>
                            <th scope="col">Shelf Life (Months)</th>
                            <th scope="col">Advance Expiry Notice (Months)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {FP_METHODS.map((method) => {
                            const entry = entryOf(method.id);
                            const base = baseOf(method.id);
                            const isBatch = STOCK_CONFIG[method.id]?.mode === "batch";
                            return (
                                <tr key={method.id}>
                                    <th scope="row">{method.label}</th>
                                    <td data-label="Low Stock Limit">
                                        <div className="limit-field">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={entry.qty}
                                                onChange={(e) => handleLimitChange(method.id, "qty", e.target.value)}
                                                className="threshold-input"
                                                aria-label={`${method.label} low stock limit`}
                                            />
                                            <div className="limit-unit-select">
                                                <ReportSelect
                                                    value={entry.unit}
                                                    onChange={(e) => handleLimitChange(method.id, "unit", e.target.value)}
                                                    options={[{ value: base, label: base }, { value: "box", label: "box" }]}
                                                    ariaLabel={`${method.label} limit unit`}
                                                />
                                            </div>
                                            {entry.unit === "box" && (
                                                <span className="limit-pack">
                                                    ×
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="0"
                                                        value={entry.packSize}
                                                        onChange={(e) => handleLimitChange(method.id, "packSize", e.target.value)}
                                                        className="threshold-input"
                                                        aria-label={`${base} per box of ${method.label}`}
                                                    />
                                                    {base}/box
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td data-label="Shelf Life (Months)">
                                        {isBatch ? (
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                placeholder="0"
                                                value={shelfLife[method.id] ?? ""}
                                                onChange={(e) => handleShelfLifeChange(method.id, e.target.value)}
                                                className="threshold-input"
                                                aria-label={`${method.label} shelf life in months`}
                                            />
                                        ) : (
                                            <span className="method-na" title="Not tracked by batch">—</span>
                                        )}
                                    </td>
                                    <td data-label="Advance Expiry Notice (Months)">
                                        {isBatch ? (
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                placeholder="1"
                                                value={notice[method.id] ?? ""}
                                                onChange={(e) => handleNoticeChange(method.id, e.target.value)}
                                                className="threshold-input"
                                                aria-label={`${method.label} advance expiry notice in months`}
                                            />
                                        ) : (
                                            <span className="method-na" title="Not tracked by batch">—</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="method-table-note">
                Shelf life counts from each batch's date of arrival, and the expiry notice is emailed that many months
                before the batch expires. 
            </p>

            <div className="settings-footer">
                <button className="settings-btn settings-btn--primary" onClick={handleSave}>
                    Save Changes
                </button>
            </div>
        </div>
        </div>

         {showToast && (
            <div id="toast-container">
                <div id="toast-alert">
                    <div>
                        <span id="toast-title">{toastTitle}</span>
                        <span id="toast-message">{toastMessage}</span>
                    </div>
                </div>
            </div>
        )}

       </>
    );
}

export default LowStockSettings;
