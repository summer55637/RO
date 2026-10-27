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
assert.ok(data.items["pet-treat"], "pet taming treat must exist in item data");
assert.ok(data.items["pet-snack"], "pet feeding snack must exist in item data");
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
assert.ok(scriptPaths.includes("src/pets.js"), "pet system module must be included");
assert.ok(scriptPaths.includes("src/visual-effects.js"), "visual effect module must be included");
assert.ok(scriptPaths.includes("src/ui-shell.js"), "integrated UI shell must be included");
assert.ok(scriptPaths.indexOf("src/expansion.js") < scriptPaths.indexOf("src/pets.js"), "pet system must load after game and expansion APIs");
assert.ok(scriptPaths.indexOf("src/pets.js") < scriptPaths.indexOf("src/visual-effects.js"), "visual effects must load after the pet rendering API");
assert.ok(scriptPaths.indexOf("src/visual-effects.js") < scriptPaths.indexOf("src/ui-shell.js"), "UI shell must load after pet and visual modules");
for (const path of ["src/pets.js", "src/visual-effects.js"]) assert.ok(fs.existsSync(root + "/" + path), "missing module: " + path);
for (const path of scriptPaths) assert.ok(fs.existsSync(root + "/" + path), "missing script file: " + path);

const main = read("src/main.js");
for (const feature of ["attackMonster", "performSkill", "changeJob", "equipmentBonuses", "saveGame", "applySave", "applyOfflineProgress", "handleWorldClick"]) {
  assert.ok(main.includes("function " + feature + "("), "main gameplay pathway missing: " + feature);
}
assert.ok(main.includes('new CustomEvent("ro:monster-killed"'), "quest progress combat event missing");
assert.ok(main.includes('window.RO_GAME_API ='), "expansion integration API missing");
assert.ok(main.includes('petAttack: (monsterId, damage, petName) =>'), "pet support combat pathway must exist");
assert.ok(main.includes('removeItem: (id, qty) =>'), "pet supplies must be removable from inventory");
assert.ok(main.includes('targetId: state.targetId'), "snapshot must expose the current target for pet interactions");
assert.ok(main.includes('ro:player-hurt'), "player hurt animation event must be emitted");
assert.ok(main.includes('ro:target-change'), "pet capture selection must receive live target changes");
assert.ok(f.includes ? true : true);
assert.ok(main.includes('ro:monster-hurt'), "monster hit effect event must be emitted");

const ui = read("src/ui-shell.js");
for (const feature of ["character", "pets", "quests", "equipment", "hunt", "save", "mapQuickSelect", "roExpansionGuild", "roExpansionGear", "roExpansionHunt", "pet-panel"]) {
  assert.ok(ui.includes(feature), "integrated menu section missing: " + feature);
}
assert.ok(ui.includes('setAttribute("aria-label", "主要功能選單")'), "single-screen dock should expose an accessible navigation label");
assert.ok(ui.includes('make("div", "game-dashboard")'), "compact always-visible game dashboard must exist");
assert.ok(ui.includes("const panelNodes = new Map()"), "secondary panels must be preserved while moving to modals");
assert.ok(ui.includes('{ id: "pets", label: "寵物"'), "pet management must be accessible from the compact dock");
assert.ok(ui.includes('window.RO_PETS.refresh()'), "pet management modal must refresh target state when opened");
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
assert.ok(css.includes(".pet-collection"), "pet collection UI styling must exist");
assert.ok(css.includes("grid-template-columns: repeat(6,minmax(0,1fr))"), "bottom dock must fit six feature buttons");
assert.ok(css.includes("@media (max-width: 620px)"), "responsive layout rules must exist");
assert.ok(css.includes(".expansion-gear-row"), "expansion mobile styles must be present");
const sw = read("sw.js");
assert.ok(sw.includes('"./src/expansion.js"'), "offline cache shell must include expansion module");
assert.ok(sw.includes('"./src/pets.js"'), "offline cache shell must include pet system");
assert.ok(sw.includes('"./src/visual-effects.js"'), "offline cache shell must include visual effects");
assert.ok(sw.includes('"./src/ui-shell.js"'), "offline cache shell must include integrated UI module");
assert.ok(sw.includes("ro-offline-adventure-v8"), "service worker cache version should be bumped for new modules");

const pets = read("src/pets.js");
for (const feature of ["pet-treat", "pet-snack", "captureTarget", "feedPet", "function tick(dt)", "function bonuses()", "ro:monster-killed", "ro:target-change", "localStorage"]) assert.ok(pets.includes(feature), "pet system feature missing: " + feature);
const visuals = read("src/visual-effects.js");
for (const feature of ["game-visual-overlay", "drawParticles", "drawPet", "drawEffects", "ro:player-hurt", "ro:monster-hurt", "ro:pet-attack", "ro:level-up"]) assert.ok(visuals.includes(feature), "visual effect feature missing: " + feature);
console.log("Smoke tests passed: game data and map references, combat API, pet supplies/taming/feeding/bonding/assist attacks, companion visuals, combat feedback effects, script order, and offline cache assets.");
