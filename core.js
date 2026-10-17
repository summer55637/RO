(function (root, factory) {
  const api = factory(root && root.ROWorld);
  if (root) root.ROCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (world) {
  'use strict';

  const MAX_OFFLINE_SECONDS = 24 * 60 * 60;
  const MAX_EQUIPMENT_REFINE_LEVEL = 5;
  const SLOT_COUNT = 3;
  const JOB_LEVEL_CAP = 10;
  const FIRST_JOB_LEVEL_CAP = 50;
  const PORTABLE_SAVE_FORMAT = 'ro-h5-save';
  const PORTABLE_SAVE_VERSION = 1;
  // Material recipes and healing values are custom prototype data, not verified Taiwan PC RO values.
  const CONSUMABLE_ITEMS = Object.freeze([
    Object.freeze({ id: 'carrot_tonic', name: '胡蘿蔔補給', heal: 18, description: '以胡蘿蔔與空瓶製作的野外補給。' }),
    Object.freeze({ id: 'jellopy_potion', name: '果凍治療藥', heal: 35, description: '利用果凍質塊與昆蟲外殼製作的回復藥。' }),
    Object.freeze({ id: 'honey_potion', name: '蜂蜜藥水', heal: 65, description: '以蜂蜜與蘑菇孢子調配的較強回復藥。' })
  ]);
  const CRAFTING_RECIPES = Object.freeze([
    Object.freeze({ id: 'carrot_tonic', name: '胡蘿蔔補給', ingredients: Object.freeze({ '胡蘿蔔': 2, '空瓶': 1 }) }),
    Object.freeze({ id: 'jellopy_potion', name: '果凍治療藥', ingredients: Object.freeze({ '果凍質塊': 2, '昆蟲外殼': 1, '空瓶': 1 }) }),
    Object.freeze({ id: 'honey_potion', name: '蜂蜜藥水', ingredients: Object.freeze({ '蜂蜜': 1, '蘑菇孢子': 2, '空瓶': 1 }) })
  ]);
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
    return { version: 1, updatedAt: Date.now(), slots: [null, null, null], gold: 0, warehouse: {}, equipmentInventory: [], speed: 1 };
  }

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function preparePortableSave(input) {
    function fail(reason) { return { ok: false, reason: reason }; }
    if (!isRecord(input)) return fail('存檔檔案必須是有效的 JSON 物件。');

    let rawAccount = input;
    let legacyFormat = true;
    if (Object.prototype.hasOwnProperty.call(input, 'format')) {
      if (input.format !== PORTABLE_SAVE_FORMAT) {
        return fail('無法辨識此存檔格式；本機存檔沒有變更。');
      }
      const formatVersion = Number(input.formatVersion);
      if (!Number.isInteger(formatVersion) || formatVersion < 0) {
        return fail('存檔格式版本無效；本機存檔沒有變更。');
      }
      if (formatVersion > PORTABLE_SAVE_VERSION) {
        return fail('此存檔由較新版遊戲建立，請先更新遊戲再匯入。');
      }
      if (!isRecord(input.account)) return fail('存檔缺少帳號資料；本機存檔沒有變更。');
      rawAccount = input.account;
      legacyFormat = false;
    }

    if (!isRecord(rawAccount)) return fail('帳號存檔格式無效；本機存檔沒有變更。');
    const sourceVersion = rawAccount.version == null ? 0 : Number(rawAccount.version);
    if (!Number.isInteger(sourceVersion) || sourceVersion < 0) {
      return fail('帳號存檔版本無效；本機存檔沒有變更。');
    }
    if (sourceVersion > 1) {
      return fail('此帳號存檔版本比目前遊戲新，請先更新遊戲再匯入。');
    }
    if (!Array.isArray(rawAccount.slots) || rawAccount.slots.length !== SLOT_COUNT) {
      return fail('存檔必須包含完整的 3 個角色槽；本機存檔沒有變更。');
    }

    let account;
    try {
      account = JSON.parse(JSON.stringify(rawAccount));
    } catch (_) {
      return fail('存檔內容無法安全讀取；本機存檔沒有變更。');
    }

    const now = Date.now();
    account.version = 1;
    account.updatedAt = Number.isFinite(Number(account.updatedAt)) && Number(account.updatedAt) > 0
      ? Math.floor(Number(account.updatedAt)) : now;
    if (account.gold == null) account.gold = 0;
    else if (!Number.isFinite(Number(account.gold)) || Number(account.gold) < 0) {
      return fail('共用 Zeny 數值無效；本機存檔沒有變更。');
    } else account.gold = Math.floor(Number(account.gold));
    account.speed = [1, 2, 3].includes(Number(account.speed)) ? Number(account.speed) : 1;

    if (account.warehouse == null) account.warehouse = {};
    if (!isRecord(account.warehouse)) return fail('共用倉庫資料格式無效；本機存檔沒有變更。');
    for (const name of Object.keys(account.warehouse)) {
      const quantity = Number(account.warehouse[name]);
      if (!Number.isFinite(quantity) || quantity < 0) {
        return fail('倉庫物品數量無效；本機存檔沒有變更。');
      }
      account.warehouse[name] = Math.floor(quantity);
    }

    if (account.equipmentInventory == null) account.equipmentInventory = [];
    if (!Array.isArray(account.equipmentInventory)) {
      return fail('共用裝備背包格式無效；本機存檔沒有變更。');
    }
    const equipmentIds = new Set();
    for (const instance of account.equipmentInventory) {
      if (!isRecord(instance) || typeof instance.itemId !== 'string' || !instance.itemId) {
        return fail('裝備背包含有無效物品；本機存檔沒有變更。');
      }
      if (typeof instance.instanceId !== 'string' || !instance.instanceId || equipmentIds.has(instance.instanceId)) {
        instance.instanceId = 'equipment-import-' + now.toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      }
      equipmentIds.add(instance.instanceId);
      if (instance.cards == null) instance.cards = [];
      if (!Array.isArray(instance.cards) || instance.cards.some(function (id) { return typeof id !== 'string'; })) {
        return fail('裝備卡槽資料無效；本機存檔沒有變更。');
      }
      const refineLevel = instance.refineLevel == null ? 0 : Number(instance.refineLevel);
      if (!Number.isFinite(refineLevel) || refineLevel < 0) {
        return fail('裝備精煉資料無效；本機存檔沒有變更。');
      }
      instance.refineLevel = Math.min(MAX_EQUIPMENT_REFINE_LEVEL, Math.floor(refineLevel));
      if (instance.acquiredAt != null && !Number.isFinite(Number(instance.acquiredAt))) {
        return fail('裝備取得時間無效；本機存檔沒有變更。');
      }
    }

    const characterIds = new Set();
    for (let index = 0; index < SLOT_COUNT; index += 1) {
      const source = account.slots[index];
      if (source == null) {
        account.slots[index] = null;
        continue;
      }
      if (!isRecord(source) || typeof source.id !== 'string' || !source.id ||
          typeof source.name !== 'string' || !source.name.trim() || Array.from(source.name).length > 48) {
        return fail('角色槽 ' + (index + 1) + ' 的識別碼或名稱無效；本機存檔沒有變更。');
      }
      const baseLevel = Number(source.baseLevel);
      const jobLevel = Number(source.jobLevel);
      if (!Number.isInteger(baseLevel) || baseLevel < 1 ||
          !Number.isInteger(jobLevel) || jobLevel < 1) {
        return fail('角色槽 ' + (index + 1) + ' 的等級資料無效；本機存檔沒有變更。');
      }
      if (characterIds.has(source.id)) return fail('多個角色槽使用了相同角色識別碼；本機存檔沒有變更。');
      characterIds.add(source.id);
      const objectFields = ['stats', 'skills', 'battle', 'personalItems', 'equipment', 'bestiary'];
      for (const field of objectFields) {
        if (source[field] != null && !isRecord(source[field])) {
          return fail('角色槽 ' + (index + 1) + ' 的 ' + field + ' 資料無效；本機存檔沒有變更。');
        }
      }
      if (source.equipment) {
        for (const slotName of ['weapon', 'armor', 'shoes', 'accessory']) {
          const equipped = source.equipment[slotName];
          if (equipped == null) continue;
          if (!isRecord(equipped) || typeof equipped.itemId !== 'string' || !equipped.itemId) {
            return fail('角色槽 ' + (index + 1) + ' 的已裝備物品資料無效；本機存檔沒有變更。');
          }
          if (equipped.cards != null &&
              (!Array.isArray(equipped.cards) || equipped.cards.some(function (id) { return typeof id !== 'string'; }))) {
            return fail('角色槽 ' + (index + 1) + ' 的已裝備卡片資料無效；本機存檔沒有變更。');
          }
          if (equipped.refineLevel != null &&
              (!Number.isFinite(Number(equipped.refineLevel)) || Number(equipped.refineLevel) < 0)) {
            return fail('角色槽 ' + (index + 1) + ' 的裝備精煉資料無效；本機存檔沒有變更。');
          }
        }
      }
      if (source.stats) {
        for (const statKey of STAT_KEYS) {
          if (source.stats[statKey] != null &&
              (!Number.isFinite(Number(source.stats[statKey])) || Number(source.stats[statKey]) < 1)) {
            return fail('角色槽 ' + (index + 1) + ' 的能力值資料無效；本機存檔沒有變更。');
          }
        }
      }
      if (source.personalItems) {
        for (const itemName of Object.keys(source.personalItems)) {
          if (!Number.isFinite(Number(source.personalItems[itemName])) || Number(source.personalItems[itemName]) < 0) {
            return fail('角色槽 ' + (index + 1) + ' 的個人物品數量無效；本機存檔沒有變更。');
          }
        }
      }
      if (source.logs != null && !Array.isArray(source.logs)) {
        return fail('角色槽 ' + (index + 1) + ' 的戰鬥紀錄格式無效；本機存檔沒有變更。');
      }
      if (source.pendingReport != null && !isRecord(source.pendingReport)) {
        return fail('角色槽 ' + (index + 1) + ' 的結算紀錄格式無效；本機存檔沒有變更。');
      }
      for (const key of ['baseExp', 'jobExp', 'statPoints', 'skillPoints', 'hp', 'maxHp', 'sp', 'maxSp', 'lastSavedAt']) {
        if (source[key] != null && !Number.isFinite(Number(source[key]))) {
          return fail('角色槽 ' + (index + 1) + ' 的數值欄位 ' + key + ' 無效；本機存檔沒有變更。');
        }
      }
      const template = makeCharacter(source.name, source.gender, source.look);
      const migrated = Object.assign(template, source);
      migrated.stats = Object.assign({}, template.stats, isRecord(source.stats) ? source.stats : {});
      migrated.skills = Object.assign({}, template.skills, isRecord(source.skills) ? source.skills : {});
      migrated.battle = Object.assign({}, template.battle, isRecord(source.battle) ? source.battle : {});
      migrated.personalItems = Object.assign({}, template.personalItems, isRecord(source.personalItems) ? source.personalItems : {});
      migrated.equipment = Object.assign({}, template.equipment, isRecord(source.equipment) ? source.equipment : {});
      migrated.bestiary = Object.assign({}, template.bestiary, isRecord(source.bestiary) ? source.bestiary : {});
      migrated.logs = Array.isArray(source.logs) ? source.logs.slice(-24) : template.logs;
      migrated.lastSavedAt = Number.isFinite(Number(source.lastSavedAt)) && Number(source.lastSavedAt) > 0
        ? Math.floor(Number(source.lastSavedAt)) : now;
      ensureEquipmentShape(migrated);
      account.slots[index] = migrated;
    }

    return {
      ok: true,
      account: account,
      legacyFormat: legacyFormat,
      migrated: legacyFormat || sourceVersion !== 1 || !rawAccount.warehouse || !rawAccount.equipmentInventory
    };
  }

  function createPortableSave(account, gameVersion) {
    const prepared = preparePortableSave(account);
    if (!prepared.ok) throw new Error(prepared.reason);
    return {
      format: PORTABLE_SAVE_FORMAT,
      formatVersion: PORTABLE_SAVE_VERSION,
      gameVersion: String(gameVersion || ''),
      exportedAt: new Date().toISOString(),
      account: prepared.account
    };
  }

  function writeStoredAccountWithBackup(storage, saveKey, backupKey, nextAccount, expectedRaw) {
    function failure(reason, restored, concurrentChange) {
      return {
        ok: false,
        reason: reason,
        restored: Boolean(restored),
        concurrentChange: Boolean(concurrentChange)
      };
    }
    if (!storage || typeof storage.getItem !== 'function' ||
        typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
      return failure('無法安全存取本機存檔儲存區。', false, false);
    }
    if (typeof saveKey !== 'string' || !saveKey ||
        typeof backupKey !== 'string' || !backupKey || saveKey === backupKey) {
      return failure('主存檔或備份識別碼無效。', false, false);
    }
    if (!isRecord(nextAccount) || nextAccount.version !== 1 ||
        !Array.isArray(nextAccount.slots) || nextAccount.slots.length !== SLOT_COUNT) {
      return failure('新存檔內容無效；沒有寫入本機資料。', true, false);
    }

    let nextText;
    try { nextText = JSON.stringify(nextAccount); } catch (_) {
      return failure('新存檔無法序列化；沒有寫入本機資料。', true, false);
    }
    if (typeof nextText !== 'string') return failure('新存檔無法序列化；沒有寫入本機資料。', true, false);

    let previousRaw;
    try {
      previousRaw = storage.getItem(saveKey);
    } catch (_) {
      return failure('無法讀取既有存檔；沒有寫入本機資料。', false, false);
    }
    if (expectedRaw !== undefined && previousRaw !== expectedRaw) {
      return failure('存檔已由其他分頁更新，為避免覆蓋新進度，本次寫入已取消。', true, true);
    }

    function validSavedRaw(raw) {
      if (typeof raw !== 'string' || !raw) return false;
      try {
        const parsed = JSON.parse(raw);
        return parsed && parsed.version === 1 &&
          Array.isArray(parsed.slots) && parsed.slots.length === SLOT_COUNT &&
          preparePortableSave(parsed).ok;
      } catch (_) {
        return false;
      }
    }

    let backupWritten = false;
    if (previousRaw !== null && previousRaw !== nextText && validSavedRaw(previousRaw)) {
      try {
        storage.setItem(backupKey, previousRaw);
        if (storage.getItem(backupKey) !== previousRaw) {
          return failure('上一份安全備份寫入驗證失敗；主存檔尚未改寫。', true, false);
        }
        backupWritten = true;
      } catch (_) {
        return failure('無法保存上一份安全備份；主存檔尚未改寫。請檢查瀏覽器儲存空間。', true, false);
      }
    }

    let latestRaw;
    try { latestRaw = storage.getItem(saveKey); } catch (_) {
      return failure('無法重新檢查主存檔；本次寫入已取消。', false, false);
    }
    if (latestRaw !== previousRaw) {
      return failure('另一個分頁在備份期間更新了主存檔；本次寫入已取消。', true, true);
    }

    let primaryWriteAttempted = false;
    try {
      primaryWriteAttempted = true;
      storage.setItem(saveKey, nextText);
      const readBack = storage.getItem(saveKey);
      if (readBack !== nextText || !validSavedRaw(readBack)) {
        const currentRaw = storage.getItem(saveKey);
        if (currentRaw === nextText) {
          // Roll back only if storage still contains this transaction's exact write.
          if (previousRaw === null) storage.removeItem(saveKey);
          else storage.setItem(saveKey, previousRaw);
          return failure('主存檔回讀／驗證失敗；已嘗試復原上一份存檔。', storage.getItem(saveKey) === previousRaw, false);
        }
        return failure('主存檔回讀／驗證失敗，且偵測到儲存區已變更；未以舊值覆蓋新資料。', false, true);
      }
      return {
        ok: true,
        serialized: nextText,
        previousRaw: previousRaw,
        backupWritten: backupWritten,
        concurrentChange: false,
        restored: false
      };
    } catch (error) {
      if (!primaryWriteAttempted) return failure(error.message || '主存檔寫入失敗。', true, false);
      let currentRaw;
      try { currentRaw = storage.getItem(saveKey); } catch (_) {
        return failure('主存檔寫入失敗，且無法確認目前資料內容。請先使用安全備份復原。', false, false);
      }
      if (currentRaw === previousRaw) {
        return failure(error.message || '主存檔寫入失敗；原存檔仍在。', true, false);
      }
      if (currentRaw !== nextText) {
        return failure((error.message || '主存檔寫入失敗。') + ' 偵測到其他操作改寫了存檔，為避免覆蓋新資料，不執行復原。', false, true);
      }
      try {
        if (previousRaw === null) storage.removeItem(saveKey);
        else storage.setItem(saveKey, previousRaw);
        return failure(error.message || '主存檔寫入失敗。', storage.getItem(saveKey) === previousRaw, false);
      } catch (_) {
        return failure((error.message || '主存檔寫入失敗。') + ' 嘗試復原主存檔時也失敗；請使用安全備份復原。', false, false);
      }
    }
  }

  function replaceStoredAccount(storage, saveKey, nextAccount) {
    function failure(reason, restored, concurrentChange) {
      return {
        ok: false,
        reason: reason,
        restored: Boolean(restored),
        concurrentChange: Boolean(concurrentChange)
      };
    }
    if (!storage || typeof storage.getItem !== 'function' ||
        typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
      return failure('無法安全存取本機存檔儲存區。', false, false);
    }
    if (typeof saveKey !== 'string' || !saveKey) {
      return failure('存檔識別碼無效。', false, false);
    }

    const prepared = preparePortableSave(nextAccount);
    if (!prepared.ok) return failure(prepared.reason, true, false);

    let nextText;
    try {
      prepared.account.updatedAt = Date.now();
      nextText = JSON.stringify(prepared.account);
    } catch (_) {
      return failure('匯入資料無法序列化；原存檔沒有變更。', true, false);
    }

    let previousRaw;
    try {
      previousRaw = storage.getItem(saveKey);
    } catch (_) {
      return failure('無法讀取既有存檔；原存檔沒有變更。', false, false);
    }

    let writeAttempted = false;
    try {
      writeAttempted = true;
      storage.setItem(saveKey, nextText);
      const readBack = storage.getItem(saveKey);
      if (readBack !== nextText) throw new Error('寫入後回讀比對失敗。');
      let parsed;
      try { parsed = JSON.parse(readBack); } catch (_) {
        throw new Error('寫入後的存檔無法解析。');
      }
      const verified = preparePortableSave(parsed);
      if (!verified.ok) throw new Error('寫入後驗證失敗：' + verified.reason);
      return {
        ok: true,
        account: verified.account,
        serialized: nextText,
        previousRaw: previousRaw,
        restored: false,
        concurrentChange: false
      };
    } catch (error) {
      if (!writeAttempted) {
        return failure(error.message || '存檔寫入失敗。', true, false);
      }
      let currentRaw;
      try {
        currentRaw = storage.getItem(saveKey);
      } catch (_) {
        return failure((error.message || '存檔寫入失敗。') + '；無法檢查原存檔是否仍完整。', false, false);
      }

      if (currentRaw === previousRaw) {
        return failure(error.message || '存檔寫入失敗。', true, false);
      }

      // Roll back only if the current value is still this transaction's own write.
      // Another tab may have written a newer value after our write; never overwrite that value.
      if (currentRaw !== nextText) {
        return failure((error.message || '存檔寫入失敗。') + '；偵測到其他操作已改寫存檔，為避免覆蓋新資料，不執行復原寫入。', false, true);
      }

      try {
        if (previousRaw === null) storage.removeItem(saveKey);
        else storage.setItem(saveKey, previousRaw);
        const restoredRaw = storage.getItem(saveKey);
        if (restoredRaw !== previousRaw) {
          return failure((error.message || '存檔寫入失敗。') + '；復原後的存檔比對失敗。', false, false);
        }
        return failure(error.message || '存檔寫入失敗。', true, false);
      } catch (_) {
        return failure((error.message || '存檔寫入失敗。') + '；嘗試復原原存檔時也發生錯誤。', false, false);
      }
    }
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

  function getMapMonsterEncounterRates(mapId) {
    const map = getMap(mapId);
    if (!map || !Array.isArray(map.monsters)) return [];
    const entries = map.monsters.map(function (entry) {
      return { id: entry.id, weight: Math.max(0, Number(entry.weight) || 0) };
    }).filter(function (entry) { return !!entry.id && Number.isFinite(entry.weight) && entry.weight > 0; });
    const totalWeight = entries.reduce(function (sum, entry) { return sum + entry.weight; }, 0);
    if (!(totalWeight > 0) || !Number.isFinite(totalWeight)) return [];
    return entries.map(function (entry) {
      return { id: entry.id, weight: entry.weight, probability: entry.weight / totalWeight };
    });
  }

  function getMonsterEncounterMaps(monsterId, baseLevel) {
    if (!WORLD.monsters || !Object.prototype.hasOwnProperty.call(WORLD.monsters, monsterId)) return [];
    const level = Math.max(1, Math.floor(Number(baseLevel) || 1));
    return (WORLD.maps || []).reduce(function (matches, map) {
      const encounter = getMapMonsterEncounterRates(map.id).find(function (entry) { return entry.id === monsterId; });
      if (!encounter) return matches;
      const unlockLevel = Math.max(1, Math.floor(Number(map.unlockLevel) || 1));
      matches.push({
        mapId: map.id,
        mapName: map.name,
        weight: encounter.weight,
        probability: encounter.probability,
        unlockLevel: unlockLevel,
        unlocked: level >= unlockLevel
      });
      return matches;
    }, []);
  }

  function getMonster(monsterId) {
    return (WORLD.monsters && WORLD.monsters[monsterId]) || WORLD.monsters.poring || null;
  }

  function getItemDefinition(itemId) {
    const catalog = WORLD.items || {};
    const all = (catalog.equipment || []).concat(catalog.cards || []);
    return all.find(function (item) { return item.id === itemId; }) || null;
  }

  function getItemCatalog() {
    const catalog = WORLD.items || {};
    return { equipment: (catalog.equipment || []).slice(), cards: (catalog.cards || []).slice() };
  }

  function getConsumableCatalog() {
    return {
      consumables: CONSUMABLE_ITEMS.map(function (item) { return Object.assign({}, item); }),
      recipes: CRAFTING_RECIPES.map(function (recipe) {
        const product = CONSUMABLE_ITEMS.find(function (item) { return item.id === recipe.id; });
        return {
          id: recipe.id, name: recipe.name, outputId: recipe.id,
          outputName: product ? product.name : recipe.name,
          heal: product ? product.heal : 0,
          ingredients: Object.assign({}, recipe.ingredients)
        };
      })
    };
  }

  function ensureAccountEquipmentShape(account) {
    if (!account || typeof account !== 'object') return;
    if (!Array.isArray(account.equipmentInventory)) account.equipmentInventory = [];
  }

  function ensureEquipmentShape(character) {
    if (!character || typeof character !== 'object') return;
    const slots = ['weapon', 'armor', 'shoes', 'accessory'];
    if (!character.equipment || typeof character.equipment !== 'object' || Array.isArray(character.equipment)) character.equipment = {};
    slots.forEach(function (slot) {
      const equipped = character.equipment[slot];
      if (!equipped || typeof equipped !== 'object' || Array.isArray(equipped)) {
        character.equipment[slot] = null;
      } else {
        if (!Array.isArray(equipped.cards)) equipped.cards = [];
        if (!equipped.instanceId) equipped.instanceId = 'equipment-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        equipped.refineLevel = Math.min(MAX_EQUIPMENT_REFINE_LEVEL, Math.max(0, Math.floor(Number(equipped.refineLevel) || 0)));
      }
    });
  }

  function createEquipmentInstance(itemId) {
    return {
      instanceId: 'equipment-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10),
      itemId: itemId,
      cards: [],
      refineLevel: 0,
      acquiredAt: Date.now()
    };
  }

  function addEquipmentDrop(account, itemId) {
    const item = getItemDefinition(itemId);
    if (!item || item.type !== 'equipment') return false;
    ensureAccountEquipmentShape(account);
    account.equipmentInventory.push(createEquipmentInstance(itemId));
    return true;
  }

  function getRefineCost(targetLevel) {
    const level = Math.floor(Number(targetLevel) || 0);
    if (level < 1 || level > MAX_EQUIPMENT_REFINE_LEVEL) return 0;
    return level * 100;
  }

  function refineItem(character, account, slot) {
    if (!character || !account) return { ok: false, reason: '角色或帳號資料尚未載入。' };
    if (!['weapon', 'armor', 'shoes', 'accessory'].includes(slot)) return { ok: false, reason: '未知的裝備欄位。' };
    ensureEquipmentShape(character);
    const instance = character.equipment[slot];
    if (!instance) return { ok: false, reason: '請先裝備要精煉的物品。' };
    const item = getItemDefinition(instance.itemId);
    if (!item || item.type !== 'equipment') return { ok: false, reason: '裝備資料無效，沒有變更存檔。' };
    const currentLevel = Math.max(0, Math.floor(Number(instance.refineLevel) || 0));
    if (currentLevel >= MAX_EQUIPMENT_REFINE_LEVEL) return { ok: false, reason: '這件裝備已達安全精煉上限 +' + MAX_EQUIPMENT_REFINE_LEVEL + '。' };
    const targetLevel = currentLevel + 1;
    const cost = getRefineCost(targetLevel);
    const gold = Math.max(0, Number(account.gold) || 0);
    if (gold < cost) return { ok: false, reason: 'Zeny 不足；精煉至 +' + targetLevel + ' 需要 ' + cost + ' Zeny。' };
    account.gold = gold - cost;
    instance.refineLevel = targetLevel;
    return { ok: true, itemName: item.name, slot: slot, refineLevel: targetLevel, cost: cost, maxRefineLevel: MAX_EQUIPMENT_REFINE_LEVEL };
  }

  function getEquipmentBonuses(character) {
    ensureEquipmentShape(character);
    const bonuses = { attackBonus: 0, defenseBonus: 0, criticalBonus: 0, dodgeBonus: 0, zenyBonus: 0 };
    function addEffects(item) {
      const effects = item && item.effects ? item.effects : {};
      Object.keys(bonuses).forEach(function (key) {
        bonuses[key] += Number(effects[key]) || 0;
      });
    }
    ['weapon', 'armor', 'shoes', 'accessory'].forEach(function (slot) {
      const instance = character.equipment[slot];
      if (!instance) return;
      const item = getItemDefinition(instance.itemId);
      if (item && item.type === 'equipment') addEffects(item);
      const refineLevel = Math.min(MAX_EQUIPMENT_REFINE_LEVEL, Math.max(0, Math.floor(Number(instance.refineLevel) || 0)));
      if (slot === 'weapon') bonuses.attackBonus += refineLevel * 2;
      else if (slot === 'armor' || slot === 'shoes') bonuses.defenseBonus += refineLevel;
      else if (slot === 'accessory') bonuses.criticalBonus += refineLevel * 0.005;
      (instance.cards || []).forEach(function (cardId) {
        const card = getItemDefinition(cardId);
        if (card && card.type === 'card') addEffects(card);
      });
    });
    return bonuses;
  }

  function equipItem(character, account, instanceId) {
    if (!character || !account) return { ok: false, reason: '角色或帳號資料尚未載入。' };
    ensureEquipmentShape(character);
    ensureAccountEquipmentShape(account);
    const index = account.equipmentInventory.findIndex(function (entry) { return entry && entry.instanceId === instanceId; });
    if (index < 0) return { ok: false, reason: '找不到這件裝備，請重新查看背包。' };
    const instance = account.equipmentInventory[index];
    const item = getItemDefinition(instance.itemId);
    if (!item || item.type !== 'equipment' || !['weapon', 'armor', 'shoes', 'accessory'].includes(item.slot)) {
      return { ok: false, reason: '裝備資料無效，沒有變更存檔。' };
    }
    if (Number(character.baseLevel) < (Number(item.requiredLevel) || 1)) {
      return { ok: false, reason: '需要 Base Lv. ' + item.requiredLevel + ' 才能裝備。' };
    }
    if (Array.isArray(item.allowedJobs) && !item.allowedJobs.includes(character.jobId)) {
      return { ok: false, reason: '目前職業無法裝備這件物品。' };
    }
    const old = character.equipment[item.slot];
    const oldDefinition = old && getItemDefinition(old.itemId);
    if (old) account.equipmentInventory.push(old);
    character.equipment[item.slot] = instance;
    account.equipmentInventory.splice(index, 1);
    return { ok: true, itemName: item.name, slot: item.slot, swappedName: oldDefinition ? oldDefinition.name : '' };
  }

  function unequipItem(character, account, slot) {
    if (!character || !account) return { ok: false, reason: '角色或帳號資料尚未載入。' };
    ensureEquipmentShape(character);
    ensureAccountEquipmentShape(account);
    if (!['weapon', 'armor', 'shoes', 'accessory'].includes(slot)) return { ok: false, reason: '未知的裝備欄位。' };
    const instance = character.equipment[slot];
    if (!instance) return { ok: false, reason: '這個裝備欄位目前是空的。' };
    const definition = getItemDefinition(instance.itemId);
    account.equipmentInventory.push(instance);
    character.equipment[slot] = null;
    return { ok: true, itemName: definition ? definition.name : '裝備' };
  }

  function socketCard(character, account, slot, cardId) {
    if (!character || !account) return { ok: false, reason: '角色或帳號資料尚未載入。' };
    ensureEquipmentShape(character);
    if (!account.warehouse || typeof account.warehouse !== 'object' || Array.isArray(account.warehouse)) account.warehouse = {};
    const instance = character.equipment[slot];
    if (!instance) return { ok: false, reason: '請先在該欄位裝備物品。' };
    const gear = getItemDefinition(instance.itemId);
    const card = getItemDefinition(cardId);
    if (!gear || gear.type !== 'equipment' || !card || card.type !== 'card') return { ok: false, reason: '裝備或卡片資料無效。' };
    if (!Array.isArray(instance.cards)) instance.cards = [];
    if (instance.cards.length >= Math.max(0, Number(gear.cardSlots) || 0)) return { ok: false, reason: '這件裝備沒有空卡槽。' };
    const count = Math.max(0, Number(account.warehouse[card.name]) || 0);
    if (count < 1) return { ok: false, reason: '共用倉庫沒有這張卡片。' };
    account.warehouse[card.name] = count - 1;
    if (account.warehouse[card.name] <= 0) delete account.warehouse[card.name];
    instance.cards.push(cardId);
    return { ok: true, cardName: card.name, itemName: gear.name };
  }

  function removeSocketedCard(character, account, instanceId, cardIndex) {
    if (!character || !account) return { ok: false, reason: '角色或帳號資料尚未載入。' };
    ensureEquipmentShape(character);
    ensureAccountEquipmentShape(account);
    if (!account.warehouse || typeof account.warehouse !== 'object' || Array.isArray(account.warehouse)) account.warehouse = {};
    const slots = ['weapon', 'armor', 'shoes', 'accessory'];
    let instance = null;
    let equippedSlot = null;
    slots.some(function (slot) {
      const candidate = character.equipment[slot];
      if (candidate && candidate.instanceId === instanceId) {
        instance = candidate;
        equippedSlot = slot;
        return true;
      }
      return false;
    });
    if (!instance) instance = account.equipmentInventory.find(function (candidate) { return candidate && candidate.instanceId === instanceId; }) || null;
    if (!instance) return { ok: false, reason: '找不到這件裝備；沒有移動卡片。' };
    if (!Array.isArray(instance.cards)) instance.cards = [];
    if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= instance.cards.length) {
      return { ok: false, reason: '這個卡槽沒有可取出的卡片。' };
    }
    const cardId = instance.cards[cardIndex];
    const card = getItemDefinition(cardId);
    const gear = getItemDefinition(instance.itemId);
    if (!card || card.type !== 'card' || !gear || gear.type !== 'equipment') {
      return { ok: false, reason: '裝備或卡片資料無效；沒有移動卡片。' };
    }
    instance.cards.splice(cardIndex, 1);
    account.warehouse[card.name] = Math.max(0, Number(account.warehouse[card.name]) || 0) + 1;
    return { ok: true, cardId: cardId, cardName: card.name, itemName: gear.name, instanceId: instance.instanceId, slot: equippedSlot || 'inventory' };
  }

  function sellEquipment(character, account, instanceId) {
    if (!character || !account) return { ok: false, reason: '角色或帳號資料尚未載入。' };
    ensureEquipmentShape(character);
    ensureAccountEquipmentShape(account);
    const inventoryIndex = account.equipmentInventory.findIndex(function (instance) { return instance && instance.instanceId === instanceId; });
    if (inventoryIndex < 0) return { ok: false, reason: '只有共用背包裡的裝備可以出售。' };
    const instance = account.equipmentInventory[inventoryIndex];
    const item = getItemDefinition(instance.itemId);
    if (!item || item.type !== 'equipment') return { ok: false, reason: '裝備資料無效；沒有出售物品。' };
    if (Array.isArray(instance.cards) && instance.cards.length > 0) {
      return { ok: false, reason: '裝備還有已鑲嵌卡片；請先取出卡片再出售。' };
    }
    function holdsInstance(hero) {
      if (!hero || typeof hero !== 'object') return false;
      ensureEquipmentShape(hero);
      return ['weapon', 'armor', 'shoes', 'accessory'].some(function (slot) {
        return hero.equipment[slot] && hero.equipment[slot].instanceId === instanceId;
      });
    }
    if (holdsInstance(character) || (Array.isArray(account.slots) && account.slots.some(function (hero) { return hero !== character && holdsInstance(hero); }))) {
      return { ok: false, reason: '這件裝備仍被角色穿戴中；請先卸下裝備。' };
    }
    const salePrice = Math.max(0, Math.floor(Number(item.sellPrice) || 0));
    if (salePrice <= 0) return { ok: false, reason: '這件裝備沒有可用的出售價格。' };
    account.equipmentInventory.splice(inventoryIndex, 1);
    account.gold = Math.max(0, Number(account.gold) || 0) + salePrice;
    return { ok: true, itemName: item.name, salePrice: salePrice, refineLevel: Math.max(0, Math.floor(Number(instance.refineLevel) || 0)) };
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
      equipment: { weapon: null, armor: null, shoes: null, accessory: null },
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
    ensureEquipmentShape(character);
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

  function craftConsumable(account, recipeId, quantity) {
    if (!account || typeof account !== 'object') return { ok: false, reason: '帳號資料尚未載入。' };
    const recipe = CRAFTING_RECIPES.find(function (entry) { return entry.id === recipeId; });
    if (!recipe) return { ok: false, reason: '找不到這項製作配方。' };
    const count = quantity == null ? 1 : Number(quantity);
    if (!Number.isSafeInteger(count) || count < 1 || count > 99) return { ok: false, reason: '一次只能製作 1 至 99 份。' };
    if (!account.warehouse || typeof account.warehouse !== 'object' || Array.isArray(account.warehouse)) account.warehouse = {};
    const requirements = Object.keys(recipe.ingredients).map(function (name) {
      return { name: name, needed: recipe.ingredients[name] * count, available: Math.max(0, Number(account.warehouse[name]) || 0) };
    });
    const shortage = requirements.find(function (entry) { return entry.available < entry.needed; });
    if (shortage) return { ok: false, reason: shortage.name + ' 不足，需要 ' + shortage.needed + ' 個，目前只有 ' + shortage.available + ' 個。' };
    const product = CONSUMABLE_ITEMS.find(function (item) { return item.id === recipe.id; });
    if (!product) return { ok: false, reason: '製作成品資料無效，沒有消耗材料。' };
    // Validate every ingredient before changing the shared warehouse.
    requirements.forEach(function (entry) {
      const remaining = entry.available - entry.needed;
      if (remaining > 0) account.warehouse[entry.name] = remaining;
      else delete account.warehouse[entry.name];
    });
    addWarehouseItem(account, product.name, count);
    return { ok: true, recipeName: recipe.name, itemId: product.id, itemName: product.name, quantity: count, heal: product.heal };
  }

  function useConsumable(character, account, itemId) {
    if (!character || !account || typeof account !== 'object') return { ok: false, reason: '角色或帳號資料尚未載入。' };
    const item = CONSUMABLE_ITEMS.find(function (entry) { return entry.id === itemId; });
    if (!item) return { ok: false, reason: '找不到這項消耗品。' };
    if (!account.warehouse || typeof account.warehouse !== 'object' || Array.isArray(account.warehouse)) account.warehouse = {};
    const count = Math.max(0, Number(account.warehouse[item.name]) || 0);
    if (count < 1) return { ok: false, reason: '共用倉庫沒有 ' + item.name + '。' };
    const maxHp = Math.max(1, Math.floor(Number(character.maxHp) || 1));
    const currentHp = Math.min(maxHp, Math.max(0, Number(character.hp) || 0));
    if (currentHp >= maxHp) return { ok: false, reason: 'HP 已是滿值，不需要使用補給品。' };
    const healed = Math.min(maxHp, currentHp + item.heal) - currentHp;
    if (healed <= 0) return { ok: false, reason: '目前無法恢復 HP。' };
    character.hp = currentHp + healed;
    if (count > 1) account.warehouse[item.name] = count - 1;
    else delete account.warehouse[item.name];
    return { ok: true, itemName: item.name, healed: healed, remaining: count - 1 };
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
    const equipmentBonuses = getEquipmentBonuses(character);
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
    let damage = Math.max(1, 4 + character.baseLevel + str + Math.floor(dex / 10) + (job ? job.damageBonus : 0) + skillBonuses.damageBonus + equipmentBonuses.attackBonus - Math.floor(random() * 3));
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
    const criticalChance = Math.min(0.5, luk * 0.005 + (job ? job.criticalBonus : 0) + skillBonuses.criticalBonus + equipmentBonuses.criticalBonus);
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
      const zenyBonus = (job ? job.zenyBonus : 0) + skillBonuses.zenyBonus + equipmentBonuses.zenyBonus;
      const gold = zenyBonus ? Math.round(baseGold * (1 + zenyBonus)) : baseGold;
      account.gold = Math.max(0, Number(account.gold) || 0) + gold;
      result.goldGained = gold;

      (monster.drops || []).forEach(function (drop) {
        if (random() < drop.chance) {
          const definition = getItemDefinition(drop.id);
          if (definition && definition.type === 'equipment') addEquipmentDrop(account, drop.id);
          else addWarehouseItem(account, drop.name, 1);
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

    if (monster.canRetaliate === false) {
      character.battle.monsterAttackClock = 0;
      return result;
    }

    character.battle.monsterAttackClock += 1;
    if (character.battle.monsterAttackClock >= 2) {
      character.battle.monsterAttackClock = 0;
      const agi = Math.max(1, Number(character.stats.agi) || 1);
      const dodgeChance = Math.min(0.35, agi * 0.005 + (job ? job.dodgeBonus : 0) + equipmentBonuses.dodgeBonus);
      result.dodged = random() < dodgeChance;
      if (!result.dodged) {
        const rawDamage = monster.attackMin + Math.floor(random() * (monster.attackMax - monster.attackMin + 1));
        const reducedByDefense = Math.max(1, rawDamage - equipmentBonuses.defenseBonus);
        const mobDamage = Math.max(1, Math.ceil(reducedByDefense * (1 - skillBonuses.damageReduction)));
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
    ensureAccountEquipmentShape(account);
    const oldEquipmentIds = new Set(account.equipmentInventory.map(function (item) { return item && item.instanceId; }).filter(Boolean));
    const report = { durationSeconds: seconds, expGained: 0, jobExpGained: 0, goldGained: 0, kills: 0, levelUps: [], drops: {}, equipmentDrops: {}, jobCapped: false };
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
    account.equipmentInventory.forEach(function (instance) {
      if (!instance || !instance.instanceId || oldEquipmentIds.has(instance.instanceId)) return;
      const item = getItemDefinition(instance.itemId);
      if (!item || item.type !== 'equipment') return;
      report.equipmentDrops[item.name] = (report.equipmentDrops[item.name] || 0) + 1;
    });
    return report;
  }

  return {
    MAX_OFFLINE_SECONDS: MAX_OFFLINE_SECONDS,
    MAX_EQUIPMENT_REFINE_LEVEL: MAX_EQUIPMENT_REFINE_LEVEL,
    SLOT_COUNT: SLOT_COUNT,
    PORTABLE_SAVE_FORMAT: PORTABLE_SAVE_FORMAT,
    PORTABLE_SAVE_VERSION: PORTABLE_SAVE_VERSION,
    createPortableSave: createPortableSave,
    replaceStoredAccount: replaceStoredAccount,
    writeStoredAccountWithBackup: writeStoredAccountWithBackup,
    preparePortableSave: preparePortableSave,
    JOB_LEVEL_CAP: JOB_LEVEL_CAP,
    FIRST_JOB_LEVEL_CAP: FIRST_JOB_LEVEL_CAP,
    FIRST_JOBS: FIRST_JOBS,
    STAT_CAP: STAT_CAP,
    STAT_KEYS: STAT_KEYS,
    emptyAccount: emptyAccount,
    getItemDefinition: getItemDefinition,
    getItemCatalog: getItemCatalog,
    getConsumableCatalog: getConsumableCatalog,
    craftConsumable: craftConsumable,
    useConsumable: useConsumable,
    ensureEquipmentShape: ensureEquipmentShape,
    getEquipmentBonuses: getEquipmentBonuses,
    getRefineCost: getRefineCost,
    refineItem: refineItem,
    equipItem: equipItem,
    unequipItem: unequipItem,
    socketCard: socketCard,
    removeSocketedCard: removeSocketedCard,
    sellEquipment: sellEquipment,
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
    getMapMonsterEncounterRates: getMapMonsterEncounterRates,
    getMonsterEncounterMaps: getMonsterEncounterMaps,
    getMonster: getMonster,
    chooseMonster: chooseMonster,
    startMap: startMap,
    stepCombat: stepCombat,
    settleOffline: settleOffline
  };
});