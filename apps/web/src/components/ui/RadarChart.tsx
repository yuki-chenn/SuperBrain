interface RadarChartProps {
  dimensions: { label: string; value: number }[];
  size?: number;
  maxValue?: number;
  showLabels?: boolean;
  showScale?: boolean;
  className?: string;
}

export function RadarChart({
  dimensions,
  size = 200,
  maxValue = 5,
  showLabels = true,
  showScale = true,
  className = '',
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - (showLabels ? 32 : 12);
  const count = dimensions.length;
  const angleStep = (2 * Math.PI) / count;

  // Start from top (-90 degrees)
  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / maxValue) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  // Grid levels
  const levels = [1, 2, 3, 4, 5];

  // Axis endpoints
  const axisPoints = dimensions.map((_, i) => getPoint(i, maxValue));

  // Data polygon points
  const dataPoints = dimensions.map((d, i) => getPoint(i, d.value));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';

  // Label positions
  const labelPoints = dimensions.map((d, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const labelR = radius + (showLabels ? 20 : 0);
    return {
      x: cx + labelR * Math.cos(angle),
      y: cy + labelR * Math.sin(angle),
      label: d.label,
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      {/* Grid polygons */}
      {levels.map((level) => {
        const points = dimensions.map((_, i) => getPoint(i, level));
        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
        // Scale label at the top of each ring
        const labelY = cy - (level / maxValue) * radius;
        return (
          <g key={level}>
            <path
              d={path}
              fill="none"
              stroke="var(--sb-border-strong)"
              strokeWidth="1"
              opacity={level === maxValue ? 0.8 : 0.5}
            />
            {showScale && (
              <text
                x={cx}
                y={labelY - 3}
                textAnchor="middle"
                fill="var(--sb-text-muted)"
                fontSize={size > 150 ? '9' : '7'}
                opacity="0.8"
              >
                {level}
              </text>
            )}
          </g>
        );
      })}

      {/* Axis lines */}
      {axisPoints.map((p, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={p.x}
          y2={p.y}
          stroke="var(--sb-border-strong)"
          strokeWidth="1"
          opacity="0.6"
        />
      ))}

      {/* Data polygon */}
      <path
        d={dataPath}
        fill="var(--sb-primary)"
        fillOpacity="0.15"
        stroke="var(--sb-primary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={size > 150 ? 3.5 : 2.5}
          fill="var(--sb-primary)"
          stroke="var(--sb-bg-elevated)"
          strokeWidth="1.5"
        />
      ))}

      {/* Labels */}
      {showLabels &&
        labelPoints.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--sb-text-secondary)"
            fontSize={size > 150 ? '11' : '9'}
            fontWeight="500"
          >
            {p.label}
          </text>
        ))}
    </svg>
  );
}
