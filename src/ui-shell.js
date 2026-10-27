(function () {
  "use strict";

  const actions = [
    { id: "character", label: "角色", icon: "♙", title: "角色養成", description: "職業與能力值", panels: [".job-panel", ".stats-panel"] },
    { id: "pets", label: "寵物", icon: "🐾", title: "寵物與夥伴", description: "捕捉、餵食、親密度與輔助戰鬥", panels: [".pet-panel"] },
    { id: "quests", label: "任務", icon: "✦", title: "冒險委託", description: "NPC、主線與每日任務", panels: ["#roExpansionGuild"] },
    { id: "equipment", label: "裝備", icon: "⚒", title: "裝備與收藏", description: "背包、精煉、卡片、圖鑑與商店", panels: [".equipment-panel", "#roExpansionGear", ".map-book-panel", "#shopPanel"] },
    { id: "hunt", label: "狩獵", icon: "⚔", title: "狩獵設定", description: "自動戰鬥、Boss 篩選與狩獵紀錄", panels: [".idle-panel", "#roExpansionHunt", ".log-panel"] },
    { id: "save", label: "存檔", icon: "▤", title: "進度管理", description: "本機儲存、匯入與匯出", panels: [".save-panel"] }
  ];

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
    if (!shell || !layout || !play || !side || !api || shell.dataset.oneScreen === "true") return;
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

    const characterPanel = panelNodes.get(".character-panel");
    const skillsPanel = panelNodes.get(".skills-panel");
    const targetPanel = panelNodes.get(".target-panel");
    if (!characterPanel || !skillsPanel || !targetPanel) return;

    const dashboard = make("div", "game-dashboard");
    dashboard.setAttribute("aria-label", "即時遊戲狀態");
    characterPanel.classList.add("dashboard-character");
    skillsPanel.classList.add("dashboard-skills");
    targetPanel.classList.add("dashboard-target");
    dashboard.append(characterPanel, skillsPanel, targetPanel);
    side.replaceChildren(dashboard);

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
        if (panel) body.appendChild(panel);
      });
      if (action.id === "quests" && !$("#roExpansionGuild", body)) {
        body.appendChild(make("p", "menu-empty-note", "任務模組載入中，請稍後重新整理。"));
      }

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
      [
        { title: "城鎮", test: (map) => map.type === "town" },
        { title: "野外", test: (map) => map.type !== "town" && map.type !== "cave" },
        { title: "地下城與 Boss", test: (map) => map.type === "cave" }
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

    // The minimap is useful for exploration, but not required for the one-screen control layout.
    const mapInfo = $(".map-info-row", play);
    if (mapInfo) mapInfo.classList.add("compact-hidden-map-info");

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