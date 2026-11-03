// Import the database tools (Pool = many connections, Client = one connection)
const { Pool, Client } = require('pg');
// Import Express (it makes the web server and the routes)
const express = require('express');
// Import CORS (it lets other websites call this server)
const cors = require('cors');
// Import the built-in HTTP tool
const http = require('http');
// Import Socket.IO (it sends live updates to the browsers)
const { Server } = require('socket.io');

// Create the Express app and the HTTP server that uses it
const app = express();
const server = http.createServer(app);


// Create the live connection server and let any website connect to it
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Allow other websites to call the routes of this server
app.use(cors());
// Read JSON data that comes in the requests
app.use(express.json());


// Create a pool of database connections
const pool = new Pool({ 
  user: '',
  host: '',
  database: '',
  password: '',
  port: ,
});


// Keeps the timer of the next reconnect (null means no reconnect is waiting)
let listenReconnectTimer = null;

// Connect to Postgres and listen for notifications
async function startPgListener() {
  // Create a new database connection 
  const client = new Client({ 
    user: '',
    host: '',
    database: '',
    password: '',
    port: ,
  });


 // Close the old connection and try to connect again after 2 seconds
const reconnect = () => {
    // Stop if a reconnect is already waiting
    if (listenReconnectTimer) return;
    // Remove old listeners and close the old connection (ignore errors)
    client.removeAllListeners();
    client.end().catch(() => { });
    // Wait 2 seconds, then start the listener again
    listenReconnectTimer = setTimeout(() => {
      listenReconnectTimer = null;
      startPgListener();
    }, 2000);
  };

  // If the connection has an error or closes, try to reconnect
  client.on('error', (err) => {
    console.error('pg listen client error:', err.message);
    reconnect();
  });
  client.on('end', reconnect);

  // Runs when Postgres sends a notification
  client.on('notification', (msg) => {
    console.log('NOTIFY received:', msg.channel, msg.payload,
      '| connected sockets:', io.engine.clientsCount);
    // If the data of the attacks changed, tell all the browsers
    if (msg.channel === 'attack_update') {
      io.emit('attackUpdate', { source: msg.payload });
    }
  });
  try {
    // Connect to Postgres and start listening to the "attack_update" channel
    await client.connect();
    await client.query('LISTEN attack_update');
    console.log('Listening for Postgres notifications');
  } catch (err) {
    // If it fails, try again later
    console.error('Failed to start pg listener:', err.message);
    reconnect();
  }
}

// Start listening to Postgres when the server starts
startPgListener();


// Runs when a browser connects to the socket
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  // Runs when the browser disconnects
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});


