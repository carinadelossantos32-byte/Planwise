/*
    Shared rules for reading client records in the Reports page, so every
    report (and the page's own filters) counts a record the same way.
*/

export function toDate(value) {
    if (!value) return null;

    // Firestore Timestamp
    if (value?.toDate) {
        const d = value.toDate();
        return Number.isNaN(d.getTime()) ? null : d;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "string" || typeof value === "number") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    return null;
}

/*
    The date a record is reported under.
    A date typed on the record itself (the referral date on referred clients)
    comes first; the time the record was encoded is only the fallback.
*/
export function getClientDate(client) {
    const candidates = [
        client.date,
        client.month_of_service,
        client.service_month,
        client.report_month,
        client.created_at,
        client.updated_at,
    ];

    for (const value of candidates) {
        const d = toDate(value);
        if (d) return d;
    }

    return null;
}

// Archived records are never counted in a report
export function isArchived(client) {
    return (
        client?.is_archived === true ||
        client?.is_archived === "true" ||
        client?.archived === true
    );
}

// Every way a modern FP method is written in the records -> one name
const methodAliases = [
    { name: "Condom", aliases: ["condom"] },
    { name: "IUD", aliases: ["iud"] },
    { name: "Pills", aliases: ["pill", "ocp"] },
    { name: "Injectable", aliases: ["injectable", "dmpa"] },
    { name: "Vasectomy", aliases: ["nsv", "vasectomy"] },
    { name: "Tubal Ligation", aliases: ["btl", "tubal ligation"] },
    { name: "Implant", aliases: ["implant", "subdermal"] },
    { name: "CMM", aliases: ["cmm", "ccm", "billings", "cervical mucus"] },
    { name: "BBT", aliases: ["bbt", "basal body"] },
    { name: "STM", aliases: ["stm", "sympto"] },
    { name: "SDM", aliases: ["sdm", "standard days"] },
    { name: "LAM", aliases: ["lam", "lactational"] },
];

/*
    "Cmm Billings", "CMM/Billings", "Sympto Thermal", "symptothermal",
    "Tubal Ligation", "Iud" ... -> "CMM", "STM", "Tubal Ligation", "IUD".
    Returns "" when the text is not a modern FP method.
*/
export function canonicalMethod(value) {
    if (typeof value !== "string") return "";

    const text = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!text) return "";

    const tokens = text.split(" ");

    for (const method of methodAliases) {
        const matched = method.aliases.some(alias =>
            // short aliases (IUD, LAM, CMM...) must be a whole word
            alias.length <= 3 ? tokens.includes(alias) : text.includes(alias)
        );
        if (matched) return method.name;
    }

    return "";
}

/*
    Label shown for a method. The reports keep "CCM" as the internal key
    (it is the column name in the Excel templates and in saved imports),
    but the Cervical Mucus Method is displayed as "CMM".
*/
export function methodLabel(name) {
    return name === "CCM" ? "CMM" : name;
}
