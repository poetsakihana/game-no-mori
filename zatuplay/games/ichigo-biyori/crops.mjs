export const CATEGORIES = { fruit: '果物', vegetable: '野菜', plant: '草花・観葉植物' };

export const GROWTH_STAGES = {
  fruit: ['苗', '葉が育つ', '開花', '実がつく', '色づく', '収穫'],
  root: ['苗', '葉が育つ', '生育', '根が太る', '収穫間近', '収穫'],
  leaf: ['苗', '葉が育つ', '生育', '葉が茂る', '収穫間近', '収穫'],
  flower: ['苗', '葉が育つ', 'つぼみ', 'つぼみがふくらむ', '咲き始め', '満開'],
  foliage: ['苗', '葉が育つ', '新芽', '葉が広がる', '姿が整う', '見頃'],
};

export const GROWING = {
  balanced: { name: '標準', min: 46, max: 72, water: 1, light: 1, feed: 1 },
  thirsty: { name: '水を好む', min: 53, max: 76, water: 1.12, light: 1, feed: 1.05 },
  dry: { name: '乾き気味を好む', min: 38, max: 64, water: 0.84, light: 1, feed: 0.9 },
  sunny: { name: '日なたを好む', min: 47, max: 72, water: 1.06, light: 1.19, feed: 1.1 },
  shade: { name: '半日陰でも育つ', min: 47, max: 73, water: 0.91, light: 0.75, feed: 0.91 },
};

export const DIFFICULTY_LABELS = { easy: 'やさしい', normal: 'ふつう', hard: 'むずかしい' };

function growingDifficulty(days, { water, light }) {
  const needsCloserCare = water > 1.1 || light > 1.1;
  if (days >= 18 || (days >= 16 && needsCloserCare)) return 'hard';
  if (days <= 12 && !needsCloserCare) return 'easy';
  return 'normal';
}

export const LEGACY_SPRITES = {
  strawberry: [0, 1, 2, 3, 4, 5],
  tomato: [0, 0, 1, 2, 2, 3],
  grape: [0, 0, 1, 2, 2, 3],
  mandarin: [0, 0, 1, 2, 2, 3],
};

