import { ReactNode } from 'react';

interface GamePlayLayoutProps {
  infoPanel: ReactNode;
  stage: ReactNode;
  sidePanel?: ReactNode;
}

export function GamePlayLayout({ infoPanel, stage, sidePanel }: GamePlayLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(520px,1fr)_280px] gap-6 max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-6">
      {/* Info Panel */}
      <div className="hidden lg:block">{infoPanel}</div>

      {/* Game Stage */}
      <div className="flex justify-center">{stage}</div>

      {/* Side Panel */}
      {sidePanel && <div className="hidden lg:block">{sidePanel}</div>}

      {/* Mobile: info + stage + side stacked */}
      <div className="lg:hidden space-y-6">
        {infoPanel}
        {sidePanel}
      </div>
    </div>
  );
}
