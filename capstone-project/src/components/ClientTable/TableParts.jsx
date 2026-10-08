import { SquarePen, Archive, ArchiveRestore } from "lucide-react";

// One line of text that is cut off with an ellipsis; hovering shows the full value
export function Clip({ children, className = "", title }) {
    const text = children === undefined || children === null || children === "" ? "—" : children;

    return (
        <span className={`rec-clip ${className}`.trim()} title={title || String(text)}>
            {text}
        </span>
    );
}

export function RecordsStats({ clients, showActive = false }) {
    const now = new Date();
    const newThisMonth = clients.filter((c) => {
        if (!c.created_at || typeof c.created_at.toDate !== "function") return false;
        const date = c.created_at.toDate();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    return (
        <div className="rec-stats">
            <div className="rec-stat">
                <span className="rec-stat-label">Total Records</span>
                <span className="rec-stat-value">{clients.length}</span>
            </div>
            <div className="rec-stat">
                <span className="rec-stat-label">New This Month</span>
                <span className="rec-stat-value">{newThisMonth}</span>
            </div>
            {showActive && (
                <div className="rec-stat">
                    <span className="rec-stat-label">Active Users</span>
                    <span className="rec-stat-value">
                        {clients.filter((c) => c.status === "Active" || c.status === "A").length}
                    </span>
                </div>
            )}
        </div>
    );
}

export function RowActions({ client, isArchived, onEdit, onDelete, onRestore }) {
    if (isArchived) {
        return (
            <button
                className="rec-restore-btn"
                onClick={(event) => { event.stopPropagation(); onRestore(client); }}
                title="Restore record"
            >
                <ArchiveRestore size={14} /> Restore
            </button>
        );
    }

    return (
        <div className="rec-actions">
            <button className="rec-action-btn rec-action-btn--edit" onClick={(event) => { event.stopPropagation(); onEdit(client); }} title="Edit">
                <SquarePen size={15} strokeWidth={1.75} />
            </button>
            <button className="rec-action-btn rec-action-btn--delete" onClick={(event) => { event.stopPropagation(); onDelete(client); }} title="Archive">
                <Archive size={15} strokeWidth={1.75} />
            </button>
        </div>
    );
}

export function RecordsPagination({ page, totalPages, total, pageSize, onPageChange }) {
    if (totalPages <= 1) return null;

    const first = (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, total);

    return (
        <div className="rec-pagination">
            <span className="rec-page-info">Showing {first}–{last} of {total}</span>
            <div className="rec-page-controls">
                <button className="rec-page-btn" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
                    Previous
                </button>
                <span className="rec-page-info">Page {page} of {totalPages}</span>
                <button className="rec-page-btn" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
                    Next
                </button>
            </div>
        </div>
    );
}
