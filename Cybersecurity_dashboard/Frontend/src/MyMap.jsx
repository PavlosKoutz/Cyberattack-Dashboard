// Import React state hook
import { useState } from 'react';
// Import Map components and MapLibre library
import Map, { Marker, Popup } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Dark map style to match the dashboard (Positron is a light style)
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Check if latitude and longitude are valid numbers
const hasCoords = (item) =>
  Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng));

// Main map component
// It gets a list of locations and shows them as markers on the map
const MyMap = ({ coordinatesList = [] }) => {
  // Save the location the mouse is over (null means no location)
  const [ipLocation, setIpLocation] = useState(null);

  return (
    <div className="mapContainer">
      {/* Box around the map with rounded corners */}
      <div
        style={{
          height: '100%',
          width: '100%',
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
        }}
      >
        <Map
          mapLib={maplibregl}
          // Show the world only once (no repeated copies)
          renderWorldCopies={false}
          // Start with a zoomed out view of the world
          initialViewState={{ longitude: 0, latitude: 20, zoom: 1.2 }}
          mapStyle={MAP_STYLE}
        >
          {/* Show a marker for each item that has valid coordinates */}
          {coordinatesList.filter(hasCoords).map((item, index) => (
            <Marker
              // Use the IP as the key, or the index if there is no IP
              key={item.ip_address || item.ip || index}
              latitude={Number(item.lat)}
              longitude={Number(item.lng)}
              anchor="center"
            >
              <div
                className="attackMarker"
                // Show the popup when the mouse enters the marker
                onMouseEnter={() => setIpLocation(item)}
                // Hide the popup when the mouse leaves the marker
                onMouseLeave={() => setIpLocation(null)}
                
              />
            </Marker>
          ))}

          {/* Show the popup only if a marker is selected */}
          {ipLocation && (
            <Popup
              className="attackPopup"
              longitude={Number(ipLocation.lng)}
              latitude={Number(ipLocation.lat)}
              anchor="top"
              offset={12}
              // Clear the selected location when the popup closes
              onClose={() => setIpLocation(null)}
              closeOnClick={false}
              closeButton={false}
            >
              {/* IP address */}
              <div className="attackPopupIp">{ipLocation.ip_address || ipLocation.ip}</div>
             {/* City and country */}
             <div className="attackPopupPlace">{ipLocation.city}, {ipLocation.country}</div>
             {/* VPN or privacy info */}
             <div className="attackPopupVPN">{ipLocation.privacy}</div>
              
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
};

export default MyMap;