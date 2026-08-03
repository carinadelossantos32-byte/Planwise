import "./gis-map.css";

import React, { useState, useEffect, useRef } from 'react';
import MapDisplay from "../../components/MapDisplay/MapDisplay";
import MapPopUp from "../../components/MapPopUp/MapPopUp";
import MapExportModal from "../../components/MapExportModal/MapExportModal";

function GisMap(){
    //filters
    const [isFiltersOpen, setIsFiltersOpen] = useState(true); // filters open/close toggle
    const [selectedBarangay, setSelectedBarangay] = useState(""); // default filter for barangay
    const [mapTrigger, setMapTrigger] = useState(null); //map zooming
    const [selectedFPMethod, setSelectedFPMethod] = useState('all'); // default filter for fp method
    const [mapMode, setMapMode] = useState('markers');

    //search
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1); 

    //export
    const [isExportOpen, setIsExportOpen] = useState(false);
    const mapRef = useRef(null);

    //settings
    const [zoom, setZoom] = useState(13); // default zoom level for the map
    const [userLocation, setUserLocation] = useState(null); // store user's current location
    const [activeLayer, setActiveLayer] = useState('standard'); // 'standard' | 'light' | 'dark' | 'satellite'
    const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
    
    const [selectedFamily, setSelectedFamily] = useState(null); // hold selected family for modal popup

    const [showInfo, setShowInfo] = useState(true); //information container toggle

    // Dummy data for families
    const [family] = useState([
        {
            id: "client_001",
            barangay: "Anilao",
            lat: 14.8422,
            lng: 120.7976,
            maleName: "Juan Dela Cruz",
            femaleName: "Maria Dela Cruz",
            maleBirthdate: "1992-05-14",
            femaleBirthdate: "1994-08-22",
            maleEducation: "College Graduate",
            femaleEducation: "High School Graduate",
            maleCivilStatus: "Married",
            femaleCivilStatus: "Married",
            numberOfChildren: 3,
            fpMethod: "Modern", 
            methodUsed: "Vasectomy",
            intentionToShift: "IUD"
        },
        {
            id: "client_002",
            barangay: "Atlag",
            lat: 14.8294,
            lng: 120.8214,
            maleName: "Mark Santos",
            femaleName: "Ana Santos",
            maleBirthdate: "1988-11-02",
            femaleBirthdate: "1990-03-17",
            maleEducation: "Vocational",
            femaleEducation: "College Graduate",
            maleCivilStatus: "Cohabiting",
            femaleCivilStatus: "Cohabiting",
            numberOfChildren: 1,
            fpMethod: "Traditional",
            traditionalType: "Withdrawal",
            traditionalStatus: "Undecided",
            traditionalReason: "Limiting"
        },
        {
            id: "client_003",
            barangay: "San Juan",
            lat: 14.8350,
            lng: 120.8150,
            maleName: "Jose Reyes",
            femaleName: "Elena Reyes",
            maleBirthdate: "1995-01-25",
            femaleBirthdate: "1996-06-30",
            maleEducation: "High School Graduate",
            femaleEducation: "High School Graduate",
            maleCivilStatus: "Married",
            femaleCivilStatus: "Married",
            numberOfChildren: 4,
            fpMethod: "Modern",
            methodUsed: "Condom",
            intentionToShift: "IUD"
        },
        {
            id: "client_004",
            barangay: "Atlag",
            lat: 14.8294,
            lng: 120.8215,
            maleName: "Mark Santos",
            femaleName: "Ana Santos",
            maleBirthdate: "1988-11-02",
            femaleBirthdate: "1990-03-17",
            maleEducation: "Vocational",
            femaleEducation: "College Graduate",
            maleCivilStatus: "Cohabiting",
            femaleCivilStatus: "Cohabiting",
            numberOfChildren: 1,
            fpMethod: "Traditional",
            traditionalType: "No Method",
            traditionalStatus: "Undecided",
            traditionalReason: "Limiting"
        },
    ]);

    const barangays = [
        "Anilao", "Atlag", "Babatnin", "Bagna", "Bagong Bayan", "Balayong", "Balite", 
        "Bangkal", "Barihan", "Bulihan", "Bungahan", "Caingin", "Calero", "Caliligawan", 
        "Canalate", "Caniogan", "Catmon", "Cofradia", "Dakila", "Guinhawa", "Ligas", 
        "Liyang", "Longos", "Look 1st", "Look 2nd", "Lugam", "Mabolo", "Mambog", 
        "Masile", "Matimbo", "Mojon", "Namayan", "Niugan", "Pamarawan", "Panasahan", 
        "Pinagbakahan", "San Agustin", "San Gabriel", "San Juan", "San Pablo", 
        "San Vicente", "Santiago", "Santisima Trinidad",  "Santo Cristo", 
        "Santo Niño", "Santo Rosario", "Santor", "Sumapang Bata", "Sumapang Matanda", "Taal", "Tikay"
    ];

    const barangayCoordinates = {
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
        "Liyang": { lat: 14.8456, lng: 120.8153 },
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

    const fpmethods = [
        "Condom", "IUD", "Pills", "Injectable", "Vasectomy", "Tubal Ligation", 
        "Implant", "CMM/Billings", "BBT", "Sympto-thermal", "SDM", "LAM", 
        "Withdrawal", "Rhythm", "Calendar", "Abstinence", "Herbal", "No Method"
    ];

    // Zooming in on selected barangay when chosen from the dropdown
    useEffect(() => { 
        if (selectedBarangay && barangayCoordinates[selectedBarangay]) {
            setMapTrigger({
                coordinates: barangayCoordinates[selectedBarangay],
                timestamp: Date.now()
            });
        } else {
            setMapTrigger(null);
        }
    }, [selectedBarangay]);
    
    // Filtering logic for both Barangay and FP Method
    const filteredFamilies = family.filter((item) => {
        const matchesBarangay = selectedBarangay === "" || item.barangay === selectedBarangay;

        let matchesMethod = true;
        if (selectedFPMethod !== "all" && selectedFPMethod !== "") {
            const activeMethod = (
                item.fp_method || 
                item.type || 
                item.methodUsed || 
                item.traditionalType || 
                ""
            ).toLowerCase().trim();

            matchesMethod = activeMethod === selectedFPMethod.toLowerCase().trim();
        }

        return matchesBarangay && matchesMethod;
    });
    
    // Get user current location
    const handleLocateUser = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
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
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Unable to retrieve location permissions.");
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

        const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        setFocusedIndex(-1);

        if (value.trim() !== "") {
            const matches = barangays.filter((b) =>
                b.toLowerCase().includes(value.toLowerCase().trim())
            );
            setSuggestions(matches);
            setIsDropdownOpen(true);
        } else {
            setSuggestions([]);
            setIsDropdownOpen(false);
        }
    };

    // Selection handler (clicks or pressing Enter on a suggestion)
    const handleSelectBarangay = (barangayName) => {
        setSearchQuery(barangayName);
        setSelectedBarangay(barangayName); // Triggers your map trigger effect
        setIsDropdownOpen(false);
        setSuggestions([]);
        setFocusedIndex(-1);
    };

    // Keyboard navigation (Arrow keys, Enter, Escape)
    const handleKeyDown = (e) => {
        if (!isDropdownOpen || suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === "Enter") {
            if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
                e.preventDefault();
                handleSelectBarangay(suggestions[focusedIndex]);
            }
        } else if (e.key === "Escape") {
            setIsDropdownOpen(false);
            setFocusedIndex(-1);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (focusedIndex >= 0 && suggestions[focusedIndex]) {
            handleSelectBarangay(suggestions[focusedIndex]);
        } else if (searchQuery.trim()) {
            const match = barangays.find(
                (b) => b.toLowerCase() === searchQuery.trim().toLowerCase()
            );
            if (match) {
                handleSelectBarangay(match);
            } else {
                alert(`Barangay "${searchQuery}" not found.`);
            }
        }
    };

    return (
        <>
            <div className="pop-up">
                {selectedFamily && (
                    <MapPopUp 
                        family={selectedFamily} 
                        onClose={() => setSelectedFamily(null)} 
                    />
                )}
            </div>

            <div className="page-header">
                <h1>Geographic Coverage Map</h1>
                <div className="gis-header-right">
                    <div className="search-container">
                        <div className="search-bar"> 
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <input 
                            type="text" 
                            placeholder="Search Barangay..." 
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                        </div>

                        {/* BAGO: Dapat nasa LOOB ito ng search-container at MAGKAPATID sila ng search-bar */}
                        {isDropdownOpen && (
                        <ul className="suggestions-list">
                            {suggestions.map((barangayName, index) => (
                            <li 
                                key={index} 
                                className="suggestion-item"
                                onClick={() => handleSelectBarangay(barangayName)} // <--- ETO ANG MAHALAGA!
                            >
                                <i className="fa-solid fa-location-dot"></i>
                                <span>{barangayName}</span>
                            </li>
                            ))}
                        </ul>
                        )}
                    </div>
                    <button
                        className="toolbar-btn" 
                        title="Export Data"
                        onClick={() => setIsExportOpen(true)}> 
                        <i className="fa-solid fa-arrow-up-from-bracket"></i> 
                        Export Map
                    </button>
                </div>
            </div>

            {/* map overview */}
            <div className="map-overview">
                
                {/* map filters */}
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

                    {/* map filter modes */}
                    <div className="filter-modes" style={{ display: isFiltersOpen ? "block" : "none" }}>
                        
                        {/* view mode options */}
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


                        {/* barangay filter */}
                        <div className="barangay-filter">
                            <h4>Barangay</h4>
                            <select 
                                value={selectedBarangay} 
                                onChange={(e) => setSelectedBarangay(e.target.value)}
                                className="form-control"
                            >
                                <option value="">All Barangays</option>
                                {barangays.map((barangay) => (
                                    <option key={barangay} value={barangay}>
                                        {barangay}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* FP method filter */}
                        <div className="fp-method-filter">
                            <h4>FP Method</h4>
                            <select 
                                value={selectedFPMethod} 
                                onChange={(e) => setSelectedFPMethod(e.target.value)}
                                className="form-control"
                            >
                                <option value="all">All Methods</option>
                                {fpmethods.map((fpmethod) => (
                                    <option key={fpmethod} value={fpmethod}>
                                        {fpmethod}
                                    </option>
                                ))}
                            </select>                       
                        </div>
                    </div>
                </div>

                {/* map legend */}
                <div className="map-legend">
                    <div className="legend-title">
                        <h3>Map Legend</h3>
                        {/* <button><i className="fa-solid fa-xmark"></i></button> */}
                    </div> 
                    
                    {/* legend items */}
                    <ul>
                        <p><i className="fa-solid fa-circle" style={{ color: '#FB2C36' }}></i> Short-Acting - Modern</p>
                        <p><i className="fa-solid fa-circle" style={{ color: '#2B7FFF' }}></i> Long-Acting - Modern</p>
                        <p><i className="fa-solid fa-circle" style={{ color: '#00BC7D' }}></i> Natural - Modern</p>
                        <p><i className="fa-solid fa-circle" style={{ color: '#6d2d00' }}></i> Traditional</p>
                        <p><i className="fa-solid fa-circle" style={{ color: '#696969' }}></i> No Method</p>
                    </ul>
                </div>

                {/* map controls */}
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
                    {/* LAYER TOGGLE BUTTON WITH WRAPPER */}
                    <div className="layer-control-wrapper" style={{ position: 'relative' }}>
                    <button 
                        onClick={() => setIsLayerMenuOpen(prev => !prev)} 
                        title="Map Layers"
                        className={isLayerMenuOpen ? 'active' : ''}
                    >
                        <i className="fa-solid fa-layer-group"></i>
                    </button>

                    {/* FLOATING MENU POPUP */}
                    {isLayerMenuOpen && (
                        <div className="layer-menu-popup">
                        <h4>Map Styles</h4>
                        <div className="layer-options">
                            {[
                            { id: 'standard', name: 'Standard', icon: 'fa-map' },
                            { id: 'light', name: 'Light', icon: 'fa-sun' },
                            { id: 'dark', name: 'Dark', icon: 'fa-moon' },
                            { id: 'satellite', name: 'Satellite', icon: 'fa-globe' }
                            ].map((item) => (
                            <button
                                key={item.id}
                                className={`layer-option-btn ${activeLayer === item.id ? 'selected' : ''}`}
                                onClick={() => {
                                setActiveLayer(item.id);
                                setIsLayerMenuOpen(false); // Kusa magsasara pag pumili
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

                {/* information container */}
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

                {/* map container */}
                <div className="map-container">
                    <MapDisplay 
                        families={filteredFamilies} 
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
                    families={family}
                    barangays={barangays}
                    mapRef={mapRef}
                    onSelectBarangayForExport={(bgy) => setSelectedBarangay(bgy)}
                />
            </div>
        </>
    );
} 

export default GisMap;