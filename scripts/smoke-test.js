"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const root = process.cwd();
const read = (path) => fs.readFileSync(root + "/" + path, "utf8");
const sandbox = { window: {} };
vm.runInNewContext(read("src/data.js"), sandbox, { filename: "src/data.js" });
const data = sandbox.window.RO_DATA;

assert.ok(data && Array.isArray(data.jobs), "game data must initialize");
const unique = (values, label) => assert.equal(new Set(values).size, values.length, label + " must be unique");
unique(data.jobs.map((x) => x.id), "job ids");
unique(Object.keys(data.skills), "skill ids");
unique(Object.keys(data.items), "item ids");
unique(Object.keys(data.monsters), "monster ids");
unique(Object.keys(data.maps), "map ids");

for (const job of data.jobs) {
  assert.ok(Array.isArray(job.skills), "job skills must be an array: " + job.id);
  assert.ok(typeof job.role === "string" && job.role.length > 0, "each job needs a clear short role: " + job.id);
  for (const id of job.skills) assert.ok(data.skills[id], "missing skill " + id + " for " + job.id);
}
for (const [id, skill] of Object.entries(data.skills)) {
  assert.equal(skill.id, id, "skill object id mismatch: " + id);
  assert.ok(["damage", "magic", "aoe", "heal", "buff", "passive"].includes(skill.kind), "skill must have a clear category: " + id);
  assert.ok(typeof skill.description === "string" && skill.description.length > 0, "skill description must exist: " + id);
  if (skill.sp != null) assert.ok(skill.sp >= 0, "negative SP cost: " + id);
}
for (const [id, item] of Object.entries(data.items)) {
  assert.equal(item.id, id, "item object id mismatch: " + id);
  if (item.slot) assert.ok(["weapon", "armor", "accessory"].includes(item.slot), "invalid equip slot: " + id);
}
for (const [id, monster] of Object.entries(data.monsters)) {
  assert.equal(monster.id, id, "monster object id mismatch: " + id);
  assert.ok(monster.hp > 0 && monster.level >= 1 && monster.attack >= 0, "invalid combat stats: " + id);
  for (const drop of monster.drops || []) assert.ok(data.items[drop.id], "invalid monster drop: " + id + " -> " + drop.id);
}
assert.equal(data.monsters.poring.hp, 20, "Poring should have a beginner-friendly HP value");
assert.equal(data.monsters.poring.attack, 2, "Poring attacks should be gentler");
assert.equal(data.monsters.poring.exp, 17, "early EXP rewards should be higher");
assert.equal(data.monsters.osiris.hp, 833, "bosses should remain tougher than normal monsters but less grindy");
assert.equal(data.items["red-potion"].healing, 45, "red potions should restore the documented 45 HP");
assert.ok(Array.isArray(data.huntRecommendations) && data.huntRecommendations.length >= 5, "level-based hunting recommendations must exist");
let nextHuntLevel = 1;
for (const recommendation of data.huntRecommendations) {
  assert.equal(recommendation.minLevel, nextHuntLevel, "hunting recommendations should cover every level without gaps");
  assert.ok(recommendation.maxLevel >= recommendation.minLevel, "invalid recommendation level range");
  assert.ok(data.maps[recommendation.mapId], "recommended map must exist: " + recommendation.mapId);
  assert.ok(recommendation.monsterIds.length > 0, "recommendation needs at least one target monster");
  for (const monsterId of recommendation.monsterIds) {
    assert.ok(data.monsters[monsterId], "recommended monster must exist: " + monsterId);
    assert.ok(data.maps[recommendation.mapId].spawns.some((spawn) => spawn.type === monsterId), "recommended monster must appear on its map: " + monsterId + " / " + recommendation.mapId);
  }
  assert.ok(recommendation.title && recommendation.tip, "recommendation should include a clear title and tip");
  nextHuntLevel = recommendation.maxLevel + 1;
}
assert.equal(nextHuntLevel, 100, "hunting recommendations should cover Base Lv. 1 through 99");
for (const [id, map] of Object.entries(data.maps)) {
  assert.equal(map.id, id, "map object id mismatch: " + id);
  assert.ok(map.spawn && map.spawn.x >= 0 && map.spawn.x <= 960 && map.spawn.y >= 0 && map.spawn.y <= 600, "invalid player spawn: " + id);
  assert.ok(Array.isArray(map.spawns) && Array.isArray(map.portals), "map must define spawns and portals: " + id);
  for (const spawn of map.spawns) {
    assert.ok(data.monsters[spawn.type], "unknown spawn type: " + id + " -> " + spawn.type);
    assert.ok(spawn.x >= 0 && spawn.x <= 960 && spawn.y >= 0 && spawn.y <= 600, "monster spawn out of bounds: " + id);
  }
  for (const portal of map.portals) assert.ok(data.maps[portal.to], "invalid portal destination: " + id + " -> " + portal.to);
}

