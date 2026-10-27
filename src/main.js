(() => {
  "use strict";

  const SAVE_KEY = "ro-offline-adventure-v1";
  const W = 960;
  const H = 600;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const obstacles = [
    { x: 92, y: 102, r: 20 }, { x: 154, y: 488, r: 18 },
    { x: 817, y: 105, r: 19 }, { x: 863, y: 474, r: 22 },
    { x: 703, y: 211, r: 15 }, { x: 275, y: 135, r: 14 },
    { x: 332, y: 490, r: 17 }, { x: 563, y: 105, r: 15 }
  ];
  const decor = [
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

  const makeMonsters = () => [
    { id: "poring-a", name: "波利", x: 610, y: 290, radius: 17, level: 1, hp: 24, maxHp: 24, exp: 12, respawnAt: 0, cooldown: 0 },
    { id: "poring-b", name: "波利", x: 748, y: 340, radius: 17, level: 1, hp: 24, maxHp: 24, exp: 12, respawnAt: 0, cooldown: 0 },
    { id: "poring-c", name: "波利", x: 390, y: 220, radius: 17, level: 1, hp: 24, maxHp: 24, exp: 12, respawnAt: 0, cooldown: 0 },
    { id: "poring-d", name: "波利", x: 525, y: 410, radius: 17, level: 1, hp: 24, maxHp: 24, exp: 12, respawnAt: 0, cooldown: 0 }
  ];

  const state = {
    player: { x: 466, y: 345, hp: 100, maxHp: 100, level: 1, exp: 0, potions: 5, gold: 0 },
    monsters: makeMonsters(),
    moveTarget: null,
    targetId: null,
    attackCooldown: 0,
    walkFrame: 0,
    lastUi: 0,
    lastSave: 0,
    lastTime: 0,
    idleEnabled: false,
    idleKills: 0,
    idleTotalExp: 0,
    idleTotalGold: 0,
    lastOfflineSummary: null,
    isReady: false
  };

  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const expNeeded = () => 30 + (state.player.level - 1) * 20;
  const findTarget = () => state.monsters.find((m) => m.id === state.targetId && m.hp > 0) || null;

  function logMessage(message, kind) {
    const list = $("gameLog");
    const item = document.createElement("p");
    item.className = "log-entry" + (kind === "muted" ? " muted" : "");
    const bullet = document.createElement("span");
    bullet.className = "log-bullet";
    bullet.textContent = "›";
    item.appendChild(bullet);
    item.appendChild(document.createTextNode(" " + message));
    list.prepend(item);
    while (list.children.length > 5) list.removeChild(list.lastElementChild);
  }

  function safeNum(value, fallback, min, max) {
    const n = Number(value);
    return Number.isFinite(n) ? clamp(n, min, max) : fallback;
  }

  function saveGame(showMessage) {
    try {
      const payload = {
        version: 1,
        savedAt: new Date().toISOString(),
        player: state.player,
        idleEnabled: state.idleEnabled,
        idleStats: {
          kills: state.idleKills,
          exp: state.idleTotalExp,
          gold: state.idleTotalGold,
          lastOfflineSummary: state.lastOfflineSummary
        },
        monsters: state.monsters.map((m) => ({ id: m.id, hp: m.hp, respawnAt: m.respawnAt }))
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      $("saveIndicator").textContent = "已儲存 " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (showMessage) logMessage("進度已儲存到這個瀏覽器。", "muted");
      return true;
    } catch (error) {
      $("saveIndicator").textContent = "儲存失敗";
      if (showMessage) logMessage("瀏覽器無法儲存，請檢查儲存空間或隱私設定。");
      return false;
    }
  }

  function applySave(data) {
    if (!data || data.version !== 1 || !data.player) throw new Error("存檔格式不正確");
    const p = data.player;
    state.player.x = safeNum(p.x, 466, 35, W - 35);
    state.player.y = safeNum(p.y, 345, 35, H - 35);
    state.player.level = Math.round(safeNum(p.level, 1, 1, 99));
    state.player.maxHp = safeNum(p.maxHp, 100, 1, 9999);
    state.player.hp = safeNum(p.hp, state.player.maxHp, 0, state.player.maxHp);
    state.player.exp = safeNum(p.exp, 0, 0, 99999999);
    state.player.potions = Math.round(safeNum(p.potions, 5, 0, 9999));
    state.player.gold = Math.round(safeNum(p.gold, 0, 0, 999999999));
    state.idleEnabled = data.idleEnabled === true;
    const idleStats = data.idleStats && typeof data.idleStats === "object" ? data.idleStats : {};
    state.idleKills = Math.round(safeNum(idleStats.kills, 0, 0, 999999999));
    state.idleTotalExp = Math.round(safeNum(idleStats.exp, 0, 0, 999999999999));
    state.idleTotalGold = Math.round(safeNum(idleStats.gold, 0, 0, 999999999999));
    state.lastOfflineSummary = idleStats.lastOfflineSummary && typeof idleStats.lastOfflineSummary === "object"
      ? {
          seconds: safeNum(idleStats.lastOfflineSummary.seconds, 0, 0, 28800),
          kills: Math.round(safeNum(idleStats.lastOfflineSummary.kills, 0, 0, 999999999)),
          exp: Math.round(safeNum(idleStats.lastOfflineSummary.exp, 0, 0, 999999999)),
          gold: Math.round(safeNum(idleStats.lastOfflineSummary.gold, 0, 0, 999999999)),
          potions: Math.round(safeNum(idleStats.lastOfflineSummary.potions, 0, 0, 999999999))
        }
      : null;
    if (Array.isArray(data.monsters)) {
      state.monsters.forEach((m) => {
        const saved = data.monsters.find((item) => item && item.id === m.id);
        if (!saved) return;
        m.hp = safeNum(saved.hp, m.maxHp, 0, m.maxHp);
        m.respawnAt = safeNum(saved.respawnAt, 0, 0, 9999999999999);
      });
    }
    state.moveTarget = null;
    state.targetId = null;
    updateUI();
  }

  function applyOfflineProgress(savedAt) {
    const savedTime = Date.parse(savedAt);
    if (!state.idleEnabled || !Number.isFinite(savedTime)) return false;
    const elapsedSeconds = Math.max(0, (Date.now() - savedTime) / 1000);
    if (elapsedSeconds < 15) return false;

    const seconds = Math.min(elapsedSeconds, 8 * 60 * 60);
    const kills = Math.floor(seconds / 15);
    if (kills <= 0) return false;

    // Offline hunting is intentionally slower than active play: about one Poring every 15 seconds.
    const earnedExp = kills * 12;
    const earnedGold = kills * 5;
    const earnedPotions = Math.floor(kills * 0.18);
    state.idleKills += kills;
    state.idleTotalExp += earnedExp;
    state.idleTotalGold += earnedGold;
    state.player.gold += earnedGold;
    state.player.potions += earnedPotions;
    state.monsters.forEach((m) => {
      m.hp = m.maxHp;
      m.respawnAt = 0;
      m.cooldown = 0;
    });

    gainExp(earnedExp, false);
    state.lastOfflineSummary = {
      seconds: Math.floor(seconds),
      kills,
      exp: earnedExp,
      gold: earnedGold,
      potions: earnedPotions
    };

    const duration = seconds >= 3600
      ? Math.floor(seconds / 3600) + " 小時"
      : Math.max(1, Math.floor(seconds / 60)) + " 分鐘";
    logMessage("放置結算：" + duration + "，擊倒 " + kills + " 隻波利，獲得 " + earnedExp + " EXP、" + earnedGold + " Zeny。");
    if (earnedPotions > 0) logMessage("放置掉落紅色藥水 ×" + earnedPotions + "。", "muted");
    updateUI();
    return true;
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      applySave(data);
      applyOfflineProgress(data.savedAt);
      $("saveIndicator").textContent = "已讀取本機存檔";
      logMessage("已讀取上次的冒險進度。", "muted");
      saveGame(false);
      return true;
    } catch (error) {
      $("saveIndicator").textContent = "使用新遊戲";
      logMessage("舊存檔無法讀取，已建立新冒險。", "muted");
      return false;
    }
  }

  function startNewGame() {
    state.player = { x: 466, y: 345, hp: 100, maxHp: 100, level: 1, exp: 0, potions: 5, gold: 0 };
    state.monsters = makeMonsters();
    state.idleEnabled = false;
    state.idleKills = 0;
    state.idleTotalExp = 0;
    state.idleTotalGold = 0;
    state.lastOfflineSummary = null;
    state.targetId = null;
    state.moveTarget = null;
    state.attackCooldown = 0;
    saveGame(false);
    updateUI();
    logMessage("新冒險開始了！郊外有幾隻波利。");
  }

  function gainExp(amount, announce) {
    const shouldAnnounce = announce !== false;
    const startingLevel = state.player.level;
    state.player.exp += amount;
    if (shouldAnnounce) logMessage("獲得 " + amount + " EXP。", "muted");
    while (state.player.exp >= expNeeded()) {
      state.player.exp -= expNeeded();
      state.player.level += 1;
      state.player.maxHp += 10;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 20);
      if (shouldAnnounce) logMessage("升級！現在是 Lv. " + state.player.level + "，HP 上限增加。");
    }
    if (!shouldAnnounce && state.player.level > startingLevel) {
      logMessage("放置期間升級至 Lv. " + state.player.level + "！");
    }
  }

  function killMonster(monster) {
    monster.hp = 0;
    monster.respawnAt = Date.now() + 8000;
    const earnedGold = Math.round(rand(3, 8));
    state.player.gold += earnedGold;
    if (state.idleEnabled) {
      state.idleKills += 1;
      state.idleTotalExp += monster.exp;
      state.idleTotalGold += earnedGold;
    }
    gainExp(monster.exp);
    logMessage("波利被打倒了！獲得 Zeny。");
    if (Math.random() < 0.24) {
      state.player.potions += 1;
      logMessage("波利掉落了紅色藥水 ×1！");
    }
    if (state.targetId === monster.id) state.targetId = null;
    state.moveTarget = null;
    updateUI();
  }

  function usePotion() {
    const p = state.player;
    if (p.potions <= 0) {
      logMessage("紅色藥水不足，打倒波利有機會取得。", "muted");
      return;
    }
    if (p.hp >= p.maxHp) {
      logMessage("HP 已經是滿的，先留著藥水吧。", "muted");
      return;
    }
    p.potions -= 1;
    const restored = Math.min(35, p.maxHp - p.hp);
    p.hp += restored;
    logMessage("使用紅色藥水，恢復 " + restored + " HP。");
    updateUI();
    saveGame(false);
  }

  function playerHit() {
    const damage = Math.round(rand(2, 5));
    state.player.hp = Math.max(0, state.player.hp - damage);
    logMessage("波利撞到了你，損失 " + damage + " HP。", "muted");
    if (state.player.hp <= 0) {
      state.player.hp = Math.ceil(state.player.maxHp * 0.6);
      state.player.x = 466;
      state.player.y = 345;
      state.targetId = null;
      state.moveTarget = null;
      logMessage("你暫時失去意識，回到郊外入口並恢復部分 HP。");
    }
    updateUI();
  }

  function attack(monster) {
    if (!monster || monster.hp <= 0 || state.attackCooldown > 0) return;
    state.attackCooldown = 0.48;
    const damage = Math.round(rand(6, 10) + (state.player.level - 1) * 2);
    monster.hp = Math.max(0, monster.hp - damage);
    logMessage("你攻擊波利，造成 " + damage + " 傷害。", "muted");
    if (monster.hp <= 0) killMonster(monster);
    updateUI();
  }

  function circleHitsObstacle(x, y, radius) {
    return obstacles.some((o) => Math.hypot(x - o.x, y - o.y) < radius + o.r);
  }

  function movePlayer(dx, dy, dt) {
    const p = state.player;
    const len = Math.hypot(dx, dy);
    if (!len) return;
    dx /= len;
    dy /= len;
    const speed = 178;
    const nx = clamp(p.x + dx * speed * dt, 25, W - 25);
    const ny = clamp(p.y + dy * speed * dt, 30, H - 27);
    if (!circleHitsObstacle(nx, p.y, 11)) p.x = nx;
    if (!circleHitsObstacle(p.x, ny, 11)) p.y = ny;
    state.walkFrame += dt * 10;
  }

  function update(dt) {
    const p = state.player;
    state.attackCooldown = Math.max(0, state.attackCooldown - dt);
    if (state.idleEnabled && !state.targetId && !state.moveTarget) {
      const nextMonster = state.monsters
        .filter((m) => m.hp > 0)
        .sort((a, b) => dist(p, a) - dist(p, b))[0];
      if (nextMonster) state.targetId = nextMonster.id;
    }
    const mob = findTarget();
    if (mob) {
      const d = dist(p, mob);
      const reach = 31;
      if (d > reach) {
        movePlayer(mob.x - p.x, mob.y - p.y, dt);
      } else {
        attack(mob);
      }
    } else if (state.moveTarget) {
      const d = dist(p, state.moveTarget);
      if (d < 5) state.moveTarget = null;
      else movePlayer(state.moveTarget.x - p.x, state.moveTarget.y - p.y, dt);
    }

    state.monsters.forEach((m) => {
      if (m.hp <= 0) {
        if (m.respawnAt && Date.now() >= m.respawnAt) {
          m.hp = m.maxHp;
          m.respawnAt = 0;
          logMessage("一隻新的波利出現了。", "muted");
        }
        return;
      }
      const d = dist(p, m);
      if (d < 205 && d > 35 && state.targetId !== m.id) {
        const mx = (p.x - m.x) / d;
        const my = (p.y - m.y) / d;
        const step = 42 * dt;
        const nx = clamp(m.x + mx * step, 25, W - 25);
        const ny = clamp(m.y + my * step, 30, H - 30);
        if (!circleHitsObstacle(nx, ny, m.radius * 0.45)) { m.x = nx; m.y = ny; }
      }
      m.cooldown = Math.max(0, m.cooldown - dt);
      if (d < 35 && m.cooldown <= 0) {
        m.cooldown = 1.3;
        playerHit();
      }
    });
  }

  function drawGround() {
    ctx.fillStyle = "#4d8957";
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 48) {
      for (let x = 0; x < W; x += 48) {
        const seed = Math.abs(Math.sin((x + 12) * 12.9898 + (y + 5) * 78.233) * 43758.5453) % 1;
        ctx.fillStyle = seed > 0.68 ? "#528f5b" : seed < 0.16 ? "#4a8253" : "#4d8957";
        ctx.fillRect(x, y, 48, 48);
        if (seed > 0.81) {
          ctx.fillStyle = "rgba(179,218,136,.16)";
          ctx.fillRect(x + (seed * 20), y + 12, 3, 2);
          ctx.fillRect(x + 25, y + 29, 2, 3);
        }
      }
    }
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
    ctx.beginPath();
    ctx.moveTo(-20, 310);
    ctx.bezierCurveTo(160, 270, 245, 344, 390, 315);
    ctx.bezierCurveTo(580, 278, 725, 328, 980, 286);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(27,69,45,.23)";
    ctx.fillRect(0, 0, W, 10);
    ctx.fillRect(0, H - 10, W, 10);
  }

  function drawTree(x, y) {
    ctx.fillStyle = "rgba(24,48,32,.25)";
    ctx.beginPath(); ctx.ellipse(x + 2, y + 12, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#72543c"; ctx.fillRect(x - 5, y - 2, 10, 23);
    ctx.fillStyle = "#2c6942"; ctx.beginPath(); ctx.arc(x, y - 11, 23, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#35794b"; ctx.beginPath(); ctx.arc(x - 9, y - 18, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4d985a"; ctx.beginPath(); ctx.arc(x + 7, y - 22, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(183,222,135,.24)"; ctx.fillRect(x - 11, y - 27, 7, 3); ctx.fillRect(x + 6, y - 14, 5, 3);
  }

  function drawRock(x, y) {
    ctx.fillStyle = "rgba(24,48,32,.22)";
    ctx.beginPath(); ctx.ellipse(x, y + 7, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#78877c";
    ctx.beginPath(); ctx.moveTo(x - 13, y + 4); ctx.lineTo(x - 10, y - 8); ctx.lineTo(x - 2, y - 13); ctx.lineTo(x + 11, y - 5); ctx.lineTo(x + 14, y + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#9ca99a"; ctx.beginPath(); ctx.moveTo(x - 9, y - 5); ctx.lineTo(x - 2, y - 11); ctx.lineTo(x + 3, y - 4); ctx.closePath(); ctx.fill();
  }

  function drawDecor() {
    decor.forEach((d) => {
      if (d.type === "tree") drawTree(d.x, d.y);
      else if (d.type === "rock") drawRock(d.x, d.y);
      else {
        ctx.fillStyle = "rgba(29,58,35,.3)";
        ctx.fillRect(d.x, d.y + 2, 5, 3);
        ctx.fillStyle = d.x % 2 ? "#f3d5b7" : "#e7b9d0";
        ctx.fillRect(d.x, d.y, 3, 3);
        ctx.fillStyle = "#f5e8a5";
        ctx.fillRect(d.x + 2, d.y - 1, 2, 2);
      }
    });
    // A small, original wooden noticeboard at the field entrance.
    ctx.fillStyle = "rgba(31,52,37,.25)"; ctx.fillRect(451, 376, 42, 7);
    ctx.fillStyle = "#6f4d32"; ctx.fillRect(468, 350, 7, 29);
    ctx.fillStyle = "#9d6f44"; ctx.fillRect(451, 345, 42, 20);
    ctx.fillStyle = "#c69b65"; ctx.fillRect(454, 348, 36, 14);
    ctx.fillStyle = "#59452f"; ctx.font = "bold 8px sans-serif"; ctx.textAlign = "center"; ctx.fillText("FIELD", 472, 357);
  }

  function drawMonster(m) {
    if (m.hp <= 0) return;
    const selected = state.targetId === m.id;
    const bounce = Math.sin(performance.now() / 190 + m.x) * 2;
    const y = m.y + bounce;
    ctx.fillStyle = "rgba(26,51,39,.28)";
    ctx.beginPath(); ctx.ellipse(m.x, m.y + 12, 19, 8, 0, 0, Math.PI * 2); ctx.fill();
    if (selected) {
      ctx.strokeStyle = "rgba(255,227,150,.95)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(m.x, m.y + 1, 25, 23, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = "#d95d83";
    ctx.beginPath(); ctx.ellipse(m.x, y, 18, 17, 0, Math.PI, Math.PI * 2); ctx.lineTo(m.x + 18, y + 4); ctx.quadraticCurveTo(m.x + 15, y + 17, m.x, y + 17); ctx.quadraticCurveTo(m.x - 17, y + 16, m.x - 18, y + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f08ca9";
    ctx.beginPath(); ctx.ellipse(m.x - 5, y - 7, 8, 5, -.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff5e9";
    ctx.fillRect(m.x - 9, y - 1, 4, 6); ctx.fillRect(m.x + 4, y - 1, 4, 6);
    ctx.fillStyle = "#503548";
    ctx.fillRect(m.x - 7, y + 1, 2, 4); ctx.fillRect(m.x + 5, y + 1, 2, 4);
    ctx.fillStyle = "#743a55"; ctx.fillRect(m.x - 2, y + 7, 4, 2);
    if (selected) {
      ctx.fillStyle = "rgba(24,36,31,.75)"; ctx.fillRect(m.x - 20, m.y - 30, 40, 5);
      ctx.fillStyle = "#ef839c"; ctx.fillRect(m.x - 19, m.y - 29, 38 * (m.hp / m.maxHp), 3);
    }
    ctx.fillStyle = "#f6e6d9"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("波利", m.x, m.y - 24);
  }

  function drawPlayer() {
    const p = state.player;
    const moving = Boolean(state.moveTarget || state.targetId !== null);
    const bob = moving ? Math.sin(state.walkFrame * 2) * 2 : 0;
    ctx.fillStyle = "rgba(26,49,37,.3)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#31506b"; ctx.fillRect(p.x - 10, p.y - 1 + bob, 20, 18);
    ctx.fillStyle = "#e0bd72"; ctx.fillRect(p.x - 11, p.y - 4 + bob, 22, 5);
    ctx.fillStyle = "#5a7e91"; ctx.fillRect(p.x - 7, p.y + 10 + bob, 5, 9); ctx.fillRect(p.x + 3, p.y + 10 + bob, 5, 9);
    ctx.fillStyle = "#dba879"; ctx.fillRect(p.x - 8, p.y - 16 + bob, 16, 15);
    ctx.fillStyle = "#76513d"; ctx.fillRect(p.x - 9, p.y - 20 + bob, 18, 8); ctx.fillRect(p.x - 11, p.y - 15 + bob, 4, 9);
    ctx.fillStyle = "#473d3c"; ctx.fillRect(p.x - 5, p.y - 10 + bob, 2, 2); ctx.fillRect(p.x + 4, p.y - 10 + bob, 2, 2);
    ctx.fillStyle = "#d6e7e7"; ctx.fillRect(p.x + 11, p.y - 10 + bob, 3, 19);
    ctx.fillStyle = "#fff1c7"; ctx.fillRect(p.x + 10, p.y - 15 + bob, 5, 6);
    ctx.fillStyle = "#d9d5bc"; ctx.fillRect(p.x + 7, p.y + 8 + bob, 8, 3);
    ctx.fillStyle = "rgba(255,240,182,.9)"; ctx.fillRect(p.x - 12, p.y + 24, 24, 3);
  }

  function drawDestination() {
    if (!state.moveTarget) return;
    const t = state.moveTarget;
    const pulse = 4 + Math.sin(performance.now() / 120) * 2;
    ctx.strokeStyle = "rgba(245,235,172,.85)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(t.x, t.y, pulse + 5, pulse + 1, 0, 0, Math.PI * 2); ctx.stroke();
  }

  function draw() {
    drawGround();
    drawDecor();
    const ordered = state.monsters.filter((m) => m.hp > 0).sort((a, b) => a.y - b.y);
    ordered.forEach(drawMonster);
    drawDestination();
    drawPlayer();
    // Direction hints are intentionally subtle so the play field remains readable.
    ctx.fillStyle = "rgba(255,255,255,.45)";
    ctx.fillRect(state.player.x - 1, state.player.y - 30, 2, 2);
  }

  function updateUI() {
    const p = state.player;
    const needed = expNeeded();
    $("levelLabel").textContent = "Lv. " + p.level + " Novice";
    $("goldLabel").textContent = p.gold.toLocaleString();
    $("hpText").textContent = Math.ceil(p.hp) + " / " + p.maxHp;
    $("hpFill").style.width = (100 * p.hp / p.maxHp) + "%";
    $("expText").textContent = p.exp + " / " + needed;
    $("expFill").style.width = (100 * p.exp / needed) + "%";
    $("attackLabel").textContent = (8 + (p.level - 1) * 2) + "–" + (12 + (p.level - 1) * 2);
    $("potionLabel").textContent = p.potions + " 瓶";
    $("hotbarPotionCount").textContent = p.potions;
    const target = findTarget();
    if (target) {
      $("targetName").textContent = target.name;
      $("targetLevel").textContent = "Lv. " + target.level + " · 近距離普通攻擊";
      $("targetHpText").textContent = target.hp + " / " + target.maxHp;
      $("targetHpFill").style.width = (100 * target.hp / target.maxHp) + "%";
    } else {
      $("targetName").textContent = "尚未選取目標";
      $("targetLevel").textContent = state.idleEnabled ? "放置狩獵：尋找目標中" : "點擊地圖中的波利";
      $("targetHpText").textContent = "—";
      $("targetHpFill").style.width = "0%";
    }

    $("idleStateBadge").textContent = state.idleEnabled ? "狩獵中" : "未啟動";
    $("idleStateBadge").classList.toggle("is-active", state.idleEnabled);
    $("idleToggleButton").textContent = state.idleEnabled ? "Ⅱ 停止放置狩獵" : "▶ 開啟放置狩獵";
    $("idleToggleButton").classList.toggle("is-active", state.idleEnabled);
    $("idleKills").textContent = state.idleKills.toLocaleString();
    $("idleExp").textContent = state.idleTotalExp.toLocaleString();
    $("idleGold").textContent = state.idleTotalGold.toLocaleString();
    if (state.lastOfflineSummary && state.lastOfflineSummary.kills > 0) {
      const summary = state.lastOfflineSummary;
      const duration = summary.seconds >= 3600
        ? Math.floor(summary.seconds / 3600) + " 小時"
        : Math.max(1, Math.floor(summary.seconds / 60)) + " 分鐘";
      $("idleSummary").textContent = "上次離線 " + duration + "：擊倒 " + summary.kills + " 隻，獲得 " + summary.exp + " EXP、" + summary.gold + " Zeny、藥水 ×" + summary.potions + "。";
    } else {
      $("idleSummary").textContent = state.idleEnabled
        ? "放置狩獵已啟動。離開前會自動儲存，回來時最多結算 8 小時。"
        : "尚未啟動。開啟後即可自動狩獵；離線收益最多計算 8 小時。";
    }
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height };
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!state.isReady) return;
    event.preventDefault();
    const point = canvasPoint(event);
    let best = null, bestDist = 38;
    state.monsters.forEach((m) => {
      if (m.hp <= 0) return;
      const d = Math.hypot(point.x - m.x, point.y - m.y);
      if (d < bestDist) { best = m; bestDist = d; }
    });
    if (best) {
      state.targetId = best.id;
      state.moveTarget = null;
      logMessage("選取目標：波利。");
    } else {
      state.targetId = null;
      state.moveTarget = { x: point.x, y: point.y };
    }
    updateUI();
  });

  $("potionButton").addEventListener("click", usePotion);
  $("hotbarPotion").addEventListener("click", usePotion);
  $("idleToggleButton").addEventListener("click", () => {
    state.idleEnabled = !state.idleEnabled;
    state.moveTarget = null;
    state.targetId = null;
    if (state.idleEnabled) {
      logMessage("放置狩獵已啟動！角色會自動搜尋波利。");
    } else {
      logMessage("放置狩獵已停止。");
    }
    updateUI();
    saveGame(false);
  });
  $("saveButton").addEventListener("click", () => saveGame(true));
  $("clearLog").addEventListener("click", () => { $("gameLog").replaceChildren(); logMessage("紀錄已清除。", "muted"); });
  $("newGameButton").addEventListener("click", () => {
    if (window.confirm("重新開始會覆蓋目前的本機進度，確定嗎？")) startNewGame();
  });
  $("exportButton").addEventListener("click", () => {
    saveGame(false);
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      player: state.player,
      idleEnabled: state.idleEnabled,
      idleStats: {
        kills: state.idleKills,
        exp: state.idleTotalExp,
        gold: state.idleTotalGold,
        lastOfflineSummary: state.lastOfflineSummary
      },
      monsters: state.monsters.map((m) => ({ id: m.id, hp: m.hp, respawnAt: m.respawnAt }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
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
    if (now - state.lastUi > 160) {
      updateUI();
      state.lastUi = now;
    }
    if (Date.now() - state.lastSave > 12000) {
      saveGame(false);
      state.lastSave = Date.now();
    }
    requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveGame(false);
  });
  window.addEventListener("pagehide", () => saveGame(false));

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
  updateUI();
  requestAnimationFrame(frame);
})();
