'use strict';

const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const world = require('../world-data.js');
const core = require('../core.js');


function testMonsterArtworkIdentityMapping() {
  // IDs below are canonical mob IDs from pinned rAthena mob_db.yml; sprite filenames and hashes must follow that ID.
  const expected = {
    poring: { id: 1002, bytes: 708, sha: '9205f4b39eaea3eb175e0eabdcc6ba10ec296641' },
    lunatic: { id: 1063, bytes: 598, sha: 'ae31b3bd6c29aeea5985f5b585ab0c9bb8eaa8fa' },
    fabre: { id: 1007, bytes: 789, sha: 'e9f3ef887164c0c7d0aa883e82d61f49b2379d59' },
    pupa: { id: 1008, bytes: 771, sha: '6603da0bdf588b3f74381442fe0dc82aa574ef2c' },
    wolf: { id: 1013, bytes: 1892, sha: 'b597c222615da8a15634eeaf3da1833945ec9910' },
    hornet: { id: 1004, bytes: 942, sha: '32d3c7d9cd9e71064a7e9b074b52293bc8bc97b0' },
    goblin: { id: 1122, bytes: 1286, sha: '739efe8c25378c55afcc754ef42b820c2e1d3b8a' },
    orc: { id: 1023, bytes: 3359, sha: '98b9797413239e1f4e9055a2baf48e07cfda1da3' },
    willow: { id: 1010, bytes: 7673, sha: 'df0b18eb2c2ab52b8e4d07dd470bb9f63bffe652' },
    spore: { id: 1014, bytes: 1617, sha: '17a0870a9c6b6e8d43dbc33cdc8171fce318b4c3' },
    poporing: { id: 1031, bytes: 709, sha: '86f8e4f14bff569963e0a98c546e4234e6e0009e' },
    pecopeco: { id: 1019, bytes: 2545, sha: 'f84f9c624b23241cd5669851fa33ad2fe5fcf331' },
    picky: { id: 1049, bytes: 409, sha: '67b06c12d629885ad9c3cd7bf893370840d14e8e' },
    condor: { id: 1009, bytes: 4181, sha: 'f8029dca4c909a67650986ca272180872d587214' }
  };
  const assetMap = new Map(world.assets.map(function (asset) { return [asset.id, asset]; }));
  Object.entries(expected).forEach(function (entry) {
    const monsterId = entry[0], want = entry[1];
    const monster = world.monsters[monsterId], asset = assetMap.get(monsterId);
    assert.ok(monster, 'missing monster ' + monsterId);
    assert.ok(asset, 'missing artwork manifest entry ' + monsterId);
    assert.equal(monster.sourceMobId, want.id, monsterId + ' canonical Mob ID mismatch');
    assert.equal(monster.assetId, monsterId, monsterId + ' should use its own artwork');
    assert.equal(asset.sourceMobId, want.id, monsterId + ' asset Mob ID mismatch');
    assert.equal(asset.sourcePath, 'images/monsters/' + want.id + '.png', monsterId + ' source path mismatch');
    assert.equal(asset.bytes, want.bytes, monsterId + ' source bytes mismatch');
    assert.equal(asset.gitSha, want.sha, monsterId + ' source hash mismatch');
    if (asset.sourceRepository) assert.ok(asset.path.endsWith('/' + asset.sourcePath), monsterId + ' download URL mismatch');
    else assert.equal(asset.path, './assets/' + monsterId + '.png', monsterId + ' local path mismatch');
  });
  assert.equal(world.monsters.thief_bug.sourceMobId, 1051);
  assert.equal(world.monsters.thief_bug.assetId, 'thief_bug');
  assert.equal(world.monsters.thief_bug.assetFallback, 'vector', 'vector art remains the explicit fallback only');
  const thiefBugAsset = assetMap.get('thief_bug');
  assert.ok(thiefBugAsset, 'Thief Bug must have its own verified artwork manifest entry');
  assert.equal(thiefBugAsset.sourceMobId, 1051);
  assert.equal(thiefBugAsset.sourceRepository, 'divine-pride.net');
  assert.equal(thiefBugAsset.sourcePath, 'images/mobs/png/1051.png');
  assert.equal(thiefBugAsset.sourceUrl, 'https://static.divine-pride.net/images/mobs/png/1051.png');
  assert.equal(thiefBugAsset.path, './assets/thief_bug.png');
  assert.equal(thiefBugAsset.bytes, 1783);
  assert.equal(thiefBugAsset.gitSha, '342abcc99d1c1d902751b64e65b6f56d8b309342');
  const thiefBugBytes = fs.readFileSync(path.join(__dirname, '..', 'assets', 'thief_bug.png'));
  assert.equal(thiefBugBytes.length, thiefBugAsset.bytes);
  assert.deepEqual(thiefBugBytes.subarray(0, 8), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  assert.equal(thiefBugBytes.readUInt32BE(16), 36, 'Mob 1051 PNG width should match the pinned source');
  assert.equal(thiefBugBytes.readUInt32BE(20), 27, 'Mob 1051 PNG height should match the pinned source');
  const gitBlobSha = crypto.createHash('sha1').update(Buffer.concat([
    Buffer.from('blob ' + thiefBugBytes.length + '\0'), thiefBugBytes
  ])).digest('hex');
  assert.equal(gitBlobSha, thiefBugAsset.gitSha, 'local Thief Bug bytes must match the declared Git blob SHA-1');
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(appSource, /function getMonsterArtworkSource\(monster\)/);
  assert.match(appSource, /function getMissingMonsterArtworkSource\(\)/, 'missing art has an explicit placeholder');
  assert.match(appSource, /return getMissingMonsterArtworkSource\(\)/, 'missing art must not borrow another monster image');
  assert.doesNotMatch(appSource, /return assetUrls\.poring \|\| '\.\/assets\/poring\.png'/, 'battle art must not silently substitute Poring');
  assert.match(appSource, /data:image\/svg\+xml;charset=utf-8/);
  assert.match(appSource, /getMonsterArtworkSource\(currentMonster\)/);
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /瘋兔圖像<\/strong><small>1063\.png · 598 bytes<\/small>/, 'installer must identify the verified Lunatic Mob 1063 image');
  assert.match(html, /綠棉蟲圖像<\/strong><small>1007\.png · 789 bytes<\/small>/, 'installer must identify the verified Fabre Mob 1007 image');
  assert.doesNotMatch(html, /瘋兔圖像<\/strong><small>1001\.png/, 'installer must not label Scorpion Mob 1001 as Lunatic');
  assert.doesNotMatch(html, /綠棉蟲圖像<\/strong><small>1003\.png/, 'installer must not label Test Egg Mob 1003 as Fabre');
  const sources = fs.readFileSync(path.join(__dirname, '..', 'assets', 'SOURCES.md'), 'utf8');
  assert.match(sources, /MVP 1\.5 怪物圖片 ID 稽核/);
  assert.match(sources, /975c87dfc27ab267b2ec0dddff77421b2e6ee87b/);
}

function testAutomaticUpdateStrategy() {
  const serviceWorker = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.match(serviceWorker, /ro-h5-shell-v41/);
  assert.match(serviceWorker, /cache: 'reload'/, 'install should bypass stale HTTP cache');
  assert.match(serviceWorker, /event\.request\.mode === 'navigate' \|\| SHELL_PATHS\.has\(url\.pathname\)/);
  assert.match(serviceWorker, /fetch\(event\.request, \{ cache: 'no-cache' \}\)/, 'app shell must revalidate on visits');
  assert.match(serviceWorker, /client\.navigate\(client\.url\)/, 'open tabs should reload after a shell update');
  assert.match(appSource, /updateViaCache: 'none'/, 'service worker script updates should bypass HTTP cache');
  assert.match(appSource, /registration\.update\(\)/, 'check for service worker updates on each launch');
  assert.match(appSource, /function enterSlots\(\)/, 'entering the game must not require a tab lock');
  assert.match(appSource, /function startAutosave\(\)/);
  assert.doesNotMatch(appSource, /isLockOwner|enterSlotsWithLock|ro-h5-active-tab-v1|screen-lock|screen-lost/);
  assert.doesNotMatch(html, /id="screen-lock"|id="screen-lost"|確認接管操作權|正在確認存檔操作權/);
}

function testNameRules() {
  assert.equal(core.validateCharacterName('  RO_Hunter  ', []).value, 'RO_Hunter');
  assert.equal(core.validateCharacterName('中文角色-01', []).ok, true);
  assert.equal(core.validateCharacterName('RO_Hunter', ['ro_hunter']).ok, false);
  assert.equal(core.validateCharacterName('名字 有空格', []).ok, false);
  assert.equal(core.validateCharacterName('bad.name', []).ok, false);
  assert.equal(core.validateCharacterName('1234567890123456789012345', []).ok, false);
  assert.equal(core.validateCharacterName('', []).ok, false);
}

function testOfflineTimeCap() {
  const now = 200000000;
  assert.equal(core.resolveOfflineSeconds(now - 12000, now), 12);
  assert.equal(core.resolveOfflineSeconds(now - 25 * 60 * 60 * 1000, now), 86400);
  assert.equal(core.resolveOfflineSeconds(now + 10000, now), 0);
  assert.equal(core.resolveOfflineSeconds(null, now), 0);
}

function testBattleAndRewards() {
  const character = core.makeCharacter('Tester', 'male', 'novice');
  const account = core.emptyAccount();
  character.battle.map = 'training';
  character.battle.paused = false;
  const report = core.settleOffline(character, account, 12, function () { return 0; });
  assert.equal(report.durationSeconds, 12);
  assert.ok(report.kills >= 1);
  assert.ok(report.expGained > 0);
  assert.ok(account.gold > 0);
  assert.ok((account.warehouse['果凍質塊'] || 0) > 0);
  assert.ok(character.baseLevel >= 2);
  assert.ok(character.statPoints >= 3);
}


function testGreenPlantDoesNotRetaliate() {
  const character = core.makeCharacter('PlantTester', 'male', 'novice');
  const account = core.emptyAccount();
  character.battle.map = 'novice_ground';
  character.battle.paused = false;
  character.battle.currentMonsterId = 'green_plant';
  character.battle.monsterMaxHp = 999;
  character.battle.monsterHp = 999;
  character.battle.monsterAttackClock = 0;
  const hpBefore = character.hp;
  const killsBefore = character.battle.kills;

  assert.equal(world.monsters.green_plant.canRetaliate, false);
  assert.equal(world.monsters.green_plant.sourceMobId, 1080);
  assert.equal(world.monsters.fabre.sourceMobId, 1007);
  for (let tick = 0; tick < 5; tick += 1) {
    const result = core.stepCombat(character, account, function () { return 0.99; });
    assert.equal(result.killed, false);
    assert.equal(result.monsterDamage, 0, 'Green Plant must not damage the player');
    assert.equal(character.battle.monsterAttackClock, 0, 'passive plant should not accumulate a counterattack clock');
  }
  assert.equal(character.hp, hpBefore, 'Green Plant retaliation must not reduce player HP');
  assert.equal(character.battle.kills, killsBefore, 'passive behavior must not fake a kill');
  assert.ok(character.battle.monsterHp < character.battle.monsterMaxHp, 'players can still damage Green Plant');
}

function testMonsterEncounterMapHints() {
  const atLevelOne = core.getMonsterEncounterMaps('poring', 1);
  assert.equal(atLevelOne.length, 3, 'Poring should have encounter data on each map where it appears');
  const noviceGround = atLevelOne.find(function (entry) { return entry.mapId === 'novice_ground'; });
  assert.equal(noviceGround.probability, 40 / 110, 'Novice Ground chance reflects the added Green Plant prototype weight');
  assert.equal(noviceGround.unlocked, true);

  const northField = atLevelOne.find(function (entry) { return entry.mapId === 'prt_fild01'; });
  assert.equal(northField.weight, 30);
  assert.ok(Math.abs(northField.probability - (30 / 170)) < 1e-10, 'map chance must use the map-specific weight total');
  assert.equal(northField.unlockLevel, 2);
  assert.equal(northField.unlocked, false, 'higher-level maps should be marked locked for a level-one character');
  const atLevelTwo = core.getMonsterEncounterMaps('poring', 2).find(function (entry) { return entry.mapId === 'prt_fild01'; });
  assert.equal(atLevelTwo.unlocked, true);
  assert.deepEqual(core.getMonsterEncounterMaps('not_a_monster', 99), [], 'unknown monster IDs should not produce map hints');

  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.match(appSource, /getMonsterEncounterMaps\(id, character\.baseLevel\)/);
  assert.match(appSource, /出沒／預估遇敵率（原型設定）/);
  assert.match(html, /MVP 3\.2/);
  assert.match(sw, /ro-h5-shell-v41/);
}

function testVerifiedBestiaryArtworkEvidence() {
  const assetMap = new Map(world.assets.map(function (asset) { return [asset.id, asset]; }));
  const monsterEntries = Object.entries(world.monsters);
  assert.equal(monsterEntries.length, 16, 'all currently catalogued monsters should be audited');

  monsterEntries.forEach(function (entry) {
    const monsterId = entry[0], monster = entry[1];
    assert.ok(Number.isInteger(monster.sourceMobId) && monster.sourceMobId > 0, monsterId + ' needs a canonical Mob ID');
    if (monster.assetFallback === 'vector') {
      assert.equal(monsterId, 'thief_bug', 'only Thief Bug may use the dedicated vector fallback');
      assert.equal(monster.sourceMobId, 1051);
    }
    const asset = assetMap.get(monster.assetId);
    assert.ok(asset, monsterId + ' must reference a dedicated asset manifest entry');
    assert.equal(asset.sourceMobId, monster.sourceMobId, monsterId + ' asset and monster Mob IDs must match');
    const expectedSourcePath = monsterId === 'thief_bug'
      ? 'images/mobs/png/1051.png'
      : monsterId === 'green_plant'
        ? 'examples/data/green_plant.act + examples/data/green_plant.spr'
        : 'images/monsters/' + monster.sourceMobId + '.png';
    assert.equal(asset.sourcePath, expectedSourcePath, monsterId + ' source filename must match Mob ID');
    assert.ok(Number(asset.bytes) > 0, monsterId + ' asset must record a positive source size');
    assert.match(asset.gitSha || '', /^[0-9a-f]{40}$/, monsterId + ' asset must pin a Git blob SHA-1');
    if (monsterId === 'thief_bug') {
      assert.equal(asset.path, './assets/thief_bug.png');
      assert.equal(asset.bytes, 1783);
      assert.equal(asset.gitSha, '342abcc99d1c1d902751b64e65b6f56d8b309342');
      assert.equal(asset.sourceUrl, 'https://static.divine-pride.net/images/mobs/png/1051.png');
    } else if (monsterId === 'green_plant') {
      assert.equal(asset.path, './assets/green_plant.svg');
      assert.equal(asset.sourceRepository, 'MyGodIsHe/pyro-tools');
      assert.equal(asset.sourceCommit, '1a28450df59bc69e56e70e431f9b61351bafc8f6');
      assert.equal(asset.bytes, 2552);
      assert.equal(asset.gitSha, '1f2d87a90a16161d6f101b67a11384a1a8490b6c');
      assert.equal(asset.sourceActSha, 'e1bda9fe10499c562baf5857ab8829d8f234bd0a');
      assert.equal(asset.sourceSprSha, '9ea4b7f257ae0b96048e9f0415e7ed7cdf08fc8a');
    }
  });

  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.match(appSource, /function getVerifiedMonsterArtworkSource\(monster\)/);
  assert.match(appSource, /assetId && assetUrls\[assetId\]/, 'bestiary must use only already validated, cached asset URLs');
  assert.match(appSource, /monster\.id === 'thief_bug' && monster\.assetFallback === 'vector'/);
  assert.match(appSource, /Never let a missing portrait silently fall back to the Poring image/);
  assert.ok(appSource.includes("Mob ID ' + (monster.sourceMobId || '未核對')"), 'discovered monsters show their Mob ID');
  assert.match(appSource, /bestiary-portrait-placeholder/);
  assert.match(css, /\.bestiary-portrait img/);
  assert.match(html, /MVP 3\.2/);
  assert.match(sw, /ro-h5-shell-v41/);
}

