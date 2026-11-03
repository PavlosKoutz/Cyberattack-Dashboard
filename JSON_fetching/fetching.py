# Import tools to decode text from bytes
import codecs
# Import tools to read bytes like a file
import io
# Import tools to read and write JSON
import json
# Import tools to work with file paths on Linux
import posixpath
# Import tools to read binary data
import struct
# Import tools to wait and work with time
import time
# Import the date and time tool
from datetime import datetime
# Import the time zone tool
from zoneinfo import ZoneInfo
 
# Import the SSH tool (to connect to the VMs)
import paramiko
# Import the PostgreSQL tool (to connect to the database)
import psycopg2
# Import the tool for web requests (used for the location lookup)
import requests

# Settings for the VM that has the honeypot 
host = ""
port = 
username = ""
password = ""

# Settings for the attacker's VM 
ATTACKER_HOST = ""
ATTACKER_PORT = 
ATTACKER_USERNAME = ""
ATTACKER_PASSWORD = ""

# Settings for the database
DB_HOST = ""
DB_PORT = 
DB_NAME = ""
DB_USER = ""
DB_PASSWORD = ""

# Path of the Cowrie log file on the honeypot VM
VMFile="/home/cowrie/my-honeypot/var/log/cowrie/cowrie.json"

# Folder of the honeypot on the VM (used for relative paths of the recordings)
COWRIE_ROOT = "/home/cowrie/my-honeypot"
    

# Create the SSH client for the honeypot VM
# (accept unknown host keys automatically)
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

# Create the SSH client for the attacker's VM
attacker_ssh = paramiko.SSHClient()
attacker_ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

# Establish connection with attacker's VM 
attacker_ssh.connect(
    hostname=ATTACKER_HOST,
    port=ATTACKER_PORT,
    username=ATTACKER_USERNAME,
    password=ATTACKER_PASSWORD
)

# Establish connection with the VM that contains the honeypot 
ssh.connect(
    hostname=host,
    port=port,
    username=username,
    password=password
)

# Establish connection with the database
db = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD
)

# The cursor is used to run the SQL commands
cursor = db.cursor()

print("Connected to PostgreSQL")


   
print("Connected!")

# Open an SFTP connection to read files on the honeypot VM
sftp = ssh.open_sftp()


# Format of one record in a Cowrie terminal recording (ttylog)
TTY_HEADER = struct.Struct("<iLiiLL")  # op, tty, length, direction, sec, usec
# Record type for data written to the terminal
OP_WRITE = 3
# Direction of the data: from the server to the attacker
DIR_OUTPUT = 2  # server -> attacker
 
 
# Change a Cowrie recording (binary) into the asciinema ".cast" format
def playlog_to_cast(raw_bytes, width=80, height=24):
    """Returns (cast_text, duration_s, event_count)."""
    # Read the bytes like a file
    f = io.BytesIO(raw_bytes)
    # events = list of output events, start = time of the first record,
    # last = time of the last event
    events, start, last = [], None, 0.0
    # Decoder that keeps incomplete characters until the next piece of data
    decoder = codecs.getincrementaldecoder("utf-8")(errors="replace")
 
    # Read the records one by one until the file ends
    while True:
        # Read the header of the next record
        raw = f.read(TTY_HEADER.size)
        # Stop if there is not a full header
        if len(raw) < TTY_HEADER.size:
            break
        op, _tty, length, direction, sec, usec = TTY_HEADER.unpack(raw)
        # Read the data of this record
        data = f.read(length)
        # Time of the record in seconds
        t = sec + usec / 1e6
        # The first record sets the start time
        if start is None:
            start = t
        # Keep only the text that the server sent to the attacker
        if op == OP_WRITE and direction == DIR_OUTPUT:
            text = decoder.decode(data)
            if text:
                # Time since the start of the session
                last = round(t - start, 6)
                events.append([last, "o", text])
 
    # First line of the .cast file: info about the terminal
    header = {"version": 2, "width": width, "height": height,
              "timestamp": int(start or 0)}
    # Each line is one JSON object (the header first, then the events)
    lines = [json.dumps(header)] + [json.dumps(e) for e in events]
    return "\n".join(lines) + "\n", last, len(events)
 
 
# Get the recording of one session from the honeypot VM and save it in the database
def save_playlog(sftp, cursor, session, ttylog_path):
    """Reads the ttylog from the honeypot VM over sftp and stores it as .cast."""
    # If the path is not absolute, put the Cowrie folder in front of it
    if not posixpath.isabs(ttylog_path):
        ttylog_path = posixpath.join(COWRIE_ROOT, ttylog_path)
 
    # Read the whole recording file from the honeypot VM
    with sftp.open(ttylog_path, "rb") as f:
        raw = f.read()
 
    # Get the terminal size of this session (use 80x24 if we do not know it)
    width, height = session_sizes.pop(session, (80, 24))
    cast, duration, count = playlog_to_cast(raw, width, height)
 
    # Save the recording (do nothing if this session is already saved)
    cursor.execute("""
        INSERT INTO playlog
            (session_id, cast_data, width, height, duration_s, event_count)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (session_id) DO NOTHING;
    """, (session, cast, width, height, duration, count))

