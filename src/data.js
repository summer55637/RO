(function () {
  "use strict";
  window.RO_DATA = {
    jobs: [
      { id: "novice", name: "初心者", tier: 0, parent: null, family: "novice", hp: 0, sp: 0, atk: 0, agi: 0, skills: ["basic-strike"], description: "踏上冒險旅程的起點。" },
      { id: "swordsman", name: "劍士", tier: 1, parent: "novice", family: "swordsman", hp: 20, sp: 0, atk: 4, agi: 0, skills: ["basic-strike", "bash", "magnum-break", "endure"], description: "近身物理攻擊，血量與攻擊力較高。" },
      { id: "mage", name: "法師", tier: 1, parent: "novice", family: "mage", hp: 0, sp: 25, atk: 1, agi: 0, int: 3, skills: ["basic-strike", "fire-bolt", "cold-bolt", "energy-coat"], description: "依靠 INT 與 SP 施放遠距魔法。" },
      { id: "archer", name: "弓箭手", tier: 1, parent: "novice", family: "archer", hp: 0, sp: 5, atk: 2, agi: 2, dex: 3, skills: ["basic-strike", "double-strafe", "arrow-shower", "concentration"], description: "高命中、高敏捷的遠距攻擊。" },
      { id: "thief", name: "盜賊", tier: 1, parent: "novice", family: "thief", hp: 5, sp: 5, atk: 2, agi: 4, luk: 1, skills: ["basic-strike", "envenom", "double-attack", "hiding"], description: "高敏捷、爆擊與快速攻擊。" },
      { id: "acolyte", name: "服事", tier: 1, parent: "novice", family: "acolyte", hp: 5, sp: 20, atk: 1, int: 2, skills: ["basic-strike", "heal", "holy-light", "blessing"], description: "治療、祝福，也能施放聖光。" },
      { id: "merchant", name: "商人", tier: 1, parent: "novice", family: "merchant", hp: 10, sp: 0, atk: 3, vit: 2, skills: ["basic-strike", "mammonite", "cart-revolution", "discount"], description: "重視 Zeny 與實用的物理技能。" },
      { id: "knight", name: "騎士", tier: 2, parent: "swordsman", family: "swordsman", hp: 40, sp: 5, atk: 8, agi: 1, skills: ["basic-strike", "bash", "magnum-break", "endure", "brandish-spear"], description: "劍士的進階職業，強韌且擅長近戰。" },
      { id: "wizard", name: "巫師", tier: 2, parent: "mage", family: "mage", hp: 5, sp: 45, atk: 2, int: 7, skills: ["basic-strike", "fire-bolt", "cold-bolt", "energy-coat", "storm-gust"], description: "法師的進階職業，擅長強力範圍魔法。" },
      { id: "hunter", name: "獵人", tier: 2, parent: "archer", family: "archer", hp: 10, sp: 15, atk: 6, agi: 4, dex: 6, skills: ["basic-strike", "double-strafe", "arrow-shower", "concentration", "arrow-rain"], description: "弓箭手的進階職業，精準且擅長範圍攻擊。" },
      { id: "assassin", name: "刺客", tier: 2, parent: "thief", family: "thief", hp: 15, sp: 10, atk: 7, agi: 7, luk: 2, skills: ["basic-strike", "envenom", "double-attack", "hiding", "sonic-blow"], description: "盜賊的進階職業，迅捷且擅長爆發傷害。" },
      { id: "priest", name: "祭司", tier: 2, parent: "acolyte", family: "acolyte", hp: 15, sp: 40, atk: 2, int: 5, vit: 2, skills: ["basic-strike", "heal", "holy-light", "blessing", "sanctuary"], description: "服事的進階職業，強化治療與祝福。" },
      { id: "blacksmith", name: "鐵匠", tier: 2, parent: "merchant", family: "merchant", hp: 25, sp: 5, atk: 8, str: 3, vit: 3, skills: ["basic-strike", "mammonite", "cart-revolution", "discount", "weapon-perfection"], description: "商人的進階職業，製造與重擊專家。" }
    ],
    stats: [
      { id: "str", name: "STR", zh: "力量", description: "提升物理攻擊與負重表現。" },
      { id: "agi", name: "AGI", zh: "敏捷", description: "提升攻速、迴避。" },
      { id: "vit", name: "VIT", zh: "體質", description: "提升 HP 與減少受到的傷害。" },
      { id: "int", name: "INT", zh: "智力", description: "提升 SP、魔法傷害與治療。" },
      { id: "dex", name: "DEX", zh: "靈巧", description: "提升命中與穩定傷害。" },
      { id: "luk", name: "LUK", zh: "幸運", description: "提升暴擊與物品掉落運氣。" }
    ],
    skills: {
      "basic-strike": { id: "basic-strike", name: "奮力一擊", icon: "⚔", kind: "damage", multiplier: 1.45, sp: 2, cooldown: 2, level: 1, description: "基本強力攻擊。" },
      "bash": { id: "bash", name: "狂擊", icon: "🗡", kind: "damage", multiplier: 2.35, sp: 8, cooldown: 3.2, level: 1, description: "造成高額單體物理傷害。" },
      "magnum-break": { id: "magnum-break", name: "怒爆", icon: "🔥", kind: "aoe", multiplier: 1.4, sp: 15, cooldown: 8, radius: 105, level: 1, description: "對目標周圍怪物造成範圍傷害。" },
      "endure": { id: "endure", name: "霸體", icon: "🛡", kind: "buff", buff: "defense", duration: 12, sp: 8, cooldown: 18, level: 1, description: "短時間降低受到的傷害。" },
      "fire-bolt": { id: "fire-bolt", name: "火箭術", icon: "🔥", kind: "magic", element: "fire", multiplier: 2.8, sp: 10, cooldown: 3.4, level: 1, description: "以火焰造成魔法傷害。" },
      "cold-bolt": { id: "cold-bolt", name: "冰箭術", icon: "❄", kind: "magic", element: "water", multiplier: 2.5, sp: 9, cooldown: 3.2, level: 1, description: "以冰霜造成魔法傷害。" },
      "energy-coat": { id: "energy-coat", name: "能量外套", icon: "🔮", kind: "buff", buff: "defense", duration: 15, sp: 12, cooldown: 20, level: 1, description: "用魔力形成防護。" },
      "double-strafe": { id: "double-strafe", name: "二連矢", icon: "🏹", kind: "damage", multiplier: 2.05, sp: 10, cooldown: 3.8, level: 1, description: "以兩道箭矢攻擊目標。" },
      "arrow-shower": { id: "arrow-shower", name: "箭雨", icon: "🌧", kind: "aoe", multiplier: 1.25, sp: 16, cooldown: 8, radius: 110, level: 1, description: "攻擊目標周圍的怪物。" },
      "concentration": { id: "concentration", name: "心神凝聚", icon: "🎯", kind: "buff", buff: "focus", duration: 15, sp: 10, cooldown: 20, level: 1, description: "短時間提高命中與傷害。" },
      "envenom": { id: "envenom", name: "施毒", icon: "☠", kind: "damage", multiplier: 1.8, sp: 7, cooldown: 3.8, dot: 4, level: 1, description: "造成傷害並施加持續毒傷。" },
      "double-attack": { id: "double-attack", name: "二刀連擊", icon: "⚔", kind: "damage", multiplier: 2.0, sp: 9, cooldown: 3.4, level: 1, description: "快速造成雙重傷害。" },
      "hiding": { id: "hiding", name: "隱匿", icon: "🌫", kind: "buff", buff: "defense", duration: 8, sp: 6, cooldown: 15, level: 1, description: "短時間降低受到的傷害。" },
      "heal": { id: "heal", name: "治癒術", icon: "💚", kind: "heal", power: 28, sp: 12, cooldown: 5, level: 1, description: "恢復自身 HP，效果受 INT 影響。" },
      "holy-light": { id: "holy-light", name: "神聖之光", icon: "✨", kind: "magic", element: "holy", multiplier: 2.3, sp: 10, cooldown: 4, level: 1, description: "造成聖屬性魔法傷害。" },
      "blessing": { id: "blessing", name: "天使之賜福", icon: "🌟", kind: "buff", buff: "focus", duration: 18, sp: 12, cooldown: 24, level: 1, description: "提高命中與攻擊能力。" },
      "mammonite": { id: "mammonite", name: "金錢攻擊", icon: "🪙", kind: "damage", multiplier: 3.0, sp: 5, zeny: 8, cooldown: 5, level: 1, description: "花費 Zeny 換取高額物理傷害。" },
      "cart-revolution": { id: "cart-revolution", name: "手推車攻擊", icon: "🛒", kind: "aoe", multiplier: 1.8, sp: 14, cooldown: 8, radius: 100, level: 1, description: "對目標周圍造成範圍傷害。" },
      "discount": { id: "discount", name: "低價買進", icon: "🏷", kind: "passive", level: 1, description: "被動效果：打怪取得的 Zeny 額外增加。" },
      "brandish-spear": { id: "brandish-spear", name: "騎乘突刺", icon: "🔱", kind: "damage", multiplier: 2.8, sp: 14, cooldown: 5, level: 1, description: "騎士強力近戰技能。" },
      "storm-gust": { id: "storm-gust", name: "暴風雪", icon: "🌨", kind: "aoe", multiplier: 2.15, sp: 26, cooldown: 12, radius: 145, level: 1, description: "大範圍冰霜魔法。" },
      "arrow-rain": { id: "arrow-rain", name: "鋼製箭矢", icon: "🏹", kind: "aoe", multiplier: 1.9, sp: 20, cooldown: 9, radius: 125, level: 1, description: "獵人強力範圍箭技。" },
      "sonic-blow": { id: "sonic-blow", name: "音速投擲", icon: "💨", kind: "damage", multiplier: 3.25, sp: 18, cooldown: 6, level: 1, description: "刺客的高爆發攻擊。" },
      "sanctuary": { id: "sanctuary", name: "聖母之頌歌", icon: "🌈", kind: "heal", power: 55, sp: 22, cooldown: 10, level: 1, description: "祭司更強效的治療。" },
      "weapon-perfection": { id: "weapon-perfection", name: "武器值最大化", icon: "⚒", kind: "buff", buff: "focus", duration: 20, sp: 12, cooldown: 24, level: 1, description: "鐵匠短時間強化攻擊。" }
    },
    items: {
      "novice-knife": { id: "novice-knife", name: "初心者短刀", icon: "🗡", slot: "weapon", attack: 3, stats: { agi: 1 }, price: 25, description: "輕便短刀。敏捷 +1。" },
      "iron-sword": { id: "iron-sword", name: "鐵製長劍", icon: "⚔", slot: "weapon", attack: 9, stats: { str: 2 }, price: 180, description: "可靠的近戰武器。攻擊 +9、STR +2。" },
      "wand": { id: "wand", name: "學徒法杖", icon: "🪄", slot: "weapon", attack: 2, stats: { int: 3 }, spBonus: 12, price: 150, description: "魔法攻擊與 SP 加成。INT +3、SP +12。" },
      "short-bow": { id: "short-bow", name: "短弓", icon: "🏹", slot: "weapon", attack: 7, stats: { dex: 2 }, price: 160, description: "提升遠程命中。DEX +2。" },
      "dagger": { id: "dagger", name: "盜賊小刀", icon: "🔪", slot: "weapon", attack: 6, stats: { agi: 2, luk: 1 }, price: 170, description: "輕巧、迅捷。AGI +2、LUK +1。" },
      "mace": { id: "mace", name: "木柄釘錘", icon: "🔨", slot: "weapon", attack: 6, stats: { vit: 1, str: 1 }, price: 165, description: "堅實的釘錘。STR +1、VIT +1。" },
      "battle-axe": { id: "battle-axe", name: "商人戰斧", icon: "🪓", slot: "weapon", attack: 10, stats: { str: 2 }, price: 230, description: "沉重的戰斧。攻擊 +10、STR +2。" },
      "cotton-tunic": { id: "cotton-tunic", name: "棉布上衣", icon: "👕", slot: "armor", hpBonus: 15, stats: { vit: 1 }, price: 65, description: "基礎防具。HP +15、VIT +1。" },
      "leather-armor": { id: "leather-armor", name: "皮革護甲", icon: "🥋", slot: "armor", hpBonus: 28, stats: { vit: 3 }, price: 210, description: "結實護甲。HP +28、VIT +3。" },
      "leather-boots": { id: "leather-boots", name: "輕便短靴", icon: "🥾", slot: "accessory", stats: { agi: 2 }, price: 125, description: "輕便短靴。AGI +2。" },
      "power-ring": { id: "power-ring", name: "力量戒指", icon: "💍", slot: "accessory", stats: { str: 2, luk: 1 }, price: 190, description: "STR +2、LUK +1。" },
      "sage-clip": { id: "sage-clip", name: "學者髮夾", icon: "📿", slot: "accessory", spBonus: 20, stats: { int: 2 }, price: 200, description: "INT +2、SP +20。" },
      "red-potion": { id: "red-potion", name: "紅色藥水", icon: "🧪", kind: "consumable", healing: 35, price: 18, description: "恢復 35 HP。" },
      "green-herb": { id: "green-herb", name: "綠色藥草", icon: "🌿", kind: "consumable", healing: 18, price: 9, description: "恢復 18 HP。" },
      "blue-potion": { id: "blue-potion", name: "藍色藥水", icon: "🧴", kind: "consumable", spHealing: 30, price: 30, description: "恢復 30 SP。" }
    },
    monsters: {
      "poring": { id: "poring", name: "波利", level: 1, hp: 26, attack: 3, defense: 0, exp: 12, gold: [3, 8], color: "#d95d83", sprite: "poring", drops: [{ id: "red-potion", chance: 0.16 }, { id: "green-herb", chance: 0.22 }, { id: "cotton-tunic", chance: 0.025 }] },
      "drops": { id: "drops", name: "土波利", level: 3, hp: 42, attack: 5, defense: 1, exp: 20, gold: [5, 12], color: "#e98d4b", sprite: "drops", drops: [{ id: "red-potion", chance: 0.2 }, { id: "novice-knife", chance: 0.06 }, { id: "power-ring", chance: 0.018 }] },
      "fabre": { id: "fabre", name: "綠棉蟲", level: 2, hp: 34, attack: 4, defense: 0, exp: 15, gold: [4, 10], color: "#65b777", sprite: "fabre", drops: [{ id: "green-herb", chance: 0.2 }, { id: "cotton-tunic", chance: 0.035 }] },
      "lunatic": { id: "lunatic", name: "瘋兔", level: 5, hp: 58, attack: 7, defense: 2, exp: 31, gold: [7, 15], color: "#c7b2df", sprite: "lunatic", drops: [{ id: "red-potion", chance: 0.18 }, { id: "leather-boots", chance: 0.045 }, { id: "power-ring", chance: 0.018 }] },
      "willow": { id: "willow", name: "柳樹", level: 7, hp: 78, attack: 9, defense: 3, exp: 43, gold: [10, 20], color: "#9cbb72", sprite: "willow", drops: [{ id: "green-herb", chance: 0.22 }, { id: "wand", chance: 0.035 }, { id: "sage-clip", chance: 0.018 }] },
      "wolf": { id: "wolf", name: "森林狼", level: 9, hp: 102, attack: 12, defense: 4, exp: 57, gold: [12, 24], color: "#9da4a9", sprite: "wolf", drops: [{ id: "red-potion", chance: 0.24 }, { id: "dagger", chance: 0.04 }, { id: "leather-armor", chance: 0.018 }] },
      "skeleton": { id: "skeleton", name: "骷髏兵", level: 13, hp: 148, attack: 17, defense: 6, exp: 85, gold: [18, 32], color: "#dbd9c8", sprite: "skeleton", drops: [{ id: "blue-potion", chance: 0.18 }, { id: "iron-sword", chance: 0.035 }, { id: "battle-axe", chance: 0.016 }] },
      "familiar": { id: "familiar", name: "吸血蝙蝠", level: 11, hp: 125, attack: 15, defense: 5, exp: 72, gold: [15, 28], color: "#8469a1", sprite: "familiar", drops: [{ id: "blue-potion", chance: 0.15 }, { id: "sage-clip", chance: 0.03 }, { id: "dagger", chance: 0.025 }] }
    },
    maps: {
      "field": { id: "field", name: "普隆德拉南門", shortName: "南門", type: "field", bg: "#4d8957", ground: "#4d8957", spawn: { x: 466, y: 345 }, monsterIds: ["poring", "drops", "fabre", "lunatic"], spawns: [{ type: "poring", x: 610, y: 290 }, { type: "poring", x: 748, y: 340 }, { type: "fabre", x: 390, y: 220 }, { type: "drops", x: 525, y: 410 }, { type: "lunatic", x: 260, y: 330 }], portals: [{ x: 918, y: 300, name: "南門森林", to: "forest", tx: 68, ty: 300 }, { x: 480, y: 35, name: "普隆德拉", to: "town", tx: 480, ty: 535 }] },
      "town": { id: "town", name: "普隆德拉", shortName: "城鎮", type: "town", bg: "#8eae8c", ground: "#8eae8c", spawn: { x: 480, y: 330 }, monsterIds: [], spawns: [], portals: [{ x: 480, y: 565, name: "南門郊外", to: "field", tx: 480, ty: 70 }], shop: true },
      "forest": { id: "forest", name: "迷霧森林", shortName: "森林", type: "forest", bg: "#35694c", ground: "#35694c", spawn: { x: 75, y: 300 }, monsterIds: ["lunatic", "willow", "wolf"], spawns: [{ type: "lunatic", x: 270, y: 185 }, { type: "willow", x: 425, y: 285 }, { type: "wolf", x: 665, y: 215 }, { type: "willow", x: 735, y: 415 }, { type: "wolf", x: 545, y: 455 }], portals: [{ x: 35, y: 300, name: "南門郊外", to: "field", tx: 865, ty: 300 }, { x: 918, y: 300, name: "古代洞窟", to: "cave", tx: 68, ty: 300 }] },
      "cave": { id: "cave", name: "古代洞窟", shortName: "洞窟", type: "cave", bg: "#3c4557", ground: "#3c4557", spawn: { x: 75, y: 300 }, monsterIds: ["skeleton", "familiar"], spawns: [{ type: "skeleton", x: 300, y: 210 }, { type: "familiar", x: 495, y: 310 }, { type: "skeleton", x: 670, y: 420 }, { type: "familiar", x: 785, y: 190 }], portals: [{ x: 35, y: 300, name: "迷霧森林", to: "forest", tx: 865, ty: 300 }] }
    },
    assetManifest: {
      player: "assets/sprites/player.png",
      maps: { field: "assets/maps/prontera-south.png", town: "assets/maps/prontera.png", forest: "assets/maps/misty-forest.png", cave: "assets/maps/ancient-cave.png" },
      monsters: { poring: "assets/sprites/monsters/poring.png", drops: "assets/sprites/monsters/drops.png", fabre: "assets/sprites/monsters/fabre.png", lunatic: "assets/sprites/monsters/lunatic.png", willow: "assets/sprites/monsters/willow.png", wolf: "assets/sprites/monsters/wolf.png", skeleton: "assets/sprites/monsters/skeleton.png", familiar: "assets/sprites/monsters/familiar.png" },
      sounds: { attack: "assets/sounds/attack.ogg", skill: "assets/sounds/skill.ogg", levelup: "assets/sounds/level-up.ogg", drop: "assets/sounds/item-drop.ogg" }
    }
  };
})();