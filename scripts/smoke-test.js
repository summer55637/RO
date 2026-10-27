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
const unique = (values, label) => {
  assert.equal(new Set(values).size, values.length, label + " must be unique");
};
unique(data.jobs.map((x) => x.id), "job ids");
unique(Object.keys(data.skills), "skill ids");
unique(Object.keys(data.items), "item ids");
unique(Object.keys(data.monsters), "monster ids");
unique(Object.keys(data.maps), "map ids");

for (const job of data.jobs) {
  assert.ok(Array.isArray(job.skills), "job skills must be an array: " + job.id);
  for (const id of job.skills) assert.ok(data.skills[id], "missing skill " + id + " for " + job.id);
}
for (const [id, skill] of Object.entries(data.skills)) {
  assert.equal(skill.id, id, "skill object id mismatch: " + id);
  if (skill.sp != null) assert.ok(skill.sp >= 0, "negative SP cost: " + id);
  if (skill.cooldown != null) assert.ok(skill.cooldown >= 0, "negative cooldown: " + id);
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
for (const id of ["geffen", "morroc", "payon", "izlude", "pyramid", "glast-heim", "mvp-lair"]) assert.ok(data.maps[id], "missing expansion location: " + id);
for (const id of ["osiris", "moonlight-flower", "baphomet"]) assert.equal(data.monsters[id].boss, true, "MVP must be tagged: " + id);

const registry = JSON.parse(read("data/official-content-registry.json"));
const jobRegistry = registry.datasets.find((dataset) => dataset.id === "jobs");
assert.ok(jobRegistry, "job registry section must exist");
assert.equal(jobRegistry.records.length, data.jobs.length, "every prototype job needs a registry entry");
assert.ok(jobRegistry.records.every((record) => record.status === "unverified"), "job records must remain unverified until direct official evidence exists");
assert.ok(jobRegistry.records.every((record) => Object.values(record.fieldStatus || {}).every((status) => status === "unverified")), "job hierarchy/level/transfer fields must remain unverified");
assert.ok(registry.jobSystemRules.some((rule) => rule.id === "level-expansion-lv275" && rule.appliesToRuntime === false), "Lv275 official announcement must not be guessed into runtime data");
assert.ok(registry.jobSystemRules.some((rule) => rule.status === "historical-rule-requires-current-revalidation"), "historical transfer conditions must not automatically become current runtime rules");

const html = read("index.html");
const scriptPaths = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1].replace(/^\.\//, ""));
assert.ok(scriptPaths.includes("src/main.js"), "main runtime script must be included");
assert.ok(!scriptPaths.includes("src/expansion.js"), "unverified custom quests/NPC/refine/card module must remain disabled");
assert.ok(!scriptPaths.includes("src/pets.js"), "unverified custom pet evolution/skill module must remain disabled");
assert.ok(scriptPaths.includes("src/visual-effects.js"), "visual effect module must be included");
assert.ok(scriptPaths.includes("src/ui-shell.js"), "integrated UI shell must be included");
assert.ok(scriptPaths.indexOf("src/visual-effects.js") < scriptPaths.indexOf("src/ui-shell.js"), "UI shell must load after the visual effects module");
assert.ok(!data.items["pet-treat"] && !data.items["pet-snack"], "invented pet snack items must not be present in the game database");
for (const path of ["src/visual-effects.js"]) assert.ok(fs.existsSync(root + "/" + path), "missing module: " + path);
for (const path of scriptPaths) assert.ok(fs.existsSync(root + "/" + path), "missing script file: " + path);

const main = read("src/main.js");
for (const feature of ["attackMonster", "performSkill", "changeJob", "equipmentBonuses", "saveGame", "applySave", "applyOfflineProgress", "handleWorldClick", "drawMonster", "drawPlayer"]) {
  assert.ok(main.includes("function " + feature + "("), "main gameplay pathway missing: " + feature);
}
assert.ok(main.includes('new CustomEvent("ro:monster-killed"'), "quest progress combat event missing");
assert.ok(main.includes('window.RO_GAME_API ='), "expansion integration API missing");
assert.ok(main.includes('petAttack: (monsterId, damage, petName) =>'), "pet support combat pathway must exist");
assert.ok(main.includes('removeItem: (id, qty) =>'), "pet supplies must be removable from inventory");
assert.ok(main.includes('targetId: state.targetId'), "snapshot must expose the current target for pet interactions");
assert.ok(main.includes('ro:player-hurt'), "player hurt animation event must be emitted");
assert.ok(main.includes('ro:target-change'), "pet capture selection must receive live target changes");
assert.ok(main.includes('ro:monster-hurt'), "monster hit effect event must be emitted");
assert.ok(main.includes("player._facing = dx < -0.08"), "player movement must update sprite facing");
assert.ok(main.includes("monster._walkFrame = (monster._walkFrame || 0) + dt * 11"), "monster chase motion must drive a walk cycle");
assert.ok(main.includes("const swingAngle = attacking ?"), "player weapons must animate through the attack window");
assert.ok(main.includes("const palette = {"), "job families must have distinct pixel sprite palettes");
assert.ok(main.includes("for (let piece = 0; piece < 10; piece++)"), "monster death should dissolve into pixel fragments");

const ui = read("src/ui-shell.js");
for (const feature of ["character", "equipment", "save", "mapQuickSelect"]) {
  assert.ok(ui.includes(feature), "integrated menu section missing: " + feature);
}
assert.ok(ui.includes("quarantinedPanels"), "unverified panels must be quarantined in hidden DOM");
assert.ok(!ui.includes('{ id: "pets", label: "寵物"'), "custom pet menu must not be exposed");
assert.ok(!ui.includes('{ id: "quests", label: "任務"'), "custom NPC/quest menu must not be exposed");
assert.ok(!ui.includes('{ id: "hunt", label: "狩獵"'), "unverified auto-hunt menu must not be exposed");
assert.ok(ui.includes('setAttribute("aria-label", "主要功能選單")'), "single-screen dock should expose an accessible navigation label");
assert.ok(ui.includes('make("div", "game-dashboard")'), "compact always-visible game dashboard must exist");
assert.ok(ui.includes("const panelNodes = new Map()"), "secondary panels must be preserved while moving to modals");
assert.ok(ui.includes('[".character-panel", ".skills-panel", ".target-panel"].forEach((selector) => {'), "all three core panels must be cached before the dashboard is built");
assert.ok(ui.includes('make("div", "game-modal")'), "secondary panels should open in modal overlays");
assert.ok(ui.includes('play.insertBefore(quickNav, oldMapTabs)'), "compact map selector must be inserted into the play column");
assert.ok(!ui.includes('game-menu-views'), "old scrolling tab-page interface should be removed");
const css = read("style.css");
assert.ok(css.includes(".game-dock"), "one-screen bottom dock styling must exist");
assert.ok(css.includes(".game-modal"), "secondary feature modal styling must exist");
assert.ok(css.includes("overflow: hidden"), "page-level scrolling should be disabled for the game shell");
assert.ok(css.includes("100dvh"), "layout should fit the dynamic viewport height");
assert.ok(css.includes(".map-quicknav"), "compact map selector styling must exist");
assert.ok(css.includes(".game-visual-overlay"), "ambient visual overlay styling must exist");
assert.ok(css.includes("grid-template-columns: repeat(3,minmax(0,1fr))"), "bottom dock must fit the three active controls");
assert.ok(css.includes("@media (max-width: 620px)"), "responsive layout rules must exist");
assert.ok(css.includes(".expansion-gear-row"), "expansion mobile styles must be present");
const sw = read("sw.js");
assert.ok(!sw.includes('"./src/expansion.js"'), "offline cache must not precache the quarantined expansion module");
assert.ok(!sw.includes('"./src/pets.js"'), "offline cache must not precache the quarantined pet module");
assert.ok(sw.includes('"./src/visual-effects.js"'), "offline cache shell must include visual effects");
assert.ok(sw.includes('"./src/ui-shell.js"'), "offline cache shell must include integrated UI module");
assert.ok(sw.includes("ro-offline-adventure-v12"), "service worker cache must be invalidated after enforcing the prototype lock");

assert.ok(!html.includes('src/pets.js'), "unverified pet module must not be loaded");
assert.ok(!html.includes('src/expansion.js'), "unverified expansion module must not be loaded");
assert.ok(html.includes('<main id="roPrototype" class="layout" hidden aria-hidden="true">'), "unverified core gameplay must remain locked until its data is audited");
assert.ok(css.includes("#roPrototype { display: none !important; }"), "CSS must keep the unaudited prototype hidden even if hidden attributes are stripped");
assert.ok(html.includes('class="panel idle-panel" hidden'), "unverified auto-hunt panel must be hidden");
assert.ok(main.includes("state.idleEnabled = false; // Strict mode"), "old saves must not restore auto-hunt");
assert.ok(main.includes("offline hunting is not enabled until verified"), "offline rewards must be disabled pending source verification");
const policy = read("RO_OFFICIAL_CONTENT_POLICY.md");
assert.ok(policy.includes("不得新增"), "official content policy must explicitly prohibit unverified additions");
const visuals = read("src/visual-effects.js");
for (const feature of ["game-visual-overlay", "drawParticles", "drawEffects", "ro:player-hurt", "ro:monster-hurt", "level-up"]) assert.ok(visuals.includes(feature), "visual effect feature missing: " + feature);
console.log("Smoke tests passed: data references, core combat API, strict-mode module quarantine, disabled unverified pet/offline systems, UI controls, pixel animation paths, and offline cache.");
