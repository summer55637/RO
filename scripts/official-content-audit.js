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

const officialQuickTransferSource = sourceMap.get("official-expanded-quick-transfer-update-2025-11-04");
assert.ok(officialQuickTransferSource && officialQuickTransferSource.official, "expanded quick-transfer rules need a Taiwan RO official source");
assert.equal(officialQuickTransferSource.url, "https://ro.gnjoy.com.tw/notice/notice_view.aspx?id=217960");
assert.equal(officialQuickTransferSource.publishedDate, "2025-11-03");
assert.equal(officialQuickTransferSource.effectiveDate, "2025-11-04");
assert.equal(officialQuickTransferSource.recordLevelEvidenceAllowed, false, "quick-transfer costs must not be used as a job-lineage source");
assert.ok(officialQuickTransferSource.supportedClaims.some((claim) => claim.includes("獼猴桃果實*4")));
assert.ok(officialQuickTransferSource.supportedClaims.some((claim) => claim.includes("獼猴桃果實*30")));
assert.ok(officialQuickTransferSource.supportedClaims.some((claim) => claim.includes("獼猴桃果實*70")));
assert.ok(officialQuickTransferSource.notSupported.some((claim) => claim.includes("任意跳過所有職業階段")));
const officialQuickTransferRule = registry.jobSystemRules.find((rule) => rule.id === "official-expanded-quick-transfer-update-2025-11-04");
assert.ok(officialQuickTransferRule, "official quick-transfer scope rule must be recorded");
assert.equal(officialQuickTransferRule.status, "official-announcement-confirmed-scope-unclear");
assert.equal(officialQuickTransferRule.appliesToRuntime, false);
assert.deepEqual(officialQuickTransferRule.sourceIds, ["official-expanded-quick-transfer-update-2025-11-04"]);

const transferUxAudit = registry.jobTransferUxAudit;
assert.ok(transferUxAudit && transferUxAudit.status === "ui-simplification-only; playable-prototype-remains-locked");
assert.equal(transferUxAudit.eligibleTargetOnly, true, "direct select must only offer the existing eligible choices");
assert.equal(transferUxAudit.allowsArbitraryJobSkip, false, "do not implement unsupported arbitrary class jumping");
assert.equal(transferUxAudit.quickTransferFruitCostsAppliedToRuntime, false, "official fruit costs must not be simulated with unverified inventory/job data");
assert.equal(transferUxAudit.runtimeJobDataChanged, false);
assert.equal(transferUxAudit.playablePrototypeUnlocked, false);
assert.ok(main.includes('select.id = "jobTargetSelect"'), "target selection must use one direct selection control");
assert.ok(main.includes('transferButton.textContent = "直接轉職"'), "direct transfer action must be explicit");
assert.ok(main.includes("if (select.value) changeJob(select.value)"), "direct action must route to the existing transfer function");
assert.ok(main.includes('state.player.level < 5'), "existing prototype first-stage gate must remain unchanged");
assert.ok(main.includes('state.player.level < 20 || state.player.jobLevel < 10'), "existing prototype second-stage gate must remain unchanged");
assert.ok(!main.includes("獼猴桃果實"), "unverified prototype runtime must not simulate official item costs");
assert.ok(html.includes("這是原型操作簡化，不代表正服可任意跳階"), "UI must explicitly distinguish itself from official rules");

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

const namingSource = sourceMap.get("official-fourth-job-naming-table-2022");
const phaseSource = sourceMap.get("official-anniversary-job-phase-examples-2026-10");
const hierarchySource = sourceMap.get("official-fourth-job-event-2022-02-08");
assert.ok(hierarchySource && namingSource && phaseSource, "official progression sources must all be registered");
assert.equal(new URL(hierarchySource.url).hostname, "event.gnjoy.com.tw");
assert.equal(new URL(namingSource.url).hostname, "event.gnjoy.com.tw");
assert.equal(new URL(phaseSource.url).hostname, "event.gnjoy.com.tw");
assert.equal(hierarchySource.recordLevelEvidenceAllowed, true);
assert.equal(namingSource.recordLevelEvidenceAllowed, true);
assert.equal(phaseSource.recordLevelEvidenceAllowed, false, "activity stage examples must not serve as parent-lineage evidence");