function testBestiaryRestoresOnlyVerifiedCachedArtwork() {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const start = appSource.indexOf('function restoreCachedBestiaryPortraits(');
  const end = appSource.indexOf('function renderBestiary(content)', start);
  assert.ok(start >= 0 && end > start, 'cached bestiary portrait restoration helper must exist');
  const helperSource = appSource.slice(start, end);
  assert.match(helperSource, /dbGet\(asset\.id\)/, 'must look up previously cached assets');
  assert.match(helperSource, /verifyBlob\(asset, cached\.blob\)/, 'must verify cached bytes before displaying them');
  assert.match(helperSource, /useAssetBlob\(asset, cached\.blob\)/, 'must only create object URLs from verified cached bytes');
  assert.doesNotMatch(helperSource, /cacheAsset\(|fetch\(/, 'portrait hydration must not trigger network downloads');
  assert.match(appSource, /restoreCachedBestiaryPortraits\(discoveredIds\.map/);
  assert.match(appSource, /activeDetail !== 'bestiary' \|\| !list\.isConnected/, 'late cache reads must not redraw a replaced view');
  assert.match(html, /MVP 3\.2/);
  assert.match(sw, /ro-h5-shell-v41/);
}

function testMonsterBestiaryProgression() {
  const character = core.makeCharacter('BestiaryTester', 'male', 'novice');
  const account = core.emptyAccount();
  assert.deepEqual(character.bestiary, {}, 'new characters start with an empty bestiary');
  character.battle.map = 'novice_ground'; character.battle.paused = false;
  character.battle.currentMonsterId = 'poring'; character.battle.monsterMaxHp = 18; character.battle.monsterHp = 1;
  const result = core.stepCombat(character, account, function () { return 0.99; });
  assert.equal(result.killed, true);
  assert.equal(character.bestiary.poring, 1, 'a kill should register exactly once for the defeated monster');
  const legacy = core.makeCharacter('LegacyBestiary', 'female', 'novice');
  delete legacy.bestiary; legacy.battle.map = 'novice_ground'; legacy.battle.paused = false;
  legacy.battle.monsterMaxHp = 1000; legacy.battle.monsterHp = 1000;
  core.stepCombat(legacy, core.emptyAccount(), function () { return 0.99; });
  assert.deepEqual(legacy.bestiary, {}, 'older saves should gain the optional field without losing progress');
}

function testBestiaryUiWiring() {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  assert.match(appSource, /function renderBestiary\(content\)/);
  assert.match(appSource, /activeDetail === 'bestiary'/);
  assert.match(appSource, /character\.bestiary/);
  assert.match(appSource, /id = 'bestiary-search'/, 'bestiary includes a search input');
  assert.match(appSource, /id = 'bestiary-filter'/, 'bestiary includes a discovery filter');
  assert.match(appSource, /id = 'bestiary-sort'/, 'bestiary includes sorting controls');
  assert.match(appSource, /!discovered \|\| !String\(monsterData\[id\]\.name \|\| id\)\.toLocaleLowerCase\(\)\.includes\(query\)/, 'search must not reveal undiscovered monster names');
  assert.match(appSource, /sortMode === 'kills'/, 'bestiary can sort by defeat count');
  assert.match(appSource, /let bestiarySearchQuery = ''/);
  assert.match(appSource, /search\.value = bestiarySearchQuery/);
  assert.match(appSource, /bestiarySearchQuery = search\.value/);
  assert.match(appSource, /bestiaryDiscoveryFilter = filter\.value/);
  assert.match(appSource, /bestiarySortMode = sort\.value/);
  assert.match(appSource, /bestiaryControls\.contains\(document\.activeElement\)/, 'battle updates must not destroy the focused bestiary controls');
  assert.match(html, /data-detail="bestiary">怪物圖鑑/);
  assert.match(css, /\.bestiary-entry/);
}

function testEquipmentCardMechanics() {
  const catalog = core.getItemCatalog();
  assert.equal(catalog.equipment.length, 14);
  assert.equal(catalog.cards.length, 6);
  const character = core.makeCharacter('GearTester', 'male', 'novice');
  const account = core.emptyAccount();
  const dagger = { instanceId: 'test-dagger', itemId: 'novice_dagger', cards: [] };
  account.equipmentInventory.push(dagger);
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 0);
  const equipped = core.equipItem(character, account, dagger.instanceId);
  assert.equal(equipped.ok, true);
  assert.equal(character.equipment.weapon.instanceId, 'test-dagger');
  assert.equal(account.equipmentInventory.length, 0);
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 3);
  account.warehouse['綠棉蟲卡片'] = 1;
  const socketed = core.socketCard(character, account, 'weapon', 'fabre_card');
  assert.equal(socketed.ok, true);
  assert.equal(account.warehouse['綠棉蟲卡片'], undefined, 'socketing consumes one shared card');
  assert.deepEqual(character.equipment.weapon.cards, ['fabre_card']);
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 4, 'the attached card contributes attack');
  const removed = core.unequipItem(character, account, 'weapon');
  assert.equal(removed.ok, true);
  assert.equal(character.equipment.weapon, null);
  assert.equal(account.equipmentInventory[0].instanceId, 'test-dagger');
  assert.deepEqual(account.equipmentInventory[0].cards, ['fabre_card'], 'socketed card remains attached when gear is unequipped');
}

function testEquipmentCombatAndLegacyCompatibility() {
  const character = core.makeCharacter('GearCombatTester', 'male', 'novice');
  const baseline = core.makeCharacter('BaselineTester', 'male', 'novice');
  [character, baseline].forEach(function (hero) {
    hero.battle.map = 'novice_ground'; hero.battle.paused = false;
    hero.battle.currentMonsterId = 'poring'; hero.battle.monsterHp = 1000; hero.battle.monsterMaxHp = 1000;
    hero.battle.monsterAttackClock = 0;
  });
  const account = core.emptyAccount();
  account.equipmentInventory.push({ instanceId: 'gear-weapon', itemId: 'novice_dagger', cards: [] });
  core.equipItem(character, account, 'gear-weapon');
  const plainHit = core.stepCombat(baseline, core.emptyAccount(), function () { return 0.99; });
  const gearHit = core.stepCombat(character, account, function () { return 0.99; });
  assert.equal(gearHit.playerDamage, plainHit.playerDamage + 3, 'weapon attack bonus must be used in combat');
  const armor = { instanceId: 'gear-armor', itemId: 'cotton_adventurer_armor', cards: [] };
  account.equipmentInventory.push(armor);
  core.equipItem(character, account, armor.instanceId);
  character.battle.monsterAttackClock = 1; baseline.battle.monsterAttackClock = 1;
  const hpBefore = character.hp; const baselineHpBefore = baseline.hp;
  const armored = core.stepCombat(character, account, function () { return 0.99; });
  const unarmored = core.stepCombat(baseline, core.emptyAccount(), function () { return 0.99; });
  assert.equal(armored.monsterDamage, Math.max(1, unarmored.monsterDamage - 2));
  assert.equal(hpBefore - character.hp, armored.monsterDamage);
  assert.equal(baselineHpBefore - baseline.hp, unarmored.monsterDamage);

  const legacy = core.makeCharacter('LegacyGear', 'female', 'novice');
  delete legacy.equipment;
  legacy.battle.map = 'novice_ground'; legacy.battle.paused = false;
  legacy.battle.monsterHp = legacy.battle.monsterMaxHp = 1000;
  core.stepCombat(legacy, { gold: 0, warehouse: {} }, function () { return 0.99; });
  assert.deepEqual(legacy.equipment, { weapon: null, armor: null, shoes: null, accessory: null });
}

function testEquipmentDropAndSaveCompatibility() {
  const character = core.makeCharacter('GearDropTester', 'male', 'novice');
  const account = core.emptyAccount();
  character.battle.map = 'novice_ground'; character.battle.paused = false;
  character.battle.currentMonsterId = 'poring'; character.battle.monsterHp = 1; character.battle.monsterMaxHp = 18;
  const result = core.stepCombat(character, account, function () { return 0; });
  assert.equal(result.killed, true);
  assert.ok(account.equipmentInventory.some(function (item) { return item.itemId === 'novice_dagger'; }));
  assert.equal(Number(account.warehouse['波利卡片']) || 0, 1);
  assert.ok(result.drops.includes('初心者短刀'));
  const legacyAccount = core.emptyAccount(); delete legacyAccount.equipmentInventory;
  const legacyHero = core.makeCharacter('DeleteCompatibility', 'male', 'novice');
  legacyHero.equipment.weapon = { instanceId: 'preserve-cards', itemId: 'novice_dagger', cards: ['fabre_card'] };
  if (!Array.isArray(legacyAccount.equipmentInventory)) legacyAccount.equipmentInventory = [];
  legacyAccount.equipmentInventory.push(legacyHero.equipment.weapon);
  assert.deepEqual(legacyAccount.equipmentInventory[0].cards, ['fabre_card']);
}

function testEquipmentRefinementProgression() {
  const character = core.makeCharacter('RefineTester', 'male', 'novice');
  const account = core.emptyAccount(); account.gold = 10000;
  account.equipmentInventory.push({ instanceId: 'refine-dagger', itemId: 'novice_dagger', cards: ['fabre_card'], refineLevel: 0 });
  assert.equal(core.equipItem(character, account, 'refine-dagger').ok, true);
  assert.equal(core.MAX_EQUIPMENT_REFINE_LEVEL, 5);
  assert.equal(core.getRefineCost(1), 100);
  assert.equal(core.getRefineCost(5), 500);
  assert.equal(core.getRefineCost(6), 0);
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 4, 'base weapon and card bonuses apply before refinement');
  const first = core.refineItem(character, account, 'weapon');
  assert.deepEqual({ ok: first.ok, level: first.refineLevel, cost: first.cost }, { ok: true, level: 1, cost: 100 });
  assert.equal(account.gold, 9900);
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 6, 'weapon refinement adds attack');
  for (let target = 2; target <= 5; target += 1) {
    const result = core.refineItem(character, account, 'weapon');
    assert.equal(result.ok, true);
    assert.equal(result.refineLevel, target);
  }
  const goldAtCap = account.gold;
  const capped = core.refineItem(character, account, 'weapon');
  assert.equal(capped.ok, false);
  assert.equal(account.gold, goldAtCap, 'attempt beyond +5 cannot spend Zeny');
  assert.equal(character.equipment.weapon.refineLevel, 5);
  assert.deepEqual(character.equipment.weapon.cards, ['fabre_card'], 'refinement must preserve socketed cards');
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 14);

  const poor = core.makeCharacter('PoorRefineTester', 'female', 'novice');
  poor.equipment.weapon = { instanceId: 'poor-dagger', itemId: 'novice_dagger', cards: ['fabre_card'] };
  const broke = core.refineItem(poor, { gold: 0 }, 'weapon');
  assert.equal(broke.ok, false);
  assert.equal(poor.equipment.weapon.refineLevel, 0);
  assert.equal(core.getEquipmentBonuses(poor).attackBonus, 4, 'legacy equipped gear without refineLevel remains unchanged');
}

function testEquipmentRefinementCombatAndUi() {
  const character = core.makeCharacter('RefineCombatTester', 'male', 'novice');
  const baseline = core.makeCharacter('RefineBaseline', 'male', 'novice');
  [character, baseline].forEach(function (hero) {
    hero.battle.map = 'novice_ground'; hero.battle.paused = false;
    hero.battle.currentMonsterId = 'poring'; hero.battle.monsterHp = 1000; hero.battle.monsterMaxHp = 1000;
  });
  const account = core.emptyAccount(); account.gold = 1000;
  account.equipmentInventory.push({ instanceId: 'refine-combat-dagger', itemId: 'novice_dagger', cards: [], refineLevel: 0 });
  assert.equal(core.equipItem(character, account, 'refine-combat-dagger').ok, true);
  assert.equal(core.refineItem(character, account, 'weapon').ok, true);
  const plain = core.stepCombat(baseline, core.emptyAccount(), function () { return 0.99; });
  const refined = core.stepCombat(character, account, function () { return 0.99; });
  assert.equal(refined.playerDamage, plain.playerDamage + 5, 'weapon base attack plus +1 refinement should affect combat');
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(appSource, /function handleRefineEquipment\(slot\)/);
  assert.match(appSource, /window\.ROCore\.refineItem\(character, account, slot\)/);
  assert.match(appSource, /getRefineCost\(targetLevel\)/);
  assert.match(appSource, /安全精煉上限/);
  assert.match(html, /MVP 3\.2/);
}
function testCardExtractionTransactions() {
  const character = core.makeCharacter('CardExtractTester', 'male', 'novice');
  const account = core.emptyAccount();
  character.equipment.weapon = { instanceId: 'extraction-equipped', itemId: 'novice_dagger', cards: ['fabre_card'], refineLevel: 2 };
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 8, 'equipped card and +2 refinement are active before extraction');
  const extractedEquipped = core.removeSocketedCard(character, account, 'extraction-equipped', 0);
  assert.equal(extractedEquipped.ok, true);
  assert.equal(extractedEquipped.cardName, '綠棉蟲卡片');
  assert.equal(extractedEquipped.slot, 'weapon');
  assert.deepEqual(character.equipment.weapon.cards, []);
  assert.equal(character.equipment.weapon.refineLevel, 2, 'card extraction must preserve refinement');
  assert.equal(account.warehouse['綠棉蟲卡片'], 1, 'extracted card returns to shared warehouse');
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 7, 'card effect is removed while gear and refinement remain active');

  account.equipmentInventory.push({ instanceId: 'extraction-inventory', itemId: 'four_leaf_charm', cards: ['lunatic_card'] });
  const extractedInventory = core.removeSocketedCard(character, account, 'extraction-inventory', 0);
  assert.equal(extractedInventory.ok, true);
  assert.equal(extractedInventory.slot, 'inventory', 'cards can be extracted without equipping the item');
  assert.equal(account.warehouse['瘋兔卡片'], 1);
  assert.deepEqual(account.equipmentInventory[0].cards, []);
  const emptySlot = core.removeSocketedCard(character, account, 'extraction-inventory', 0);
  assert.equal(emptySlot.ok, false, 'an empty socket cannot duplicate a card');
  assert.equal(account.warehouse['瘋兔卡片'], 1, 'failed extraction leaves warehouse unchanged');
}

