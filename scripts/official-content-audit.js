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
assert.ok(html.includes('<main id="roPrototype" class="layout">'), "mini game must be unlocked");
assert.ok(!html.includes('id="roContentAuditNotice"'), "blocking notice must not return");
assert.ok(!css.includes("#roPrototype { display: none !important; }"), "CSS must not hide the game");
assert.ok(main.includes('transferButton.textContent = "直接轉職"'), "direct transfer action must remain");
assert.ok(main.includes("function resetStats()") && main.includes("function resetSkills()"), "both free reset handlers must exist");
assert.equal(registry.jobTransferUxAudit.playablePrototypeUnlocked, true, "registry must match playable state");
assert.equal(registry.resetUxAudit.playablePrototypeUnlocked, true, "registry must match free-reset UX");
assert.ok(read("MINI_RO_DESIGN.md").includes("不宣稱完整對齊台灣 RO PC 正服"), "mini game scope must be stated clearly");

console.log("Mini RO audit passed: " + total + " gameplay data rows inventoried; " + unverified + " still marked unverified for official-source research. Unverified rows are tracked transparently and no longer block playability; this is not an official parity certification.");
