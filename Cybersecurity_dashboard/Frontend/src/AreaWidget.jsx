// Import required components from Recharts library
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';

// Define color variables
const AMBER = '#f0a640';
const MUTED = '#9aa0c7';

// Define tick text style
const tick = { fill: MUTED, fontSize: 10, fontWeight: 500 };

// Area chart component function
const AreaWidget = ({ data, title = 'Hourly attack volume' }) => (
  <div className="graphChart">
    {/* Chart title */}
    <h3>{title}</h3>
    {/* Make the chart responsive to container size */}
    <ResponsiveContainer width="95%" height="80%">
      <AreaChart data={data} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
        {/* Define gradient fill colors */}
        <defs>
          <linearGradient id="attackVolumeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={AMBER} stopOpacity={0.55} />
            <stop offset="95%" stopColor={AMBER} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Render horizontal background grid lines */}
        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />

        {/* X-axis configuration */}
        <XAxis
          dataKey="name"
          interval={1}
          padding={{ left: 12, right: 12 }}
          tick={tick}
          axisLine={false}
          tickLine={false}
        />
        {/* Y-axis configuration */}
        <YAxis
          width={32}
          allowDecimals={false}
          tick={tick}
          axisLine={false}
          tickLine={false}
        />

        {/* Tooltip configuration on hover */}
        <Tooltip
          cursor={{ stroke: 'rgba(255,255,255,0.2)' }}
          contentStyle={{
            background: '#090b24',
            border: '1px solid rgba(240,166,64,0.35)',
            borderRadius: 10,
            fontSize: 12,
          }}
          labelStyle={{ color: MUTED }}
          itemStyle={{ color: AMBER }}
        />

        {/* Area chart line and fill style */}
        <Area
          type="monotone"
          dataKey="value"
          stroke={AMBER}
          strokeWidth={2}
          activeDot={{ r: 4, fill: AMBER, stroke: '#171b4f', strokeWidth: 2 }}
          fillOpacity={1}
          fill="url(#attackVolumeFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export default AreaWidget;