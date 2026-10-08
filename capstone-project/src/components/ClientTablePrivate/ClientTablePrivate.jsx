import { useState } from "react";
import "../ClientTable/client-table.css";
import { Clip, RecordsStats, RowActions, RecordsPagination } from "../ClientTable/TableParts";

const COLUMNS = [
    { label: "ID", width: 46 },
    { label: "Name", width: "22%" },
    { label: "Age", width: "7%" },
    { label: "Birthdate", width: "12%" },
    { label: "Address" },
    { label: "Method", width: "13%", title: "Method Used" },
    { label: "FP Issued By", width: "20%", title: "FP Issued By (Name of Clinic, Hospital, Lying-In)" },
    { label: "Actions" },
];

function ClientTablePrivate({ clients, loading, onView, onEdit, onDelete, isArchived, onRestore }) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const safeClients = clients || [];
    const totalPages = Math.ceil(safeClients.length / itemsPerPage);
    // a search or filter can leave fewer pages than the one being viewed
    const page = Math.min(currentPage, Math.max(totalPages, 1));

    const indexOfLastClient = page * itemsPerPage;
    const indexOfFirstClient = indexOfLastClient - itemsPerPage;
    const currentClients = safeClients.slice(indexOfFirstClient, indexOfLastClient);

    return (
        <div className="rec-card">
            {!isArchived && <RecordsStats clients={safeClients} />}

            {loading ? (
                <div className={`rec-empty${isArchived ? " rec-empty--compact" : ""}`}>Loading records...</div>
            ) : safeClients.length === 0 ? (
                <div className={`rec-empty${isArchived ? " rec-empty--compact" : ""}`}>
                    {isArchived ? "No archived records found." : "No records found."}
                </div>
            ) : (
                <div className="rec-table-scroll">
                    <table className="rec-table rec-table--private">
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
                                    <th key={column.label} title={column.title}>{column.label}</th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {currentClients.map((client, index) => (
                                <tr
                                    key={client.id}
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
                                    <td><Clip className="rec-name">{client.name}</Clip></td>
                                    <td>{client.age || "—"}</td>
                                    <td><Clip>{client.birthdate}</Clip></td>
                                    <td>
                                        <div className="rec-stack">
                                            <Clip>{client.address}</Clip>
                                            {client.barangay && <Clip className="rec-muted">{`Brgy. ${client.barangay}`}</Clip>}
                                        </div>
                                    </td>
                                    <td>
                                        {client.fp_method
                                            ? <span className="rec-badge" title={client.fp_method}>{client.fp_method}</span>
                                            : "—"}
                                    </td>
                                    <td><Clip>{client.fp_issued_by}</Clip></td>
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
    );
}

export default ClientTablePrivate;
