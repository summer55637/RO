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
  for (const id of job.skills) assert.ok(data.skills[id], "missing skill " + id + " for " + job.id);
}
for (const [id, skill] of Object.entries(data.skills)) {
  assert.equal(skill.id, id, "skill object id mismatch: " + id);
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
assert.ok(html.includes('id="resetStatsButton">免費初始化</button>'), "free stat reset button must exist");
assert.ok(html.includes('id="resetSkillsButton">免費初始化</button>'), "free skill reset button must exist");
for (const feature of ["attackMonster", "performSkill", "changeJob", "resetStats", "resetSkills", "saveGame", "applySave", "handleWorldClick", "drawMonster", "drawPlayer"]) {
  assert.ok(main.includes("function " + feature + "("), "core pathway missing: " + feature);
}
assert.ok(main.includes('select.id = "jobTargetSelect"'), "job choice should use a direct selector");
assert.ok(main.includes('transferButton.textContent = "直接轉職"'), "job transfer must be one clear action");
assert.ok(main.includes("function statCost(value) {\n    return 1;\n  }"), "each stat increase should cost exactly one point");
assert.ok(!main.includes("state.player.jobLevel < 10") && !main.includes("state.player.jobLevel >= 10"), "Job Lv. should not block the simplified transfer path");
assert.ok(!main.includes("p.jobLevel % 2 === 0") && !main.includes("Job 升級！"), "skill points should follow Base Level only in the mini game");
assert.ok(main.includes('player.stats[stat.id] = 5;'), "stat reset should restore starter values");
assert.ok(main.includes('state.learnedSkills = ["basic-strike"];'), "skill reset should restore the starter skill");
assert.ok(ui.includes("game-dashboard") && ui.includes("game-modal") && ui.includes("mapQuickSelect"), "compact dashboard and menus must exist");
assert.ok(css.includes(".game-dock") && css.includes(".game-modal") && css.includes(".map-quicknav"), "compact UI styles must exist");
assert.ok(sw.includes('const CACHE_NAME = "ro-mini-ro-v1";'), "browser cache must be invalidated for the unlocked mini game");
console.log("Smoke tests passed: playable mini RO, simple stat costs, direct job progression, free resets, core combat, data references, compact UI, and optional-system isolation.");
