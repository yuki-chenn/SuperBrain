export interface PCBRadicalSeed {
  key: string;
  glyph: string;
  label: string;
  category: string;
}

export interface PCBRootSeed {
  key: string;
  glyph: string;
  complexityLevel: string;
}

export interface PCBComboSeed {
  radicalKey: string;
  rootKey: string;
  resultChar: string;
  pinyin?: string;
  structure: string;
  difficulty: string;
  frequencyLevel: string;
}

export const RADICAL_DATA: PCBRadicalSeed[] = [
  { key: 'water', glyph: '氵', label: '水', category: 'LEFT' },
  { key: 'person', glyph: '亻', label: '人', category: 'LEFT' },
  { key: 'hand', glyph: '扌', label: '手', category: 'LEFT' },
  { key: 'heart', glyph: '忄', label: '心', category: 'LEFT' },
  { key: 'mouth', glyph: '口', label: '口', category: 'LEFT' },
  { key: 'speech', glyph: '讠', label: '言', category: 'LEFT' },
  { key: 'wood', glyph: '木', label: '木', category: 'LEFT' },
  { key: 'fire', glyph: '火', label: '火', category: 'LEFT' },
  { key: 'sun', glyph: '日', label: '日', category: 'LEFT' },
  { key: 'eye', glyph: '目', label: '目', category: 'LEFT' },
  { key: 'metal', glyph: '钅', label: '金', category: 'LEFT' },
  { key: 'food', glyph: '饣', label: '食', category: 'LEFT' },
  { key: 'thread', glyph: '纟', label: '丝', category: 'LEFT' },
  { key: 'grass', glyph: '艹', label: '草', category: 'TOP' },
  { key: 'bamboo', glyph: '⺮', label: '竹', category: 'TOP' },
  { key: 'rain', glyph: '雨', label: '雨', category: 'TOP' },
  { key: 'roof', glyph: '宀', label: '宀', category: 'TOP' },
  { key: 'walk', glyph: '辶', label: '走', category: 'SEMI_SURROUND' },
  { key: 'door', glyph: '门', label: '门', category: 'SURROUND' },
  { key: 'wide', glyph: '广', label: '广', category: 'SEMI_SURROUND' },
];

export const ROOT_DATA: PCBRootSeed[] = [
  { key: 'qing', glyph: '青', complexityLevel: 'LOW' },
  { key: 'ma', glyph: '马', complexityLevel: 'LOW' },
  { key: 'mu', glyph: '木', complexityLevel: 'LOW' },
  { key: 'ke', glyph: '可', complexityLevel: 'LOW' },
  { key: 'fang', glyph: '方', complexityLevel: 'LOW' },
  { key: 'yuan', glyph: '元', complexityLevel: 'LOW' },
  { key: 'hua', glyph: '化', complexityLevel: 'LOW' },
  { key: 'li', glyph: '里', complexityLevel: 'LOW' },
  { key: 'dong', glyph: '东', complexityLevel: 'LOW' },
  { key: 'bai', glyph: '白', complexityLevel: 'LOW' },
  { key: 'zhu', glyph: '主', complexityLevel: 'LOW' },
  { key: 'bao', glyph: '包', complexityLevel: 'LOW' },
  { key: 'gong', glyph: '工', complexityLevel: 'LOW' },
  { key: 'ji', glyph: '几', complexityLevel: 'LOW' },
  { key: 'he', glyph: '禾', complexityLevel: 'LOW' },
  { key: 'xiang', glyph: '相', complexityLevel: 'MEDIUM' },
  { key: 'jing', glyph: '京', complexityLevel: 'MEDIUM' },
  { key: 'guan', glyph: '官', complexityLevel: 'MEDIUM' },
  { key: 'liang', glyph: '良', complexityLevel: 'MEDIUM' },
  { key: 'zhao', glyph: '召', complexityLevel: 'MEDIUM' },
  { key: 'zheng', glyph: '正', complexityLevel: 'MEDIUM' },
  { key: 'cheng', glyph: '成', complexityLevel: 'MEDIUM' },
  { key: 'jian', glyph: '见', complexityLevel: 'MEDIUM' },
  { key: 'ping', glyph: '平', complexityLevel: 'MEDIUM' },
  { key: 'gu', glyph: '古', complexityLevel: 'MEDIUM' },
  { key: 'you', glyph: '由', complexityLevel: 'MEDIUM' },
  { key: 'sheng', glyph: '生', complexityLevel: 'MEDIUM' },
  { key: 'mi', glyph: '米', complexityLevel: 'MEDIUM' },
  { key: 'che', glyph: '车', complexityLevel: 'MEDIUM' },
  { key: 'dui', glyph: '兑', complexityLevel: 'MEDIUM' },
  { key: 'qian', glyph: '佥', complexityLevel: 'HIGH' },
  { key: 'jian_root', glyph: '兼', complexityLevel: 'HIGH' },
  { key: 'shu', glyph: '俞', complexityLevel: 'HIGH' },
  { key: 'cang', glyph: '仓', complexityLevel: 'HIGH' },
  { key: 'man', glyph: '曼', complexityLevel: 'HIGH' },
  { key: 'ling', glyph: '令', complexityLevel: 'HIGH' },
  { key: 'lun', glyph: '仑', complexityLevel: 'HIGH' },
  { key: 'mo', glyph: '莫', complexityLevel: 'HIGH' },
  { key: 'fu', glyph: '甫', complexityLevel: 'HIGH' },
  { key: 'yao', glyph: '尧', complexityLevel: 'HIGH' },
];

