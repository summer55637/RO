"use strict";

const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const read = (path) => fs.readFileSync(path, "utf8");
const registry = JSON.parse(read("data/official-content-registry.json"));
const html = read("index.html");
const css = read("style.css");
const main = read("src/main.js");
const sw = read("sw.js");
const sandbox = { window: {} };
vm.runInNewContext(read("src/data.js"), sandbox, { filename: "src/data.js" });
const data = sandbox.window.RO_DATA;

assert.ok(data && data.jobs && data.skills && data.items && data.monsters && data.maps, "RO_DATA must initialize");
assert.equal(registry.schemaVersion, 1, "unsupported official registry schema");
assert.equal(registry.target.region, "Taiwan", "target must remain Taiwan PC RO");
assert.equal(registry.target.client, "PC", "target must remain the PC client");
assert.equal(registry.target.baselineDate, "2026-10-27", "baseline date must stay explicit");
assert.equal(registry.target.baselineType, "official-public-notice-cutoff-not-a-client-build-id", "baseline must not be misrepresented as an official client build");
assert.equal(registry.target.officialClientBuildId, null, "do not invent an official client build id");

const allowedHosts = new Set(["ro.gnjoy.com.tw", "www.ro.gnjoy.com.tw"]);
const sourceMap = new Map();
for (const source of registry.sources) {
  assert.ok(source.id && !sourceMap.has(source.id), "source IDs must exist and be unique");
  sourceMap.set(source.id, source);
  const url = new URL(source.url);
  assert.equal(url.protocol, "https:", "official evidence must use HTTPS: " + source.id);
  assert.ok(allowedHosts.has(url.hostname), "only Taiwan RO official domain can be used as official evidence: " + source.url);
  assert.equal(source.official, true, "all registered official sources must identify as official");
}

const expectedRecords = {
  jobs: data.jobs.map((record) => ({ id: record.id, name: record.name })),
  skills: Object.entries(data.skills).map(([id, record]) => ({ id, name: record.name })),
  items: Object.entries(data.items).map(([id, record]) => ({ id, name: record.name })),
  monsters: Object.entries(data.monsters).map(([id, record]) => ({ id, name: record.name })),
  maps: Object.entries(data.maps).map(([id, record]) => ({ id, name: record.name }))
};
assert.deepEqual(registry.datasets.map((dataset) => dataset.id).sort(), Object.keys(expectedRecords).sort(), "registry must cover all core data tables exactly");

let recordTotal = 0;
let verifiedTotal = 0;
let unverifiedTotal = 0;
for (const dataset of registry.datasets) {
  const expected = expectedRecords[dataset.id];
  assert.ok(expected, "unknown registry dataset: " + dataset.id);
  assert.equal(dataset.sourcePath, "src/data.js", "unexpected source file for " + dataset.id);
  assert.equal(dataset.recordCount, expected.length, "record count mismatch in " + dataset.id);
  assert.equal(dataset.records.length, expected.length, "registry is missing records in " + dataset.id);
  assert.deepEqual(dataset.records.map((entry) => entry.id).sort(), expected.map((entry) => entry.id).sort(), "registry IDs must exactly match runtime data for " + dataset.id);
  for (const record of dataset.records) {
    const current = expected.find((entry) => entry.id === record.id);
    assert.equal(record.name, current.name, "display name changed without refreshing registry: " + dataset.id + "/" + record.id);
    assert.ok(["unverified", "verified"].includes(record.status), "invalid evidence status: " + dataset.id + "/" + record.id);
    assert.ok(Array.isArray(record.sourceEvidence), "sourceEvidence must be an array");
    if (record.status === "unverified") {
      unverifiedTotal += 1;
      for (const evidence of record.sourceEvidence) assert.ok(sourceMap.has(evidence.sourceId), "unknown partial-evidence source: " + evidence.sourceId);
      continue;
    }
    verifiedTotal += 1;
    assert.ok(record.sourceEvidence.length > 0, "verified record must cite direct evidence: " + dataset.id + "/" + record.id);
    assert.ok(record.lastVerifiedOn && /^\\d{4}-\\d{2}-\\d{2}$/.test(record.lastVerifiedOn), "verified record needs checked date");
    for (const evidence of record.sourceEvidence) {
      assert.equal(evidence.recordId, dataset.id + "/" + record.id, "evidence must identify the exact record");
      assert.ok(Array.isArray(evidence.fields) && evidence.fields.length > 0, "evidence must identify exact fields");
      assert.ok(evidence.evidenceExcerpt && evidence.evidenceExcerpt.trim().length >= 12, "record-level evidence excerpt is required");
      assert.ok(evidence.verifiedBy && evidence.verifiedOn === record.lastVerifiedOn, "reviewer and matching verification date required");
      const source = sourceMap.get(evidence.sourceId);
      assert.ok(source, "unknown evidence source: " + evidence.sourceId);
      assert.equal(source.official, true, "only official Taiwan RO sources may verify records");
      assert.equal(source.recordLevelEvidenceAllowed, true, "system-index/context-only pages cannot verify data records");
    }
  }
  recordTotal += dataset.recordCount;
}

const hasHtmlLock = html.includes('<main id="roPrototype" class="layout" hidden aria-hidden="true">');
const hasCssLock = css.includes("#roPrototype { display: none !important; }");
assert.ok(hasHtmlLock && hasCssLock, "unverified playable prototype must remain hidden");
assert.ok(!/<script\\s+src=["'][^"']*src\\/(?:expansion|pets)\\.js["']/.test(html), "unverified custom modules must not load");
assert.ok(!sw.includes('"./src/expansion.js"') && !sw.includes('"./src/pets.js"'), "unverified custom modules must not enter offline cache");
assert.ok(main.includes("state.idleEnabled = false; // Strict mode"), "old saves must not restore custom auto-hunt");
assert.ok(main.includes("offline hunting is not enabled until verified"), "simulated offline awards must remain disabled");
assert.ok(fs.existsSync("RO_OFFICIAL_CONTENT_POLICY.md"), "strict official content policy is required");
if (unverifiedTotal > 0) assert.ok(hasHtmlLock && hasCssLock, "any unverified core record requires the prototype lock");

console.log("Official content audit passed: baseline " + registry.target.baselineDate + "; " + recordTotal + " core data records inventoried; " + verifiedTotal + " record-level verified; " + unverifiedTotal + " still unverified. Playable prototype remains locked. This audit validates provenance structure and gating, not completeness or the truth of unreviewed game data.");