# Sessions where the attacker logged in successfully
authenticated_sessions = set()
session_sizes = {}      # session -> (width, height)
ip_cache = {}            # session -> (ip_address, geo_response, privacy)

# Open the Cowrie JSON log file through SFTP.
with sftp.open(VMFile, "r") as file:

    # Read the log forever (the script keeps running)
    while True:

        # Read the next line of the log
        line = file.readline()

        # Wait for new log entries when no data is available.
        if not line:
            time.sleep(1)
            continue

        try:
            # Parse the incoming JSON event.
            event = json.loads(line)
            session = event.get("session")
            eventid = event.get("eventid")

            # Quick events that need no internet request: handle them and skip the rest
            # The attacker changed the size of the terminal: remember it
            if eventid == "cowrie.client.size":
                session_sizes[session] = (int(event.get("width", 80)),
                                           int(event.get("height", 24)))
                continue

            # The session ended: save the recording and clean the saved data
            if eventid == "cowrie.log.closed":
                if event.get("ttylog"):
                    save_playlog(sftp, cursor, session, event["ttylog"])
                    db.commit()
                authenticated_sessions.discard(session)
                ip_cache.pop(session, None)
                continue

            # Process only login events (success or failed) and typed commands.
            if eventid not in ("cowrie.login.success", "cowrie.login.failed", "cowrie.command.input"):
                continue

            # Geolocation lookup is expensive, so it is performed only once
            # per session and the result is cached for later events.
            if session not in ip_cache:

                # Ask the attacker's VM for its public IP address
                stdin, stdout, stderr = attacker_ssh.exec_command("curl -s https://api.ipify.org")
                ip_address = stdout.read().decode().strip()
                error = stderr.read().decode().strip()

                # Query ip-api.com for location and network metadata.
                geo_response = requests.get(
                    f"http://ip-api.com/json/{ip_address}",
                    params={"fields": "status,message,country,region,regionName,city,lat,lon,timezone,isp,org,as,proxy,hosting,query"},
                    timeout=10,
                ).json()


                # A proxy flag suggests the attacker is hiding behind
                # a VPN or proxy.
                # If the lookup failed, we do not know the VPN status
                if geo_response.get("status") != "success":
                    privacy = "VPN status unavailable"
                # Proxy or hosting (data center) IP: probably a VPN
                elif geo_response.get("proxy") is True or geo_response.get("hosting") is True:
                    privacy = "VPN detected"
                else:
                    privacy = "VPN not detected"

                # Save the result for the next events of this session
                ip_cache[session] = (ip_address, geo_response, privacy)

            # Get the saved result for this session
            ip_address, geo_response, privacy = ip_cache[session]

            # Extract the geolocation information.
            city = geo_response.get("city")
            region = geo_response.get("regionName")
            country = geo_response.get("country")
            timezone = geo_response.get("timezone")
            lat = geo_response.get("lat")
            lon = geo_response.get("lon")

            # Skip the event if it has no time
            timestamp = event.get("timestamp")
            if not timestamp:
                continue

            # Convert the timestamp's timezone to Greece's timezone
            dt_utc = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            dt_athens = dt_utc.astimezone(ZoneInfo("Europe/Athens"))
            attack_timestamp = dt_athens.strftime("%Y-%m-%d %H:%M:%S")

            # Login events: save the attacker and the login attempt
            if eventid in ("cowrie.login.success", "cowrie.login.failed"):
                if eventid == "cowrie.login.success":
                    status = "succeeded"
                    # Remember that this session got access
                    authenticated_sessions.add(session)
                else:
                    status = "failed"

                # Save the attacker (do nothing if the IP is already saved)
                cursor.execute("""
                    INSERT INTO attacker (ip_address, city, region, country, lat, lon, privacy)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (ip_address) DO NOTHING;
                """, (ip_address, city, region, country, lat, lon, privacy))

                # Save the login attempt (do nothing if it is already saved)
                cursor.execute("""
                    INSERT INTO attempt
                        (username, password_attempt, status, ip_address, attack_timestamp, timezone)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (password_attempt, ip_address, attack_timestamp) DO NOTHING;
                """, (event.get("username"), event.get("password"), status,
                      ip_address, attack_timestamp, timezone))

            # Command events: save the command that the attacker typed
            elif eventid == "cowrie.command.input":
                command = event.get("input")
                # FOUND = typed after a successful login
                # NOT FOUND = typed without a successful login
                cmd = "FOUND" if session in authenticated_sessions else "NOT FOUND"

                # make sure the attacker row exists in case command.ip_address is a foreign key
                cursor.execute("""
                    INSERT INTO attacker (ip_address, city, region, country, lat, lon)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (ip_address) DO NOTHING;
                """, (ip_address, city, region, country, lat, lon))

                # Save the command
                cursor.execute("""
                    INSERT INTO command (ip_address, command, cmd)
                    VALUES (%s, %s, %s);
                """, (ip_address, command, cmd))

            # Save all the changes in the database
            db.commit()

        # The line was not valid JSON: show it and continue
        except json.JSONDecodeError:
            print("Invalid JSON:", line)

        # Any other error: show it and undo the unsaved database changes
        except Exception as e:
            print("Database error:", e)
            db.rollback()