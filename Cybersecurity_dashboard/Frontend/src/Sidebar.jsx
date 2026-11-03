// Import the icons for the menu
import { FaGlobe } from "react-icons/fa";
import { IoMdStats } from "react-icons/io";
import { LuNotebookPen } from "react-icons/lu";
// Import the link tool of the router (it also knows which page is open)
import { NavLink } from 'react-router-dom';


// Side menu with the logo and the links to the pages
function Sidebar(){

   return (
  <div className="sidebar">
    {/* Logo and name of the dashboard */}
    <div className="logo">
      <img src="lock.png" alt="Logo" />
      <h2>CYBERATTACK DASHBOARD</h2>
    </div>
    <hr />

    {/* Link to the charts page */}
    <div className="selection">
      {/* `end` means this link is active only on the exact "/" page */}
      {/* The class "active" is added when this page is open */}
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        <IoMdStats className="graph-icon" />
        <b>VISUALIZATION</b>
      </NavLink>
    </div>
    <hr className="separator" />

    {/* Link to the statistics page */}
    <div className="selection">
      <NavLink to="/Stats" className={({ isActive }) => (isActive ? 'active' : '')}>
        <LuNotebookPen className="stats-icon" />
        <b>STATISTICS</b>
      </NavLink>
    </div>
    <hr className="separator" />

    {/* Link to the map page */}
    <div className="selection">
      <NavLink to="/Geolocation" className={({ isActive }) => (isActive ? 'active' : '')}>
        <FaGlobe className="globe-icon" />
        <b>GEOLOCATION</b>
      </NavLink>
    </div>
    <hr className="separator" />
  </div>
);


}
export default Sidebar