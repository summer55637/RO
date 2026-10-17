'use strict';

const assert = require('node:assert/strict');
const world = require('../world-data.js');
const core = require('../core.js');

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

function testAssetManifestCoverage() {
  assert.equal(world.assets.filter(function (asset) { return asset.requiredOnStart; }).length, 4);
  assert.equal(world.assets.filter(function (asset) { return !asset.requiredOnStart; }).length, 2);
  const assetIds = new Set(world.assets.map(function (asset) { return asset.id; }));
  world.maps.forEach(function (map) {
    assert.ok(assetIds.has(map.backgroundAssetId), 'missing map background asset: ' + map.id);
    map.monsters.forEach(function (entry) {
      const monster = world.monsters[entry.id];
      assert.ok(monster, 'missing monster data: ' + entry.id);
      assert.ok(assetIds.has(monster.assetId), 'missing monster image asset: ' + entry.id);
    });
  });
}

testAssetManifestCoverage();
testStatPointAllocation();
testNameRules();
testOfflineTimeCap();
testBattleAndRewards();
testPause();
testMapAndMonsterProgression();

console.log('RO H5 core tests passed (7 suites).');