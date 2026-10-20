
import { useEffect, useState } from "react";
import { collection, doc, getDocs, query, where, runTransaction, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import ReportSelect from "../ReportSelect/ReportSelect";
import { stockableMethods } from "../ReceiveStockModal/AllocateStockModal";
import "../ReceiveStockModal/receive-stock-modal.css";
import "./issue-stock-modal.css";

const REASONS = [
    { value: "dispensed", label: "Dispensed to client" },
    { value: "transferred", label: "Transferred out" },
    { value: "damaged", label: "Damaged" },
    { value: "adjustment", label: "Adjustment" },
];

// older batches have no arrivedAt (fall back to when they were recorded) and no batchNo (fall back to the lot no. typed then)
const arrivedMs = (b) => (b.arrivedAt ?? b.receivedAt)?.toMillis?.() ?? 0;
const sum = (list) => list.reduce((s, b) => s + b.qtyRemaining, 0);

// batches of one method that still have stock, FIFO-sorted (earliest arrived first)
async function loadBatches(rhuId, methodId) {
    const snap = await getDocs(query(collection(db, "rhu", rhuId, "batches"), where("method", "==", methodId)));
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((b) => b.qtyRemaining > 0)
        .sort((a, b) => arrivedMs(a) - arrivedMs(b));
}

// which batches supply `qty` units, in FIFO order, and what is left over
function planFifo(batches, qty) {
    let need = qty;
    const picks = [];
    for (const b of batches) {
        if (need <= 0) break;
        const take = Math.min(b.qtyRemaining, need);
        picks.push({ batchId: b.id, batchNo: b.batchNo ?? b.lotNo, arrivedMs: arrivedMs(b), take });
        need -= take;
    }
    return { picks, rest: Math.max(need, 0) };
}

export default function IssueStockModal({ rhu, methods, onClose, onDone }) {
    const options = stockableMethods(methods);
    const [methodId, setMethodId] = useState("");
    const [qty, setQty] = useState("");
    const [reason, setReason] = useState("");
    const [batches, setBatches] = useState([]);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const method = options.find((m) => m.id === methodId);
    const cfg = method?.cfg;
    const isBatch = cfg?.mode === "batch";

    useEffect(() => {
        if (!isBatch) { setBatches([]); return; }
        let live = true;
        loadBatches(rhu.id, methodId)
            .then((b) => live && setBatches(b))
            .catch(() => live && setError("Could not load batches."));
        return () => { live = false; };
    }, [isBatch, methodId, rhu.id]);

    const onHand = Number(rhu.stockByMethod?.[methodId] ?? 0);
    // stock with no batch record behind it (counted before batch tracking); used after all lots
    const unbatched = isBatch ? Math.max(onHand - sum(batches), 0) : 0;
    const usable = isBatch ? sum(batches) + unbatched : onHand;

    const n = Number(qty);
    const plan = isBatch && n > 0 ? planFifo(batches, n) : null;

    async function submit() {
        if (!method) return setError("Please select an FP method.");
        if (!Number.isInteger(n) || n <= 0) return setError("Enter a whole number greater than 0.");
        if (!reason) return setError("Please select a reason.");
        if (n > usable) {
            return setError(`Only ${usable.toLocaleString()} ${cfg.base} available.`);
        }

        const picks = isBatch ? planFifo(batches, n).picks : [];
        const noLot = n - picks.reduce((s, p) => s + p.take, 0);   // drawn from stock with no lot record
        setBusy(true);
        try {
            await runTransaction(db, async (tx) => {
                const rhuRef = doc(db, "rhu", rhu.id);
                const batchRefs = picks.map((p) => doc(db, "rhu", rhu.id, "batches", p.batchId));
                const [rhuSnap, ...batchSnaps] = await Promise.all([tx.get(rhuRef), ...batchRefs.map((r) => tx.get(r))]); // reads first

                const current = Number(rhuSnap.data()?.stockByMethod?.[methodId] ?? 0);
                if (n > current) throw new Error(`Only ${current} in stock for this method.`);
                batchSnaps.forEach((s, i) => {
                    if (!s.exists() || s.data().qtyRemaining < picks[i].take) {
                        throw new Error(`Batch ${picks[i].batchNo} changed. Please try again.`);
                    }
                });

                const log = (extra) => tx.set(doc(collection(db, "inventory", "allocation", "history")), {
                    type: "deduct",
                    rhuId: rhu.id,
                    rhuName: rhu.name,
                    method: methodId,
                    reason,
                    createdAt: serverTimestamp(),
                    ...extra,
                });                                                                                                      // then writes
                picks.forEach((p, i) => {
                    tx.update(batchRefs[i], { qtyRemaining: increment(-p.take) });
                    log({ quantity: p.take, batchNo: p.batchNo });
                });
                if (noLot > 0) log({ quantity: noLot, batchNo: null });
                tx.update(rhuRef, {
                    stock: increment(-n),
                    [`stockByMethod.${methodId}`]: increment(-n),
                });
            });

            const used = picks.map((p) => `${p.batchNo} (${p.take})`);
            if (isBatch && noLot > 0) used.push(`no batch (${noLot})`);
            onDone(`${n.toLocaleString()} ${cfg.base} of ${method.label} deducted from ${rhu.name}${used.length ? `: ${used.join(", ")}` : ""}.`);
        } catch (e) {
            console.error("issue stock:", e);
            setError(e.message || "Failed to deduct. Please try again.");
            setBusy(false);
        }
    }

    return (
        <div className="sm-overlay">
            <div className="sm-modal sm-modal--deduct" role="dialog" aria-modal="true" aria-labelledby="sm-title">
                <header className="sm-head">
                    <div>
                        <h3 id="sm-title">Deduct Stock</h3>
                        <p>Remove stock that was issued, moved or lost</p>
                    </div>
                    <span className="sm-tag">{rhu.name}</span>
                </header>

                <div className="sm-body">
                    <div className="sm-field">
                        <span className="sm-label">FP method</span>
                        <ReportSelect
                            value={methodId}
                            onChange={(e) => { setMethodId(e.target.value); setError(""); }}
                            options={options.map((m) => ({ value: m.id, label: m.label }))}
                            ariaLabel="FP method"
                            placeholder="Select FP method"
                        />
                        {method && (
                            <p className="sm-note">Available stock: <strong>{usable.toLocaleString()}</strong> {cfg.base}</p>
                        )}
                    </div>

                    <div className="sm-field">
                        <label className="sm-label" htmlFor="sm-qty">Quantity to deduct{cfg ? ` (${cfg.base})` : ""}</label>
                        <input
                            id="sm-qty"
                            type="number" min="1" step="1" value={qty} placeholder="e.g. 50"
                            onChange={(e) => { setQty(e.target.value); setError(""); }}
                            className="sm-input"
                        />
                    </div>

                    <div className="sm-field">
                        <span className="sm-label">Reason</span>
                        <ReportSelect
                            value={reason}
                            onChange={(e) => { setReason(e.target.value); setError(""); }}
                            options={REASONS}
                            ariaLabel="Reason"
                            placeholder="Select reason"
                        />
                    </div>

                    {plan && (plan.picks.length > 0 || plan.rest > 0) && (
                        <div className="sm-pick">
                            <p className="sm-group-title">FIFO pick <span>earliest arrived first</span></p>
                            <ul>
                                {plan.picks.map((p) => (
                                    <li key={p.batchId}>
                                        <span className="sm-pick-lot">{p.batchNo}</span>
                                        {p.arrivedMs > 0 && <span className="sm-pick-date">arrived {new Date(p.arrivedMs).toLocaleDateString()}</span>}
                                        <span className="sm-pick-qty">{p.take.toLocaleString()} {cfg.base}</span>
                                    </li>
                                ))}
                                {plan.rest > 0 && unbatched > 0 && (
                                    <li>
                                        <span className="sm-pick-lot">No batch (opening stock)</span>
                                        <span className="sm-pick-qty">{Math.min(plan.rest, unbatched).toLocaleString()} {cfg.base}</span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    {error && <p className="sm-error" role="alert">{error}</p>}
                </div>

                <footer className="sm-foot">
                    <button type="button" className="sm-btn sm-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button type="button" className="sm-btn sm-btn--danger" onClick={submit} disabled={busy}>
                        {busy ? "Saving..." : "Confirm"}
                    </button>
                </footer>
            </div>
        </div>
    );
}
