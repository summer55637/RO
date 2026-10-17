'use strict';

const assert = require('node:assert/strict');
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

testNameRules();
testOfflineTimeCap();
testBattleAndRewards();
testPause();
console.log('RO H5 core tests passed (4 suites).');