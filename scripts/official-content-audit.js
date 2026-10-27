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

const allowedHosts = new Set(["ro.gnjoy.com.tw", "www.ro.gnjoy.com.tw", "event.gnjoy.com.tw"]);
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
  jobs: data.jobs.map((record) => ({ id: record.id, name: record.name, tier: record.tier, parent: record.parent, family: record.family })),
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
  assert.equal(JSON.stringify(dataset.records.map((entry) => entry.id).sort()), JSON.stringify(expected.map((entry) => entry.id).sort()), "registry IDs must exactly match runtime data for " + dataset.id);
  for (const record of dataset.records) {
    const current = expected.find((entry) => entry.id === record.id);
    assert.equal(record.name, current.name, "display name changed without refreshing registry: " + dataset.id + "/" + record.id);
    assert.ok(["unverified", "verified"].includes(record.status), "invalid evidence status: " + dataset.id + "/" + record.id);
    assert.ok(Array.isArray(record.sourceEvidence), "sourceEvidence must be an array");
    if (dataset.id === "jobs") {
      const expectedPrototypeFields = { tier: current.tier, parent: current.parent, family: current.family };
      assert.equal(JSON.stringify(record.prototypeFields), JSON.stringify(expectedPrototypeFields), "job prototype snapshot mismatch: " + record.id);
      const requiredFields = ["name", "tier", "parent", "family", "baseLevelCap", "jobLevelCap", "transferRequirements"];
      assert.ok(record.fieldStatus && record.fieldEvidence, "job records require field-level verification state: " + record.id);
      for (const field of requiredFields) {
        assert.ok(["unverified", "verified"].includes(record.fieldStatus[field]), "invalid job field status: " + record.id + "/" + field);
        assert.ok(Array.isArray(record.fieldEvidence[field]), "job field evidence must be an array: " + record.id + "/" + field);
        if (record.fieldStatus[field] === "verified") {
          assert.ok(record.fieldEvidence[field].length > 0, "verified job field requires direct evidence: " + record.id + "/" + field);
          for (const evidence of record.fieldEvidence[field]) {
            const source = sourceMap.get(evidence.sourceId);
            assert.ok(source && source.official && source.recordLevelEvidenceAllowed, "job field can only be verified by a direct official source: " + record.id + "/" + field);
            assert.ok(evidence.fields && evidence.fields.includes(field), "job field evidence must name the field: " + record.id + "/" + field);
            assert.ok(evidence.evidenceExcerpt && evidence.evidenceExcerpt.trim().length >= 12, "job field evidence excerpt required: " + record.id + "/" + field);
            assert.ok(evidence.verifiedBy && evidence.verifiedOn, "job field verification reviewer/date required: " + record.id + "/" + field);
          }
        }
      }
      if (record.status === "verified") {
        assert.ok(requiredFields.every((field) => record.fieldStatus[field] === "verified"), "job record cannot be verified with unresolved fields: " + record.id);
      }
    }
    if (record.status === "unverified") {
      unverifiedTotal += 1;
      for (const evidence of record.sourceEvidence) assert.ok(sourceMap.has(evidence.sourceId), "unknown partial-evidence source: " + evidence.sourceId);
      continue;
    }
    verifiedTotal += 1;
    assert.ok(record.sourceEvidence.length > 0, "verified record must cite direct evidence: " + dataset.id + "/" + record.id);
    assert.ok(record.lastVerifiedOn && !Number.isNaN(Date.parse(record.lastVerifiedOn)) && new Date(record.lastVerifiedOn).toISOString().slice(0, 10) === record.lastVerifiedOn, "verified record needs checked date");
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

const jobRules = registry.jobSystemRules;
assert.ok(Array.isArray(jobRules) && jobRules.length >= 6, "official job-system rule ledger is required");
const jobRuleIds = new Set();
for (const rule of jobRules) {
  assert.ok(rule.id && !jobRuleIds.has(rule.id), "job rule IDs must be unique");
  jobRuleIds.add(rule.id);
  assert.ok(rule.claim && rule.evidenceExcerpt && rule.evidenceExcerpt.trim().length >= 12, "each job rule requires direct official excerpt");
  assert.ok(Array.isArray(rule.sourceIds) && rule.sourceIds.length > 0, "each job rule requires source IDs");
  assert.equal(rule.appliesToRuntime, false, "unrevalidated job-system facts must not drive runtime: " + rule.id);
  assert.ok(["official-announcement-confirmed-scope-unclear", "historical-rule-requires-current-revalidation", "official-evidence-of-prototype-coverage-gap"].includes(rule.status), "job rule must use an explicit cautious status: " + rule.id);
  for (const sourceId of rule.sourceIds) {
    const source = sourceMap.get(sourceId);
    assert.ok(source && source.official, "job rule must reference a registered official source: " + rule.id + "/" + sourceId);
  }
}
const jobDataset = registry.datasets.find((dataset) => dataset.id === "jobs");
assert.equal(jobDataset.records.length, data.jobs.length, "job registry must enumerate every prototype job");
assert.equal(jobDataset.coverageStatus, "incomplete", "job coverage must remain explicitly incomplete");
assert.equal(registry.jobDatasetAudit.status, "incomplete-and-unverified", "job audit must not overstate completeness");
assert.ok(jobDataset.records.every((record) => record.status === "unverified"), "no prototype job can be verified without per-record evidence");
assert.equal(jobDataset.records.filter((record) => record.status === "verified").length, 0, "this round found no per-job verification set");
assert.ok(jobRules.some((rule) => rule.id === "level-expansion-lv275" && rule.appliesToRuntime === false), "Lv275 announcement must not be guessed into Base/Job fields");
assert.ok(jobRules.some((rule) => rule.id === "historical-fourth-job-requires-reborn-third"), "historical fourth-job rule must be preserved as historical");
assert.ok(jobRules.some((rule) => rule.id === "fourth-and-expanded-job-families-confirmed"), "fourth/expanded-job coverage gap must be recorded");

const hierarchySource = sourceMap.get("official-fourth-job-event-2022-02-08");
assert.ok(hierarchySource && hierarchySource.official, "official fourth-job introduction source must be registered");
assert.equal(new URL(hierarchySource.url).hostname, "event.gnjoy.com.tw", "the direct transition source must be the registered official event host");
assert.equal(hierarchySource.recordLevelEvidenceAllowed, true, "only the direct official transition page can support parent-edge evidence");
assert.ok(hierarchySource.linkedFromOfficialSourceIds.includes("official-job-transfer-rules-2022-03-22"), "official transition page must be linked from an official Taiwan RO notice");

const hierarchy = registry.jobHierarchyEvidence;
assert.ok(Array.isArray(hierarchy) && hierarchy.length === 12, "11 direct fourth-job parent links and one grouped relation must be preserved");
const hierarchyIds = new Set();
let directEdges = 0;
let groupedEdges = 0;
for (const edge of hierarchy) {
  assert.ok(edge.id && !hierarchyIds.has(edge.id), "job hierarchy edge IDs must be unique");
  hierarchyIds.add(edge.id);
  assert.equal(edge.appliesToRuntime, false, "historical hierarchy facts must not modify live game behavior");
  assert.equal(edge.currentApplicabilityStatus, "unverified", "historical parent relationship must not be called current without revalidation");
  assert.ok(Array.isArray(edge.sourceEvidence) && edge.sourceEvidence.length > 0, "every hierarchy claim needs direct official evidence");
  for (const evidence of edge.sourceEvidence) {
    assert.equal(evidence.sourceId, "official-fourth-job-event-2022-02-08", "hierarchy evidence must come from the source that states the relationship");
    assert.equal(evidence.recordId, "job-hierarchy/" + edge.id, "hierarchy evidence must point at the exact edge");
    assert.ok(Array.isArray(evidence.fields) && evidence.fields.length > 0, "hierarchy evidence must list exact fields");
    assert.ok(evidence.evidenceExcerpt && evidence.evidenceExcerpt.trim().length >= 12, "hierarchy evidence excerpt must be substantive");
    assert.ok(evidence.verifiedBy && evidence.verifiedOn === "2026-10-27", "hierarchy review date and reviewer must be recorded");
  }
  for (const sourceId of edge.corroboratingSources) assert.ok(sourceMap.has(sourceId) && sourceMap.get(sourceId).official, "hierarchy corroboration must use registered official sources");
  if (edge.recordType === "individual-parent-edge") {
    directEdges += 1;
    assert.ok(edge.childJobName && edge.parentJobName, "direct edge must name a child and parent job");
    assert.equal(edge.evidenceStatus, "historical-official-parent-edge-confirmed", "direct edge must preserve historical scope");
    assert.deepEqual(edge.verifiedFields, ["childJobName", "parentJobName", "childTier"], "direct edge supported fields must stay narrowly scoped");
  } else if (edge.recordType === "group-parent-edge") {
    groupedEdges += 1;
    assert.equal(edge.individualChildParentPairingStatus, "unverified", "the grouped song/dance job pairs must not be inferred individually");
    assert.deepEqual(edge.childJobNames, ["天籟頌者", "樂之舞靈"], "paired fourth-job names must match the official source");
    assert.deepEqual(edge.parentJobNames, ["宮廷樂師", "浪姬舞者"], "paired parents must match the official source");
  } else assert.fail("unknown hierarchy record type: " + edge.recordType);
}
assert.equal(directEdges, 11, "official page should produce 11 individually stated fourth-job parent edges");
assert.equal(groupedEdges, 1, "song/dance relationship must remain one grouped record");
const officialRoster = registry.officialJobRosterEvidence;
assert.ok(officialRoster && officialRoster.status === "partial-official-subtree", "official job roster must be marked as a partial subtree");
assert.equal(officialRoster.officialCountClaim, 13, "official page's 13 fourth-job claim must be preserved");
assert.equal(new Set(officialRoster.childJobNames).size, 13, "fourth-job roster should contain thirteen distinct names");
assert.equal(officialRoster.childJobNames.length, 13, "fourth-job roster should list thirteen class names");
assert.equal(officialRoster.fullJobTreeComplete, false, "a fourth-job subset must never be described as the complete job tree");
assert.equal(registry.jobHierarchyAudit.fullJobTreeComplete, false, "job hierarchy audit must remain explicitly incomplete");
assert.equal(registry.jobHierarchyAudit.runtimeDataChanged, false, "hierarchy research must not change runtime game data");
assert.equal(jobDataset.records.filter((record) => record.status === "verified").length, 0, "the 13 prototype job records remain unverified");
assert.ok(jobDataset.records.every((record) => Object.values(record.fieldStatus).every((status) => status === "unverified")), "all prototype job fields remain unverified");

const hasHtmlLock = html.includes('<main id="roPrototype" class="layout" hidden aria-hidden="true">');
const hasCssLock = css.includes("#roPrototype { display: none !important; }");
assert.ok(hasHtmlLock && hasCssLock, "unverified playable prototype must remain hidden");
assert.ok(!html.includes('src="./src/expansion.js"') && !html.includes('src="./src/pets.js"'), "unverified custom modules must not load");
assert.ok(!sw.includes('"./src/expansion.js"') && !sw.includes('"./src/pets.js"'), "unverified custom modules must not enter offline cache");
assert.ok(main.includes("state.idleEnabled = false; // Strict mode"), "old saves must not restore custom auto-hunt");
assert.ok(main.includes("offline hunting is not enabled until verified"), "simulated offline awards must remain disabled");
assert.ok(fs.existsSync("RO_OFFICIAL_CONTENT_POLICY.md"), "strict official content policy is required");
if (unverifiedTotal > 0) assert.ok(hasHtmlLock && hasCssLock, "any unverified core record requires the prototype lock");

console.log("Official content audit passed: baseline " + registry.target.baselineDate + "; " + recordTotal + " core data records inventoried; " + verifiedTotal + " record-level verified; " + unverifiedTotal + " still unverified; " + jobDataset.records.length + " prototype job records remain unverified. Playable prototype remains locked. This audit validates provenance structure and gating, not completeness or the truth of unreviewed game data.");
