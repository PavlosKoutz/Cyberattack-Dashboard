// Import React hooks
import { useEffect, useState } from 'react';
import './index.css';
// Import the chart widgets
import VerticalBarWidget from './VerticalBarWidget';
import HorizontalBarWidget from './HorizontalBarWidget';
import PieWidget from './PieWidget';
import RadarWidget from './RadarWidget';
import Sidebar from './Sidebar';
// Import the router tools to switch between pages
import { Routes, Route } from 'react-router-dom';
import Stats from './Stats';
import Geolocation from './Geolocation';
import AreaWidget from './AreaWidget';
import PieWidget2 from './PieWidget2';
// Import the socket that gets live updates from the server
import { socket } from './socket';
import PlaylogWidget from './PlaylogWidget';
import ScatterWidget from './ScatterWidget';



// Main dashboard page. It loads the data and shows all the charts.
function Dashboard() {
  // Data for each chart
  const [ipList, setIpList] = useState([]);
  const [passwordList, setPasswordList] = useState([]);
  const [dayList, setDayList] = useState([]);
  const [hourList, setHourList] = useState([]);
  const [characterList, setCharacterList] = useState([]);
  const [metricsList, setMetricsList] = useState([]);
  // A number that goes up when we want to load the data again
  const [refresh, setRefresh] = useState(0);
  const [latestPlaylog, setLatestPlaylog] = useState(null);
  const [attackOverTime, setAttackOverTime] = useState(null);


  // Listen for live updates from the server
  useEffect(() => {
    let timer;
    // When an update comes, wait 500 ms and then load the data again
    // (many updates close together will cause only one reload)
    const handleUpdate = () => {
      console.log('attackUpdate received, refetching');
      clearTimeout(timer);
      timer = setTimeout(() => setRefresh((r) => r + 1), 500);
    };

    // Show messages in the console about the connection
    socket.on('connect', () => console.log('socket connected', socket.id));
    socket.on('connect_error', (e) => console.error('socket error:', e.message));
    socket.on('attackUpdate', handleUpdate);

    // Clean up when the component closes
    return () => {
      clearTimeout(timer);
      socket.off('attackUpdate', handleUpdate);
    };
  }, []);
  // Load the data from the server (runs at the start and every time `refresh` changes)
  useEffect(() => {
    // Used to avoid saving data after the component is closed
    let isMounted = true;

    fetch('/api/index')
      .then((res) => {
        // Stop with an error if the server did not answer correctly
        if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        // Do nothing if the component is already closed
        if (!isMounted) return;

        // Top IP addresses: make sure the count is a number
        if (data.ipList) {
          const formattedIps = data.ipList.map((item) => ({
            ip_address: item.ip_address,
            count: Number(item.count) || 0,
          }));
          setIpList(formattedIps);
        }

        // Most used passwords: make sure the count is a number
        if (data.passwordList) {
          const formattedPasswords = data.passwordList.map((item) => ({
            password_attempt: item.password_attempt,
            count: Number(item.count) || 0,
          }));
          setPasswordList(formattedPasswords);
        }

        // Attacks per day of the week (in percent)
        if (data.dayList) {

          // Names of the days, in the order we want to show them
          const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


          // Count how many attacks happened on each day
          const dayCounts = data.dayList.reduce((acc, item) => {

            // Get the day name using the time zone of the attack
            // (Athens time is the default)
            const dayName = new Intl.DateTimeFormat("en-US", {
              weekday: "long",
              timeZone: item.timezone || "Europe/Athens",
            }).format(new Date(item.attack_timestamp));



            // Add 1 to the count of this day
            acc[dayName] = (acc[dayName] || 0) + 1;
            return acc;
          }, {});


          // Change the counts to percent of all attacks
          const formattedDays = daysOfWeek.map((day) => ({
            name: day,
            value: data.dayList.length ? ((dayCounts[day] || 0) / data.dayList.length) * 100 : 0,
          }));

          setDayList(formattedDays);

        }

        // Attacks per hour of the day (in groups of 3 hours)
        if (data.hourList) {

          // Labels for the chart (the last one closes the circle)
          const hourLabels = ["00:00", "3:00", "6:00", "9:00", "12:00", "15:00", "18:00", "21:00", "00:00"];
          // Start with a zero count for each label
          const counts = new Array(hourLabels.length).fill(0);
          data.hourList.forEach((item) => {
            // Get the hour (0-23) using the time zone of the attack
            const hour = parseInt(
              new Intl.DateTimeFormat("en-GB", {
                hour: "numeric",
                hourCycle: "h23",
                timeZone: item.timezone || "Europe/Athens",
              }).format(new Date(item.attack_timestamp)),
              10
            );


            // Find the 3-hour group that has this hour
            for (let i = 0; i < hourLabels.length; i++) {
              const start = i * 3;
              const end = start + 3;

              // If the hour is inside this group, add 1 and stop looking
              if (hour >= i * 3 && hour < i * 3 + 3) {
                counts[i] += 1;
                break;
              }
            }
          });

          // The last "00:00" point has the same value as the first one
          counts[hourLabels.length - 1] = counts[0];

          setHourList(hourLabels.map((label, i) => ({ name: label, value: counts[i] })));

        }

        // Count the types of characters used in the passwords
        if (data.characterList) {

          // Small functions that check the type of one character
          const isUppercase = (char) => /[A-Z]/.test(char);
          const isLowercase = (char) => /[a-z]/.test(char);
          const isDigit = (char) => /[0-9]/.test(char);
          // Counters for each type
          let uppercaseCount = 0;
          let lowercaseCount = 0;
          let digitCount = 0;
          let symbolCount = 0;


          // Put all the characters of all the passwords in one list
          const passwordChars = data.characterList.flatMap((item) =>
            (item.password_attempt || '').split('')
          );


          // Check every character and add 1 to the right counter
          for (let i = 0; i < passwordChars.length; i++) {



            if (isUppercase(passwordChars[i])) {

              uppercaseCount++;

            }
            else if (isLowercase(passwordChars[i])) {

              lowercaseCount++;

            }
            else if (isDigit(passwordChars[i])) {

              digitCount++;

            }

            // Everything else is a symbol
            else {
              symbolCount++;
            }

          }
          // Make the list that the pie chart needs
          const charTypeSummary = [
            { name: 'Uppercase', value: uppercaseCount },
            { name: 'Lowercase', value: lowercaseCount },
            { name: 'Digits', value: digitCount },
            { name: 'Symbols', value: symbolCount },
          ];

          setCharacterList(charTypeSummary)

        }


        // Check how strong the passwords are
        if (data.characterList) {

          // Counters for each strength level
          let veryWeak = 0;
          let weak = 0;
          let moderate = 0;
          let strong = 0;


          data.characterList.forEach((item) => {
            // Get the password (use an empty text if it is missing)
            const pwd = item?.password_attempt || "";
            const length = pwd.length;

            // Check which types of characters the password has
            const hasDigit = /\d/.test(pwd);
            const hasUppercase = /[A-Z]/.test(pwd);
            const hasLowercase = /[a-z]/.test(pwd);
            const hasSpecialChar = /[^a-zA-Z0-9\s]/.test(pwd);

            // Count how many different characters can be used in this password
            const range =
              (hasUppercase ? 26 : 0) +
              (hasLowercase ? 26 : 0) +
              (hasDigit ? 10 : 0) +
              (hasSpecialChar ? 32 : 0);

            // Calculate the password entropy (a number for how hard it is to guess)
            const entropy = range > 0 ? length * Math.log2(range) : 0;

            // Put the password in a group based on its entropy
            if (entropy < 40) {
              veryWeak++;
            } else if (entropy < 60) {
              weak++;
            } else if (entropy < 80) {
              moderate++;
            } else {
              strong++;
            }
          });


          // Make the list that the pie chart needs
          const passwordStrength = [
            { name: "Very Weak", value: veryWeak },
            { name: "Weak", value: weak },
            { name: "Moderate", value: moderate },
            { name: "Strong", value: strong },
          ];

          setMetricsList(passwordStrength);
        }
        // Save the latest recorded attacker session
        if (data.latestPlaylog) {
          setLatestPlaylog(data.latestPlaylog);
        }


        // Check if the privacy text means that the attacker uses a VPN, proxy or Tor
        const isVpn = (privacy) => {
          // Make the text lowercase and remove extra spaces
          const p = String(privacy ?? '').trim().toLowerCase();
          // Empty text or words like "not" or "unavailable" mean no VPN
          if (!p || p.includes('not') || p.includes('unavailable')) return false;
          return p.includes('vpn') || p.includes('proxy') || p.includes('tor') || p === 'yes' || p === 'true';
        };

        // Data for the scatter chart (attacks over time for each IP)
        if (data.scatter) {
          const scatterPlot = data.scatter.map((item) => ({
            ip_address: item.ip_address,
            count: Number(item.count) || 0,
            time: Number(item.time) || 0,
            vpn: isVpn(item.privacy),
          }));
          setAttackOverTime(scatterPlot);
          console.log(scatterPlot)
        }

      })
      // Show an error in the console if the request fails
      .catch((err) => console.error('Error fetching data:', err));

    // Clean up when the component closes or before the next load
    return () => {
      isMounted = false;
    };

  }, [refresh]);

  return (
    <>




      {/* Grid with all the charts */}
      <div className="graphContainer">

        <VerticalBarWidget data={ipList} />
        <PieWidget data={characterList} />
        <HorizontalBarWidget data={passwordList} />
        <AreaWidget data={hourList} />
        <RadarWidget data={dayList} />
        <ScatterWidget data={attackOverTime} />
        <PieWidget2 data={metricsList} />
        <PlaylogWidget latest={latestPlaylog} />



      </div>


    </>
  );
}

// Main page: a sidebar on the side and a page that changes with the URL
export default function Visualization() {
  return (
    <div className="container">
      <Sidebar />


      {/* Choose which page to show based on the URL */}
      <Routes>

        <Route path="/" element={<Dashboard />} />
        <Route path="/Stats" element={<Stats />} />
        <Route path="/Geolocation" element={<Geolocation />} />
      </Routes>
    </div>

  );
}