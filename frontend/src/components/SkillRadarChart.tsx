interface SkillRadarChartProps {
  skills: {
    label: string;
    value: number;
    color: string;
  }[];
}

export function SkillRadarChart({ skills }: SkillRadarChartProps) {
  const size = 280;
  const center = size / 2;
  const maxRadius = center - 40;
  const numPoints = skills.length;

  const getPointPosition = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / numPoints - Math.PI / 2;
    const radius = (value / 100) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    };
  };

  const webPoints = skills.map((skill, i) => {
    const pos = getPointPosition(i, skill.value);
    return `${pos.x},${pos.y}`;
  }).join(' ');

  const axisLines = skills.map((_, i) => {
    const pos = getPointPosition(i, 100);
    return (
      <line
        key={i}
        x1={center}
        y1={center}
        x2={pos.x}
        y2={pos.y}
        stroke="#374151"
        strokeWidth="1"
        opacity="0.5"
      />
    );
  });

  const concentricCircles = [20, 40, 60, 80, 100].map((percent) => {
    const points = Array.from({ length: numPoints }, (_, i) => {
      const pos = getPointPosition(i, percent);
      return `${pos.x},${pos.y}`;
    }).join(' ');

    return (
      <polygon
        key={percent}
        points={points}
        fill="none"
        stroke="#374151"
        strokeWidth="1"
        opacity="0.3"
      />
    );
  });

  const labels = skills.map((skill, i) => {
    const pos = getPointPosition(i, 110);
    return (
      <g key={i}>
        <text
          x={pos.x}
          y={pos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-semibold fill-gray-300"
        >
          {skill.label}
        </text>
        <text
          x={pos.x}
          y={pos.y + 14}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-bold fill-tennis-lime"
        >
          {Math.round(skill.value)}
        </text>
      </g>
    );
  });

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {concentricCircles}
        {axisLines}
        <polygon
          points={webPoints}
          fill="rgba(132, 204, 22, 0.2)"
          stroke="#84cc16"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {skills.map((skill, i) => {
          const pos = getPointPosition(i, skill.value);
          return (
            <circle
              key={i}
              cx={pos.x}
              cy={pos.y}
              r="6"
              fill={skill.color}
              stroke="#1f2937"
              strokeWidth="2"
              className="transition-all hover:r-8"
            />
          );
        })}
        {labels}
      </svg>
    </div>
  );
}
