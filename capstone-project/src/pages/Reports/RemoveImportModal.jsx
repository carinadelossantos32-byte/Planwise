import "./form-reports/FormAAnalytics.css";
import "./report-forms.css";

// Styled replacement for the browser's confirm() when removing an imported report
function RemoveImportModal({ year, onConfirm, onCancel }) {
    return (
        <div className="import-modal-backdrop" onClick={onCancel}>

            <div
                className="import-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="remove-import-title"
                onClick={e => e.stopPropagation()}
            >

                <h3 id="remove-import-title">Remove imported report</h3>

                <p className="import-warning-msg" role="alert">
                    Remove the imported report for {year}? The page will go back
                    to using client records for that year.
                </p>

                <div className="import-modal-actions">
                    <button type="button" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="button" className="excel-btn is-pdf" onClick={onConfirm}>
                        Remove
                    </button>
                </div>

            </div>

        </div>
    );
}

export default RemoveImportModal;
