import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase-config";
import "./InventoryReport.css";
import { doc, getDoc } from "firebase/firestore";

function InventoryReport() {


    const [lowStockLimit, setLowStockLimit] = useState(8);

    useEffect(() => {
        const loadLimit = async () => {
            const snap = await getDoc(
                doc(db, "lowStock", "lowStockLimit")
            );

            if (snap.exists()) {
                const data = snap.data();

                if (data.isEnabled) {
                    setLowStockLimit(data.lowStockLimit);
                }
            }
        };

        loadLimit();
    }, []);


    const [rhus, setRhus] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const unsubscribe = onSnapshot(
            collection(db, "rhu"),
            (snapshot) => {

                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setRhus(data);
                setLoading(false);

            },
            (error) => {

                console.error(error);
                setLoading(false);

            }
        );

        return () => unsubscribe();

    }, []);

    const analytics = useMemo(() => {

        const totalRHUs = rhus.length;

        const totalStock = rhus.reduce(
            (sum, rhu) => sum + (rhu.stock || 0),
            0
        );

        const totalCapacity = rhus.reduce(
            (sum, rhu) => sum + (rhu.maxStock || 0),
            0
        );

        const totalPopulation = rhus.reduce(
            (sum, rhu) => sum + (rhu.total_population || 0),
            0
        );

        const lowStock = rhus.filter(
            rhu => (rhu.stock || 0) <= lowStockLimit
        );

        return {

            totalRHUs,
            totalStock,
            totalCapacity,
            totalPopulation,
            lowStock

        };

    }, [rhus]);

    if (loading) {

        return (
            <div className="inventory-loading">
                Loading Inventory...
            </div>
        );

    }

    return (

        <div className="inventory-container">

            {/* KPI Cards */}

            <div className="inventory-cards">

                <div className="inventory-card blue">

                    <small>Total RHUs</small>

                    <h2>{analytics.totalRHUs}</h2>

                </div>

                <div className="inventory-card green">

                    <small>Current Stock</small>

                    <h2>{analytics.totalStock}</h2>

                </div>

                <div className="inventory-card purple">

                    <small>Maximum Capacity</small>

                    <h2>{analytics.totalCapacity}</h2>

                </div>

                <div className="inventory-card orange">

                    <small>Total Population</small>

                    <h2>{analytics.totalPopulation.toLocaleString()}</h2>

                </div>

                <div className="inventory-card red">

                    <small>Low Stock RHUs</small>

                    <h2>{analytics.lowStock.length}</h2>

                </div>

            </div>

            {/* RHU Inventory */}

            <div className="inventory-panel">

                <h3>RHU Inventory Status</h3>

                <table className="inventory-table">

                    <thead>

                        <tr>

                            <th>RHU</th>
                            <th>Current Stock</th>
                            <th>Maximum Capacity</th>
                            <th>Population</th>
                            <th>Barangays</th>
                            <th>Stock Needed</th>
                            <th>Status</th>

                        </tr>

                    </thead>

                    <tbody>

                        {[...rhus]
                            .sort((a, b) => {
                                const getNumber = (name) => {
                                    const match = (name || "").match(/\d+/);
                                    return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
                                };

                                return getNumber(a.name) - getNumber(b.name);
                            })
                            .map(rhu => {

                                const stockNeeded = Math.max(0, (rhu.maxStock || 0) - (rhu.stock || 0));

                                return (

                                    <tr key={rhu.id}>

                                        <td>{rhu.name}</td>

                                        <td>{rhu.stock}</td>

                                        <td>{rhu.maxStock}</td>

                                        <td>
                                            {(rhu.total_population || 0).toLocaleString()}
                                        </td>

                                        <td>
                                            {rhu.barangays?.length || 0}
                                        </td>

                                        <td>

                                            {Math.max(0, (rhu.maxStock || 0) - (rhu.stock || 0))}

                                        </td>

                                        <td>

                                            {rhu.stock <= lowStockLimit ? (

                                                <span className="status critical">
                                                    Critical
                                                </span>

                                            ) : rhu.stock <= 200 ? (

                                                <span className="status warning">
                                                    Low
                                                </span>

                                            ) : (

                                                <span className="status good">
                                                    Good
                                                </span>

                                            )}

                                        </td>

                                    </tr>

                                );

                            })}

                    </tbody>

                </table>

            </div>

            {/* Low Stock */}

            <div className="inventory-panel">

    <div className="panel-header">

        <h3>Low Stock Alerts</h3>

        <span className="alert-count">
            {analytics.lowStock.length} Critical RHU{analytics.lowStock.length !== 1 ? "s" : ""}
        </span>

    </div>

    {analytics.lowStock.length === 0 ? (

        <div className="empty-alerts">

            <div className="success-icon">✓</div>

            <h4>Inventory Status is Healthy</h4>

            <p>All RHUs are above the configured low stock threshold.</p>

        </div>

    ) : (

        <div className="alert-list">

            {analytics.lowStock.map(rhu => {

                const stockNeeded = Math.max(
                    0,
                    (rhu.maxStock || 0) - (rhu.stock || 0)
                );

                return (

                    <div className="inventory-alert-card" key={rhu.id}>

                        <div className="alert-left">

                            <div className="alert-icon">
                                ⚠
                            </div>

                            <div>

                                <h4>{rhu.name}</h4>

                                <p>
                                    Serving {rhu.barangays?.length || 0} Barangays
                                </p>

                            </div>

                        </div>

                        <div className="alert-right">

                            <div className="alert-stat">

                                <small>Current</small>

                                <strong>{rhu.stock}</strong>

                            </div>

                            <div className="alert-stat">

                                <small>Maximum</small>

                                <strong>{rhu.maxStock}</strong>

                            </div>

                            <div className="alert-stat">

                                <small>Needed</small>

                                <strong>{stockNeeded}</strong>

                            </div>

                            <span className="critical-badge">
                                Restock Required
                            </span>

                        </div>

                    </div>

                );

            })}

        </div>

    )}

</div>

        </div>

    );

}

export default InventoryReport;