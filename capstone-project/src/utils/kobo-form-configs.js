

const normalizeKoboValue = (value) => {
    if (!value) return "";

    return String(value)
        // remove Kobo prefixes 1___, 8___, a___, etc.
        .replace(/^[0-9a-zA-Z]+___/, "")
        // convert option_9 -> ""
        .replace(/^option_\d+$/, "")
        // replace underscores with spaces
        .replace(/_/g, " ")
        // capitalize words
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();
};

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
        { label: "Classes Held", key: "classes_held"},
        { label: "Address", key: "address" },
        { label: "Barangay", key: "barangay" },
        { label: "Educational Attainment (M)", key: "educational_attainment_male" },
        { label: "Educational Attainment (F)", key: "educational_attainment_female" },
        { label: "Children", key: "no_of_children" },
        { label: "FP Method", key: "fp_method" },
    ],

    mapFields: (survey) => {
        const client = {
            name: survey["Pangalan_ng_LALAKI_Asawa_Partner"]?.trim() || "",
            spouse_name: survey["Pangalan_ng_BABAE_Asawa_Partner"]?.trim() || "",

            birthdate_male: survey["Kailan_ipinanganak_a_laki_Birthday_Male"] || "",
            birthdate_female: survey["Kailan_ipinanganak_a_ae_Birthday_Female"] || "",

            classes_held: survey["Classes_Held"] || "",
            educational_attainment_male: normalizeKoboValue(
                survey["Ano_ang_pinakamataas_onal_Attainment_Male"]
            ),
            educational_attainment_female: normalizeKoboValue(
                survey["Ano_ang_pinakamataas_al_Attainment_Female"]
            ),

            civil_status_male: normalizeKoboValue(survey["Civil_Status_Male"]),
            civil_status_female: normalizeKoboValue(survey["Civil_Status_Female"]),

            address: survey["Address"]?.trim() || "",
            barangay: survey["Barangay"]?.trim() || "",

            no_of_children: survey["No_of_Children"] ? String(survey["No_of_Children"]) : "0",
            fp_method: survey["Method_Used"] || "",

            latitude: survey._geolocation ? parseFloat(survey._geolocation[0]) : 14.8436,
            longitude: survey._geolocation ? parseFloat(survey._geolocation[1]) : 120.8114,

        };

        client._errors = [];
        if (!client.name) client._errors.push("Missing husband name");
        if (!client.spouse_name) client._errors.push("Missing wife name");

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
        { label: "Barangay", key: "barangay" },
        { label: "FP Method", key: "fp_method" },
        { label: "Issued By", key: "fp_issued_by" },
    ],

    mapFields: (survey) => {
 
        const rawBirthdate = survey["Birthday_Kaarawan"];
        const birthdate = rawBirthdate ? String(rawBirthdate).trim() : "";

        const client = {
            name: survey["Name_Pangalan"]?.trim() || "",
            age: survey["Age_Edad"] ? String(survey["Age_Edad"]) : "",
            birthdate,
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