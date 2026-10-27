(function () {
  "use strict";

  const actions = [
    { id: "character", label: "角色", icon: "♙", title: "角色與能力值", description: "直接轉職、調整能力值，全部免費重置", panels: [".job-panel", ".stats-panel"] },
    { id: "equipment", label: "裝備", icon: "⚒", title: "裝備、背包與商店", description: "商店購買先放進背包；穿戴由你決定", panels: [".equipment-panel", "#shopPanel"] },
    { id: "save", label: "存檔", icon: "▤", title: "進度管理", description: "本機儲存、匯入與匯出", panels: [".save-panel"] }
  ];

  // Keep optional systems out of the main path so first-time players see only core controls.
  const quarantinedPanels = [".idle-panel", ".map-book-panel", ".pet-panel", "#roExpansionGuild", "#roExpansionGear", "#roExpansionHunt"];

  const $ = (selector, root) => (root || document).querySelector(selector);
  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function init() {
    const shell = $(".app-shell");
    const layout = $(".layout");
    const play = $(".play-column");
    const side = $(".side-column");
    const api = window.RO_GAME_API;
    // Initialize the compact UI only after the playable game view is visible.
    if (!shell || !layout || layout.hidden || layout.getAttribute("aria-hidden") === "true" || !play || !side || !api || shell.dataset.oneScreen === "true") return;
    shell.dataset.oneScreen = "true";

    // The core game stays visible. All long-form tools are moved into lightweight overlays.
    const panelNodes = new Map();
    [".character-panel", ".skills-panel", ".target-panel"].forEach((selector) => {
      panelNodes.set(selector, $(selector, side));
    });
    actions.forEach((action) => {
      action.panels.forEach((selector) => {
        if (!panelNodes.has(selector)) panelNodes.set(selector, $(selector, side));
      });
    });
    quarantinedPanels.forEach((selector) => {
      if (!panelNodes.has(selector)) panelNodes.set(selector, $(selector, side));
    });

    const characterPanel = panelNodes.get(".character-panel");
    const skillsPanel = panelNodes.get(".skills-panel");
    const targetPanel = panelNodes.get(".target-panel");
    if (!characterPanel || !skillsPanel || !targetPanel) return;

    const quarantined = make("div", "quarantined-panels");
    quarantined.hidden = true;
    quarantined.setAttribute("aria-hidden", "true");
    quarantinedPanels.forEach((selector) => {
      const panel = panelNodes.get(selector);
      if (panel) quarantined.appendChild(panel);
    });

    const dashboard = make("div", "game-dashboard");
    dashboard.setAttribute("aria-label", "即時遊戲狀態");
    characterPanel.classList.add("dashboard-character");
    skillsPanel.classList.add("dashboard-skills");
    targetPanel.classList.add("dashboard-target");
    dashboard.append(characterPanel, skillsPanel, targetPanel);
    side.replaceChildren(dashboard, quarantined);

    const dock = make("nav", "game-dock");
    dock.setAttribute("aria-label", "主要功能選單");
    dock.setAttribute("role", "navigation");
    const modalRecords = new Map();
    const dockButtons = new Map();

    actions.forEach((action) => {
      const button = make("button", "game-dock-button");
      button.type = "button";
      button.dataset.openPanel = action.id;
      button.setAttribute("aria-haspopup", "dialog");
      const icon = make("span", "game-dock-icon", action.icon);
      icon.setAttribute("aria-hidden", "true");
      const label = make("span", "game-dock-label", action.label);
      button.append(icon, label);
      button.addEventListener("click", () => openModal(action.id));
      dock.appendChild(button);
      dockButtons.set(action.id, button);

      const overlay = make("div", "game-modal");
      overlay.hidden = true;
      overlay.dataset.modal = action.id;
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeModal(action.id);
      });

      const dialog = make("section", "game-modal-dialog");
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-labelledby", "game-modal-title-" + action.id);

      const header = make("header", "game-modal-header");
      const headingGroup = make("div", "game-modal-heading-group");
      const title = make("h2", "", action.title);
      title.id = "game-modal-title-" + action.id;
      headingGroup.append(title, make("p", "", action.description));
      const close = make("button", "game-modal-close", "✕");
      close.type = "button";
      close.setAttribute("aria-label", "關閉視窗");
      close.addEventListener("click", () => closeModal(action.id));
      header.append(headingGroup, close);

      const body = make("div", "game-modal-body");
      action.panels.forEach((selector) => {
        const panel = panelNodes.get(selector);
        if (panel) {
          if (selector === "#shopPanel") panel.hidden = false;
          body.appendChild(panel);
        }
      });

      dialog.append(header, body);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      modalRecords.set(action.id, { overlay, dialog, close });
    });

    const footer = $(".footer", shell);
    if (footer) shell.insertBefore(dock, footer);
    else shell.appendChild(dock);

    let activeModal = null;
    let lastFocus = null;
    function openModal(id) {
      const record = modalRecords.get(id);
      if (!record) return;
      if (activeModal) closeModal(activeModal, false);
      activeModal = id;
      lastFocus = document.activeElement;
      record.overlay.hidden = false;
      dockButtons.get(id).classList.add("active");
      dockButtons.get(id).setAttribute("aria-expanded", "true");
      document.body.classList.add("modal-open");
      record.close.focus({ preventScroll: true });
    }
    function closeModal(id, restoreFocus) {
      const record = modalRecords.get(id);
      if (!record) return;
      record.overlay.hidden = true;
      dockButtons.get(id).classList.remove("active");
      dockButtons.get(id).setAttribute("aria-expanded", "false");
      if (activeModal === id) activeModal = null;
      if (!activeModal) document.body.classList.remove("modal-open");
      if (restoreFocus !== false && lastFocus && typeof lastFocus.focus === "function") {
        try { lastFocus.focus({ preventScroll: true }); } catch (_) { lastFocus.focus(); }
      }
    }
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && activeModal) {
        const id = activeModal;
        closeModal(id);
      }
    });

    // Replace the full row of map buttons with one grouped selector above the canvas.
    const oldMapTabs = $("#mapTabs");
    if (oldMapTabs) {
      const quickNav = make("div", "map-quicknav");
      const label = make("label", "map-quicknav-label", "地圖");
      label.htmlFor = "mapQuickSelect";
      const select = make("select", "map-quicknav-select");
      select.id = "mapQuickSelect";
      select.setAttribute("aria-label", "快速切換地圖");
      const allMaps = api.getData().maps;
      const beginnerMapIds = new Set(["field", "forest"]);
      [
        { title: "新手推薦", test: (map) => beginnerMapIds.has(map.id) },
        { title: "其他野外", test: (map) => map.type !== "town" && map.type !== "cave" && !beginnerMapIds.has(map.id) },
        { title: "城鎮（補給）", test: (map) => map.type === "town" },
        { title: "地下城與 Boss（較難）", test: (map) => map.type === "cave" }
      ].forEach((group) => {
        const optionGroup = document.createElement("optgroup");
        optionGroup.label = group.title;
        Object.values(allMaps).filter(group.test).forEach((map) => {
          const option = make("option", "", map.name);
          option.value = map.id;
          optionGroup.appendChild(option);
        });
        if (optionGroup.children.length) select.appendChild(optionGroup);
      });
      select.addEventListener("change", () => api.switchMap(select.value));
      quickNav.append(label, select);
      play.insertBefore(quickNav, oldMapTabs);
      oldMapTabs.hidden = true;
      const syncMap = (event) => {
        const id = event && event.detail && event.detail.mapId ? event.detail.mapId : api.getMapId();
        if (allMaps[id]) select.value = id;
      };
      window.addEventListener("ro:map-change", syncMap);
      syncMap();
    }

    // Recommend one simple map and a small target list based on the player's Base Level.
    const huntGuide = $("#huntGuide");
    const huntData = api.getData();
    const huntMapButton = $("#huntMapButton");
    const huntMonsterButton = $("#huntMonsterButton");
    let activeHuntRecommendation = null;
    function renderHuntGuide() {
      if (!huntGuide || !huntData.huntRecommendations) return;
      const snapshot = api.getSnapshot();
      const level = Math.max(1, Number(snapshot && snapshot.player && snapshot.player.level) || 1);
      const recommendations = huntData.huntRecommendations;
      activeHuntRecommendation = recommendations.find((entry) => level >= entry.minLevel && level <= entry.maxLevel)
        || recommendations[recommendations.length - 1];
      if (!activeHuntRecommendation) return;
      const map = huntData.maps[activeHuntRecommendation.mapId];
      const targetNames = activeHuntRecommendation.monsterIds
        .map((id) => huntData.monsters[id])
        .filter(Boolean);
      $("#huntLevelBadge").textContent = "你的等級 Lv. " + level + " · 推薦 Lv. " + activeHuntRecommendation.minLevel + "–" + activeHuntRecommendation.maxLevel;
      $("#huntTitle").textContent = activeHuntRecommendation.title;
      $("#huntSummary").textContent = "推薦地圖：" + (map ? map.name : activeHuntRecommendation.mapId) + "。 " + activeHuntRecommendation.tip;
      $("#huntMonsterNames").textContent = targetNames.map((monster) => monster.name + " Lv." + monster.level).join("、");
      if (huntMapButton) huntMapButton.textContent = "前往「" + (map ? map.shortName || map.name : "推薦地圖") + "」";
      if (huntMonsterButton) huntMonsterButton.textContent = targetNames.length ? "追蹤：" + targetNames[0].name : "追蹤推薦怪物";
    }
    if (huntMapButton) huntMapButton.addEventListener("click", () => {
      if (activeHuntRecommendation) api.switchMap(activeHuntRecommendation.mapId);
    });
    if (huntMonsterButton) huntMonsterButton.addEventListener("click", () => {
      if (activeHuntRecommendation && activeHuntRecommendation.monsterIds.length) {
        api.switchMap(activeHuntRecommendation.mapId);
        api.trackMonster(activeHuntRecommendation.monsterIds[0]);
      }
    });
    window.addEventListener("ro:level-up", renderHuntGuide);
    window.addEventListener("ro:map-change", renderHuntGuide);
    renderHuntGuide();

    // The minimap is useful for exploration, but not required for the one-screen control layout.
    const mapInfo = $(".map-info-row", play);
    if (mapInfo) mapInfo.classList.add("compact-hidden-map-info");

    // Short, event-driven hints guide the first fight without opening a separate tutorial.
    const guideText = $("#newPlayerGuideText");
    if (guideText) {
      const snapshot = api.getSnapshot();
      let guidePhase = snapshot && snapshot.player && snapshot.player.level > 1 ? "returning" : "start";
      if (guidePhase === "returning") {
        guideText.textContent = "點怪物開始自動戰鬥；「角色」可配點，「技能」可學習或施放。";
      }
      window.addEventListener("ro:target-change", (event) => {
        if ((guidePhase === "start" || guidePhase === "returning") && event.detail && event.detail.targetId) {
          guidePhase = "combat";
          guideText.textContent = "選到目標了！角色會自動走近並攻擊。";
        }
      });
      window.addEventListener("ro:monster-killed", () => {
        if (guidePhase === "start" || guidePhase === "combat") {
          guidePhase = "first-kill";
          guideText.textContent = "擊倒一隻了！繼續打怪賺 EXP，升級就能變強。";
        }
      });
      window.addEventListener("ro:level-up", () => {
        guidePhase = "level-up";
        guideText.textContent = "升級了！點底部「角色」加點，或在技能欄學新技能。";
      });
    }

    // Existing game functions are unchanged; the viewport is now the layout boundary.
    window.RO_UI_SHELL = {
      open: openModal,
      close: closeModal,
      getActivePanel: () => activeModal,
      panelIds: actions.map((action) => action.id)
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();