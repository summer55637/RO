"use strict";

const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const read = (path) => fs.readFileSync(path, "utf8");
const registry = JSON.parse(read("data/official-content-registry.json"));
const sandbox = { window: {} };
vm.runInNewContext(read("src/data.js"), sandbox, { filename: "src/data.js" });
const data = sandbox.window.RO_DATA;
assert.ok(data && data.jobs && data.skills && data.items && data.monsters && data.maps, "core data tables must initialize");
assert.ok(data.jobs.every((job) => typeof job.role === "string" && job.role.length > 0), "every job needs a simple play-style label");
assert.ok(Array.isArray(data.huntRecommendations) && data.huntRecommendations.length >= 5, "level-based hunting recommendations should be inventoried");
for (const recommendation of data.huntRecommendations) {
  assert.ok(data.maps[recommendation.mapId], "recommended map should exist: " + recommendation.mapId);
  for (const monsterId of recommendation.monsterIds) {
    assert.ok(data.monsters[monsterId], "recommended monster should exist: " + monsterId);
    assert.ok(data.maps[recommendation.mapId].spawns.some((spawn) => spawn.type === monsterId), "recommended monster must appear on its recommended map");
  }
}
assert.ok(Object.values(data.skills).every((skill) => ["damage", "magic", "aoe", "heal", "buff", "passive"].includes(skill.kind)), "every skill must have a simple visible category");
assert.equal(registry.target.region, "Taiwan", "historical source-research target should remain explicit");
assert.equal(registry.target.client, "PC", "historical source-research target should remain the PC version");
assert.equal(registry.target.baselineDate, "2026-10-27", "source research date should remain explicit");

const expected = {
  jobs: data.jobs.map((entry) => ({ id: entry.id, name: entry.name })),
  skills: Object.entries(data.skills).map(([id, entry]) => ({ id, name: entry.name })),
  items: Object.entries(data.items).map(([id, entry]) => ({ id, name: entry.name })),
  monsters: Object.entries(data.monsters).map(([id, entry]) => ({ id, name: entry.name })),
  maps: Object.entries(data.maps).map(([id, entry]) => ({ id, name: entry.name }))
};
let total = 0;
let unverified = 0;
for (const dataset of registry.datasets) {
  const records = expected[dataset.id];
  assert.ok(records, "unknown inventory dataset: " + dataset.id);
  assert.equal(dataset.recordCount, records.length, "record count mismatch: " + dataset.id);
  assert.equal(dataset.records.length, records.length, "inventory rows missing: " + dataset.id);
  for (const record of records) {
    const inventoryRow = dataset.records.find((row) => row.id === record.id);
    assert.ok(inventoryRow, "missing inventory record: " + dataset.id + "/" + record.id);
    assert.equal(inventoryRow.name, record.name, "inventory name mismatch: " + dataset.id + "/" + record.id);
    if (inventoryRow.status === "unverified") unverified += 1;
  }
  total += records.length;
}

