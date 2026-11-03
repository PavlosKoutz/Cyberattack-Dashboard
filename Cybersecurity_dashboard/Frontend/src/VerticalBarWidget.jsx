// Import chart components from Recharts
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

// Main color of the bars (amber)
const AMBER = '#f0a640';
// Softer text color (used for the numbers on the axis)
const MUTED = '#9aa0c7';

// Vertical bar chart that shows how many attempts each attacker made.
// It gets a list of data with `ip_address` and `count`.
const VerticalBarWidget = ({ data }) => {
  return (
    <div className="graphChart">
      {/* Chart title */}
      <h3>Attempts per attacker</h3>

      {/* The chart has a fixed width and height */}
      <BarChart
        width={320}
        height={220}
        data={data}
        margin={{ top: 0, right: 50, bottom: 0, left: 0 }}
      >
        {/* Only horizontal lines in the background */}
        <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
        {/* Bottom axis: one bar for each IP address (names are hidden) */}
        <XAxis dataKey="ip_address" tick={false} axisLine={false} tickLine={false} />
        {/* Left axis: number of attempts (whole numbers only) */}
        <YAxis
          allowDecimals={false}
          tick={{ fill: MUTED, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        {/* Small box that shows the details when the mouse is over a bar */}
        <Tooltip
          // Light background behind the bar under the mouse
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          contentStyle={{
            background: '#090b24',
            border: '1px solid rgba(240,166,64,0.35)',
            borderRadius: 10,
            fontSize: 12,
          }}
          labelStyle={{ color: MUTED }}
          itemStyle={{ color: AMBER }}
        />
        {/* The bars: the height comes from `count` (top corners are rounded) */}
        <Bar dataKey="count" fill={AMBER} radius={[6, 6, 0, 0]} />
      </BarChart>
    </div>
  );
};

export default VerticalBarWidget;