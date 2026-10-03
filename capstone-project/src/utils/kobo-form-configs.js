import { detectBarangay } from '../utils/detectBarangay';

const normalizeKoboValue = (value) => {
    if (!value) return "";

    return String(value)
        .replace(/^[0-9a-zA-Z]+___/, "")
        .replace(/^option_\d+$/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();
};



// FORM 1 
// FORM 1 
export const PUBLIC_FORM_CONFIG = {
    syncUrl: import.meta.env.VITE_KOBO_SYNC_PUBLIC_URL,
    collectionName: "clients_public",
    duplicateScope: "public",
    recordLabel: "Public",
    emptyMessage: "No remote submissions found inside KoboToolBox.",

    columns: [
        { label: "#", key: "_index" },
        { label: "Husband Name", key: "name" },
        { label: "Wife Name", key: "spouse_name" },
        { label: "Civil Status (M)", key: "civil_status_male" },
        { label: "Civil Status (F)", key: "civil_status_female" },
        { label: "Birthdate (M)", key: "birthdate_male" },
        { label: "Birthdate (F)", key: "birthdate_female" },
        { label: "Classes Held", key: "classes_held" },
        { label: "Address", key: "address" },
        { label: "Barangay", key: "barangay" },
        { label: "Educational Attainment (M)", key: "educational_attainment_male" },
        { label: "Educational Attainment (F)", key: "educational_attainment_female" },
        { label: "Children", key: "no_of_children" },
        { label: "FP Method", key: "fp_method" },
        { label: "Intention to Shift", key: "intention_to_shift" },
        { label: "Type", key: "type" },
        { label: "Status", key: "status" },
        { label: "Reason", key: "reason" },
        { label: "Signature", key: "signature_status" }, // ✍️ Signature preview/status column
    ],

    mapFields: (survey) => {
        let rawAddress = survey["Address"]?.trim() || "";
        const isCoordinateString = /^[0-9.\s-]+$/.test(rawAddress);

        // Get coordinates
        const lat = survey._geolocation ? parseFloat(survey._geolocation[0]) : null;
        const lng = survey._geolocation ? parseFloat(survey._geolocation[1]) : null;

        // Auto-detect barangay from pin location
        const detectedBarangay = detectBarangay(lat, lng);

        // ✍️ 1. Kunin ang signature filename
        const signatureFilename =
            survey["Signature_Pirma"]?.trim() ||
            survey["PARTICIPANT_S_SIGNATURE"]?.trim() ||
            survey["Participant_Signature"]?.trim() ||
            survey["signature"]?.trim() ||
            survey["Lagda"]?.trim() ||
            "";

        // ✍️ 2. Kunin ang signature download URL (unahin ang direct column, mag-fallback sa _attachments)
        let signatureDownloadUrl = survey["Signature_Pirma_URL"]?.trim() || "";

        if (!signatureDownloadUrl && signatureFilename && Array.isArray(survey._attachments)) {
            const match = survey._attachments.find(
                (att) =>
                    att.media_file_basename === signatureFilename ||
                    (att.filename && att.filename.endsWith(signatureFilename))
            );
            signatureDownloadUrl = match?.download_url || "";
        }

        const client = {
            kobo_id: survey._id,
            name: survey["Pangalan_ng_LALAKI_Asawa_Partner"]?.trim() || "",
            spouse_name: survey["Pangalan_ng_BABAE_Asawa_Partner"]?.trim() || "",
            birthdate_male: survey["Kailan_ipinanganak_a_laki_Birthday_Male"] || "",
            birthdate_female: survey["Kailan_ipinanganak_a_ae_Birthday_Female"] || "",
            classes_held: normalizeKoboValue(survey["Classes_Held"]) || "",
            educational_attainment_male: normalizeKoboValue(survey["Ano_ang_pinakamataas_onal_Attainment_Male"]),
            educational_attainment_female: normalizeKoboValue(survey["Ano_ang_pinakamataas_al_Attainment_Female"]),
            civil_status_male: normalizeKoboValue(survey["Civil_Status_Male"]),
            civil_status_female: normalizeKoboValue(survey["Civil_Status_Female"]),
            address: isCoordinateString ? "" : rawAddress,

            barangay: detectedBarangay,

            no_of_children: survey["No_of_Children"] ? String(survey["No_of_Children"]) : "0",
            fp_method: normalizeKoboValue(survey["Method_Used"]) || "",
            intention_to_shift: normalizeKoboValue(survey["Intention_to_Shift"]) || "",
            type: normalizeKoboValue(survey["Traditional_FP_User_Type"]) || "",
            status: normalizeKoboValue(survey["Traditional_FP_User_Status"]) || "",
            reason: normalizeKoboValue(survey["Reason"]) || "",
            latitude: lat ?? 14.8436,
            longitude: lng ?? 120.8114,

            // ✍️ Metadata para sa Firebase Storage signature sync
            _signatureFilename: signatureFilename,
            _signatureDownloadUrl: signatureDownloadUrl,
            signature_status: signatureDownloadUrl ? "pending" : "none",
            signature_url: null,
        };

        client._errors = [];
        if (!client.name) client._errors.push("Missing husband name");
        if (!client.spouse_name) client._errors.push("Missing wife name");

        // Add error if barangay could not be detected
        // This means the pin was placed outside Malolos boundaries
        if (!detectedBarangay) {
            client._errors.push("Pin location is outside Malolos boundaries — please re-pin");
        }

        return client;
    },
};

// FORM 2
export const PRIVATE_FORM_CONFIG = {
    syncUrl: import.meta.env.VITE_KOBO_SYNC_PRIVATE_URL,
    collectionName: "clients_private",
    duplicateScope: "private",
    recordLabel: "Private Institution",
    emptyMessage: "No new private-institution submissions found inside KoboToolBox.",

    columns: [
        { label: "#", key: "_index" },
        { label: "Name", key: "name" },
        { label: "Age", key: "age" },
        { label: "Birthdate", key: "birthdate" },
        { label: "Address", key: "address" },
        { label: "Barangay", key: "barangay" },
        { label: "FP Method", key: "fp_method" },
        { label: "Issued By", key: "fp_issued_by" },
    ],

    mapFields: (survey) => {
        const rawBirthdate = survey["Birthday_Kaarawan"];
        const birthdate = rawBirthdate ? String(rawBirthdate).trim() : "";

        const client = {
            kobo_id: survey._id, // Save unique submission ID
            name: survey["Name_Pangalan"]?.trim() || "",
            age: survey["Age_Edad"] ? String(survey["Age_Edad"]) : "",
            birthdate,
            address: survey["Address"]?.trim() || "",
            barangay: survey["Barangay"]?.trim() || "",
            fp_method: normalizeKoboValue(survey["Family_Planning_Method"]),
            fp_issued_by: survey["FP_issued_By_Name_Hospital_Lying_Inns"]?.trim() || "",
        };

        client._errors = [];
        if (!client.name) client._errors.push("Missing client name");
        if (!client.fp_method) client._errors.push("Missing FP method");

        return client;
    },
};