function testEquipmentSaleTransactions() {
  const character = core.makeCharacter('EquipmentSeller', 'female', 'novice');
  const account = core.emptyAccount();
  account.gold = 25;
  account.slots[0] = character;
  account.equipmentInventory.push({ instanceId: 'sale-dagger', itemId: 'novice_dagger', cards: [], refineLevel: 3 });
  const sold = core.sellEquipment(character, account, 'sale-dagger');
  assert.deepEqual({ ok: sold.ok, itemName: sold.itemName, salePrice: sold.salePrice }, { ok: true, itemName: '初心者短刀', salePrice: 30 });
  assert.equal(account.gold, 55, 'sale increases shared Zeny by the base prototype price');
  assert.equal(account.equipmentInventory.some(function (item) { return item.instanceId === 'sale-dagger'; }), false);
  assert.equal(sold.refineLevel, 3, 'selling refined gear reports its refinement but does not refund refinement costs');

  account.equipmentInventory.push({ instanceId: 'sale-carded', itemId: 'cotton_adventurer_armor', cards: ['poring_card'] });
  const protectedSale = core.sellEquipment(character, account, 'sale-carded');
  assert.equal(protectedSale.ok, false, 'carded gear must not be sold before card extraction');
  assert.equal(account.equipmentInventory.some(function (item) { return item.instanceId === 'sale-carded'; }), true);
  assert.equal(account.gold, 55);
  assert.equal(core.removeSocketedCard(character, account, 'sale-carded', 0).ok, true);
  assert.equal(core.sellEquipment(character, account, 'sale-carded').salePrice, 40, 'gear can be sold after the card is returned');

  character.equipment.weapon = { instanceId: 'still-worn', itemId: 'novice_dagger', cards: [] };
  account.equipmentInventory.push({ instanceId: 'still-worn', itemId: 'novice_dagger', cards: [] });
  const wornSale = core.sellEquipment(character, account, 'still-worn');
  assert.equal(wornSale.ok, false, 'an instance still equipped by any character cannot be sold');
}

function testExpandedEquipmentCatalogAndDrops() {
  const catalog = core.getItemCatalog();
  assert.equal(catalog.equipment.length, 14);
  assert.equal(catalog.cards.length, 6);
  const equipmentIds = new Set(catalog.equipment.map(function (item) { return item.id; }));
  const cardIds = new Set(catalog.cards.map(function (item) { return item.id; }));
  const validSlots = new Set(['weapon', 'armor', 'shoes', 'accessory']);
  catalog.equipment.forEach(function (item) {
    assert.ok(validSlots.has(item.slot), item.id + ' must use an implemented equipment slot');
    assert.ok(item.requiredLevel >= 1, item.id + ' must have a valid level requirement');
    assert.ok(Array.isArray(item.allowedJobs) && item.allowedJobs.length > 0, item.id + ' must define job eligibility');
    assert.ok(item.sellPrice > 0, item.id + ' must have a sale price');
  });
  Object.values(world.monsters).forEach(function (monster) {
    (monster.drops || []).forEach(function (drop) {
      if (drop.type === 'equipment') assert.ok(equipmentIds.has(drop.id), monster.id + ' references missing equipment drop ' + drop.id);
      if (drop.type === 'card') assert.ok(cardIds.has(drop.id), monster.id + ' references missing card drop ' + drop.id);
    });
  });
  ['main_gauche', 'iron_sword', 'hunter_bow', 'padded_armor', 'silk_robe', 'scale_armor', 'field_boots', 'swift_boots', 'brooch', 'coin_pouch'].forEach(function (id) {
    assert.ok(equipmentIds.has(id), 'expanded equipment should include ' + id);
  });
  ['pupa_card', 'wolf_card', 'spore_card'].forEach(function (id) {
    assert.ok(cardIds.has(id), 'expanded card catalog should include ' + id);
  });

  const thief = core.makeCharacter('NewGearThief', 'male', 'novice');
  thief.jobId = 'thief'; thief.jobName = '盜賊'; thief.baseLevel = 3;
  const account = core.emptyAccount();
  account.equipmentInventory.push({ instanceId: 'main-gauche-thief', itemId: 'main_gauche', cards: [] });
  assert.equal(core.equipItem(thief, account, 'main-gauche-thief').ok, true, 'eligible thief can equip the new short sword');
  assert.equal(core.getEquipmentBonuses(thief).attackBonus, 4);

  const mage = core.makeCharacter('RestrictedGearMage', 'female', 'novice');
  mage.jobId = 'mage'; mage.jobName = '魔法師'; mage.baseLevel = 5;
  account.equipmentInventory.push({ instanceId: 'iron-sword-mage', itemId: 'iron_sword', cards: [] });
  const restricted = core.equipItem(mage, account, 'iron-sword-mage');
  assert.equal(restricted.ok, false, 'equipment job requirements are enforced for new items');
  assert.equal(account.equipmentInventory.some(function (item) { return item.instanceId === 'iron-sword-mage'; }), true);
}

function testEquipmentDodgeAndZenyBonuses() {
  const evasive = core.makeCharacter('EvasiveGearTester', 'female', 'novice');
  const plain = core.makeCharacter('PlainEvasionTester', 'female', 'novice');
  [evasive, plain].forEach(function (hero) {
    hero.baseLevel = 6;
    hero.battle.map = 'payon_field'; hero.battle.paused = false;
    hero.battle.currentMonsterId = 'wolf'; hero.battle.monsterHp = 1000; hero.battle.monsterMaxHp = 1000;
    hero.battle.monsterAttackClock = 1;
  });
  evasive.equipment.shoes = { instanceId: 'swift-boots-test', itemId: 'swift_boots', cards: [] };
  const rolls = [0.5, 0.5, 0.01];
  let index = 0;
  const evasiveResult = core.stepCombat(evasive, core.emptyAccount(), function () { return rolls[Math.min(index++, rolls.length - 1)]; });
  const plainRolls = [0.5, 0.5, 0.01];
  index = 0;
  const plainResult = core.stepCombat(plain, core.emptyAccount(), function () { return plainRolls[Math.min(index++, plainRolls.length - 1)]; });
  assert.equal(evasiveResult.dodged, true, 'swift boots should add dodge chance during actual monster attacks');
  assert.equal(plainResult.dodged, false, 'the same random roll should not dodge without the equipment bonus');

  const merchant = core.makeCharacter('ZenyGearTester', 'male', 'novice');
  const merchantPlain = core.makeCharacter('ZenyGearBaseline', 'male', 'novice');
  [merchant, merchantPlain].forEach(function (hero) {
    hero.jobId = 'merchant'; hero.jobName = '商人';
    hero.baseLevel = 99; hero.stats.str = 99;
    hero.battle.map = 'morroc_desert'; hero.battle.paused = false;
    hero.battle.currentMonsterId = 'orc'; hero.battle.monsterHp = 1; hero.battle.monsterMaxHp = 76;
  });
  merchant.equipment.accessory = { instanceId: 'coin-pouch-test', itemId: 'coin_pouch', cards: [] };
  const gearAccount = core.emptyAccount();
  const plainAccount = core.emptyAccount();
  core.stepCombat(merchant, gearAccount, function () { return 0.99; });
  core.stepCombat(merchantPlain, plainAccount, function () { return 0.99; });
  assert.equal(core.getEquipmentBonuses(merchant).zenyBonus, 0.1);
  assert.equal(gearAccount.gold, 18, 'merchant passive and coin pouch stack on kill Zeny');
  assert.equal(plainAccount.gold, 16, 'the same merchant without the coin pouch receives less Zeny');
}

function testEquipmentUiWiring() {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  assert.match(appSource, /function renderEquipment\(content\)/);
  assert.match(appSource, /window\.ROCore\.equipItem\(character, account, instanceId\)/);
  assert.match(appSource, /window\.ROCore\.socketCard\(character, account, slot, cardId\)/);
  assert.ok(appSource.includes('window.ROCore.removeSocketedCard(character, account, instanceId, cardIndex)'));
  assert.ok(appSource.includes('window.ROCore.sellEquipment(character, account, instanceId)'));
  assert.ok(appSource.includes('function handleRemoveSocketedCard(instanceId, cardIndex, cardName)'));
  assert.ok(appSource.includes('function handleSellEquipment(instanceId)'));
  assert.ok(appSource.includes('出售（'));
  assert.match(appSource, /account\.equipmentInventory\.push\(equipped\)/, 'deleting a character must return equipped items to account inventory');
  assert.match(appSource, /parsed\.equipmentInventory = \[\]/, 'legacy account saves should safely gain gear inventory');
  assert.match(html, /data-detail="equipment">裝備／卡片/);
  assert.match(html, /MVP 3\.2/);
  assert.match(css, /\.equipment-slot/);
}

function testPause() {
  const character = core.makeCharacter('PauseTester', 'female', 'novice');
  const account = core.emptyAccount();
  character.battle.map = 'training';
  character.battle.paused = true;
  const report = core.settleOffline(character, account, 30, function () { return 0; });
  assert.equal(report.kills, 0);
  assert.equal(report.expGained, 0);
  assert.equal(account.gold, 0);
}


function testMapAndMonsterProgression() {
  const character = core.makeCharacter('Mapper', 'male', 'novice');
  assert.equal(core.getMap('training').id, 'novice_ground');
  assert.deepEqual(core.getMapMonsterEncounterRates('missing-map'), [], 'unknown maps should not have encounter rates');
  world.maps.forEach(function (map) {
    const rates = core.getMapMonsterEncounterRates(map.id);
    assert.equal(rates.length, map.monsters.length, map.id + ' should expose every configured encounter');
    const totalProbability = rates.reduce(function (sum, entry) { return sum + entry.probability; }, 0);
    assert.ok(Math.abs(totalProbability - 1) < 1e-9, map.id + ' encounter chances should sum to 100%');
    rates.forEach(function (entry) {
      assert.ok(entry.weight > 0 && Number.isFinite(entry.probability), map.id + ' rates need positive weights');
      assert.ok(world.monsters[entry.id], map.id + ' references a known monster');
    });
  });
  assert.equal(core.getMapMonsterEncounterRates('novice_ground').find(function (entry) { return entry.id === 'poring'; }).probability, 40 / 110, 'Poring chance reflects the Green Plant prototype weight');
  assert.equal(core.startMap(character, 'prt_fild01', function () { return 0; }), false);
  assert.equal(core.startMap(character, 'novice_ground', function () { return 0; }), true);
  assert.equal(character.battle.currentMonsterId, 'poring');

  const account = core.emptyAccount();
  const report = core.settleOffline(character, account, 12, function () { return 0; });
  assert.ok(report.kills >= 1);
  assert.ok(character.baseLevel >= 2);
  assert.equal(core.startMap(character, 'prt_fild01', function () { return 0; }), true);
  assert.equal(character.battle.currentMonsterId, 'thief_bug');
  assert.equal(character.battle.monsterMaxHp, core.getMonster('thief_bug').maxHp);
}



function testStatPointAllocation() {
  assert.equal(core.statPointGainForLevelUp(1), 3);
  assert.equal(core.statPointGainForLevelUp(5), 4);
  assert.equal(core.statPointGainForLevelUp(10), 5);
  assert.equal(core.statPointCost(1), 2);
  assert.equal(core.statPointCost(10), 2);
  assert.equal(core.statPointCost(11), 3);

  const character = core.makeCharacter('StatTester', 'male', 'novice');
  character.statPoints = 7;
  const oldMaxHp = character.maxHp;
  const oldMaxSp = character.maxSp;

  const vit = core.allocateStat(character, 'vit');
  assert.equal(vit.ok, true);
  assert.equal(character.stats.vit, 2);
  assert.equal(character.statPoints, 5);
  assert.equal(character.maxHp, oldMaxHp + 5);

  const int = core.allocateStat(character, 'int');
  assert.equal(int.ok, true);
  assert.equal(character.maxSp, oldMaxSp + 2);
  assert.equal(character.statPoints, 3);

  assert.equal(core.allocateStat(character, 'str').ok, true);
  assert.equal(character.statPoints, 1);
  assert.equal(core.allocateStat(character, 'dex').ok, false);
  assert.equal(core.allocateStat(character, 'unknown').ok, false);

  character.stats.luk = core.STAT_CAP;
  assert.equal(core.allocateStat(character, 'luk').ok, false);
}

function testFirstJobPromotion() {
  const character = core.makeCharacter('JobTester', 'female', 'novice');
  character.baseLevel = 12;
  character.baseExp = 9;
  character.statPoints = 14;
  character.jobLevel = 9;
  character.jobExp = 77;
  character.battle.map = 'novice_ground';
  character.battle.paused = false;

  assert.equal(core.getJobLevelCap(character), 10);
  assert.equal(core.changeJob(character, 'swordsman').ok, false);
  assert.equal(character.jobId, 'novice');

  character.jobLevel = 10;
  const result = core.changeJob(character, 'swordsman');
  assert.equal(result.ok, true);
  assert.equal(character.jobId, 'swordsman');
  assert.equal(character.jobName, '劍士');
  assert.equal(character.jobLevel, 1);
  assert.equal(character.jobExp, 0);
  assert.equal(character.jobNotice, false);
  assert.equal(core.getJobLevelCap(character), 50);
  assert.equal(character.baseLevel, 12);
  assert.equal(character.baseExp, 9);
  assert.equal(character.statPoints, 14);
  assert.equal(character.battle.map, 'novice_ground');
  assert.equal(character.battle.paused, false);
  assert.equal(core.changeJob(character, 'mage').ok, false);
  assert.equal(core.changeJob(character, 'unknown-job').ok, false);

  const mage = core.makeCharacter('MageTester', 'male', 'novice');
  mage.jobLevel = 10;
  assert.equal(core.changeJob(mage, 'mage').ok, true);
  assert.equal(mage.jobName, '魔法師');
}

