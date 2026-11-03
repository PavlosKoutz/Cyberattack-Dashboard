// Import React hooks and components
import { useEffect, useState } from 'react';
import MyMap from './MyMap';
import { socket } from './socket';
import './index.css';

// Main Geolocation component function
const Geolocation = () => {
  // State for storing the list of coordinates and refresh trigger
  const [coordinatesList, setCoordinatesList] = useState([]);
  const [refresh, setRefresh] = useState(0);

  // Listen for socket events to trigger data updates
  useEffect(() => {
    let timer;
    // Function to handle updates with a small delay (debounce)
    const handleUpdate = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setRefresh((r) => r + 1), 300);
    };
    // Register socket listeners for updates and reconnection
    socket.on('attackUpdate', handleUpdate);
    socket.on('connect', handleUpdate);   // refetch after reconnect
    // Clean up socket listeners on component unmount
    return () => {
      clearTimeout(timer);
      socket.off('attackUpdate', handleUpdate);
      socket.off('connect', handleUpdate);
    };
  }, []);

  // Fetch location data from the API when refresh state changes
  useEffect(() => {
    let isMounted = true;
    fetch('/api/index')
      .then((res) => {
        // Check if the response is successful
        if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        // Prevent state updates if the component is unmounted
        if (!isMounted) return;
        // Format and clean up the coordinate data
        const formatted = (data.coordinatesList || [])
          .map((item) => ({
            ip_address: item.ip_address,
            lat: Number(item.lat),
            lng: Number(item.lon),
            country: item.country,
            city: item.city,
            privacy: item.privacy
          }))
          // Keep only items with valid latitude and longitude numbers
          .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
        setCoordinatesList(formatted);
      })
      .catch((err) => console.error('Error fetching data:', err));
    // Clean up function to set isMounted to false on unmount
    return () => { isMounted = false; };
  }, [refresh]);

  // Render the map component passing the list of coordinates
  return <MyMap coordinatesList={coordinatesList} />;
};

export default Geolocation;