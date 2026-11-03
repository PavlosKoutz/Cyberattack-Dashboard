// Import chart components from Recharts
import {
    ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
    CartesianGrid, Tooltip,
} from 'recharts';

// Sample data: replace by passing your real data via the `data` prop
// time = how long the attacker was active (in seconds)
// count = number of attacks
// vpn = true if a VPN was used
const attacks = [
    { time: 60, count: 32, vpn: true },
    { time: 3600, count: 9, vpn: false },
    { time: 7200, count: 41, vpn: true },
    { time: 86400, count: 15, vpn: false },
    { time: 172800, count: 28, vpn: true },
    { time: 300, count: 6, vpn: false },
];

// Color of the dots for attackers with a VPN
const VPN_COLOR = '#f0a640';
// Color of the dots for attackers without a VPN
const NO_VPN_COLOR = '#8f8cf0';
// Softer text color
const MUTED = '#9aa0c7';

// Style of the numbers on the axes
const tick = { fill: MUTED, fontSize: 11 };

// Change seconds into short text (for example 90 seconds becomes "2m")
const formatDuration = (s) => {
    // Use 0 if the value is not a number
    const n = Number(s) || 0;
    // Less than 1 minute: show seconds
    if (n < 60) return `${Math.round(n)}s`;
    // Less than 1 hour: show minutes
    if (n < 3600) return `${Math.round(n / 60)}m`;
    // Less than 1 day: show hours
    if (n < 86400) return `${(n / 3600).toFixed(1)}h`;
    // One day or more: show days
    return `${(n / 86400).toFixed(1)}d`;
};

// Make a dot with a soft halo around it.
// It gets a color and returns a function that draws the dot.
const makeDot = (color) => ({ cx, cy }) => (
    <g>
        {/* Big light circle (the halo) */}
        <circle cx={cx} cy={cy} r={11} fill={color} fillOpacity={0.14} />
        {/* Small solid circle with a dark border */}
        <circle cx={cx} cy={cy} r={6} fill={color} stroke="#0f1238" strokeWidth={2} />
    </g>
);
// One dot style for each group
const VpnDot = makeDot(VPN_COLOR);
const NoVpnDot = makeDot(NO_VPN_COLOR);

// Small box that shows the details when the mouse is over a dot
const ChartTooltip = ({ active, payload }) => {
    // Show nothing if the mouse is not over a dot
    if (!active || !payload?.length) return null;
    // The data of the dot under the mouse
    const p = payload[0].payload;
    // Use the color of the group (VPN or no VPN)
    const color = p.vpn ? VPN_COLOR : NO_VPN_COLOR;
    return (
        <div
            style={{
                background: 'rgba(9, 11, 36, 0.95)',
                border: `1px solid ${color}66`,
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 12,
                color: '#e9eaf7',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
        >
            {/* Title with a small colored dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                {p.vpn ? 'VPN detected' : 'No VPN detected'}
            </div>
            {/* Show the IP address only if we have it */}
            {p.ip_address && (
                <div style={{ color: MUTED }}>
                    IP: <b style={{ color: '#e9eaf7' }}>{p.ip_address}</b>
                </div>
            )}
            {/* How long the attacker was active */}
            <div style={{ color: MUTED }}>
                Active for: <b style={{ color: '#e9eaf7' }}>{formatDuration(p.time)}</b>
            </div>
            {/* Number of attacks */}
            <div style={{ color: MUTED }}>
                Attacks: <b style={{ color }}>{p.count}</b>
            </div>
        </div>
    );
};

// Small rounded label with a colored dot (used as a legend)
const LegendPill = ({ color, label }) => (
    <span
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            fontSize: 11,
            color: '#e9eaf7',
            // Light background and border made from the same color
            background: `${color}1f`,
            border: `1px solid ${color}55`,
            borderRadius: 999,
        }}
    >
        {/* Colored dot */}
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
        {label}
    </span>
);

// Scatter chart: each dot is an attacker.
// X = how long the attacker was active, Y = number of attacks.
// Use `isAnimationActive` to turn the animation on or off.
const ScatterWidget = ({ data = attacks, isAnimationActive = true }) => {
    // Make sure we always have a list
    const rows = Array.isArray(data) ? data : [];
    // Split the data in two groups: with VPN and without VPN
    const withVpn = rows.filter((a) => a.vpn);
    const withoutVpn = rows.filter((a) => !a.vpn);
    return (
        <div className="graphChart">
            {/* Chart title */}
            <h3>Attack count vs duration</h3>

            {/* Legend that explains the two colors */}
            <div style={{ display: 'flex', gap: 8, padding: '0 20px 4px', alignSelf: 'stretch' }}>
                <LegendPill color={VPN_COLOR} label="VPN" />
                <LegendPill color={NO_VPN_COLOR} label="No VPN" />
            </div>

            {/* Box for the chart */}
            <div className="chartBody">
                {/* Make the chart fit the size of its box */}
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 12, right: 16, bottom: 4, left: -8 }}>
                        {/* Only horizontal lines in the background */}
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" strokeDasharray="3 6" />
                        {/* Bottom axis: how long the attacker was active */}
                        <XAxis
                            dataKey="time"
                            type="number"
                            name="Attack duration"
                            // Start at 0 and let the chart choose the end
                            domain={[0, 'auto']}
                            // Show the time as short text (for example "2m")
                            tickFormatter={formatDuration}
                            tick={tick}
                            tickLine={false}
                            axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                            tickMargin={6}
                        />
                        {/* Left axis: number of attacks */}
                        <YAxis
                            dataKey="count"
                            type="number"
                            name="Attack count"
                            domain={[0, 'auto']}
                            // Show only whole numbers
                            allowDecimals={false}
                            tick={tick}
                            tickLine={false}
                            axisLine={false}
                            width={44}
                        />
                        {/* Use our own box for the details, with a dashed line under the mouse */}
                        <Tooltip
                            content={<ChartTooltip />}
                            cursor={{ stroke: VPN_COLOR, strokeOpacity: 0.35, strokeDasharray: '3 3' }}
                        />
                        {/* Dots for attackers with a VPN */}
                        <Scatter name="VPN detected" data={withVpn} shape={VpnDot} isAnimationActive={isAnimationActive} />
                        {/* Dots for attackers without a VPN */}
                        <Scatter name="No VPN detected" data={withoutVpn} shape={NoVpnDot} isAnimationActive={isAnimationActive} />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ScatterWidget;