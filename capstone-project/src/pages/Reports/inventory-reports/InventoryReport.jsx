import { useState, useEffect, useMemo } from "react";
import {
    collection,
    onSnapshot,
    doc,
    getDoc
} from "firebase/firestore";

import * as XLSX from "xlsx";

import { db } from "../../../firebase-config";
import "./InventoryReport.css";

function InventoryReport() {

    /* =========================================================
       ORIGINAL INVENTORY REPORT
       ========================================================= */

    const [lowStockLimit, setLowStockLimit] = useState(8);

    const [rhus, setRhus] = useState([]);
    const [loading, setLoading] = useState(true);

    /* =========================================================
       LOAD LOW STOCK LIMIT
       ========================================================= */

    useEffect(() => {

        const loadLimit = async () => {

            try {

                const snap = await getDoc(
                    doc(db, "lowStock", "lowStockLimit")
                );

                if (snap.exists()) {

                    const data = snap.data();

                    if (data.isEnabled) {

                        setLowStockLimit(
                            Number(data.lowStockLimit) || 8
                        );

                    }

                }

            } catch (error) {

                console.error(
                    "Error loading low stock limit:",
                    error
                );

            }

        };

        loadLimit();

    }, []);

    /* =========================================================
       LOAD RHU INVENTORY
       ========================================================= */

    useEffect(() => {

        const unsubscribe = onSnapshot(
            collection(db, "rhu"),

            (snapshot) => {

                const data = snapshot.docs.map(
                    (rhuDoc) => ({
                        id: rhuDoc.id,
                        ...rhuDoc.data()
                    })
                );

                setRhus(data);
                setLoading(false);

            },

            (error) => {

                console.error(
                    "Error loading RHUs:",
                    error
                );

                setLoading(false);

            }
        );

        return () => unsubscribe();

    }, []);

    /* =========================================================
       CHC → BARANGAY MAPPING
       ========================================================= */

    const CHC_BARANGAYS = {

        "CHC 1": [
            "Atlag",
            "Bagna",
            "Sto. Cristo",
            "Balayong",
            "San Juan",
            "Sto. Rosario",
            "Calero"
        ],

        "CHC 2": [
            "Caniogan",
            "Catmon",
            "Liang",
            "San Agustin",
            "San Gabriel",
            "San Vicente",
            "Sto. Nino",
            "Santiago",
            "Canalate"
        ],

        "CHC 3": [
            "Bagong Bayan",
            "Balite",
            "Confradia",
            "Mabolo",
            "Dakila",
            "S. Bata",
            "Ligas",
            "Bungahan"
        ],

        "CHC 4": [
            "Babatnin",
            "Caliligawan",
            "Mambog",
            "Masile",
            "Matimbo",
            "Namayan",
            "Pamarawan",
            "Panasahan"
        ],

        "CHC 5": [
            "Lugam",
            "Look 1st"
        ],

        "CHC 6": [
            "Bangkal",
            "Look 2nd",
            "Niugan",
            "Santor",
            "Taal"
        ],

        "CHC 7": [
            "Mojon",
            "S. Matanda",
            "Guinhawa"
        ],

        "CHC 8": [
            "Tikay",
            "San Pablo"
        ],

        "CHC 9": [
            "Barihan",
            "Santisima Trinidad",
            "Pinagbakahan"
        ],

        "CHC 10": [
            "Caingin",
            "Anilao",
            "Bulihan",
            "Longos"
        ]

    };

    const CHCS = Object.keys(CHC_BARANGAYS);

    /* =========================================================
       NORMALIZE
       ========================================================= */

    const normalize = (value) => {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

    };

    /* =========================================================
       DATE PARSER
       ========================================================= */

    const getDate = (value) => {

        if (!value) {
            return null;
        }

        if (
            typeof value.toDate === "function"
        ) {

            return value.toDate();

        }

        if (
            typeof value === "object" &&
            typeof value.seconds === "number"
        ) {

            return new Date(
                value.seconds * 1000
            );

        }

        if (value instanceof Date) {
            return value;
        }

        const date = new Date(value);

        if (
            Number.isNaN(date.getTime())
        ) {

            return null;

        }

        return date;

    };

    /* =========================================================
       FORMAT DATE FOR EXCEL
       ========================================================= */

    const formatDate = (value) => {

        const date = getDate(value);

        if (!date) {
            return "";
        }

        return date.toLocaleDateString(
            "en-US",
            {
                month: "numeric",
                day: "numeric",
                year: "numeric"
            }
        );

    };

    /* =========================================================
       GET BARANGAY
       ========================================================= */

    const getClientBarangay = (client) => {

        return (

            client.barangay ??
            client.barangayName ??
            client.address_barangay ??
            client.addressBarangay ??
            client.residenceBarangay ??
            client.currentBarangay ??
            client.address?.barangay ??
            ""

        );

    };

    /* =========================================================
       GET CHC FROM BARANGAY
       ========================================================= */

    const getClientCHC = (client) => {

        const clientBarangay =
            normalize(
                client.individualBarangay ??
                getClientBarangay(client)
            );

        if (!clientBarangay) {
            return "";
        }

        for (const chc of CHCS) {

            const barangays =
                CHC_BARANGAYS[chc];

            const belongsToCHC =
                barangays.some(
                    (barangay) =>
                        normalize(barangay) ===
                        clientBarangay
                );

            if (belongsToCHC) {
                return chc;
            }

        }

        return "";

    };

    /* =========================================================
       GET CREATED DATE
       ========================================================= */

    const getCreatedDate = (client) => {

        return getDate(

            client.created_at ??
            client.createdAt ??
            client.created_at_date ??
            client.dateCreated ??
            client.registrationDate ??
            client.dateRegistered ??
            client.updatedAt

        );

    };

    /* =========================================================
       FAMILY PLANNING METHODS
       ========================================================= */

    const methods = [

        "IUD",
        "Pills",
        "Injectable",
        "Condom",
        "BTL",
        "NSV",
        "Implant",
        "LAM",
        "SDM",
        "STM",
        "BBT",
        "Other"

    ];

    /* =========================================================
       NORMALIZE FAMILY PLANNING METHOD
       ========================================================= */

    const normalizeMethod = (value) => {

        const method =
            normalize(value);

        if (!method) {
            return null;
        }

        if (method.includes("iud")) {
            return "IUD";
        }

        if (method.includes("pill")) {
            return "Pills";
        }

        if (method.includes("inject")) {
            return "Injectable";
        }

        if (method.includes("condom")) {
            return "Condom";
        }

        if (
            method.includes("btl") ||
            method.includes("bilateral") ||
            method.includes("tubal")
        ) {
            return "BTL";
        }

        if (
            method.includes("nsv") ||
            method.includes("vasectomy")
        ) {
            return "NSV";
        }

        if (method.includes("implant")) {
            return "Implant";
        }

        if (method.includes("lam")) {
            return "LAM";
        }

        if (method.includes("sdm")) {
            return "SDM";
        }

        if (
            method.includes("stm") ||
            method.includes("symptothermal")
        ) {
            return "STM";
        }

        if (
            method.includes("bbt") ||
            method.includes("basal body temperature")
        ) {
            return "BBT";
        }

        return "Other";

    };

    /* =========================================================
       GET SINGLE METHOD
       ========================================================= */

    const getClientMethod = (client) => {

        return (

            client.fp_method ??
            client.FP_method ??
            client.method ??
            client.familyPlanningMethod ??
            client.fpMethod ??
            client.contraceptiveMethod ??
            client.currentMethod ??
            client.selectedMethod ??
            client.methodUsed ??
            ""

        );

    };

    /* =========================================================
       GET AGE
       ========================================================= */

    const getAge = (
        birthdate,
        referenceDate = new Date()
    ) => {

        const birth =
            getDate(birthdate);

        if (!birth) {
            return null;
        }

        const reference =
            getDate(referenceDate);

        if (!reference) {
            return null;
        }

        let age =
            reference.getFullYear() -
            birth.getFullYear();

        const monthDifference =
            reference.getMonth() -
            birth.getMonth();

        if (
            monthDifference < 0 ||
            (
                monthDifference === 0 &&
                reference.getDate() <
                birth.getDate()
            )
        ) {

            age--;

        }

        return age;

    };

    /* =========================================================
       AGE BRACKETS
       ========================================================= */

    const ageBrackets = [

        {
            key: "15-19",
            label: "15-19 years"
        },

        {
            key: "20-24",
            label: "20-24 years"
        },

        {
            key: "25-29",
            label: "25-29 years"
        },

        {
            key: "30-34",
            label: "30-34 years"
        },

        {
            key: "35-39",
            label: "35-39 years"
        },

        {
            key: "40-49",
            label: "40-49 years"
        }

    ];

    /* =========================================================
       GET AGE BRACKET
       ========================================================= */

    const getAgeBracket = (age) => {

        if (
            age === null ||
            age === undefined
        ) {
            return null;
        }

        if (age >= 15 && age <= 19) {
            return "15-19";
        }

        if (age >= 20 && age <= 24) {
            return "20-24";
        }

        if (age >= 25 && age <= 29) {
            return "25-29";
        }

        if (age >= 30 && age <= 34) {
            return "30-34";
        }

        if (age >= 35 && age <= 39) {
            return "35-39";
        }

        if (age >= 40 && age <= 49) {
            return "40-49";
        }

        return null;

    };

    /* =========================================================
       GET INDIVIDUALS FROM CLIENT
       ========================================================= */

    const getIndividualsFromClient = (client) => {

        const individuals = [];

        /* FEMALE */

        const femaleBirthdate =
            client.birthdate_female ??
            client.birthDateFemale ??
            client.birth_date_female ??
            client.female_birthdate ??
            client.femaleBirthdate ??
            client.female_birth_date ??
            null;

        const femaleMethod =
            client.fp_method_female ??
            client.FP_method_female ??
            client.familyPlanningMethodFemale ??
            client.family_planning_method_female ??
            client.femaleMethod ??
            client.female_method ??
            null;

        /* MALE */

        const maleBirthdate =
            client.birthdate_male ??
            client.birthDateMale ??
            client.birth_date_male ??
            client.male_birthdate ??
            client.maleBirthdate ??
            client.male_birth_date ??
            null;

        const maleMethod =
            client.fp_method_male ??
            client.FP_method_male ??
            client.familyPlanningMethodMale ??
            client.family_planning_method_male ??
            client.maleMethod ??
            client.male_method ??
            null;

        const hasFemale =
            !!getDate(femaleBirthdate);

        const hasMale =
            !!getDate(maleBirthdate);

        /* FEMALE INDIVIDUAL */

        if (hasFemale) {

            individuals.push({

                ...client,

                individualGender:
                    "Female",

                individualBirthdate:
                    femaleBirthdate,

                individualMethod:
                    femaleMethod ??
                    getClientMethod(client),

                individualBarangay:
                    getClientBarangay(client)

            });

        }

        /* MALE INDIVIDUAL */

        if (hasMale) {

            individuals.push({

                ...client,

                individualGender:
                    "Male",

                individualBirthdate:
                    maleBirthdate,

                individualMethod:
                    maleMethod ??
                    getClientMethod(client),

                individualBarangay:
                    getClientBarangay(client)

            });

        }

        /* SINGLE INDIVIDUAL */

        if (
            !hasFemale &&
            !hasMale
        ) {

            const singleBirthdate =

                client.birthdate ??
                client.birthDate ??
                client.birth_date ??
                client.date_of_birth ??
                client.dateOfBirth ??
                client.dob ??
                null;

            if (getDate(singleBirthdate)) {

                individuals.push({

                    ...client,

                    individualGender:
                        client.gender ??
                        client.sex ??
                        "",

                    individualBirthdate:
                        singleBirthdate,

                    individualMethod:
                        getClientMethod(client),

                    individualBarangay:
                        getClientBarangay(client)

                });

            }

        }

        return individuals;

    };

    /* =========================================================
       FETCH ALL FIRESTORE CLIENT RECORDS
       ========================================================= */

    const [clients, setClients] =
        useState([]);

    const [clientsLoading, setClientsLoading] =
        useState(true);

    useEffect(() => {

        let publicDocs = [];
        let privateDocs = [];
        let referredDocs = [];

        let publicLoaded = false;
        let privateLoaded = false;
        let referredLoaded = false;

        const processClients = () => {

            const combined = [

                ...publicDocs,
                ...privateDocs,
                ...referredDocs

            ];

            const activeClients =
                combined.filter(
                    (client) =>
                        client.is_archived !== true &&
                        client.is_archived !== "true"
                );

            console.log(
                "Inventory Report - ALL Firestore records:",
                activeClients.length
            );

            setClients(activeClients);

            if (
                publicLoaded &&
                privateLoaded &&
                referredLoaded
            ) {

                setClientsLoading(false);

            }

        };

        const unsubPublic =
            onSnapshot(

                collection(
                    db,
                    "clients_public"
                ),

                (snapshot) => {

                    publicDocs =
                        snapshot.docs.map(
                            (clientDoc) => ({

                                id:
                                    clientDoc.id,

                                sourceCollection:
                                    "clients_public",

                                ...clientDoc.data()

                            })
                        );

                    console.log(
                        "clients_public records:",
                        publicDocs.length
                    );

                    publicLoaded = true;

                    processClients();

                },

                (error) => {

                    console.error(
                        "clients_public error:",
                        error
                    );

                    publicLoaded = true;

                    processClients();

                }

            );

        const unsubPrivate =
            onSnapshot(

                collection(
                    db,
                    "clients_private"
                ),

                (snapshot) => {

                    privateDocs =
                        snapshot.docs.map(
                            (clientDoc) => ({

                                id:
                                    clientDoc.id,

                                sourceCollection:
                                    "clients_private",

                                ...clientDoc.data()

                            })
                        );

                    console.log(
                        "clients_private records:",
                        privateDocs.length
                    );

                    privateLoaded = true;

                    processClients();

                },

                (error) => {

                    console.error(
                        "clients_private error:",
                        error
                    );

                    privateLoaded = true;

                    processClients();

                }

            );

        const unsubReferred =
            onSnapshot(

                collection(
                    db,
                    "clients_referred"
                ),

                (snapshot) => {

                    referredDocs =
                        snapshot.docs.map(
                            (clientDoc) => ({

                                id:
                                    clientDoc.id,

                                sourceCollection:
                                    "clients_referred",

                                ...clientDoc.data()

                            })
                        );

                    console.log(
                        "clients_referred records:",
                        referredDocs.length
                    );

                    referredLoaded = true;

                    processClients();

                },

                (error) => {

                    console.error(
                        "clients_referred error:",
                        error
                    );

                    referredLoaded = true;

                    processClients();

                }

            );

        return () => {

            unsubPublic();
            unsubPrivate();
            unsubReferred();

        };

    }, []);

    /* =========================================================
       FILTERS
       ========================================================= */

    const [selectedCHC, setSelectedCHC] =
        useState("all");

    const [selectedMonth, setSelectedMonth] =
        useState("all");

    const [selectedYear, setSelectedYear] =
        useState("all");

    const [selectedCategory, setSelectedCategory] =
        useState("all");

    const months = [

        {
            value: "all",
            label: "All Months"
        },

        {
            value: "1",
            label: "January"
        },

        {
            value: "2",
            label: "February"
        },

        {
            value: "3",
            label: "March"
        },

        {
            value: "4",
            label: "April"
        },

        {
            value: "5",
            label: "May"
        },

        {
            value: "6",
            label: "June"
        },

        {
            value: "7",
            label: "July"
        },

        {
            value: "8",
            label: "August"
        },

        {
            value: "9",
            label: "September"
        },

        {
            value: "10",
            label: "October"
        },

        {
            value: "11",
            label: "November"
        },

        {
            value: "12",
            label: "December"
        }

    ];

    const userCategories = [

        {
            value: "all",
            label: "All User Categories"
        },

        {
            value: "prev-current",
            label: "Current Users (Previous Month)"
        },

        {
            value: "prev-new",
            label: "New Acceptors (Previous Month)"
        },

        {
            value: "other",
            label: "Other Acceptors"
        },

        {
            value: "dropout",
            label: "Drop Outs"
        },

        {
            value: "current-current",
            label: "Current Users (Current Month)"
        },

        {
            value: "current-new",
            label: "New Acceptors (Current Month)"
        }

    ];

    const years = Array.from(
        {
            length: 12
        },
        (_, index) => 2024 + index
    );

    /* =========================================================
       USER CATEGORY
       ========================================================= */

    const getUserCategory = (
        client,
        referenceDate = new Date()
    ) => {

        const status =
            normalize(client.status);

        const type =
            normalize(client.type);

        const createdDate =
            getCreatedDate(client);

        if (
            status.includes("drop") ||
            status.includes("discontinue")
        ) {

            return "dropout";

        }

        if (
            type.includes("other")
        ) {

            return "other";

        }

        if (!createdDate) {
            return "current-current";
        }

        const currentMonth =
            referenceDate.getMonth();

        const currentYear =
            referenceDate.getFullYear();

        const isCurrentMonth =
            createdDate.getMonth() ===
            currentMonth &&
            createdDate.getFullYear() ===
            currentYear;

        const previousMonth =
            currentMonth === 0
                ? 11
                : currentMonth - 1;

        const previousYear =
            currentMonth === 0
                ? currentYear - 1
                : currentYear;

        const isPreviousMonth =
            createdDate.getMonth() ===
            previousMonth &&
            createdDate.getFullYear() ===
            previousYear;

        if (isCurrentMonth) {

            if (
                type.includes("new")
            ) {

                return "current-new";

            }

            return "current-current";

        }

        if (isPreviousMonth) {

            if (
                type.includes("new")
            ) {

                return "prev-new";

            }

            return "prev-current";

        }

        return "current-current";

    };

    /* =========================================================
       FILTER CLIENT RECORDS
       ========================================================= */

    const filteredClients =
        useMemo(() => {

            return clients.filter(
                (client) => {

                    if (
                        selectedCHC !== "all"
                    ) {

                        const clientCHC =
                            getClientCHC(client);

                        if (
                            clientCHC !==
                            selectedCHC
                        ) {

                            return false;

                        }

                    }

                    if (
                        selectedYear !== "all"
                    ) {

                        const createdDate =
                            getCreatedDate(client);

                        if (!createdDate) {
                            return false;
                        }

                        if (
                            createdDate.getFullYear() !==
                            Number(selectedYear)
                        ) {

                            return false;

                        }

                    }

                    if (
                        selectedMonth !== "all"
                    ) {

                        const createdDate =
                            getCreatedDate(client);

                        if (!createdDate) {
                            return false;
                        }

                        if (
                            createdDate.getMonth() + 1 !==
                            Number(selectedMonth)
                        ) {

                            return false;

                        }

                    }

                    if (
                        selectedCategory !==
                        "all"
                    ) {

                        const category =
                            getUserCategory(
                                client,
                                new Date()
                            );

                        if (
                            category !==
                            selectedCategory
                        ) {

                            return false;

                        }

                    }

                    return true;

                }
            );

        }, [
            clients,
            selectedCHC,
            selectedMonth,
            selectedYear,
            selectedCategory
        ]);

    /* =========================================================
       CONVERT RECORDS TO INDIVIDUALS
       ========================================================= */

    const filteredIndividuals =
        useMemo(() => {

            const individuals = [];

            filteredClients.forEach(
                (client) => {

                    const clientIndividuals =
                        getIndividualsFromClient(
                            client
                        );

                    clientIndividuals.forEach(
                        (individual) => {

                            individuals.push(
                                individual
                            );

                        }
                    );

                }
            );

            console.log(
                "Filtered Firestore records:",
                filteredClients.length
            );

            console.log(
                "Total individual users:",
                individuals.length
            );

            return individuals;

        }, [
            filteredClients
        ]);

    /* =========================================================
       AGE × METHOD ANALYTICS
       ========================================================= */

    const ageMethodAnalytics =
        useMemo(() => {

            const result = {};

            ageBrackets.forEach(
                (bracket) => {

                    result[
                        bracket.key
                    ] = {};

                    methods.forEach(
                        (method) => {

                            result[
                                bracket.key
                            ][method] = 0;

                        }
                    );

                }
            );

            filteredIndividuals.forEach(
                (individual) => {

                    const age =
                        getAge(
                            individual.individualBirthdate
                        );

                    const bracket =
                        getAgeBracket(age);

                    if (!bracket) {
                        return;
                    }

                    const method =
                        normalizeMethod(
                            individual.individualMethod
                        );

                    if (!method) {
                        return;
                    }

                    result[
                        bracket
                    ][method]++;

                }
            );

            return result;

        }, [
            filteredIndividuals
        ]);

    /* =========================================================
       AGE BRACKET TOTALS
       ========================================================= */

    const ageBracketTotals =
        useMemo(() => {

            const totals = {};

            ageBrackets.forEach(
                (bracket) => {

                    totals[
                        bracket.key
                    ] =
                        methods.reduce(
                            (
                                sum,
                                method
                            ) =>
                                sum +
                                ageMethodAnalytics[
                                bracket.key
                                ][method],
                            0
                        );

                }
            );

            return totals;

        }, [
            ageMethodAnalytics
        ]);

    /* =========================================================
       METHOD TOTALS
       ========================================================= */

    const methodTotals =
        useMemo(() => {

            const totals = {};

            methods.forEach(
                (method) => {

                    totals[method] =
                        ageBrackets.reduce(
                            (
                                sum,
                                bracket
                            ) =>
                                sum +
                                ageMethodAnalytics[
                                bracket.key
                                ][method],
                            0
                        );

                }
            );

            return totals;

        }, [
            ageMethodAnalytics
        ]);

    /* =========================================================
       TOTAL INDIVIDUALS
       ========================================================= */

    const totalIndividuals =
        useMemo(() => {

            return Object.values(
                methodTotals
            ).reduce(
                (
                    total,
                    value
                ) =>
                    total + value,
                0
            );

        }, [
            methodTotals
        ]);

    /* =========================================================
       ORIGINAL INVENTORY ANALYTICS
       ========================================================= */

    const analytics =
        useMemo(() => {

            const totalRHUs =
                rhus.length;

            const totalStock =
                rhus.reduce(
                    (
                        sum,
                        rhu
                    ) =>
                        sum +
                        (
                            Number(
                                rhu.stock
                            ) || 0
                        ),
                    0
                );

            const totalCapacity =
                rhus.reduce(
                    (
                        sum,
                        rhu
                    ) =>
                        sum +
                        (
                            Number(
                                rhu.maxStock
                            ) || 0
                        ),
                    0
                );

            const totalPopulation =
                rhus.reduce(
                    (
                        sum,
                        rhu
                    ) =>
                        sum +
                        (
                            Number(
                                rhu.total_population
                            ) || 0
                        ),
                    0
                );

            const lowStock =
                rhus.filter(
                    (rhu) =>
                        (
                            Number(
                                rhu.stock
                            ) || 0
                        ) <= lowStockLimit
                );

            return {

                totalRHUs,
                totalStock,
                totalCapacity,
                totalPopulation,
                lowStock

            };

        }, [
            rhus,
            lowStockLimit
        ]);

    /* =========================================================
       EXCEL EXPORT
       ========================================================= */

    const exportToExcel = () => {

        try {

            /*
             * =================================================
             * SHEET 1:
             * FP AGE & METHOD
             * =================================================
             */

            const fpSheetData = [

                [
                    "Family Planning Users by CHC"
                ],

                [],

                [
                    "CHC",
                    selectedCHC === "all"
                        ? "All CHCs"
                        : selectedCHC
                ],

                [
                    "Month",
                    months.find(
                        (month) =>
                            String(month.value) ===
                            String(selectedMonth)
                    )?.label || "All Months"
                ],

                [
                    "Year",
                    selectedYear === "all"
                        ? "All Years"
                        : selectedYear
                ],

                [
                    "User Category",
                    userCategories.find(
                        (category) =>
                            category.value ===
                            selectedCategory
                    )?.label ||
                    "All User Categories"
                ],

                [],

                [
                    "Age Bracket",
                    ...methods,
                    "Total"
                ]

            ];

            ageBrackets.forEach(
                (bracket) => {

                    fpSheetData.push([

                        bracket.label,

                        ...methods.map(
                            (method) =>
                                ageMethodAnalytics[
                                bracket.key
                                ][method]
                        ),

                        ageBracketTotals[
                        bracket.key
                        ]

                    ]);

                }
            );

            fpSheetData.push([

                "Total",

                ...methods.map(
                    (method) =>
                        methodTotals[method]
                ),

                totalIndividuals

            ]);

            const fpWorksheet =
                XLSX.utils.aoa_to_sheet(
                    fpSheetData
                );

            /* =================================================
               COLUMN WIDTHS
               ================================================= */

            fpWorksheet["!cols"] = [

                {
                    wch: 20
                },

                ...methods.map(
                    () => ({
                        wch: 14
                    })
                ),

                {
                    wch: 12
                }

            ];

            /* =================================================
               INDIVIDUAL RECORDS
               ================================================= */

            const individualRows = [

                [
                    "#",
                    "Record ID",
                    "Gender",
                    "Birthdate",
                    "Age",
                    "Age Bracket",
                    "FP Method",
                    "Barangay",
                    "CHC",
                    "Source Collection",
                    "Created Date"
                ]

            ];

            filteredIndividuals.forEach(
                (
                    individual,
                    index
                ) => {

                    const age =
                        getAge(
                            individual.individualBirthdate
                        );

                    const bracketKey =
                        getAgeBracket(age);

                    const bracket =
                        ageBrackets.find(
                            (item) =>
                                item.key ===
                                bracketKey
                        );

                    const method =
                        normalizeMethod(
                            individual.individualMethod
                        );

                    const barangay =
                        individual.individualBarangay ??
                        getClientBarangay(
                            individual
                        );

                    const chc =
                        getClientCHC({
                            ...individual,
                            barangay
                        });

                    individualRows.push([

                        index + 1,

                        individual.id ||
                        "",

                        individual.individualGender ||
                        "",

                        formatDate(
                            individual.individualBirthdate
                        ),

                        age ?? "",

                        bracket?.label ||
                        "",

                        method ||
                        "",

                        barangay ||
                        "",

                        chc ||
                        "",

                        individual.sourceCollection ||
                        "",

                        formatDate(
                            getCreatedDate(
                                individual
                            )
                        )

                    ]);

                }
            );

            const individualWorksheet =
                XLSX.utils.aoa_to_sheet(
                    individualRows
                );

            individualWorksheet["!cols"] = [

                {
                    wch: 6
                },

                {
                    wch: 28
                },

                {
                    wch: 12
                },

                {
                    wch: 14
                },

                {
                    wch: 8
                },

                {
                    wch: 18
                },

                {
                    wch: 15
                },

                {
                    wch: 20
                },

                {
                    wch: 12
                },

                {
                    wch: 22
                },

                {
                    wch: 15
                }

            ];

            /* =================================================
               SUMMARY SHEET
               ================================================= */

            const summaryRows = [

                [
                    "Metric",
                    "Value"
                ],

                [
                    "Total Firestore Records",
                    filteredClients.length
                ],

                [
                    "Total Individuals Tracked",
                    totalIndividuals
                ],

                [
                    "Selected CHC",
                    selectedCHC === "all"
                        ? "All CHCs"
                        : selectedCHC
                ],

                [
                    "Selected Month",
                    months.find(
                        (month) =>
                            String(month.value) ===
                            String(selectedMonth)
                    )?.label ||
                    "All Months"
                ],

                [
                    "Selected Year",
                    selectedYear === "all"
                        ? "All Years"
                        : selectedYear
                ],

                [
                    "User Category",
                    userCategories.find(
                        (category) =>
                            category.value ===
                            selectedCategory
                    )?.label ||
                    "All User Categories"
                ],

                [],

                [
                    "METHOD TOTALS",
                    ""
                ]

            ];

            methods.forEach(
                (method) => {

                    summaryRows.push([

                        method,

                        methodTotals[method]

                    ]);

                }
            );

            summaryRows.push([]);

            summaryRows.push([

                "AGE BRACKET TOTALS",
                ""

            ]);

            ageBrackets.forEach(
                (bracket) => {

                    summaryRows.push([

                        bracket.label,

                        ageBracketTotals[
                        bracket.key
                        ]

                    ]);

                }
            );

            summaryRows.push([]);

            summaryRows.push([

                "Most Used Method",

                (() => {

                    const sorted =
                        Object.entries(
                            methodTotals
                        ).sort(
                            (
                                [, a],
                                [, b]
                            ) =>
                                b - a
                        );

                    return (
                        sorted[0] &&
                        sorted[0][1] > 0
                    )
                        ? sorted[0][0]
                        : "—";

                })()

            ]);

            summaryRows.push([

                "Largest Age Group",

                (() => {

                    const sorted =
                        Object.entries(
                            ageBracketTotals
                        ).sort(
                            (
                                [, a],
                                [, b]
                            ) =>
                                b - a
                        );

                    if (
                        !sorted[0] ||
                        sorted[0][1] === 0
                    ) {
                        return "—";
                    }

                    return (
                        ageBrackets.find(
                            (bracket) =>
                                bracket.key ===
                                sorted[0][0]
                        )?.label ||
                        sorted[0][0]
                    );

                })()

            ]);

            const summaryWorksheet =
                XLSX.utils.aoa_to_sheet(
                    summaryRows
                );

            summaryWorksheet["!cols"] = [

                {
                    wch: 32
                },

                {
                    wch: 30
                }

            ];

            /* =================================================
               RHU INVENTORY SHEET
               ================================================= */

            const rhuRows = [

                [
                    "RHU",
                    "Current Stock",
                    "Maximum Capacity",
                    "Population",
                    "Barangays",
                    "Stock Needed",
                    "Status"
                ]

            ];

            [
                ...rhus
            ]
                .sort(
                    (a, b) => {

                        const getNumber =
                            (name) => {

                                const match =
                                    (
                                        name ||
                                        ""
                                    )
                                        .match(
                                            /\d+/
                                        );

                                return match
                                    ? parseInt(
                                        match[0],
                                        10
                                    )
                                    : Number.MAX_SAFE_INTEGER;

                            };

                        return (
                            getNumber(a.name) -
                            getNumber(b.name)
                        );

                    }
                )
                .forEach(
                    (rhu) => {

                        const stock =
                            Number(
                                rhu.stock
                            ) || 0;

                        const maxStock =
                            Number(
                                rhu.maxStock
                            ) || 0;

                        const population =
                            Number(
                                rhu.total_population
                            ) || 0;

                        const barangays =
                            rhu.barangays?.length ||
                            0;

                        const stockNeeded =
                            Math.max(
                                0,
                                maxStock -
                                stock
                            );

                        let status;

                        if (
                            stock <=
                            lowStockLimit
                        ) {

                            status =
                                "Critical";

                        } else if (
                            stock <= 200
                        ) {

                            status =
                                "Low";

                        } else {

                            status =
                                "Good";

                        }

                        rhuRows.push([

                            rhu.name ||
                            "",

                            stock,

                            maxStock,

                            population,

                            barangays,

                            stockNeeded,

                            status

                        ]);

                    }
                );

            const rhuWorksheet =
                XLSX.utils.aoa_to_sheet(
                    rhuRows
                );

            rhuWorksheet["!cols"] = [

                {
                    wch: 15
                },

                {
                    wch: 18
                },

                {
                    wch: 20
                },

                {
                    wch: 18
                },

                {
                    wch: 12
                },

                {
                    wch: 16
                },

                {
                    wch: 14
                }

            ];

            /* =================================================
               CREATE WORKBOOK
               ================================================= */

            const workbook =
                XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                fpWorksheet,
                "FP Age & Method"
            );

            XLSX.utils.book_append_sheet(
                workbook,
                individualWorksheet,
                "Individual Records"
            );

            XLSX.utils.book_append_sheet(
                workbook,
                summaryWorksheet,
                "Summary"
            );

            XLSX.utils.book_append_sheet(
                workbook,
                rhuWorksheet,
                "RHU Inventory"
            );

            /* =================================================
               FREEZE HEADER ROWS
               ================================================= */

            fpWorksheet["!freeze"] = {
                xSplit: 1,
                ySplit: 8
            };

            individualWorksheet["!freeze"] = {
                xSplit: 0,
                ySplit: 1
            };

            summaryWorksheet["!freeze"] = {
                xSplit: 0,
                ySplit: 1
            };

            rhuWorksheet["!freeze"] = {
                xSplit: 0,
                ySplit: 1
            };

            /* =================================================
               EXPORT FILE
               ================================================= */

            const today =
                new Date()
                    .toISOString()
                    .split("T")[0];

            XLSX.writeFile(
                workbook,
                `Health_Office_FP_Inventory_Report_${today}.xlsx`
            );

            console.log(
                "Excel export complete:",
                {
                    firestoreRecords:
                        filteredClients.length,

                    individuals:
                        filteredIndividuals.length,

                    countedIndividuals:
                        totalIndividuals
                }
            );

        } catch (error) {

            console.error(
                "Excel export failed:",
                error
            );

            alert(
                "Unable to export the Excel report. Please check the console for details."
            );

        }

    };

    /* =========================================================
       LOADING
       ========================================================= */

    if (loading) {

        return (

            <div className="inventory-loading">

                Loading Inventory...

            </div>

        );

    }

    /* =========================================================
       RENDER
       ========================================================= */

    return (



        <div className="inventory-container">

            {/* =================================================
                    EXPORT BUTTON
                    ================================================= */}

            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: "20px"
                }}
            >

                <button
                    type="button"
                    onClick={exportToExcel}
                    disabled={clientsLoading}
                    style={{
                        padding:
                            "10px 18px",
                        border: "none",
                        borderRadius:
                            "8px",
                        cursor:
                            clientsLoading
                                ? "not-allowed"
                                : "pointer",
                        fontWeight:
                            "600",
                        fontSize:
                            "14px",
                        background:
                            "#217346",
                        color:
                            "#ffffff",
                        opacity:
                            clientsLoading
                                ? 0.6
                                : 1
                    }}
                >

                    Export to Excel

                </button>

            </div>

            {/* =================================================
                AGE / METHOD ANALYTICS
                ================================================= */}

            <div className="inventory-panel age-method-panel">

                <div className="age-method-header">

                    <div>

                        <h3>
                            Family Planning Users by CHC
                        </h3>

                    </div>

                    {/* FILTERS */}

                    <div className="age-method-filters">

                        {/* CHC */}

                        <div>

                            <label>
                                CHC
                            </label>

                            <select
                                value={selectedCHC}
                                onChange={(e) =>
                                    setSelectedCHC(
                                        e.target.value
                                    )
                                }
                            >

                                <option value="all">
                                    All CHCs
                                </option>

                                {CHCS.map(
                                    (chc) => (

                                        <option
                                            key={chc}
                                            value={chc}
                                        >
                                            {chc}
                                        </option>

                                    )
                                )}

                            </select>

                        </div>

                        {/* USER CATEGORY */}

                        <div>

                            <label>
                                User Category
                            </label>

                            <select
                                value={
                                    selectedCategory
                                }
                                onChange={(e) =>
                                    setSelectedCategory(
                                        e.target.value
                                    )
                                }
                            >

                                {userCategories.map(
                                    (category) => (

                                        <option
                                            key={
                                                category.value
                                            }
                                            value={
                                                category.value
                                            }
                                        >
                                            {
                                                category.label
                                            }
                                        </option>

                                    )
                                )}

                            </select>

                        </div>

                        {/* MONTH */}

                        <div>

                            <label>
                                Month
                            </label>

                            <select
                                value={
                                    selectedMonth
                                }
                                onChange={(e) =>
                                    setSelectedMonth(
                                        e.target.value
                                    )
                                }
                            >

                                {months.map(
                                    (month) => (

                                        <option
                                            key={
                                                month.value
                                            }
                                            value={
                                                month.value
                                            }
                                        >
                                            {
                                                month.label
                                            }
                                        </option>

                                    )
                                )}

                            </select>

                        </div>

                        {/* YEAR */}

                        <div>

                            <label>
                                Year
                            </label>

                            <select
                                value={
                                    selectedYear
                                }
                                onChange={(e) =>
                                    setSelectedYear(
                                        e.target.value ===
                                            "all"
                                            ? "all"
                                            : Number(
                                                e.target.value
                                            )
                                    )
                                }
                            >

                                <option value="all">
                                    All Years
                                </option>

                                {years.map(
                                    (year) => (

                                        <option
                                            key={year}
                                            value={year}
                                        >
                                            {year}
                                        </option>

                                    )
                                )}

                            </select>

                        </div>

                    </div>

                </div>



                {clientsLoading ? (

                    <div className="age-method-loading">

                        Loading all client records...

                    </div>

                ) : (

                    <>

                        {/* SUMMARY */}

                        <div className="age-method-summary">

                            <div className="age-summary-card">

                                <small>
                                    Total Tracked Individuals
                                </small>

                                <strong>

                                    {
                                        totalIndividuals
                                            .toLocaleString()
                                    }

                                </strong>

                            </div>

                            <div className="age-summary-card">

                                <small>
                                    Most Used Method
                                </small>

                                <strong>

                                    {(() => {

                                        const sorted =
                                            Object.entries(
                                                methodTotals
                                            ).sort(
                                                (
                                                    [, a],
                                                    [, b]
                                                ) =>
                                                    b - a
                                            );

                                        return (
                                            sorted.length &&
                                            sorted[0][1] > 0
                                        )
                                            ? sorted[0][0]
                                            : "—";

                                    })()}

                                </strong>

                            </div>

                            <div className="age-summary-card">

                                <small>
                                    Largest Age Group
                                </small>

                                <strong>

                                    {(() => {

                                        const sorted =
                                            Object.entries(
                                                ageBracketTotals
                                            ).sort(
                                                (
                                                    [, a],
                                                    [, b]
                                                ) =>
                                                    b - a
                                            );

                                        return (
                                            sorted.length &&
                                            sorted[0][1] > 0
                                        )
                                            ? (
                                                ageBrackets.find(
                                                    (bracket) =>
                                                        bracket.key ===
                                                        sorted[0][0]
                                                )?.label ||
                                                sorted[0][0]
                                            )
                                            : "—";

                                    })()}

                                </strong>

                            </div>

                        </div>

                        {/* TABLE */}

                        <div className="age-method-table-wrapper">

                            <table className="age-method-table">

                                <thead>

                                    <tr>

                                        <th>
                                            Age Bracket
                                        </th>

                                        {methods.map(
                                            (method) => (

                                                <th
                                                    key={
                                                        method
                                                    }
                                                >
                                                    {method}
                                                </th>

                                            )
                                        )}

                                        <th>
                                            Total
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {ageBrackets.map(
                                        (bracket) => (

                                            <tr
                                                key={
                                                    bracket.key
                                                }
                                            >

                                                <td className="age-bracket-name">

                                                    <strong>
                                                        {
                                                            bracket.label
                                                        }
                                                    </strong>

                                                </td>

                                                {methods.map(
                                                    (method) => {

                                                        const count =
                                                            ageMethodAnalytics[
                                                            bracket.key
                                                            ][
                                                            method
                                                            ];

                                                        return (

                                                            <td
                                                                key={
                                                                    method
                                                                }
                                                            >

                                                                <span
                                                                    className={
                                                                        count > 0
                                                                            ? "method-count has-data"
                                                                            : "method-count"
                                                                    }
                                                                >
                                                                    {
                                                                        count
                                                                    }
                                                                </span>

                                                            </td>

                                                        );

                                                    }
                                                )}

                                                <td className="age-total">

                                                    <strong>
                                                        {
                                                            ageBracketTotals[
                                                            bracket.key
                                                            ]
                                                        }
                                                    </strong>

                                                </td>

                                            </tr>

                                        )
                                    )}

                                    <tr className="method-total-row">

                                        <td>
                                            Total
                                        </td>

                                        {methods.map(
                                            (method) => (

                                                <td
                                                    key={
                                                        method
                                                    }
                                                >

                                                    <strong>
                                                        {
                                                            methodTotals[
                                                            method
                                                            ]
                                                        }
                                                    </strong>

                                                </td>

                                            )
                                        )}

                                        <td>

                                            <strong>

                                                {
                                                    totalIndividuals
                                                }

                                            </strong>

                                        </td>

                                    </tr>

                                </tbody>

                            </table>

                        </div>

                    </>

                )}

            </div>

            {/* =================================================
                ORIGINAL KPI CARDS
                ================================================= */}

            <div className="inventory-cards">

                <div className="inventory-card blue">

                    <small>
                        Total RHUs
                    </small>

                    <h2>
                        {analytics.totalRHUs}
                    </h2>

                </div>

                <div className="inventory-card green">

                    <small>
                        Current Stock
                    </small>

                    <h2>
                        {analytics.totalStock}
                    </h2>

                </div>

                <div className="inventory-card purple">

                    <small>
                        Maximum Capacity
                    </small>

                    <h2>
                        {analytics.totalCapacity}
                    </h2>

                </div>

                <div className="inventory-card orange">

                    <small>
                        Total Population
                    </small>

                    <h2>
                        {
                            analytics.totalPopulation
                                .toLocaleString()
                        }
                    </h2>

                </div>

                <div className="inventory-card red">

                    <small>
                        Low Stock RHUs
                    </small>

                    <h2>
                        {
                            analytics.lowStock.length
                        }
                    </h2>

                </div>

            </div>

            {/* =================================================
                ORIGINAL RHU INVENTORY TABLE
                ================================================= */}

            <div className="inventory-panel">

                <h3>
                    RHU Inventory Status
                </h3>

                <div className="inventory-table-wrapper">

                    <table className="inventory-table">

                        <thead>

                            <tr>

                                <th>
                                    RHU
                                </th>

                                <th>
                                    Current Stock
                                </th>

                                <th>
                                    Maximum Capacity
                                </th>

                                <th>
                                    Population
                                </th>

                                <th>
                                    Barangays
                                </th>

                                <th>
                                    Stock Needed
                                </th>

                                <th>
                                    Status
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {[...rhus]
                                .sort(
                                    (a, b) => {

                                        const getNumber =
                                            (name) => {

                                                const match =
                                                    (
                                                        name ||
                                                        ""
                                                    )
                                                        .match(
                                                            /\d+/
                                                        );

                                                return match
                                                    ? parseInt(
                                                        match[0],
                                                        10
                                                    )
                                                    : Number.MAX_SAFE_INTEGER;

                                            };

                                        return (
                                            getNumber(a.name) -
                                            getNumber(b.name)
                                        );

                                    }
                                )
                                .map(
                                    (rhu) => {

                                        const stock =
                                            Number(
                                                rhu.stock
                                            ) || 0;

                                        const maxStock =
                                            Number(
                                                rhu.maxStock
                                            ) || 0;

                                        const stockNeeded =
                                            Math.max(
                                                0,
                                                maxStock -
                                                stock
                                            );

                                        return (

                                            <tr
                                                key={
                                                    rhu.id
                                                }
                                            >

                                                <td>
                                                    {rhu.name}
                                                </td>

                                                <td>
                                                    {stock}
                                                </td>

                                                <td>
                                                    {maxStock}
                                                </td>

                                                <td>
                                                    {
                                                        (
                                                            Number(
                                                                rhu.total_population
                                                            ) || 0
                                                        )
                                                            .toLocaleString()
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        rhu.barangays
                                                            ?.length ||
                                                        0
                                                    }
                                                </td>

                                                <td>
                                                    {stockNeeded}
                                                </td>

                                                <td>

                                                    {stock <=
                                                        lowStockLimit ? (

                                                        <span className="status critical">
                                                            Critical
                                                        </span>

                                                    ) : stock <=
                                                        200 ? (

                                                        <span className="status warning">
                                                            Low
                                                        </span>

                                                    ) : (

                                                        <span className="status good">
                                                            Good
                                                        </span>

                                                    )}

                                                </td>

                                            </tr>

                                        );

                                    }
                                )}

                        </tbody>

                    </table>

                </div>

            </div>

            {/* =================================================
                LOW STOCK ALERTS
                ================================================= */}

            <div className="inventory-panel">

                <div className="panel-header">

                    <h3>
                        Low Stock Alerts
                    </h3>

                    <span className="alert-count">

                        {
                            analytics.lowStock.length
                        }

                        {" "}

                        Critical RHU
                        {
                            analytics.lowStock.length !== 1
                                ? "s"
                                : ""
                        }

                    </span>

                </div>

                {analytics.lowStock.length === 0 ? (

                    <div className="empty-alerts">

                        <div className="success-icon">
                            ✓
                        </div>

                        <h4>
                            Inventory Status is Healthy
                        </h4>

                        <p>
                            All RHUs are above the
                            configured low stock
                            threshold.
                        </p>

                    </div>

                ) : (

                    <div className="alert-list">

                        {analytics.lowStock.map(
                            (rhu) => {

                                const stock =
                                    Number(
                                        rhu.stock
                                    ) || 0;

                                const maxStock =
                                    Number(
                                        rhu.maxStock
                                    ) || 0;

                                const stockNeeded =
                                    Math.max(
                                        0,
                                        maxStock -
                                        stock
                                    );

                                return (

                                    <div
                                        className="inventory-alert-card"
                                        key={
                                            rhu.id
                                        }
                                    >

                                        <div className="alert-left">

                                            <div className="alert-icon">
                                                ⚠
                                            </div>

                                            <div>

                                                <h4>
                                                    {
                                                        rhu.name
                                                    }
                                                </h4>

                                                <p>
                                                    Serving{" "}
                                                    {
                                                        rhu
                                                            .barangays
                                                            ?.length ||
                                                        0
                                                    }{" "}
                                                    Barangays
                                                </p>

                                            </div>

                                        </div>

                                        <div className="alert-right">

                                            <div className="alert-stat">

                                                <small>
                                                    Current
                                                </small>

                                                <strong>
                                                    {stock}
                                                </strong>

                                            </div>

                                            <div className="alert-stat">

                                                <small>
                                                    Maximum
                                                </small>

                                                <strong>
                                                    {maxStock}
                                                </strong>

                                            </div>

                                            <div className="alert-stat">

                                                <small>
                                                    Needed
                                                </small>

                                                <strong>
                                                    {
                                                        stockNeeded
                                                    }
                                                </strong>

                                            </div>

                                            <span className="critical-badge">
                                                Restock Required
                                            </span>

                                        </div>

                                    </div>

                                );

                            }
                        )}

                    </div>

                )}

            </div>

        </div>

    );

}

export default InventoryReport;