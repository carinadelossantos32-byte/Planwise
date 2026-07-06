import "./gis-map.css"

import React, { useState, useEffect } from 'react';
import MapDisplay from "../../components/MapDisplay/MapDisplay";
import { useMap } from 'react-leaflet';

function GisMap(){
    const [isFiltersOpen, setIsFiltersOpen] = useState(true);

    const [families] = useState([
        { id: 1, name: "Santos", lat: 14.5995, lng: 120.9842, method: "Pills", barangay: "San Juan" },
        { id: 2, name: "Cruz", lat: 14.6010, lng: 120.9890, method: "Implant", barangay: "San Juan" },
        { id: 3, name: "Reyes", lat: 14.6030, lng: 120.9820, method: "Calendar", barangay: "San Juan" },
        { id: 4, name: "Garcia", lat: 14.6050, lng: 120.9850, method: "No Method", barangay: "San Juan" },
        { id: 5, name: "De la Cruz", lat: 14.6070, lng: 120.9870, method: "BBT", barangay: "San Juan" },
    ]);

    const [zoom, setZoom] = useState(13);

    const barangays = [
        "Anilao", "Atlag", "Babatnin", "Bagna", "Bagong Bayan", "Balayong", "Balite", 
        "Bangkal", "Barihan", "Bulihan", "Bungahan", "Caingin", "Calero", "Caliligawan", 
        "Canalate", "Caniogan", "Catmon", "Cofradia", "Dakila", "Guinhawa", "Liang", 
        "Ligas", "Longos", "Look 1st", "Look 2nd", "Lugam", "Mabolo", "Mambog", 
        "Masile", "Matimbo", "Mojon", "Namayan", "Niugan", "Pamarawan", "Panasahan", 
        "Pinagbakahan", "San Agustin", "San Gabriel", "San Juan", "San Pablo", 
        "San Vicente", "Santiago", "Santisima Trinidad", "Santor", "Santo Cristo", 
        "Santo Niño", "Santo Rosario", "Sumapang Bata", "Sumapang Matanda", "Taal"
    ];

    const barangayCoordinates = {
        "Anilao": { lat: 14.8422, lng: 120.7976 },
        "Atlag": { lat: 14.8294, lng: 120.8214 },
        "Babatnin": { lat: 14.7809, lng: 120.8198 },
        "Bagna": { lat: 14.8251, lng: 120.8226},
        "Bagong Bayan": { lat: 14.8475, lng: 120.8150 }, //continue editing coordinates
        "Balayong": { lat: 14.8642, lng: 120.8256 },
        "Balite": { lat: 14.8590, lng: 120.8341 },
        "Bangkal": { lat: 14.8494, lng: 120.7781 },
        "Barihan": { lat: 14.8654, lng: 120.7967 },
        "Bulihan": { lat: 14.8693, lng: 120.8152 },
        "Bungahan": { lat: 14.8778, lng: 120.8003 },
        "Caingin": { lat: 14.8412, lng: 120.8210 },
        "Calero": { lat: 14.8358, lng: 120.8184 },
        "Caliligawan": { lat: 14.7792, lng: 120.8180 },
        "Canalate": { lat: 14.8386, lng: 120.8254 },
        "Caniogan": { lat: 14.8492, lng: 120.8242 },
        "Catmon": { lat: 14.8533, lng: 120.8172 },
        "Cofradia": { lat: 14.8752, lng: 120.7850 },
        "Dakila": { lat: 14.8587, lng: 120.8465 },
        "Guinhawa": { lat: 14.8532, lng: 120.8306 },
        "Liang": { lat: 14.8443, lng: 120.8348 },
        "Ligas": { lat: 14.8742, lng: 120.8382 },
        "Longos": { lat: 14.8624, lng: 120.7852 },
        "Look 1st": { lat: 14.8550, lng: 120.7932 },
        "Look 2nd": { lat: 14.8584, lng: 120.7915 },
        "Lugam": { lat: 14.8722, lng: 120.8090 },
        "Mabolo": { lat: 14.8536, lng: 120.7712 },
        "Mambog": { lat: 14.8700, lng: 120.7745 },
        "Masile": { lat: 14.7892, lng: 120.8224 },
        "Matimbo": { lat: 14.8214, lng: 120.8303 },
        "Mojon": { lat: 14.8690, lng: 120.8244 },
        "Namayan": { lat: 14.7742, lng: 120.8010 },
        "Niugan": { lat: 14.8456, lng: 120.7905 },
        "Pamarawan": { lat: 14.7505, lng: 120.8188 },
        "Panasahan": { lat: 14.8212, lng: 120.8192 },
        "Pinagbakahan": { lat: 14.8845, lng: 120.7912 },
        "San Agustin": { lat: 14.8445, lng: 120.8032 },
        "San Gabriel": { lat: 14.8415, lng: 120.8080 },
        "San Juan": { lat: 14.8465, lng: 120.8124 },
        "San Pablo": { lat: 14.8482, lng: 120.8002 },
        "San Vicente": { lat: 14.8424, lng: 120.8142 },
        "Santiago": { lat: 14.8290, lng: 120.8246 },
        "Santisima Trinidad": { lat: 14.8646, lng: 120.8014 },
        "Santor": { lat: 14.8856, lng: 120.8106 },
        "Santo Cristo": { lat: 14.8510, lng: 120.8092 },
        "Santo Niño": { lat: 14.8468, lng: 120.8185 },
        "Santo Rosario": { lat: 14.8498, lng: 120.8122 },
        "Sumapang Bata": { lat: 14.8632, lng: 120.8188 },
        "Sumapang Matanda": { lat: 14.8614, lng: 120.8088 },
        "Taal": { lat: 14.8710, lng: 120.8492 }
    };

    const [selectedBarangay, setSelectedBarangay] = useState("");
    const currentCenter = barangayCoordinates[selectedBarangay] || null;

    function ChangeMapView({ center }) {
        const map = useMap();
        if (center) {
            map.setView([center.lat, center.lng], 16); 
        }
        return null;
    }

    return(
        <>
            <div className="page-header">
                <h1>Geographic Coverage Map</h1>
                <div className="gis-header-right">
                    <div className="search-bar">
                        <i className="fa-brands fa-sistrix"></i>
                        <input type="text" placeholder="Search location..." />
                    </div>
                    <button> <i className="fa-solid fa-arrow-up-from-bracket"></i> Export Map</button>
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
                            className={isFiltersOpen ? 'active' : ''} // Adds the active class when open
                            >
                            <i className="fa-solid fa-chevron-up"></i>
                        </button>
                    </div>

                    {/* map filter modes */}
                    <div className="filter-modes" style={{ display: isFiltersOpen ? "block" : "none" }}>
                    

                        {/* view mode options */}
                        <div className="view-mode">
                            <div className="view-mode-options">
                                <div id="markers">
                                    <i className="fa-solid fa-location-dot"></i>
                                    <p>Markers</p>
                                </div>
                                <div id="heatmap">
                                    <i className="fa-solid fa-arrow-trend-up"></i>
                                    <p>Heatmap</p>
                                </div>
                                <div id="clusters">
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
                                <option value="">Select Barangay</option>
                                {barangays.map((barangay) => (
                                    <option key={barangay} value={barangay}>
                                        {barangay}
                                    </option>
                                ))}
                            </select>
                            {/* <i className="fa-solid fa-angle-down"></i> */}
                        </div>

                        {/* FP method filter */}
                        <div className="fp-method-filter">
                            <h4>FP Method</h4>
                            <select name="fp-method">
                                <option value="">Select FP Method</option>
                                <option value="method1">Method 1</option>
                                <option value="method2">Method 2</option>
                                <option value="method3">Method 3</option>
                            </select>
                        </div>

                        {/* user type filter */}
                        <div className="user-type-filter">
                            <h4>User Type</h4>
                            <div className="checkbox-group">
                                <input type="checkbox" id="current-users" name="userType" value="current" />
                                <label htmlFor="current-users">Current Users</label>
                            </div>

                            <div className="checkbox-group">
                                <input type="checkbox" id="new-acceptors" name="userType" value="new" />
                                <label htmlFor="new-acceptors">New Acceptors</label>
                            </div>

                            <div className="checkbox-group">
                                <input type="checkbox" id="dropouts" name="userType" value="dropouts" />
                                <label htmlFor="dropouts">Dropouts</label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* map legend */}
                <div className="map-legend">
                    <div className="legend-title">
                        <h3>Map Legend</h3>
                        <button><i className="fa-solid fa-xmark"></i></button>
                    </div> 
                    
                    {/* legend items */}
                    <ul>
                        <p><i className="fa-solid fa-circle" style={{ color: '#FB2C36' }}></i> Short-Acting - Modern</p>
                        <p><i className="fa-solid fa-circle" style={{ color: '#2B7FFF' }}></i> Long-Acting - Modern</p>
                        <p><i className="fa-solid fa-circle" style={{ color: '#00BC7D' }}></i> Natural - Modern</p>
                        <p><i className="fa-solid fa-circle " style={{ color: '#b14b02' }}></i> Traditional</p>
                        <p><i className="fa-solid fa-circle " style={{ color: '#696969' }}></i> No Method</p>

                    </ul>
                </div>

                {/* map controls */}
                <div className="map-controls">
                    <button 
                        onClick={() => setZoom(prev => prev < 18 ? prev + 1 : prev)} disabled={zoom == 18}><i className="fa-solid fa-magnifying-glass-plus"></i></button>
                    <button 
                    onClick={() => setZoom(prev => prev > 3 ? prev - 1 : prev)} disabled={zoom == 3}><i className="fa-solid fa-magnifying-glass-minus"></i></button>
                    <button><i className="fa-solid fa-location-arrow"></i></button>
                    <button><i className="fa-solid fa-up-right-and-down-left-from-center"></i></button>
                    <button><i className="fa-solid fa-layer-group"></i></button>
                </div>

                {/* information container */}
                <div className="information-container">
                    <i className="fa-solid fa-circle-info"></i>
                    <p>Click on a barangay or use the filter to view detailed statistics.</p>
                </div>

                {/* map container */}
                <div className="map-container">
                    <MapDisplay families={families} 
                    currentZoom={zoom} 
                    onZoomChange={setZoom}
                    barangayCenter={currentCenter}/>
                </div>
            </div>
        </>
    )
} export default GisMap;