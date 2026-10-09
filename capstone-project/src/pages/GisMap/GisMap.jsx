import { notify } from "../../utils/notify";
import "./gis-map.css";
import { useState, useEffect, useCallback, useMemo } from 'react';
import MapDisplay from "../../components/MapDisplay/MapDisplay";
import MapPopUp from "../../components/MapPopUp/MapPopUp";
import MapExportModal from "../../components/MapExportModal/MapExportModal";
import { db } from '../../firebase-config';
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { INVENTORY_FP_METHODS } from "../../data/inventoryMethods.js";
import ReportSelect from "../../components/ReportSelect/ReportSelect";
import PageHeader from "../../components/PageHeader/PageHeader";

const BARANGAYS = [
    "Anilao", "Atlag", "Babatnin", "Bagna", "Bagong Bayan", "Balayong", "Balite",
    "Bangkal", "Barihan", "Bulihan", "Bungahan", "Caingin", "Calero", "Caliligawan",
    "Canalate", "Caniogan", "Catmon", "Cofradia", "Dakila", "Guinhawa", "Ligas",
    "Liang", "Longos", "Look 1st", "Look 2nd", "Lugam", "Mabolo", "Mambog",
    "Masile", "Matimbo", "Mojon", "Namayan", "Niugan", "Pamarawan", "Panasahan",
    "Pinagbakahan", "San Agustin", "San Gabriel", "San Juan", "San Pablo",
    "San Vicente", "Santiago", "Santisima Trinidad",  "Santo Cristo",
    "Santo Niño", "Santo Rosario", "Santor", "Sumapang Bata", "Sumapang Matanda", "Taal", "Tikay"
];

//barangays with their cooordinates (latitude and longitude) for map centering
const BARANGAY_COORDINATES = {
    "Anilao": { lat: 14.8422, lng: 120.7976 },
    "Atlag": { lat: 14.8294, lng: 120.8214 },
    "Babatnin": { lat: 14.7809, lng: 120.8198 },
    "Bagna": { lat: 14.8251, lng: 120.8226 },
    "Bagong Bayan": { lat: 14.8402, lng: 120.8347 },
    "Balayong": { lat: 14.8292, lng: 120.8300 },
    "Balite": { lat: 14.8300, lng: 120.8368 },
    "Bangkal": { lat: 14.8232, lng: 120.8485 },
    "Barihan": { lat: 14.8744, lng: 120.8357 },
    "Bulihan": { lat: 14.8582, lng: 120.8014 },
    "Bungahan": { lat: 14.8637, lng: 120.8444 },
    "Caingin": { lat: 14.8449, lng: 120.8090 },
    "Calero": { lat: 14.8261, lng: 120.8098 },
    "Caliligawan": { lat: 14.7707, lng: 120.8083 },
    "Canalate": { lat: 14.8407, lng: 120.8024 },
    "Caniogan": { lat: 14.8465, lng: 120.8174 },
    "Catmon": { lat: 14.8511, lng: 120.8147 },
    "Cofradia": { lat: 14.8443, lng: 120.8301 },
    "Dakila": { lat: 14.8507, lng: 120.8361 },
    "Guinhawa": { lat: 14.8565, lng: 120.8157 },
    "Ligas": { lat: 14.8631, lng: 120.8520 },
    "Liang": { lat: 14.8456, lng: 120.8153 },
    "Longos": { lat: 14.8719, lng: 120.7928 },
    "Look 1st": { lat: 14.8819, lng: 120.8112 },
    "Look 2nd": { lat: 14.8221, lng: 120.8612 },
    "Lugam": { lat: 14.8819, lng: 120.8184 },
    "Mabolo": { lat: 14.8434, lng: 120.8263 },
    "Mambog": { lat: 14.8099, lng: 120.8499 },
    "Masile": { lat: 14.7868, lng: 120.8065 },
    "Matimbo": { lat: 14.8164, lng: 120.8375 },
    "Mojon": { lat: 14.8648, lng: 120.8201 },
    "Namayan": { lat: 14.7760, lng: 120.8113 },
    "Niugan": { lat: 14.8197, lng: 120.8546 },
    "Pamarawan": { lat: 14.7586, lng: 120.8148 },
    "Panasahan": { lat: 14.8225, lng: 120.8270 },
    "Pinagbakahan": { lat: 14.8717, lng: 120.8206 },
    "San Agustin": { lat: 14.8479, lng: 120.8097 },
    "San Gabriel": { lat: 14.8476, lng: 120.8126 },
    "San Juan": { lat: 14.8349, lng: 120.8162 },
    "San Pablo": { lat: 14.8406, lng: 120.8454 },
    "San Vicente": { lat: 14.8434, lng: 120.8150 },
    "Santiago": { lat: 14.8427, lng: 120.8076 },
    "Santisima Trinidad": { lat: 14.8753, lng: 120.8254 },
    "Santo Cristo": { lat: 14.8311, lng: 120.8196 },
    "Santo Niño": { lat: 14.8425, lng: 120.8102 },
    "Santo Rosario": { lat: 14.8402, lng: 120.8133 },
    "Santor": { lat: 14.8325, lng: 120.8549 },
    "Sumapang Bata": { lat: 14.8581, lng: 120.8317 },
    "Sumapang Matanda": { lat: 14.8573, lng: 120.8278 },
    "Taal": { lat: 14.8159, lng: 120.8553 },
    "Tikay": { lat: 14.8423, lng: 120.8532 }
};

