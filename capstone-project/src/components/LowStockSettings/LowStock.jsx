import React, { useState, useEffect } from "react";
import { db } from "../../firebase-config"
import { doc, getDoc, setDoc } from "firebase/firestore";
import "./notification-settings.css";
const FP_METHODS = [
    { id: "condom", label: "Condom" },
    { id: "iud", label: "IUD" },
    { id: "pills", label: "Pills" },
    { id: "injectable", label: "Injectable" },
    { id: "vasectomy", label: "Vasectomy" },
    { id: "tubal_ligation", label: "Tubal Ligation" },
    { id: "implant", label: "Implant" },
    { id: "cmm_billings", label: "CMM/Billings" },
    { id: "bbt", label: "Basal Body Temperature (BBT)" },
    { id: "stm", label: "Sympto-Thermal Method (STM)" },
    { id: "sdm", label: "Standard Days Method (SDM)" },
    { id: "lam", label: "Lactational Amenorrhea Method (LAM)" },
];

function LowStockSettings() {
    const [alertsEnabled, setAlertsEnabled] = useState(true);
    const [thresholds, setThresholds] = useState({});
    const [globalValue, setGlobalValue] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [toastTitle, setToastTitle] = useState("");
    const [toastMessage, setToastMessage] = useState("");

    // Load existing thresholds from Firestore
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

    // Helper: Update individual method limit
    const handleLimitChange = (methodId, value) => {
        setThresholds(prev => ({
            ...prev,
            [methodId]: value === "" ? "" : Math.max(0, Number(value))
        }));
    };

    // Helper: Apply global value to all methods
    const handleApplyGlobal = () => {
        if (!globalValue && globalValue !== 0) return;
        const updated = {};
        FP_METHODS.forEach(m => {
            updated[m.id] = Number(globalValue);
        });
        setThresholds(updated);
    };

    // Save all thresholds to Firestore
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
        <div className="low-stock-card">
            <div className="low-stock-header">
                <div>
                    <h2>Low Stock Alerts</h2>
                    <p className="subtext">Get notified when commodity levels fall below method thresholds.</p>
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
                <label>Quick Set All Limits:</label>
                <input 
                    type="number" 
                    placeholder="e.g. 10" 
                    value={globalValue} 
                    onChange={(e) => setGlobalValue(e.target.value)}
                    className="threshold-input"
                />
                <button className="btn-secondary" onClick={handleApplyGlobal}>Apply to All</button>
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
                <button className="btn-primary" onClick={handleSave}>
                    Save Threshold Limits
                </button>
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