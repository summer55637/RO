(function (root, factory) {
  const api = factory(root && root.ROWorld);
  if (root) root.ROCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (world) {
  'use strict';

  const MAX_OFFLINE_SECONDS = 24 * 60 * 60;
  const SLOT_COUNT = 3;
  const JOB_LEVEL_CAP = 10;
  const FIRST_JOB_LEVEL_CAP = 50;
  const FIRST_JOBS = Object.freeze([
    Object.freeze({ id: 'swordsman', name: '劍士', description: '近身戰鬥取向，適合正面交鋒。', passive: '攻擊傷害 +2（原型）', damageBonus: 2, criticalBonus: 0, dodgeBonus: 0, killHeal: 0, zenyBonus: 0 }),
    Object.freeze({ id: 'mage', name: '魔法師', description: '以強力術法輸出為概念的職業原型。', passive: '攻擊傷害 +3（原型術法效果）', damageBonus: 3, criticalBonus: 0, dodgeBonus: 0, killHeal: 0, zenyBonus: 0 }),
    Object.freeze({ id: 'archer', name: '弓箭手', description: '重視精準與爆擊，偏向穩定輸出。', passive: '攻擊傷害 +1、爆擊率 +4 個百分點（原型）', damageBonus: 1, criticalBonus: 0.04, dodgeBonus: 0, killHeal: 0, zenyBonus: 0 }),
    Object.freeze({ id: 'acolyte', name: '服事', description: '以支援與持續作戰為概念的職業原型。', passive: '擊倒怪物時恢復最多 3 HP（原型）', damageBonus: 0, criticalBonus: 0, dodgeBonus: 0, killHeal: 3, zenyBonus: 0 }),
    Object.freeze({ id: 'merchant', name: '商人', description: '注重 Zeny 收益，適合累積冒險資金。', passive: '獲得 Zeny +15%，四捨五入（原型）', damageBonus: 0, criticalBonus: 0, dodgeBonus: 0, killHeal: 0, zenyBonus: 0.15 }),
    Object.freeze({ id: 'thief', name: '盜賊', description: '偏向靈活攻擊與閃避。', passive: '攻擊傷害 +1、閃避率 +8 個百分點（原型）', damageBonus: 1, criticalBonus: 0, dodgeBonus: 0.08, killHeal: 0, zenyBonus: 0 })
  ]);

  // Prototype skill trees use familiar first-job RO skill names; ranks/effects are simplified game-balance values.
  const SKILL_TREES = Object.freeze({
    novice: Object.freeze({ name: '初心者', skills: Object.freeze([
      Object.freeze({ id: 'basic_training', name: '基本訓練', maxLevel: 9, requiredJobLevel: 1, type: 'passive', description: '每兩級提高 1 點普攻傷害。', effect: Object.freeze({ damagePerLevel: 0.5 }) }),
      Object.freeze({ id: 'first_aid', name: '急救術', maxLevel: 3, requiredJobLevel: 5, prerequisite: 'basic_training', prerequisiteLevel: 3, type: 'passive', description: '擊倒怪物時額外恢復 HP。', effect: Object.freeze({ killHealPerLevel: 1 }) })
    ]) }),
    swordsman: Object.freeze({ name: '劍士', skills: Object.freeze([
      Object.freeze({ id: 'sword_mastery', name: '劍術修練', maxLevel: 5, requiredJobLevel: 1, type: 'passive', description: '提高每次攻擊的基本傷害。', effect: Object.freeze({ damagePerLevel: 1 }) }),
      Object.freeze({ id: 'bash', name: '狂擊', maxLevel: 5, requiredJobLevel: 5, prerequisite: 'sword_mastery', prerequisiteLevel: 3, type: 'active', description: '消耗 SP 強化一次攻擊；自動戰鬥中冷卻後施放。', effect: Object.freeze({ mode: 'damage', damageMultiplierPerLevel: 0.28, spCostBase: 3, spCostPerLevel: 1, cooldown: 6 }) }),
      Object.freeze({ id: 'hp_recovery', name: '快速回復', maxLevel: 5, requiredJobLevel: 10, prerequisite: 'sword_mastery', prerequisiteLevel: 3, type: 'passive', description: '受到怪物攻擊後恢復少量 HP。', effect: Object.freeze({ enemyHitHealPerLevel: 1 }) })
    ]) }),
    mage: Object.freeze({ name: '魔法師', skills: Object.freeze([
      Object.freeze({ id: 'sp_recovery', name: '禪心', maxLevel: 5, requiredJobLevel: 1, type: 'passive', description: '每 5 個戰鬥節拍恢復 SP。', effect: Object.freeze({ spRecoveryPerLevel: 1 }) }),
      Object.freeze({ id: 'fire_bolt', name: '火箭術', maxLevel: 5, requiredJobLevel: 5, prerequisite: 'sp_recovery', prerequisiteLevel: 3, type: 'active', description: '消耗 SP 造成強化魔法傷害。', effect: Object.freeze({ mode: 'damage', damageMultiplierPerLevel: 0.3, spCostBase: 2, spCostPerLevel: 2, cooldown: 6 }) }),
      Object.freeze({ id: 'soul_strike', name: '靈魂打擊', maxLevel: 5, requiredJobLevel: 10, prerequisite: 'fire_bolt', prerequisiteLevel: 3, type: 'active', description: '進階魔法攻擊；學會後優先於火箭術自動施放。', effect: Object.freeze({ mode: 'damage', damageMultiplierPerLevel: 0.4, spCostBase: 4, spCostPerLevel: 2, cooldown: 7 }) })
    ]) }),
    archer: Object.freeze({ name: '弓箭手', skills: Object.freeze([
      Object.freeze({ id: 'owl_eye', name: '鶚梟之眼', maxLevel: 5, requiredJobLevel: 1, type: 'passive', description: '提高暴擊機率。', effect: Object.freeze({ criticalPerLevel: 0.01 }) }),
      Object.freeze({ id: 'double_strafe', name: '二連矢', maxLevel: 5, requiredJobLevel: 5, prerequisite: 'owl_eye', prerequisiteLevel: 3, type: 'active', description: '消耗 SP 發動強力遠距離攻擊。', effect: Object.freeze({ mode: 'damage', damageMultiplierPerLevel: 0.28, spCostBase: 3, spCostPerLevel: 2, cooldown: 6 }) }),
      Object.freeze({ id: 'vulture_eye', name: '蒼鷹之眼', maxLevel: 5, requiredJobLevel: 10, prerequisite: 'owl_eye', prerequisiteLevel: 3, type: 'passive', description: '提高普攻傷害。', effect: Object.freeze({ damagePerLevel: 1 }) })
    ]) }),
    acolyte: Object.freeze({ name: '服事', skills: Object.freeze([
      Object.freeze({ id: 'divine_protection', name: '天使之護', maxLevel: 5, requiredJobLevel: 1, type: 'passive', description: '降低受到的怪物傷害。', effect: Object.freeze({ damageReductionPerLevel: 0.03 }) }),
      Object.freeze({ id: 'heal', name: '治癒術', maxLevel: 5, requiredJobLevel: 5, prerequisite: 'divine_protection', prerequisiteLevel: 3, type: 'active', description: 'HP 偏低時優先自動治療，仍可持續普通攻擊。', effect: Object.freeze({ mode: 'heal', healBase: 5, healPerLevel: 4, spCostBase: 3, spCostPerLevel: 2, cooldown: 5, triggerHpRatio: 0.7 }) }),
      Object.freeze({ id: 'blessing', name: '祝福', maxLevel: 5, requiredJobLevel: 10, prerequisite: 'divine_protection', prerequisiteLevel: 3, type: 'passive', description: '提高普攻傷害（原型簡化效果）。', effect: Object.freeze({ damagePerLevel: 1 }) })
    ]) }),
    merchant: Object.freeze({ name: '商人', skills: Object.freeze([
      Object.freeze({ id: 'overcharge', name: '高價賣出', maxLevel: 5, requiredJobLevel: 1, type: 'passive', description: '提高戰鬥取得的 Zeny。', effect: Object.freeze({ zenyBonusPerLevel: 0.02 }) }),
      Object.freeze({ id: 'mammonite', name: '金錢攻擊', maxLevel: 5, requiredJobLevel: 5, prerequisite: 'overcharge', prerequisiteLevel: 3, type: 'active', description: '花費 Zeny 換取強力攻擊；資金不足時改用普通攻擊。', effect: Object.freeze({ mode: 'damage', damageMultiplierPerLevel: 0.3, spCostBase: 1, spCostPerLevel: 1, zenyCostBase: 5, zenyCostPerLevel: 5, cooldown: 6 }) }),
      Object.freeze({ id: 'discount', name: '低價買進', maxLevel: 5, requiredJobLevel: 10, prerequisite: 'overcharge', prerequisiteLevel: 3, type: 'passive', description: '降低金錢攻擊的 Zeny 成本。', effect: Object.freeze({ skillCostDiscountPerLevel: 0.1 }) })
    ]) }),
    thief: Object.freeze({ name: '盜賊', skills: Object.freeze([
      Object.freeze({ id: 'improve_dodge', name: '殘影', maxLevel: 5, requiredJobLevel: 1, type: 'passive', description: '提高閃避機率。', effect: Object.freeze({ dodgePerLevel: 0.015 }) }),
      Object.freeze({ id: 'envenom', name: '施毒', maxLevel: 5, requiredJobLevel: 5, prerequisite: 'improve_dodge', prerequisiteLevel: 3, type: 'active', description: '消耗 SP 造成強化攻擊。', effect: Object.freeze({ mode: 'damage', damageMultiplierPerLevel: 0.28, spCostBase: 3, spCostPerLevel: 1, cooldown: 6 }) }),
      Object.freeze({ id: 'double_attack', name: '二刀連擊', maxLevel: 5, requiredJobLevel: 10, prerequisite: 'improve_dodge', prerequisiteLevel: 3, type: 'passive', description: '有機率追加一次傷害。', effect: Object.freeze({ doubleAttackChancePerLevel: 0.07 }) })
    ]) })
  });

  const STAT_CAP = 99;
  const STAT_KEYS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
  const WORLD = world || {
    maps: [{ id: 'novice_ground', name: '新手訓練場', unlockLevel: 1, monsters: [{ id: 'poring', weight: 1 }] }],
    monsters: { poring: { id: 'poring', name: '波利', maxHp: 18, attackMin: 1, attackMax: 2, baseExp: 4, jobExp: 2, zenyMin: 1, zenyMax: 5, drops: [] } }
  };

  function getFirstJob(jobId) {
    return FIRST_JOBS.find(function (job) { return job.id === jobId; }) || null;
  }

  function getJobLevelCap(character) {
    return getFirstJob(character && character.jobId) ? FIRST_JOB_LEVEL_CAP : JOB_LEVEL_CAP;
  }

  function changeJob(character, targetJobId) {
    if (!character) return { ok: false, reason: '角色資料尚未載入。' };
    if (character.jobId !== 'novice') return { ok: false, reason: '目前原型只開放初心者的一轉選擇。' };
    const job = getFirstJob(targetJobId);
    if (!job) return { ok: false, reason: '找不到這個一轉職業。' };
    if (Number(character.jobLevel) < JOB_LEVEL_CAP) return { ok: false, reason: '初心者 Job Lv. 10 才能選擇一轉職業。' };

    character.jobId = job.id;
    character.jobName = job.name;
    character.jobLevel = 1;
    character.jobExp = 0;
    character.jobNotice = false;
    character.jobCapReached = false;
    return { ok: true, jobId: job.id, jobName: job.name };
  }


  function getSkillTree(jobId) {
    return SKILL_TREES[jobId] || null;
  }

  function getSkillLevel(character, skillId) {
    const skills = character && character.skills;
    return Math.max(0, Math.floor(Number(skills && skills[skillId]) || 0));
  }

  function skillPrerequisiteMet(character, skill) {
    return !skill.prerequisite || getSkillLevel(character, skill.prerequisite) >= (skill.prerequisiteLevel || 1);
  }

  function allocateSkill(character, skillId) {
    if (!character) return { ok: false, reason: '角色資料尚未載入。' };
    const tree = getSkillTree(character.jobId);
    const skill = tree && tree.skills.find(function (entry) { return entry.id === skillId; });
    if (!skill) return { ok: false, reason: '這個技能不屬於目前職業。' };
    const level = getSkillLevel(character, skill.id);
    if (level >= skill.maxLevel) return { ok: false, reason: '技能已達目前原型上限。' };
    if (Number(character.jobLevel) < skill.requiredJobLevel) return { ok: false, reason: '需要 Job Lv. ' + skill.requiredJobLevel + ' 才能學習。' };
    if (!skillPrerequisiteMet(character, skill)) {
      const prerequisite = tree.skills.find(function (entry) { return entry.id === skill.prerequisite; });
      return { ok: false, reason: '需要先將「' + (prerequisite ? prerequisite.name : skill.prerequisite) + '」提升至 Lv. ' + skill.prerequisiteLevel + '。' };
    }
    const available = Math.max(0, Math.floor(Number(character.skillPoints) || 0));
    if (available < 1) return { ok: false, reason: '技能點不足。Job 等級提升時可獲得技能點。' };
    if (!character.skills || typeof character.skills !== 'object' || Array.isArray(character.skills)) character.skills = {};
    character.skills[skill.id] = level + 1;
    character.skillPoints = available - 1;
    return { ok: true, skillId: skill.id, skillName: skill.name, level: level + 1, remainingPoints: character.skillPoints };
  }

  function getSkillBonuses(character) {
    const bonuses = {
      damageBonus: 0,
      criticalBonus: 0,
      dodgeBonus: 0,
      damageReduction: 0,
      killHeal: 0,
      enemyHitHeal: 0,
      spRecovery: 0,
      zenyBonus: 0,
      skillCostDiscount: 0,
      doubleAttackChance: 0
    };
    const treeIds = ['novice'];
    if (character && character.jobId && character.jobId !== 'novice') treeIds.push(character.jobId);
    treeIds.forEach(function (jobId) {
      const tree = getSkillTree(jobId);
      if (!tree) return;
      tree.skills.forEach(function (skill) {
        if (skill.type !== 'passive') return;
        const level = getSkillLevel(character, skill.id);
        if (!level) return;
        const effect = skill.effect || {};
        bonuses.damageBonus += Math.floor((Number(effect.damagePerLevel) || 0) * level);
        bonuses.criticalBonus += (Number(effect.criticalPerLevel) || 0) * level;
        bonuses.dodgeBonus += (Number(effect.dodgePerLevel) || 0) * level;
        bonuses.damageReduction += (Number(effect.damageReductionPerLevel) || 0) * level;
        bonuses.killHeal += (Number(effect.killHealPerLevel) || 0) * level;
        bonuses.enemyHitHeal += (Number(effect.enemyHitHealPerLevel) || 0) * level;
        bonuses.spRecovery += (Number(effect.spRecoveryPerLevel) || 0) * level;
        bonuses.zenyBonus += (Number(effect.zenyBonusPerLevel) || 0) * level;
        bonuses.skillCostDiscount += (Number(effect.skillCostDiscountPerLevel) || 0) * level;
        bonuses.doubleAttackChance += (Number(effect.doubleAttackChancePerLevel) || 0) * level;
      });
    });
    bonuses.criticalBonus = Math.min(0.5, bonuses.criticalBonus);
    bonuses.dodgeBonus = Math.min(0.3, bonuses.dodgeBonus);
    bonuses.damageReduction = Math.min(0.6, bonuses.damageReduction);
    bonuses.skillCostDiscount = Math.min(0.5, bonuses.skillCostDiscount);
    bonuses.doubleAttackChance = Math.min(0.5, bonuses.doubleAttackChance);
    return bonuses;
  }

  function getLearnedActiveSkill(character) {
    const tree = getSkillTree(character && character.jobId);
    if (!tree) return null;
    const learned = tree.skills.filter(function (skill) {
      return skill.type === 'active' &&
        getSkillLevel(character, skill.id) > 0 &&
        Number(character.jobLevel) >= skill.requiredJobLevel &&
        skillPrerequisiteMet(character, skill);
    });
    learned.sort(function (a, b) { return a.requiredJobLevel - b.requiredJobLevel; });
    return learned.length ? learned[learned.length - 1] : null;
  }

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
      if (normalizeNameKey(candidate) === key) return { ok: false, value: value, reason: '此名稱已被其他角色使用。' };
    }
    return { ok: true, value: value, key: key, reason: '' };
  }

  function getMap(mapId) {
    const id = mapId === 'training' ? 'novice_ground' : mapId;
    return (WORLD.maps || []).find(function (map) { return map.id === id; }) || null;
  }

  function getMonster(monsterId) {
    return (WORLD.monsters && WORLD.monsters[monsterId]) || WORLD.monsters.poring || null;
  }

  function chooseMonster(mapId, rng) {
    const random = typeof rng === 'function' ? rng : Math.random;
    const map = getMap(mapId);
    if (!map || !map.monsters || !map.monsters.length) return getMonster('poring');
    const total = map.monsters.reduce(function (sum, entry) { return sum + Math.max(0, Number(entry.weight) || 0); }, 0);
    if (total <= 0) return getMonster(map.monsters[0].id);
    let target = random() * total;
    for (const entry of map.monsters) {
      target -= Math.max(0, Number(entry.weight) || 0);
      if (target < 0) return getMonster(entry.id);
    }
    return getMonster(map.monsters[map.monsters.length - 1].id);
  }

  function makeCharacter(name, gender, look) {
    const now = Date.now();
    const starterMonster = getMonster('poring') || { maxHp: 18 };
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
      skillPoints: 0,
      skills: {},
      stats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 },
      hp: 45,
      maxHp: 45,
      sp: 20,
      maxSp: 20,
      battle: {
        map: null,
        paused: true,
        currentMonsterId: 'poring',
        monsterHp: starterMonster.maxHp,
        monsterMaxHp: starterMonster.maxHp,
        monsterAttackClock: 0,
        skillCooldown: 0,
        combatTicks: 0,
        kills: 0
      },
      personalItems: {},
      bestiary: {},
      logs: [],
      jobNotice: false,
      jobCapReached: false,
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

  // Prototype baseline from classic RO references; Taiwan PC formulas still require version-specific verification.
  function statPointGainForLevelUp(currentBaseLevel) {
    return Math.floor(Math.max(1, Number(currentBaseLevel) || 1) / 5) + 3;
  }

  // Cost to raise a base stat from its current value by one.
  function statPointCost(currentValue) {
    const value = Math.max(1, Math.floor(Number(currentValue) || 1));
    return Math.floor((value - 1) / 10) + 2;
  }

  function allocateStat(character, key) {
    if (!character || !character.stats) return { ok: false, reason: '角色資料尚未載入。' };
    if (!STAT_KEYS.includes(key)) return { ok: false, reason: '未知的能力值。' };
    const current = Math.max(1, Math.floor(Number(character.stats[key]) || 1));
    if (current >= STAT_CAP) return { ok: false, reason: '此能力值已達目前原型上限 ' + STAT_CAP + '。' };
    const cost = statPointCost(current);
    if ((Number(character.statPoints) || 0) < cost) return { ok: false, reason: '能力點不足，需要 ' + cost + ' 點。' };

    character.statPoints -= cost;
    character.stats[key] = current + 1;
    if (key === 'vit') {
      character.maxHp = Math.max(1, Number(character.maxHp) || 1) + 5;
      character.hp = Math.min(character.maxHp, (Number(character.hp) || 0) + 5);
    } else if (key === 'int') {
      character.maxSp = Math.max(1, Number(character.maxSp) || 1) + 2;
      character.sp = Math.min(character.maxSp, (Number(character.sp) || 0) + 2);
    }

    return { ok: true, key: key, cost: cost, oldValue: current, newValue: current + 1, remainingPoints: character.statPoints };
  }

  function resolveOfflineSeconds(lastSavedAt, now) {
    const last = Number(lastSavedAt);
    const current = Number(now == null ? Date.now() : now);
    if (!Number.isFinite(last) || last <= 0 || !Number.isFinite(current)) return 0;
    return Math.min(MAX_OFFLINE_SECONDS, Math.max(0, Math.floor((current - last) / 1000)));
  }

  function startMap(character, mapId, rng) {
    const map = getMap(mapId);
    if (!character || !map || character.baseLevel < (map.unlockLevel || 1)) return false;
    const monster = chooseMonster(map.id, rng);
    if (!monster) return false;
    if (!character.battle) character.battle = {};
    character.battle.map = map.id;
    character.battle.paused = false;
    character.battle.currentMonsterId = monster.id;
    character.battle.monsterMaxHp = monster.maxHp;
    character.battle.monsterHp = monster.maxHp;
    character.battle.monsterAttackClock = 0;
    if (!Number.isFinite(character.battle.kills)) character.battle.kills = 0;
    return true;
  }

  function ensureCombatShape(character, rng) {
    if (!character.battle) character.battle = {};
    if (character.battle.map === 'training') character.battle.map = 'novice_ground';
    if (!Number.isFinite(character.battle.kills)) character.battle.kills = 0;
    if (!Number.isFinite(character.battle.monsterAttackClock)) character.battle.monsterAttackClock = 0;
    if (!Number.isFinite(character.battle.skillCooldown)) character.battle.skillCooldown = 0;
    if (!Number.isFinite(character.battle.combatTicks)) character.battle.combatTicks = 0;
    if (!Number.isFinite(character.skillPoints)) character.skillPoints = 0;
    if (!character.skills || typeof character.skills !== 'object' || Array.isArray(character.skills)) character.skills = {};
    if (!character.stats) character.stats = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 };
    if (!character.personalItems) character.personalItems = {};
    // Forward-compatible per-character monster discoveries; never touch shared warehouse data.
    if (!character.bestiary || typeof character.bestiary !== 'object' || Array.isArray(character.bestiary)) character.bestiary = {};

    const map = getMap(character.battle.map);
    const pool = map && map.monsters ? map.monsters : [];
    const validCurrent = pool.some(function (entry) { return entry.id === character.battle.currentMonsterId; });
    if (!character.battle.currentMonsterId || !validCurrent) {
      const first = chooseMonster(character.battle.map, rng);
      character.battle.currentMonsterId = first ? first.id : 'poring';
      character.battle.monsterMaxHp = first ? first.maxHp : 18;
      character.battle.monsterHp = character.battle.monsterMaxHp;
    }
    const monster = getMonster(character.battle.currentMonsterId);
    if (!Number.isFinite(character.battle.monsterMaxHp) || character.battle.monsterMaxHp < 1) character.battle.monsterMaxHp = monster.maxHp;
    if (!Number.isFinite(character.battle.monsterHp)) character.battle.monsterHp = character.battle.monsterMaxHp;
  }

  function addWarehouseItem(account, itemName, quantity) {
    if (!account.warehouse || typeof account.warehouse !== 'object') account.warehouse = {};
    account.warehouse[itemName] = Math.max(0, Number(account.warehouse[itemName]) || 0) + quantity;
  }

  function stepCombat(character, account, rng) {
    const random = typeof rng === 'function' ? rng : Math.random;
    const result = { playerDamage: 0, monsterDamage: 0, killed: false, monsterId: '', monsterName: '', critical: false, dodged: false, expGained: 0, jobExpGained: 0, goldGained: 0, healingGained: 0, recoveryGained: 0, skillHealingGained: 0, skillName: '', doubleAttack: false, drops: [], levelUps: [], jobCapped: false, playerDown: false };
    if (!character || !character.battle || !character.battle.map || character.battle.paused) return result;
    ensureCombatShape(character, random);
    const monster = getMonster(character.battle.currentMonsterId);
    if (!monster) return result;
    result.monsterId = monster.id;
    result.monsterName = monster.name;

    const job = getFirstJob(character.jobId);
    const skillBonuses = getSkillBonuses(character);
    character.battle.combatTicks += 1;
    if (character.battle.skillCooldown > 0) character.battle.skillCooldown -= 1;
    if (skillBonuses.spRecovery > 0 && character.battle.combatTicks % 5 === 0) {
      character.sp = Math.min(Math.max(1, Number(character.maxSp) || 1), Math.max(0, Number(character.sp) || 0) + skillBonuses.spRecovery);
    }
    const activeSkill = getLearnedActiveSkill(character);
    const activeSkillLevel = activeSkill ? getSkillLevel(character, activeSkill.id) : 0;
    const activeEffect = activeSkill && activeSkill.effect ? activeSkill.effect : {};
    let activeCast = false;
    const str = Math.max(1, Number(character.stats.str) || 1);
    const dex = Math.max(1, Number(character.stats.dex) || 1);
    const luk = Math.max(1, Number(character.stats.luk) || 1);
    let damage = Math.max(1, 4 + character.baseLevel + str + Math.floor(dex / 10) + (job ? job.damageBonus : 0) + skillBonuses.damageBonus - Math.floor(random() * 3));
    if (activeSkill && character.battle.skillCooldown <= 0) {
      const spCost = Math.max(0, (Number(activeEffect.spCostBase) || 0) + (Number(activeEffect.spCostPerLevel) || 0) * activeSkillLevel);
      const discount = skillBonuses.skillCostDiscount;
      const zenyCost = Math.max(0, Math.ceil(((Number(activeEffect.zenyCostBase) || 0) + (Number(activeEffect.zenyCostPerLevel) || 0) * activeSkillLevel) * (1 - discount)));
      const enoughSp = (Number(character.sp) || 0) >= spCost;
      const enoughZeny = (Number(account.gold) || 0) >= zenyCost;
      const shouldHeal = activeEffect.mode === 'heal' && character.hp < character.maxHp && character.hp / Math.max(1, character.maxHp) <= (Number(activeEffect.triggerHpRatio) || 0.7);
      const canUse = enoughSp && enoughZeny && (activeEffect.mode !== 'heal' || shouldHeal);
      if (canUse && (activeEffect.mode !== 'heal' || shouldHeal)) {
        character.sp = Math.max(0, (Number(character.sp) || 0) - spCost);
        if (zenyCost > 0) account.gold = Math.max(0, (Number(account.gold) || 0) - zenyCost);
        activeCast = true;
        result.skillName = activeSkill.name;
        character.battle.skillCooldown = Math.max(2, (Number(activeEffect.cooldown) || 6) - Math.floor(activeSkillLevel / 2));
        if (activeEffect.mode === 'heal') {
          const oldHp = Math.max(0, Number(character.hp) || 0);
          const heal = (Number(activeEffect.healBase) || 0) + (Number(activeEffect.healPerLevel) || 0) * activeSkillLevel;
          character.hp = Math.min(Math.max(1, Number(character.maxHp) || 1), oldHp + heal);
          result.skillHealingGained = character.hp - oldHp;
        } else if (activeEffect.mode === 'damage') {
          damage = Math.ceil(damage * (1 + (Number(activeEffect.damageMultiplierPerLevel) || 0) * activeSkillLevel));
        }
      }
    }
    const criticalChance = Math.min(0.5, luk * 0.005 + (job ? job.criticalBonus : 0) + skillBonuses.criticalBonus);
    result.critical = random() < criticalChance;
    if (result.critical) damage = Math.ceil(damage * 1.5);
    if (skillBonuses.doubleAttackChance > 0 && random() < skillBonuses.doubleAttackChance) {
      damage += Math.max(1, Math.ceil(damage * 0.75));
      result.doubleAttack = true;
      if (!result.skillName) result.skillName = '二刀連擊';
    }
    character.battle.monsterHp = Math.max(0, character.battle.monsterHp - damage);
    result.playerDamage = damage;

    if (character.battle.monsterHp <= 0) {
      result.killed = true;
      character.battle.kills += 1;
      // Older saves gain this optional field lazily, without resetting any existing progress.
      if (!character.bestiary || typeof character.bestiary !== 'object' || Array.isArray(character.bestiary)) character.bestiary = {};
      character.bestiary[monster.id] = Math.max(0, Math.floor(Number(character.bestiary[monster.id]) || 0)) + 1;
      character.baseExp += monster.baseExp;
      result.expGained = monster.baseExp;
      if (character.jobLevel < getJobLevelCap(character)) {
        character.jobExp += monster.jobExp;
        result.jobExpGained = monster.jobExp;
      }

      const baseGold = monster.zenyMin + Math.floor(random() * (monster.zenyMax - monster.zenyMin + 1));
      const zenyBonus = (job ? job.zenyBonus : 0) + skillBonuses.zenyBonus;
      const gold = zenyBonus ? Math.round(baseGold * (1 + zenyBonus)) : baseGold;
      account.gold = Math.max(0, Number(account.gold) || 0) + gold;
      result.goldGained = gold;

      (monster.drops || []).forEach(function (drop) {
        if (random() < drop.chance) {
          addWarehouseItem(account, drop.name, 1);
          result.drops.push(drop.name);
        }
      });

      const killHeal = (job ? job.killHeal : 0) + Math.floor(skillBonuses.killHeal);
      if (killHeal > 0) {
        const oldHp = Math.max(0, Number(character.hp) || 0);
        character.hp = Math.min(Math.max(1, Number(character.maxHp) || 1), oldHp + killHeal);
        result.healingGained = character.hp - oldHp;
      }

      while (character.baseExp >= baseExpToNext(character.baseLevel)) {
        character.baseExp -= baseExpToNext(character.baseLevel);
        character.statPoints += statPointGainForLevelUp(character.baseLevel);
        character.baseLevel += 1;
        character.maxHp += 8;
        character.hp = Math.min(character.maxHp, character.hp + 8);
        character.maxSp += 2;
        character.sp = Math.min(character.maxSp, character.sp + 2);
        result.levelUps.push(character.baseLevel);
      }

      while (character.jobLevel < getJobLevelCap(character) && character.jobExp >= jobExpToNext(character.jobLevel)) {
        character.jobExp -= jobExpToNext(character.jobLevel);
        character.jobLevel += 1;
        character.skillPoints = Math.max(0, Number(character.skillPoints) || 0) + 1;
      }
      if (character.jobLevel >= getJobLevelCap(character)) {
        character.jobExp = 0;
        if (!character.jobCapReached) {
          result.jobCapped = true;
          character.jobNotice = true;
          character.jobCapReached = true;
        }
      }

      const nextMonster = chooseMonster(character.battle.map, random);
      if (nextMonster) {
        character.battle.currentMonsterId = nextMonster.id;
        character.battle.monsterMaxHp = nextMonster.maxHp;
        character.battle.monsterHp = nextMonster.maxHp;
      }
      character.battle.monsterAttackClock = 0;
      return result;
    }

    character.battle.monsterAttackClock += 1;
    if (character.battle.monsterAttackClock >= 2) {
      character.battle.monsterAttackClock = 0;
      const agi = Math.max(1, Number(character.stats.agi) || 1);
      const dodgeChance = Math.min(0.35, agi * 0.005 + (job ? job.dodgeBonus : 0));
      result.dodged = random() < dodgeChance;
      if (!result.dodged) {
        const rawDamage = monster.attackMin + Math.floor(random() * (monster.attackMax - monster.attackMin + 1));
        const mobDamage = Math.max(1, Math.ceil(rawDamage * (1 - skillBonuses.damageReduction)));
        character.hp = Math.max(0, character.hp - mobDamage);
        result.monsterDamage = mobDamage;
      }
      if (character.hp <= 0) {
        character.hp = character.maxHp;
        result.playerDown = true;
      } else if (skillBonuses.enemyHitHeal > 0) {
        const oldHp = character.hp;
        character.hp = Math.min(Math.max(1, Number(character.maxHp) || 1), character.hp + Math.floor(skillBonuses.enemyHitHeal));
        result.recoveryGained = character.hp - oldHp;
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
    FIRST_JOB_LEVEL_CAP: FIRST_JOB_LEVEL_CAP,
    FIRST_JOBS: FIRST_JOBS,
    STAT_CAP: STAT_CAP,
    STAT_KEYS: STAT_KEYS,
    emptyAccount: emptyAccount,
    normalizeNameKey: normalizeNameKey,
    validateCharacterName: validateCharacterName,
    makeCharacter: makeCharacter,
    getFirstJob: getFirstJob,
    getJobLevelCap: getJobLevelCap,
    SKILL_TREES: SKILL_TREES,
    getSkillTree: getSkillTree,
    getSkillLevel: getSkillLevel,
    getSkillBonuses: getSkillBonuses,
    allocateSkill: allocateSkill,
    changeJob: changeJob,
    baseExpToNext: baseExpToNext,
    jobExpToNext: jobExpToNext,
    statPointGainForLevelUp: statPointGainForLevelUp,
    statPointCost: statPointCost,
    allocateStat: allocateStat,
    resolveOfflineSeconds: resolveOfflineSeconds,
    getMap: getMap,
    getMonster: getMonster,
    chooseMonster: chooseMonster,
    startMap: startMap,
    stepCombat: stepCombat,
    settleOffline: settleOffline
  };
});