(() => {
  "use strict";

  const DATA = window.RO_DATA;
  if (!DATA) {
    console.error("RO game data failed to load.");
    return;
  }

  const SAVE_KEY = "ro-offline-adventure-v1";
  const WORLD_W = 960;
  const WORLD_H = 600;
  const MAX_OFFLINE_SECONDS = 8 * 60 * 60;
  const $ = (id) => document.getElementById(id);
  const canvas = $("game");
  const ctx = canvas.getContext("2d");
  const miniCanvas = $("miniMap");
  const miniCtx = miniCanvas.getContext("2d");
  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const fmt = (number) => Math.floor(number).toLocaleString();
  const MINI_BALANCE = Object.freeze({ baseExpStart: 25, baseExpPerLevel: 10, potionHeal: 45 });
  const baseExpNeeded = () => MINI_BALANCE.baseExpStart + (state.player.level - 1) * MINI_BALANCE.baseExpPerLevel;
  const jobExpNeeded = () => 20 + state.player.jobLevel * 8;
  const currentMap = () => DATA.maps[state.mapId] || DATA.maps.field;
  const currentJob = () => DATA.jobs.find((job) => job.id === state.player.jobId) || DATA.jobs[0];
  const monsterInfo = (type) => DATA.monsters[type] || DATA.monsters.poring;
  const itemInfo = (id) => DATA.items[id] || { id, name: id, icon: "📦", description: "未知物品", price: 0 };
  const skillInfo = (id) => DATA.skills[id] || null;
  const skillKindLabel = (kind) => ({
    damage: "單體攻擊", magic: "魔法攻擊", aoe: "範圍攻擊",
    heal: "治療", buff: "輔助", passive: "被動"
  }[kind] || "技能");
  function huntDifficultyLabel(monster) {
    if (monster.boss) return "Boss 挑戰 · 建議 Lv. " + monster.level + "+";
    if (monster.level <= 3) return "新手 · 建議 Lv. 1–4";
    if (monster.level <= 7) return "初階 · 建議 Lv. 5–9";
    if (monster.level <= 13) return "中階 · 建議 Lv. 10–14";
    if (monster.level <= 20) return "進階 · 建議 Lv. 15–24";
    return "高難度 · 建議 Lv. 20+";
  }

  const defaultPlayer = () => ({
    x: 466, y: 345, hp: 100, maxHp: 100, sp: 100, maxSp: 100,
    level: 1, exp: 0, jobId: "novice", jobLevel: 1, jobExp: 0,
    statPoints: 5, skillPoints: 3,
    stats: { str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 },
    potions: 5, gold: 0
  });

  function makeMonsters(mapId) {
    const map = DATA.maps[mapId] || DATA.maps.field;
    return map.spawns.map((spawn, index) => {
      const info = monsterInfo(spawn.type);
      return {
        id: mapId + "-" + spawn.type + "-" + (index + 1),
        type: spawn.type, name: info.name, x: spawn.x, y: spawn.y,
        boss: info.boss === true, specialAttack: info.specialAttack, color: info.color,
        spawnX: spawn.x, spawnY: spawn.y, radius: info.boss ? 35 : 17,
        hp: info.hp, maxHp: info.hp, attack: info.attack, defense: info.defense,
        exp: info.exp, gold: info.gold.slice(), cooldown: rand(0.2, 0.9),
        respawnAt: 0, poisonUntil: 0, radius: info.boss ? 35 : 17
      };
    });
  }

  const state = {
    player: defaultPlayer(),
    mapId: "field",
    monsters: makeMonsters("field"),
    inventory: [{ id: "green-herb", qty: 2 }, { id: "blue-potion", qty: 1 }],
    equipment: { weapon: "novice-knife", armor: "cotton-tunic", accessory: null },
    learnedSkills: ["basic-strike"],
    cooldowns: {},
    buffs: {},
    moveTarget: null,
    targetId: null,
    pendingSkillId: null,
    attackCooldown: 0,
    walkFrame: 0,
    lastUi: 0,
    lastSave: Date.now(),
    lastTime: 0,
    spRegenAccumulator: 0,
    idleEnabled: false,
    idleSettings: { autoPotion: true, potionThreshold: 45, priority: "nearest" },
    idleStats: { kills: 0, exp: 0, gold: 0, drops: 0 },
    lastOfflineSummary: null,
    images: {},
    audio: {},
    effects: [],
    isReady: false
  };

  function spawnEffect(x, y, type, color, text) {
    state.effects.push({ x, y, type, color: color || "#f8e9b3", text: text || "", start: performance.now(), until: performance.now() + 620 });
    if (state.effects.length > 90) state.effects.splice(0, state.effects.length - 90);
  }

  const staticDecor = [
    { x: 72, y: 60, type: "tree" }, { x: 182, y: 86, type: "tree" },
    { x: 260, y: 70, type: "tree" }, { x: 780, y: 68, type: "tree" },
    { x: 876, y: 135, type: "tree" }, { x: 90, y: 420, type: "tree" },
    { x: 210, y: 535, type: "tree" }, { x: 370, y: 552, type: "tree" },
    { x: 605, y: 535, type: "tree" }, { x: 845, y: 535, type: "tree" },
    { x: 670, y: 80, type: "rock" }, { x: 444, y: 150, type: "rock" },
    { x: 525, y: 510, type: "rock" }, { x: 735, y: 420, type: "rock" },
    { x: 130, y: 260, type: "flower" }, { x: 355, y: 215, type: "flower" },
    { x: 600, y: 395, type: "flower" }, { x: 828, y: 300, type: "flower" },
    { x: 460, y: 455, type: "flower" }, { x: 280, y: 380, type: "flower" }
  ];
  const obstacles = [
    { x: 92, y: 102, r: 20 }, { x: 154, y: 488, r: 18 },
    { x: 817, y: 105, r: 19 }, { x: 863, y: 474, r: 22 },
    { x: 703, y: 211, r: 15 }, { x: 275, y: 135, r: 14 },
    { x: 332, y: 490, r: 17 }, { x: 563, y: 105, r: 15 }
  ];

  function logMessage(message, kind) {
    const list = $("gameLog");
    const row = document.createElement("p");
    row.className = "log-entry" + (kind === "muted" ? " muted" : "");
    const bullet = document.createElement("span");
    bullet.className = "log-bullet";
    bullet.textContent = "›";
    row.appendChild(bullet);
    row.appendChild(document.createTextNode(" " + message));
    list.prepend(row);
    while (list.children.length > 6) list.removeChild(list.lastElementChild);
  }

  function safeNum(value, fallback, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? clamp(number, min, max) : fallback;
  }

  function getEquipmentItem(slot) {
    const itemId = state.equipment[slot];
    return itemId ? itemInfo(itemId) : null;
  }

  function equipmentBonuses() {
    const result = { attack: 0, hpBonus: 0, spBonus: 0, stats: {} };
    Object.keys(state.equipment).forEach((slot) => {
      const itemId = state.equipment[slot];
      if (!itemId) return;
      const item = itemInfo(itemId);
      result.attack += item.attack || 0;
      result.hpBonus += item.hpBonus || 0;
      result.spBonus += item.spBonus || 0;
      Object.keys(item.stats || {}).forEach((key) => {
        result.stats[key] = (result.stats[key] || 0) + item.stats[key];
      });
    });
    const extra = window.RO_EXPANSION && typeof window.RO_EXPANSION.bonuses === "function" ? window.RO_EXPANSION.bonuses() : null;
    if (extra) {
      result.attack += extra.attack || 0;
      result.hpBonus += extra.hpBonus || 0;
      result.spBonus += extra.spBonus || 0;
      Object.keys(extra.stats || {}).forEach((key) => { result.stats[key] = (result.stats[key] || 0) + extra.stats[key]; });
    }
    const petExtra = window.RO_PETS && typeof window.RO_PETS.bonuses === "function" ? window.RO_PETS.bonuses() : null;
    if (petExtra) {
      result.attack += petExtra.attack || 0;
      result.hpBonus += petExtra.hpBonus || 0;
      result.spBonus += petExtra.spBonus || 0;
      Object.keys(petExtra.stats || {}).forEach((key) => { result.stats[key] = (result.stats[key] || 0) + petExtra.stats[key]; });
    }
    return result;
  }

  function totalStat(statId) {
    const base = state.player.stats[statId] || 1;
    const job = currentJob()[statId] || 0;
    const gear = equipmentBonuses().stats[statId] || 0;
    return base + job + gear;
  }

  function maxHp() {
    const job = currentJob();
    const gear = equipmentBonuses();
    return Math.max(1, state.player.maxHp + (totalStat("vit") - 5) * 5 + (job.hp || 0) + gear.hpBonus);
  }

  function maxSp() {
    const job = currentJob();
    const gear = equipmentBonuses();
    return Math.max(1, state.player.maxSp + (totalStat("int") - 5) * 4 + (job.sp || 0) + gear.spBonus);
  }

  function attackPower() {
    const gear = equipmentBonuses();
    const job = currentJob();
    // One predictable formula: level + STR + a small DEX bonus + job and weapon.
    return Math.max(1, 3 + state.player.level + totalStat("str") + Math.floor(totalStat("dex") / 4) + (job.atk || 0) + gear.attack);
  }

  function attackInterval() {
    return clamp(0.9 - (totalStat("agi") - 5) * 0.02 - (currentJob().agi || 0) * 0.015, 0.4, 1.0);
  }

  function critChance() {
    const extra = window.RO_EXPANSION && typeof window.RO_EXPANSION.bonuses === "function" ? window.RO_EXPANSION.bonuses() : null;
    return clamp(2 + totalStat("luk") * 0.6 + (extra ? (extra.critBonus || 0) : 0), 2, 55);
  }

  function monsterAt(id) {
    return state.monsters.find((monster) => monster.id === id && monster.hp > 0) || null;
  }

  function targetMonster() {
    return monsterAt(state.targetId);
  }

  function addInventory(itemId, quantity) {
    const amount = Math.max(1, Math.floor(quantity || 1));
    if (itemId === "red-potion") {
      state.player.potions += amount;
      return;
    }
    const entry = state.inventory.find((item) => item.id === itemId);
    if (entry) entry.qty += amount;
    else state.inventory.push({ id: itemId, qty: amount });
  }

  function removeInventory(itemId, quantity) {
    const amount = Math.max(1, Math.floor(quantity || 1));
    if (itemId === "red-potion") {
      if (state.player.potions < amount) return false;
      state.player.potions -= amount;
      return true;
    }
    const entry = state.inventory.find((item) => item.id === itemId);
    if (!entry || entry.qty < amount) return false;
    entry.qty -= amount;
    if (entry.qty <= 0) state.inventory = state.inventory.filter((item) => item.id !== itemId);
    return true;
  }

  function hasLearned(skillId) {
    return state.learnedSkills.includes(skillId);
  }

  function getAvailableSkillIds() {
    const ids = currentJob().skills || ["basic-strike"];
    return ids.filter((id, index) => ids.indexOf(id) === index && !!DATA.skills[id]);
  }

  function hasSkill(skillId) {
    return getAvailableSkillIds().includes(skillId);
  }

  function savePayload() {
    return {
      version: 2,
      savedAt: new Date().toISOString(),
      player: state.player,
      mapId: state.mapId,
      idleEnabled: false,
      idleSettings: state.idleSettings,
      idleStats: state.idleStats,
      lastOfflineSummary: state.lastOfflineSummary,
      inventory: state.inventory,
      equipment: state.equipment,
      learnedSkills: state.learnedSkills,
      monsters: state.monsters.map((m) => ({
        id: m.id, hp: m.hp, x: m.x, y: m.y, respawnAt: m.respawnAt, poisonUntil: m.poisonUntil
      }))
    };
  }

  function saveGame(showMessage) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(savePayload()));
      $("saveIndicator").textContent = "已儲存 " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (showMessage) logMessage("進度已儲存到這個瀏覽器。", "muted");
      return true;
    } catch (error) {
      $("saveIndicator").textContent = "儲存失敗";
      if (showMessage) logMessage("無法儲存：請檢查瀏覽器的儲存空間。");
      return false;
    }
  }

  function applySave(data) {
    if (!data || !data.player) throw new Error("存檔格式不正確");
    const incoming = data.player;
    const p = defaultPlayer();
    p.x = safeNum(incoming.x, p.x, 25, WORLD_W - 25);
    p.y = safeNum(incoming.y, p.y, 25, WORLD_H - 25);
    p.level = Math.round(safeNum(incoming.level, 1, 1, 99));
    p.maxHp = safeNum(incoming.maxHp, 100, 1, 999999);
    p.hp = safeNum(incoming.hp, p.maxHp, 0, 999999);
    p.maxSp = safeNum(incoming.maxSp, 100, 1, 999999);
    p.sp = safeNum(incoming.sp, p.maxSp, 0, 999999);
    p.exp = safeNum(incoming.exp, 0, 0, 999999999);
    p.jobId = DATA.jobs.some((job) => job.id === incoming.jobId) ? incoming.jobId : "novice";
    p.jobLevel = Math.round(safeNum(incoming.jobLevel, 1, 1, 50));
    p.jobExp = safeNum(incoming.jobExp, 0, 0, 999999999);
    p.statPoints = Math.round(safeNum(incoming.statPoints, 5, 0, 999999));
    p.skillPoints = Math.round(safeNum(incoming.skillPoints, 3, 0, 999999));
    p.stats = Object.assign(p.stats, incoming.stats && typeof incoming.stats === "object" ? incoming.stats : {});
    ["str", "agi", "vit", "int", "dex", "luk"].forEach((id) => { p.stats[id] = Math.round(safeNum(p.stats[id], 5, 1, 99)); });
    p.potions = Math.round(safeNum(incoming.potions, 5, 0, 999999));
    p.gold = Math.round(safeNum(incoming.gold, 0, 0, 999999999999));
    state.player = p;
    state.mapId = DATA.maps[data.mapId] ? data.mapId : "field";
    state.monsters = makeMonsters(state.mapId);
    if (Array.isArray(data.monsters)) {
      state.monsters.forEach((monster) => {
        const saved = data.monsters.find((entry) => entry && entry.id === monster.id);
        if (!saved) return;
        monster.hp = safeNum(saved.hp, monster.maxHp, 0, monster.maxHp);
        monster.x = safeNum(saved.x, monster.spawnX, 20, WORLD_W - 20);
        monster.y = safeNum(saved.y, monster.spawnY, 20, WORLD_H - 20);
        monster.respawnAt = safeNum(saved.respawnAt, 0, 0, 9999999999999);
        monster.poisonUntil = safeNum(saved.poisonUntil, 0, 0, 9999999999999);
      });
    }
    state.inventory = Array.isArray(data.inventory)
      ? data.inventory.filter((entry) => entry && DATA.items[entry.id] && entry.id !== "red-potion")
        .map((entry) => ({ id: entry.id, qty: Math.round(safeNum(entry.qty, 1, 1, 999999)) }))
      : [{ id: "green-herb", qty: 2 }, { id: "blue-potion", qty: 1 }];
    const eq = data.equipment && typeof data.equipment === "object" ? data.equipment : {};
    state.equipment = {
      weapon: eq.weapon && DATA.items[eq.weapon] && DATA.items[eq.weapon].slot === "weapon" ? eq.weapon : "novice-knife",
      armor: eq.armor && DATA.items[eq.armor] && DATA.items[eq.armor].slot === "armor" ? eq.armor : "cotton-tunic",
      accessory: eq.accessory && DATA.items[eq.accessory] && DATA.items[eq.accessory].slot === "accessory" ? eq.accessory : null
    };
    state.learnedSkills = Array.isArray(data.learnedSkills) ? data.learnedSkills.filter((id) => DATA.skills[id]) : ["basic-strike"];
    if (!state.learnedSkills.includes("basic-strike")) state.learnedSkills.unshift("basic-strike");
    state.idleEnabled = false; // Strict mode: never restore unverified auto-hunt state.
    state.idleSettings = Object.assign({ autoPotion: true, potionThreshold: 45, priority: "nearest" }, data.idleSettings || {});
    state.idleSettings.autoPotion = state.idleSettings.autoPotion !== false;
    state.idleSettings.potionThreshold = safeNum(state.idleSettings.potionThreshold, 45, 30, 75);
    if (!["nearest", "weakest", "exp"].includes(state.idleSettings.priority)) state.idleSettings.priority = "nearest";
    state.idleStats = Object.assign({ kills: 0, exp: 0, gold: 0, drops: 0 }, data.idleStats || {});
    Object.keys(state.idleStats).forEach((key) => { state.idleStats[key] = Math.round(safeNum(state.idleStats[key], 0, 0, 999999999999)); });
    state.lastOfflineSummary = data.lastOfflineSummary && typeof data.lastOfflineSummary === "object" ? data.lastOfflineSummary : null;
    state.cooldowns = {};
    state.buffs = {};
    state.targetId = null;
    state.pendingSkillId = null;
    state.moveTarget = null;
    state.player.hp = Math.min(state.player.hp, maxHp());
    state.player.sp = Math.min(state.player.sp, maxSp());
  }

  function expReward(amount, quiet) {
    const p = state.player;
    p.exp += amount;
    while (p.level < 99 && p.exp >= baseExpNeeded()) {
      p.exp -= baseExpNeeded();
      p.level += 1;
      spawnEffect(p.x, p.y - 22, "level", "#fff0a9", "LEVEL UP!");
      window.dispatchEvent(new CustomEvent("ro:level-up", { detail: { level: p.level } }));
      p.statPoints += 3;
      p.skillPoints += 1;
      p.maxHp += 10;
      p.maxSp += 5;
      p.hp = Math.min(maxHp(), p.hp + 20);
      p.sp = Math.min(maxSp(), p.sp + 10);
      if (!quiet) {
        logMessage("Base 升級！現在 Lv. " + p.level + "，獲得 3 點能力值與 1 點技能點。");
        playSound("levelup");
      }
    }
  }

  function jobExpReward() {
    // Mini RO uses Base Level for visible progression; keep this hook for legacy-save compatibility.
  }

  function statCost(value) {
    return 1;
  }

  function allocateStat(statId) {
    const p = state.player;
    const value = p.stats[statId];
    if (!value || value >= 99) {
      logMessage("這項能力值已達上限。", "muted");
      return;
    }
    const cost = statCost(value);
    if (p.statPoints < cost) {
      logMessage("能力值點數不足，需要 " + cost + " 點。", "muted");
      return;
    }
    const hpBefore = maxHp();
    const spBefore = maxSp();
    p.statPoints -= cost;
    p.stats[statId] += 1;
    p.hp = clamp(p.hp + (maxHp() - hpBefore), 0, maxHp());
    p.sp = clamp(p.sp + (maxSp() - spBefore), 0, maxSp());
    logMessage(DATA.stats.find((stat) => stat.id === statId).zh + " 提升至 " + p.stats[statId] + "。");
    renderStats();
    updateUI();
    saveGame(false);
  }

  function changeJob(jobId) {
    const job = DATA.jobs.find((entry) => entry.id === jobId);
    if (!job) return;
    if (jobId === state.player.jobId) {
      logMessage("你目前就是" + job.name + "。", "muted");
      return;
    }
    if (job.tier === 1 && (state.player.jobId !== "novice" || state.player.level < 5)) {
      logMessage("一轉需要 Base Lv. 5，且目前職業必須是初心者。", "muted");
      return;
    }
    if (job.tier === 2 && (state.player.jobId !== job.parent || state.player.level < 20)) {
      logMessage("二轉需要 Base Lv. 20，並且先完成對應的一轉。", "muted");
      return;
    }
    const hpBefore = maxHp();
    const spBefore = maxSp();
    state.player.jobId = job.id;
    window.dispatchEvent(new CustomEvent("ro:job-change", { detail: { jobId: job.id, name: job.name } }));
    state.player.jobLevel = 1;
    state.player.jobExp = 0;
    state.player.hp = clamp(state.player.hp + maxHp() - hpBefore, 1, maxHp());
    state.player.sp = clamp(state.player.sp + maxSp() - spBefore, 0, maxSp());
    state.targetId = null;
    state.pendingSkillId = null;
    logMessage("轉職成功！現在的職業是「" + job.name + "」。");
    renderJobs();
    renderSkills();
    updateUI();
    saveGame(false);
  }

  function renderJobs() {
    const container = $("jobOptions");
    container.replaceChildren();

    // The mini version keeps only clear Base Lv. and matching-job requirements.
    const eligibleJobs = DATA.jobs.filter((job) => (
      (job.tier === 1 && state.player.jobId === "novice" && state.player.level >= 5)
      || (job.tier === 2 && state.player.jobId === job.parent && state.player.level >= 20)
    ));

    const controls = document.createElement("div");
    controls.className = "job-transfer-controls";

    const label = document.createElement("label");
    label.className = "job-transfer-label";
    label.htmlFor = "jobTargetSelect";
    label.textContent = "直接選擇目標職業";

    const select = document.createElement("select");
    select.className = "job-transfer-select";
    select.id = "jobTargetSelect";
    select.setAttribute("aria-label", "選擇可直接轉職的目標職業");
    select.disabled = eligibleJobs.length === 0;

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = eligibleJobs.length ? "請選擇目標職業" : "目前沒有可直接轉職的目標";
    select.appendChild(placeholder);

    eligibleJobs.forEach((job) => {
      const option = document.createElement("option");
      option.value = job.id;
      option.textContent = job.name + "（" + (job.tier === 1 ? "一轉" : "二轉") + "） · " + (job.role || "冒險者");
      select.appendChild(option);
    });

    const transferButton = document.createElement("button");
    transferButton.type = "button";
    transferButton.className = "primary-button full-button job-transfer-button";
    transferButton.id = "jobTransferButton";
    transferButton.textContent = "直接轉職";
    transferButton.disabled = true;

    select.addEventListener("change", () => {
      transferButton.disabled = !select.value;
    });
    transferButton.addEventListener("click", () => {
      if (select.value) changeJob(select.value);
    });

    const status = document.createElement("p");
    status.className = "job-transfer-status";
    status.textContent = eligibleJobs.length
      ? "選擇職業後按「直接轉職」，不用任務，也不收費。"
      : (state.player.jobId === "novice" && state.player.level < 5
        ? "Base Lv. 5 後即可直接一轉；不用任務、不收費。"
        : "Base Lv. 20 後可轉為對應二轉職業；不用任務、不收費。");

    controls.append(label, select, transferButton, status);
    container.appendChild(controls);
  }

  function renderStats() {
    const container = $("statsList");
    container.replaceChildren();
    DATA.stats.forEach((stat) => {
      const row = document.createElement("div");
      row.className = "stat-entry";
      const code = document.createElement("span");
      code.className = "stat-code";
      code.textContent = stat.id.toUpperCase();
      const name = document.createElement("span");
      name.className = "stat-name";
      const title = document.createElement("strong");
      title.textContent = stat.zh;
      const hint = document.createElement("small");
      hint.textContent = stat.description;
      name.append(title, hint);
      const value = document.createElement("span");
      value.className = "stat-value";
      value.textContent = totalStat(stat.id);
      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "plus-button";
      plus.textContent = "+";
      plus.title = "提升 " + stat.zh + "，需要 " + statCost(state.player.stats[stat.id]) + " 點";
      plus.disabled = state.player.stats[stat.id] >= 99 || state.player.statPoints < statCost(state.player.stats[stat.id]);
      plus.addEventListener("click", () => allocateStat(stat.id));
      row.append(code, name, value, plus);
      container.appendChild(row);
    });
  }

  function resetStats() {
    const player = state.player;
    let refundedPoints = 0;

    // The reset targets this prototype's initial allocation (5 in every base stat).
    // Refund exactly the points that the prototype's statCost() charged for those levels.
    DATA.stats.forEach((stat) => {
      const currentValue = Math.max(5, Math.floor(Number(player.stats[stat.id]) || 5));
      for (let value = 5; value < currentValue; value += 1) {
        refundedPoints += statCost(value);
      }
      player.stats[stat.id] = 5;
    });

    player.statPoints += refundedPoints;
    player.hp = clamp(player.hp, 1, maxHp());
    player.sp = clamp(player.sp, 0, maxSp());
    logMessage(refundedPoints > 0
      ? "能力值已免費初始化，返還 " + refundedPoints + " 點能力值點數。"
      : "能力值已是初始配置，無須重置。", refundedPoints > 0 ? undefined : "muted");
    renderStats();
    updateUI();
    saveGame(false);
  }

  function resetSkills() {
    const refundedPoints = state.learnedSkills.filter((skillId) =>
      skillId !== "basic-strike" && skillInfo(skillId)
    ).length;

    state.player.skillPoints += refundedPoints;
    state.learnedSkills = ["basic-strike"];
    state.cooldowns = {};
    state.buffs = {};
    state.pendingSkillId = null;
    logMessage("技能已免費初始化，返還 " + refundedPoints + " 點技能點。");
    renderSkills();
    updateUI();
    saveGame(false);
  }

  function renderSkills() {
    const container = $("skillsGrid");
    container.replaceChildren();
    getAvailableSkillIds().forEach((skillId) => {
      const skill = skillInfo(skillId);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "skill-card";
      button.dataset.skill = skillId;
      const name = document.createElement("span");
      name.className = "skill-name";
      const icon = document.createElement("span");
      icon.className = "skill-icon";
      icon.textContent = skill.icon || "✦";
      const title = document.createElement("span");
      title.textContent = skill.name;
      name.append(icon, title);
      const desc = document.createElement("small");
      desc.textContent = skill.description;
      const footer = document.createElement("span");
      footer.className = "skill-footer";
      const level = document.createElement("span");
      level.className = "skill-level";
      level.textContent = hasLearned(skillId)
        ? (skill.kind === "passive" ? "被動生效" : "點擊施放")
        : "點擊學習";
      const cost = document.createElement("span");
      cost.textContent = hasLearned(skillId)
        ? (skill.kind === "passive" ? "被動" : "SP " + (skill.sp || 0))
        : "需 1 點";
      footer.append(level, cost);
      const category = document.createElement("span");
      category.className = "skill-kind";
      category.textContent = skillKindLabel(skill.kind);
      button.append(name, category, desc, footer);
      button.addEventListener("click", () => clickSkill(skillId));
      container.appendChild(button);
    });
  }

  function renderMapTabs() {
    const container = $("mapTabs");
    container.replaceChildren();
    Object.values(DATA.maps).forEach((map) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "map-tab" + (map.id === state.mapId ? " active" : "");
      button.textContent = map.name;
      button.addEventListener("click", () => switchMap(map.id));
      container.appendChild(button);
    });
  }

  function addItemSummary(item) {
    const bits = [];
    if (item.attack) bits.push("攻擊 +" + item.attack);
    if (item.hpBonus) bits.push("HP +" + item.hpBonus);
    if (item.spBonus) bits.push("SP +" + item.spBonus);
    Object.keys(item.stats || {}).forEach((statId) => bits.push(statId.toUpperCase() + " +" + item.stats[statId]));
    return bits.length ? bits.join(" · ") : item.description || "一般物品";
  }

  function compareItem(item) {
    if (!item.slot) return "";
    const oldItemId = state.equipment[item.slot];
    const oldItem = oldItemId ? itemInfo(oldItemId) : null;
    const deltaAttack = (item.attack || 0) - (oldItem ? oldItem.attack || 0 : 0);
    const parts = [];
    if (deltaAttack !== 0) parts.push("攻擊 " + (deltaAttack > 0 ? "+" : "") + deltaAttack);
    const oldStats = oldItem && oldItem.stats ? oldItem.stats : {};
    Object.keys(item.stats || {}).forEach((statId) => {
      const delta = item.stats[statId] - (oldStats[statId] || 0);
      if (delta) parts.push(statId.toUpperCase() + " " + (delta > 0 ? "+" : "") + delta);
    });
    const hpDelta = (item.hpBonus || 0) - (oldItem ? oldItem.hpBonus || 0 : 0);
    if (hpDelta) parts.push("HP " + (hpDelta > 0 ? "+" : "") + hpDelta);
    return parts.length ? "比較：" + parts.join(" / ") : "與目前裝備能力接近";
  }

  function renderEquipment() {
    const container = $("equipmentList");
    container.replaceChildren();
    [
      { id: "weapon", label: "武器" },
      { id: "armor", label: "防具" },
      { id: "accessory", label: "飾品" }
    ].forEach((slot) => {
      const row = document.createElement("div");
      row.className = "equipment-row";
      const slotLabel = document.createElement("span");
      slotLabel.className = "equip-slot";
      slotLabel.textContent = slot.label;
      const itemId = state.equipment[slot.id];
      const icon = document.createElement("span");
      icon.className = "item-icon";
      const copy = document.createElement("span");
      copy.className = "item-copy";
      if (itemId) {
        const item = itemInfo(itemId);
        icon.textContent = item.icon || "📦";
        const title = document.createElement("strong");
        title.textContent = item.name;
        const note = document.createElement("small");
        note.textContent = addItemSummary(item);
        copy.append(title, note);
      } else {
        icon.textContent = "＋";
        const title = document.createElement("strong");
        title.textContent = "空欄";
        const note = document.createElement("small");
        note.textContent = "可裝備對應類型物品";
        copy.append(title, note);
      }
      row.append(slotLabel, icon, copy);
      if (itemId) {
        const actions = document.createElement("div");
        actions.className = "item-actions";
        const button = document.createElement("button");
        button.className = "mini-button";
        button.type = "button";
        button.textContent = "卸下";
        button.addEventListener("click", () => unequipItem(slot.id));
        actions.appendChild(button);
        row.appendChild(actions);
      }
      container.appendChild(row);
    });
  }

  function renderInventory() {
    const container = $("inventoryList");
    container.replaceChildren();
    const items = state.inventory.filter((entry) => entry.qty > 0).map((entry) => ({ id: entry.id, qty: entry.qty }));
    if (state.player.potions > 0) items.unshift({ id: "red-potion", qty: state.player.potions });
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "small-note";
      empty.textContent = "背包目前是空的。狩獵怪物可取得物品。";
      container.appendChild(empty);
      return;
    }
    items.forEach((entry) => {
      const item = itemInfo(entry.id);
      const row = document.createElement("div");
      row.className = "inventory-row";
      const icon = document.createElement("span");
      icon.className = "item-icon";
      icon.textContent = item.icon || "📦";
      const copy = document.createElement("span");
      copy.className = "item-copy";
      const title = document.createElement("strong");
      title.textContent = item.name + " ×" + entry.qty;
      const note = document.createElement("small");
      note.textContent = item.slot ? addItemSummary(item) + " · " + compareItem(item) : item.description || "消耗品";
      copy.append(title, note);
      const actions = document.createElement("div");
      actions.className = "item-actions";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mini-button" + (item.slot ? " primary" : "");
      button.textContent = item.slot ? "裝備" : "使用";
      button.addEventListener("click", () => item.slot ? equipItem(item.id) : useInventoryItem(item.id));
      actions.appendChild(button);
      row.append(icon, copy, actions);
      container.appendChild(row);
    });
  }

  function renderMonsterBook() {
    const container = $("monsterBook");
    container.replaceChildren();
    Object.values(DATA.monsters).forEach((monster) => {
      const row = document.createElement("div");
      row.className = "monster-entry";
      const icon = document.createElement("span");
      icon.className = "monster-icon";
      icon.textContent = monsterGlyph(monster.id);
      const copy = document.createElement("span");
      copy.className = "monster-copy";
      const title = document.createElement("strong");
      title.textContent = monster.name + " · Lv. " + monster.level;
      const statLine = document.createElement("small");
      statLine.textContent = huntDifficultyLabel(monster) + " · HP " + monster.hp + " · EXP " + monster.exp + " · ATK " + monster.attack;
      const drops = document.createElement("span");
      drops.className = "drop-lines";
      drops.textContent = "掉落：" + monster.drops.map((drop) => itemInfo(drop.id).name + " " + Math.round(drop.chance * 100) + "%").join("、");
      copy.append(title, statLine, drops);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mini-button";
      button.textContent = "追蹤";
      button.addEventListener("click", () => trackMonster(monster.id));
      row.append(icon, copy, button);
      container.appendChild(row);
    });
  }

  function renderShop() {
    const container = $("shopList");
    container.replaceChildren();
    ["red-potion", "blue-potion", "green-herb", "iron-sword", "wand", "short-bow", "leather-armor", "power-ring"].forEach((id) => {
      const item = itemInfo(id);
      const row = document.createElement("div");
      row.className = "shop-row";
      const icon = document.createElement("span");
      icon.className = "item-icon";
      icon.textContent = item.icon || "📦";
      const copy = document.createElement("span");
      copy.className = "item-copy";
      const title = document.createElement("strong");
      title.textContent = item.name;
      const note = document.createElement("small");
      note.textContent = addItemSummary(item) + " · " + fmt(item.price || 0) + " Zeny";
      copy.append(title, note);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mini-button primary";
      button.textContent = "購買";
      button.disabled = state.player.gold < (item.price || 0);
      button.addEventListener("click", () => buyItem(id));
      row.append(icon, copy, button);
      container.appendChild(row);
    });
  }

  function renderAllPanels() {
    renderMapTabs();
    renderJobs();
    renderStats();
    renderSkills();
    renderEquipment();
    renderInventory();
    renderMonsterBook();
    renderShop();
    updateUI();
  }

  function unlockStatUI() {
    $("statPoints").textContent = state.player.statPoints;
    $("skillPoints").textContent = state.player.skillPoints;
  }

  function updateUI() {
    if (!state.isReady) return;
    const p = state.player;
    const hpMax = maxHp();
    const spMax = maxSp();
    p.hp = clamp(p.hp, 0, hpMax);
    p.sp = clamp(p.sp, 0, spMax);
    const job = currentJob();
    $("mapTitle").textContent = currentMap().name;
    $("mapSubtitle").textContent = currentMap().type === "town" ? "安全城鎮" : "狩獵區域";
    $("miniMapLabel").textContent = currentMap().shortName;
    $("mapHint").textContent = currentMap().type === "town"
      ? "城鎮是安全區，可以補給、轉職與調整能力。"
      : "點擊怪物即可自動追擊並攻擊；使用技能能更快打敗怪物。";
    $("jobLabel").textContent = "Lv. " + p.level + " " + job.name + (job.tier === 2 ? "（二轉）" : job.tier === 1 ? "（一轉）" : "");
    $("jobExpLabel").textContent = "職業定位：" + (job.role || "新手冒險者");
    $("goldLabel").textContent = fmt(p.gold);
    $("hpText").textContent = Math.ceil(p.hp) + " / " + hpMax;
    $("hpFill").style.width = (100 * p.hp / hpMax) + "%";
    $("spText").textContent = Math.ceil(p.sp) + " / " + spMax;
    $("spFill").style.width = (100 * p.sp / spMax) + "%";
    $("expText").textContent = fmt(p.exp) + " / " + fmt(baseExpNeeded());
    $("expFill").style.width = (100 * p.exp / baseExpNeeded()) + "%";
    $("attackLabel").textContent = attackPower();
    const interval = attackInterval();
    $("speedLabel").textContent = interval < 0.5 ? "快速" : interval < 0.75 ? "偏快" : "普通";
    $("critLabel").textContent = Math.floor(critChance()) + "%";
    $("potionLabel").textContent = p.potions + " 瓶";
    const potionButton = $("potionButton");
    potionButton.textContent = p.potions > 0 ? "✚ 使用紅色藥水（" + p.potions + "）" : "紅色藥水已用完";
    potionButton.disabled = p.potions <= 0;
    unlockStatUI();

    const target = targetMonster();
    if (target) {
      const info = monsterInfo(target.type);
      $("targetIcon").textContent = monsterGlyph(target.type);
      $("targetName").textContent = target.name;
      $("targetLevel").textContent = "Lv. " + target.level + " · ATK " + target.attack + " · DEF " + target.defense;
      $("targetHpText").textContent = target.hp + " / " + target.maxHp;
      $("targetHpFill").style.width = (100 * target.hp / target.maxHp) + "%";
      $("targetIcon").style.color = info.color;
    } else {
      $("targetIcon").textContent = currentMap().type === "town" ? "⌂" : "●";
      $("targetName").textContent = "尚未選取目標";
      $("targetLevel").textContent = state.idleEnabled ? "放置模式：尋找目標中" : "點擊地圖中的怪物";
      $("targetHpText").textContent = "—";
      $("targetHpFill").style.width = "0%";
    }

    $("idleStateBadge").textContent = state.idleEnabled ? "狩獵中" : "未啟動";
    $("idleStateBadge").classList.toggle("is-active", state.idleEnabled);
    $("idleToggleButton").textContent = state.idleEnabled ? "Ⅱ 停止放置狩獵" : "▶ 開啟放置狩獵";
    $("idleToggleButton").classList.toggle("is-active", state.idleEnabled);
    $("autoPotionToggle").checked = state.idleSettings.autoPotion;
    $("autoPotionThreshold").value = String(state.idleSettings.potionThreshold);
    $("targetPriority").value = state.idleSettings.priority;
    $("idleKills").textContent = fmt(state.idleStats.kills);
    $("idleExp").textContent = fmt(state.idleStats.exp);
    $("idleGold").textContent = fmt(state.idleStats.gold);
    if (state.lastOfflineSummary && state.lastOfflineSummary.seconds > 0) {
      const sum = state.lastOfflineSummary;
      const duration = sum.seconds >= 3600
        ? Math.floor(sum.seconds / 3600) + " 小時 " + Math.floor((sum.seconds % 3600) / 60) + " 分"
        : Math.max(1, Math.floor(sum.seconds / 60)) + " 分鐘";
      $("idleSummary").textContent = "上次離線 " + duration + "：擊倒 " + sum.kills + " 隻，獲得 " + fmt(sum.exp) + " EXP、" + fmt(sum.gold) + " Zeny、藥水 ×" + sum.potions + "。";
    } else if (state.idleEnabled && currentMap().type === "town") {
      $("idleSummary").textContent = "目前在安全城鎮，沒有怪物。切換到狩獵地圖即可自動戰鬥。";
    } else {
      $("idleSummary").textContent = state.idleEnabled
        ? "放置狩獵已啟動。離開前會自動儲存，回來時最多結算 8 小時。"
        : "尚未啟動。開啟後即可自動狩獵；離線收益最多計算 8 小時。";
    }
    $("shopPanel").hidden = currentMap().shop !== true;
    $("shopList").querySelectorAll("button").forEach((button) => {
      const row = button.closest(".shop-row");
      if (!row) return;
      const itemTitle = row.querySelector(".item-copy strong");
      const item = Object.values(DATA.items).find((entry) => entry.name === itemTitle.textContent);
      if (item) button.disabled = p.gold < (item.price || 0);
    });
    $("skillsGrid").querySelectorAll("[data-skill]").forEach((button) => {
      const id = button.dataset.skill;
      const skill = skillInfo(id);
      if (!skill) return;
      const learned = hasLearned(id);
      button.classList.toggle("learned", learned);
      button.classList.toggle("ready", learned && (state.cooldowns[id] || 0) <= 0);
      const levelNode = button.querySelector(".skill-level");
      const costNode = button.querySelector(".skill-footer span:last-child");
      if (levelNode) levelNode.textContent = learned ? (skill.kind === "passive" ? "被動生效" : "點擊施放") : "點擊學習";
      if (costNode) costNode.textContent = !learned ? "需 1 點" : skill.kind === "passive" ? "被動" : (state.cooldowns[id] > 0 ? "冷卻 " + state.cooldowns[id].toFixed(1) + " 秒" : "SP " + (skill.sp || 0));
      button.disabled = !learned && p.skillPoints <= 0;
    });
    const activeBuffs = Object.keys(state.buffs).filter((key) => state.buffs[key] > 0);
    $("buffStatus").textContent = activeBuffs.length
      ? activeBuffs.map((key) => (key === "defense" ? "防禦強化" : "集中強化") + " " + state.buffs[key].toFixed(0) + " 秒").join(" · ")
      : "目前沒有生效中的增益。";
  }

  function setTarget(monster) {
    state.targetId = monster ? monster.id : null;
    state.moveTarget = null;
    window.dispatchEvent(new CustomEvent("ro:target-change", { detail: { targetId: state.targetId, type: monster ? monster.type : null } }));
    if (monster) {
      logMessage("鎖定目標：" + monster.name + "。角色會自動接近並攻擊。", "muted");
    }
    updateUI();
  }

  function bestTarget() {
    const living = state.monsters.filter((monster) => monster.hp > 0 && !(window.RO_EXPANSION && typeof window.RO_EXPANSION.shouldAvoidMonster === "function" && window.RO_EXPANSION.shouldAvoidMonster(monster, state.player)));
    if (!living.length) return null;
    const priority = state.idleSettings.priority;
    living.sort((a, b) => {
      if (priority === "weakest") return a.hp - b.hp;
      if (priority === "exp") return b.exp - a.exp;
      return distance(state.player, a) - distance(state.player, b);
    });
    return living[0];
  }

  function switchMap(mapId, options) {
    if (!DATA.maps[mapId]) return;
    const map = DATA.maps[mapId];
    state.mapId = mapId;
    if (window.RO_EXPANSION && typeof window.RO_EXPANSION.onMapChange === "function") window.RO_EXPANSION.onMapChange(mapId);
    window.dispatchEvent(new CustomEvent("ro:map-change", { detail: { mapId: mapId, name: map.name, type: map.type } }));
    state.player.x = options && Number.isFinite(options.x) ? options.x : map.spawn.x;
    state.player.y = options && Number.isFinite(options.y) ? options.y : map.spawn.y;
    state.monsters = makeMonsters(mapId);
    state.moveTarget = null;
    state.targetId = null;
    state.pendingSkillId = null;
    logMessage("抵達地圖：「" + map.name + "」。");
    renderMapTabs();
    renderMonsterBook();
    renderShop();
    updateUI();
    saveGame(false);
  }

  function trackMonster(type) {
    let mapId = state.mapId;
    if (!currentMap().spawns.some((spawn) => spawn.type === type)) {
      const suitable = Object.values(DATA.maps).find((map) => map.spawns.some((spawn) => spawn.type === type));
      if (!suitable) return;
      mapId = suitable.id;
      switchMap(mapId);
    }
    const monster = state.monsters.filter((entry) => entry.type === type && entry.hp > 0).sort((a, b) => distance(state.player, a) - distance(state.player, b))[0];
    if (monster) setTarget(monster);
    else logMessage("這種怪物正在重生，請稍等片刻。", "muted");
  }

  function circleHitsObstacle(x, y, radius) {
    if (currentMap().type === "town") return false;
    return obstacles.some((obstacle) => Math.hypot(x - obstacle.x, y - obstacle.y) < radius + obstacle.r);
  }

  function movePlayer(dx, dy, dt) {
    const player = state.player;
    const length = Math.hypot(dx, dy);
    if (!length) return;
    dx /= length;
    dy /= length;
    player._facing = dx < -0.08 ? -1 : dx > 0.08 ? 1 : (player._facing || 1);
    const speed = 178;
    const nx = clamp(player.x + dx * speed * dt, 22, WORLD_W - 22);
    const ny = clamp(player.y + dy * speed * dt, 26, WORLD_H - 26);
    if (!circleHitsObstacle(nx, player.y, 10)) player.x = nx;
    if (!circleHitsObstacle(player.x, ny, 10)) player.y = ny;
    state.walkFrame += dt * 10;
  }

  function usePotion(automatic) {
    const player = state.player;
    const hpMax = maxHp();
    if (player.potions <= 0) {
      if (!automatic) logMessage("紅色藥水不足，可以到普隆德拉商店補給。", "muted");
      return false;
    }
    if (player.hp >= hpMax) {
      if (!automatic) logMessage("HP 已經全滿，先保留藥水吧。", "muted");
      return false;
    }
    player.potions -= 1;
    const healing = (DATA.items["red-potion"] && DATA.items["red-potion"].healing) || MINI_BALANCE.potionHeal;
    const restored = Math.min(healing, hpMax - player.hp);
    player.hp += restored;
    logMessage((automatic ? "自動使用" : "使用") + "紅色藥水，恢復 " + Math.round(restored) + " HP。", automatic ? "muted" : undefined);
    updateUI();
    if (!automatic) saveGame(false);
    return true;
  }

  function useInventoryItem(itemId) {
    const item = itemInfo(itemId);
    if (itemId === "red-potion") {
      usePotion(false);
      return;
    }
    if (item.slot) {
      equipItem(itemId);
      return;
    }
    if (!removeInventory(itemId, 1)) {
      logMessage("背包中沒有這個物品。", "muted");
      return;
    }
    if (item.healing) {
      const restored = Math.min(item.healing, maxHp() - state.player.hp);
      state.player.hp += restored;
      logMessage("使用" + item.name + "，恢復 " + restored + " HP。");
    } else if (item.spHealing) {
      const restored = Math.min(item.spHealing, maxSp() - state.player.sp);
      state.player.sp += restored;
      logMessage("使用" + item.name + "，恢復 " + restored + " SP。");
    } else {
      logMessage("目前無法使用" + item.name + "。", "muted");
      addInventory(itemId, 1);
      return;
    }
    updateUI();
    renderInventory();
    saveGame(false);
  }

  function equipItem(itemId) {
    const item = itemInfo(itemId);
    if (!item.slot || !removeInventory(itemId, 1)) {
      logMessage("背包中沒有可裝備的物品。", "muted");
      return;
    }
    const previous = state.equipment[item.slot];
    const hpBefore = maxHp();
    const spBefore = maxSp();
    if (previous) addInventory(previous, 1);
    state.equipment[item.slot] = itemId;
    state.player.hp = clamp(state.player.hp + (maxHp() - hpBefore), 1, maxHp());
    state.player.sp = clamp(state.player.sp + (maxSp() - spBefore), 0, maxSp());
    logMessage("裝備了" + item.name + "。");
    renderEquipment();
    renderInventory();
    renderStats();
    updateUI();
    saveGame(false);
  }

  function unequipItem(slot) {
    const itemId = state.equipment[slot];
    if (!itemId) return;
    const hpBefore = maxHp();
    const spBefore = maxSp();
    addInventory(itemId, 1);
    state.equipment[slot] = null;
    state.player.hp = clamp(state.player.hp + (maxHp() - hpBefore), 1, maxHp());
    state.player.sp = clamp(state.player.sp + (maxSp() - spBefore), 0, maxSp());
    logMessage("卸下" + itemInfo(itemId).name + "。", "muted");
    renderEquipment();
    renderInventory();
    renderStats();
    updateUI();
    saveGame(false);
  }

  function buyItem(itemId) {
    const item = itemInfo(itemId);
    const price = Math.max(0, item.price || 0);
    if (state.player.gold < price) {
      logMessage("Zeny 不足，無法購買" + item.name + "。", "muted");
      return;
    }
    state.player.gold -= price;
    addInventory(itemId, 1);
    logMessage("購買了" + item.name + "，花費 " + price + " Zeny。");
    renderInventory();
    renderShop();
    updateUI();
    saveGame(false);
  }

  function learnSkill(skillId) {
    const skill = skillInfo(skillId);
    if (!skill || !hasSkill(skillId)) return;
    if (hasLearned(skillId)) return;
    if (state.player.skillPoints <= 0) {
      logMessage("技能點不足，提升 Base Level 就能獲得技能點。", "muted");
      return;
    }
    state.player.skillPoints -= 1;
    state.learnedSkills.push(skillId);
    logMessage("學會技能「" + skill.name + "」。");
    renderSkills();
    updateUI();
    saveGame(false);
  }

  function clickSkill(skillId) {
    const skill = skillInfo(skillId);
    if (!skill || !hasSkill(skillId)) return;
    if (!hasLearned(skillId)) {
      learnSkill(skillId);
      return;
    }
    if (skill.kind === "passive") {
      logMessage("被動技能「" + skill.name + "」已生效。", "muted");
      return;
    }
    if ((state.cooldowns[skillId] || 0) > 0) {
      logMessage("技能尚未冷卻完成，請稍候。", "muted");
      return;
    }
    if (state.player.sp < (skill.sp || 0)) {
      logMessage("SP 不足，請使用藍色藥水或等待恢復。", "muted");
      return;
    }
    if (skill.zeny && state.player.gold < skill.zeny) {
      logMessage("Zeny 不足，無法施放" + skill.name + "。", "muted");
      return;
    }
    if (skill.kind === "heal" || skill.kind === "buff") {
      performSkill(skill, null);
      return;
    }
    let target = targetMonster();
    if (!target) target = bestTarget();
    if (!target) {
      logMessage("這張地圖沒有可攻擊的怪物。", "muted");
      return;
    }
    state.targetId = target.id;
    state.pendingSkillId = skillId;
    state.moveTarget = null;
    if (distance(state.player, target) <= 33) {
      performSkill(skill, target);
    } else {
      logMessage("前往目標施放「" + skill.name + "」。", "muted");
    }
    updateUI();
  }

  function performSkill(skill, target) {
    const id = skill.id;
    if ((state.cooldowns[id] || 0) > 0) return false;
    if (state.player.sp < (skill.sp || 0)) {
      logMessage("SP 不足，無法施放" + skill.name + "。", "muted");
      state.pendingSkillId = null;
      return false;
    }
    if (skill.zeny && state.player.gold < skill.zeny) {
      logMessage("Zeny 不足，無法施放" + skill.name + "。", "muted");
      state.pendingSkillId = null;
      return false;
    }
    state.player._castUntil = performance.now() + 520;
    spawnEffect(state.player.x, state.player.y - 22, "cast", "#aee7ff", skill.name);
    window.dispatchEvent(new CustomEvent("ro:skill", { detail: { skillId: id, name: skill.name } }));
    state.player.sp -= skill.sp || 0;
    if (skill.zeny) state.player.gold -= skill.zeny;
    state.cooldowns[id] = skill.cooldown || 1;
    state.pendingSkillId = null;

    if (skill.kind === "heal") {
      const amount = Math.floor((skill.power || 25) + totalStat("int") * 2.2);
      const healed = Math.min(amount, maxHp() - state.player.hp);
      state.player.hp += healed;
      logMessage("施放" + skill.name + "，恢復 " + healed + " HP。");
      playSound("skill");
    } else if (skill.kind === "buff") {
      state.buffs[skill.buff || "focus"] = skill.duration || 10;
      logMessage("施放" + skill.name + "，效果持續 " + (skill.duration || 10) + " 秒。");
      playSound("skill");
    } else {
      if (!target || target.hp <= 0) {
        target = bestTarget();
      }
      if (!target) {
        logMessage("沒有有效目標，技能未能命中。", "muted");
        state.player.sp = Math.min(maxSp(), state.player.sp + (skill.sp || 0));
        return false;
      }
      const targetList = skill.kind === "aoe"
        ? state.monsters.filter((monster) => monster.hp > 0 && distance(monster, target) <= (skill.radius || 90))
        : [target];
      const stat = skill.kind === "magic" ? totalStat("int") : attackPower();
      targetList.forEach((monster) => {
        let damage = Math.max(1, Math.floor(stat * (skill.multiplier || 1.5) - monster.defense));
        if (state.buffs.focus) damage = Math.floor(damage * 1.18);
        if (skill.dot) monster.poisonUntil = Date.now() + 4000;
        applyDamage(monster, damage, skill.name);
      });
      logMessage("施放" + skill.name + "，命中 " + targetList.length + " 個目標。");
      playSound("skill");
    }
    updateUI();
    saveGame(false);
    return true;
  }

  function autoPotionIfNeeded() {
    if (!state.idleEnabled || !state.idleSettings.autoPotion) return;
    const ratio = state.player.hp / maxHp() * 100;
    if (ratio <= state.idleSettings.potionThreshold && state.player.potions > 0 && state.player.hp < maxHp()) usePotion(true);
  }

  function playerHit(monster) {
    let damage = Math.max(1, monster.attack - Math.floor(totalStat("vit") * 0.3));
    if (state.buffs.defense) damage = Math.max(1, Math.floor(damage * 0.5));
    if (Math.random() * 100 < Math.min(25, totalStat("agi") * 0.24)) {
      logMessage("你閃過了" + monster.name + "的攻擊。", "muted");
      return;
    }
    if (monster.boss && Math.random() < 0.34) {
      damage = Math.floor(damage * 1.7);
      logMessage(monster.name + "施放「" + (monster.specialAttack || "MVP 強擊") + "」！", "muted");
      spawnEffect(state.player.x, state.player.y, "burst", "#ff8b8b", "BOSS SKILL");
    }
    monster._attackUntil = performance.now() + 260;
    monster._facing = state.player.x < monster.x ? -1 : 1;
    state.player.hp = Math.max(0, state.player.hp - damage);
    state.player._hurtUntil = performance.now() + 280;
    window.dispatchEvent(new CustomEvent("ro:player-hurt", { detail: { damage: damage, mapId: state.mapId } }));
    spawnEffect(state.player.x, state.player.y - 15, "text", "#ffaaa6", "-" + damage);
    logMessage(monster.name + "攻擊你，損失 " + damage + " HP。", "muted");
    if (state.player.hp <= 0) {
      state.player.hp = Math.ceil(maxHp() * 0.6);
      state.player.sp = Math.ceil(maxSp() * 0.5);
      state.player.x = currentMap().spawn.x;
      state.player.y = currentMap().spawn.y;
      state.targetId = null;
      state.pendingSkillId = null;
      state.moveTarget = null;
      logMessage("你暫時失去意識，回到地圖入口並恢復部分 HP / SP。");
    }
  }

  function applyDamage(monster, damage, source) {
    if (!monster || monster.hp <= 0) return;
    monster.hp = Math.max(0, monster.hp - damage);
    monster._hurtUntil = performance.now() + 260;
    window.dispatchEvent(new CustomEvent("ro:monster-hurt", { detail: { id: monster.id, type: monster.type, x: monster.x, y: monster.y, damage: damage } }));
    spawnEffect(monster.x, monster.y - (monster.boss ? 42 : 22), "text", "#fff0bd", String(damage));
    if (monster.hp > 0) {
      if (source && Math.random() < 0.28) logMessage(source + "造成 " + damage + " 傷害。", "muted");
      return;
    }
    killMonster(monster);
  }

  function rollDrops(monster, quiet) {
    const info = monsterInfo(monster.type);
    const won = [];
    (info.drops || []).forEach((drop) => {
      const chance = clamp(drop.chance + (totalStat("luk") - 5) * 0.001, 0, 0.7);
      if (Math.random() < chance) {
        const qty = drop.quantity || 1;
        addInventory(drop.id, qty);
        won.push({ id: drop.id, qty });
        state.idleStats.drops += state.idleEnabled ? qty : 0;
        if (!quiet) logMessage("掉落：" + itemInfo(drop.id).name + " ×" + qty + "。");
      }
    });
    if (won.length && !quiet) playSound("drop");
    return won;
  }

  function killMonster(monster, quiet) {
    if (!monster || monster.hp !== 0 || monster._rewarded) return;
    monster._rewarded = true;
    monster._deathAt = performance.now();
    spawnEffect(monster.x, monster.y - (monster.boss ? 36 : 18), "death", monster.color || "#f6d5e0", "");
    const goldBase = Math.floor(rand(monster.gold[0], monster.gold[1] + 1));
    const isMerchant = currentJob().family === "merchant" || hasLearned("discount");
    const goldEarned = Math.floor(goldBase * (isMerchant ? 1.15 : 1));
    state.player.gold += goldEarned;
    expReward(monster.exp, quiet === true);
    jobExpReward(Math.max(1, Math.floor(monster.exp * 0.65)), quiet === true);
    const drops = rollDrops(monster, quiet === true);
    window.dispatchEvent(new CustomEvent("ro:monster-killed", { detail: {
      monster: { id: monster.id, type: monster.type, name: monster.name, level: monster.level, exp: monster.exp, boss: monster.boss === true },
      gold: goldEarned, exp: monster.exp, drops: drops
    } }));
    if (state.idleEnabled) {
      state.idleStats.kills += 1;
      state.idleStats.exp += monster.exp;
      state.idleStats.gold += goldEarned;
    }
    monster.respawnAt = Date.now() + 9000;
    if (!quiet) {
      logMessage("擊倒" + monster.name + "！獲得 " + monster.exp + " EXP、" + goldEarned + " Zeny。");
      playSound("attack");
    }
    if (state.targetId === monster.id) {
      state.targetId = null;
      state.pendingSkillId = null;
    }
    state.moveTarget = null;
    updateUI();
  }

  function attackMonster(monster) {
    if (!monster || monster.hp <= 0 || state.attackCooldown > 0) return;
    state.attackCooldown = attackInterval();
    state.player._facing = monster.x < state.player.x ? -1 : 1;
    state.player._attackStart = performance.now();
    state.player._attackUntil = state.player._attackStart + 260;
    spawnEffect(monster.x, monster.y - (monster.boss ? 34 : 14), "slash", "#ffe6a3", "");
    window.dispatchEvent(new CustomEvent("ro:attack", { detail: { target: monster.type } }));
    const critical = Math.random() * 100 < critChance();
    // Basic attacks always connect; damage is predictable apart from occasional critical hits.
    let damage = Math.max(1, Math.floor(attackPower() - monster.defense));
    if (state.buffs.focus) damage = Math.floor(damage * 1.1);
    if (critical) damage = Math.floor(damage * 1.5);
    applyDamage(monster, damage, critical ? "暴擊" : "普通攻擊");
    if (critical && monster.hp > 0) logMessage("暴擊！造成 " + damage + " 傷害。", "muted");
  }

  function update(dt) {
    if (window.RO_EXPANSION && typeof window.RO_EXPANSION.tick === "function") {
      const action = window.RO_EXPANSION.tick({ player: state.player, mapId: state.mapId, mapType: currentMap().type, maxHp: maxHp(), maxSp: maxSp(), dt: dt, idleEnabled: state.idleEnabled });
      if (action && action.switchTo && DATA.maps[action.switchTo] && action.switchTo !== state.mapId) switchMap(action.switchTo);
      if (action && action.heal) usePotion(true);
    }
    state.attackCooldown = Math.max(0, state.attackCooldown - dt);
    Object.keys(state.cooldowns).forEach((id) => { state.cooldowns[id] = Math.max(0, state.cooldowns[id] - dt); });
    Object.keys(state.buffs).forEach((id) => {
      state.buffs[id] = Math.max(0, state.buffs[id] - dt);
      if (state.buffs[id] <= 0) delete state.buffs[id];
    });

    state.spRegenAccumulator += dt;
    if (state.spRegenAccumulator >= 1) {
      const ticks = Math.floor(state.spRegenAccumulator);
      state.spRegenAccumulator -= ticks;
      state.player.sp = Math.min(maxSp(), state.player.sp + ticks * (1 + Math.floor(totalStat("int") / 20)));
    }
    autoPotionIfNeeded();
    if (state.idleEnabled && !targetMonster() && !state.moveTarget && currentMap().type !== "town") {
      const next = bestTarget();
      if (next) state.targetId = next.id;
    }

    const target = targetMonster();
    if (target) {
      const range = 32;
      if (distance(state.player, target) > range) {
        movePlayer(target.x - state.player.x, target.y - state.player.y, dt);
      } else if (state.pendingSkillId) {
        const skill = skillInfo(state.pendingSkillId);
        if (skill) performSkill(skill, target);
        else attackMonster(target);
      } else {
        const autoSkillId = state.idleEnabled && window.RO_EXPANSION && typeof window.RO_EXPANSION.getAutoSkillId === "function"
          ? window.RO_EXPANSION.getAutoSkillId({ player: state.player, learnedSkills: state.learnedSkills, cooldowns: state.cooldowns, target: target, mapId: state.mapId })
          : null;
        const autoSkill = autoSkillId ? skillInfo(autoSkillId) : null;
        if (autoSkill && state.player.sp >= (autoSkill.sp || 0) && (state.cooldowns[autoSkillId] || 0) <= 0) performSkill(autoSkill, target);
        else attackMonster(target);
      }
    } else if (state.moveTarget) {
      const gap = distance(state.player, state.moveTarget);
      if (gap < 5) state.moveTarget = null;
      else movePlayer(state.moveTarget.x - state.player.x, state.moveTarget.y - state.player.y, dt);
    }

    state.monsters.forEach((monster) => {
      if (monster.hp <= 0) {
        if (monster.respawnAt && Date.now() >= monster.respawnAt) {
          monster.hp = monster.maxHp;
          monster.x = monster.spawnX;
          monster.y = monster.spawnY;
          monster.respawnAt = 0;
          monster._rewarded = false;
          if (!state.idleEnabled) logMessage("新的" + monster.name + "出現了。", "muted");
        }
        return;
      }
      if (monster.poisonUntil > Date.now()) {
        monster._poisonTick = (monster._poisonTick || 0) + dt;
        if (monster._poisonTick >= 1) {
          monster._poisonTick = 0;
          monster.hp = Math.max(0, monster.hp - Math.max(1, Math.floor(attackPower() * 0.12)));
          if (monster.hp <= 0) {
            killMonster(monster);
            return;
          }
        }
      } else if (monster.poisonUntil) {
        monster.poisonUntil = 0;
        monster._poisonTick = 0;
      }

      const gap = distance(state.player, monster);
      if (currentMap().type !== "town" && gap < 215 && gap > 37 && state.targetId !== monster.id) {
        const move = 35 * dt;
        const nx = clamp(monster.x + ((state.player.x - monster.x) / gap) * move, 22, WORLD_W - 22);
        const ny = clamp(monster.y + ((state.player.y - monster.y) / gap) * move, 26, WORLD_H - 26);
        if (!circleHitsObstacle(nx, ny, 9)) { monster.x = nx; monster.y = ny; monster._walkFrame = (monster._walkFrame || 0) + dt * 11; monster._facing = state.player.x < monster.x ? -1 : 1; }
      }
      monster.cooldown = Math.max(0, monster.cooldown - dt);
      if (currentMap().type !== "town" && gap < 35 && monster.cooldown <= 0) {
        monster.cooldown = 1.45;
        playerHit(monster);
      }
    });
    if (state.idleEnabled && !targetMonster() && !state.moveTarget && currentMap().type === "town" && !state.idleSafeLogged) {
      logMessage("目前是安全城鎮，放置狩獵會在切換到狩獵地圖後繼續。", "muted");
      state.idleSafeLogged = true;
    }
    if (currentMap().type !== "town") state.idleSafeLogged = false;
  }

  function switchMapFromPortal(portal) {
    switchMap(portal.to, { x: portal.tx, y: portal.ty });
  }

  function canvasPoint(event, targetCanvas, width, height) {
    const rect = targetCanvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) * width / rect.width, 0, width),
      y: clamp((event.clientY - rect.top) * height / rect.height, 0, height)
    };
  }

  function handleWorldClick(event) {
    if (!state.isReady) return;
    event.preventDefault();
    const point = canvasPoint(event, canvas, WORLD_W, WORLD_H);
    const portal = currentMap().portals.find((entry) => Math.hypot(point.x - entry.x, point.y - entry.y) < 34);
    if (portal) {
      switchMapFromPortal(portal);
      return;
    }
    let best = null;
    let bestDistance = 60;
    state.monsters.forEach((monster) => {
      if (monster.hp <= 0) return;
      const dist = Math.hypot(point.x - monster.x, point.y - monster.y);
      const hitRange = monster.boss ? 60 : 38;
      if (dist < hitRange && dist < bestDistance) { best = monster; bestDistance = dist; }
    });
    if (best) {
      state.pendingSkillId = null;
      setTarget(best);
    } else {
      state.targetId = null;
      state.pendingSkillId = null;
      state.moveTarget = { x: point.x, y: point.y };
      updateUI();
    }
  }

  function handleMiniMapClick(event) {
    const point = canvasPoint(event, miniCanvas, 180, 112);
    state.targetId = null;
    state.pendingSkillId = null;
    state.moveTarget = {
      x: clamp(point.x / 180 * WORLD_W, 22, WORLD_W - 22),
      y: clamp(point.y / 112 * WORLD_H, 25, WORLD_H - 25)
    };
  }

  function drawGround() {
    const map = currentMap();
    const image = state.images["map:" + map.id];
    if (image) {
      ctx.drawImage(image, 0, 0, WORLD_W, WORLD_H);
      return;
    }
    ctx.fillStyle = map.ground;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let y = 0; y < WORLD_H; y += 40) {
      for (let x = 0; x < WORLD_W; x += 40) {
        const seed = Math.abs(Math.sin((x + 12) * 12.9898 + (y + 5) * 78.233) * 43758.5453) % 1;
        const color = map.type === "cave"
          ? (seed > 0.65 ? "#454f60" : seed < 0.15 ? "#343e4e" : map.ground)
          : map.type === "town"
            ? (seed > 0.72 ? "#94b18d" : seed < 0.15 ? "#80a481" : map.ground)
            : map.type === "forest"
              ? (seed > 0.65 ? "#3c7653" : seed < 0.14 ? "#2f6146" : map.ground)
              : (seed > 0.68 ? "#528f5b" : seed < 0.16 ? "#4a8253" : map.ground);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 40, 40);
        if (seed > 0.81 && map.type !== "cave") {
          ctx.fillStyle = map.type === "town" ? "rgba(232,219,168,.16)" : "rgba(179,218,136,.16)";
          ctx.fillRect(x + seed * 20, y + 12, 3, 2);
          ctx.fillRect(x + 25, y + 29, 2, 3);
        }
        if (map.type === "cave" && seed > 0.84) {
          ctx.fillStyle = "rgba(177,192,207,.12)";
          ctx.fillRect(x + 8, y + 5, 13, 3);
        }
      }
    }
    if (map.type === "field") {
      ctx.save();
      ctx.strokeStyle = "rgba(221,203,142,.15)";
      ctx.lineWidth = 58;
      ctx.beginPath();
      ctx.moveTo(-20, 310);
      ctx.bezierCurveTo(160, 270, 245, 344, 390, 315);
      ctx.bezierCurveTo(580, 278, 725, 328, 980, 286);
      ctx.stroke();
      ctx.strokeStyle = "rgba(234,221,170,.12)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    if (map.type === "town") {
      drawBuilding(150, 100, 190, 112, "#9d754e", "#c9a77b", "道具店");
      drawBuilding(615, 108, 205, 120, "#6b796e", "#a2b39e", "冒險者公會");
      ctx.fillStyle = "rgba(228,212,164,.17)";
      ctx.fillRect(0, 285, WORLD_W, 104);
      ctx.fillRect(410, 0, 118, WORLD_H);
      ctx.strokeStyle = "rgba(248,231,176,.2)";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 285, WORLD_W, 104);
      ctx.strokeRect(410, 0, 118, WORLD_H);
    }
    if (map.type === "forest") {
      ctx.fillStyle = "rgba(15,42,28,.2)";
      for (let x = 40; x < WORLD_W; x += 110) {
        ctx.fillRect(x, 0, 7, WORLD_H);
      }
    }
    ctx.fillStyle = "rgba(27,69,45,.23)";
    ctx.fillRect(0, 0, WORLD_W, 10);
    ctx.fillRect(0, WORLD_H - 10, WORLD_W, 10);
  }

  function drawBuilding(x, y, w, h, wall, roof, label) {
    ctx.fillStyle = "rgba(19,31,27,.25)";
    ctx.fillRect(x + 8, y + h, w, 12);
    ctx.fillStyle = wall;
    ctx.fillRect(x, y + 20, w, h - 20);
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(x - 12, y + 24);
    ctx.lineTo(x + w * 0.15, y - 6);
    ctx.lineTo(x + w * 0.85, y - 6);
    ctx.lineTo(x + w + 12, y + 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#5c4635";
    ctx.fillRect(x + w * 0.43, y + h - 38, w * 0.15, 38);
    ctx.fillStyle = "rgba(255,244,206,.72)";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y + h - 48);
  }

  function drawTree(x, y, scale) {
    const s = scale || 1;
    ctx.fillStyle = "rgba(24,48,32,.25)";
    ctx.beginPath(); ctx.ellipse(x + 2, y + 12 * s, 24 * s, 12 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#72543c"; ctx.fillRect(x - 5 * s, y - 2 * s, 10 * s, 23 * s);
    ctx.fillStyle = "#2c6942"; ctx.beginPath(); ctx.arc(x, y - 11 * s, 23 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#35794b"; ctx.beginPath(); ctx.arc(x - 9 * s, y - 18 * s, 15 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4d985a"; ctx.beginPath(); ctx.arc(x + 7 * s, y - 22 * s, 13 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(183,222,135,.24)"; ctx.fillRect(x - 11 * s, y - 27 * s, 7 * s, 3 * s); ctx.fillRect(x + 6 * s, y - 14 * s, 5 * s, 3 * s);
  }

  function drawRock(x, y) {
    ctx.fillStyle = "rgba(24,48,32,.22)";
    ctx.beginPath(); ctx.ellipse(x, y + 7, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#78877c";
    ctx.beginPath(); ctx.moveTo(x - 13, y + 4); ctx.lineTo(x - 10, y - 8); ctx.lineTo(x - 2, y - 13); ctx.lineTo(x + 11, y - 5); ctx.lineTo(x + 14, y + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#9ca99a"; ctx.beginPath(); ctx.moveTo(x - 9, y - 5); ctx.lineTo(x - 2, y - 11); ctx.lineTo(x + 3, y - 4); ctx.closePath(); ctx.fill();
  }

  function drawDecor() {
    const map = currentMap();
    if (map.type === "town" || state.images["map:" + map.id]) return;
    const decor = map.type === "cave" ? staticDecor.filter((d) => d.type === "rock") : staticDecor;
    decor.forEach((item) => {
      if (map.type === "forest" && item.type === "tree") drawTree(item.x, item.y, 1.15);
      else if (item.type === "tree") drawTree(item.x, item.y, 1);
      else if (item.type === "rock") drawRock(item.x, item.y);
      else {
        ctx.fillStyle = "rgba(29,58,35,.3)";
        ctx.fillRect(item.x, item.y + 2, 5, 3);
        ctx.fillStyle = item.x % 2 ? "#f3d5b7" : "#e7b9d0";
        ctx.fillRect(item.x, item.y, 3, 3);
        ctx.fillStyle = "#f5e8a5";
        ctx.fillRect(item.x + 2, item.y - 1, 2, 2);
      }
    });
    if (map.type === "field") {
      ctx.fillStyle = "rgba(31,52,37,.25)"; ctx.fillRect(451, 376, 42, 7);
      ctx.fillStyle = "#6f4d32"; ctx.fillRect(468, 350, 7, 29);
      ctx.fillStyle = "#9d6f44"; ctx.fillRect(451, 345, 42, 20);
      ctx.fillStyle = "#c69b65"; ctx.fillRect(454, 348, 36, 14);
      ctx.fillStyle = "#59452f"; ctx.font = "bold 8px sans-serif"; ctx.textAlign = "center"; ctx.fillText("FIELD", 472, 357);
    }
  }

  function monsterGlyph(type) {
    const icons = { poring: "●", drops: "🟠", fabre: "🐛", lunatic: "🐰", willow: "🌳", wolf: "🐺", skeleton: "💀", familiar: "🦇" };
    return icons[type] || "●";
  }

  function drawMonster(monster) {
    const info = monsterInfo(monster.type);
    if (monster.hp <= 0) {
      if (monster._deathAt && performance.now() - monster._deathAt < 720) {
        const progress = (performance.now() - monster._deathAt) / 720;
        const color = info.color || "#e6b5cd";
        ctx.save(); ctx.globalAlpha = 1 - progress;
        for (let piece = 0; piece < 10; piece++) {
          const angle = piece * 2.399 + (monster.x % 17) * 0.05;
          const distance = 5 + progress * (18 + (piece % 4) * 4);
          const px = monster.x + Math.cos(angle) * distance;
          const py = monster.y - progress * 12 + Math.sin(angle) * distance * 0.68 + progress * progress * 20;
          ctx.save(); ctx.translate(px, py); ctx.rotate(angle + progress * 3);
          ctx.fillStyle = piece % 3 === 0 ? "#fff0bd" : color;
          const size = Math.max(1, 5 - progress * 4);
          ctx.fillRect(-size / 2, -size / 2, size, size);
          ctx.restore();
        }
        ctx.restore();
      }
      return;
    }
    const image = state.images["monster:" + monster.type];
    const selected = state.targetId === monster.id;
    const boss = info.boss === true;
    const hurt = monster._hurtUntil && performance.now() < monster._hurtUntil;
    const now = performance.now();
    const walk = Math.sin((monster._walkFrame || 0) * 1.8) * 1.8;
    const attackProgress = monster._attackUntil && now < monster._attackUntil ? (monster._attackUntil - now) / 260 : 0;
    const bounce = Math.sin(now / 190 + monster.x) * 1.5;
    const y = monster.y + bounce + walk * 0.7;
    ctx.fillStyle = "rgba(26,51,39,.28)";
    ctx.beginPath(); ctx.ellipse(monster.x, monster.y + 12, 19, 8, 0, 0, Math.PI * 2); ctx.fill();
    if (boss) {
      ctx.strokeStyle = "rgba(255,173,98,.58)";
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(monster.x, y + 1, 37 + Math.sin(performance.now() / 180) * 2, 32, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (selected) {
      ctx.strokeStyle = "rgba(255,227,150,.95)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(monster.x, monster.y + 1, 26, 24, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (image) {
      ctx.drawImage(image, monster.x - (boss ? 35 : 23), y - (boss ? 38 : 26), boss ? 70 : 46, boss ? 76 : 48);
    } else {
      ctx.fillStyle = info.color;
      if (monster.type === "lunatic" || monster.type === "wolf") {
        ctx.beginPath(); ctx.moveTo(monster.x - 15, y - 6); ctx.lineTo(monster.x - 14, y - 27); ctx.lineTo(monster.x - 3, y - 13); ctx.lineTo(monster.x + 5, y - 13); ctx.lineTo(monster.x + 16, y - 27); ctx.lineTo(monster.x + 16, y - 4); ctx.quadraticCurveTo(monster.x + 18, y + 16, monster.x, y + 17); ctx.quadraticCurveTo(monster.x - 19, y + 15, monster.x - 15, y - 6); ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.ellipse(monster.x, y, 18, 17, 0, Math.PI, Math.PI * 2); ctx.lineTo(monster.x + 18, y + 4); ctx.quadraticCurveTo(monster.x + 15, y + 17, monster.x, y + 17); ctx.quadraticCurveTo(monster.x - 17, y + 16, monster.x - 18, y + 4); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = "rgba(255,255,255,.32)";
      ctx.beginPath(); ctx.ellipse(monster.x - 5, y - 7, 8, 5, -.5, 0, Math.PI * 2); ctx.fill();
      if (monster.type === "skeleton") {
        ctx.fillStyle = "#4d4d4a"; ctx.fillRect(monster.x - 9, y - 3, 5, 4); ctx.fillRect(monster.x + 4, y - 3, 5, 4);
        ctx.fillStyle = "#c6c8b9"; ctx.fillRect(monster.x - 7, y + 8, 14, 4);
      } else {
        ctx.fillStyle = "#fff5e9"; ctx.fillRect(monster.x - 9, y - 1, 4, 6); ctx.fillRect(monster.x + 4, y - 1, 4, 6);
        ctx.fillStyle = "#503548"; ctx.fillRect(monster.x - 7, y + 1, 2, 4); ctx.fillRect(monster.x + 5, y + 1, 2, 4);
        ctx.fillStyle = "#743a55"; ctx.fillRect(monster.x - 2, y + 7, 4, 2);
      }
    }
    if (attackProgress > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(0.9, attackProgress + 0.15); ctx.strokeStyle = "#ffc7a3"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(monster.x + (monster._facing || 1) * 10, y + 3, 11 + (1 - attackProgress) * 7, -0.8, 1.05); ctx.stroke();
      ctx.fillStyle = "#fff0c8"; ctx.fillRect(monster.x + (monster._facing || 1) * (boss ? 25 : 15), y + 7, 4, 4); ctx.restore();
    }
    if (hurt) {
      ctx.save(); ctx.globalAlpha = 0.42; ctx.fillStyle = "#ff646d";
      ctx.beginPath(); ctx.ellipse(monster.x, y, boss ? 33 : 20, boss ? 28 : 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (selected) {
      ctx.fillStyle = "rgba(24,36,31,.75)"; ctx.fillRect(monster.x - 20, monster.y - 34, 40, 5);
      ctx.fillStyle = "#ef839c"; ctx.fillRect(monster.x - 19, monster.y - 33, 38 * (monster.hp / monster.maxHp), 3);
    }
    ctx.fillStyle = "#f6e6d9"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText((boss ? "★ " : "") + monster.name + " Lv." + monster.level, monster.x, monster.y - (boss ? 43 : 25));
  }

  function drawPlayer() {
    const p = state.player;
    const sprite = state.images.player;
    const now = performance.now();
    const target = targetMonster();
    const moving = Boolean(state.moveTarget || (target && distance(p, target) > 32));
    const attacking = p._attackUntil && now < p._attackUntil;
    const casting = p._castUntil && now < p._castUntil;
    const hurt = p._hurtUntil && now < p._hurtUntil;
    const facing = p._facing || 1;
    const phase = state.walkFrame * 2.4;
    const step = moving ? Math.sin(phase) * 3 : 0;
    const bob = moving ? Math.abs(Math.sin(phase)) * 1.8 : Math.sin(now / 480) * 0.5;
    const family = currentJob().family;
    const palette = {
      novice: { shirt: "#31506b", trim: "#e0bd72", hair: "#76513d", pants: "#4e6674", accent: "#d7e5e8" },
      swordsman: { shirt: "#315a82", trim: "#e3c47b", hair: "#70503a", pants: "#3d4d62", accent: "#eff0df" },
      mage: { shirt: "#6656a4", trim: "#e0d1ff", hair: "#483450", pants: "#373854", accent: "#bbd9ff" },
      archer: { shirt: "#3f805c", trim: "#a7d18a", hair: "#6c593b", pants: "#3c5b46", accent: "#e4e8b0" },
      thief: { shirt: "#94713e", trim: "#e5bf76", hair: "#443b36", pants: "#514b44", accent: "#fff0c2" },
      acolyte: { shirt: "#6b9caa", trim: "#f1e6c5", hair: "#856443", pants: "#4a7184", accent: "#fff5de" },
      merchant: { shirt: "#b77b4b", trim: "#f2d08a", hair: "#60412c", pants: "#6b5443", accent: "#f5e0a7" }
    };
    const colors = palette[family] || palette.novice;
    if (casting) {
      ctx.strokeStyle = "rgba(145,218,255,.8)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 24 + Math.sin(now / 55) * 3, 31, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = "rgba(26,49,37,.3)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 14, 7, 0, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.scale(facing, 1);
    if (sprite) {
      ctx.drawImage(sprite, -22, -30, 44, 52);
    } else {
      // Original job-tinted pixel adventurer with a stepped walk cycle.
      ctx.fillStyle = "#27333d";
      ctx.fillRect(-8, 10 + Math.max(0, step), 6, 11);
      ctx.fillRect(3, 10 + Math.max(0, -step), 6, 11);
      ctx.fillStyle = "#4c4140";
      ctx.fillRect(-9, 19 + Math.max(0, step), 8, 4);
      ctx.fillRect(2, 19 + Math.max(0, -step), 8, 4);
      ctx.fillStyle = colors.shirt;
      ctx.fillRect(-10, -3, 20, 17);
      ctx.fillStyle = colors.trim;
      ctx.fillRect(-11, -5, 22, 4);
      ctx.fillRect(-2, -2, 4, 13);
      ctx.fillStyle = colors.accent;
      ctx.fillRect(-8, 1, 3, 9);
      if (family === "mage") {
        ctx.fillStyle = "#4c3b80"; ctx.fillRect(-12, -2, 24, 16);
        ctx.fillStyle = colors.trim; ctx.fillRect(-12, 11, 24, 3);
        ctx.fillStyle = "#a99bd8"; ctx.fillRect(-10, -5, 20, 3);
      } else if (family === "archer") {
        ctx.fillStyle = "#2c674b"; ctx.fillRect(-11, 0, 22, 12);
        ctx.fillStyle = "#d7d49b"; ctx.fillRect(-11, 3, 22, 2);
        ctx.fillStyle = "#b18b56"; ctx.fillRect(5, -4, 6, 9);
      } else if (family === "thief") {
        ctx.fillStyle = "#9a783f"; ctx.fillRect(-12, -4, 24, 4);
        ctx.fillStyle = "#ddc47a"; ctx.fillRect(-4, 0, 8, 14);
        ctx.fillStyle = "#b95e48"; ctx.fillRect(-11, 4, 22, 3);
      } else if (family === "acolyte") {
        ctx.fillStyle = "#d9e7df"; ctx.fillRect(-10, 0, 20, 13);
        ctx.fillStyle = "#d2b46e"; ctx.fillRect(-2, 1, 4, 8);
        ctx.fillRect(-5, 4, 10, 3);
      } else if (family === "merchant") {
        ctx.fillStyle = "#744b34"; ctx.fillRect(-12, -1, 24, 15);
        ctx.fillStyle = colors.trim; ctx.fillRect(-11, 3, 22, 3);
        ctx.fillStyle = "#68442f"; ctx.fillRect(-14, 5, 5, 7);
      }
      ctx.fillStyle = "#dba879";
      ctx.fillRect(-8, -17, 16, 14);
      ctx.fillStyle = colors.hair;
      ctx.fillRect(-9, -21, 18, 8);
      ctx.fillRect(-11, -17, 4, 8);
      ctx.fillRect(-5, -23, 10, 4);
      if (family === "mage") {
        ctx.fillStyle = "#6656a4"; ctx.fillRect(-10, -25, 20, 4); ctx.fillRect(-6, -32, 12, 8);
        ctx.fillStyle = "#e7d39b"; ctx.fillRect(-2, -29, 4, 3);
      } else if (family === "archer") {
        ctx.fillStyle = "#477c56"; ctx.fillRect(-10, -23, 20, 5); ctx.fillRect(-7, -27, 14, 4);
      } else if (family === "merchant") {
        ctx.fillStyle = "#bb8756"; ctx.fillRect(-11, -24, 22, 5); ctx.fillRect(-7, -28, 14, 4);
        ctx.fillStyle = "#efd49b"; ctx.fillRect(-2, -24, 4, 3);
      } else if (family === "acolyte") {
        ctx.fillStyle = "#eee5d2"; ctx.fillRect(-10, -23, 20, 4);
        ctx.fillStyle = "#c6a86c"; ctx.fillRect(-2, -22, 4, 3);
      }
      ctx.fillStyle = "#473d3c"; ctx.fillRect(3, -12, 2, 2);
      ctx.fillStyle = "#fff1cf"; ctx.fillRect(-7, -7, 3, 2);
      const armProgress = attacking ? clamp((now - (p._attackStart || (p._attackUntil - 260))) / 260, 0, 1) : 0;
      const armLift = attacking ? -Math.sin(armProgress * Math.PI) * 5 : (moving ? step * 0.6 : 0);
      ctx.fillStyle = colors.shirt; ctx.fillRect(8, -1 + armLift, 5, 10);
      ctx.fillStyle = "#dba879"; ctx.fillRect(9, 7 + armLift, 4, 3);
    }

    const swingProgress = attacking ? clamp((now - (p._attackStart || (p._attackUntil - 260))) / 260, 0, 1) : 0;
    const swingAngle = attacking ? -1.6 + swingProgress * 2.95 : -0.45;
    ctx.save();
    ctx.translate(11, -5 + (attacking ? -Math.sin(swingProgress * Math.PI) * 5 : 0));
    ctx.rotate(swingAngle);
    if (family === "archer") {
      ctx.strokeStyle = "#d6b17a"; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(0, 3, 11, -1.15, 1.15); ctx.stroke();
      ctx.strokeStyle = "#f4e6bb"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 14); ctx.stroke();
    } else if (family === "mage") {
      ctx.fillStyle = "#8f714e"; ctx.fillRect(-1, -2, 3, 21);
      ctx.fillStyle = "#a7dfff"; ctx.fillRect(-3, -6, 7, 6);
      ctx.fillStyle = "#fff4c9"; ctx.fillRect(-1, -5, 3, 3);
    } else {
      ctx.fillStyle = "#d2d8db"; ctx.fillRect(-2, -3, 5, 17);
      ctx.fillStyle = "#f9f2d7"; ctx.fillRect(-3, -8, 7, 7);
      ctx.fillStyle = family === "merchant" ? "#b77b4b" : "#e1c67c";
      ctx.fillRect(-3, 6, 7, 3);
      ctx.fillStyle = "#73523c"; ctx.fillRect(-1, 12, 3, 7);
      if (family === "thief") { ctx.fillStyle = "#e1e3d3"; ctx.fillRect(0, -1, 2, 11); }
    }
    ctx.restore();
    if (attacking) {
      const arc = Math.sin(swingProgress * Math.PI);
      ctx.strokeStyle = "rgba(255,238,180," + (0.18 + arc * 0.8) + ")";
      ctx.lineWidth = 2 + arc * 2;
      ctx.beginPath(); ctx.arc(13, -2, 14 + arc * 8, -1.25, 0.85); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === 1 ? "#fff8d6" : "#f5d98b";
        ctx.fillRect(12 + arc * 18 + i * 3, -4 + i * 5, 3, 3);
      }
    }
    if (hurt) {
      ctx.globalAlpha = 0.68;
      ctx.fillStyle = "#ff5868";
      ctx.fillRect(-12, -23, 24, 37);
    }
    ctx.restore();
  }

  function drawPortals() {
    currentMap().portals.forEach((portal) => {
      const pulse = 18 + Math.sin(performance.now() / 260 + portal.x) * 3;
      ctx.save();
      ctx.strokeStyle = "rgba(144,224,255,.9)";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(portal.x, portal.y, pulse, pulse * 0.68, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(221,197,255,.65)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(portal.x, portal.y, pulse - 6, pulse * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(33,49,62,.84)";
      ctx.beginPath(); ctx.ellipse(portal.x, portal.y, 11, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e7f5ff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = portal.x > 810 ? "right" : "left";
      ctx.fillText(portal.name, portal.x > 810 ? portal.x - 21 : portal.x + 21, portal.y - 18);
      ctx.restore();
    });
  }

  function drawDestination() {
    if (!state.moveTarget) return;
    const point = state.moveTarget;
    const pulse = 4 + Math.sin(performance.now() / 120) * 2;
    ctx.strokeStyle = "rgba(245,235,172,.9)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(point.x, point.y, pulse + 5, pulse + 1, 0, 0, Math.PI * 2); ctx.stroke();
  }

  function drawMiniMap() {
    const map = currentMap();
    miniCtx.clearRect(0, 0, 180, 112);
    miniCtx.fillStyle = map.ground;
    miniCtx.fillRect(0, 0, 180, 112);
    miniCtx.strokeStyle = "rgba(236,227,187,.5)";
    miniCtx.lineWidth = 8;
    miniCtx.beginPath(); miniCtx.moveTo(0, 58); miniCtx.lineTo(180, 53); miniCtx.stroke();
    if (map.type === "town") {
      miniCtx.fillStyle = "#ae9472";
      miniCtx.fillRect(25, 17, 35, 24);
      miniCtx.fillRect(119, 17, 38, 27);
      miniCtx.fillStyle = "rgba(248,227,174,.25)";
      miniCtx.fillRect(77, 0, 20, 112);
    }
    map.portals.forEach((portal) => {
      miniCtx.fillStyle = "#a8ecff";
      miniCtx.beginPath(); miniCtx.arc(portal.x / WORLD_W * 180, portal.y / WORLD_H * 112, 4, 0, Math.PI * 2); miniCtx.fill();
    });
    state.monsters.forEach((monster) => {
      if (monster.hp <= 0) return;
      miniCtx.fillStyle = monsterInfo(monster.type).color;
      miniCtx.beginPath(); miniCtx.arc(monster.x / WORLD_W * 180, monster.y / WORLD_H * 112, 2.6, 0, Math.PI * 2); miniCtx.fill();
    });
    miniCtx.fillStyle = "#fff2bc";
    miniCtx.strokeStyle = "#493b2a";
    miniCtx.lineWidth = 2;
    miniCtx.beginPath(); miniCtx.arc(state.player.x / WORLD_W * 180, state.player.y / WORLD_H * 112, 4, 0, Math.PI * 2); miniCtx.fill(); miniCtx.stroke();
    miniCtx.strokeStyle = "rgba(255,255,255,.25)";
    miniCtx.lineWidth = 1;
    miniCtx.strokeRect(0.5, 0.5, 179, 111);
  }

  function drawEffects() {
    const now = performance.now();
    state.effects = state.effects.filter((effect) => effect.until > now);
    state.effects.forEach((effect) => {
      const t = clamp((now - effect.start) / Math.max(1, effect.until - effect.start), 0, 1);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      if (effect.type === "text") {
        ctx.fillStyle = effect.color; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(effect.text, effect.x, effect.y - t * 25);
      } else if (effect.type === "slash") {
        ctx.strokeStyle = effect.color; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(effect.x, effect.y, 12 + t * 22, -1.2 + t * 0.5, 1.2 + t * 0.5); ctx.stroke();
      } else if (effect.type === "cast" || effect.type === "burst" || effect.type === "death") {
        ctx.strokeStyle = effect.color; ctx.lineWidth = effect.type === "burst" ? 5 : 3;
        ctx.beginPath(); ctx.ellipse(effect.x, effect.y, 10 + t * 36, 8 + t * 28, 0, 0, Math.PI * 2); ctx.stroke();
        if (effect.text && effect.type === "cast") { ctx.fillStyle = effect.color; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(effect.text, effect.x, effect.y - 36 - t * 8); }
        if (effect.text && effect.type === "burst") { ctx.fillStyle = effect.color; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(effect.text, effect.x, effect.y - 38); }
      } else if (effect.type === "level") {
        ctx.fillStyle = effect.color; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(effect.text, effect.x, effect.y - t * 38);
        ctx.strokeStyle = effect.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(effect.x, effect.y + 18, 14 + t * 40, 5 + t * 17, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    });
  }

  function draw() {
    drawGround();
    drawDecor();
    drawPortals();
    state.monsters.slice().sort((a, b) => a.y - b.y).forEach(drawMonster);
    drawDestination();
    drawPlayer();
    drawEffects();
    if (state.idleEnabled) {
      ctx.fillStyle = "rgba(18,36,27,.75)";
      ctx.fillRect(14, 14, 130, 26);
      ctx.fillStyle = "#b5f0c8";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("● 放置狩獵中", 24, 31);
    }
    drawMiniMap();
  }

  function rollOfflineDrops(monster, report) {
    const info = monsterInfo(monster.type);
    let potions = 0;
    info.drops.forEach((drop) => {
      if (Math.random() < drop.chance) {
        const qty = drop.quantity || 1;
        addInventory(drop.id, qty);
        state.idleStats.drops += qty;
        if (drop.id === "red-potion") potions += qty;
        if (report) report.items.push({ id: drop.id, qty: qty });
      }
    });
    return potions;
  }

  function applyOfflineProgress(savedAt) {
    // Strict mode: offline hunting is not enabled until verified as a Taiwan PC RO rule.
    // Do not grant simulated EXP, Zeny, drops, or consumables from previous prototype saves.
    return;
  }

  function startNewGame() {
    state.player = defaultPlayer();
    state.mapId = "field";
    state.monsters = makeMonsters("field");
    state.inventory = [{ id: "green-herb", qty: 2 }, { id: "blue-potion", qty: 1 }];
    state.equipment = { weapon: "novice-knife", armor: "cotton-tunic", accessory: null };
    state.learnedSkills = ["basic-strike"];
    state.cooldowns = {};
    state.buffs = {};
    state.moveTarget = null;
    state.targetId = null;
    state.pendingSkillId = null;
    state.attackCooldown = 0;
    state.idleEnabled = false;
    state.idleSettings = { autoPotion: true, potionThreshold: 45, priority: "nearest" };
    state.idleStats = { kills: 0, exp: 0, gold: 0, drops: 0 };
    state.lastOfflineSummary = null;
    renderAllPanels();
    saveGame(false);
    logMessage("新的冒險開始了！點擊地面移動，或點擊怪物自動追擊。");
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      applySave(data);
      applyOfflineProgress(data.savedAt);
      saveGame(false);
      $("saveIndicator").textContent = "已讀取本機存檔";
      logMessage("已讀取上次的冒險進度。", "muted");
      return true;
    } catch (error) {
      console.warn("Save load failed; starting a fresh game.", error);
      logMessage("舊存檔無法讀取，已建立新冒險。", "muted");
      return false;
    }
  }

  function optionalAsset(key, path, isAudio) {
    if (!path) return;
    if (isAudio) {
      const audio = new Audio();
      audio.preload = "none";
      audio.src = path;
      state.audio[key] = audio;
      return;
    }
    const image = new Image();
    image.onload = () => { state.images[key] = image; };
    image.onerror = () => { /* Original canvas fallback remains available. */ };
    image.src = path;
  }

  function loadOptionalAssets() {
    fetch("./assets/manifest.json", { cache: "no-cache" }).then((response) => response.ok ? response.json() : null).then((manifest) => {
      if (!manifest || !Array.isArray(manifest.available)) return;
      manifest.available.forEach((key) => {
        if (key === "player" && manifest.images && manifest.images.player) optionalAsset("player", manifest.images.player, false);
        else if (key.indexOf("map:") === 0) {
          const id = key.slice(4);
          if (manifest.images && manifest.images.maps && manifest.images.maps[id]) optionalAsset(key, manifest.images.maps[id], false);
        } else if (key.indexOf("monster:") === 0) {
          const id = key.slice(8);
          if (manifest.images && manifest.images.monsters && manifest.images.monsters[id]) optionalAsset(key, manifest.images.monsters[id], false);
        } else if (key.indexOf("sound:") === 0) {
          const id = key.slice(6);
          if (manifest.audio && manifest.audio[id]) optionalAsset(id, manifest.audio[id], true);
        }
      });
    }).catch(() => { /* Assets are optional. */ });
  }

  function playSound(key) {
    const audio = state.audio[key];
    if (!audio) return;
    try {
      audio.currentTime = 0;
      const playing = audio.play();
      if (playing && typeof playing.catch === "function") playing.catch(() => {});
    } catch (error) {
      // Browsers may reject audio until a user gesture.
    }
  }

  canvas.addEventListener("pointerdown", handleWorldClick);
  miniCanvas.addEventListener("pointerdown", (event) => { event.preventDefault(); handleMiniMapClick(event); });
  $("potionButton").addEventListener("click", () => usePotion(false));
  $("resetStatsButton").addEventListener("click", resetStats);
  $("resetSkillsButton").addEventListener("click", resetSkills);
  $("idleToggleButton").disabled = true;
  $("idleToggleButton").addEventListener("click", () => {
    state.idleEnabled = false;
    logMessage("放置狩獵已停用：尚未核實為台灣 RO PC 正服規則。", "muted");
    updateUI();
    saveGame(false);
  });
  $("autoPotionToggle").addEventListener("change", (event) => {
    state.idleSettings.autoPotion = event.target.checked;
    saveGame(false);
  });
  $("autoPotionThreshold").addEventListener("change", (event) => {
    state.idleSettings.potionThreshold = safeNum(event.target.value, 45, 30, 75);
    saveGame(false);
  });
  $("targetPriority").addEventListener("change", (event) => {
    state.idleSettings.priority = ["nearest", "weakest", "exp"].includes(event.target.value) ? event.target.value : "nearest";
    if (state.idleEnabled) state.targetId = null;
    saveGame(false);
  });
  $("saveButton").addEventListener("click", () => saveGame(true));
  $("clearLog").addEventListener("click", () => { $("gameLog").replaceChildren(); logMessage("紀錄已清除。", "muted"); });
  $("newGameButton").addEventListener("click", () => {
    if (window.confirm("重新開始會覆蓋目前的本機進度，確定嗎？")) startNewGame();
  });
  $("exportButton").addEventListener("click", () => {
    saveGame(false);
    const blob = new Blob([JSON.stringify(savePayload(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ro-adventure-save.json";
    link.click();
    URL.revokeObjectURL(url);
    logMessage("已匯出存檔 JSON。", "muted");
  });
  $("importButton").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      applySave(data);
      applyOfflineProgress(data.savedAt);
      renderAllPanels();
      saveGame(false);
      logMessage("存檔匯入成功。");
    } catch (error) {
      logMessage("匯入失敗：請選擇有效的本遊戲 JSON 存檔。");
    } finally {
      event.target.value = "";
    }
  });

  function frame(now) {
    if (!state.lastTime) state.lastTime = now;
    const dt = Math.min((now - state.lastTime) / 1000, 0.05);
    state.lastTime = now;
    update(dt);
    draw();
    if (now - state.lastUi > 180) {
      updateUI();
      state.lastUi = now;
    }
    if (Date.now() - state.lastSave > 10000) {
      saveGame(false);
      state.lastSave = Date.now();
    }
    requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveGame(false);
  });
  window.addEventListener("pagehide", () => saveGame(false));

  loadOptionalAssets();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").then(() => {
      $("connectionStatus").textContent = "離線快取已啟用";
    }).catch(() => {
      $("connectionStatus").textContent = "瀏覽器模式";
    });
  } else {
    $("connectionStatus").textContent = "本機遊玩";
  }
  loadGame();
  state.isReady = true;
  renderAllPanels();
  updateUI();
  window.RO_GAME_API = {
    getData: () => DATA,
    getSnapshot: () => ({ mapId: state.mapId, mapName: currentMap().name, mapType: currentMap().type, idleEnabled: state.idleEnabled, targetId: state.targetId,
      player: Object.assign({}, state.player, { stats: Object.assign({}, state.player.stats), maxHp: maxHp(), maxSp: maxSp() }),
      learnedSkills: state.learnedSkills.slice(), cooldowns: Object.assign({}, state.cooldowns),
      monsters: state.monsters.map((m) => ({ id: m.id, type: m.type, name: m.name, x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, level: m.level, boss: m.boss === true, color: m.color })) }),
    getPlayer: () => state.player,
    getEquipment: () => Object.assign({}, state.equipment),
    getInventory: () => state.inventory.map((item) => Object.assign({}, item)),
    getLearnedSkills: () => state.learnedSkills.slice(),
    getCooldowns: () => Object.assign({}, state.cooldowns),
    getMapId: () => state.mapId,
    getCurrentMap: () => currentMap(),
    switchMap: (id) => switchMap(id),
    trackMonster: (type) => trackMonster(type),
    log: (message, kind) => logMessage(String(message).slice(0, 240), kind),
    save: () => saveGame(false),
    addItem: (id, qty) => { if (DATA.items[id]) { addInventory(id, Math.max(1, Math.floor(qty || 1))); updateUI(); saveGame(false); return true; } return false; },
    removeItem: (id, qty) => { const removed = removeInventory(id, Math.max(1, Math.floor(qty || 1))); if (removed) { updateUI(); saveGame(false); } return removed; },
    petAttack: (monsterId, damage, petName) => {
      const monster = state.monsters.find((entry) => entry.id === monsterId && entry.hp > 0);
      if (!monster || currentMap().type === "town") return false;
      const amount = Math.max(1, Math.floor(Number(damage) || 1));
      spawnEffect(monster.x, monster.y - (monster.boss ? 34 : 16), "burst", "#a9e8ff", "夥伴連擊");
      applyDamage(monster, amount, (petName || "寵物") + "攻擊");
      window.dispatchEvent(new CustomEvent("ro:pet-attack", { detail: { monsterId: monsterId, x: monster.x, y: monster.y, damage: amount, petName: petName || "寵物" } }));
      updateUI();
      saveGame(false);
      return true;
    },
    reward: (reward) => {
      const r = reward || {};
      state.player.gold += Math.max(0, Math.floor(r.gold || 0));
      if (r.exp) expReward(Math.max(0, Math.floor(r.exp)), false);
      if (r.skillPoints) state.player.skillPoints += Math.max(0, Math.floor(r.skillPoints));
      updateUI(); saveGame(false);
    },
    spendGold: (amount) => { const cost = Math.max(0, Math.floor(amount || 0)); if (state.player.gold < cost) return false; state.player.gold -= cost; updateUI(); saveGame(false); return true; },
    usePotion: () => usePotion(true),
    getSkillInfo: (id) => skillInfo(id),
    getMonsterInfo: (id) => monsterInfo(id),
    isTown: () => currentMap().type === "town",
    setIdleEnabled: (_value) => { state.idleEnabled = false; updateUI(); saveGame(false); }
  };
  requestAnimationFrame(frame);
})();
