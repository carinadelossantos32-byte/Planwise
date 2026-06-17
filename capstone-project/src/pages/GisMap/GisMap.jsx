import "./gis-map.css"

function GisMap(){
    return(
        <>
            <div className="page-header">
                <h1>Geographic Coverage Map</h1>
                <div className="gis-header-right">
                    <div className="search-bar">
                        <i class="fa-brands fa-sistrix"></i>
                        <input type="text" placeholder="Search location..." />
                    </div>
                    <button> <i class="fa-solid fa-arrow-up-from-bracket"></i> Export Map</button>
                </div>
            </div>

            <div className="map-filters">
                <div className="filters-header">
                    <div className="filters-header-left">
                        <i class="fa-solid fa-filter"></i>
                        <h3>Map Filters</h3>
                    </div>
                    <i class="fa-solid fa-chevron-up"></i>        
                </div>
                <div className="filter-modes">
                    <div className="view-mode">
                        <h3>View Mode</h3>
                        <div className="view-mode-options">
                            <div id="markers">
                                <i class="fa-solid fa-location-dot"></i>
                                <p>Markers</p>
                            </div>
                            <div id="heatmap">
                                <i class="fa-solid fa-arrow-trend-up"></i>
                                <p>Heatmap</p>
                            </div>
                            <div id="clusters">
                                <i class="fa-regular fa-circle"></i>
                                <p>Clusters</p>
                            </div>
                        </div>
                    </div>

                    <div className="barangay-filter">
                        <h3>Barangay</h3>
                        <select name="barangay" id="barangay-select">
                            <option value="" disabled selected>Select Barangay</option>
                            <option value="barangay1">Barangay 1</option>
                            <option value="barangay2">Barangay 2</option>
                            <option value="barangay3">Barangay 3</option>
                        </select>
                        <i class="fa-solid fa-angle-down"></i>
                    </div>

                    <div className="fp-method-filter">
                        <h3>FP Method</h3>

                    </div>

                    <div className="user-type-filter">
                        <h3>User Type</h3>

                    </div>
                </div>

            </div>

            <div className="map-legend">
                <div className="legend-title">
                    <h3>Map Legend</h3>
                    <button><i class="fa-solid fa-xmark"></i></button>
                </div> 
                
                <ul>
                    <p><i class="fa-solid fa-circle" style={{ color: '#FB2C36' }}></i> Active FP User Location</p>
                    <p><i class="fa-solid fa-circle" style={{ color: '#00BC7D' }}></i> New Acceptor &#40;This Month&#41;</p>
                    <p><i class="fa-solid fa-square" style={{ color: '#2B7FFF' }}></i> Service Delivery Point</p>
                    <p><i class="fa-solid fa-square " style={{ color: '#AD46FF' }}></i> High Coverage Area &#40;&gt;90%&#41;</p>
                    <p><i class="fa-solid fa-square " style={{ color: '#FF6900' }}></i> Medium Coverage Area &#40;70-90%&#41;</p>
                    <p><i class="fa-solid fa-square " style={{ color: '#FB2C36' }}></i> Low Coverage Area &#40;&lt;70%&#41;</p>

                </ul>
            </div>

            <div className="map-container">
                <div className="map-placeholder">
                    <p>Map will be displayed here.</p>
                </div>
            </div>

            <div className="map-controls">
                <button><i class="fa-solid fa-magnifying-glass-plus"></i></button>
                <button><i class="fa-solid fa-magnifying-glass-minus"></i></button>
                <button><i class="fa-solid fa-location-arrow"></i></button>
                <button><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button>
                <button><i class="fa-solid fa-layer-group"></i></button>
            </div>

            <div className="information-container">
                <i class="fa-solid fa-circle-info"></i>
                <p>Click on a barangay or use the filter to view detailed statistics.</p>
            </div>
        </>
    )
} export default GisMap;