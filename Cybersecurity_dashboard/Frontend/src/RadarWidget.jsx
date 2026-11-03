// Import chart components from Recharts
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

// Main color of the chart (amber)
const AMBER = '#f0a640';
// Softer text color (used for the day names)
const MUTED = '#9aa0c7';

// Radar chart that shows the attacks for each day of the week.
// It accepts the data as `dayList` or as `data`.
// Give a `title` so you can use the same component for different charts.
const RadarWidget = ({ dayList, data, title = 'Weekday attacks' }) => {
  // Use `dayList` first, then `data`, or an empty list if there is none
  const chartData = dayList || data || [];

  return (
    <div className="graphChart">
      {/* Chart title */}
      <h3>{title}</h3>

      {/* Make the chart fit the size of its box */}
      <ResponsiveContainer width="100%" height="100%">
        {/* outerRadius leaves room for the day labels so "Tuesday" isn't clipped */}
        <RadarChart data={chartData} outerRadius="65%">
          {/* Light lines in the background of the chart */}
          <PolarGrid stroke="rgba(255,255,255,0.12)" />
          {/* Names of the days around the chart */}
          <PolarAngleAxis
            dataKey="name"
            tick={{ fill: MUTED, fontWeight: 500, fontSize: 12 }}
          />
          {/* Hide the numbers and the line of the radius axis */}
          <PolarRadiusAxis tick={false} axisLine={false} />
          {/* The colored shape that shows the values */}
          <Radar
            name="Attacks (%)"
            // Which field has the value for each day
            dataKey="value"
            fill={AMBER}
            stroke={AMBER}
            strokeWidth={2}
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RadarWidget;