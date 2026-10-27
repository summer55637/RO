(function () {
  "use strict";
  const API = window.RO_GAME_API;
  if (!API) {
    console.error("RO expansion module could not find the game API.");
    return;
  }

  const SAVE_KEY = "ro-offline-expansion-v1";
  const cards = {
    "poring-card": { id: "poring-card", name: "波利卡片", icon: "🩷", description: "HP +25", hpBonus: 25, chance: 0.095, source: "波利" },
    "drops-card": { id: "drops-card", name: "土波利卡片", icon: "🟠", description: "攻擊 +4", attack: 4, chance: 0.08, source: "土波利" },
    "fabre-card": { id: "fabre-card", name: "綠棉蟲卡片", icon: "🐛", description: "VIT +2", stats: { vit: 2 }, chance: 0.08, source: "綠棉蟲" },
    "wolf-card": { id: "wolf-card", name: "森林狼卡片", icon: "🐺", description: "STR +2", stats: { str: 2 }, chance: 0.075, source: "森林狼" },
    "skeleton-card": { id: "skeleton-card", name: "骷髏兵卡片", icon: "💀", description: "暴擊 +3%", critBonus: 3, chance: 0.075, source: "骷髏兵" },
    "mummy-card": { id: "mummy-card", name: "木乃伊卡片", icon: "🧟", description: "DEX +2", stats: { dex: 2 }, chance: 0.07, source: "木乃伊" },
    "osiris-card": { id: "osiris-card", name: "俄塞里斯卡片", icon: "👑", description: "HP +60、INT +3", hpBonus: 60, stats: { int: 3 }, chance: 0.24, source: "俄塞里斯" },
    "moonlight-card": { id: "moonlight-card", name: "月夜貓卡片", icon: "🌙", description: "AGI +3", stats: { agi: 3 }, chance: 0.24, source: "月夜貓" },
    "baphomet-card": { id: "baphomet-card", name: "巴風特卡片", icon: "🐐", description: "攻擊 +12、STR +3", attack: 12, stats: { str: 3 }, chance: 0.28, source: "巴風特" },
    "ghostring-card": { id: "ghostring-card", name: "幽靈波利卡片", icon: "👻", description: "SP +30、INT +2", spBonus: 30, stats: { int: 2 }, chance: 0.13, source: "幽靈波利" }
  };

  const quests = [
    { id: "first-steps", name: "主線 01 · 冒險者的第一步", description: "擊倒 3 隻波利或綠棉蟲，向公會證明你的實力。", monsters: ["poring", "fabre"], target: 3, exp: 55, gold: 90 },
    { id: "forest-patrol", name: "主線 02 · 森林巡查", description: "擊倒 4 隻森林狼、柳樹或瘋兔。", monsters: ["wolf", "willow", "lunatic"], target: 4, exp: 145, gold: 210 },
    { id: "desert-route", name: "主線 03 · 沙漠補給線", description: "在夢羅克一帶擊倒 4 隻摩卡、獸人戰士或邪惡箱。", monsters: ["muka", "orc-warrior", "mimic"], target: 4, exp: 260, gold: 360 },
    { id: "ancient-crypt", name: "主線 04 · 古墓的低語", description: "擊倒 3 隻木乃伊或邪惡箱，再前往金字塔深處。", monsters: ["mummy", "mimic"], target: 3, exp: 390, gold: 560 },
    { id: "mvp-challenge", name: "主線 05 · MVP 挑戰者", description: "擊倒任意一隻 MVP Boss，證明自己已是資深冒險者。", boss: true, target: 1, exp: 1200, gold: 1600 }
  ];

  const dialogues = {
    "guild-guide": [
      "歡迎來到冒險者公會！點擊地面即可移動，點擊怪物會自動追擊。接取委託後，擊倒指定魔物就能領取 EXP 與 Zeny。",
      "小提醒：Base Lv. 5 可一轉，Base Lv. 20 且 Job Lv. 10 可二轉。技能欄點第一次學習、學會後再次點擊施放。",
      "公會委託會保存在本機瀏覽器。每日委託按照本地日期重置；更換地圖不會重置主線進度。"
    ],
    "refine-master": [
      "我是工匠米洛。精煉能強化目前裝備的屬性；精煉石可從狩獵取得，也能用 Zeny 向我購買。",
      "安全精煉較容易成功。+4 之後的成功率降低，失敗會退回一級；請先存好 Zeny，挑戰高精煉前也要衡量風險。",
      "怪物卡片可插入已裝備的武器、防具或飾品。卡片加成只有在插槽所在欄位裝有裝備時才生效。"
    ],
    "hunt-mentor": [
      "自動狩獵可以設定自動技能、Boss 篩選與低血量撤退。建議先在南門練習，裝備和等級足夠後再進地下城。",
      "撤退時角色會回到普隆德拉安全區休息；HP 恢復到設定比例後會回到原狩獵地圖。這只影響本機模擬，不會連線到伺服器。",
      "狩獵報告會記錄擊殺、EXP、Zeny 和發現的卡片。此為原創簡化的離線玩法，並非官方 RO 伺服器規則。"
    ]
  };
  const npcNames = { "guild-guide": "公會導師・妮娜", "refine-master": "精煉工匠・米洛", "hunt-mentor": "狩獵教官・洛伊" };

  const defaults = () => ({
    version: 1,
    mainStage: 0,
    mainProgress: 0,
    mainClaimed: false,
    dailyDate: localDate(),
    dailyProgress: 0,
    dailyClaimed: false,
    refine: {},
    cardsFound: { "poring-card": 1 },
    socketed: { weapon: null, armor: null, accessory: null },
    ore: 3,
    hunt: { autoSkill: true, retreat: true, retreatAt: 35, returnAt: 82, targetFilter: "all", maxLevelGap: 8 },
    report: { kills: 0, exp: 0, gold: 0, bosses: 0, cards: 0, ores: 0, lastKill: "尚未開始狩獵" },
    retreatMap: null,
    retreatActive: false,
    dialogueIndex: { "guild-guide": 0, "refine-master": 0, "hunt-mentor": 0 }
  });
  let profile = defaults();

  function localDate() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(profile)); } catch (error) { console.warn("Expansion save failed.", error); }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return;
      const def = defaults();
      profile = Object.assign(def, saved);
      profile.hunt = Object.assign(def.hunt, saved.hunt || {});
      profile.report = Object.assign(def.report, saved.report || {});
      profile.refine = saved.refine && typeof saved.refine === "object" ? saved.refine : {};
      profile.cardsFound = saved.cardsFound && typeof saved.cardsFound === "object" ? saved.cardsFound : {};
      profile.socketed = Object.assign(def.socketed, saved.socketed || {});
      profile.dialogueIndex = Object.assign(def.dialogueIndex, saved.dialogueIndex || {});
      profile.mainStage = clampInt(profile.mainStage, 0, quests.length);
      profile.mainProgress = clampInt(profile.mainProgress, 0, 999999);
      profile.dailyProgress = clampInt(profile.dailyProgress, 0, 999999);
      profile.ore = clampInt(profile.ore, 0, 999999);
      if (profile.dailyDate !== localDate()) {
        profile.dailyDate = localDate();
        profile.dailyProgress = 0;
        profile.dailyClaimed = false;
      }
      ["autoSkill", "retreat"].forEach((key) => { profile.hunt[key] = profile.hunt[key] !== false; });
      profile.hunt.retreatAt = clampInt(profile.hunt.retreatAt, 20, 60);
      profile.hunt.returnAt = clampInt(profile.hunt.returnAt, 65, 95);
      if (!["all", "no-boss", "boss-only", "safe"].includes(profile.hunt.targetFilter)) profile.hunt.targetFilter = "all";
    } catch (error) {
      console.warn("Expansion save unavailable; using a new local profile.", error);
    }
  }
  function clampInt(value, min, max) { const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : min; }
  function safeText(value) { return String(value == null ? "" : value); }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function mountUI() {
    const anchor = document.querySelector(".log-panel");
    if (!anchor || document.getElementById("roExpansionGuild")) return;
    anchor.insertAdjacentHTML("beforebegin", `
      <section class="panel expansion-panel" id="roExpansionGuild">
        <div class="panel-title"><h2>冒險者公會</h2><span class="panel-subtitle">NPC · QUESTS</span></div>
        <p class="expansion-lead">接受主線與每日委託，和公會 NPC 對話，透過任務獎勵逐步探索各個城鎮。</p>
        <div class="expansion-block">
          <div class="expansion-block-title"><span>城鎮 NPC 對話</span><span class="expansion-tag">對話 / 教學</span></div>
          <div class="expansion-npc-controls"><select id="roNpcSelect" aria-label="選擇 NPC"><option value="guild-guide">公會導師・妮娜</option><option value="refine-master">精煉工匠・米洛</option><option value="hunt-mentor">狩獵教官・洛伊</option></select><button type="button" class="mini-button primary" id="roNpcTalk">交談</button></div>
          <p class="expansion-npc-dialogue" id="roNpcDialogue" aria-live="polite">歡迎來到公會！選擇 NPC 並按「交談」查看冒險提示。</p>
        </div>
        <div class="expansion-block"><div class="expansion-block-title"><span>主線委託</span><span class="expansion-tag" id="roMainQuestIndex">進度 0 / 5</span></div><div id="roMainQuest"></div></div>
        <div class="expansion-block"><div class="expansion-block-title"><span>每日委託</span><span class="expansion-tag">每日重置</span></div><div id="roDailyQuest"></div></div>
      </section>
      <section class="panel expansion-panel" id="roExpansionGear">
        <div class="panel-title"><h2>精煉與怪物卡片</h2><span class="panel-subtitle">REFINE · CARDS</span></div>
        <p class="expansion-lead">提升目前裝備的精煉等級、收集魔物卡片，並在裝備欄位上插卡。精煉石會自動保存於本機。</p>
        <div class="expansion-block-title"><span>裝備精煉</span><span class="expansion-tag" id="roOreCount">精煉石 ×0</span></div>
        <div class="expansion-action-row" style="margin:0 0 8px"><button type="button" class="mini-button" id="roBuyOre">購買精煉石 · 150 Zeny</button><button type="button" class="mini-button" id="roOreHelp">精煉說明</button></div>
        <div id="roRefineList"></div>
        <div class="expansion-block">
          <div class="expansion-block-title"><span>卡片收藏與插槽</span><span class="expansion-tag" id="roCardCount">收藏 1 種</span></div>
          <div id="roCardCollection"></div>
          <div id="roSocketList"></div>
        </div>
        <p class="expansion-notice">精煉與卡片為此單機原型的自訂數值。精煉 +4 以上失敗會退一級；卡片屬本機收藏資料，不是官方卡片素材。</p>
      </section>
      <section class="panel expansion-panel" id="roExpansionHunt">
        <div class="panel-title"><h2>進階自動狩獵</h2><span class="panel-subtitle">SMART HUNT</span></div>
        <p class="expansion-lead">管理 SP、優先使用技能、過濾目標，並在低血量時回城休息。啟用下方設定後，按原有「開啟放置狩獵」即可生效。</p>
        <label class="expansion-setting"><span>自動選擇攻擊技能</span><input id="roAutoSkill" class="expansion-toggle" type="checkbox"></label>
        <label class="expansion-setting"><span>低血量自動撤退與休息</span><input id="roRetreat" class="expansion-toggle" type="checkbox"></label>
        <label class="expansion-setting"><span>撤退 HP 低於</span><select id="roRetreatAt"><option value="20">20%</option><option value="30">30%</option><option value="35">35%</option><option value="40">40%</option><option value="50">50%</option><option value="60">60%</option></select></label>
        <label class="expansion-setting"><span>狩獵目標篩選</span><select id="roTargetFilter"><option value="all">所有怪物</option><option value="no-boss">避開 Boss</option><option value="boss-only">只打 Boss</option><option value="safe">等級差不超過 8</option></select></label>
        <div class="expansion-report" id="roHuntReport" aria-live="polite"></div>
        <p class="expansion-notice">Boss 會使用額外強力攻擊；MVP 地圖建議裝備稀有防具並保留藥水。放置模式的離線收益仍受原本 8 小時上限約束。</p>
      </section>
    `);
    document.getElementById("roNpcTalk").addEventListener("click", () => {
      const id = document.getElementById("roNpcSelect").value;
      const lines = dialogues[id] || [];
      const index = profile.dialogueIndex[id] || 0;
      document.getElementById("roNpcDialogue").textContent = npcNames[id] + "：「" + (lines[index % lines.length] || "祝你冒險順利！") + "」";
      profile.dialogueIndex[id] = index + 1;
      save();
    });
    document.getElementById("roBuyOre").addEventListener("click", () => {
      if (!API.spendGold(150)) { API.log("Zeny 不足，無法購買精煉石。", "muted"); return; }
      profile.ore += 1; profile.report.ores += 1;
      API.log("購買 1 顆精煉石。", "muted"); renderGear(); renderReport(); save();
    });
    document.getElementById("roOreHelp").addEventListener("click", () => API.log("精煉需要 1 顆精煉石與 Zeny。+0～+3 成功率 92%；+4～+6 為 62%；+7 以上為 36%。", "muted"));
    ["roAutoSkill", "roRetreat"].forEach((id) => document.getElementById(id).addEventListener("change", () => {
      const key = id === "roAutoSkill" ? "autoSkill" : "retreat";
      profile.hunt[key] = document.getElementById(id).checked;
      save();
    }));
    document.getElementById("roRetreatAt").addEventListener("change", (event) => { profile.hunt.retreatAt = clampInt(event.target.value, 20, 60); save(); });
    document.getElementById("roTargetFilter").addEventListener("change", (event) => { profile.hunt.targetFilter = event.target.value; save(); });
  }

  function renderQuests() {
    const mainHost = document.getElementById("roMainQuest");
    const dailyHost = document.getElementById("roDailyQuest");
    if (!mainHost || !dailyHost) return;
    mainHost.replaceChildren();
    dailyHost.replaceChildren();
    document.getElementById("roMainQuestIndex").textContent = "進度 " + Math.min(profile.mainStage + (profile.mainStage === quests.length ? 0 : 1), quests.length) + " / " + quests.length;
    if (profile.mainStage >= quests.length) {
      const done = el("div", "expansion-quest");
      done.append(el("strong", "", "所有主線委託已完成"));
      done.append(el("p", "", "你已證明自己是資深冒險者。接下來可以挑戰 MVP、精煉裝備並收集卡片。"));
      mainHost.append(done);
    } else {
      const quest = quests[profile.mainStage];
      const count = Math.min(profile.mainProgress, quest.target);
      const card = el("div", "expansion-quest");
      card.append(el("strong", "", quest.name));
      card.append(el("p", "", quest.description));
      const progress = el("div", "expansion-progress-label");
      progress.append(el("span", "", quest.boss ? "MVP Boss" : "目標擊殺"));
      progress.append(el("span", "", count + " / " + quest.target));
      const track = el("div", "expansion-progress-track");
      const fill = el("span");
      fill.style.width = (100 * count / quest.target) + "%";
      track.append(fill);
      card.append(progress, track);
      const actions = el("div", "expansion-action-row");
      if (count >= quest.target) {
        const claim = el("button", "mini-button primary", "領取 " + quest.exp + " EXP · " + quest.gold + " Zeny");
        claim.type = "button";
        claim.addEventListener("click", () => {
          API.reward({ exp: quest.exp, gold: quest.gold });
          profile.mainStage += 1; profile.mainProgress = 0; profile.mainClaimed = false;
          API.log("主線完成：「" + quest.name + "」。", "muted"); renderQuests(); save();
        });
        actions.append(claim);
      } else {
        actions.append(el("span", "expansion-notice", "完成目標後即可領取獎勵。"));
      }
      card.append(actions);
      mainHost.append(card);
    }

    const daily = el("div", "expansion-quest");
    daily.append(el("strong", "", "每日委託 · 清理狩獵路線"));
    daily.append(el("p", "", "擊倒任意 4 隻非 Boss 魔物。每日首次完成可領取額外補給。"));
    const dailyCount = Math.min(profile.dailyProgress, 4);
    const dailyLabel = el("div", "expansion-progress-label");
    dailyLabel.append(el("span", "", profile.dailyClaimed ? "今日已領取" : "今日目標"));
    dailyLabel.append(el("span", "", dailyCount + " / 4"));
    const dailyTrack = el("div", "expansion-progress-track");
    const dailyFill = el("span");
    dailyFill.style.width = (100 * dailyCount / 4) + "%";
    dailyTrack.append(dailyFill);
    daily.append(dailyLabel, dailyTrack);
    if (dailyCount >= 4 && !profile.dailyClaimed) {
      const claimDaily = el("button", "mini-button primary", "領取 120 EXP · 180 Zeny");
      claimDaily.type = "button";
      claimDaily.addEventListener("click", () => {
        API.reward({ exp: 120, gold: 180 });
        profile.dailyClaimed = true;
        API.log("完成每日委託，補給已送達。", "muted"); renderQuests(); save();
      });
      daily.append(claimDaily);
    }
    if (profile.dailyClaimed) daily.append(el("p", "expansion-notice", "明天會自動重置每日委託。"));
    dailyHost.append(daily);
  }

  function refineCost(level) { return Math.round(100 * Math.pow(level + 1, 1.65)); }
  function equippedRows() {
    const equipment = API.getEquipment();
    const data = API.getData();
    return ["weapon", "armor", "accessory"].map((slot) => {
      const id = equipment[slot];
      return { slot: slot, id: id, item: id ? data.items[id] : null, level: id ? clampInt(profile.refine[id] || 0, 0, 10) : 0 };
    });
  }
  function renderGear() {
    const refineHost = document.getElementById("roRefineList");
    const cardHost = document.getElementById("roCardCollection");
    const socketHost = document.getElementById("roSocketList");
    if (!refineHost || !cardHost || !socketHost) return;
    const rows = equippedRows();
    const player = API.getPlayer();
    document.getElementById("roOreCount").textContent = "精煉石 ×" + profile.ore;
    refineHost.replaceChildren();
    rows.forEach((row) => {
      const outer = el("div", "expansion-gear-row");
      const copy = el("div", "expansion-gear-copy");
      copy.append(el("strong", "", (row.item ? row.item.icon + " " + row.item.name : "空欄") + "  +" + row.level));
      copy.append(el("small", "", row.item ? ("下一級精煉費用 " + (row.level >= 10 ? "已達上限" : refineCost(row.level) + " Zeny · 精煉石 ×1")) : "先在背包裝備武器、防具或飾品。"));
      const actions = el("div", "expansion-action-row");
      if (row.item && row.level < 10) {
        const button = el("button", "mini-button primary", "精煉 +" + (row.level + 1));
        button.type = "button";
        button.disabled = profile.ore < 1 || player.gold < refineCost(row.level);
        button.addEventListener("click", () => tryRefine(row));
        actions.append(button);
      }
      outer.append(copy, actions);
      refineHost.append(outer);
    });
    document.getElementById("roCardCount").textContent = "收藏 " + Object.keys(profile.cardsFound).filter((id) => profile.cardsFound[id] > 0).length + " 種";
    cardHost.replaceChildren();
    const found = Object.keys(profile.cardsFound).filter((id) => profile.cardsFound[id] > 0);
    if (!found.length) cardHost.append(el("p", "expansion-notice", "尚未發現卡片。狩獵一般魔物有低機率掉落卡片，Boss 的機率較高。"));
    found.forEach((id) => {
      const card = cards[id];
      if (!card) return;
      const row = el("div", "expansion-gear-row");
      const copy = el("div", "expansion-gear-copy");
      copy.append(el("strong", "", card.icon + " " + card.name + " ×" + profile.cardsFound[id]));
      copy.append(el("small", "", card.description + " · 來源：" + card.source));
      row.append(copy);
      cardHost.append(row);
    });
    socketHost.replaceChildren();
    rows.forEach((row) => {
      const outer = el("div", "expansion-gear-row");
      const copy = el("div", "expansion-gear-copy");
      const equippedCard = profile.socketed[row.slot] ? cards[profile.socketed[row.slot]] : null;
      copy.append(el("strong", "", row.slot === "weapon" ? "武器插槽" : row.slot === "armor" ? "防具插槽" : "飾品插槽"));
      copy.append(el("small", "", row.item ? row.item.name + (equippedCard ? " · " + equippedCard.name : " · 尚未插卡") : "此欄尚未裝備物品"));
      const actions = el("div", "expansion-action-row");
      if (row.item) {
        const select = el("select");
        select.setAttribute("aria-label", "選擇" + row.slot + "卡片");
        select.append(new Option("選擇卡片", ""));
        Object.keys(profile.cardsFound).filter((id) => profile.cardsFound[id] > 0 && cards[id]).forEach((id) => select.append(new Option(cards[id].name + " ×" + profile.cardsFound[id], id)));
        if (equippedCard) select.append(new Option("卸下目前卡片（歸還收藏）", "__remove__"));
        const button = el("button", "mini-button", "插入");
        button.type = "button";
        button.disabled = !found.length && !equippedCard;
        button.addEventListener("click", () => {
          const selected = select.value;
          if (!selected) return;
          if (selected === "__remove__") {
            profile.cardsFound[profile.socketed[row.slot]] = (profile.cardsFound[profile.socketed[row.slot]] || 0) + 1;
            profile.socketed[row.slot] = null;
          } else {
            if (!profile.cardsFound[selected]) return;
            if (profile.socketed[row.slot]) profile.cardsFound[profile.socketed[row.slot]] = (profile.cardsFound[profile.socketed[row.slot]] || 0) + 1;
            profile.cardsFound[selected] -= 1;
            if (profile.cardsFound[selected] <= 0) delete profile.cardsFound[selected];
            profile.socketed[row.slot] = selected;
          }
          renderGear(); API.save(); save();
          API.log("裝備插槽已更新。", "muted");
        });
        actions.append(select, button);
      }
      outer.append(copy, actions);
      socketHost.append(outer);
    });
    const bonus = bonuses();
    const pills = el("div", "expansion-stat-pills");
    pills.append(el("span", "", "精煉攻擊 +" + bonus.attack));
    pills.append(el("span", "", "額外 HP +" + bonus.hpBonus));
    pills.append(el("span", "", "額外 SP +" + bonus.spBonus));
    if (bonus.critBonus) pills.append(el("span", "", "暴擊 +" + bonus.critBonus + "%"));
    Object.keys(bonus.stats).forEach((key) => pills.append(el("span", "", key.toUpperCase() + " +" + bonus.stats[key])));
    cardHost.append(pills);
  }
  function tryRefine(row) {
    const player = API.getPlayer();
    if (!row.item || row.level >= 10 || profile.ore < 1) return;
    const cost = refineCost(row.level);
    if (!API.spendGold(cost)) { API.log("Zeny 不足，無法精煉。", "muted"); return; }
    profile.ore -= 1;
    const chance = row.level < 4 ? 0.92 : row.level < 7 ? 0.62 : 0.36;
    if (Math.random() < chance) {
      profile.refine[row.id] = row.level + 1;
      API.log(row.item.name + " 精煉成功！目前 +" + (row.level + 1) + "。");
    } else {
      if (row.level >= 4) profile.refine[row.id] = Math.max(0, row.level - 1);
      API.log(row.item.name + " 精煉失敗。" + (row.level >= 4 ? "精煉等級退回一級。" : "裝備未降級。"), "muted");
    }
    renderGear(); API.save(); save();
  }

  function bonuses() {
    const result = { attack: 0, hpBonus: 0, spBonus: 0, critBonus: 0, stats: {} };
    const equipment = API.getEquipment();
    const data = API.getData();
    Object.keys(equipment).forEach((slot) => {
      const itemId = equipment[slot];
      if (!itemId || !data.items[itemId]) return;
      const item = data.items[itemId];
      const level = clampInt(profile.refine[itemId] || 0, 0, 10);
      if (slot === "weapon") result.attack += level * 2;
      else if (slot === "armor") result.hpBonus += level * 5;
      else result.stats.agi = (result.stats.agi || 0) + level;
      const cardId = profile.socketed[slot];
      const card = cardId && cards[cardId];
      if (!card) return;
      result.attack += card.attack || 0;
      result.hpBonus += card.hpBonus || 0;
      result.spBonus += card.spBonus || 0;
      result.critBonus += card.critBonus || 0;
      Object.keys(card.stats || {}).forEach((key) => { result.stats[key] = (result.stats[key] || 0) + card.stats[key]; });
    });
    return result;
  }

  function shouldAvoidMonster(monster, player) {
    if (!monster || monster.hp <= 0) return true;
    const mode = profile.hunt.targetFilter;
    if (mode === "no-boss" && monster.boss) return true;
    if (mode === "boss-only" && !monster.boss) return true;
    if (mode === "safe" && monster.level > (player.level || 1) + profile.hunt.maxLevelGap) return true;
    return false;
  }
  function getAutoSkillId(snapshot) {
    if (!profile.hunt.autoSkill || !snapshot || !snapshot.target) return null;
    const player = snapshot.player;
    const learned = snapshot.learnedSkills || [];
    const cooldowns = snapshot.cooldowns || {};
    const data = API.getData();
    const candidates = learned.map((id) => data.skills[id]).filter((skill) =>
      skill && ["damage", "magic", "aoe"].includes(skill.kind) &&
      (cooldowns[skill.id] || 0) <= 0 && player.sp >= (skill.sp || 0)
    );
    candidates.sort((a, b) => (b.multiplier || 1) - (a.multiplier || 1) || (a.sp || 0) - (b.sp || 0));
    return candidates.length ? candidates[0].id : null;
  }
  function tick(snapshot) {
    if (!snapshot || !snapshot.idleEnabled || !profile.hunt.retreat) return null;
    const player = snapshot.player;
    if (!profile.retreatActive && snapshot.mapType !== "town" && player.hp / snapshot.maxHp * 100 <= profile.hunt.retreatAt) {
      profile.retreatMap = snapshot.mapId === "town" ? "field" : snapshot.mapId;
      profile.retreatActive = true;
      save();
      API.log("HP 低於撤退門檻，返回普隆德拉安全區休息。", "muted");
      return { switchTo: "town" };
    }
    if (profile.retreatActive && snapshot.mapType === "town") {
      // Rest only while retreating; it is a local simulation and never runs in the background.
      player.hp = Math.min(snapshot.maxHp, player.hp + snapshot.maxHp * 0.035 * (snapshot.dt || 0));
      player.sp = Math.min(snapshot.maxSp || player.maxSp, player.sp + (snapshot.maxSp || player.maxSp) * 0.025 * (snapshot.dt || 0));
      if (player.hp / snapshot.maxHp * 100 >= profile.hunt.returnAt) {
        const returnMap = profile.retreatMap && API.getData().maps[profile.retreatMap] ? profile.retreatMap : "field";
        profile.retreatActive = false; profile.retreatMap = null;
        save();
        API.log("休息完成，回到原狩獵地圖繼續放置狩獵。", "muted");
        return { switchTo: returnMap };
      }
    }
    return null;
  }
  function renderReport() {
    const host = document.getElementById("roHuntReport");
    if (!host) return;
    const r = profile.report;
    host.replaceChildren();
    host.append(el("strong", "", "狩獵報告"));
    host.append(document.createTextNode(" · 擊倒 " + r.kills + " 隻魔物，Boss " + r.bosses + " 隻；累計 " + r.exp + " EXP、" + r.gold + " Zeny。 "));
    host.append(document.createElement("br"));
    host.append(document.createTextNode("卡片 " + r.cards + " 張 · 精煉石 " + r.ores + " 顆 · 最近：" + safeText(r.lastKill)));
  }
  function onKill(event) {
    const detail = event.detail || {};
    const monster = detail.monster || {};
    const quest = quests[profile.mainStage];
    profile.report.kills += 1;
    profile.report.exp += Math.max(0, Number(detail.exp) || 0);
    profile.report.gold += Math.max(0, Number(detail.gold) || 0);
    if (monster.boss) profile.report.bosses += 1;
    profile.report.lastKill = safeText(monster.name || monster.type || "魔物");
    if (!monster.boss) profile.dailyProgress = Math.min(4, profile.dailyProgress + 1);
    if (quest && (quest.boss ? monster.boss : quest.monsters.includes(monster.type))) {
      profile.mainProgress = Math.min(quest.target, profile.mainProgress + 1);
    }
    if (Math.random() < (monster.boss ? 0.58 : 0.11)) {
      profile.ore += monster.boss ? 3 : 1;
      profile.report.ores += monster.boss ? 3 : 1;
      API.log("找到精煉石 ×" + (monster.boss ? 3 : 1) + "。", "muted");
    }
    const cardId = Object.keys(cards).find((id) => {
      const source = cards[id].source;
      return source === monster.name || id === ({ "poring": "poring-card", "drops": "drops-card", "fabre": "fabre-card", "wolf": "wolf-card", "skeleton": "skeleton-card", "mummy": "mummy-card", "osiris": "osiris-card", "moonlight-flower": "moonlight-card", "baphomet": "baphomet-card", "ghostring": "ghostring-card" }[monster.type]);
    });
    if (cardId && Math.random() < cards[cardId].chance) {
      profile.cardsFound[cardId] = (profile.cardsFound[cardId] || 0) + 1;
      profile.report.cards += 1;
      API.log("稀有掉落：" + cards[cardId].name + "！", "muted");
    }
    renderQuests(); renderGear(); renderReport(); save();
  }
  function onLoad() {
    document.getElementById("roAutoSkill").checked = profile.hunt.autoSkill;
    document.getElementById("roRetreat").checked = profile.hunt.retreat;
    document.getElementById("roRetreatAt").value = String(profile.hunt.retreatAt);
    document.getElementById("roTargetFilter").value = profile.hunt.targetFilter;
    renderQuests(); renderGear(); renderReport();
  }

  load();
  mountUI();
  onLoad();
  window.addEventListener("ro:monster-killed", onKill);
  window.addEventListener("ro:level-up", save);
  window.addEventListener("ro:job-change", save);
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(); });

  window.RO_EXPANSION = {
    bonuses: bonuses,
    shouldAvoidMonster: shouldAvoidMonster,
    getAutoSkillId: getAutoSkillId,
    tick: tick,
    onMapChange: (mapId) => { if (!profile.retreatActive && API.getData().maps[mapId] && API.getData().maps[mapId].type !== "town") save(); }
  };
})();