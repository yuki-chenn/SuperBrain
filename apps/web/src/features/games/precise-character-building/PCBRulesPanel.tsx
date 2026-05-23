export default function PCBRulesPanel() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
      <h3 className="font-bold text-gray-900 dark:text-white">游戏规则</h3>
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
        <p>在 6×6 文字池中，每个格子有一个汉字字根。</p>
        <p>你拥有 6 个部首。每回合选择 <strong>4 个部首</strong>和 <strong>4 个连续格子</strong>。</p>
        <p>部首与字根一一组合，全部成字则点亮格子。</p>
        <p className="text-amber-600 dark:text-amber-400">
          当前回合使用过的部首，下一回合暂时禁用。
        </p>
        <p>点亮全部 36 格即挑战成功。</p>
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1 pt-2 border-t border-gray-100 dark:border-gray-800">
        <div>来源：最强大脑第十三季第二期</div>
        <div>能力：推理 5 · 观察 3 · 记忆 2 · 创造 2 · 计算 2</div>
      </div>
    </div>
  );
}