function makePromotedFighter(jobId) {
  const character = core.makeCharacter('Fighter-' + jobId, 'male', 'novice');
  character.jobLevel = 10;
  const promotion = core.changeJob(character, jobId);
  assert.equal(promotion.ok, true, 'promotion should succeed for ' + jobId);
  character.battle.map = 'novice_ground';
  character.battle.paused = false;
  character.battle.currentMonsterId = 'poring';
  character.battle.monsterHp = 1000;
  character.battle.monsterMaxHp = 1000;
  character.battle.monsterAttackClock = 0;
  return character;
}

function testFirstJobCombatPassives() {
  assert.equal(core.FIRST_JOBS.length, 6);

  const swordsman = makePromotedFighter('swordsman');
  const mage = makePromotedFighter('mage');
  const swordHit = core.stepCombat(swordsman, core.emptyAccount(), function () { return 0.99; });
  const mageHit = core.stepCombat(mage, core.emptyAccount(), function () { return 0.99; });
  assert.equal(mageHit.playerDamage, swordHit.playerDamage + 1);

  const acolyte = makePromotedFighter('acolyte');
  acolyte.hp = 20;
  acolyte.battle.monsterHp = 1;
  acolyte.battle.monsterMaxHp = 1;
  const acolyteResult = core.stepCombat(acolyte, core.emptyAccount(), function () { return 0.99; });
  assert.equal(acolyteResult.killed, true);
  assert.equal(acolyteResult.healingGained, 3);
  assert.equal(acolyte.hp, 23);

  const merchant = makePromotedFighter('merchant');
  merchant.battle.monsterHp = 1;
  merchant.battle.monsterMaxHp = 1;
  const merchantResult = core.stepCombat(merchant, core.emptyAccount(), function () { return 0.99; });
  assert.equal(merchantResult.goldGained, 6);

  const thief = makePromotedFighter('thief');
  thief.battle.monsterAttackClock = 1;
  const thiefResult = core.stepCombat(thief, core.emptyAccount(), function () { return 0.05; });
  assert.equal(thiefResult.dodged, true);
  assert.equal(thiefResult.monsterDamage, 0);

  const capped = makePromotedFighter('swordsman');
  capped.jobLevel = 49;
  capped.jobExp = core.jobExpToNext(49);
  capped.battle.monsterHp = 1;
  capped.battle.monsterMaxHp = 1;
  const capResult = core.stepCombat(capped, core.emptyAccount(), function () { return 0.99; });
  assert.equal(capped.jobLevel, 50);
  assert.equal(capped.jobExp, 0);
  assert.equal(capResult.jobCapped, true);
  assert.equal(capped.jobCapReached, true);

  capped.jobNotice = false; // The player has inspected the job panel.
  capped.battle.monsterHp = 1;
  capped.battle.monsterMaxHp = 1;
  const repeatCapResult = core.stepCombat(capped, core.emptyAccount(), function () { return 0.99; });
  assert.equal(repeatCapResult.jobCapped, false);
  assert.equal(capped.jobNotice, false, 'dismissed cap notice should stay dismissed');
}

