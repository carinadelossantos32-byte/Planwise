import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { X } from "lucide-react";
import { db } from "../../firebase-config";
import { STOCK_CONFIG } from "../ReceiveStockModal/AllocateStockModal.jsx";
import "./stock-batches-modal.css";

const DEFAULT_NOTICE_MONTHS = 1; // same default the expiry email check uses

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// `date` plus `months` calendar months; the day is clamped to the end of a shorter month
function addMonths(date, months) {
    const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(date.getDate(), lastDay));
    return target;
}

const formatDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const monthsLabel = (n) => `${n} ${n === 1 ? "month" : "months"}`;

// batches of one method that still have stock, oldest arrival first (the order they are issued in)
function methodBatches(batches, methodId) {
    return batches
        .filter((b) => b.method === methodId && b.qtyRemaining > 0)
        .map((b) => {
            const arrived = b.arrivedAt ?? b.receivedAt; // older batches only have receivedAt
            return { ...b, arrivedOn: arrived?.toDate ? startOfDay(arrived.toDate()) : null };
        })
        .sort((a, b) => (a.arrivedOn?.getTime() ?? 0) - (b.arrivedOn?.getTime() ?? 0));
}

export default function StockBatchesModal({ rhu, methods, onClose }) {
    const [batches, setBatches] = useState(null);   // null while loading
    const [settings, setSettings] = useState({});
    const [error, setError] = useState("");

    useEffect(() => {
        let live = true;
        Promise.all([
            getDocs(collection(db, "rhu", rhu.id, "batches")),
            getDoc(doc(db, "lowStock", "lowStockLimit")),
        ])
            .then(([batchSnap, settingsSnap]) => {
                if (!live) return;
                setBatches(batchSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setSettings(settingsSnap.exists() ? settingsSnap.data() : {});
            })
            .catch((e) => {
                console.error("load batches:", e);
                if (live) setError("Could not load the batches. Please try again.");
            });
        return () => { live = false; };
    }, [rhu.id]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const shelfLifeByMethod = settings.shelfLifeMonthsByMethod || {};
    const noticeByMethod = settings.expiryNoticeMonthsByMethod || {};
    const batchMethods = methods.filter((m) => STOCK_CONFIG[m.id]?.mode === "batch");
    const today = startOfDay(new Date());

    return (
        <div className="sbm-overlay" onClick={onClose}>
            <div className="sbm-modal" role="dialog" aria-modal="true" aria-labelledby="sbm-title" onClick={(e) => e.stopPropagation()}>
                <header className="sbm-head">
                    <div>
                        <h3 id="sbm-title">Stock Batches</h3>
                        <p>Shelf life and expiry notice for each batch, by date of arrival</p>
                    </div>
                    <span className="sbm-tag">{rhu.name}</span>
                    <button type="button" className="sbm-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </header>

                <div className="sbm-body">
                    {error && <p className="sbm-state sbm-state--error">{error}</p>}
                    {!error && batches === null && <p className="sbm-state">Loading batches...</p>}

                    {batches !== null && batchMethods.map((method) => {
                        const rows = methodBatches(batches, method.id);
                        const shelfLife = Number(shelfLifeByMethod[method.id]);
                        const hasShelfLife = shelfLife > 0;
                        const rawNotice = noticeByMethod[method.id];
                        const notice = rawNotice === undefined || rawNotice === "" ? DEFAULT_NOTICE_MONTHS : Number(rawNotice);

                        return (
                            <section key={method.id} className="sbm-method">
                                <h4>{method.label}</h4>
                                {rows.length === 0 ? (
                                    <p className="sbm-empty">No batches in stock.</p>
                                ) : (
                                    <div className="sbm-table-scroll">
                                        <table className="sbm-table">
                                            <thead>
                                                <tr>
                                                    <th>Batch</th>
                                                    <th>Arrived</th>
                                                    <th>Shelf life</th>
                                                    <th>Alert ({monthsLabel(notice)} before)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map((b, i) => {
                                                    const alertOn = hasShelfLife && b.arrivedOn ? addMonths(b.arrivedOn, shelfLife - notice) : null;
                                                    const expiresOn = hasShelfLife && b.arrivedOn ? addMonths(b.arrivedOn, shelfLife) : null;
                                                    const status = !expiresOn ? "" : expiresOn <= today ? "expired" : alertOn <= today ? "due" : "";
                                                    return (
                                                        <tr key={b.id}>
                                                            <td>
                                                                <span className="sbm-batch">{b.batchNo ?? `Batch ${i + 1}`}</span>
                                                                {!b.batchNo && b.lotNo && <span className="sbm-lot">Lot {b.lotNo}</span>}
                                                            </td>
                                                            <td>{b.arrivedOn ? formatDate(b.arrivedOn) : "—"}</td>
                                                            <td>{hasShelfLife ? monthsLabel(shelfLife) : <span className="sbm-muted">Not set</span>}</td>
                                                            <td>
                                                                {alertOn ? formatDate(alertOn) : <span className="sbm-muted">—</span>}
                                                                {status === "due" && <span className="sbm-chip sbm-chip--due">Expiring soon</span>}
                                                                {status === "expired" && <span className="sbm-chip sbm-chip--expired">Expired</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {rows.length > 0 && !hasShelfLife && (
                                    <p className="sbm-hint">Set a shelf life for {method.label} in Settings &gt; Notifications to get expiry alerts.</p>
                                )}
                            </section>
                        );
                    })}
                </div>

                <footer className="sbm-foot">
                    <button type="button" className="sbm-btn" onClick={onClose}>Close</button>
                </footer>
            </div>
        </div>
    );
}