// [id, 名前, 読み, 日数, 収穫数, 1個の重さ・花径・草丈, 栽培特性, 甘さまたは栽培型, 単位]
const SEASONAL_CROPS = [
  {
    fruit: [
      ['strawberry', 'いちご', 'いちご', 14, 4, 17, 'balanced', 12.2],
      ['cherry', 'さくらんぼ', 'さくらんぼ', 16, 8, 8, 'sunny', 16],
      ['loquat', 'びわ', 'びわ', 17, 6, 33, 'balanced', 12],
      ['ume', '梅', 'うめ', 15, 7, 20, 'balanced', 8.5],
      ['apricot', 'あんず', 'あんず', 16, 4, 42, 'dry', 12],
      ['raspberry', 'ラズベリー', 'らずべりー', 13, 8, 5, 'thirsty', 11],
      ['grapefruit', 'グレープフルーツ', 'ぐれーぷふるーつ', 19, 3, 235, 'sunny', 12],
    ],
    vegetable: [
      ['asparagus', 'アスパラガス', 'あすぱらがす', 13, 6, 23, 'balanced', 'leaf', '本'],
      ['spring-cabbage', '春キャベツ', 'はるきゃべつ', 14, 2, 340, 'thirsty', 'leaf', '玉'],
      ['snap-pea', 'スナップえんどう', 'すなっぷえんどう', 12, 8, 9, 'balanced', 'fruit', 'さや'],
      ['fava-bean', 'そら豆', 'そらまめ', 14, 6, 31, 'dry', 'fruit', 'さや'],
      ['radish', 'ラディッシュ', 'らでぃっしゅ', 8, 6, 18, 'balanced', 'root', '本'],
      ['lettuce', 'レタス', 'れたす', 10, 2, 170, 'shade', 'leaf', '玉'],
      ['watercress', 'クレソン', 'くれそん', 9, 4, 36, 'thirsty', 'leaf', '束'],
      ['spring-onion', '新玉ねぎ', 'しんたまねぎ', 14, 3, 140, 'dry', 'root'],
      ['new-potato', '新じゃが', 'しんじゃが', 15, 5, 61, 'balanced', 'root'],
      ['chives', 'ニラ', 'にら', 11, 3, 45, 'sunny', 'leaf', '束'],
    ],
    plant: [
      ['tulip', 'チューリップ', 'ちゅーりっぷ', 13, 3, 7, 'balanced'],
      ['violet', 'スミレ', 'すみれ', 11, 7, 3, 'shade'],
      ['nemophila', 'ネモフィラ', 'ねもふぃら', 12, 10, 3, 'dry'],
      ['rapeseed', '菜の花', 'なのはな', 11, 11, 3, 'sunny'],
      ['sweet-pea', 'スイートピー', 'すいーとぴー', 14, 7, 4, 'balanced'],
      ['daisy', 'デイジー', 'でいじー', 10, 8, 4, 'balanced'],
      ['muscari', 'ムスカリ', 'むすかり', 12, 5, 3, 'dry'],
      ['ranunculus', 'ラナンキュラス', 'らなんきゅらす', 15, 5, 8, 'balanced'],
    ],
  },
  {
    fruit: [
      ['watermelon', 'すいか', 'すいか', 18, 2, 1700, 'sunny', 12],
      ['muskmelon', 'メロン', 'めろん', 19, 2, 960, 'dry', 15],
      ['peach', '桃', 'もも', 17, 4, 165, 'sunny', 14],
      ['blueberry', 'ブルーベリー', 'ぶるーべりー', 15, 12, 3, 'thirsty', 12],
      ['blackberry', 'ブラックベリー', 'ぶらっくべりー', 14, 9, 6, 'balanced', 10.5],
      ['pineapple', 'パイナップル', 'ぱいなっぷる', 20, 2, 770, 'dry', 16],
      ['mango', 'マンゴー', 'まんごー', 20, 3, 270, 'sunny', 17],
    ],
    vegetable: [
      ['tomato', 'ミニトマト', 'みにとまと', 15, 8, 16, 'balanced', 'fruit'],
      ['cucumber', 'きゅうり', 'きゅうり', 12, 5, 95, 'thirsty', 'fruit', '本'],
      ['eggplant', 'なす', 'なす', 15, 4, 90, 'thirsty', 'fruit', '本'],
      ['green-pepper', 'ピーマン', 'ぴーまん', 14, 6, 31, 'sunny', 'fruit'],
      ['shishito', 'ししとう', 'ししとう', 13, 8, 11, 'sunny', 'fruit', '本'],
      ['okra', 'オクラ', 'おくら', 12, 7, 12, 'sunny', 'fruit', '本'],
      ['zucchini', 'ズッキーニ', 'ずっきーに', 13, 4, 165, 'thirsty', 'fruit', '本'],
      ['edamame', '枝豆', 'えだまめ', 14, 12, 5, 'balanced', 'fruit', 'さや'],
      ['corn', 'とうもろこし', 'とうもろこし', 17, 3, 214, 'sunny', 'fruit', '本'],
      ['bitter-melon', 'ゴーヤ', 'ごーや', 15, 5, 131, 'thirsty', 'fruit', '本'],
    ],
    plant: [
      ['sunflower', 'ひまわり', 'ひまわり', 16, 4, 13, 'sunny'],
      ['morning-glory', '朝顔', 'あさがお', 13, 8, 7, 'sunny'],
      ['marigold', 'マリーゴールド', 'まりーごーるど', 12, 7, 5, 'dry'],
      ['lavender', 'ラベンダー', 'らべんだー', 15, 8, 3, 'dry'],
      ['hibiscus', 'ハイビスカス', 'はいびすかす', 16, 5, 11, 'sunny'],
      ['petunia', 'ペチュニア', 'ぺちゅにあ', 11, 8, 5, 'sunny'],
      ['portulaca', 'マツバボタン', 'まつばぼたん', 10, 8, 4, 'dry'],
      ['basil', 'バジル', 'ばじる', 11, 0, 24, 'balanced', 'foliage'],
    ],
  },
  {
    fruit: [
      ['grape', 'ぶどう', 'ぶどう', 17, 3, 92, 'balanced', 17.5, '房'],
      ['apple', 'りんご', 'りんご', 19, 4, 151, 'sunny', 15],
      ['pear', '梨', 'なし', 18, 4, 159, 'thirsty', 13],
      ['persimmon', '柿', 'かき', 17, 5, 152, 'sunny', 16],
      ['fig', 'いちじく', 'いちじく', 15, 5, 58, 'dry', 16],
      ['chestnut', '栗', 'くり', 19, 8, 19, 'balanced', 0],
      ['kiwi', 'キウイ', 'きうい', 18, 6, 69, 'thirsty', 15],
    ],
    vegetable: [
      ['sweet-potato', 'さつまいも', 'さつまいも', 16, 4, 144, 'dry', 'root', '本'],
      ['kabocha', 'かぼちゃ', 'かぼちゃ', 17, 2, 730, 'sunny', 'fruit'],
      ['carrot', 'にんじん', 'にんじん', 13, 5, 82, 'balanced', 'root', '本'],
      ['burdock', 'ごぼう', 'ごぼう', 16, 4, 74, 'sunny', 'root', '本'],
      ['lotus-root', 'れんこん', 'れんこん', 17, 4, 102, 'thirsty', 'root', '本'],
      ['taro', '里芋', 'さといも', 16, 6, 43, 'thirsty', 'root'],
      ['peanut', '落花生', 'らっかせい', 15, 11, 5, 'dry', 'root', 'さや'],
      ['beet', 'ビーツ', 'びーつ', 13, 4, 77, 'balanced', 'root'],
      ['red-lettuce', 'サニーレタス', 'さにーれたす', 10, 3, 105, 'shade', 'leaf', '株'],
      ['cauliflower', 'カリフラワー', 'かりふらわー', 15, 2, 380, 'balanced', 'leaf', '株'],
    ],
    plant: [
      ['cosmos', 'コスモス', 'こすもす', 12, 8, 6, 'dry'],
      ['osmanthus', '金木犀', 'きんもくせい', 16, 13, 1, 'balanced'],
      ['chrysanthemum', '菊', 'きく', 15, 6, 7, 'sunny'],
      ['celosia', 'ケイトウ', 'けいとう', 12, 6, 5, 'dry'],
      ['dahlia', 'ダリア', 'だりあ', 16, 5, 11, 'sunny'],
      ['gentian', 'リンドウ', 'りんどう', 15, 7, 4, 'shade'],
      ['anemone', '秋明菊', 'しゅうめいぎく', 14, 7, 5, 'shade'],
      ['rosemary', 'ローズマリー', 'ろーずまりー', 12, 0, 25, 'dry', 'foliage'],
    ],
  },
  {
    fruit: [
      ['mandarin', 'みかん', 'みかん', 18, 4, 81, 'balanced', 12.5],
      ['yuzu', '柚子', 'ゆず', 16, 5, 53, 'sunny', 0],
      ['lemon', 'レモン', 'れもん', 16, 5, 85, 'sunny', 0],
      ['kumquat', '金柑', 'きんかん', 15, 9, 15, 'balanced', 15],
      ['iyokan', 'いよかん', 'いよかん', 19, 3, 192, 'sunny', 13],
      ['hassaku', 'はっさく', 'はっさく', 19, 3, 247, 'dry', 11.5],
      ['shiranui', '不知火', 'しらぬい', 20, 3, 209, 'sunny', 15],
    ],
    vegetable: [
      ['napa-cabbage', '白菜', 'はくさい', 15, 2, 620, 'thirsty', 'leaf', '株'],
      ['daikon', '大根', 'だいこん', 15, 3, 310, 'balanced', 'root', '本'],
      ['turnip', 'かぶ', 'かぶ', 11, 5, 63, 'balanced', 'root'],
      ['spinach', 'ほうれん草', 'ほうれんそう', 10, 4, 62, 'shade', 'leaf', '束'],
      ['komatsuna', '小松菜', 'こまつな', 9, 4, 55, 'balanced', 'leaf', '束'],
      ['shungiku', '春菊', 'しゅんぎく', 11, 4, 52, 'dry', 'leaf', '束'],
      ['broccoli', 'ブロッコリー', 'ぶろっこりー', 14, 3, 154, 'thirsty', 'leaf', '株'],
      ['long-leek', '長ねぎ', 'ながねぎ', 15, 4, 78, 'dry', 'leaf', '本'],
      ['mizuna', '水菜', 'みずな', 10, 5, 39, 'thirsty', 'leaf', '束'],
      ['brussels-sprout', '芽キャベツ', 'めきゃべつ', 17, 10, 13, 'sunny', 'leaf'],
    ],
    plant: [
      ['pansy', 'パンジー', 'ぱんじー', 11, 7, 5, 'balanced'],
      ['cyclamen', 'シクラメン', 'しくらめん', 14, 6, 5, 'shade'],
      ['hellebore', 'クリスマスローズ', 'くりすますろーず', 17, 5, 7, 'shade'],
      ['narcissus', 'スイセン', 'すいせん', 13, 6, 5, 'dry'],
      ['ornamental-kale', '葉牡丹', 'はぼたん', 12, 0, 18, 'balanced', 'foliage'],
      ['primula', 'プリムラ', 'ぷりむら', 12, 8, 4, 'thirsty'],
      ['poinsettia', 'ポインセチア', 'ぽいんせちあ', 16, 0, 27, 'dry', 'foliage'],
      ['camellia', '椿', 'つばき', 18, 5, 8, 'shade'],
    ],
  },
];

