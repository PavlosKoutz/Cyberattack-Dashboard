import { useEffect, useState } from 'react';
import { socket } from './socket';



const Stats = () => {


  const [totalAttempts, setTotalAttempts] = useState([]);
  const [totalAttacks, setTotalAttacks] = useState([]);
  const [topChars, setTopChars] = useState([]);
  const [totalChars, setTotalChars] = useState([]);
  const [attackTime, setAttackTime] = useState([]);
  const [totalCommands, setTotalCommands] = useState([]);
  const [VPN_detection, setVPN_detection] = useState([]);
  const [topCMD, setTopCMD] = useState([]);
  const [effectiveness, setEffectiveness] = useState(0);
  const [usernameVariety, setUsernameVariety] = useState([])
  const [refresh, setRefresh] = useState(0);


  useEffect(() => {
    let timer;
    const handleUpdate = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setRefresh((r) => r + 1), 300);
    };
    socket.on('attackUpdate', handleUpdate);
    socket.on('connect', handleUpdate);   // refetch after reconnect
    return () => {
      clearTimeout(timer);
      socket.off('attackUpdate', handleUpdate);
      socket.off('connect', handleUpdate);
    };
  }, []);

  // Fetch data (re-runs when refresh changes)
  useEffect(() => {
    let isMounted = true;
    fetch('/api/index')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;

        if (data.totalPasswordsCount) {

          setTotalAttempts(data.totalPasswordsCount);
        }

        if (data.totalAttackCount) {

          setTotalAttacks(data.totalAttackCount);
        }

        if (data.characterList) {
          const passwordChars = data.characterList.flatMap((item) =>
            (item.password_attempt || '').split('')
          );

          const counts = new Map();
          for (const c of passwordChars) {
            counts.set(c, (counts.get(c) || 0) + 1);
          }

          const top5chars = [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

          setTotalChars(passwordChars.length);
          setTopChars(top5chars)

        }

        if (data.attackSpeed) {

          setAttackTime(data.attackSpeed.avg_time);
        }

        if (data.totalCommandsCount) {

          setTotalCommands(data.totalCommandsCount);
        }

        if (Array.isArray(data.privacyDetection)) {
          const items = data.privacyDetection;

          const countOf = (status) =>
            Number(items.find((item) => item.status === status)?.count) || 0;

          const detected = countOf("VPN detected");
          const notDetected = countOf("VPN not detected");

          const total = detected + notDetected;

          setVPN_detection(total ? (detected / total) * 100 : 0);
        }

        if (data.topCommands) {


          setTopCMD(data.topCommands)

        }


        if (Array.isArray(data.interaction)) {
          const items = data.interaction;
          const notInteracted = items.filter((item) => item.command == null).length;

          setEffectiveness((items.length - notInteracted) / items.length * 100);
        }
        if (data.usernameCount) {


          setUsernameVariety(data.usernameCount.length)

        }

      })
      .catch((err) => console.error('Error fetching data:', err));
    return () => { isMounted = false; };
  }, [refresh]);

  const vpnPercent = Math.min(100, Math.max(0, Number(VPN_detection) || 0));

  return <div className="bento">
    {/* A: hero */}
    <div className="tile tile--hero">
      <span className="tile__label">Total attempts</span>
      <b className="tile__value" >{totalAttempts}</b>
      <span className="tile__note">Count of inserted passwords</span>
    </div>

    {/* B, C: small */}
    <div className="tile">
      <span className="tile__label">Username variety</span>
      <b className="tile__value">{usernameVariety}</b>
      <span className="tile__note">Total distinct usernames</span>
    </div>
    <div className="tile">
      <span className="tile__label">Total attacks</span>
      <b className="tile__value">{totalAttacks}</b>
      <span className="tile__note">Count of unique IPs</span>
    </div>

    {/* D: wide with value + meter */}
    <div className="tile tile--wide">
      <span className="tile__label">Effectiveness (interaction after access)</span>
      <b className="tile__value">{effectiveness.toFixed(2)}%</b>
      <div className="meter meter--lg">
        <i style={{ '--w': `${effectiveness}%` }} />
      </div>
    </div>

    {/* E: tall list */}
    <div className="tile tile--tall">
      <span className="tile__label">Character frequency</span>
      <div className="rows">
        {topChars.map(([char, count]) => (
          <div key={char}>
            <div className="rows__line">
              <span>{char === ' ' ? '␣' : char}</span>
              <span>{((count / (totalChars || 1)) * 100).toFixed(1)}%</span>
            </div>
            <div className="meter">
              <i style={{ '--w': `${(count / totalChars) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* F: wide with value + meter */}

    <div className="tile tile--wide">
      <span className="tile__label">VPN users</span>
      <b className="tile__value">{vpnPercent.toFixed(2)}%</b>
      <div className="meter meter--lg">
        <i style={{ '--w': `${vpnPercent}%` }} />
      </div>
    </div>

    {/* G: tall list */}
    <div className="tile tile--tall">
      <span className="tile__label">Command frequency</span>
      <div className="rows">
        {topCMD.map(({ command, count }) => {
          const pct = (count / totalCommands) * 100;
          return (
            <div key={command}>
              <div className="rows__line">
                <span>{command === ' ' ? '␣' : command}</span>
                <span>{pct.toFixed(1)}%</span>
              </div>
              <div className="meter">
                <i style={{ '--w': `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>


    {/* H, I: small */}
    <div className="tile">
      <span className="tile__label">Fastest Attack</span>
      <b className="tile__value">{typeof attackTime === 'number' && attackTime > 0 ? `${(1 / attackTime).toFixed(2)} /s` : ''}</b>
      <span className="tile__note">Attempts per second</span>
    </div>


    <div className="tile">
      <span className="tile__label">Total commands</span>
      <b className="tile__value">{totalCommands}</b>
      <span className="tile__note">Count of commands typed</span>
    </div>
  </div>
};




export default Stats;