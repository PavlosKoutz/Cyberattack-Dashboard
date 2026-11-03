// Import React state hook
import { useState } from 'react';
// Import chart components from Recharts
import { PieChart, Pie, Tooltip, Cell, Legend, Label, ResponsiveContainer } from 'recharts';

// Colors for the slices (they repeat if there are more than 5 slices)
const COLORS = ['#f0a640', '#2dd4bf', '#8b7cf6', '#f472b6', '#38bdf8'];
// Color of the card background (used for the lines between slices)
const CARD = '#171b4f';
// Main text color
const TEXT = '#e9eaf7';
// Softer text color (used for the legend)
const MUTED = '#9aa0c7';

// Donut chart with a legend.
// The center of the donut has a text area, but it is empty for now.
// Give a `title` so you can use the same component for different charts.
const PieWidget = ({ data = [], title = 'Password character types' }) => {
  // Save the slice the mouse is over (-1 means no slice)
  const [activeIndex, setActiveIndex] = useState(-1);
 

  return (
    <div className="graphChart">
      {/* Chart title */}
      <h3>{title}</h3>

      {/* Box that fills the free space for the chart */}
      <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
        {/* Make the chart fit the size of the box */}
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              // Which field has the size of each slice
              dataKey="value"
              // Which field has the name of each slice
              nameKey="name"
              // Center of the donut (a bit higher to leave space for the legend)
              cx="50%"
              cy="42%"
              // Inner and outer size of the donut
              innerRadius="50%"
              outerRadius="76%"
              // Small space between slices
              paddingAngle={2}
              // Line between slices
              stroke={CARD}
              strokeWidth={3}
              // Remember the slice when the mouse enters it
              onMouseEnter={(_, index) => setActiveIndex(index)}
              // Clear the slice when the mouse leaves
              onMouseLeave={() => setActiveIndex(-1)}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              {/* Give each slice a color */}
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  // Use the colors in order, and start again if they run out
                  fill={COLORS[index % COLORS.length]}
                  // Make the other slices lighter when one slice is active
                  fillOpacity={activeIndex === -1 || activeIndex === index ? 1 : 0.4}
                />
              ))}
              {/* Text in the center of the donut (it is empty now) */}
              <Label
                position="center"
                content={({ viewBox }) => (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} dy="-0.2em" style={{ fill: TEXT, fontSize: 22, fontWeight: 700 }}>
                     
                    </tspan>
                  </text>
                )}
              />
            </Pie>

            {/* List of names and colors at the bottom */}
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingBottom: 6 }}
              // Show each name with the soft text color
              formatter={(value) => <span style={{ color: MUTED }}>{value}</span>}
            />

            {/* Small box that shows the value when the mouse is over a slice */}
            <Tooltip
              // Show the value and then the name
              formatter={(value, name) => [value, name]}
              contentStyle={{
                background: '#090b24',
                border: '1px solid rgba(240,166,64,0.35)',
                borderRadius: 10,
                fontSize: 12,
              }}
              itemStyle={{ color: TEXT }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PieWidget;