export const CROPS = {};
export const CROPS_BY_SEASON = SEASONAL_CROPS.map((groups, season) =>
  Object.entries(groups).flatMap(([category, specs]) =>
    specs.map(([id, name, reading, idealDays, fruit, grams, profile, detail, unit]) => {
      const kind = category === 'fruit' ? 'fruit' : detail || 'flower';
      const sugar = id === 'tomato' ? 8.8 : category === 'fruit' && detail > 0 ? detail : null;
      const habit = GROWING[profile];
      CROPS[id] = { id, name, reading, season, category, kind, idealDays, fruit, grams,
        habit, difficulty: growingDifficulty(idealDays, habit), sugar, unit: unit ?? (kind === 'flower' ? '輪' : '個'),
        stages: GROWTH_STAGES[kind], points: LEGACY_SPRITES[id] };
      return id;
    })
  )
);

export const CROP_IDS = CROPS_BY_SEASON.flat();
export const isOrnamental = crop => crop.category === 'plant';

export function specimenPath(crop) {
  return crop.points ? `./assets/${crop.id}-${crop.points[5]}.webp` : `./assets/specimens/${crop.id}.webp`;
}

const GROWTH_ART = {
  tree: ['seedling', 'tree', 'tree-flower', 'tree-fruit', 'tree-fruit', 'tree-fruit'],
  vine: ['seedling', 'vine', 'vine-flower', 'vine-flower', 'vine-flower', 'vine-flower'],
  fruit: ['seedling', 'young', 'bush-bud', 'garden-fruit', 'garden-fruit', 'garden-fruit'],
  root: ['seedling', 'root', 'root', 'root', 'root', 'root'],
  leaf: ['seedling', 'young', 'herb', 'greens', 'greens', 'greens'],
  bulb: ['seedling', 'bulb', 'bulb', 'bulb', 'bulb', 'bulb'],
  flower: ['seedling', 'young', 'bush-bud', 'bush-bud'],
  stem: ['seedling', 'bulb', 'stem-bud', 'stem-bud'],
  airy: ['seedling', 'young', 'airy-bud', 'airy-bud'],
  foliage: ['seedling', 'young', 'herb', 'herb'],
  woody: ['seedling', 'young', 'woody', 'woody'],
};

const VINES = new Set(['watermelon', 'muskmelon', 'kiwi', 'cucumber', 'zucchini', 'bitter-melon', 'kabocha', 'snap-pea']);
const BULBS = new Set(['asparagus', 'spring-onion', 'chives', 'long-leek']);
const TALL_FLOWERS = new Set(['tulip', 'muscari', 'narcissus', 'gentian', 'lavender']);
const AIRY_FLOWERS = new Set(['sweet-pea', 'cosmos', 'nemophila', 'anemone']);

export function growthPath(crop, stage) {
  if (crop.points) return `./assets/${crop.id}-${crop.points[stage]}.webp`;
  if (isOrnamental(crop) && stage >= 4) return specimenPath(crop);

  let shape = crop.kind;
  if (crop.category === 'fruit' && crop.id !== 'pineapple') shape = 'tree';
  if (VINES.has(crop.id)) shape = 'vine';
  if (BULBS.has(crop.id)) shape = 'bulb';
  if (TALL_FLOWERS.has(crop.id)) shape = 'stem';
  if (AIRY_FLOWERS.has(crop.id)) shape = 'airy';
  if (crop.id === 'rosemary') shape = 'woody';
  return `./assets/growth/${GROWTH_ART[shape][stage]}.webp`;
}
