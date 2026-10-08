import { useEffect, useState } from "react";
import ReportSelect from "../../components/ReportSelect/ReportSelect";
// The modal's own styles live in these sheets. They are imported here because
// Client Records and Inventory also use this modal, and pages load lazily.
import "./form-reports/FormAAnalytics.css";
import "./report-forms.css";

/*
    Confirmation shown before a report is exported. It shows what the file
    will be and repeats the page filters as dropdowns, so they can be checked
    - and changed - right before exporting. Changing one here changes the
    page's filter too, and the export uses the new value.

    Props
    - format:     "pdf" | "excel"
    - reportName: e.g. "Form A"
    - filters:    the Reports page's filter controls
                  [{ key, label, value, onChange, options }]
    - imported:   true when the figures come from an imported Excel report
    - defaultFileName: suggested file name, without the extension
    - onCancel
    - onConfirm(fileName): fileName includes the extension
*/
function ExportConfirmModal({
    format,
    reportName,
    filters = [],
    imported = false,
    defaultFileName = "Report",
    onCancel,
    onConfirm,
}) {

    const isPdf = format === "pdf";
    const extension = isPdf ? ".pdf" : ".xlsx";

    // null = not edited yet, so the suggested name is shown (and follows the Year filter)
    const [customName, setCustomName] = useState(null);
    const fileName = customName ?? defaultFileName;

    // Characters Windows does not allow in a file name are dropped; a blank
    // name falls back to the suggested one. A typed extension is not doubled.
    const confirm = () => {
        const cleaned = fileName
            .replace(/[\\/:*?"<>|]/g, "")
            .replace(/\.(pdf|xlsx)$/i, "")
            .trim();
        onConfirm(`${cleaned || defaultFileName}${extension}`);
    };

    // Escape closes the modal
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === "Escape") onCancel();
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [onCancel]);

    // Year first, then period, barangay, method.
    // Barangay and method only narrow client records, not an imported report.
    const order = ["year", "period", "barangay", "method"];

    const editable = filters
        .filter(control =>
            imported ? control.key === "year" || control.key === "period" : true
        )
        .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

    const isNarrowed = editable.some(
        control => control.key !== "year" && !["all", ""].includes(String(control.value))
    );

    return (
        <div className="import-modal-backdrop" onClick={onCancel}>

            <div
                className="import-modal export-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="export-modal-title"
                onClick={e => e.stopPropagation()}
            >

                <h3 id="export-modal-title">
                    Export {reportName} as {isPdf ? "PDF" : "Excel"}
                </h3>

                <p className="import-hint">
                    {editable.length > 0
                        ? "Review the filters before exporting."
                        : "Check the file name, then export."}
                </p>

                {editable.length > 0 && (
                <div className="export-modal-filters">
                    {editable.map(control => (
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
                )}

                <div className="export-modal-filename">
                    <label htmlFor="export-file-name">File name</label>
                    <div className="export-modal-filename-field">
                        <input
                            id="export-file-name"
                            type="text"
                            value={fileName}
                            maxLength={120}
                            spellCheck={false}
                            onChange={e => setCustomName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") confirm(); }}
                        />
                        <span>{extension}</span>
                    </div>
                </div>

                {isNarrowed && (
                    <p className="export-modal-note">
                        A filter is on, so only matching records are counted.
                        Set it to &quot;All&quot; to export everything.
                    </p>
                )}

                <div className="import-modal-actions">
                    <button type="button" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={`excel-btn${isPdf ? " is-pdf" : ""}`}
                        onClick={confirm}
                    >
                        Export {isPdf ? "PDF" : "Excel"}
                    </button>
                </div>

            </div>

        </div>
    );
}

export default ExportConfirmModal;
