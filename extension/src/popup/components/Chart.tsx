import type React from 'react';

interface ChartData {
  time: string;
  luminance: number;
  date: string;
}

interface ChartProps {
  data: ChartData[];
  height?: number;
  type?: 'line' | 'area';
}

export const Chart: React.FC<ChartProps> = ({ data, height = 200, type = 'area' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-white/5 rounded-lg border border-white/10">
        <div className="text-center">
          <div className="text-neutral-400 mb-2">📊</div>
          <p className="text-sm text-neutral-400">No data available</p>
        </div>
      </div>
    );
  }

  const maxLuminance = Math.max(...data.map(d => d.luminance));
  const minLuminance = Math.min(...data.map(d => d.luminance));
  const range = maxLuminance - minLuminance || 1;

  const width = 300;
  const padding = 20;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + ((maxLuminance - point.luminance) / range) * chartHeight;
    return { x, y, ...point };
  });

  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  const areaPathData = `${pathData} L ${points[points.length - 1]?.x} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="w-full bg-white/5 rounded-lg border border-white/10 p-3">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <title>Luminance chart</title>
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            y1={padding + ratio * chartHeight}
            x2={width - padding}
            y2={padding + ratio * chartHeight}
            stroke="#374151"
            strokeWidth="0.5"
            strokeDasharray="2,2"
            opacity="0.3"
          />
        ))}

        {/* Area fill */}
        {type === 'area' && (
          <path
            d={areaPathData}
            fill="url(#chartGradient)"
            stroke="none"
          />
        )}

        {/* Main line */}
        <path
          d={pathData}
          fill="none"
          stroke="#4ade80"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point) => (
          <circle
            key={`${point.date}-${point.time}`}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="#4ade80"
            stroke="#1f2937"
            strokeWidth="2"
            className="hover:r-5 transition-all duration-200"
          >
            <title>{point.luminance.toFixed(2)} nits at {point.time}</title>
          </circle>
        ))}

        {/* Y-axis labels */}
        <text x={padding - 5} y={padding + 5} fill="#9ca3af" fontSize="10" textAnchor="end">
          {maxLuminance.toFixed(0)}
        </text>
        <text x={padding - 5} y={height - padding + 5} fill="#9ca3af" fontSize="10" textAnchor="end">
          {minLuminance.toFixed(0)}
        </text>
      </svg>
    </div>
  );
}; 