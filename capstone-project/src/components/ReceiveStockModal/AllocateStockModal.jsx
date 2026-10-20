
import { useState } from "react";
import { collection, doc, getDoc, runTransaction, increment, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../../firebase-config";
import ReportSelect from "../ReportSelect/ReportSelect";
import "./receive-stock-modal.css";

// base      = smallest countable unit (all stock is stored in this unit)
// defaultPack = suggested units per box. Box sizes differ by supplier/program, so staff can
//               change it on every delivery; only suggested where a source confirms a size.
// code      = letter in the auto-generated batch number, e.g. BATCH-C-0001 (batch methods only)
export const STOCK_CONFIG = {
    condom:     { mode: "batch", code: "C", base: "pcs",   defaultPack: 144,  aliases: ["condom"] },
    pills:      { mode: "batch", code: "P", base: "cycle", defaultPack: null, aliases: ["pill", "pills"] },
    injectable: { mode: "batch", code: "I", base: "vial",  defaultPack: 20,   aliases: ["injectable", "dmpa"] },
    iud:        { mode: "batch", code: "U", base: "pcs",   defaultPack: null, aliases: ["iud"] },
    implant:    { mode: "batch", code: "M", base: "set",   defaultPack: null, aliases: ["implant"] },
    sdm:        { mode: "count", base: "set",   defaultPack: null, aliases: ["sdm", "standarddays", "cyclebeads", "standarddaysmethod"] },
    bbt:        { mode: "count", base: "pcs",   defaultPack: null, aliases: ["bbt", "basalbody", "basalbodytemperature", "basalbodytemp"] },
};

// One running number per method, kept in inventory/batchCounters as { [methodId]: lastNumber }
const COUNTER_REF = ["inventory", "batchCounters"];
const batchNumber = (code, seq) => `BATCH-${code}-${String(seq).padStart(4, "0")}`;

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");

// Matches an FP method ({ id, label }) to its stock config by id or label. null = not stocked.
function getConfig(method) {
    if (!method) return null;
    const id = String(method.id || "").toLowerCase().trim();
    return STOCK_CONFIG[id] || null;
}

// FP_METHODS -> only the stocked ones, each with its cfg attached
export function stockableMethods(methods) {
    return methods.map((m) => ({ ...m, cfg: getConfig(m) })).filter((m) => m.cfg);
}

// yyyy-mm-dd in local time, for <input type="date">
const todayStr = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

export default function ReceiveStockModal({ rhu, methods, onClose, onDone }) {
    const options = stockableMethods(methods);
    const [methodId, setMethodId] = useState("");
    const [unit, setUnit] = useState("");          // the base unit, or "box"
    const [qty, setQty] = useState("");
    const [packSize, setPackSize] = useState("");  // base units per box
    const [nextSeq, setNextSeq] = useState(null);  // { id, seq }: preview of the number the next batch of that method gets
    const [arrived, setArrived] = useState(todayStr());
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const method = options.find((m) => m.id === methodId);
    const cfg = method?.cfg;
    const isBatch = cfg?.mode === "batch";
    const isBox = unit === "box";
    const base = cfg && Number(qty) > 0 ? Number(qty) * (isBox ? Number(packSize) || 0 : 1) : 0;

    function pickMethod(id) {
        const next = options.find((m) => m.id === id)?.cfg;
        setMethodId(id);
        setUnit(next?.base ?? "");
        setPackSize(next?.defaultPack ?? "");
        setError("");
        setNextSeq(null);
        if (next?.mode === "batch") {
            // preview only; the number is really assigned inside the save transaction below
            getDoc(doc(db, ...COUNTER_REF))
                .then((snap) => setNextSeq({ id, seq: Number(snap.data()?.[id] ?? 0) + 1 }))
                .catch(() => {});
        }
    }

    async function submit() {
        const n = Number(qty);
        const pack = isBox ? Number(packSize) : 1;
        if (!method) return setError("Please select an FP method.");
        if (!Number.isInteger(n) || n <= 0) return setError("Enter a whole number greater than 0.");
        if (isBox && (!Number.isInteger(pack) || pack <= 0)) return setError(`Enter how many ${cfg.base} are in one box.`);
        if (isBatch) {
            if (!arrived) return setError("Date arrived is required.");
            if (arrived > todayStr()) return setError("Date arrived cannot be in the future.");
        }

        const added = n * pack;
        let batchNo = null;
        setBusy(true);
        try {
            await runTransaction(db, async (tx) => {
                const counterRef = doc(db, ...COUNTER_REF);
                // reads come before writes; the counter makes numbers unique per method, across all RHUs
                const seq = isBatch ? Number((await tx.get(counterRef)).data()?.[method.id] ?? 0) + 1 : 0;
                if (isBatch) {
                    batchNo = batchNumber(cfg.code, seq);
                    tx.set(counterRef, { [method.id]: seq }, { merge: true });
                    tx.set(doc(collection(db, "rhu", rhu.id, "batches")), {
                        method: method.id,
                        batchNo,
                        batchSeq: seq,
                        arrivedAt: Timestamp.fromDate(new Date(`${arrived}T00:00:00`)),
                        receivedAt: serverTimestamp(),
                        qtyReceived: added,
                        qtyRemaining: added,
                        unit,
                        packSize: pack,
                    });
                }
                tx.update(doc(db, "rhu", rhu.id), {
                    stock: increment(added),
                    [`stockByMethod.${method.id}`]: increment(added),
                });
                tx.set(doc(db, "inventory", "allocation"), { totalAllocation: increment(added) }, { merge: true });
                // no `type` field on purpose: matches how allocations were logged before
                tx.set(doc(collection(db, "inventory", "allocation", "history")), {
                    rhuId: rhu.id,
                    rhuName: rhu.name,
                    method: method.id,
                    quantity: added,
                    enteredQty: n,
                    enteredUnit: unit,
                    packSize: pack,
                    ...(isBatch ? { batchNo } : {}),
                    createdAt: serverTimestamp(),
                });
            });
            onDone(`${added.toLocaleString()} ${cfg.base} of ${method.label}${isBatch ? ` (${batchNo})` : ""} allocated to ${rhu.name}.`);
        } catch (e) {
            console.error("receive stock:", e);
            setError("Failed to save. Please try again.");
            setBusy(false);
        }
    }

    return (
        <div className="sm-overlay">
            <div className="sm-modal" role="dialog" aria-modal="true" aria-labelledby="sm-title">
                <header className="sm-head">
                    <div>
                        <h3 id="sm-title">Allocate Stock</h3>
                        <p>Record a delivery received by this unit</p>
                    </div>
                    <span className="sm-tag">{rhu.name}</span>
                </header>

                <div className="sm-body">
                    <div className="sm-field">
                        <span className="sm-label">FP method</span>
                        <ReportSelect
                            value={methodId}
                            onChange={(e) => pickMethod(e.target.value)}
                            options={options.map((m) => ({ value: m.id, label: m.label }))}
                            ariaLabel="FP method"
                            placeholder="Select FP method"
                        />
                    </div>

                    <div className="sm-field">
                        <span className="sm-label">Quantity &amp; unit</span>
                        <div className="sm-row">
                            <input
                                type="number" min="1" step="1" value={qty} placeholder="e.g. 5"
                                onChange={(e) => { setQty(e.target.value); setError(""); }}
                                className="sm-input"
                                aria-label="Quantity"
                            />
                            <ReportSelect
                                value={unit}
                                onChange={(e) => { setUnit(e.target.value); setError(""); }}
                                options={cfg ? [{ value: cfg.base, label: cfg.base }, { value: "box", label: "box" }] : []}
                                ariaLabel="Unit"
                                placeholder="Unit"
                            />
                        </div>
                    </div>

                    {isBox && (
                        <div className="sm-field">
                            <label className="sm-label" htmlFor="sm-pack">Units per box ({cfg.base})</label>
                            <input
                                id="sm-pack"
                                type="number" min="1" step="1" value={packSize} placeholder="Check the box label"
                                onChange={(e) => { setPackSize(e.target.value); setError(""); }}
                                className="sm-input"
                            />
                            {base > 0 && (
                                <p className="sm-note">= {base.toLocaleString()} {cfg.base} will be added to stock</p>
                            )}
                        </div>
                    )}

                    {isBatch && (
                        <div className="sm-group">
                            <p className="sm-group-title">Batch details</p>
                            <div className="sm-row">
                                <div className="sm-field">
                                    <label className="sm-label" htmlFor="sm-batch-no">Batch no.</label>
                                    <input
                                        id="sm-batch-no"
                                        type="text" readOnly tabIndex={-1}
                                        value={nextSeq?.id === methodId ? batchNumber(cfg.code, nextSeq.seq) : "Assigned on save"}
                                        className="sm-input sm-input--readonly"
                                    />
                                </div>
                                <div className="sm-field">
                                    <label className="sm-label" htmlFor="sm-arrived">Date arrived</label>
                                    <input
                                        id="sm-arrived"
                                        type="date" value={arrived}
                                        max={todayStr()}
                                        onChange={(e) => { setArrived(e.target.value); setError(""); }}
                                        className="sm-input"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && <p className="sm-error" role="alert">{error}</p>}
                </div>

                <footer className="sm-foot">
                    <button type="button" className="sm-btn sm-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button type="button" className="sm-btn sm-btn--primary" onClick={submit} disabled={busy}>
                        {busy ? "Saving..." : "Confirm"}
                    </button>
                </footer>
            </div>
        </div>
    );
}
