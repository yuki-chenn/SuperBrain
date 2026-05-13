import { RadarChart } from '../ui/RadarChart';

interface Dimension {
  key: string;
  label: string;
  value: number;
}

interface BrainDimensionPanelProps {
  dimensions: Dimension[];
}

export function BrainDimensionPanel({ dimensions }: BrainDimensionPanelProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--sb-text-secondary)] mb-4">考察维度</h3>
      <div className="flex justify-center">
        <RadarChart dimensions={dimensions} size={240} showLabels />
      </div>
    </div>
  );
}
