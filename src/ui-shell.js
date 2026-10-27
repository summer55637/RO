(function () {
  "use strict";

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  const sections = [
    {
      id: "character",
      label: "角色",
      icon: "♙",
      title: "角色養成",
      summary: "職業、能力值與技能",
      panels: [".character-panel", ".job-panel", ".stats-panel", ".skills-panel"]
    },
    {
      id: "quests",
      label: "任務",
      icon: "✦",
      title: "冒險委託",
      summary: "NPC 對話、主線與每日委託",
      panels: ["#roExpansionGuild"]
    },
    {
      id: "equipment",
      label: "裝備",
      icon: "⚒",
      title: "裝備收藏",
      summary: "裝備、精煉、卡片、圖鑑與商店",
      panels: [".equipment-panel", "#roExpansionGear", ".map-book-panel", "#shopPanel"]
    },
    {
      id: "hunt",
      label: "狩獵",
      icon: "⚔",
      title: "戰鬥管理",
      summary: "自動狩獵、目標設定與戰鬥紀錄",
      panels: [".idle-panel", "#roExpansionHunt", ".target-panel", ".log-panel"]
    },
    {
      id: "save",
      label: "存檔",
      icon: "▤",
      title: "進度管理",
      summary: "本機存檔、匯入與匯出",
      panels: [".save-panel"]
    }
  ];

  function init() {
    const side = document.querySelector(".side-column");
    const api = window.RO_GAME_API;
    if (!side || !api || side.dataset.integratedMenu === "true") return;
    side.dataset.integratedMenu = "true";

    const menu = make("nav", "game-menu-tabs");
    menu.setAttribute("role", "tablist");
    menu.setAttribute("aria-label", "遊戲主選單");

    const views = make("div", "game-menu-views");
    const buttons = new Map();
    const panes = new Map();

    sections.forEach((section) => {
      const button = make("button", "game-menu-tab");
      button.type = "button";
      button.id = "game-tab-" + section.id;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", "game-view-" + section.id);
      button.setAttribute("aria-selected", "false");
      button.tabIndex = -1;

      const icon = make("span", "game-menu-icon", section.icon);
      icon.setAttribute("aria-hidden", "true");
      const label = make("span", "game-menu-label", section.label);
      button.append(icon, label);
      button.addEventListener("click", () => activate(section.id));
      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const current = sections.findIndex((entry) => entry.id === section.id);
        let next = current;
        if (event.key === "ArrowRight") next = (current + 1) % sections.length;
        if (event.key === "ArrowLeft") next = (current - 1 + sections.length) % sections.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = sections.length - 1;
        const nextSection = sections[next];
        activate(nextSection.id);
        buttons.get(nextSection.id).focus();
      });
      buttons.set(section.id, button);
      menu.appendChild(button);

      const pane = make("section", "game-menu-view");
      pane.id = "game-view-" + section.id;
      pane.setAttribute("role", "tabpanel");
      pane.setAttribute("aria-labelledby", button.id);
      pane.tabIndex = 0;
      pane.hidden = true;

      const heading = make("div", "game-menu-view-heading");
      heading.append(
        make("h3", "", section.title),
        make("p", "", section.summary)
      );
      pane.appendChild(heading);

      section.panels.forEach((selector) => {
        const panel = side.querySelector(selector);
        if (panel) pane.appendChild(panel);
      });

      // Report a missing optional section during development without preventing the game from running.
      if (section.id === "quests" && !pane.querySelector("#roExpansionGuild")) {
        pane.appendChild(make("p", "menu-empty-note", "任務模組尚未載入，請重新整理遊戲。"));
      }
      panes.set(section.id, pane);
      views.appendChild(pane);
    });

    // Place the menu before every view, then collapse the old long vertical list into tabs.
    const firstChild = side.firstElementChild;
    side.insertBefore(menu, firstChild);
    side.appendChild(views);

    function activate(id) {
      sections.forEach((section) => {
        const active = section.id === id;
        buttons.get(section.id).classList.toggle("active", active);
        buttons.get(section.id).setAttribute("aria-selected", active ? "true" : "false");
        buttons.get(section.id).tabIndex = active ? 0 : -1;
        panes.get(section.id).hidden = !active;
      });
      try { sessionStorage.setItem("ro-active-menu-tab", id); } catch (_) { /* Private browsing may block session storage. */ }
    }

    let initial = "character";
    try {
      const stored = sessionStorage.getItem("ro-active-menu-tab");
      if (sections.some((section) => section.id === stored)) initial = stored;
    } catch (_) { /* Default tab remains usable without storage. */ }
    activate(initial);

    // Replace the crowded grid of map buttons with a compact region-aware dropdown.
    const oldMapTabs = document.getElementById("mapTabs");
    if (oldMapTabs) {
      const quickNav = make("div", "map-quicknav");
      const label = make("label", "map-quicknav-label", "快速前往");
      label.htmlFor = "mapQuickSelect";
      const select = make("select", "map-quicknav-select");
      select.id = "mapQuickSelect";
      select.setAttribute("aria-label", "快速切換地圖");
      const allMaps = api.getData().maps;
      [
        { title: "城鎮", test: (map) => map.type === "town" },
        { title: "野外與周邊", test: (map) => map.type !== "town" && map.type !== "cave" },
        { title: "地下城與 Boss", test: (map) => map.type === "cave" }
      ].forEach((group) => {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group.title;
        Object.values(allMaps).filter(group.test).forEach((map) => {
          const option = make("option", "", map.name);
          option.value = map.id;
          optgroup.appendChild(option);
        });
        if (optgroup.children.length) select.appendChild(optgroup);
      });
      select.addEventListener("change", () => api.switchMap(select.value));
      quickNav.append(label, select);
      side.querySelector(".play-column")?.insertBefore(quickNav, oldMapTabs);
      oldMapTabs.hidden = true;

      const syncMap = (event) => {
        const id = event && event.detail && event.detail.mapId ? event.detail.mapId : api.getMapId();
        if (allMaps[id]) select.value = id;
      };
      window.addEventListener("ro:map-change", syncMap);
      syncMap();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();