// =============================================================================
// COMBO_DATA — 部首 + 字根 → 合成字典典
//
// 命名约定: rootKey 是拼音, 但 ROOT_DATA[key].glyph 才是真实部件 (字).
// 视觉部件必须吻合: resultChar 拆开后, 一边等于 RADICAL_DATA[radicalKey].glyph,
// 另一边等于 ROOT_DATA[rootKey].glyph.
// 拼音同部件不同的字 (如 供=亻+共 ≠ 亻+工) 不能写进来.
// 每条都已逐字校对部件.
// =============================================================================
export const COMBO_DATA: PCBComboSeed[] = [
  // ---- water 氵 (LEFT_RIGHT) ----
  { radicalKey: 'water', rootKey: 'qing', resultChar: '清', pinyin: 'qīng', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'ke', resultChar: '河', pinyin: 'hé', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'bai', resultChar: '泊', pinyin: 'bó', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'li', resultChar: '浬', pinyin: 'lǐ', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'water', rootKey: 'gong', resultChar: '江', pinyin: 'jiāng', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'zhu', resultChar: '注', pinyin: 'zhù', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'bao', resultChar: '泡', pinyin: 'pào', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'mu', resultChar: '沐', pinyin: 'mù', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'liang', resultChar: '浪', pinyin: 'làng', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'zhao', resultChar: '沼', pinyin: 'zhǎo', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'gu', resultChar: '沽', pinyin: 'gū', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'water', rootKey: 'you', resultChar: '油', pinyin: 'yóu', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'xiang', resultChar: '湘', pinyin: 'xiāng', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'shu', resultChar: '渝', pinyin: 'yú', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'cang', resultChar: '沧', pinyin: 'cāng', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'man', resultChar: '漫', pinyin: 'màn', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'lun', resultChar: '沦', pinyin: 'lún', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'water', rootKey: 'mo', resultChar: '漠', pinyin: 'mò', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'fu', resultChar: '浦', pinyin: 'pǔ', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'water', rootKey: 'yao', resultChar: '浇', pinyin: 'jiāo', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },

  // ---- person 亻 (LEFT_RIGHT) ----
  { radicalKey: 'person', rootKey: 'ke', resultChar: '何', pinyin: 'hé', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'person', rootKey: 'bai', resultChar: '伯', pinyin: 'bó', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'person', rootKey: 'zhu', resultChar: '住', pinyin: 'zhù', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'person', rootKey: 'mu', resultChar: '休', pinyin: 'xiū', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'person', rootKey: 'fang', resultChar: '仿', pinyin: 'fǎng', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'person', rootKey: 'li', resultChar: '俚', pinyin: 'lǐ', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'person', rootKey: 'gu', resultChar: '估', pinyin: 'gū', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'person', rootKey: 'shu', resultChar: '偷', pinyin: 'tōu', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'person', rootKey: 'qian', resultChar: '俭', pinyin: 'jiǎn', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'person', rootKey: 'ling', resultChar: '伶', pinyin: 'líng', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'person', rootKey: 'lun', resultChar: '伦', pinyin: 'lún', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'person', rootKey: 'yao', resultChar: '侥', pinyin: 'jiǎo', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },

  // ---- hand 扌 (LEFT_RIGHT) ----
  { radicalKey: 'hand', rootKey: 'bai', resultChar: '拍', pinyin: 'pāi', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'hand', rootKey: 'bao', resultChar: '抱', pinyin: 'bào', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'hand', rootKey: 'gong', resultChar: '扛', pinyin: 'káng', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'hand', rootKey: 'zhu', resultChar: '拄', pinyin: 'zhǔ', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'hand', rootKey: 'zhao', resultChar: '招', pinyin: 'zhāo', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'hand', rootKey: 'you', resultChar: '抽', pinyin: 'chōu', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'hand', rootKey: 'jing', resultChar: '掠', pinyin: 'lüè', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'hand', rootKey: 'qian', resultChar: '捡', pinyin: 'jiǎn', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'hand', rootKey: 'cang', resultChar: '抢', pinyin: 'qiǎng', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'hand', rootKey: 'lun', resultChar: '抡', pinyin: 'lūn', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'hand', rootKey: 'fu', resultChar: '捕', pinyin: 'bǔ', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'hand', rootKey: 'yao', resultChar: '挠', pinyin: 'náo', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'hand', rootKey: 'ling', resultChar: '拎', pinyin: 'līn', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'hand', rootKey: 'mo', resultChar: '摸', pinyin: 'mō', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },

  // ---- heart 忄 (LEFT_RIGHT) ----
  { radicalKey: 'heart', rootKey: 'qing', resultChar: '情', pinyin: 'qíng', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'heart', rootKey: 'bai', resultChar: '怕', pinyin: 'pà', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'heart', rootKey: 'jing', resultChar: '惊', pinyin: 'jīng', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'heart', rootKey: 'zheng', resultChar: '怔', pinyin: 'zhēng', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'heart', rootKey: 'dui', resultChar: '悦', pinyin: 'yuè', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'heart', rootKey: 'sheng', resultChar: '性', pinyin: 'xìng', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'heart', rootKey: 'ping', resultChar: '怦', pinyin: 'pēng', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'heart', rootKey: 'shu', resultChar: '愉', pinyin: 'yú', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'heart', rootKey: 'man', resultChar: '慢', pinyin: 'màn', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'heart', rootKey: 'ling', resultChar: '怜', pinyin: 'lián', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'heart', rootKey: 'cang', resultChar: '怆', pinyin: 'chuàng', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'MEDIUM' },

  // ---- mouth 口 (LEFT_RIGHT) ----
  { radicalKey: 'mouth', rootKey: 'ke', resultChar: '呵', pinyin: 'hē', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'mouth', rootKey: 'ma', resultChar: '吗', pinyin: 'ma', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'mouth', rootKey: 'bao', resultChar: '咆', pinyin: 'páo', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'mouth', rootKey: 'ji', resultChar: '叽', pinyin: 'jī', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'mouth', rootKey: 'li', resultChar: '哩', pinyin: 'lǐ', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'mouth', rootKey: 'gu', resultChar: '咕', pinyin: 'gū', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'mouth', rootKey: 'mi', resultChar: '咪', pinyin: 'mī', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'mouth', rootKey: 'shu', resultChar: '喻', pinyin: 'yù', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'mouth', rootKey: 'cang', resultChar: '呛', pinyin: 'qiāng', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'mouth', rootKey: 'fu', resultChar: '哺', pinyin: 'bǔ', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },

  // ---- speech 讠 (LEFT_RIGHT) ----
  { radicalKey: 'speech', rootKey: 'qing', resultChar: '请', pinyin: 'qǐng', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'speech', rootKey: 'fang', resultChar: '访', pinyin: 'fǎng', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'speech', rootKey: 'ji', resultChar: '讥', pinyin: 'jī', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'speech', rootKey: 'gong', resultChar: '讧', pinyin: 'hòng', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'speech', rootKey: 'zheng', resultChar: '证', pinyin: 'zhèng', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'speech', rootKey: 'zhao', resultChar: '诏', pinyin: 'zhào', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'speech', rootKey: 'cheng', resultChar: '诚', pinyin: 'chéng', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'speech', rootKey: 'ping', resultChar: '评', pinyin: 'píng', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'speech', rootKey: 'jing', resultChar: '谅', pinyin: 'liàng', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'speech', rootKey: 'dui', resultChar: '说', pinyin: 'shuō', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'speech', rootKey: 'lun', resultChar: '论', pinyin: 'lùn', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'speech', rootKey: 'jian_root', resultChar: '谦', pinyin: 'qiān', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },

  // ---- wood 木 (LEFT_RIGHT) ----
  { radicalKey: 'wood', rootKey: 'ke', resultChar: '柯', pinyin: 'kē', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'wood', rootKey: 'mu', resultChar: '林', pinyin: 'lín', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'wood', rootKey: 'dong', resultChar: '栋', pinyin: 'dòng', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'wood', rootKey: 'ji', resultChar: '机', pinyin: 'jī', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'wood', rootKey: 'bai', resultChar: '柏', pinyin: 'bǎi', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'wood', rootKey: 'zhu', resultChar: '柱', pinyin: 'zhù', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'wood', rootKey: 'gong', resultChar: '杠', pinyin: 'gàng', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'wood', rootKey: 'guan', resultChar: '棺', pinyin: 'guān', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'wood', rootKey: 'gu', resultChar: '枯', pinyin: 'kū', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'wood', rootKey: 'you', resultChar: '柚', pinyin: 'yòu', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'wood', rootKey: 'shu', resultChar: '榆', pinyin: 'yú', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'wood', rootKey: 'cang', resultChar: '枪', pinyin: 'qiāng', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'wood', rootKey: 'mo', resultChar: '模', pinyin: 'mó', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'wood', rootKey: 'qian', resultChar: '检', pinyin: 'jiǎn', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },

  // ---- fire 火 (LEFT_RIGHT) ----
  { radicalKey: 'fire', rootKey: 'bao', resultChar: '炮', pinyin: 'pào', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },

  // ---- sun 日 (LEFT_RIGHT 或 TOP_BOTTOM, 视字而定) ----
  { radicalKey: 'sun', rootKey: 'qing', resultChar: '晴', pinyin: 'qíng', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'sun', rootKey: 'jing', resultChar: '景', pinyin: 'jǐng', structure: 'TOP_BOTTOM', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'sun', rootKey: 'zhao', resultChar: '昭', pinyin: 'zhāo', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'sun', rootKey: 'sheng', resultChar: '星', pinyin: 'xīng', structure: 'TOP_BOTTOM', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'sun', rootKey: 'yao', resultChar: '晓', pinyin: 'xiǎo', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },

  // ---- eye 目 (LEFT_RIGHT) ----
  { radicalKey: 'eye', rootKey: 'qing', resultChar: '睛', pinyin: 'jīng', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },

  // ---- metal 钅 (LEFT_RIGHT) ----
  { radicalKey: 'metal', rootKey: 'ling', resultChar: '铃', pinyin: 'líng', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'HIGH' },
  { radicalKey: 'metal', rootKey: 'yao', resultChar: '铙', pinyin: 'náo', structure: 'LEFT_RIGHT', difficulty: 'hard', frequencyLevel: 'MEDIUM' },

  // ---- food 饣 (LEFT_RIGHT) ----
  { radicalKey: 'food', rootKey: 'ji', resultChar: '饥', pinyin: 'jī', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'food', rootKey: 'bao', resultChar: '饱', pinyin: 'bǎo', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'food', rootKey: 'guan', resultChar: '馆', pinyin: 'guǎn', structure: 'LEFT_RIGHT', difficulty: 'normal', frequencyLevel: 'HIGH' },

  // ---- thread 纟 (LEFT_RIGHT) ----
  { radicalKey: 'thread', rootKey: 'gong', resultChar: '红', pinyin: 'hóng', structure: 'LEFT_RIGHT', difficulty: 'easy', frequencyLevel: 'HIGH' },

  // ---- grass 艹 (TOP_BOTTOM) ----
  { radicalKey: 'grass', rootKey: 'hua', resultChar: '花', pinyin: 'huā', structure: 'TOP_BOTTOM', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'grass', rootKey: 'fang', resultChar: '芳', pinyin: 'fāng', structure: 'TOP_BOTTOM', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'grass', rootKey: 'bao', resultChar: '苞', pinyin: 'bāo', structure: 'TOP_BOTTOM', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'grass', rootKey: 'gu', resultChar: '苦', pinyin: 'kǔ', structure: 'TOP_BOTTOM', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'grass', rootKey: 'man', resultChar: '蔓', pinyin: 'màn', structure: 'TOP_BOTTOM', difficulty: 'hard', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'grass', rootKey: 'mo', resultChar: '蓦', pinyin: 'mò', structure: 'TOP_BOTTOM', difficulty: 'hard', frequencyLevel: 'LOW' },
  { radicalKey: 'grass', rootKey: 'cang', resultChar: '苍', pinyin: 'cāng', structure: 'TOP_BOTTOM', difficulty: 'hard', frequencyLevel: 'HIGH' },

  // ---- bamboo ⺮ (TOP_BOTTOM) ----
  { radicalKey: 'bamboo', rootKey: 'xiang', resultChar: '箱', pinyin: 'xiāng', structure: 'TOP_BOTTOM', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'bamboo', rootKey: 'guan', resultChar: '管', pinyin: 'guǎn', structure: 'TOP_BOTTOM', difficulty: 'normal', frequencyLevel: 'HIGH' },
  { radicalKey: 'bamboo', rootKey: 'you', resultChar: '笛', pinyin: 'dí', structure: 'TOP_BOTTOM', difficulty: 'normal', frequencyLevel: 'HIGH' },

  // ---- rain 雨 (TOP_BOTTOM) ----
  { radicalKey: 'rain', rootKey: 'bao', resultChar: '雹', pinyin: 'báo', structure: 'TOP_BOTTOM', difficulty: 'easy', frequencyLevel: 'MEDIUM' },
  { radicalKey: 'rain', rootKey: 'ling', resultChar: '零', pinyin: 'líng', structure: 'TOP_BOTTOM', difficulty: 'hard', frequencyLevel: 'HIGH' },

  // ---- roof 宀 (TOP_BOTTOM) ----
  { radicalKey: 'roof', rootKey: 'mu', resultChar: '宋', pinyin: 'sòng', structure: 'TOP_BOTTOM', difficulty: 'easy', frequencyLevel: 'LOW' },
  { radicalKey: 'roof', rootKey: 'yuan', resultChar: '完', pinyin: 'wán', structure: 'TOP_BOTTOM', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'roof', rootKey: 'you', resultChar: '宙', pinyin: 'zhòu', structure: 'TOP_BOTTOM', difficulty: 'normal', frequencyLevel: 'HIGH' },

  // ---- walk 辶 (SEMI_SURROUND) ----
  { radicalKey: 'walk', rootKey: 'yuan', resultChar: '远', pinyin: 'yuǎn', structure: 'SEMI_SURROUND', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'walk', rootKey: 'bai', resultChar: '迫', pinyin: 'pò', structure: 'SEMI_SURROUND', difficulty: 'easy', frequencyLevel: 'HIGH' },
  { radicalKey: 'walk', rootKey: 'zhao', resultChar: '迢', pinyin: 'tiáo', structure: 'SEMI_SURROUND', difficulty: 'normal', frequencyLevel: 'MEDIUM' },

  // ---- wide 广 (SEMI_SURROUND) ----
  { radicalKey: 'wide', rootKey: 'jian_root', resultChar: '廉', pinyin: 'lián', structure: 'SEMI_SURROUND', difficulty: 'hard', frequencyLevel: 'HIGH' },

  // NOTE — 以下 radical/root 在当前数据集下无合法常用组合, 但保留以便未来扩展:
  //   door 门  (没有以 mouth/eye 等已有 root 为内嵌部件的常用字)
  //   ROOT_DATA: jian (见), che (车), he (禾) 在当前 RADICAL 集合下都无配对常用字.
];
