import { Card } from '../../../components/ui/Card';

export function LifeRulesPanel() {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-[var(--sb-text-secondary)] mb-3">规则</h3>
      <div className="text-xs text-[var(--sb-text-muted)] space-y-3">
        <div>
          <p className="font-medium text-[var(--sb-text-secondary)] mb-1">B3/S23 规则</p>
          <ul className="space-y-1">
            <li>灰格 = 死亡细胞</li>
            <li>黄格 = 存活细胞</li>
            <li>死亡细胞周围恰好 3 个存活 → 诞生</li>
            <li>存活细胞周围 2 或 3 个存活 → 继续存活</li>
            <li>其他情况 → 死亡</li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-[var(--sb-text-secondary)] mb-1">玩法</p>
          <ul className="space-y-1">
            <li>观察 120×15 初始细胞分布</li>
            <li>推理稳定状态下目标区域的存活细胞</li>
            <li>在目标区域编辑器中点击标记存活细胞</li>
            <li>每个区域可独立提交</li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-[var(--sb-text-secondary)] mb-1">排名</p>
          <p>用时优先，错误次数其次</p>
        </div>
      </div>
    </Card>
  );
}