const html = read("index.html");
const css = read("style.css");
const main = read("src/main.js");
const visual = read("src/visual-effects.js");
assert.ok(html.includes('<main id="roPrototype" class="layout">'), "mini game must be unlocked");
assert.ok(!html.includes('id="roContentAuditNotice"'), "blocking notice must not return");
assert.ok(!css.includes("#roPrototype { display: none !important; }"), "CSS must not hide the game");
assert.ok(main.includes('transferButton.textContent = "直接轉職"'), "direct transfer action must remain");
assert.ok(main.includes('option.textContent = job.name + "（" + (job.tier === 1 ? "一轉" : "二轉") + "） · " + (job.role || "冒險者");'), "job selector should show a clear role label");
assert.ok(main.includes('category.className = "skill-kind";'), "skill type should be visible on the card");
assert.ok(main.includes('textContent = "職業定位：" + (job.role || "新手冒險者");'), "the main status should show job role rather than Job EXP");
assert.ok(main.includes('? (skill.kind === "passive" ? "被動生效" : "點擊施放")'), "learned skills should show their next action");
assert.ok(main.includes(': "點擊學習";'), "unlearned skills should say click to learn");
assert.ok(read("style.css").includes(".skill-kind {"), "skill type labels need a visible style");
assert.ok(read("index.html").includes("職業名稱會標示玩法定位"), "new player copy should explain job role labels");
assert.ok(main.includes("function resetStats()") && main.includes("function resetSkills()"), "both free reset handlers must exist");
assert.equal(data.monsters.poring.hp, 20, "beginner monster HP must match mini balance");
assert.equal(data.monsters.poring.exp, 17, "beginner monster EXP must match mini balance");
assert.equal(data.items["red-potion"].healing, 45, "red potion heal must match mini balance");
assert.ok(main.includes("baseExpStart: 25, baseExpPerLevel: 10"), "level progression should use a fixed, simple EXP curve");
assert.ok(!main.includes("const accuracy = clamp("), "normal attacks should not have frustrating miss checks");
assert.ok(html.includes('id="newPlayerGuide"') && html.includes('id="newPlayerGuideText"'), "a first-action hint must be visible on the play screen");
assert.ok(html.includes('id="huntGuide"') && html.includes('id="huntMapButton"') && html.includes('id="huntMonsterButton"'), "a visible level-based hunting guide must offer map and monster actions");
assert.ok(main.includes("function huntDifficultyLabel(monster)") && main.includes("statLine.textContent = huntDifficultyLabel(monster)"), "monster book must show simple difficulty and suggested level");
assert.ok(main.includes("trackMonster: (type) => trackMonster(type),"), "hunt guide must be able to track the target monster");
assert.ok(read("src/ui-shell.js").includes("api.switchMap(activeHuntRecommendation.mapId);\n        api.trackMonster(activeHuntRecommendation.monsterIds[0])"), "hunting target button should open the intended map before tracking");
assert.ok(read("src/ui-shell.js").includes('title: "新手推薦"'), "beginner maps must be listed first");
assert.ok(read("src/ui-shell.js").includes('guideText.textContent = "升級了！點底部「角色」加點，或在技能欄學新技能。"'), "level-up should direct players to their next meaningful action");
assert.ok(main.includes('potionButton.disabled = p.potions <= 0;'), "the potion button should clearly disable when supplies run out");
assert.equal(registry.jobTransferUxAudit.playablePrototypeUnlocked, true, "registry must match playable state");
assert.equal(registry.resetUxAudit.playablePrototypeUnlocked, true, "registry must match free-reset UX");
assert.ok(read("MINI_RO_DESIGN.md").includes("不宣稱完整對齊台灣 RO PC 正服"), "mini game scope must be stated clearly");
assert.ok(read("src/ui-shell.js").includes("renderHuntGuide()") && read("src/ui-shell.js").includes('window.addEventListener("ro:level-up", renderHuntGuide)'), "hunting guide must update when the player levels up");
assert.ok(main.includes('detail: { target: monster.type, critical: critical, damage: damage }'), "combat event must expose accurate damage and critical state");
assert.ok(visual.includes('addEffect("critical"') && visual.includes('addEffect("reward"'), "combat visuals must distinguish critical hits and defeat rewards");
assert.ok(css.includes(".game-frame.combat-shake") && css.includes("prefers-reduced-motion"), "combat animation must be short and motion-accessible");
assert.ok(main.includes('button.textContent = item.slot ? "購買並裝備" : "購買"'), "store must clearly show immediate equipment behavior");
assert.ok(main.includes('const spDelta = (item.spBonus || 0)'), "equipment comparisons must include SP bonuses as well as attack and other stats");
assert.ok(main.includes('if (item.slot) {\n      equipItem(itemId, true);\n      logMessage("購買並裝備了"'), "purchasing equipment must equip it and keep the replaced item in the inventory");
assert.ok(read("src/ui-shell.js").includes('panels: [".equipment-panel", "#shopPanel"]') && !read("src/ui-shell.js").includes('const quarantinedPanels = [".idle-panel", ".map-book-panel", "#shopPanel"'), "shop must be placed in the primary equipment modal instead of hidden");
assert.ok(html.includes("還差 ") || main.includes('"還差 " + fmt(price - state.player.gold) + " Zeny"'), "unaffordable purchases must explain how much Zeny is missing");

console.log("Mini RO audit passed: " + total + " gameplay data rows inventoried; " + unverified + " still marked unverified for official-source research. Unverified rows are tracked transparently and no longer block playability; this is not an official parity certification.");