const html = read("index.html");
const css = read("style.css");
const main = read("src/main.js");
const visual = read("src/visual-effects.js");
const ui = read("src/ui-shell.js");
const sw = read("sw.js");
const scriptPaths = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1].replace(/^\.\//, ""));
assert.ok(scriptPaths.includes("src/main.js"), "core gameplay must load");
assert.ok(scriptPaths.includes("src/visual-effects.js"), "visual effects must load");
assert.ok(scriptPaths.includes("src/ui-shell.js"), "compact UI must load");
assert.ok(!scriptPaths.includes("src/expansion.js") && !scriptPaths.includes("src/pets.js"), "advanced optional systems must stay outside the mini game's main flow");
assert.ok(html.includes('<main id="roPrototype" class="layout">'), "the game must be available immediately");
assert.ok(!html.includes('id="roContentAuditNotice"'), "the old blocking audit notice must be removed");
assert.ok(!css.includes("#roPrototype { display: none !important; }"), "CSS must not re-lock the playable game");
assert.ok(html.includes("點擊地面") && html.includes("點擊怪物"), "controls must be explained in the game view");
assert.ok(html.includes('id="newPlayerGuide"') && html.includes('id="newPlayerGuideText"'), "a visible first-action guide must exist");
assert.ok(html.includes('id="huntGuide"') && html.includes('id="huntMapButton"') && html.includes('id="huntMonsterButton"'), "the game view must include a level-based hunting guide with working actions");
assert.ok(ui.includes('title: "新手推薦"') && ui.includes('title: "地下城與 Boss（較難）"'), "map selection should put beginner areas first and label difficult areas");
assert.ok(ui.includes('window.addEventListener("ro:monster-killed"') && ui.includes('window.addEventListener("ro:level-up"'), "onboarding guidance should respond to first combat and level-up");
assert.ok(main.includes('potionButton.textContent = p.potions > 0 ? "✚ 使用紅色藥水（" + p.potions + "）"'), "the main action should show the number of red potions left");
assert.ok(main.includes("function huntDifficultyLabel(monster)"), "monster entries should have a difficulty helper");
assert.ok(main.includes("Boss 挑戰 · 建議 Lv."), "bosses should be marked as challenges with a suggested level");
assert.ok(main.includes("statLine.textContent = huntDifficultyLabel(monster)"), "the monster book should show difficulty and recommended level");
assert.ok(css.includes(".dashboard-character .stat-grid { display: none !important; }"), "secondary combat metrics should stay off the main status panel");
assert.ok(html.includes('id="resetStatsButton">免費初始化</button>'), "free stat reset button must exist");
assert.ok(html.includes('id="resetSkillsButton">免費初始化</button>'), "free skill reset button must exist");
for (const feature of ["attackMonster", "performSkill", "changeJob", "resetStats", "resetSkills", "saveGame", "applySave", "handleWorldClick", "drawMonster", "drawPlayer"]) {
  assert.ok(main.includes("function " + feature + "("), "core pathway missing: " + feature);
}
assert.ok(main.includes('select.id = "jobTargetSelect"'), "job choice should use a direct selector");
assert.ok(main.includes('option.textContent = job.name + "（" + (job.tier === 1 ? "一轉" : "二轉") + "） · " + (job.role || "冒險者");'), "job options should display their simple play style");
assert.ok(main.includes('const skillKindLabel = (kind) => ({'), "skills should map to simple categories");
assert.ok(main.includes('category.className = "skill-kind";'), "skill cards should show a visible type label");
assert.ok(main.includes('? (skill.kind === "passive" ? "被動生效" : "點擊施放")'), "learned skills should clearly say they can be used");
assert.ok(main.includes(': "點擊學習";'), "unlearned skills should clearly say they can be learned");
assert.ok(main.includes('textContent = "職業定位：" + (job.role || "新手冒險者");'), "the status panel should show job style instead of confusing Job EXP");
assert.ok(css.includes(".skill-kind {"), "skill type labels should be styled");
assert.ok(html.includes("職業名稱會標示玩法定位"), "job selection instructions should explain role tags");
assert.ok(main.includes('transferButton.textContent = "直接轉職"'), "job transfer must be one clear action");
assert.ok(main.includes("function statCost(value) {\n    return 1;\n  }"), "each stat increase should cost exactly one point");
assert.ok(!main.includes("state.player.jobLevel < 10") && !main.includes("state.player.jobLevel >= 10"), "Job Lv. should not block the simplified transfer path");
assert.ok(main.includes("const MINI_BALANCE = Object.freeze({ baseExpStart: 25, baseExpPerLevel: 10, potionHeal: 45 });"), "leveling and potion values should use one simple balance profile");
assert.ok(main.includes("const baseExpNeeded = () => MINI_BALANCE.baseExpStart + (state.player.level - 1) * MINI_BALANCE.baseExpPerLevel;"), "EXP needed per level should grow by a simple fixed amount");
assert.ok(main.includes('return Math.max(1, 3 + state.player.level + totalStat("str") + Math.floor(totalStat("dex") / 4) + (job.atk || 0) + gear.attack);'), "basic attack should use a readable additive formula");
assert.ok(!main.includes("const accuracy = clamp(") && !main.includes("攻擊落空。"), "basic attacks should no longer randomly miss");
assert.ok(main.includes("Math.floor(attackPower() - monster.defense)"), "basic attack damage should be predictable");
assert.ok(!main.includes("p.jobLevel % 2 === 0") && !main.includes("Job 升級！"), "skill points should follow Base Level only in the mini game");
assert.ok(main.includes('player.stats[stat.id] = 5;'), "stat reset should restore starter values");
assert.ok(main.includes('state.learnedSkills = ["basic-strike"];'), "skill reset should restore the starter skill");
assert.ok(ui.includes("game-dashboard") && ui.includes("game-modal") && ui.includes("mapQuickSelect"), "compact dashboard and menus must exist");
assert.ok(ui.includes("renderHuntGuide()") && ui.includes("activeHuntRecommendation"), "hunting advice should update from current player level");
assert.ok(ui.includes('window.addEventListener("ro:level-up", renderHuntGuide)'), "hunting recommendation should refresh after level-up");
assert.ok(ui.includes("api.switchMap(activeHuntRecommendation.mapId);\n        api.trackMonster(activeHuntRecommendation.monsterIds[0])"), "tracking a recommended monster should first open its recommended map");
assert.ok(css.includes(".game-dock") && css.includes(".game-modal") && css.includes(".map-quicknav"), "compact UI styles must exist");
assert.ok(css.includes(".hunt-guide {") && css.includes(".hunt-guide-actions"), "level-based hunting recommendation should be easy to distinguish");
assert.ok(main.includes('detail: { target: monster.type, critical: critical, damage: damage }'), "attack events must include the actual damage and critical-hit state");
assert.ok(main.includes('source: source || "普通攻擊", critical: source === "暴擊"'), "monster-hit events must carry readable impact metadata");
assert.ok(visual.includes('addEffect("critical"') && visual.includes('addEffect("reward"'), "critical hits and monster defeats should have dedicated visual feedback");
assert.ok(visual.includes('triggerShake("player")') && visual.includes('combat-player-flash'), "player hits should have a clear but brief reaction");
assert.ok(css.includes("@keyframes combat-shake") && css.includes("prefers-reduced-motion"), "impact motion must be styled and respect reduced-motion preferences");
assert.ok(main.includes('function compareItem(item)') && main.includes('const spDelta = (item.spBonus || 0)'), "equipment comparison must include attack, stats, HP and SP changes");
assert.ok(main.includes('button.textContent = "購買";'), "shop purchase should be separate from equipping");
assert.ok(main.includes('function buyItem(itemId)') && main.includes('state.player.gold -= price;\n    addInventory(itemId, 1);\n    logMessage("購買了" + item.name'), "purchased gear must enter the inventory before the player equips it");
assert.ok(!main.includes('equipItem(itemId, true)') && !main.includes('購買並裝備了'), "buying gear must not automatically equip it");
assert.ok(main.includes('"補給品" : "裝備升級"') && main.includes('"還差 " + fmt(price - state.player.gold) + " Zeny"'), "shop should group supplies and gear and explain unaffordable items");
assert.ok(ui.includes('panels: [".equipment-panel", "#shopPanel"]') && !ui.includes('const quarantinedPanels = [".idle-panel", ".map-book-panel", "#shopPanel"'), "shop must be accessible inside the equipment modal, not hidden away");
assert.ok(html.includes('id="shopPanel"') && html.includes("買裝備會直接穿上"), "equipment and shop guidance must be visible");
assert.ok(css.includes(".shop-section-title") && css.includes(".shop-row .mini-button:disabled"), "shop categories and unavailable purchase states must be visually distinct");
assert.ok(sw.includes('const CACHE_NAME = "ro-mini-ro-v8";'), "equipment and shop UI changes must refresh offline cache");
console.log("Smoke tests passed: intuitive equipment comparison and RO-style separate purchase/equip steps, purchase feedback, combat, reduced motion, simple progression, data references, and compact UI.");
