(function (root, factory) {
  const api = factory();
  if (root) root.ROCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_OFFLINE_SECONDS = 24 * 60 * 60;
  const SLOT_COUNT = 3;
  const JOB_LEVEL_CAP = 10;

  function emptyAccount() {
    return { version: 1, updatedAt: Date.now(), slots: [null, null, null], gold: 0, warehouse: {}, speed: 1 };
  }

  function normalizeNameKey(value) {
    return String(value == null ? '' : value).normalize('NFKC').trim().toLocaleLowerCase('en-US');
  }

  function validateCharacterName(input, existingNames) {
    const value = String(input == null ? '' : input).normalize('NFKC').trim();
    const length = Array.from(value).length;
    if (!value) return { ok: false, value: value, reason: '請輸入角色名稱。' };
    if (length < 1 || length > 24) return { ok: false, value: value, reason: '名稱長度必須為 1–24 個字元。' };
    if (!/^[\p{Script=Han}A-Za-z0-9_-]+$/u.test(value)) {
      return { ok: false, value: value, reason: '只允許中文、英文、數字、底線及連字號。' };
    }
    const key = normalizeNameKey(value);
    const duplicates = Array.isArray(existingNames) ? existingNames : [];
    for (const candidate of duplicates) {
      if (candidate == null || candidate === '') continue;
      if (normalizeNameKey(candidate) === key) {
        return { ok: false, value: value, reason: '此名稱已被其他角色使用。' };
      }
    }
    return { ok: true, value: value, key: key, reason: '' };
  }

  function makeCharacter(name, gender, look) {
    const now = Date.now();
    return {
      id: 'char-' + now.toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      name: name,
      gender: gender === 'female' ? 'female' : 'male',
      look: look || 'novice',
      jobId: 'novice',
      jobName: '初心者',
      baseLevel: 1,
      jobLevel: 1,
      baseExp: 0,
      jobExp: 0,
      statPoints: 0,
      stats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 },
      hp: 45,
      maxHp: 45,
      sp: 20,
      maxSp: 20,
      battle: { map: null, paused: true, monsterHp: 18, monsterMaxHp: 18, monsterAttackClock: 0, kills: 0 },
      personalItems: {},
      logs: [],
      jobNotice: false,
      pendingReport: null,
      lastSavedAt: now
    };
  }

  function baseExpToNext(level) {
    return 15 + Math.max(0, level - 1) * 10;
  }

  function jobExpToNext(level) {
    return 10 + level * 4;
  }

  function resolveOfflineSeconds(lastSavedAt, now) {
    const last = Number(lastSavedAt);
    const current = Number(now == null ? Date.now() : now);
    if (!Number.isFinite(last) || last <= 0 || !Number.isFinite(current)) return 0;
    return Math.min(MAX_OFFLINE_SECONDS, Math.max(0, Math.floor((current - last) / 1000)));
  }

  function ensureCombatShape(character) {
    if (!character.battle) character.battle = {};
    if (!Number.isFinite(character.battle.monsterMaxHp) || character.battle.monsterMaxHp < 1) character.battle.monsterMaxHp = 18;
    if (!Number.isFinite(character.battle.monsterHp)) character.battle.monsterHp = character.battle.monsterMaxHp;
    if (!Number.isFinite(character.battle.monsterAttackClock)) character.battle.monsterAttackClock = 0;
    if (!Number.isFinite(character.battle.kills)) character.battle.kills = 0;
    if (!character.stats) character.stats = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 };
    if (!character.personalItems) character.personalItems = {};
  }

  function addWarehouseItem(account, itemName, quantity) {
    if (!account.warehouse || typeof account.warehouse !== 'object') account.warehouse = {};
    account.warehouse[itemName] = Math.max(0, Number(account.warehouse[itemName]) || 0) + quantity;
  }

  function stepCombat(character, account, rng) {
    const random = typeof rng === 'function' ? rng : Math.random;
    const result = { playerDamage: 0, monsterDamage: 0, killed: false, expGained: 0, jobExpGained: 0, goldGained: 0, drops: [], levelUps: [], jobCapped: false, playerDown: false };
    if (!character || !character.battle || !character.battle.map || character.battle.paused) return result;
    ensureCombatShape(character);
    const damage = Math.max(1, 4 + character.baseLevel + (character.stats.str || 0) - Math.floor(random() * 3));
    character.battle.monsterHp = Math.max(0, character.battle.monsterHp - damage);
    result.playerDamage = damage;

    if (character.battle.monsterHp <= 0) {
      result.killed = true;
      character.battle.kills += 1;
      character.battle.monsterHp = character.battle.monsterMaxHp;
      character.baseExp += 4;
      result.expGained = 4;

      if (character.jobLevel < JOB_LEVEL_CAP) {
        character.jobExp += 2;
        result.jobExpGained = 2;
      }
      const gold = 1 + Math.floor(random() * 5);
      account.gold = Math.max(0, Number(account.gold) || 0) + gold;
      result.goldGained = gold;

      if (random() < 0.35) {
        addWarehouseItem(account, '果凍質塊', 1);
        result.drops.push('果凍質塊');
      }
      if (random() < 0.08) {
        addWarehouseItem(account, '獸毛', 1);
        result.drops.push('獸毛');
      }

      while (character.baseExp >= baseExpToNext(character.baseLevel)) {
        character.baseExp -= baseExpToNext(character.baseLevel);
        character.baseLevel += 1;
        character.statPoints += 3;
        character.maxHp += 8;
        character.hp = Math.min(character.maxHp, character.hp + 8);
        character.maxSp += 2;
        character.sp = Math.min(character.maxSp, character.sp + 2);
        result.levelUps.push(character.baseLevel);
      }

      while (character.jobLevel < JOB_LEVEL_CAP && character.jobExp >= jobExpToNext(character.jobLevel)) {
        character.jobExp -= jobExpToNext(character.jobLevel);
        character.jobLevel += 1;
      }
      if (character.jobLevel >= JOB_LEVEL_CAP) {
        character.jobExp = 0;
        if (!character.jobNotice) result.jobCapped = true;
        character.jobNotice = true;
      }
      return result;
    }

    character.battle.monsterAttackClock += 1;
    if (character.battle.monsterAttackClock >= 2) {
      character.battle.monsterAttackClock = 0;
      const mobDamage = 1 + Math.floor(random() * 3);
      character.hp = Math.max(0, character.hp - mobDamage);
      result.monsterDamage = mobDamage;
      if (character.hp <= 0) {
        character.hp = character.maxHp;
        result.playerDown = true;
      }
    }
    return result;
  }

  function settleOffline(character, account, elapsedSeconds, rng) {
    const seconds = Math.min(MAX_OFFLINE_SECONDS, Math.max(0, Math.floor(Number(elapsedSeconds) || 0)));
    const oldGold = Number(account.gold) || 0;
    const oldWarehouse = Object.assign({}, account.warehouse || {});
    const report = { durationSeconds: seconds, expGained: 0, jobExpGained: 0, goldGained: 0, kills: 0, levelUps: [], drops: {}, jobCapped: false };
    for (let index = 0; index < seconds; index += 1) {
      const step = stepCombat(character, account, rng);
      report.expGained += step.expGained;
      report.jobExpGained += step.jobExpGained;
      if (step.killed) report.kills += 1;
      if (step.levelUps.length) report.levelUps.push.apply(report.levelUps, step.levelUps);
      if (step.jobCapped) report.jobCapped = true;
    }
    report.goldGained = (Number(account.gold) || 0) - oldGold;
    const names = new Set(Object.keys(oldWarehouse).concat(Object.keys(account.warehouse || {})));
    names.forEach(function (name) {
      const gained = (Number(account.warehouse[name]) || 0) - (Number(oldWarehouse[name]) || 0);
      if (gained > 0) report.drops[name] = gained;
    });
    return report;
  }

  return {
    MAX_OFFLINE_SECONDS: MAX_OFFLINE_SECONDS,
    SLOT_COUNT: SLOT_COUNT,
    JOB_LEVEL_CAP: JOB_LEVEL_CAP,
    emptyAccount: emptyAccount,
    normalizeNameKey: normalizeNameKey,
    validateCharacterName: validateCharacterName,
    makeCharacter: makeCharacter,
    baseExpToNext: baseExpToNext,
    jobExpToNext: jobExpToNext,
    resolveOfflineSeconds: resolveOfflineSeconds,
    stepCombat: stepCombat,
    settleOffline: settleOffline
  };
});