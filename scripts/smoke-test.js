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

const html = read("index.html");
const scriptPaths = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1].replace(/^\.\//, ""));
assert.ok(scriptPaths.includes("src/main.js"), "main runtime script must be included");
assert.ok(scriptPaths.includes("src/expansion.js"), "expansion runtime script must be included");
assert.ok(scriptPaths.indexOf("src/main.js") < scriptPaths.indexOf("src/expansion.js"), "game API must load before expansion");
assert.ok(scriptPaths.includes("src/ui-shell.js"), "integrated UI shell must be included");
assert.ok(scriptPaths.indexOf("src/expansion.js") < scriptPaths.indexOf("src/ui-shell.js"), "UI shell must load after dynamic expansion panels");
for (const path of scriptPaths) assert.ok(fs.existsSync(root + "/" + path), "missing script file: " + path);

const main = read("src/main.js");
for (const feature of ["attackMonster", "performSkill", "changeJob", "equipmentBonuses", "saveGame", "applySave", "applyOfflineProgress", "handleWorldClick"]) {
  assert.ok(main.includes("function " + feature + "("), "main gameplay pathway missing: " + feature);
}
assert.ok(main.includes('new CustomEvent("ro:monster-killed"'), "quest progress combat event missing");
assert.ok(main.includes('window.RO_GAME_API ='), "expansion integration API missing");

const ui = read("src/ui-shell.js");
for (const feature of ["character", "quests", "equipment", "hunt", "save", "mapQuickSelect", "roExpansionGuild", "roExpansionGear", "roExpansionHunt"]) {
  assert.ok(ui.includes(feature), "integrated menu section missing: " + feature);
}
assert.ok(ui.includes('setAttribute("role", "tablist")'), "integrated menu should expose accessible tabs");
const css = read("style.css");
assert.ok(css.includes(".game-menu-tabs"), "integrated menu styling must exist");
assert.ok(css.includes(".map-quicknav"), "compact map selector styling must exist");
assert.ok(css.includes("@media (max-width: 620px)"), "responsive layout rules must exist");
assert.ok(css.includes(".expansion-gear-row"), "expansion mobile styles must be present");
const sw = read("sw.js");
assert.ok(sw.includes('"./src/expansion.js"'), "offline cache shell must include expansion module");
assert.ok(sw.includes('"./src/ui-shell.js"'), "offline cache shell must include integrated UI module");
assert.ok(sw.includes("ro-offline-adventure-v6"), "service worker cache version should be bumped");

console.log("Smoke tests passed: job/skill/item references, combat stats, drops, all map and portal references, MVP tags, required gameplay pathways, script order, and mobile/offline assets.");