const hierarchy = registry.jobHierarchyEvidence;
assert.ok(Array.isArray(hierarchy) && hierarchy.length === 13, "all 13 individual historical third-to-fourth mappings must be preserved");
const hierarchyIds = new Set();
let directEdges = 0;
for (const edge of hierarchy) {
  assert.ok(edge.id && !hierarchyIds.has(edge.id), "job hierarchy edge IDs must be unique");
  hierarchyIds.add(edge.id);
  assert.equal(edge.recordType, "individual-parent-edge", "job hierarchy records must contain explicit individual mappings only");
  assert.equal(edge.appliesToRuntime, false, "historical hierarchy facts must not modify live game behavior");
  assert.equal(edge.currentApplicabilityStatus, "unverified", "historical parent relationships must not be called current without revalidation");
  assert.ok(edge.childJobName && edge.parentJobName, "individual hierarchy record must name both jobs");
  assert.ok(Array.isArray(edge.sourceEvidence) && edge.sourceEvidence.length > 0, "every hierarchy claim needs direct official evidence");
  for (const evidence of edge.sourceEvidence) {
    const evidenceSource = sourceMap.get(evidence.sourceId);
    assert.ok(evidenceSource && evidenceSource.official && evidenceSource.recordLevelEvidenceAllowed, "each parent mapping must cite an official source allowed for direct parent evidence");
    assert.equal(evidence.recordId, "job-hierarchy/" + edge.id, "hierarchy evidence must point at the exact edge");
    assert.ok(Array.isArray(evidence.fields) && evidence.fields.length > 0, "hierarchy evidence must list exact fields");
    assert.ok(evidence.evidenceExcerpt && evidence.evidenceExcerpt.trim().length >= 12, "hierarchy evidence excerpt must be substantive");
    assert.ok(evidence.verifiedBy && evidence.verifiedOn === "2026-10-27", "hierarchy review date and reviewer must be recorded");
  }
  for (const sourceId of edge.corroboratingSources) assert.ok(sourceMap.has(sourceId) && sourceMap.get(sourceId).official, "hierarchy corroboration must use registered official sources");
  assert.equal(edge.evidenceStatus, "historical-official-parent-edge-confirmed");
  assert.deepEqual(edge.verifiedFields, ["childJobName", "parentJobName", "childTier"]);
  assert.equal(edge.baseLevelCapStatus, "unverified");
  assert.equal(edge.jobLevelCapStatus, "unverified");
  assert.equal(edge.transferRequirementsStatus, "unverified");
  directEdges += 1;
}
assert.equal(directEdges, 13, "historical third-to-fourth parent mappings must cover the thirteen names in the official source");
const officialRoster = registry.officialJobRosterEvidence;
assert.ok(officialRoster && officialRoster.status === "partial-official-subtree", "official job roster must be marked as a partial subtree");
assert.equal(officialRoster.officialCountClaim, 13);
assert.equal(new Set(officialRoster.childJobNames).size, 13);
assert.equal(officialRoster.childJobNames.length, 13);
assert.equal(officialRoster.fullJobTreeComplete, false);

const phaseExamples = registry.jobProgressionEvidence;
assert.ok(Array.isArray(phaseExamples) && phaseExamples.length === 4, "four official job-stage examples must be recorded");
const expectedPhaseExamples = new Map([
  ["phase-example-novice", ["初心者", "novice"]],
  ["phase-example-swordsman", ["劍士", "first-job"]],
  ["phase-example-knight", ["騎士", "second-job"]],
  ["phase-example-lord-knight", ["騎士領主", "reborn-advanced-second-job"]]
]);
for (const example of phaseExamples) {
  const expected = expectedPhaseExamples.get(example.id);
  assert.ok(expected, "unexpected phase example: " + example.id);
  assert.equal(example.subjectName, expected[0]);
  assert.equal(example.subjectTier, expected[1]);
  assert.equal(example.appliesToRuntime, false, "activity examples must not be used as runtime class records");
  assert.equal(example.parentJobName, null, "a phase example is not a direct parent mapping");
  assert.equal(example.parentJobStatus, "unverified");
  assert.equal(example.familyStatus, "unverified");
  assert.equal(example.baseLevelCapStatus, "unverified");
  assert.equal(example.jobLevelCapStatus, "unverified");
  assert.equal(example.transferRequirementsStatus, "unverified");
  assert.deepEqual(example.fieldStatus, {name:"verified-as-official-activity-example",tier:"verified-as-official-activity-example",parentJobName:"unverified",family:"unverified",baseLevelCap:"unverified",jobLevelCap:"unverified",transferRequirements:"unverified"});
  for (const evidence of example.sourceEvidence) {
    assert.equal(evidence.sourceId, "official-anniversary-job-phase-examples-2026-10");
    assert.equal(evidence.recordId, "job-progression/" + example.id);
    assert.deepEqual(evidence.fields, ["subjectName", "subjectTier"]);
    assert.ok(evidence.evidenceExcerpt && evidence.evidenceExcerpt.length > 15);
    assert.equal(evidence.verifiedOn, "2026-10-27");
    assert.equal(evidence.applicableDateRange, "2026-10-13 to 2026-11-10 activity period only");
  }
}
const lineageAudit = registry.jobProgressionAudit;
assert.ok(lineageAudit && lineageAudit.status === "partial-evidence-only; no complete first-through-third lineage");
assert.equal(lineageAudit.verifiedFirstToSecondParentEdges, 0, "do not infer first-to-second lineage");
assert.equal(lineageAudit.verifiedSecondToThirdIndividualParentEdges, 0, "general historical rule cannot stand in for per-class second-to-third edges");
assert.equal(lineageAudit.verifiedNoviceToFirstParentEdges, 0);
assert.equal(lineageAudit.historicalGeneralSecondToThirdPrerequisiteConfirmed, true);
assert.equal(lineageAudit.currentApplicabilityOfHistoricalRules, "unverified");
assert.equal(lineageAudit.fullJobTreeComplete, false);
assert.equal(lineageAudit.runtimeDataChanged, false);
assert.equal(registry.jobLineageGaps.length, 4);
const gapById = new Map(registry.jobLineageGaps.map((gap) => [gap.id, gap]));
assert.equal(gapById.get("gap-novice-to-first-job").exactParentMappingsStatus, "unverified");
assert.equal(gapById.get("gap-first-job-to-second-job").exactParentMappingsStatus, "unverified");
assert.equal(gapById.get("gap-second-to-reborn-advanced-second-job").exactParentMappingsStatus, "unverified");
assert.equal(gapById.get("gap-reborn-second-job-to-third-job").exactParentMappingsStatus, "unverified");
assert.equal(gapById.get("gap-reborn-second-job-to-third-job").generalHistoricalPrerequisite.status, "historical-official-rule-confirmed");
assert.equal(gapById.get("gap-reborn-second-job-to-third-job").generalHistoricalPrerequisite.evidenceExcerpt, "三轉職業：需轉生二轉才可進行轉職");
assert.equal(lineageAudit.confirmedHistoricalThirdTierNameCount, 13);
assert.equal(registry.jobProgressionAudit.runtimeDataChanged, false);
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
