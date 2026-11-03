// Import Recharts components for the bar chart
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, LabelList, ResponsiveContainer } from 'recharts';

// Define color constants for styling
const AMBER = '#f0a640';
const MUTED = '#9aa0c7';
const TEXT = '#e9eaf7';

// Main Horizontal Bar Widget component
const HorizontalBarWidget = ({ data, title = 'Password frequency' }) => {
  return (
    <div className="graphChart">
      {/* Chart header title */}
      <h3>{title}</h3>

      <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
        {/* Make the chart responsive to the container size */}
        <ResponsiveContainer width="100%" height="100%">
          {/* right margin reserves space for the password labels, so the
              axis can run to the real maximum and the bars use the full width */}
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 105, left: 20, bottom: 5 }}
          >
            {/* Vertical grid lines */}
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" horizontal={false} />
            {/* X-axis configuration for numerical values */}
            <XAxis
              type="number"
              domain={[0, 'dataMax']}
              allowDecimals={false}
              tick={{ fill: MUTED, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            {/* Y-axis configuration for category values */}
            <YAxis dataKey="password_attempt" type="category" width={0} tick={false} axisLine={false} tickLine={false} />
            {/* Tooltip configuration on hover */}
            <Tooltip
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
            {/* Bar style configuration */}
            <Bar dataKey="count" fill={AMBER} radius={[0, 6, 6, 0]} barSize={22}>
              {/* Display text labels next to the bars */}
              <LabelList
                dataKey="password_attempt"
                position="right"
                fill={TEXT}
                fontSize={11}
                fontWeight={600}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HorizontalBarWidget;