import { useState } from "react";
import "./client-table.css";
import { ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { Clip, RecordsStats, RowActions, RecordsPagination } from "./TableParts";

// Address has no width, so it takes whatever the other columns leave
const COLUMNS = [
    { label: "ID", width: 46 },
    { label: "Name", width: "15%" },
    { label: "Civil Status", width: "6.5%" },
    { label: "Birthdate", width: "8.5%" },
    { label: "Address" },
    { label: "Education", width: "9.6%", title: "Highest Educational Attainment", className: "rec-tight-right" },
    { label: "Kids", width: 40, title: "No. of Children", className: "rec-center" },
    { label: "Method / Shift", width: "12.8%", title: "Method Used / Intention to Shift", className: "rec-gap-left" },
    { label: "Type / Status", width: "9.5%", title: "Traditional FP User: Type / Status" },
    { label: "Reason / Class", width: "9%", title: "Reason / Classes Held" },
    { label: "Sign.", width: 50, title: "Signature" },
    { label: "Actions" },
];

const EDUCATION_SHORT = {
    "No Education": "No Educ.",
    "Elementary Level": "Elem. Level",
    "Elementary Graduate": "Elem. Grad",
    "High School Level": "HS Level",
    "High School Graduate": "HS Grad",
    "College Graduate": "College Grad",
    "Post Graduate": "Post Grad",
};

function ClientTable({ clients, loading, onView, onEdit, onDelete, isArchived, onRestore }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [previewImage, setPreviewImage] = useState(null);
    const itemsPerPage = 10;

    const safeClients = clients || [];
    const totalPages = Math.ceil(safeClients.length / itemsPerPage);
    // a search or filter can leave fewer pages than the one being viewed
    const page = Math.min(currentPage, Math.max(totalPages, 1));

    const indexOfLastClient = page * itemsPerPage;
    const indexOfFirstClient = indexOfLastClient - itemsPerPage;
    const currentClients = safeClients.slice(indexOfFirstClient, indexOfLastClient);

    return (
        <>
            <div className="rec-card">
                {!isArchived && <RecordsStats clients={safeClients} showActive />}

                {loading ? (
                    <div className={`rec-empty${isArchived ? " rec-empty--compact" : ""}`}>Loading records...</div>
                ) : safeClients.length === 0 ? (
                    <div className={`rec-empty${isArchived ? " rec-empty--compact" : ""}`}>
                        {isArchived ? "No archived records found." : "No records found."}
                    </div>
                ) : (
                    <div className="rec-table-scroll">
                        <table className="rec-table rec-table--public">
                            <colgroup>
                                {COLUMNS.map((column) => (
                                    <col
                                        key={column.label}
                                        style={{ width: column.label === "Actions" ? (isArchived ? 104 : 80) : column.width }}
                                    />
                                ))}
                            </colgroup>

                            <thead>
                                <tr>
                                    {COLUMNS.map((column) => (
                                        <th key={column.label} title={column.title} className={column.className}>{column.label}</th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {currentClients.map((client, index) => (
                                    <tr
                                        key={client.id || index}
                                        className={isArchived ? "rec-row--archived" : "rec-row--clickable"}
                                        tabIndex={isArchived ? undefined : 0}
                                        aria-label={isArchived ? undefined : `View ${client.name || "client"} record`}
                                        onClick={isArchived ? undefined : () => onView(client)}
                                        onKeyDown={isArchived ? undefined : (event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                onView(client);
                                            }
                                        }}
                                    >
                                        <td className="rec-id">{String(indexOfFirstClient + index + 1).padStart(3, "0")}</td>
                                        <td>
                                            <div className="rec-stack">
                                                <span className="rec-person">
                                                    <span className="rec-sex rec-sex--male" title="Male">M</span>
                                                    <Clip className="rec-name">{client.name}</Clip>
                                                </span>
                                                <span className="rec-person">
                                                    <span className="rec-sex rec-sex--female" title="Female">F</span>
                                                    <Clip className="rec-name rec-name--spouse">{client.spouse_name}</Clip>
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="rec-stack">
                                                <Clip>{client.civil_status_male}</Clip>
                                                <Clip>{client.civil_status_female}</Clip>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="rec-stack">
                                                <Clip>{client.birthdate_male}</Clip>
                                                <Clip>{client.birthdate_female}</Clip>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="rec-stack">
                                                <Clip>{client.address}</Clip>
                                                {client.barangay && <Clip className="rec-muted">{`Brgy. ${client.barangay}`}</Clip>}
                                            </div>
                                        </td>
                                        <td className="rec-tight-right">
                                            <div className="rec-stack">
                                                <Clip title={client.educational_attainment_male}>
                                                    {EDUCATION_SHORT[client.educational_attainment_male] || client.educational_attainment_male}
                                                </Clip>
                                                <Clip title={client.educational_attainment_female}>
                                                    {EDUCATION_SHORT[client.educational_attainment_female] || client.educational_attainment_female}
                                                </Clip>
                                            </div>
                                        </td>
                                        <td className="rec-center">
                                            <span className="rec-count">{client.no_of_children || "0"}</span>
                                        </td>
                                        <td className="rec-gap-left">
                                            <div className="rec-stack">
                                                {client.fp_method
                                                    ? <span className="rec-badge" title={client.fp_method}>{client.fp_method}</span>
                                                    : <span>—</span>}
                                                {client.intention_to_shift && (
                                                    <Clip className="rec-muted" title={`Intention to shift: ${client.intention_to_shift}`}>
                                                        → {client.intention_to_shift}
                                                    </Clip>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="rec-stack">
                                                <Clip>{client.type}</Clip>
                                                {client.status && <Clip className="rec-muted">{client.status}</Clip>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="rec-stack">
                                                <Clip>{client.reason}</Clip>
                                                {client.classes_held && <Clip className="rec-muted">{client.classes_held}</Clip>}
                                            </div>
                                        </td>

                                        <td>
                                            {client.signature_url ? (
                                                <button
                                                    type="button"
                                                    className="rec-thumb-btn"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setPreviewImage({ url: client.signature_url, name: client.name });
                                                    }}
                                                    title="Click to zoom signature"
                                                >
                                                    <img
                                                        src={client.signature_url}
                                                        alt={`${client.name}'s Signature`}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="rec-thumb"
                                                    />
                                                </button>
                                            ) : client.signature_status === "pending" ? (
                                                <span className="rec-attach-status rec-attach-status--syncing" title="Signature is syncing">
                                                    <Loader2 size={14} className="animate-spin" /> Syncing
                                                </span>
                                            ) : client.signature_status === "failed" ? (
                                                <span className="rec-attach-status rec-attach-status--failed" title="Check the Cloud Functions logs for the sync error.">
                                                    <AlertCircle size={14} /> Failed
                                                </span>
                                            ) : (
                                                <span className="rec-attach-status" title="No signature">
                                                    <ImageIcon size={14} /> —
                                                </span>
                                            )}
                                        </td>

                                        <td>
                                            <RowActions
                                                client={client}
                                                isArchived={isArchived}
                                                onEdit={onEdit}
                                                onDelete={onDelete}
                                                onRestore={onRestore}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <RecordsPagination
                    page={page}
                    totalPages={totalPages}
                    total={safeClients.length}
                    pageSize={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            {/* Signature Zoom Modal */}
            {previewImage && (
                <div className="sig-modal-overlay" onClick={() => setPreviewImage(null)}>
                    <div className="sig-modal-content" onClick={(e) => e.stopPropagation()}>
                        <h4 className="sig-modal-title">Signature: {previewImage.name}</h4>
                        <div className="sig-modal-image-box">
                            <img
                                src={previewImage.url}
                                alt="Signature Preview"
                                className="sig-modal-image"
                            />
                        </div>
                        <button className="sig-modal-close-btn" onClick={() => setPreviewImage(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default ClientTable;
