
-- Creation of the attacker table
-- One row for each attacker (the IP address is the key)
CREATE TABLE IF NOT EXISTS attacker(
    ip_address varchar(15) PRIMARY KEY,
    city varchar(40) NOT NULL,
    region varchar(40) NOT NULL,
    country varchar(40) NOT NULL,
    lat numeric(8,5) NOT NULL,
    lon numeric(8,5) NOT NULL,
    -- Only these three values are allowed
    privacy text CHECK (privacy IN ('VPN detected','VPN not detected','VPN status unavailable'))
);

-- Creation of the attempt table
-- One row for each login attempt
CREATE TABLE IF NOT EXISTS attempt(
    username varchar(40) NOT NULL,
    password_attempt varchar(40) NOT NULL,
    -- Only these two values are allowed
    status text CHECK (status IN ('succeeded','failed')),
    ip_address varchar(15) NOT NULL,
    attack_timestamp timestamp NOT NULL,-- In Europe/Athens timezone
    timezone varchar(50) NOT NULL,
    -- The IP address must exist in the attacker table
    CONSTRAINT fk_ip_address FOREIGN KEY (ip_address) REFERENCES attacker(ip_address),
    -- The same password from the same IP at the same time can be saved only once
    PRIMARY KEY(password_attempt,ip_address,attack_timestamp)
);

-- Creation of the command table
-- One row for each command that the attacker typed
CREATE TABLE IF NOT EXISTS command(
    -- Number that is created automatically for each command
    command_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- The IP address must exist in the attacker table
    ip_address varchar(15) NOT NULL REFERENCES attacker,
    command text NOT NULL,
    -- FOUND = typed after a successful login, NOT FOUND = typed without one
    cmd text CHECK (cmd IN ('FOUND','NOT FOUND'))
);

-- Creation of the playlog table
-- It keeps the recording of each attacker session
CREATE TABLE IF NOT EXISTS playlog(
    session_id   TEXT PRIMARY KEY,
    -- The recording in the asciinema ".cast" format
    cast_data    TEXT NOT NULL,
    -- Size of the terminal
    width        INT  NOT NULL DEFAULT 80,
    height       INT  NOT NULL DEFAULT 24,
    -- Length of the session in seconds
    duration_s   REAL NOT NULL DEFAULT 0,
    -- Number of events in the recording
    event_count  INT  NOT NULL DEFAULT 0,
    -- Time when the recording was saved
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Function that sends a notification on the "attack_update" channel.
-- It sends the name of the table that changed.
CREATE OR REPLACE FUNCTION notify_attack_update() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('attack_update', TG_TABLE_NAME);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Row changes: insert, update, delete
-- The trigger runs one time for each statement (not for each row).
-- DROP first, so we can run this file again without errors.
DROP TRIGGER IF EXISTS attempt_notify ON attempt;
CREATE TRIGGER attempt_notify AFTER INSERT OR UPDATE OR DELETE ON attempt
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

-- TRUNCATE needs its own trigger (it is not part of the trigger above)
DROP TRIGGER IF EXISTS attempt_notify_truncate ON attempt;
CREATE TRIGGER attempt_notify_truncate AFTER TRUNCATE ON attempt
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

-- Same triggers for the attacker table
DROP TRIGGER IF EXISTS attacker_notify ON attacker;
CREATE TRIGGER attacker_notify AFTER INSERT OR UPDATE OR DELETE ON attacker
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

DROP TRIGGER IF EXISTS attacker_notify_truncate ON attacker;
CREATE TRIGGER attacker_notify_truncate AFTER TRUNCATE ON attacker
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

-- Same triggers for the command table
DROP TRIGGER IF EXISTS command_notify ON command;
CREATE TRIGGER command_notify AFTER INSERT OR UPDATE OR DELETE ON command
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

DROP TRIGGER IF EXISTS command_notify_truncate ON command;
CREATE TRIGGER command_notify_truncate AFTER TRUNCATE ON command
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

-- Same triggers for the playlog table
DROP TRIGGER IF EXISTS playlog_notify ON playlog;
CREATE TRIGGER playlog_notify AFTER INSERT OR UPDATE OR DELETE ON playlog
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

DROP TRIGGER IF EXISTS playlog_notify_truncate ON playlog;
CREATE TRIGGER playlog_notify_truncate AFTER TRUNCATE ON playlog
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

-- Schema changes: DROP TABLE and CREATE TABLE
-- Function that sends a notification when the database structure changes
CREATE OR REPLACE FUNCTION notify_schema_change() RETURNS event_trigger AS $$
BEGIN
  PERFORM pg_notify('attack_update', 'schema');
END;
$$ LANGUAGE plpgsql;

-- Send a notification when something is dropped (for example a table)
DROP EVENT TRIGGER IF EXISTS schema_drop_notify;
CREATE EVENT TRIGGER schema_drop_notify ON sql_drop
EXECUTE FUNCTION notify_schema_change();

-- Send a notification when a new table is created
DROP EVENT TRIGGER IF EXISTS schema_create_notify;
CREATE EVENT TRIGGER schema_create_notify ON ddl_command_end
WHEN TAG IN ('CREATE TABLE')
EXECUTE FUNCTION notify_schema_change();


-- Show the data of each table (the attackers are sorted by privacy)
select * from attacker order by privacy;
select * from attempt;
select * from command;
select * from playlog;

-- the commands below delete data. Remove the "--" only when you need them,
-- and run them one by one.

-- Delete all the rows of each table (the tables stay)
-- delete from command;
-- delete from attempt;
-- delete from attacker;
-- delete from playlog;

-- Delete the tables completely 
-- drop table command;
-- drop table attempt;
-- drop table attacker;
-- drop table playlog;