function testAssetManifestCoverage() {
  assert.equal(world.assets.filter(function (asset) { return asset.requiredOnStart; }).length, 4);
  assert.ok(world.assets.filter(function (asset) { return !asset.requiredOnStart; }).length >= 20);
  const assetIds = new Set(world.assets.map(function (asset) { return asset.id; }));
  assert.equal(assetIds.size, world.assets.length, 'asset IDs must be unique');
  world.assets.filter(function (asset) { return asset.sourceRepository && asset.id !== 'thief_bug' && asset.id !== 'green_plant' && asset.assetKind !== 'monster-animation'; }).forEach(function (asset) {
    assert.equal(asset.sourceRepository, 'nba9001-sys/ro-idle');
    assert.match(asset.path, /raw\.githubusercontent\.com\/nba9001-sys\/ro-idle\/2348031f3797dbea1981f399288748378a283940\//);
    assert.match(asset.gitSha, /^[a-f0-9]{40}$/);
    assert.ok(asset.bytes > 0);
  });
  const spriteGroups = world.playerSpriteFrames;
  assert.equal(Object.keys(spriteGroups).length, 14, 'all six first jobs plus novice need both gender groups');
  let totalFrames = 0;
  Object.entries(spriteGroups).forEach(function (entry) {
    const group = entry[0];
    const frameIds = entry[1];
    assert.ok(frameIds.length >= 6 && frameIds.length <= 9, 'unexpected frame count for ' + group);
    assert.equal(frameIds[0], 'player_' + group, 'frame zero must reuse the existing preview asset');
    frameIds.forEach(function (id, index) {
      assert.ok(assetIds.has(id), 'missing animation frame asset: ' + id);
      const asset = world.assets.find(function (candidate) { return candidate.id === id; });
      assert.ok(asset.assetKind === 'character-frame' || asset.assetKind === 'character');
      assert.equal(asset.approvalStatus, 'owner-authorized');
      if (index > 0) assert.equal(asset.spriteGroup, group);
      totalFrames += 1;
    });
  });
  assert.equal(totalFrames, 120, 'all available frames from the 14 source folders should be registered');
  assert.ok(world.playerAnimationFrameIntervalMs >= 80);
  assert.equal(world.animationSource, 'nba9001-sys/ro-idle@2348031f3797dbea1981f399288748378a283940');
  world.maps.forEach(function (map) {
    assert.ok(assetIds.has(map.backgroundAssetId), 'missing map background asset: ' + map.id);
    map.monsters.forEach(function (entry) {
      const monster = world.monsters[entry.id];
      assert.ok(monster, 'missing monster data: ' + entry.id);
      assert.ok(assetIds.has(monster.assetId), 'missing dedicated monster image asset: ' + entry.id);
      if (monster.assetFallback === 'vector') {
        assert.equal(entry.id, 'thief_bug', 'only Thief Bug may use the explicit vector fallback');
      }
    });
  });
}

function testMonsterIdleAnimationAssets() {
  const expected = {
    lunatic: {
      mobId: 1063, id: 'lunatic_idle_anim', path: 'assets/lunatic_idle.svg',
      bytes: 58141, sha: '04461b2829cec9e95cdef5d11ce6140fa29ed5ed',
      actSha: 'fb90ed9e0d2f71392b2f25cddb4784a09a221cca',
      sprSha: '1cdcc31c9135ede2140e0d951b59efcc1560eda2',
      actionIndex: 2, frames: 12, frameMs: 80
    },
    wolf: {
      mobId: 1013, id: 'wolf_idle_anim', path: 'assets/wolf_idle.svg',
      bytes: 265283, sha: 'bb11db5c6f0417f2565380717ec0d0f51a8b51aa',
      actSha: '93c05e86366a7d9cfab19f59d1ff8f60dd1b617d',
      sprSha: '61b60050dce8094bbebf04d86cc87ef1e8d61706',
      actionIndex: 0, frames: 15, frameMs: 120
    },
    green_plant: {
      mobId: 1080, id: 'green_plant_idle_anim', path: 'assets/green_plant_idle.svg',
      bytes: 30163, sha: 'b5442646034f744f927db495df241b560c95d435',
      actSha: 'e1bda9fe10499c562baf5857ab8829d8f234bd0a',
      sprSha: '9ea4b7f257ae0b96048e9f0415e7ed7cdf08fc8a',
      actionIndex: 0, frames: 12, frameMs: 160
    }
  };
  const assetMap = new Map(world.assets.map(function (asset) { return [asset.id, asset]; }));
  Object.entries(expected).forEach(function (entry) {
    const monsterId = entry[0], want = entry[1];
    const monster = world.monsters[monsterId], asset = assetMap.get(want.id);
    assert.ok(monster, 'missing target monster ' + monsterId);
    assert.ok(asset, 'missing parsed animation asset ' + want.id);
    assert.equal(monster.sourceMobId, want.mobId);
    assert.equal(monster.assetId, monsterId, 'animation must not replace the identity PNG');
    assert.equal(monster.animationAssetId, want.id);
    assert.equal(monster.animationActionIndex, want.actionIndex);
    assert.equal(monster.animationFrameCount, want.frames);
    assert.equal(monster.animationFrameDurationMs, want.frameMs);
    assert.equal(asset.sourceMobId, want.mobId);
    assert.equal(asset.assetKind, 'monster-animation');
    assert.equal(asset.animationType, 'idle');
    assert.equal(asset.actActionIndex, want.actionIndex);
    assert.equal(asset.frameCount, want.frames);
    assert.equal(asset.frameDurationMs, want.frameMs);
    assert.equal(asset.requiredOnStart, false, 'animation is loaded only when a map needs it');
    assert.equal(asset.path, './' + want.path);
    assert.equal(asset.bytes, want.bytes);
    assert.equal(asset.gitSha, want.sha);
    assert.equal(asset.sourceRepository, 'MyGodIsHe/pyro-tools');
    assert.equal(asset.sourceCommit, '1a28450df59bc69e56e70e431f9b61351bafc8f6');
    assert.equal(asset.sourceActSha, want.actSha);
    assert.equal(asset.sourceSprSha, want.sprSha);
    const file = fs.readFileSync(path.join(__dirname, '..', want.path));
    assert.equal(file.length, want.bytes, 'generated animation byte size must match manifest');
    const blobSha = crypto.createHash('sha1').update(Buffer.concat([
      Buffer.from('blob ' + file.length + '\0'), file
    ])).digest('hex');
    assert.equal(blobSha, want.sha, 'generated animation must match manifest Git blob SHA-1');
    const svg = file.toString('utf8');
    assert.match(svg, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, new RegExp('data-mob-id="' + want.mobId + '"'));
    assert.match(svg, new RegExp('data-act-action-index="' + want.actionIndex + '"'));
    assert.match(svg, new RegExp('data-frame-count="' + want.frames + '"'));
    assert.equal((svg.match(/id="frame-/g) || []).length, want.frames, 'each ACT frame has a distinct SVG group');
    assert.match(svg, /@keyframes f0/);
    assert.match(svg, /animation:f0 /, 'frame timing is embedded without a JS timer');
  });
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(appSource, /function getMonsterArtworkSource\(monster\)/);
  assert.match(appSource, /animationAssetId && assetUrls\[animationAssetId\]/, 'use the verified parsed animation when available');
  assert.match(appSource, /if \(optionalAnimationAssets\.length\)/, 'animation failure must not block map entry');
  assert.match(appSource, /getAttribute\('src'\) !== monsterArtworkSource/, 'do not restart the SVG timeline every battle tick');
  assert.match(appSource, /同一物種的已驗證靜態圖/);
  const savedVisualStart = appSource.indexOf('async function ensureSavedBattleVisuals(target)');
  const savedVisualEnd = appSource.indexOf('\n  function handleCreate', savedVisualStart);
  assert.ok(savedVisualStart >= 0 && savedVisualEnd > savedVisualStart, 'saved battle visual loader must exist');
  const savedBattleVisuals = appSource.slice(savedVisualStart, savedVisualEnd);
  assert.match(savedBattleVisuals, /optionalAnimationIds/, 'resuming a saved battle should discover animation assets');
  assert.match(savedBattleVisuals, /optionalAnimationAssets = ASSETS\.filter/, 'saved battles should find animation assets');
  assert.match(savedBattleVisuals, /ensureAssets\(\[asset\], false\)/, 'animation downloads stay optional and independent');
  assert.match(savedBattleVisuals, /character\.id !== targetCharacterId/, 'async loads must not change a different active character');
  assert.match(savedBattleVisuals, /renderGame\(\)/, 'refresh the resumed battle when animation is ready');
  const sources = fs.readFileSync(path.join(__dirname, '..', 'assets', 'SOURCES.md'), 'utf8');
  assert.match(sources, /MVP 2\.3 真實怪物待機動畫素材指紋/);
}

function testMonsterActSprExportReproducibility() {
  const toolPath = path.join(__dirname, '..', 'tools', 'render_monster_act_spr.js');
  const output = execFileSync(process.execPath, [toolPath, '--check'], {
    encoding: 'utf8',
    timeout: 30000
  });
  assert.match(output, /Verified lunatic: Mob 1063, action 2, 12 frames at 80ms\/frame/);
  assert.match(output, /Verified lunatic-attack: Mob 1063, action 18, 19 frames at 40ms\/frame/);
  assert.match(output, /Verified wolf: Mob 1013, action 0, 15 frames at 120ms\/frame/);
  assert.match(output, /Verified wolf-attack: Mob 1013, action 16, 7 frames at 120ms\/frame/);
  assert.match(output, /Verified poring-idle: Mob 1002, action 0, 4 frames at 160ms\/frame/);
  assert.match(output, /Verified poring-attack: Mob 1002, action 16, 28 frames at 40ms\/frame/);
  assert.match(output, /Verified poring-hurt: Mob 1002, action 24, 5 frames at 160ms\/frame/);
  assert.match(output, /Verified poring-walk: Mob 1002, action 8, 10 frames at 40ms\/frame/);
  assert.match(output, /Verified wolf-walk: Mob 1013, action 8, 8 frames at 80ms\/frame/);
  assert.match(output, /Verified green-plant: Mob 1080, action 0, 12 frames at 160ms\/frame/);
  assert.match(output, /Verified static fallback green-plant: Mob 1080/);
  const toolSource = fs.readFileSync(toolPath, 'utf8');
  assert.match(toolSource, /SOURCE_COMMIT = '1a28450df59bc69e56e70e431f9b61351bafc8f6'/);
  assert.match(toolSource, /RAGASSETS_COMMIT = '4de4fa747431979d35c747d7edd549a872efd9e1'/);
  assert.match(toolSource, /function gitBlobSha\(bytes\)/);
  assert.match(toolSource, /function parseAct\(bytes\)/);
  assert.match(toolSource, /function parseSpr\(bytes\)/);
}


function testGreenPlantMob1080ActSprIdentity() {
  const tool = require(path.join(__dirname, '..', 'tools', 'render_monster_act_spr.js'));
  const act = fs.readFileSync(path.join(__dirname, '..', 'tools', 'samples', 'green_plant.act'));
  const spr = fs.readFileSync(path.join(__dirname, '..', 'tools', 'samples', 'green_plant.spr'));
  assert.equal(act.length, 42876);
  assert.equal(tool.gitBlobSha(act), 'e1bda9fe10499c562baf5857ab8829d8f234bd0a');
  assert.equal(spr.length, 4763);
  assert.equal(tool.gitBlobSha(spr), '9ea4b7f257ae0b96048e9f0415e7ed7cdf08fc8a');
  const parsedAct = tool.parseAct(act);
  const parsedSpr = tool.parseSpr(spr);
  assert.equal(parsedAct.version, 4);
  assert.equal(parsedAct.actions.length, 40);
  assert.equal(parsedAct.actions[0].length, 12);
  assert.equal(Math.round(parsedAct.speeds[0] * 40), 160);
  assert.equal(parsedSpr.indexedCount, 13);
  assert.equal(parsedSpr.trueColorCount, 0);
  parsedAct.actions[0].forEach(function (layers, frameIndex) {
    assert.equal(layers.length, 1, 'Green Plant idle frame ' + frameIndex + ' should have one layer');
    assert.equal(layers[0].direction, 0, 'Green Plant idle frame ' + frameIndex + ' uses the validated direction');
    assert.ok(parsedSpr.sprites[layers[0].spriteIndex], 'Green Plant idle frame references a valid paired SPR image');
  });
  assert.equal(world.monsters.green_plant.sourceMobId, 1080);
  assert.equal(world.monsters.green_plant.animationAssetId, 'green_plant_idle_anim');
  assert.equal(world.monsters.green_plant.animationActionIndex, 0);
  assert.equal(world.monsters.fabre.sourceMobId, 1007, 'Fabre must remain Mob 1007, not Green Plant');
  assert.equal(world.monsters.fabre.animationAssetId, undefined, 'Green Plant animation must never be assigned to Fabre');
  const fallback = fs.readFileSync(path.join(__dirname, '..', 'assets', 'green_plant.svg'));
  assert.equal(fallback.length, 2552);
  assert.equal(tool.gitBlobSha(fallback), '1f2d87a90a16161d6f101b67a11384a1a8490b6c');
  assert.match(fallback.toString('utf8'), /data-mob-id="1080"/);
  assert.doesNotMatch(fallback.toString('utf8'), /@keyframes/, 'fallback is a same-species static frame');
}

function testPoringIdleAndAttackAnimations() {
  const expected = [
    {
      id: 'poring_idle_anim', path: 'assets/poring_idle.svg', type: 'idle',
      actionIndex: 0, frames: 4, frameMs: 160, bytes: 21378,
      sha: 'e7f0b0d56ca3e8997e98ebcdc8e10ccdaaae0ca8',
      actSha: '26717393629e410910ff080d204e930d945328cd',
      sprSha: '406b3e91bca7137e8f7a8abcd46468f3fb639ad7'
    },
    {
      id: 'poring_attack_anim', path: 'assets/poring_attack.svg', type: 'attack',
      actionIndex: 16, frames: 28, frameMs: 40, bytes: 136944,
      sha: 'd550fe9a3edc83b241d882038657e6e6e1e3c916',
      actSha: '26717393629e410910ff080d204e930d945328cd',
      sprSha: '406b3e91bca7137e8f7a8abcd46468f3fb639ad7'
    }
  ];
  const poring = world.monsters.poring;
  assert.equal(poring.sourceMobId, 1002);
  assert.equal(poring.assetId, 'poring', 'the verified static Mob 1002 image remains the fallback');
  assert.equal(poring.animationAssetId, 'poring_idle_anim');
  assert.equal(poring.animationActionIndex, 0);
  assert.equal(poring.attackAnimationAssetId, 'poring_attack_anim');
  assert.equal(poring.attackAnimationActionIndex, 16);
  const assetMap = new Map(world.assets.map(function (asset) { return [asset.id, asset]; }));
  expected.forEach(function (want) {
    const asset = assetMap.get(want.id);
    assert.ok(asset, 'missing verified Poring animation: ' + want.id);
    assert.equal(asset.sourceMobId, 1002);
    assert.equal(asset.assetKind, 'monster-animation');
    assert.equal(asset.animationType, want.type);
    assert.equal(asset.actActionIndex, want.actionIndex);
    assert.equal(asset.frameCount, want.frames);
    assert.equal(asset.frameDurationMs, want.frameMs);
    assert.equal(asset.requiredOnStart, false);
    assert.equal(asset.sourceRepository, 'adsonpleal/ragassets');
    assert.equal(asset.sourceCommit, '4de4fa747431979d35c747d7edd549a872efd9e1');
    assert.equal(asset.sourceActSha, want.actSha);
    assert.equal(asset.sourceSprSha, want.sprSha);
    assert.equal(asset.bytes, want.bytes);
    assert.equal(asset.gitSha, want.sha);
    const file = fs.readFileSync(path.join(__dirname, '..', want.path));
    assert.equal(file.length, want.bytes);
    const sha = crypto.createHash('sha1').update(Buffer.concat([
      Buffer.from('blob ' + file.length + '\0'), file
    ])).digest('hex');
    assert.equal(sha, want.sha, 'Poring animation must match its Git blob SHA-1');
    const svg = file.toString('utf8');
    assert.match(svg, /data-mob-id="1002"/);
    assert.match(svg, new RegExp('data-act-action-index="' + want.actionIndex + '"'));
    assert.match(svg, new RegExp('data-frame-count="' + want.frames + '"'));
    assert.match(svg, new RegExp('data-frame-duration-ms="' + want.frameMs + '"'));
    assert.equal((svg.match(/id="frame-/g) || []).length, want.frames);
    assert.match(svg, new RegExp(want.type === 'attack' ? '攻擊逐格動畫' : '待機逐格動畫'));
  });
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(appSource, /function playMonsterActionAnimation\(monster, action\)/);
  assert.match(appSource, /monsterAnimationOverride/);
  assert.match(appSource, /result\.dodged \|\| result\.monsterDamage/);
  assert.match(appSource, /monster\.attackAnimationAssetId/);
  assert.match(appSource, /optionalAnimationIds\.add\(monster\.attackAnimationAssetId\)/);
}


function testLunaticWolfAttackAnimations() {
  const tool = require(path.join(__dirname, '..', 'tools', 'render_monster_act_spr.js'));
  const expected = [
    {
      key: 'lunatic', mobId: 1063, id: 'lunatic_attack_anim', path: 'assets/lunatic_attack.svg',
      actPath: 'lunatic.act', sprPath: 'lunatic.spr', actionIndex: 18, frames: 19, frameMs: 40,
      bytes: 95667, sha: '4d1e7e2ca0ac737758adb7439f48545a3dadaed6',
      actBytes: 129468, actSha: 'fb90ed9e0d2f71392b2f25cddb4784a09a221cca',
      sprBytes: 36287, sprSha: '1cdcc31c9135ede2140e0d951b59efcc1560eda2'
    },
    {
      key: 'wolf', mobId: 1013, id: 'wolf_attack_anim', path: 'assets/wolf_attack.svg',
      actPath: 'wolf.act', sprPath: 'wolf.spr', actionIndex: 16, frames: 7, frameMs: 120,
      bytes: 112050, sha: '54058111ce081c79625d91f1acc6f4dcc9ab7de0',
      actBytes: 36564, actSha: '93c05e86366a7d9cfab19f59d1ff8f60dd1b617d',
      sprBytes: 104662, sprSha: '61b60050dce8094bbebf04d86cc87ef1e8d61706'
    }
  ];
  const assetMap = new Map(world.assets.map(function (asset) { return [asset.id, asset]; }));
  expected.forEach(function (want) {
    const monster = world.monsters[want.key];
    const asset = assetMap.get(want.id);
    assert.ok(monster, 'missing attack-animation monster ' + want.key);
    assert.ok(asset, 'missing attack animation manifest ' + want.id);
    assert.equal(monster.sourceMobId, want.mobId);
    assert.equal(monster.assetId, want.key, 'attack animation must preserve its dedicated static identity image');
    assert.equal(monster.attackAnimationAssetId, want.id);
    assert.equal(monster.attackAnimationActionIndex, want.actionIndex);
    assert.equal(monster.attackAnimationFrameCount, want.frames);
    assert.equal(monster.attackAnimationFrameDurationMs, want.frameMs);
    assert.equal(asset.sourceMobId, want.mobId);
    assert.equal(asset.assetKind, 'monster-animation');
    assert.equal(asset.animationType, 'attack');
    assert.equal(asset.actActionIndex, want.actionIndex);
    assert.equal(asset.frameCount, want.frames);
    assert.equal(asset.frameDurationMs, want.frameMs);
    assert.equal(asset.requiredOnStart, false);
    assert.equal(asset.sourceRepository, 'MyGodIsHe/pyro-tools');
    assert.equal(asset.sourceCommit, '1a28450df59bc69e56e70e431f9b61351bafc8f6');
    assert.equal(asset.sourceActSha, want.actSha);
    assert.equal(asset.sourceSprSha, want.sprSha);
    assert.equal(asset.bytes, want.bytes);
    assert.equal(asset.gitSha, want.sha);

    const actBytes = fs.readFileSync(path.join(__dirname, '..', 'tools', 'samples', want.actPath));
    const sprBytes = fs.readFileSync(path.join(__dirname, '..', 'tools', 'samples', want.sprPath));
    assert.equal(actBytes.length, want.actBytes);
    assert.equal(tool.gitBlobSha(actBytes), want.actSha);
    assert.equal(sprBytes.length, want.sprBytes);
    assert.equal(tool.gitBlobSha(sprBytes), want.sprSha);
    const act = tool.parseAct(actBytes);
    const spr = tool.parseSpr(sprBytes);
    assert.equal(Math.round(act.speeds[want.actionIndex] * 40), want.frameMs);
    assert.equal(act.actions[want.actionIndex].length, want.frames);
    act.actions[want.actionIndex].forEach(function (layers, frameIndex) {
      assert.equal(layers.length, 1, want.key + ' attack frame should contain one layer (' + frameIndex + ')');
      assert.equal(layers[0].direction, 0, want.key + ' attack must use the validated direction-0 layer');
      assert.ok(spr.sprites[layers[0].spriteIndex], want.key + ' attack frame must reference its paired SPR');
      assert.equal(Math.abs(layers[0].rotation), 0);
      assert.equal(Math.abs(layers[0].scaleX - 1) < 0.001, true);
      assert.equal(Math.abs(layers[0].scaleY - 1) < 0.001, true);
    });

    const file = fs.readFileSync(path.join(__dirname, '..', want.path));
    assert.equal(file.length, want.bytes);
    const digest = crypto.createHash('sha1').update(Buffer.concat([
      Buffer.from('blob ' + file.length + '\0'), file
    ])).digest('hex');
    assert.equal(digest, want.sha);
    const svg = file.toString('utf8');
    assert.match(svg, new RegExp('data-mob-id="' + want.mobId + '"'));
    assert.match(svg, new RegExp('data-act-action-index="' + want.actionIndex + '"'));
    assert.match(svg, new RegExp('data-frame-count="' + want.frames + '"'));
    assert.match(svg, new RegExp('data-frame-duration-ms="' + want.frameMs + '"'));
    assert.match(svg, /攻擊逐格動畫/);
    assert.equal((svg.match(/id="frame-/g) || []).length, want.frames);
  });
}


function testMonsterWalkEntryAnimations() {
  const tool = require(path.join(__dirname, '..', 'tools', 'render_monster_act_spr.js'));
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const cases = [
    {
      name: 'Poring',
      key: 'poring',
      mobId: 1002,
      assetId: 'poring_walk_anim',
      actionIndex: 8,
      frames: 10,
      frameMs: 40,
      actSha: '26717393629e410910ff080d204e930d945328cd',
      sprSha: '406b3e91bca7137e8f7a8abcd46468f3fb639ad7',
      outputBytes: 50257,
      outputSha: '4d84a80fa54aed07db0eb4ceb8ffb1592adad1c9',
      sourceRepository: 'adsonpleal/ragassets',
      sourceCommit: '4de4fa747431979d35c747d7edd549a872efd9e1',
      actPath: 'poring.act',
      sprPath: 'poring.spr'
    },
    {
      name: 'Wolf',
      key: 'wolf',
      mobId: 1013,
      assetId: 'wolf_walk_anim',
      actionIndex: 8,
      frames: 8,
      frameMs: 80,
      actSha: '93c05e86366a7d9cfab19f59d1ff8f60dd1b617d',
      sprSha: '61b60050dce8094bbebf04d86cc87ef1e8d61706',
      outputBytes: 140374,
      outputSha: '0180f648a1d44961d2561a1d90006b1e6e45be03',
      sourceRepository: 'MyGodIsHe/pyro-tools',
      sourceCommit: '1a28450df59bc69e56e70e431f9b61351bafc8f6',
      actPath: 'wolf.act',
      sprPath: 'wolf.spr'
    }
  ];
  cases.forEach(function (config) {
    const monster = world.monsters[config.key];
    const asset = world.assets.find(function (item) { return item.id === config.assetId; });
    assert.ok(asset, config.name + ' walk manifest missing');
    assert.equal(monster.sourceMobId, config.mobId);
    assert.equal(monster.walkAnimationAssetId, config.assetId);
    assert.equal(monster.walkAnimationActionIndex, config.actionIndex);
    assert.equal(monster.walkAnimationFrameCount, config.frames);
    assert.equal(monster.walkAnimationFrameDurationMs, config.frameMs);
    assert.equal(asset.sourceMobId, config.mobId);
    assert.equal(asset.animationType, 'walk');
    assert.equal(asset.actActionIndex, config.actionIndex);
    assert.equal(asset.frameCount, config.frames);
    assert.equal(asset.frameDurationMs, config.frameMs);
    assert.equal(asset.requiredOnStart, false);
    assert.equal(asset.sourceRepository, config.sourceRepository);
    assert.equal(asset.sourceCommit, config.sourceCommit);
    assert.equal(asset.sourceActSha, config.actSha);
    assert.equal(asset.sourceSprSha, config.sprSha);
    assert.equal(asset.bytes, config.outputBytes);
    assert.equal(asset.gitSha, config.outputSha);

    const actBytes = fs.readFileSync(path.join(__dirname, '..', 'tools', 'samples', config.actPath));
    const sprBytes = fs.readFileSync(path.join(__dirname, '..', 'tools', 'samples', config.sprPath));
    assert.equal(tool.gitBlobSha(actBytes), config.actSha);
    assert.equal(tool.gitBlobSha(sprBytes), config.sprSha);
    const act = tool.parseAct(actBytes);
    const spr = tool.parseSpr(sprBytes);
    assert.equal(act.actions[config.actionIndex].length, config.frames);
    assert.equal(Math.round(act.speeds[config.actionIndex] * 40), config.frameMs);
    act.actions[config.actionIndex].forEach(function (layers, index) {
      assert.equal(layers.length, 1, config.name + ' walk must have one layer per frame: ' + index);
      assert.equal(layers[0].direction, 0, config.name + ' walk must use direction 0: ' + index);
      assert.ok(spr.sprites[layers[0].spriteIndex], config.name + ' walk sprite ref missing: ' + index);
      assert.equal(layers[0].rotation, 0, config.name + ' walk must not use unhandled rotation: ' + index);
      assert.equal(layers[0].scaleX, 1, config.name + ' walk must not use unhandled scaleX: ' + index);
      assert.equal(layers[0].scaleY, 1, config.name + ' walk must not use unhandled scaleY: ' + index);
    });
    const svgBytes = fs.readFileSync(path.join(__dirname, '..', asset.path.replace(/^\.\//, '')));
    assert.equal(svgBytes.length, config.outputBytes);
    assert.equal(tool.gitBlobSha(svgBytes), config.outputSha);
    const svg = svgBytes.toString('utf8');
    assert.match(svg, new RegExp('data-mob-id="' + config.mobId + '"'));
    assert.match(svg, new RegExp('data-act-action-index="' + config.actionIndex + '"'));
    assert.match(svg, new RegExp('data-frame-count="' + config.frames + '"'));
    assert.match(svg, new RegExp('data-frame-duration-ms="' + config.frameMs + '"'));
    assert.match(svg, /移動逐格動畫/);
    assert.equal((svg.match(/id="frame-/g) || []).length, config.frames);
  });
  assert.match(appSource, /walkAnimationAssetId\) optionalAnimationIds\.add\(monster\.walkAnimationAssetId\)/);
  assert.match(appSource, /walk: \{ asset: 'walkAnimationAssetId', frames: 'walkAnimationFrameCount', interval: 'walkAnimationFrameDurationMs' \}/);
  assert.match(appSource, /playMonsterActionAnimation\(nextMonster, 'walk'\)/);
}

function testPoringHurtAnimation() {
  const tool = require(path.join(__dirname, '..', 'tools', 'render_monster_act_spr.js'));
  const asset = world.assets.find(function (item) { return item.id === 'poring_hurt_anim'; });
  const poring = world.monsters.poring;
  assert.ok(asset, 'missing Poring hurt animation manifest entry');
  assert.equal(poring.sourceMobId, 1002);
  assert.equal(poring.hurtAnimationAssetId, 'poring_hurt_anim');
  assert.equal(poring.hurtAnimationActionIndex, 24);
  assert.equal(poring.hurtAnimationFrameCount, 5);
  assert.equal(poring.hurtAnimationFrameDurationMs, 160);
  assert.equal(asset.sourceMobId, 1002);
  assert.equal(asset.animationType, 'hurt');
  assert.equal(asset.actActionIndex, 24);
  assert.equal(asset.frameCount, 5);
  assert.equal(asset.frameDurationMs, 160);
  assert.equal(asset.requiredOnStart, false);
  assert.equal(asset.sourceRepository, 'adsonpleal/ragassets');
  assert.equal(asset.sourceCommit, '4de4fa747431979d35c747d7edd549a872efd9e1');
  assert.equal(asset.sourceActSha, '26717393629e410910ff080d204e930d945328cd');
  assert.equal(asset.sourceSprSha, '406b3e91bca7137e8f7a8abcd46468f3fb639ad7');
  assert.equal(asset.bytes, 28191);
  assert.equal(asset.gitSha, '34ae789ab040f4e4b28bc5cedcdaf058fb2459ff');
  const actBytes = fs.readFileSync(path.join(__dirname, '..', 'tools', 'samples', 'poring.act'));
  const sprBytes = fs.readFileSync(path.join(__dirname, '..', 'tools', 'samples', 'poring.spr'));
  assert.equal(tool.gitBlobSha(actBytes), asset.sourceActSha);
  assert.equal(tool.gitBlobSha(sprBytes), asset.sourceSprSha);
  const act = tool.parseAct(actBytes);
  const spr = tool.parseSpr(sprBytes);
  assert.equal(act.actions[24].length, 5);
  assert.equal(Math.round(act.speeds[24] * 40), 160);
  act.actions[24].forEach(function (layers, index) {
    assert.equal(layers.length, 1, 'Poring hurt frame must have one layer: ' + index);
    assert.equal(layers[0].direction, 0, 'Poring hurt frame must use verified direction 0');
    assert.ok(spr.sprites[layers[0].spriteIndex], 'Poring hurt must use a valid paired SPR frame');
    assert.equal(Math.abs(layers[0].rotation), 0);
    assert.ok(Math.abs(layers[0].scaleX - 1) < 0.001);
    assert.ok(Math.abs(layers[0].scaleY - 1) < 0.001);
  });
  const file = fs.readFileSync(path.join(__dirname, '..', 'assets', 'poring_hurt.svg'));
  assert.equal(file.length, 28191);
  const sha = crypto.createHash('sha1').update(Buffer.concat([
    Buffer.from('blob ' + file.length + '\0'), file
  ])).digest('hex');
  assert.equal(sha, '34ae789ab040f4e4b28bc5cedcdaf058fb2459ff');
  const svg = file.toString('utf8');
  assert.match(svg, /data-mob-id="1002"/);
  assert.match(svg, /data-act-action-index="24"/);
  assert.match(svg, /data-frame-count="5"/);
  assert.match(svg, /data-frame-duration-ms="160"/);
  assert.match(svg, /受擊逐格動畫/);
  assert.equal((svg.match(/id="frame-/g) || []).length, 5);
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(appSource, /hurt: \{ asset: 'hurtAnimationAssetId'/);
  assert.match(appSource, /playMonsterActionAnimation\(hurtMonster, 'hurt'\)/);
  assert.match(appSource, /monster\.hurtAnimationAssetId\) optionalAnimationIds\.add\(monster\.hurtAnimationAssetId\)/);
}

function testCriticalEffectManifest() {
  assert.equal(world.criticalEffectFrames.length, 15);
  assert.equal(world.criticalEffectFrameIntervalMs, 70);
  const assetMap = new Map(world.assets.map(function (asset) { return [asset.id, asset]; }));
  let totalBytes = 0;
  world.criticalEffectFrames.forEach(function (assetId, index) {
    const asset = assetMap.get(assetId);
    assert.ok(asset, 'critical effect references missing frame: ' + assetId);
    assert.equal(asset.assetKind, 'effect-frame');
    assert.equal(asset.spriteGroup, 'crit');
    assert.equal(asset.frameNumber, index);
    assert.equal(asset.sourcePath, 'images/effects/crit/msg_frame_' + String(index).padStart(3, '0') + '.png');
    assert.match(asset.gitSha, /^[a-f0-9]{40}$/);
    assert.ok(asset.bytes > 0);
    totalBytes += asset.bytes;
  });
  assert.equal(totalBytes, 17846);
}

function testExpandedWorldContent() {
  const expectedMaps = ['prt_fild00', 'payon_field', 'morroc_desert', 'prt_maze01'];
  expectedMaps.forEach(function (mapId) {
    assert.ok(core.getMap(mapId), 'expected expanded map: ' + mapId);
  });
  assert.ok(world.monsters.wolf && world.monsters.hornet && world.monsters.goblin);
  assert.ok(world.monsters.orc && world.monsters.willow && world.monsters.spore);
  assert.ok(world.monsters.poporing && world.monsters.pecopeco && world.monsters.picky && world.monsters.condor);
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(appSource, /getMapMonsterEncounterRates\(map\.id\)/, 'map choices should render calculated encounter chances');
  assert.match(appSource, /預估遇敵率（原型設定）/, 'prototype rates must be labeled clearly');
  assert.equal(core.getMap('morroc_desert').backgroundAssetId, 'desert');
  assert.equal(core.getMap('prt_maze01').backgroundAssetId, 'cave');

  const character = core.makeCharacter('MapUnlockTester', 'male', 'novice');
  character.baseLevel = 5;
  assert.equal(core.startMap(character, 'morroc_desert', function () { return 0; }), false);
  character.baseLevel = 6;
  assert.equal(core.startMap(character, 'morroc_desert', function () { return 0; }), true);
  assert.equal(character.battle.currentMonsterId, 'pecopeco');
  assert.equal(character.battle.monsterMaxHp, world.monsters.pecopeco.maxHp);

  character.battle.paused = true;
  character.baseLevel = 6;
  assert.equal(core.startMap(character, 'prt_maze01', function () { return 0; }), false);
  character.baseLevel = 7;
  assert.equal(core.startMap(character, 'prt_maze01', function () { return 0; }), true);
  assert.equal(character.battle.currentMonsterId, 'thief_bug');
}

function testSpriteFramesUsePinnedSourceAndHaveNoMissingReferences() {
  const assetMap = new Map(world.assets.map(function (asset) { return [asset.id, asset]; }));
  Object.entries(world.playerSpriteFrames).forEach(function (entry) {
    entry[1].forEach(function (assetId, index) {
      const asset = assetMap.get(assetId);
      assert.ok(asset, 'sprite references missing asset: ' + assetId);
      assert.match(asset.gitSha, /^[a-f0-9]{40}$/);
      assert.ok(asset.bytes > 0);
      if (index > 0) {
        assert.ok(asset.path.includes('/2348031f3797dbea1981f399288748378a283940/images/frames/'));
        assert.equal(asset.assetKind, 'character-frame');
      }
    });
  });
}


function testSoundEffectManifest() {
  const expected = {
    hit: 'sfx_hit_sword',
    critical: 'sfx_critical',
    levelup: 'sfx_levelup',
    skill_sword: 'sfx_skill_sword',
    skill_fire: 'sfx_skill_fire',
    skill_soul: 'sfx_skill_soul',
    skill_arrow: 'sfx_skill_arrow',
    skill_heal: 'sfx_skill_heal',
    skill_merchant: 'sfx_skill_merchant',
    skill_poison: 'sfx_skill_poison'
  };
  assert.deepEqual(world.soundEffects, expected);
  const assetMap = new Map(world.assets.map(function (asset) { return [asset.id, asset]; }));
  const pinned = '2348031f3797dbea1981f399288748378a283940';
  const definitions = {
    sfx_hit_sword: { bytes: 24866, gitSha: 'fcb1f2cd80591ed5e92f730a417377c401ae65be', sourcePath: 'WAV/物理攻擊命中/_hit_sword.wav' },
    sfx_critical: { bytes: 8886, gitSha: 'dcc3946a430651b08334c2edade11d61672672ee', sourcePath: 'WAV/爆擊/Critical.ogg' },
    sfx_levelup: { bytes: 24294, gitSha: '4c501809789d1a03aedfd8c6c9728809c8a32dac', sourcePath: 'WAV/event/levelup.ogg' },
    sfx_skill_sword: { bytes: 12488, gitSha: 'fd1564fa6e975d02811c51a26e37d61fde106417', sourcePath: 'WAV/物理攻擊揮空/_attack_sword.wav' },
    sfx_skill_fire: { bytes: 34412, gitSha: '253727c39fff8deb9ccd53df195bc47bffebddb6', sourcePath: 'WAV/魔法傷害/火箭術.wav' },
    sfx_skill_soul: { bytes: 20724, gitSha: 'c93e0743fbb003c055f69e9eb690789b8ee7c938', sourcePath: 'WAV/魔法傷害/其餘雷系.wav' },
    sfx_skill_arrow: { bytes: 13360, gitSha: '349f3b1a145092e9a2119d71a69063c1c1e74025', sourcePath: 'WAV/物理攻擊命中/_hit_arrow.wav' },
    sfx_skill_heal: { bytes: 59636, gitSha: '7447aeb13b0e6c45443f6ca01ede4e2357c20623', sourcePath: 'WAV/魔法傷害/治癒術.wav' },
    sfx_skill_merchant: { bytes: 16114, gitSha: 'e7f38e344756e8b8e84cce27000b666d65353051', sourcePath: 'WAV/物理攻擊命中/_hit_axe.wav' },
    sfx_skill_poison: { bytes: 40564, gitSha: 'a6e6614cb5688ffa70f78c9c9b6f94c8ebaffb91', sourcePath: 'WAV/異常狀態/中毒.wav' }
  };
  Object.entries(definitions).forEach(function (entry) {
    const asset = assetMap.get(entry[0]);
    assert.ok(asset, 'missing sound effect asset: ' + entry[0]);
    assert.equal(asset.requiredOnStart, false, 'sound effects must be loaded on demand');
    assert.equal(asset.assetKind, 'sound-effect');
    assert.equal(asset.sourceRepository, 'nba9001-sys/ro-idle');
    assert.equal(asset.sourcePath, entry[1].sourcePath);
    assert.ok(asset.path.includes('/' + pinned + '/'));
    assert.equal(asset.bytes, entry[1].bytes);
    assert.equal(asset.gitSha, entry[1].gitSha);
    assert.match(asset.gitSha, /^[a-f0-9]{40}$/);
  });
  assert.equal(world.soundSource, 'nba9001-sys/ro-idle@' + pinned);

  const expectedMusic = { default: 'bgm_default', novice_ground: 'bgm_novice_ground', prt_fild01: 'bgm_prt_fild01' };
  assert.deepEqual(world.mapMusic, expectedMusic);
  const musicDefinitions = {
    bgm_default: { bytes: 747520, gitSha: 'cad866cf9b0b98cf4892a887dd12985057cc6e13', sourcePath: 'music/maps/0000.mp3' },
    bgm_novice_ground: { bytes: 1476608, gitSha: '95997a8034476a21ba168d91d8322332dbcadf66', sourcePath: 'music/maps/5001.mp3' },
    bgm_prt_fild01: { bytes: 2257024, gitSha: '71daf34328cdc69d64d8c39172e4b2d584a8830a', sourcePath: 'music/maps/5004.mp3' }
  };
  Object.entries(musicDefinitions).forEach(function (entry) {
    const asset = assetMap.get(entry[0]);
    assert.ok(asset, 'missing background music asset: ' + entry[0]);
    assert.equal(asset.requiredOnStart, false, 'background music must be lazy-loaded');
    assert.equal(asset.assetKind, 'background-music');
    assert.equal(asset.sourceRepository, 'nba9001-sys/ro-idle');
    assert.equal(asset.sourcePath, entry[1].sourcePath);
    assert.ok(asset.path.includes('/' + pinned + '/'));
    assert.equal(asset.bytes, entry[1].bytes);
    assert.equal(asset.gitSha, entry[1].gitSha);
  });
}

function testSoundEffectWiring() {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  assert.match(appSource, /function playSoundEffect\(type\)/);
  assert.match(appSource, /ro-h5-sound-effects-v1/);
  assert.match(appSource, /MUSIC_ENABLED_KEY/);
  assert.match(appSource, /SKILL_SOUND_BY_NAME\[result\.skillName\]/);
  assert.match(appSource, /playSoundEffect\('skill_heal'\)/);
  assert.match(appSource, /playSoundEffect\('levelup'\)/);
  assert.match(appSource, /ensureAssets\(\[asset\], false\)/);
  assert.match(appSource, /playMapMusic\(map\)/);
  assert.match(appSource, /showSceneEffect\(effectLabel, effectKind/);
  assert.match(html, /id="btn-sound"/);
  assert.match(html, /id="btn-music"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(css, /skill-fx-magic/);
  assert.match(css, /skill-hit-poison/);
  assert.match(appSource, /function showMonsterDefeatEffect\(monsterName\)/);
  assert.match(appSource, /function showPlayerHitEffect\(damage, playerDown\)/);
  assert.match(appSource, /function playHeroSkillAnimation\(kind\)/);
  assert.match(appSource, /if \(result\.killed\) \{\s*showMonsterDefeatEffect\(result\.monsterName\);\s*const nextMonster = window\.ROCore\.getMonster\(character\.battle\.currentMonsterId\);\s*if \(nextMonster\) playMonsterActionAnimation\(nextMonster, 'walk'\);\s*\}/);
  assert.match(html, /id="monster-defeat-effect"/);
  assert.match(html, /id="player-hit-effect"/);
  assert.match(css, /monsterIdleBreathe/);
  assert.match(css, /monsterDefeatBurst/);
  assert.match(css, /playerHitFloat/);
  assert.match(css, /heroCastMagic/);
  assert.match(css, /prefers-reduced-motion:reduce/);
}
function testSkillTreeProgression() {
  const expectedJobs = ['novice', 'swordsman', 'mage', 'archer', 'acolyte', 'merchant', 'thief'];
  assert.deepEqual(Object.keys(core.SKILL_TREES).sort(), expectedJobs.slice().sort());
  expectedJobs.forEach(function (jobId) {
    const tree = core.getSkillTree(jobId);
    assert.ok(tree && tree.skills.length >= 2, 'missing skill tree for ' + jobId);
    const ids = tree.skills.map(function (skill) { return skill.id; });
    assert.equal(new Set(ids).size, ids.length, 'duplicate skill id in ' + jobId);
    tree.skills.forEach(function (skill) {
      assert.ok(skill.maxLevel > 0);
      assert.ok(skill.requiredJobLevel >= 1);
      if (skill.prerequisite) assert.ok(ids.includes(skill.prerequisite), 'prerequisite must be in same job tree');
    });
  });

  const novice = core.makeCharacter('SkillNovice', 'male', 'novice');
  assert.equal(novice.skillPoints, 0);
  assert.equal(core.allocateSkill(novice, 'basic_training').ok, false);
  novice.skillPoints = 5;
  assert.equal(core.allocateSkill(novice, 'basic_training').level, 1);
  assert.equal(core.allocateSkill(novice, 'basic_training').level, 2);
  assert.equal(core.allocateSkill(novice, 'basic_training').level, 3);
  novice.jobLevel = 5;
  const firstAid = core.allocateSkill(novice, 'first_aid');
  assert.equal(firstAid.ok, true);
  assert.equal(novice.skillPoints, 1);
  assert.equal(core.allocateSkill(novice, 'sword_mastery').ok, false, 'a skill from a different job is rejected');

  const swordsman = makePromotedFighter('swordsman');
  swordsman.skillPoints = 8;
  assert.equal(core.allocateSkill(swordsman, 'bash').ok, false, 'job level requirement must be enforced');
  swordsman.jobLevel = 5;
  assert.equal(core.allocateSkill(swordsman, 'bash').ok, false, 'prerequisite rank must be enforced');
  core.allocateSkill(swordsman, 'sword_mastery');
  core.allocateSkill(swordsman, 'sword_mastery');
  core.allocateSkill(swordsman, 'sword_mastery');
  assert.equal(core.getSkillLevel(swordsman, 'sword_mastery'), 3);
  assert.equal(core.allocateSkill(swordsman, 'bash').ok, true);
  assert.equal(core.getSkillLevel(swordsman, 'bash'), 1);
}

function testSkillCombatEffects() {
  const baseline = makePromotedFighter('swordsman');
  const boosted = makePromotedFighter('swordsman');
  boosted.jobLevel = 5;
  boosted.skillPoints = 8;
  for (let i = 0; i < 3; i += 1) core.allocateSkill(boosted, 'sword_mastery');
  core.allocateSkill(boosted, 'bash');
  core.allocateSkill(boosted, 'bash');
  baseline.battle.monsterHp = baseline.battle.monsterMaxHp = 1000;
  boosted.battle.monsterHp = boosted.battle.monsterMaxHp = 1000;
  const account = core.emptyAccount();
  const plainHit = core.stepCombat(baseline, core.emptyAccount(), function () { return 0.99; });
  const skillHit = core.stepCombat(boosted, account, function () { return 0.99; });
  assert.equal(skillHit.skillName, '狂擊');
  assert.ok(skillHit.playerDamage > plainHit.playerDamage, 'Bash should increase damage');
  assert.equal(boosted.sp, 15, 'Bash rank 2 should consume 5 SP');
  assert.equal(boosted.battle.skillCooldown, 5);

  const healer = makePromotedFighter('acolyte');
  healer.jobLevel = 5;
  healer.skillPoints = 8;
  for (let i = 0; i < 3; i += 1) core.allocateSkill(healer, 'divine_protection');
  core.allocateSkill(healer, 'heal');
  healer.hp = 20;
  healer.battle.monsterHp = healer.battle.monsterMaxHp = 1000;
  const healResult = core.stepCombat(healer, core.emptyAccount(), function () { return 0.99; });
  assert.equal(healResult.skillName, '治癒術');
  assert.equal(healResult.skillHealingGained, 9);
  assert.equal(healer.hp, 29);
  assert.equal(healer.sp, 15);

  const merchant = makePromotedFighter('merchant');
  merchant.jobLevel = 5;
  merchant.skillPoints = 8;
  for (let i = 0; i < 3; i += 1) core.allocateSkill(merchant, 'overcharge');
  core.allocateSkill(merchant, 'mammonite');
  merchant.battle.monsterHp = merchant.battle.monsterMaxHp = 1000;
  const emptyWallet = core.emptyAccount();
  const uncast = core.stepCombat(merchant, emptyWallet, function () { return 0.99; });
  assert.equal(uncast.skillName, '', 'Mammonite must not cast without Zeny');
  assert.equal(merchant.sp, 20);
  emptyWallet.gold = 100;
  const cast = core.stepCombat(merchant, emptyWallet, function () { return 0.99; });
  assert.equal(cast.skillName, '金錢攻擊');
  assert.equal(emptyWallet.gold, 90, 'rank 1 Mammonite should cost 10 Zeny');
  assert.equal(merchant.sp, 18);
}

function testSkillPointsAndLegacySaveCompatibility() {
  const character = makePromotedFighter('swordsman');
  character.jobExp = core.jobExpToNext(character.jobLevel) - core.getMonster('poring').jobExp;
  character.battle.monsterHp = character.battle.monsterMaxHp = 1;
  const result = core.stepCombat(character, core.emptyAccount(), function () { return 0.99; });
  assert.equal(result.killed, true);
  assert.equal(character.jobLevel, 2);
  assert.equal(character.skillPoints, 1, 'each Job level gained should award a skill point');

  const legacy = makePromotedFighter('mage');
  delete legacy.skills;
  delete legacy.skillPoints;
  delete legacy.battle.skillCooldown;
  delete legacy.battle.combatTicks;
  delete legacy.bestiary;
  assert.equal(core.getSkillLevel(legacy, 'fire_bolt'), 0);
  legacy.battle.monsterHp = legacy.battle.monsterMaxHp = 1000;
  core.stepCombat(legacy, core.emptyAccount(), function () { return 0.99; });
  assert.equal(legacy.skillPoints, 0);
  assert.deepEqual(legacy.skills, {});
  assert.deepEqual(legacy.bestiary, {});
  assert.equal(legacy.battle.skillCooldown, 0);
  assert.equal(legacy.battle.combatTicks, 1);
}

function testSkillTreeUiWiring() {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(appSource, /function renderSkillTree\(content\)/);
  assert.match(appSource, /function allocateSkillPoint\(skillId\)/);
  assert.match(appSource, /data-skill-id/);
  assert.match(appSource, /activeDetail === 'skills'/);
  assert.match(appSource, /window\.ROCore\.allocateSkill\(character, skillId\)/);
  assert.match(html, /data-detail="skills">技能樹/);
  assert.match(html, /MVP 3\.2/);
}


function testCraftingMaterialsAndTransactions() {
  const catalog = core.getConsumableCatalog();
  assert.equal(catalog.consumables.length, 3);
  assert.equal(catalog.recipes.length, 3);
  const account = core.emptyAccount();
  account.warehouse = { '胡蘿蔔': 4, '空瓶': 2, '果凍質塊': 4, '昆蟲外殼': 2, '蜂蜜': 2, '蘑菇孢子': 4, '既有獸毛': 7 };
  const crafted = core.craftConsumable(account, 'carrot_tonic', 2);
  assert.equal(crafted.ok, true);
  assert.equal(crafted.quantity, 2);
  assert.equal(account.warehouse['胡蘿蔔'], undefined);
  assert.equal(account.warehouse['空瓶'], undefined);
  assert.equal(account.warehouse['胡蘿蔔補給'], 2);
  assert.equal(account.warehouse['既有獸毛'], 7, 'unrelated warehouse items are preserved');
  const beforeShortage = JSON.stringify(account);
  assert.equal(core.craftConsumable(account, 'honey_potion', 2).ok, false);
  assert.equal(JSON.stringify(account), beforeShortage, 'failed crafting must not partially consume materials');
  assert.equal(core.craftConsumable(account, 'unknown_recipe', 1).ok, false);
  assert.equal(core.craftConsumable(account, 'honey_potion', 100).ok, false);
}

function testConsumableUseAndUiWiring() {
  const character = core.makeCharacter('PotionTester', 'male', 'novice');
  character.maxHp = 100; character.hp = 10;
  const account = core.emptyAccount();
  account.warehouse['胡蘿蔔補給'] = 1; account.warehouse['蜂蜜藥水'] = 1;
  const small = core.useConsumable(character, account, 'carrot_tonic');
  assert.equal(small.ok, true); assert.equal(small.healed, 18); assert.equal(character.hp, 28);
  assert.equal(account.warehouse['胡蘿蔔補給'], undefined);
  character.hp = 80;
  const strong = core.useConsumable(character, account, 'honey_potion');
  assert.equal(strong.ok, true); assert.equal(strong.healed, 20); assert.equal(character.hp, 100);
  const beforeFullHp = JSON.stringify(account);
  assert.equal(core.useConsumable(character, account, 'honey_potion').ok, false, 'full HP must not waste an item');
  assert.equal(JSON.stringify(account), beforeFullHp);
  assert.equal(core.useConsumable(character, account, 'missing_item').ok, false);
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.match(appSource, /function renderCraftingRecipes\(content\)/);
  assert.match(appSource, /data-craft-recipe/);
  assert.match(appSource, /data-use-consumable/);
  assert.ok(appSource.includes('window.ROCore.craftConsumable(account, recipeId, 1)'));
  assert.ok(appSource.includes('window.ROCore.useConsumable(character, account, itemId)'));
  assert.match(html, /MVP 3\.2/);
  assert.match(sw, /ro-h5-shell-v41/);
}


function testOfflineSettlementCanDismiss() {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const querySelectorOne = String.fromCharCode(36) + "('.detail-tab').forEach(";
  const querySelectorAll = String.fromCharCode(36, 36) + "('.detail-tab').forEach(";
  assert.ok(appSource.includes(querySelectorAll), 'event binding must use a NodeList so bootstrap does not stop early');
  assert.equal(appSource.split('\n').some(function (line) { return line.trim().startsWith(querySelectorOne); }), false, 'querySelector result must not be treated as a collection');
  assert.match(appSource, /\$\('#btn-offline-close'\)\.addEventListener\('click', closeOfflineReport\);/);
  assert.match(appSource, /const pendingReport = character\.pendingReport;[\s\S]*if \(!persistCurrent\(\)\) \{[\s\S]*character\.pendingReport = pendingReport;/);
  assert.match(html, /<form method="dialog"><button id="btn-offline-close" type="submit"/);
  assert.match(html, /MVP 3\.2/);
  assert.match(sw, /ro-h5-shell-v41/);
}


function testPortableSaveFormatSafety() {
  const account = core.emptyAccount();
  const character = core.makeCharacter('BackupHero', 'female', 'novice');
  character.baseLevel = 4;
  character.baseExp = 18;
  character.battle.map = 'training';
  account.slots[0] = character;
  account.gold = 4321;
  account.warehouse = { '果凍質塊': 12, '綠色藥草': 3 };

  const envelope = core.createPortableSave(account, '3.1');
  assert.equal(envelope.format, 'ro-h5-save');
  assert.equal(envelope.formatVersion, 1);
  assert.equal(envelope.gameVersion, '3.1');
  assert.ok(Number.isFinite(Date.parse(envelope.exportedAt)));
  assert.notEqual(envelope.account, account, 'export must create a detached snapshot');
  assert.equal(envelope.account.gold, 4321);
  assert.equal(envelope.account.slots[0].baseLevel, 4);

  const prepared = core.preparePortableSave(envelope);
  assert.equal(prepared.ok, true);
  assert.equal(prepared.legacyFormat, false);
  assert.equal(prepared.account.slots[0].id, character.id);
  assert.equal(prepared.account.warehouse['果凍質塊'], 12);

  const legacyAccount = {
    slots: [character, null, null],
    gold: 27,
    speed: 3
  };
  const legacy = core.preparePortableSave(legacyAccount);
  assert.equal(legacy.ok, true, 'compatible legacy account JSON should import');
  assert.equal(legacy.legacyFormat, true);
  assert.equal(legacy.migrated, true);
  assert.equal(legacy.account.version, 1);
  assert.deepEqual(legacy.account.warehouse, {});
  assert.deepEqual(legacy.account.equipmentInventory, []);
  assert.equal(legacy.account.gold, 27);
  assert.equal(legacy.account.speed, 3);
  assert.equal(legacy.account.slots[0].baseLevel, 4);

  const newerEnvelope = Object.assign({}, envelope, { formatVersion: core.PORTABLE_SAVE_VERSION + 1 });
  const newerFile = core.preparePortableSave(newerEnvelope);
  assert.equal(newerFile.ok, false);
  assert.match(newerFile.reason, /較新版/);
  const newerAccount = Object.assign({}, envelope.account, { version: 2 });
  const newerAccountFile = core.preparePortableSave(newerAccount);
  assert.equal(newerAccountFile.ok, false);
  assert.match(newerAccountFile.reason, /版本比目前遊戲新/);

  assert.equal(core.preparePortableSave({ version: 1, slots: [null, null] }).ok, false, 'incomplete slot arrays must be rejected');
  assert.equal(core.preparePortableSave({ version: 1, slots: [null, null, null], gold: -1 }).ok, false, 'negative shared currency must be rejected');
  assert.equal(core.preparePortableSave({ version: 1, slots: [null, null, null], warehouse: { bad: -3 } }).ok, false, 'invalid warehouse quantities must be rejected');
  assert.equal(core.preparePortableSave({ version: 1, slots: [{ id: 'bad', name: 'Broken', baseLevel: 0, jobLevel: 1 }, null, null] }).ok, false, 'invalid character levels must be rejected');
  assert.equal(core.preparePortableSave({ format: 'other-game-save', formatVersion: 1, account: account }).ok, false, 'foreign save formats must be rejected');
}

function makeFakeStorage(initialValue, options) {
  const values = new Map();
  if (initialValue !== null) values.set('ro-h5-account-v1', initialValue);
  const config = options || {};
  let setCount = 0;
  let readCount = 0;
  return {
    values: values,
    getItem: function (key) {
      readCount += 1;
      if (config.throwOnRead && readCount === config.throwOnRead) throw new Error('simulated read failure');
      if (typeof config.mutateBeforeRead === 'function') config.mutateBeforeRead(values, readCount);
      return values.has(key) ? values.get(key) : null;
    },
    setItem: function (key, value) {
      setCount += 1;
      if (config.throwOnWrite && setCount === config.throwOnWrite) {
        if (config.writeThenThrow) values.set(key, String(value));
        throw new Error('simulated write failure');
      }
      values.set(key, String(value));
      if (typeof config.afterWrite === 'function') config.afterWrite(values, setCount, String(value));
    },
    removeItem: function (key) {
      if (config.throwOnRemove) throw new Error('simulated remove failure');
      values.delete(key);
    },
    counts: function () { return { set: setCount, get: readCount }; }
  };
}

function testStoredAccountReplaceTransactionSafety() {
  const previousAccount = core.emptyAccount();
  previousAccount.gold = 135;
  previousAccount.warehouse = { '果凍質塊': 2 };
  previousAccount.slots[0] = core.makeCharacter('PreviousHero', 'male', 'novice');
  const previousRaw = JSON.stringify(previousAccount);
  const incomingAccount = core.emptyAccount();
  incomingAccount.gold = 97531;
  incomingAccount.warehouse = { '綠色藥草': 28 };
  incomingAccount.slots[0] = core.makeCharacter('IncomingHero', 'female', 'novice');

  const storage = makeFakeStorage(previousRaw);
  const success = core.replaceStoredAccount(storage, 'ro-h5-account-v1', incomingAccount);
  assert.equal(success.ok, true);
  assert.equal(success.previousRaw, previousRaw);
  assert.equal(storage.getItem('ro-h5-account-v1'), success.serialized);
  const saved = JSON.parse(storage.getItem('ro-h5-account-v1'));
  assert.equal(saved.gold, 97531);
  assert.equal(saved.warehouse['綠色藥草'], 28);
  assert.equal(saved.slots[0].name, 'IncomingHero');

  const failBeforeWrite = makeFakeStorage(previousRaw, { throwOnWrite: 1 });
  const failedWrite = core.replaceStoredAccount(failBeforeWrite, 'ro-h5-account-v1', incomingAccount);
  assert.equal(failedWrite.ok, false);
  assert.equal(failedWrite.restored, true);
  assert.equal(failedWrite.concurrentChange, false);
  assert.equal(failBeforeWrite.getItem('ro-h5-account-v1'), previousRaw);

  const writeThenThrow = makeFakeStorage(previousRaw, { throwOnWrite: 1, writeThenThrow: true });
  const rolledBack = core.replaceStoredAccount(writeThenThrow, 'ro-h5-account-v1', incomingAccount);
  assert.equal(rolledBack.ok, false);
  assert.equal(rolledBack.restored, true);
  assert.equal(writeThenThrow.getItem('ro-h5-account-v1'), previousRaw, 'a partial write must restore the original serialized save');

  const concurrentRaw = JSON.stringify(Object.assign({}, previousAccount, { gold: 55555 }));
  const concurrentStorage = makeFakeStorage(previousRaw, {
    afterWrite: function (values, setCount) {
      if (setCount === 1) values.set('ro-h5-account-v1', concurrentRaw);
    }
  });
  const concurrent = core.replaceStoredAccount(concurrentStorage, 'ro-h5-account-v1', incomingAccount);
  assert.equal(concurrent.ok, false);
  assert.equal(concurrent.restored, false);
  assert.equal(concurrent.concurrentChange, true);
  assert.equal(concurrentStorage.getItem('ro-h5-account-v1'), concurrentRaw, 'rollback must never overwrite a concurrent newer value');

  const invalid = core.replaceStoredAccount(storage, 'ro-h5-account-v1', { version: 1, slots: [null] });
  assert.equal(invalid.ok, false);
  assert.equal(storage.getItem('ro-h5-account-v1'), success.serialized, 'invalid imports must not write storage');
}

function testWriteStoredAccountRollingBackup() {
  const previousAccount = core.emptyAccount();
  previousAccount.gold = 2100;
  previousAccount.slots[0] = core.makeCharacter('SavedHero', 'male', 'novice');
  const previousRaw = JSON.stringify(previousAccount);
  const newAccount = core.emptyAccount();
  newAccount.gold = 3700;
  newAccount.slots[0] = core.makeCharacter('NewHero', 'female', 'novice');
  const nextText = JSON.stringify(newAccount);

  const storage = makeFakeStorage(previousRaw);
  const saved = core.writeStoredAccountWithBackup(storage, 'ro-h5-account-v1', 'ro-h5-account-backup-v1', newAccount, previousRaw);
  assert.equal(saved.ok, true);
  assert.equal(saved.backupWritten, true);
  assert.equal(storage.getItem('ro-h5-account-backup-v1'), previousRaw, 'backup must be the exact prior serialized save');
  assert.equal(storage.getItem('ro-h5-account-v1'), saved.serialized);
  assert.equal(saved.serialized, nextText);

  const backupFailure = makeFakeStorage(previousRaw, { throwOnWrite: 1 });
  const notWritten = core.writeStoredAccountWithBackup(backupFailure, 'ro-h5-account-v1', 'ro-h5-account-backup-v1', newAccount, previousRaw);
  assert.equal(notWritten.ok, false);
  assert.equal(notWritten.restored, true);
  assert.equal(backupFailure.getItem('ro-h5-account-v1'), previousRaw, 'if writing the backup fails, primary save must remain untouched');

  const partialPrimaryFailure = makeFakeStorage(previousRaw, { throwOnWrite: 2, writeThenThrow: true });
  const rolledBack = core.writeStoredAccountWithBackup(partialPrimaryFailure, 'ro-h5-account-v1', 'ro-h5-account-backup-v1', newAccount, previousRaw);
  assert.equal(rolledBack.ok, false);
  assert.equal(rolledBack.restored, true);
  assert.equal(partialPrimaryFailure.getItem('ro-h5-account-v1'), previousRaw, 'if the primary write partially fails, restore its original bytes');

  const concurrentRaw = JSON.stringify(Object.assign({}, previousAccount, { gold: 8900 }));
  const concurrentStorage = makeFakeStorage(previousRaw, {
    afterWrite: function (values, count) {
      if (count === 1) values.set('ro-h5-account-v1', concurrentRaw);
    }
  });
  const conflict = core.writeStoredAccountWithBackup(concurrentStorage, 'ro-h5-account-v1', 'ro-h5-account-backup-v1', newAccount, previousRaw);
  assert.equal(conflict.ok, false);
  assert.equal(conflict.concurrentChange, true);
  assert.equal(concurrentStorage.getItem('ro-h5-account-v1'), concurrentRaw, 'concurrent newer save must not be overwritten after backup write');

  const staleBaseline = makeFakeStorage(concurrentRaw);
  const stale = core.writeStoredAccountWithBackup(staleBaseline, 'ro-h5-account-v1', 'ro-h5-account-backup-v1', newAccount, previousRaw);
  assert.equal(stale.ok, false);
  assert.equal(stale.concurrentChange, true);
  assert.equal(staleBaseline.getItem('ro-h5-account-v1'), concurrentRaw);

  const invalidRaw = JSON.stringify({ version: 1, slots: [null, null, null], gold: -1 });
  const invalidPrimary = makeFakeStorage(invalidRaw);
  const rejectedOverwrite = core.writeStoredAccountWithBackup(invalidPrimary, 'ro-h5-account-v1', 'ro-h5-account-backup-v1', newAccount, invalidRaw);
  assert.equal(rejectedOverwrite.ok, false);
  assert.equal(rejectedOverwrite.restored, true);
  assert.equal(invalidPrimary.getItem('ro-h5-account-v1'), invalidRaw, 'do not overwrite an existing save that fails deep validation');
  assert.equal(invalidPrimary.getItem('ro-h5-account-backup-v1'), null);
}

function testRollingBackupAndRecoveryUi() {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const coreSource = fs.readFileSync(path.join(__dirname, '..', 'core.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.match(appSource, /const SAVE_BACKUP_KEY = 'ro-h5-account-backup-v1'/);
  assert.match(appSource, /function isVerifiedLocalSaveRaw\(raw\)/);
  assert.match(appSource, /ROCore\.writeStoredAccountWithBackup\(/);
  assert.match(appSource, /function restorePreviousSaveBackup\(\)/);
  assert.match(appSource, /function updateSaveRecoveryButtons\(\)/);
  assert.match(appSource, /const latestRaw = localStorage\.getItem\(SAVE_KEY\)/);
  assert.match(coreSource, /function writeStoredAccountWithBackup\(/);
  assert.match(coreSource, /latestRaw !== previousRaw/);
  assert.match(html, /id="btn-restore-save-backup"[^>]*disabled/);
  assert.match(html, /id="btn-error-restore-save-backup"[^>]*disabled/);
  assert.match(html, /MVP 3\.2/);
  assert.match(sw, /ro-h5-shell-v41/);
  assert.doesNotMatch(appSource, /ro-h5-active-tab-v1|enterSlotsWithLock|screen-lock|screen-lost/);
}

function testCrossTabSaveConflictProtection() {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const coreSource = fs.readFileSync(path.join(__dirname, '..', 'core.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const style = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.match(appSource, /let lastPersistedRaw;/);
  assert.match(appSource, /function markSaveConflict\(currentRaw\)/);
  assert.match(appSource, /window\.addEventListener\('storage', handleExternalSaveChange\)/);
  assert.match(coreSource, /expectedRaw !== undefined && previousRaw !== expectedRaw/);
  assert.match(appSource, /if \(saveConflictDetected\) \{/);
  assert.match(appSource, /function exportConflictRecovery\(\)/);
  assert.match(appSource, /function reloadLatestSave\(\)/);
  assert.match(appSource, /function replaceStoredAccount|ROCore\.replaceStoredAccount\(localStorage, SAVE_KEY, pendingImportAccount\)/);
  assert.match(coreSource, /currentRaw !== nextText/);
  assert.match(appSource, /存檔衝突時請先下載恢復備份/);
  assert.match(html, /id="save-conflict-banner"[^>]*class="save-conflict-banner hidden"/);
  assert.match(html, /id="btn-save-conflict-export"/);
  assert.match(html, /id="btn-save-conflict-reload"/);
  assert.match(html, /MVP 3\.2/);
  assert.match(style, /\.save-conflict-banner/);
  assert.match(sw, /ro-h5-shell-v41/);
  assert.doesNotMatch(appSource, /ro-h5-active-tab-v1|enterSlotsWithLock|screen-lock|screen-lost/);
}

function testPortableSaveUiWiring() {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const coreSource = fs.readFileSync(path.join(__dirname, '..', 'core.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.match(html, /id="btn-export-save"/);
  assert.match(html, /id="btn-import-save"/);
  assert.match(html, /id="input-import-save"[^>]*accept="\.rosave,\.json,application\/json"/);
  assert.match(html, /id="import-save-dialog"/);
  assert.match(html, /id="import-save-ack"/);
  assert.match(html, /id="btn-import-save-continue"/);
  assert.match(html, /MVP 3\.2/);
  assert.match(sw, /ro-h5-shell-v41/);
  assert.match(appSource, /function exportSaveFile\(\)/);
  assert.match(appSource, /function handleSaveFileSelection\(event\)/);
  assert.match(appSource, /function continueImportSave\(\)/);
  assert.match(appSource, /function commitPendingImport\(\)/);
  assert.match(appSource, /pendingImportStage === 1/);
  assert.match(appSource, /pendingImportStage !== 2/);
  assert.match(coreSource, /回讀比對失敗/);
  const selectionHandler = appSource.split('async function handleSaveFileSelection(event)')[1].split('function cancelImportSave()')[0];
  assert.doesNotMatch(selectionHandler, /localStorage\.setItem/, 'choosing/parsing a file must not write over the local save');
  assert.match(coreSource, /storage\.setItem\(saveKey, nextText\)/, 'account writes must pass through the tested storage transaction helper');
}


testOfflineSettlementCanDismiss();
testPortableSaveFormatSafety();
testStoredAccountReplaceTransactionSafety();
testWriteStoredAccountRollingBackup();
testRollingBackupAndRecoveryUi();
testCrossTabSaveConflictProtection();
testPortableSaveUiWiring();

testMonsterArtworkIdentityMapping();
testAutomaticUpdateStrategy();
testAssetManifestCoverage();
testMonsterIdleAnimationAssets();
testMonsterActSprExportReproducibility();
testGreenPlantMob1080ActSprIdentity();
testPoringIdleAndAttackAnimations();
testLunaticWolfAttackAnimations();
testPoringHurtAnimation();
testMonsterWalkEntryAnimations();
testSpriteFramesUsePinnedSourceAndHaveNoMissingReferences();
testCriticalEffectManifest();
testSoundEffectManifest();
testSoundEffectWiring();
testSkillTreeProgression();
testSkillCombatEffects();
testSkillPointsAndLegacySaveCompatibility();
testSkillTreeUiWiring();
testExpandedWorldContent();
testFirstJobPromotion();
testFirstJobCombatPassives();
testStatPointAllocation();
testNameRules();
testOfflineTimeCap();
testBattleAndRewards();
testPause();
testMapAndMonsterProgression();
testMonsterEncounterMapHints();
testGreenPlantDoesNotRetaliate();
testVerifiedBestiaryArtworkEvidence();
testBestiaryRestoresOnlyVerifiedCachedArtwork();
testMonsterBestiaryProgression();
testBestiaryUiWiring();
testEquipmentCardMechanics();
testEquipmentCombatAndLegacyCompatibility();
testEquipmentDropAndSaveCompatibility();
testEquipmentUiWiring();
testEquipmentRefinementProgression();
testEquipmentRefinementCombatAndUi();
testCardExtractionTransactions();
testEquipmentSaleTransactions();
testExpandedEquipmentCatalogAndDrops();
testEquipmentDodgeAndZenyBonuses();
testCraftingMaterialsAndTransactions();
testConsumableUseAndUiWiring();

console.log('RO H5 core tests passed (52 suites).');