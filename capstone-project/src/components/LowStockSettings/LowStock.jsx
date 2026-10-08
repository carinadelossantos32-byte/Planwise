import { useState, useEffect } from "react";
import { db } from "../../firebase-config"
import { doc, getDoc, setDoc } from "firebase/firestore";
import "./notification-settings.css";
import { INVENTORY_FP_METHODS as FP_METHODS } from "../../data/inventoryMethods.js";

function LowStockSettings() {
    const [alertsEnabled, setAlertsEnabled] = useState(true);
    const [thresholds, setThresholds] = useState({});
    const [globalValue, setGlobalValue] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [toastTitle, setToastTitle] = useState("");
    const [toastMessage, setToastMessage] = useState("");

    useEffect(() => {
        async function loadSettings() {
            const snap = await getDoc(doc(db, "lowStock", "lowStockLimit"));
            if (snap.exists()) {
                const data = snap.data();
                setAlertsEnabled(data.enabled ?? true);
                setThresholds(data.limitsByMethod || {});
            }
        }
        loadSettings();
    }, []);

    const handleLimitChange = (methodId, value) => {
        setThresholds(prev => ({
            ...prev,
            [methodId]: value === "" ? "" : Math.max(0, Number(value))
        }));
    };

    const handleApplyGlobal = () => {
        if (!globalValue && globalValue !== 0) return;
        const updated = {};
        FP_METHODS.forEach(m => {
            updated[m.id] = Number(globalValue);
        });
        setThresholds(updated);
    };

    const handleSave = async () => {
    try {
        await setDoc(doc(db, "lowStock", "lowStockLimit"), {
            enabled: alertsEnabled,
            limitsByMethod: thresholds,
        }, { merge: true });

        setToastTitle("Low Stock Thresholds Updated");
        setToastMessage("Your changes have been saved.");
    } catch (err) {
        console.error("Error saving thresholds:", err);
        setToastTitle("Save Failed");
        setToastMessage("Could not save thresholds. Please try again.");
    }

    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
};

    return (
        <>
        <div className="settings-page">
        <h1 className="settings-page-title">Low Stock</h1>
        <p className="settings-page-sub">Set the stock level at which each FP method is flagged as low.</p>

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

            {/* Per-Method Grid Settings */}
            <div className="method-thresholds-grid">
                {FP_METHODS.map((method) => (
                    <div key={method.id} className="method-threshold-item">
                        <span className="method-label">{method.label}</span>
                        <input 
                            type="number"
                            min="0"
                            placeholder="0"
                            value={thresholds[method.id] ?? ""}
                            onChange={(e) => handleLimitChange(method.id, e.target.value)}
                            className="threshold-input"
                        />
                    </div>
                ))}
            </div>

            <div className="settings-footer">
                <button className="settings-btn settings-btn--primary" onClick={handleSave}>
                    Save Threshold Limits
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