// Send the recording (cast) of one attacker session
app.get('/api/sessions/:id/cast', async (req, res) => {
  try {
    // Get the recording from the database using the session id from the URL
    const { rows } = await pool.query(
      'SELECT cast_data FROM playlog WHERE session_id = $1',
      [req.params.id]);
    // If there is no recording, answer "not found" (404)
    if (!rows.length) return res.sendStatus(404);
    // Let the browser keep the recording for 1 hour, and send it as plain text
    res.set('Cache-Control', 'public, max-age=3600')
      .type('text/plain')
      .send(rows[0].cast_data);
  } catch (error) {
    // If something goes wrong, answer with a server error (500)
    console.error('Error executing query:', error.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Send all the data for the dashboard in one answer
app.get('/api/index', async (req, res) => {
  try {
    // Top 5 IP addresses with the most attempts
    const ipFreq = 'SELECT ip_address, COUNT(ip_address) FROM attempt GROUP BY ip_address ORDER BY COUNT(ip_address) DESC LIMIT 5';
    const result_ipFreq = await pool.query(ipFreq);

    // Top 5 most used passwords
    const passwordFreq = 'SELECT password_attempt, COUNT(password_attempt) FROM attempt GROUP BY password_attempt ORDER BY COUNT(password_attempt) DESC LIMIT 5';
    const result_passwordFreq = await pool.query(passwordFreq);

    // Time and time zone of every attempt (used for the day and hour charts)
    const dayFreq = 'SELECT attack_timestamp, timezone FROM attempt';
    const result_dayFreq = await pool.query(dayFreq);

    // All the different passwords with their count (used to count the characters)
    const characterFreq = 'SELECT password_attempt, COUNT(password_attempt) FROM attempt GROUP BY password_attempt ORDER BY COUNT(password_attempt)';
    const result_characterFreq = await pool.query(characterFreq);


    // Location and privacy info of every attacker (used for the map)
    const coordinates = 'SELECT ip_address, lat, lon, country, city, privacy  FROM attacker';
    const result_coordinates = await pool.query(coordinates);

    // Total number of password attempts
    const totalPasswords = 'SELECT COUNT(password_attempt) AS total FROM attempt;';
    const result_totalPasswords = await pool.query(totalPasswords);

    // Total number of attackers (unique IPs)
    const totalAttacks = 'SELECT COUNT(ip_address) AS total FROM attacker;';
    const result_totalAttacks = await pool.query(totalAttacks);

    // Find the fastest attacker.
    // For each IP with more than one attempt, calculate the average time
    // between its attempts, and then keep the smallest one.
    const fastestAttack = `
      SELECT
        (EXTRACT(EPOCH FROM (MAX(attack_timestamp) - MIN(attack_timestamp)))
        / (COUNT(*) - 1))::float8 AS avg_time
      FROM attempt
      GROUP BY ip_address
      HAVING COUNT(*) > 1
      ORDER BY avg_time ASC
      LIMIT 1`;

    const result_fastestAttack = await pool.query(fastestAttack);

    // Total number of commands (without the ones that were not found)
    const totalCommands = `SELECT COUNT(*) AS total FROM command WHERE cmd <> 'NOT FOUND'`;
    const result_totalCommands = await pool.query(totalCommands);

    // The newest recorded session that has at least one event
    const latestPlaylog = `
      SELECT session_id, duration_s, event_count, created_at
      FROM playlog
      WHERE event_count > 0
      ORDER BY created_at DESC
      LIMIT 1`;
    const result_latestPlaylog = await pool.query(latestPlaylog);

    // How many attackers there are for each VPN status
    const privacy = 'SELECT privacy AS status, COUNT(*) AS count FROM attacker GROUP BY privacy';
    const result_privacy = await pool.query(privacy);

    // Top 4 most used commands
    const commandList = `SELECT command, COUNT(command) FROM command WHERE cmd='FOUND' GROUP BY command  ORDER BY COUNT(command) DESC LIMIT 4`;
    const result_commadList = await pool.query(commandList);

    // Get the successful logins and the commands of the same IP.
    const CMDinteraction = `
      SELECT *
      FROM attempt
      FULL OUTER JOIN command
        ON attempt.ip_address = command.ip_address
      WHERE status = 'succeeded'`;

    const result_CMDinteraction = await pool.query(CMDinteraction);


    // Data for the scatter chart.
    // For each IP: number of attempts, time between the first and the last
    // attempt (in seconds), and if it uses a VPN.
    // IPs with unknown VPN status or only one attempt are left out.
    const attackOverTime = `
  SELECT
    attacker.ip_address,
    attacker.privacy,
    COUNT(*) AS count,
    EXTRACT(EPOCH FROM MAX(attempt.attack_timestamp) - MIN(attempt.attack_timestamp)) AS time,
    (attacker.privacy = 'VPN') AS vpn
  FROM attacker
  JOIN attempt
    ON attacker.ip_address = attempt.ip_address
  WHERE attacker.privacy <> 'VPN status unavailable'
  GROUP BY attacker.ip_address, attacker.privacy
  HAVING COUNT(*) > 1`;

    const result_attackOverTime = await pool.query(attackOverTime);

    // All the different usernames
    const usernames = 'SELECT DISTINCT(username)  FROM attempt';
    const result_usernames = await pool.query(usernames);
    

    // Send all the data to the frontend as JSON.
    res.json({
      ipList: result_ipFreq.rows,
      passwordList: result_passwordFreq.rows,
      dayList: result_dayFreq.rows,
      // The hour chart uses the same rows as the day chart
      hourList: result_dayFreq.rows,
      characterList: result_characterFreq.rows,
      coordinatesList: result_coordinates.rows,
      totalPasswordsCount: Number(result_totalPasswords.rows[0].total),
      totalAttackCount: Number(result_totalAttacks.rows[0].total),
      attackSpeed: result_fastestAttack.rows[0],
      totalCommandsCount: Number(result_totalCommands.rows[0].total),
      // Use null if there is no recorded session yet
      latestPlaylog: result_latestPlaylog.rows[0] ?? null,
      privacyDetection: result_privacy.rows,
      topCommands: result_commadList.rows,
      interaction: result_CMDinteraction.rows,
      scatter: result_attackOverTime.rows,
      usernameCount: result_usernames.rows

    });
  } catch (error) {
    // If something goes wrong, answer with a server error (500)
    console.error('Error executing query:', error.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Every 5 seconds, tell all the browsers to reload their data (looks like a test)
setInterval(() => {
  console.log('emitting test, clients:', io.engine.clientsCount);
  io.emit('attackUpdate', { source: 'timer' });
}, 5000);

// Start the server on port 8080
server.listen(8080, () => {
  console.log('Server listening on port 8080');
});