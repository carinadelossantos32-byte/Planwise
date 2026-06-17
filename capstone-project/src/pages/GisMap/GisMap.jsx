import "./gis-map.css"

import React, { useState, useEffect } from 'react';

function GisMap(){

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
                        <i className="fa-solid fa-chevron-up"></i>        
                    </div>

                    {/* map filter modes */}
                    <div className="filter-modes">

                        {/* view mode options */}
                        <div className="view-mode">
                            <h4>View Mode</h4>
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
                            <select name="barangay">
                                <option value="">Select Barangay</option>
                                <option value="barangay1">Barangay 1</option>
                                <option value="barangay2">Barangay 2</option>
                                <option value="barangay3">Barangay 3</option>
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
                        <p><i className="fa-solid fa-circle" style={{ color: '#FB2C36' }}></i> Active FP User Location</p>
                        <p><i className="fa-solid fa-circle" style={{ color: '#00BC7D' }}></i> New Acceptor &#40;This Month&#41;</p>
                        <p><i className="fa-solid fa-square" style={{ color: '#2B7FFF' }}></i> Service Delivery Point</p>
                        <p><i className="fa-solid fa-square " style={{ color: '#AD46FF' }}></i> High Coverage Area &#40;&gt;90%&#41;</p>
                        <p><i className="fa-solid fa-square " style={{ color: '#FF6900' }}></i> Medium Coverage Area &#40;70-90%&#41;</p>
                        <p><i className="fa-solid fa-square " style={{ color: '#FB2C36' }}></i> Low Coverage Area &#40;&lt;70%&#41;</p>

                    </ul>
                </div>

                {/* map controls */}
                <div className="map-controls">
                    <button><i className="fa-solid fa-magnifying-glass-plus"></i></button>
                    <button><i className="fa-solid fa-magnifying-glass-minus"></i></button>
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
                    <p>Map will be displayed here</p>
                </div>
            </div>
        </>
    )
} export default GisMap;