//list of family planning methods for the filter dropdown
const FP_METHODS = [
    "Condom", "IUD", "Pills", "Injectable", "Vasectomy", "Tubal Ligation",
    "Implant", "CMM/Billings", "BBT", "Sympto-thermal", "SDM", "LAM",
    "Withdrawal", "Rhythm", "Calendar", "Abstinence", "Herbal", "No Method"
];

const BARANGAY_OPTIONS = [
    { value: "", label: "All Barangays" },
    ...BARANGAYS.map((barangay) => ({ value: barangay, label: barangay }))
];

const FP_METHOD_OPTIONS = [
    { value: "all", label: "All Methods" },
    ...FP_METHODS.map((method) => ({ value: method, label: method }))
];

function GisMap({ getCollection }){
    const [isFiltersOpen, setIsFiltersOpen] = useState(true);
    const [selectedBarangay, setSelectedBarangay] = useState("");
    const [mapTrigger, setMapTrigger] = useState(null);
    const [selectedFPMethod, setSelectedFPMethod] = useState('all');
    const [mapMode, setMapMode] = useState('markers');

    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const [isExportOpen, setIsExportOpen] = useState(false);

    const [zoom, setZoom] = useState(13);
    const [userLocation, setUserLocation] = useState(null);
    const [activeLayer, setActiveLayer] = useState('standard');
    const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

    const [selectedFamily, setSelectedFamily] = useState(null);
    const [showInfo, setShowInfo] = useState(true);

    const [families, setFamilies] = useState([]);

    const [rhu, setRhu] = useState([]);
    const [isLowStockEnabled, setIsLowStockEnabled] = useState(true);
    const [methodLimits, setMethodLimits] = useState({});
    const [defaultThreshold, setDefaultThreshold] = useState(10);

    const [locationNotice, setLocationNotice] = useState(null);

    // Fetch the low stock threshold from Firestore on component mount
    const fetchThreshold = useCallback(async () => {
        try {
            const docRef = doc(db, "lowStock", "lowStockLimit");
            const docSnap = await getDoc(docRef);

            let configData = null;

            if (docSnap.exists()) {
                configData = docSnap.data();
            } else {
                const querySnap = await getDocs(collection(db, "lowStock"));
                if (!querySnap.empty) {
                    configData = querySnap.docs[0].data();
                }
            }

            if (configData) {
                const isAlertActive = configData.enabled ?? configData.isEnabled ?? true;

                setIsLowStockEnabled(Boolean(isAlertActive));
                setMethodLimits(configData.limitsByMethod || {});
                setDefaultThreshold(Number(configData.lowStockLimit ?? 10));
            }
        } catch (err) {
            console.error("Error fetching lowStock threshold:", err);
        }
    }, []);

    const fetchRHU = useCallback(async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "rhu"));
            const rhuData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRhu(rhuData);
        } catch (error) {
            console.error(error);
        }
    }, []);

    // Compute RHU Warning Markers
    const rhuWarningMarkers = useMemo(() => {
        if (!isLowStockEnabled || !rhu || !rhu.length) return [];

        const markers = [];
        const normalizeKey = (k) => k.toLowerCase().replace(/[/\s-]/g, '_');

        rhu.forEach((rhuDoc) => {
            const stockMap = rhuDoc.stockByMethod;
            const depletedMethods = [];

            if (!stockMap || typeof stockMap !== 'object' || Object.keys(stockMap).length === 0) {
                depletedMethods.push({
                    method: "NO INVENTORY RECORDED",
                    count: 0,
                    limit: "N/A",
                    isUninitialized: true
                });
            } else {
                Object.entries(stockMap).forEach(([methodName, qty]) => {
                    const count = Number(qty);
                    if (isNaN(count)) return;

                    const normName = normalizeKey(methodName);
                    // only the methods tracked in Inventory can be low on stock
                    if (!INVENTORY_FP_METHODS.some((m) => m.id === normName)) return;
                    let limitForThisMethod = defaultThreshold;

                    if (methodLimits && typeof methodLimits === 'object') {
                        if (methodLimits[methodName] !== undefined) {
                            limitForThisMethod = Number(methodLimits[methodName]);
                        } else if (methodLimits[normName] !== undefined) {
                            limitForThisMethod = Number(methodLimits[normName]);
                        }
                    }

                    if (count <= limitForThisMethod) {
                        depletedMethods.push({
                            method: methodName.toUpperCase().replace(/_/g, ' '),
                            count: count,
                            limit: limitForThisMethod,
                            isUninitialized: false
                        });
                    }
                });
            }

            if (depletedMethods.length === 0) return;

            const geo = rhuDoc.coordinates || rhuDoc.location;
            const rhuLat = Number(geo?.latitude ?? rhuDoc.lat ?? rhuDoc.latitude);
            const rhuLng = Number(geo?.longitude ?? rhuDoc.lng ?? rhuDoc.longitude);

            if (!isNaN(rhuLat) && !isNaN(rhuLng) && rhuLat !== 0 && rhuLng !== 0) {
                markers.push({
                    id: `${rhuDoc.id}-rhu-warning`,
                    rhuName: rhuDoc.name || rhuDoc.rhuName || rhuDoc.id,
                    address: rhuDoc.address || "",
                    lowStockMethods: depletedMethods,
                    lat: rhuLat,
                    lng: rhuLng
                });
            }
        });

        return markers;
    }, [rhu, methodLimits, defaultThreshold, isLowStockEnabled]);

    const fetchMapClients = useCallback(async () => {
            try {
                const collectionName = typeof getCollection === 'function' ? getCollection() : 'clients_public';

                const querySnapshot = await getDocs(collection(db, collectionName));

                const formattedData = querySnapshot.docs
                    .map((doc) => {
                        const data = doc.data();

                        if (data.is_archived === true) return null;

                        const cleanBarangay = (data.barangay || '').trim();

                        let rawLat = data.latitude ?? data.lat ?? data.location?.lat ?? data.coords?.lat;
                        let rawLng = data.longitude ?? data.lng ?? data.location?.lng ?? data.coords?.lng;

                        if ((rawLat === undefined || rawLat === null) && typeof data.address === 'string') {
                            const parts = data.address.trim().split(/\s+/);
                            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                                rawLat = parseFloat(parts[0]);
                                rawLng = parseFloat(parts[1]);
                            }
                        }

                        if ((rawLat === undefined || rawLat === null || isNaN(rawLat) || Number(rawLat) === 0) && cleanBarangay) {
                            const coordsKey = Object.keys(BARANGAY_COORDINATES).find(
                                k => k.toLowerCase() === cleanBarangay.toLowerCase()
                            );
                            if (coordsKey && BARANGAY_COORDINATES[coordsKey]) {
                                rawLat = BARANGAY_COORDINATES[coordsKey].lat;
                                rawLng = BARANGAY_COORDINATES[coordsKey].lng;
                            }
                        }

                        const parsedLat = Number(rawLat);
                        const parsedLng = Number(rawLng);

                        const rawMethod = (
                            data.fp_method ||
                            data.fpMethod ||
                            data.type ||
                            data.methodUsed ||
                            data.traditionalType ||
                            'no method'
                        ).toString().trim().toLowerCase();

                        let normalizedMethod = rawMethod;
                        if (!rawMethod || rawMethod === 'none' || rawMethod === 'no_method' || rawMethod === 'n/a') {
                            normalizedMethod = 'no method';
                        }

                        const maleName = (data.name || '').trim();
                        const femaleName = (data.spouse_name || '').trim();
                        const combinedName = maleName && femaleName
                            ? `${maleName} & ${femaleName}`
                            : maleName || femaleName || 'Unnamed Record';

                        return {
                            id: doc.id,
                            familyName: combinedName,
                            maleName: maleName,
                            femaleName: femaleName,
                            barangay: cleanBarangay,
                            address: data.address || '',
                            lat: parsedLat,
                            lng: parsedLng,
                            fp_method: normalizedMethod,
                            status: data.status || '',
                            noOfChildren: Number(data.no_of_children || 0),
                            civilStatusMale: data.civil_status_male || '',
                            civilStatusFemale: data.civil_status_female || '',
                            educationMale: data.educational_attainment_female || data.educational_attainment_male || '',
                            educationFemale: data.educational_attainment_female || '',
                            maleBirthdate: data.birthdate_male || '',
                            femaleBirthdate: data.birthdate_female || '',
                            signatureUrl: data.signatureUrl || data.signature || data.signature_url || data.signatureURL || null
                        };
                    })
                    .filter(Boolean);

                const coordMap = {};
                const validCoordsData = [];
                const invalidCoordsData = [];

                formattedData.forEach(item => {
                    if (!isNaN(item.lat) && !isNaN(item.lng) && item.lat !== 0 && item.lng !== 0) {
                        const coordKey = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;

                        if (coordMap[coordKey] === undefined) {
                            coordMap[coordKey] = 0;
                        } else {
                            coordMap[coordKey] += 1;
                            const count = coordMap[coordKey];
                            const angle = count * (2 * Math.PI / 6);
                            const distance = 0.0008 * Math.ceil(count / 6);

                            item.lat = item.lat + (Math.sin(angle) * distance);
                            item.lng = item.lng + (Math.cos(angle) * distance);
                        }

                        validCoordsData.push(item);
                    } else {
                        invalidCoordsData.push(item);
                    }
                });

                if (invalidCoordsData.length > 0) {
                    console.warn("Records without valid coordinates:", invalidCoordsData);
                }

                setFamilies(validCoordsData);

            } catch (error) {
                console.error(error);
            }
        }, [getCollection]);

    useEffect(() => {
        fetchMapClients();
        fetchRHU();
        fetchThreshold();
    }, [fetchMapClients, fetchRHU, fetchThreshold]);

    //zooming in on selected barangay
    useEffect(() => {
        if (selectedBarangay && BARANGAY_COORDINATES[selectedBarangay]) {
            setMapTrigger({
                coordinates: BARANGAY_COORDINATES[selectedBarangay],
                timestamp: Date.now()
            });
        } else {
            setMapTrigger(null);
        }
    }, [selectedBarangay]);

    const filteredFamilies = useMemo(() => {
        if (!Array.isArray(families) || families.length === 0) return [];

        return families.filter((item) => {
            const itemBarangay = (item.barangay || '').toString().trim().toLowerCase();
            const itemMethod = (item.fp_method || '').toString().trim().toLowerCase();

            const selectedBgyClean = (selectedBarangay || '').toString().trim().toLowerCase();
            const selectedMethodClean = (selectedFPMethod || '').toString().trim().toLowerCase();

            const isBgyAll =
                !selectedBarangay ||
                selectedBgyClean === '' ||
                selectedBgyClean === 'all' ||
                selectedBgyClean === 'all barangays' ||
                selectedBgyClean === 'select barangay';

            const matchesBarangay = isBgyAll || itemBarangay === selectedBgyClean;

            const isMethodAll =
                !selectedFPMethod ||
                selectedMethodClean === '' ||
                selectedMethodClean === 'all' ||
                selectedMethodClean === 'all methods' ||
                selectedMethodClean === 'select method';

            const matchesMethod = isMethodAll || itemMethod === selectedMethodClean;

            return matchesBarangay && matchesMethod;
        });
    }, [families, selectedBarangay, selectedFPMethod]);

    const handleLocateUser = () => {
        if (!navigator.geolocation) {
            setLocationNotice("Geolocation is not supported by your browser.");
            setTimeout(() => setLocationNotice(null), 5000);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const coords = { lat: latitude, lng: longitude };

                setUserLocation(coords);
                setMapTrigger({
                    coordinates: coords,
                    timestamp: Date.now()
                });
                setZoom(16);
                setLocationNotice(null);
            },
            (error) => {
                let userMessage = "";

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        userMessage = "Location access blocked. Please allow location permissions in your browser URL bar.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        userMessage = "Location is currently unavailable. Please check your network or GPS connection.";
                        break;
                    case error.TIMEOUT:
                        userMessage = "Request to get user location timed out. Please try again.";
                        break;
                    default:
                        userMessage = "An unknown error occurred while retrieving your location.";
                        break;
                }

                console.warn(`Geolocation error (${error.code}): ${error.message}`);
                setLocationNotice(userMessage);

                setTimeout(() => setLocationNotice(null), 5000);
            },
            { 
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    };

    // Search Input Change Handler: matches clients on the map by name or address
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        setFocusedIndex(-1);

        const term = value.trim().toLowerCase();
        if (term !== "") {
            const matches = filteredFamilies
                .filter((family) =>
                    (family.familyName || "").toLowerCase().includes(term) ||
                    (family.address || "").toLowerCase().includes(term)
                )
                .slice(0, 8);
            setSuggestions(matches);
            setIsDropdownOpen(true);
        } else {
            setSuggestions([]);
            setIsDropdownOpen(false);
        }
    };

    // Client Selection Handler: moves the map to the client and opens their details
    const handleSelectClient = (family) => {
        setSearchQuery(family.familyName);
        setIsDropdownOpen(false);
        setSuggestions([]);
        setFocusedIndex(-1);
        setSelectedFamily(family);
        setMapTrigger({
            coordinates: { lat: family.lat, lng: family.lng },
            timestamp: Date.now()
        });
    };

    // Search Submit Handler (Enter Key)
    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        const match = suggestions[focusedIndex] || suggestions[0];
        if (match) {
            handleSelectClient(match);
        } else if (searchQuery.trim()) {
            notify(`No client found for "${searchQuery}".`);
        }
    };

    return (
        <>
        {/* FLOATING LOCATION NOTIFICATION BANNER */}
        {locationNotice && (
            <div className="location-toast-banner">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <span>{locationNotice}</span>
                <button 
                    type="button" 
                    onClick={() => setLocationNotice(null)}
                    aria-label="Close notification"
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
        )}

        <div className="pop-up">
            {selectedFamily && (
                <MapPopUp 
                    family={selectedFamily} 
                    onClose={() => setSelectedFamily(null)} 
                />
            )}
        </div>
            <PageHeader title="Geographic Coverage Map" flush>
                <div className="gis-header-right">
                    <div className="search-container">
                        <div className="search-bar">
                            <i className="fa-solid fa-magnifying-glass"></i>
                            <input
                                type="text"
                                placeholder="Search client name or address..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
                                style={{ outline: 'none', boxShadow: 'none' }}
                            />
                        </div>

                        {isDropdownOpen && (
                            <ul className="suggestions-list">
                                {suggestions.length === 0 && (
                                    <li className="suggestion-empty">No matching clients</li>
                                )}
                                {suggestions.map((family) => (
                                    <li
                                        key={family.id}
                                        className="suggestion-item"
                                        onClick={() => handleSelectClient(family)}
                                    >
                                        <i className="fa-solid fa-location-dot"></i>
                                        <span className="suggestion-text">
                                            <strong>{family.familyName}</strong>
                                            <small>{family.address || family.barangay || "No address"}</small>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <button
                        className="toolbar-btn"
                        title="Export a barangay map as an image"
                        onClick={() => setIsExportOpen(true)}>
                        <i className="fa-solid fa-arrow-up-from-bracket"></i>
                        Export Map
                    </button>
                </div>
            </PageHeader>

            <div className="map-overview">
                <div className="map-filters">
                    <div className="filters-header">
                        <div className="filters-header-left">
                            <i className="fa-solid fa-filter"></i>
                            <h3>Map Filters</h3>
                        </div>
                        <button
                            id="show-filters"
                            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                            className={isFiltersOpen ? 'active' : ''}
                        >
                            <i className="fa-solid fa-chevron-up"></i>
                        </button>
                    </div>

                    <div className="filter-modes" style={{ display: isFiltersOpen ? "block" : "none" }}>
                        <div className="view-mode">
                            <div className="view-mode-options">
                                <div
                                    id="markers"
                                    className={`option-item ${mapMode === 'markers' ? 'active' : ''}`}
                                    onClick={() => setMapMode('markers')}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <i className="fa-solid fa-location-dot"></i>
                                    <p>Markers</p>
                                </div>

                                <div
                                    id="heatmap"
                                    className={`option-item ${mapMode === 'heatmap' ? 'active' : ''}`}
                                    onClick={() => setMapMode('heatmap')}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <i className="fa-solid fa-arrow-trend-up"></i>
                                    <p>Heatmap</p>
                                </div>

                                <div
                                    id="clusters"
                                    className={`option-item ${mapMode === 'clusters' ? 'active' : ''}`}
                                    onClick={() => setMapMode('clusters')}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <i className="fa-regular fa-circle"></i>
                                    <p>Clusters</p>
                                </div>
                            </div>
                        </div>

                        <div className="barangay-filter">
                            <h4>Barangay</h4>
                            <ReportSelect
                                ariaLabel="Barangay"
                                value={selectedBarangay}
                                onChange={(e) => setSelectedBarangay(e.target.value)}
                                options={BARANGAY_OPTIONS}
                            />
                        </div>

                        <div className="fp-method-filter">
                            <h4>FP Method</h4>
                            <ReportSelect
                                ariaLabel="FP Method"
                                value={selectedFPMethod}
                                onChange={(e) => setSelectedFPMethod(e.target.value)}
                                options={FP_METHOD_OPTIONS}
                            />
                        </div>
                    </div>
                </div>

                <div className="map-legend">
                    <div className="legend-title">
                        <h3>Map Legend</h3>

                        <div className="legend-info-wrapper">
                            <i className="fa-solid fa-circle-info"></i>
                            <div className="legend-tooltip-popover">
                                <ul>
                                    <li>
                                        <strong style={{ color: '#EF4444' }}>Short-Acting:</strong> Pills, Condom, Injectable
                                    </li>
                                    <li>
                                        <strong style={{ color: '#8B5CF6' }}>Long-Acting:</strong> Implant, IUD
                                    </li>
                                    <li>
                                        <strong style={{ color: '#2563EB' }}>Permanent:</strong> Vasectomy, Bilateral Tubal Ligation (BTL)
                                    </li>
                                    <li>
                                        <strong style={{ color: '#10B981' }}>Natural:</strong> CMM/Billings, BBT, Sympto-thermal, SDM, LAM
                                    </li>
                                    <li>
                                        <strong style={{ color: '#D97706' }}>Traditional:</strong> Withdrawal, Rhythm, Calendar, Abstinence, Herbal
                                    </li>
                                    <li>
                                        <strong style={{ color: '#64748B' }}>No Method:</strong> Unmet need / Non-users
                                    </li>
                                </ul>
                            </div>
                        </div>

                    </div>
                    <ul>
                        <p><i className="fa-solid fa-circle" style={{ color: '#EF4444' }}></i> Short-Acting Modern</p>
                        <p><i className="fa-solid fa-circle" style={{ color: '#8B5CF6' }}></i> Long-Acting Modern</p>
                        <p><i className="fa-solid fa-circle" style={{ color: '#2563EB' }}></i> Permanent Modern</p>
                        <p><i className="fa-solid fa-circle" style={{ color: '#10B981' }}></i> Natural - Modern</p>
                        <p><i className="fa-solid fa-circle" style={{ color: '#D97706' }}></i> Traditional</p>
                        <p><i className="fa-solid fa-circle" style={{ color: '#64748B' }}></i> No Method</p>
                    </ul>
                </div>

                <div className="map-controls">
                    <button
                        onClick={() => setZoom(prev => prev < 18 ? prev + 1 : prev)} disabled={zoom === 18} title="Zoom In">
                        <i className="fa-solid fa-magnifying-glass-plus"></i>
                    </button>
                    <button
                        onClick={() => setZoom(prev => prev > 3 ? prev - 1 : prev)} disabled={zoom === 3} title="Zoom Out">
                        <i className="fa-solid fa-magnifying-glass-minus"></i>
                    </button>
                    <button onClick={handleLocateUser} title="Current location">
                        <i className="fa-solid fa-location-arrow"></i>
                    </button>

                    <div className="layer-control-wrapper" style={{ position: 'relative' }}>
                        <button
                            onClick={() => setIsLayerMenuOpen(prev => !prev)}
                            title="Map Layers"
                            className={isLayerMenuOpen ? 'active' : ''}
                        >
                            <i className="fa-solid fa-layer-group"></i>
                        </button>

                        {isLayerMenuOpen && (
                            <div className="layer-menu-popup">
                                <h4>Map Styles</h4>
                                <div className="layer-options">
                                    {[
                                        { id: 'standard', name: 'Standard', icon: 'fa-map' },
                                        { id: 'satellite', name: 'Satellite', icon: 'fa-globe' }
                                    ].map((item) => (
                                        <button
                                            key={item.id}
                                            className={`layer-option-btn ${activeLayer === item.id ? 'selected' : ''}`}
                                            onClick={() => {
                                                setActiveLayer(item.id);
                                                setIsLayerMenuOpen(false);
                                            }}
                                        >
                                            <i className={`fa-solid ${item.icon}`}></i>
                                            <span>{item.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {showInfo && (
                    <div className="information-container">
                        <i className="fa-solid fa-circle-info"></i>
                        <p>Click on a barangay or use the filter to view detailed statistics.</p>
                        <button
                            type="button"
                            onClick={() => setShowInfo(false)}
                            aria-label="Close information"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                )}

                <div className="map-container">
                    <MapDisplay
                        families={families}
                        filteredFamilies={filteredFamilies}
                        selectedBarangay={selectedBarangay}
                        rhuWarningMarkers={rhuWarningMarkers}
                        mapMode={mapMode}
                        currentZoom={zoom}
                        onZoomChange={setZoom}
                        barangayCenter={mapTrigger}
                        userLocation={userLocation}
                        activeLayer={activeLayer}
                        onMarkerClick={(fam) => setSelectedFamily(fam)}
                    />
                </div>

                <MapExportModal
                    isOpen={isExportOpen}
                    onClose={() => setIsExportOpen(false)}
                    families={families}
                    barangayList={BARANGAYS}
                    activeFilterBarangay={selectedBarangay}
                />
            </div>
        </>
    );
}

export default GisMap;