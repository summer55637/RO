(function () {
  'use strict';

  const $ = function (selector) { return document.querySelector(selector); };
  const $$ = function (selector) { return Array.from(document.querySelectorAll(selector)); };
  const SAVE_KEY = 'ro-h5-account-v1';
  const LOCK_KEY = 'ro-h5-active-tab-v1';
  const DB_NAME = 'ro-h5-assets-v1';
  const DB_STORE = 'assets';
  const DOWNLOAD_STATE_KEY = 'ro-h5-download-state-v1';
  const MAX_DOWNLOAD_ATTEMPTS = 3;
  const ASSETS = window.ROWorld.assets;
  const STARTER_ASSETS = ASSETS.filter(function (asset) { return asset.requiredOnStart; });

  let account = null;
  let activeSlot = null;
  let character = null;
  let sessionToken = makeToken();
  let hasControl = false;
  let battleTimer = null;
  let heartbeatTimer = null;
  let autosaveTimer = null;
  let assetDb = null;
  let assetUrls = {};
  let activeDetail = 'status';
  let pendingRenameSlot = null;
  let pendingDeleteSlot = null;
  let hiddenAt = 0;
  let resourceBusy = false;
  let lastNetworkOffline = (typeof navigator !== 'undefined' && navigator.onLine === false);

  function makeToken() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
  }

  function formatNumber(value) {
    return Math.floor(Number(value) || 0).toLocaleString('en-US');
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return h + ' 小時 ' + m + ' 分鐘';
    if (m > 0) return m + ' 分鐘 ' + s + ' 秒';
    return s + ' 秒';
  }

  function setScreen(id) {
    $$('.screen').forEach(function (screen) { screen.classList.toggle('active', screen.id === id); });
  }

  function setInstallMessage(message, isError) {
    $('#install-message').textContent = message || '';
    $('#install-message').style.color = isError ? 'var(--red)' : 'var(--muted)';
  }

  function setAssetStatus(asset, text, kind) {
    const el = $('#' + asset.statusId);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('ok', kind === 'ok');
    el.classList.toggle('error', kind === 'error');
  }

  function setProgress(completed, total) {
    $('#install-progress-fill').style.width = (total ? Math.round(completed / total * 100) : 0) + '%';
  }

  function readDownloadStates() {
    try {
      const raw = localStorage.getItem(DOWNLOAD_STATE_KEY);
      const value = raw ? JSON.parse(raw) : {};
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (_) {
      return {};
    }
  }

  function saveDownloadState(asset, patch) {
    try {
      const states = readDownloadStates();
      const old = states[asset.id] || {};
      states[asset.id] = Object.assign({}, old, {
        version: asset.version || '1.0.0',
        updatedAt: Date.now()
      }, patch);
      localStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify(states));
    } catch (_) {
      // Download bookkeeping must never block an otherwise verified asset.
    }
  }

  function restoreDownloadStatus() {
    const states = readDownloadStates();
    ASSETS.forEach(function (asset) {
      const state = states[asset.id];
      if (state && state.version === (asset.version || '1.0.0') && state.status === 'retry-needed') {
        setAssetStatus(asset, '需手動重試', 'error');
      }
    });
  }

  function updateNetworkStatus() {
    const offline = (typeof navigator !== 'undefined' && navigator.onLine === false);
    const status = $('#connection-status');
    status.textContent = offline ? '離線（使用快取）' : '已連線';
    status.classList.toggle('offline', offline);
    if ($('#screen-install').classList.contains('active') && !resourceBusy) {
      $('#btn-install').disabled = offline;
      if (offline) {
        setInstallMessage('目前離線，下載已暫停。已完成並驗證的素材會保留；恢復連線後可手動重試。', true);
      } else if (lastNetworkOffline) {
        setInstallMessage('已恢復連線。按下按鈕即可重試尚未完成的必要素材；已驗證的素材不需重新下載。', false);
      }
    }
    lastNetworkOffline = offline;
  }

  function delay(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  }

  function openAssetDb() {
    if (assetDb) return Promise.resolve(assetDb);
    if (!('indexedDB' in window)) return Promise.reject(new Error('此瀏覽器不支援 IndexedDB，無法安全保存離線素材。'));
    return new Promise(function (resolve, reject) {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function () {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: 'id' });
      };
      request.onsuccess = function () { assetDb = request.result; resolve(assetDb); };
      request.onerror = function () { reject(request.error || new Error('無法開啟素材快取。')); };
      request.onblocked = function () { reject(new Error('素材快取正在由另一個分頁更新，請關閉其他遊戲分頁後重試。')); };
    });
  }

  function dbGet(id) {
    return openAssetDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const request = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(id);
        request.onsuccess = function () { resolve(request.result || null); };
        request.onerror = function () { reject(request.error || new Error('讀取素材快取失敗。')); };
      });
    });
  }

  function dbPut(record) {
    return openAssetDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const transaction = db.transaction(DB_STORE, 'readwrite');
        transaction.objectStore(DB_STORE).put(record);
        transaction.oncomplete = function () { resolve(); };
        transaction.onerror = function () { reject(transaction.error || new Error('保存素材快取失敗。')); };
        transaction.onabort = function () { reject(transaction.error || new Error('保存素材快取已中止。')); };
      });
    });
  }

  function dbDelete(id) {
    return openAssetDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const request = db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).delete(id);
        request.onsuccess = function () { resolve(); };
        request.onerror = function () { reject(request.error || new Error('清除損壞素材失敗。')); };
      });
    });
  }

  async function gitBlobSha(blob) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('完整性驗證需要 HTTPS 或 localhost。請透過 GitHub Pages 或本機 HTTP 伺服器開啟。');
    }
    const payload = await blob.arrayBuffer();
    const prefix = new TextEncoder().encode('blob ' + blob.size + '\0');
    const bytes = new Uint8Array(prefix.length + payload.byteLength);
    bytes.set(prefix, 0);
    bytes.set(new Uint8Array(payload), prefix.length);
    const digest = await window.crypto.subtle.digest('SHA-1', bytes);
    return Array.from(new Uint8Array(digest)).map(function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
  }

  async function verifyBlob(asset, blob) {
    if (!(blob instanceof Blob) || blob.size !== asset.bytes) throw new Error(asset.name + ' 大小不符，已拒絕使用。');
    const actualSha = await gitBlobSha(blob);
    if (actualSha !== asset.gitSha) throw new Error(asset.name + ' 雜湊不符，已拒絕使用。');
    return true;
  }

  async function cacheAsset(asset) {
    try {
      const cached = await dbGet(asset.id);
      if (cached && cached.blob) {
        try {
          await verifyBlob(asset, cached.blob);
          setAssetStatus(asset, '已驗證', 'ok');
          saveDownloadState(asset, { status: 'ready', lastError: null, attemptsThisCycle: 0 });
          return cached.blob;
        } catch (_) {
          await dbDelete(asset.id);
        }
      }

      const priorState = readDownloadStates()[asset.id] || {};
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const offlineError = new Error('目前離線，無法下載「' + asset.name + '」。已驗證的其他素材會保留；恢復連線後再試。');
        offlineError.retryable = false;
        saveDownloadState(asset, {
          status: 'retry-needed',
          attemptsThisCycle: 0,
          totalAttempts: Number(priorState.totalAttempts) || 0,
          lastError: offlineError.message
        });
        setAssetStatus(asset, '等待連線', 'error');
        throw offlineError;
      }

      let lastError = null;
      let attempts = 0;
      setAssetStatus(asset, '準備下載');
      for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt += 1) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          lastError = new Error('網路中斷，下載已暫停。');
          lastError.retryable = false;
          break;
        }
        attempts = attempt;
        setAssetStatus(asset, attempt === 1 ? '下載中…' : '重試 ' + attempt + '/' + MAX_DOWNLOAD_ATTEMPTS);
        try {
          const response = await fetch(asset.path, { cache: 'no-cache' });
          if (!response.ok) {
            const responseError = new Error('HTTP ' + response.status);
            responseError.retryable = response.status === 408 || response.status === 429 || response.status >= 500;
            throw responseError;
          }

          const blob = await response.blob();
          try {
            await verifyBlob(asset, blob);
          } catch (verificationError) {
            verificationError.retryable = false;
            throw verificationError;
          }

          try {
            await dbPut({ id: asset.id, blob: blob, size: blob.size, gitSha: asset.gitSha, version: asset.version || '1.0.0', savedAt: Date.now() });
          } catch (storageError) {
            storageError.retryable = false;
            throw storageError;
          }

          const previousTotal = Number(priorState.totalAttempts) || 0;
          saveDownloadState(asset, {
            status: 'ready',
            attemptsThisCycle: attempt,
            totalAttempts: previousTotal + attempt,
            lastError: null
          });
          setAssetStatus(asset, '已驗證', 'ok');
          return blob;
        } catch (error) {
          lastError = error;
          if ((typeof navigator !== 'undefined' && navigator.onLine === false) || error.retryable === false || attempt >= MAX_DOWNLOAD_ATTEMPTS) break;
          await delay(250 * attempt);
        }
      }

      const previousTotal = Number(priorState.totalAttempts) || 0;
      const offline = (typeof navigator !== 'undefined' && navigator.onLine === false);
      const errorMessage = offline
        ? '目前離線，下載已暫停。恢復連線後可手動重試。'
        : (asset.name + ' 下載未完成（' + attempts + '/' + MAX_DOWNLOAD_ATTEMPTS + ' 次嘗試）：' + (lastError && lastError.message ? lastError.message : '未知錯誤') + '。可手動重試。');
      saveDownloadState(asset, {
        status: 'retry-needed',
        attemptsThisCycle: attempts,
        totalAttempts: previousTotal + attempts,
        lastError: errorMessage
      });
      setAssetStatus(asset, offline ? '等待連線' : '需手動重試', 'error');
      throw new Error(errorMessage);
    } catch (error) {
      if (!error || !error.message) error = new Error('素材準備失敗，請稍後手動重試。');
      setAssetStatus(asset, (typeof navigator !== 'undefined' && navigator.onLine === false) ? '等待連線' : '需手動重試', 'error');
      throw error;
    }
  }

  function useAssetBlob(asset, blob) {
    if (assetUrls[asset.id]) URL.revokeObjectURL(assetUrls[asset.id]);
    assetUrls[asset.id] = URL.createObjectURL(blob);
  }

  async function ensureAssets(assets, showProgress) {
    const list = assets.slice();
    const blobs = new Array(list.length);
    let nextIndex = 0;
    let completed = 0;
    let failure = null;
    if (showProgress) setProgress(0, list.length);

    async function worker() {
      while (!failure) {
        const index = nextIndex++;
        if (index >= list.length) return;
        try {
          const blob = await cacheAsset(list[index]);
          blobs[index] = { asset: list[index], blob: blob };
          completed += 1;
          if (showProgress) setProgress(completed, list.length);
        } catch (error) {
          failure = error;
        }
      }
    }

    const workerCount = Math.min(2, list.length);
    await Promise.all(Array.from({ length: workerCount }, function () { return worker(); }));
    if (failure) throw failure;
    blobs.forEach(function (item) { useAssetBlob(item.asset, item.blob); });
    return blobs;
  }

  async function prepareResources() {
    const button = $('#btn-install');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setInstallMessage('目前離線，下載不會開始。已驗證的素材已保留；恢復連線後可手動重試。', true);
      button.disabled = true;
      return;
    }
    resourceBusy = true;
    button.disabled = true;
    button.textContent = '正在準備…';
    setProgress(0, STARTER_ASSETS.length);
    setInstallMessage('正在準備第一張地圖的必要素材；同時最多下載 2 項。每項素材最多自動嘗試 3 次，驗證通過後才會寫入快取。', false);
    try {
      await ensureAssets(STARTER_ASSETS, true);
      await registerServiceWorker();
      enterSlotsWithLock(false);
    } catch (error) {
      setInstallMessage((error && error.message ? error.message : '必要素材準備失敗。') + ' 已完成驗證的其他素材會保留。', true);
      button.textContent = '手動重試下載';
      $('#connection-status').textContent = (typeof navigator !== 'undefined' && navigator.onLine === false) ? '離線' : '下載未完成';
    } finally {
      resourceBusy = false;
      if ($('#screen-install').classList.contains('active')) {
        button.disabled = (typeof navigator !== 'undefined' && navigator.onLine === false);
      }
      updateNetworkStatus();
    }
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    try { await navigator.serviceWorker.register('./sw.js'); } catch (_) { /* 不阻擋已準備的本機版本 */ }
  }

  function safeJson(value) {
    try { return JSON.parse(value); } catch (_) { return null; }
  }

  function readLock() {
    try {
      const raw = localStorage.getItem(LOCK_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function isLockOwner() {
    if (!hasControl) return false;
    const lock = readLock();
    return Boolean(lock && lock.token === sessionToken);
  }

  function acquireLock(force) {
    const now = Date.now();
    const current = readLock();
    if (current && current.token !== sessionToken && now - Number(current.updatedAt || 0) < 60000 && !force) return false;
    const generation = current && Number.isFinite(current.generation) ? current.generation + 1 : 1;
    localStorage.setItem(LOCK_KEY, JSON.stringify({ token: sessionToken, updatedAt: now, generation: generation }));
    hasControl = true;
    return true;
  }

  function enterSlotsWithLock(force) {
    let acquired = false;
    try { acquired = acquireLock(Boolean(force)); } catch (error) {
      fatal(error.message || '無法取得帳號操作權。');
      return;
    }
    if (!acquired) {
      const lock = readLock();
      const age = lock ? Math.max(0, Date.now() - Number(lock.updatedAt || 0)) : 60000;
      $('#lock-message').textContent = age >= 60000 ? '上一個分頁已超過 60 秒沒有回應，可以接管。' : '接管前請確認另一個遊戲分頁可停止操作；接管會讓舊分頁立即進入唯讀狀態。';
      $('#btn-takeover').textContent = age >= 60000 ? '接管逾時分頁' : '確認接管操作權';
      setScreen('screen-lock');
      return;
    }
    startHeartbeat();
    startAutosave();
    try {
      account = readAccount();
      $('#connection-status').textContent = '素材已就緒';
      setScreen('screen-slots');
      renderSlots();
    } catch (error) {
      releaseLock();
      fatal(error.message || '存檔無法安全讀取。');
    }
  }

  function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(function () {
      if (!hasControl) return;
      const current = readLock();
      if (!current || current.token !== sessionToken) {
        loseControl();
        return;
      }
      try {
        current.updatedAt = Date.now();
        localStorage.setItem(LOCK_KEY, JSON.stringify(current));
      } catch (_) { loseControl(); }
    }, 2000);
  }

  function startAutosave() {
    if (autosaveTimer) clearInterval(autosaveTimer);
    autosaveTimer = setInterval(function () {
      if (!isLockOwner()) {
        if (hasControl) loseControl();
        return;
      }
      if (character && activeSlot !== null) persistCurrent();
    }, 5000);
  }

  function releaseLock() {
    if (!isLockOwner()) { hasControl = false; return; }
    try { localStorage.removeItem(LOCK_KEY); } catch (_) { /* 關閉時盡力釋放 */ }
    hasControl = false;
  }

  function loseControl() {
    hasControl = false;
    stopBattleLoop();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (autosaveTimer) clearInterval(autosaveTimer);
    heartbeatTimer = null;
    autosaveTimer = null;
    setScreen('screen-lost');
  }

  function readAccount() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return window.ROCore.emptyAccount();
    let parsed;
    try { parsed = JSON.parse(raw); } catch (_) {
      throw new Error('本機存檔不是有效 JSON。原始內容未被覆寫；請先保存瀏覽器資料再處理。');
    }
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.slots) || parsed.slots.length !== 3) {
      throw new Error('本機存檔版本或角色槽格式不符。為保護資料，遊戲沒有重設存檔。');
    }
    parsed.gold = Math.max(0, Number(parsed.gold) || 0);
    parsed.speed = [1, 2, 3].includes(Number(parsed.speed)) ? Number(parsed.speed) : 1;
    if (!parsed.warehouse || typeof parsed.warehouse !== 'object' || Array.isArray(parsed.warehouse)) parsed.warehouse = {};
    return parsed;
  }

  function writeAccount() {
    if (!isLockOwner()) {
      loseControl();
      return false;
    }
    try {
      account.updatedAt = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(account));
      $('#save-status').textContent = '已儲存 · ' + new Date().toLocaleTimeString();
      return true;
    } catch (error) {
      $('#save-status').textContent = '儲存失敗';
      fatal('本機儲存失敗：' + (error.message || '空間不足或瀏覽器封鎖存取。') + '。遊戲已停止寫入。');
      return false;
    }
  }

  function persistCurrent() {
    if (!isLockOwner() || !account) return false;
    if (character && activeSlot !== null) {
      character.lastSavedAt = Date.now();
      account.slots[activeSlot] = character;
    }
    return writeAccount();
  }

  function existingNames(exceptIndex) {
    const data = account || window.ROCore.emptyAccount();
    return data.slots.filter(function (item, index) {
      return item && index !== exceptIndex;
    }).map(function (item) { return item.name; });
  }

  function renderSlots() {
    account = readAccount();
    $('#slots-gold').textContent = formatNumber(account.gold) + ' Zeny';
    const list = $('#slot-list');
    list.replaceChildren();
    account.slots.forEach(function (item, index) {
      const card = document.createElement('article');
      card.className = 'slot-card' + (item ? '' : ' empty');
      const number = document.createElement('div');
      number.className = 'slot-number';
      const numText = document.createElement('span');
      numText.textContent = '角色槽 ' + (index + 1);
      const tag = document.createElement('strong');
      tag.textContent = item ? '已建立' : 'EMPTY';
      number.append(numText, tag);
      card.appendChild(number);
      if (!item) {
        const symbol = document.createElement('div');
        symbol.className = 'empty-symbol';
        symbol.textContent = '+';
        const title = document.createElement('div');
        title.className = 'empty-title';
        title.textContent = '建立初心者';
        const copy = document.createElement('div');
        copy.className = 'empty-copy';
        copy.textContent = '建立新的冒險進度';
        const button = makeButton('建立角色', 'button button-primary', function () { openCreate(index); });
        card.append(symbol, title, copy, button);
      } else {
        const avatar = document.createElement('div');
        avatar.className = 'slot-avatar';
        avatar.innerHTML = playerSvg(item.gender);
        const name = document.createElement('h2');
        name.className = 'slot-name';
        name.textContent = item.name;
        const meta = document.createElement('p');
        meta.className = 'slot-meta';
        meta.textContent = '初心者 · Base ' + item.baseLevel + ' / Job ' + item.jobLevel;
        const buttons = document.createElement('div');
        buttons.className = 'slot-buttons';
        buttons.append(
          makeButton('進入冒險', 'button button-primary', function () { openSlot(index); }),
          makeButton('更名', 'button button-secondary', function () { openRename(index); }),
          makeButton('刪除', 'button button-secondary', function () { openDelete(index); })
        );
        card.append(avatar, name, meta, buttons);
      }
      list.appendChild(card);
    });
  }

  function makeButton(label, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }

  function openCreate(slotIndex) {
    activeSlot = slotIndex;
    character = null;
    $('#create-slot-index').value = String(slotIndex);
    $('#create-name').value = '';
    $('#create-name-message').textContent = '';
    $$('input[name="gender"]').forEach(function (input) { input.checked = input.value === 'male'; });
    $$('input[name="look"]').forEach(function (input) { input.checked = input.value === 'novice'; });
    updateCreatePreview();
    setScreen('screen-create');
    $('#create-name').focus();
  }

  function selectedRadio(name) {
    const selected = $('input[name="' + name + '"]:checked');
    return selected ? selected.value : '';
  }

  function updateCreatePreview() {
    const gender = selectedRadio('gender') || 'male';
    $('#create-avatar').innerHTML = playerSvg(gender);
    $('#create-preview-title').textContent = gender === 'female' ? '初心者標準造型（女性）' : '初心者標準造型（男性）';
  }

  function playerSvg(gender) {
    const female = gender === 'female';
    const hair = female ? '#50304b' : '#36271e';
    const cloth = female ? '#aa6f91' : '#547b9c';
    const cape = female ? '#734b6b' : '#354d6b';
    return '<svg viewBox="0 0 120 160" role="img" aria-label="初心者測試造型">' +
      '<ellipse cx="60" cy="146" rx="34" ry="7" fill="#09131b" opacity=".45"/>' +
      '<path d="M36 64 L23 104 L38 109 L47 83 L45 126 L75 126 L73 83 L83 109 L98 104 L84 64 Z" fill="' + cape + '" stroke="#202c34" stroke-width="2"/>' +
      '<path d="M43 60 L77 60 L85 104 L35 104 Z" fill="' + cloth + '" stroke="#d3bd87" stroke-width="2"/>' +
      '<path d="M52 62 L60 75 L68 62 L65 100 L55 100 Z" fill="#e2d1a4" opacity=".95"/>' +
      '<path d="M43 99 L57 99 L56 133 L39 139 L33 133 Z" fill="#314151"/>' +
      '<path d="M63 99 L77 99 L87 133 L81 139 L64 133 Z" fill="#314151"/>' +
      '<path d="M35 134 L55 133 L55 141 L29 144 Q24 142 28 138 Z" fill="#49392d"/>' +
      '<path d="M65 133 L84 134 L91 139 Q95 144 88 145 L64 141 Z" fill="#49392d"/>' +
      '<path d="M45 47 Q39 24 60 20 Q82 22 76 48 L72 61 L48 61 Z" fill="' + hair + '"/>' +
      '<ellipse cx="60" cy="44" rx="17" ry="20" fill="#f0c69e"/>' +
      '<path d="' + (female ? 'M43 43 Q36 17 59 16 Q83 17 79 48 L72 35 L53 33 L45 51 Z' : 'M43 37 Q42 15 61 17 Q79 17 78 39 L69 31 L52 33 Z') + '" fill="' + hair + '"/>' +
      '<ellipse cx="54" cy="45" rx="2" ry="2.5" fill="#2a2b2b"/><ellipse cx="66" cy="45" rx="2" ry="2.5" fill="#2a2b2b"/>' +
      '<path d="M55 54 Q60 58 65 54" stroke="#a65d53" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M42 59 Q60 67 78 59 L75 69 L45 69 Z" fill="#d8c9a1"/>' +
      '<path d="M86 64 L93 66 L103 33 L98 31 Z" fill="#dce7ec" stroke="#6d8290" stroke-width="1.5"/>' +
      '<path d="M84 66 L96 69 L95 73 L83 70 Z" fill="#a77a46"/><circle cx="90" cy="69" r="3" fill="#e2bf73"/>' +
      '<path d="M46 104 L74 104" stroke="#e0c481" stroke-width="3"/><circle cx="60" cy="78" r="3" fill="#f0d993"/>' +
      '</svg>';
  }

  function handleCreate(event) {
    event.preventDefault();
    if (!isLockOwner()) return loseControl();
    account = readAccount();
    const validation = window.ROCore.validateCharacterName($('#create-name').value, existingNames(activeSlot));
    $('#create-name-message').textContent = validation.reason || '名稱可以使用。';
    $('#create-name-message').style.color = validation.ok ? 'var(--green)' : 'var(--red)';
    if (!validation.ok) return;
    const slotIndex = Number($('#create-slot-index').value);
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2 || account.slots[slotIndex]) {
      $('#create-name-message').textContent = '角色槽狀態已變更，請返回重新選擇。';
      $('#create-name-message').style.color = 'var(--red)';
      return;
    }
    const gender = selectedRadio('gender') || 'male';
    const look = selectedRadio('look') || 'novice';
    character = window.ROCore.makeCharacter(validation.value, gender, look);
    activeSlot = slotIndex;
    character.lastSavedAt = Date.now();
    account.slots[slotIndex] = character;
    if (!writeAccount()) return;
    appendCharacterLog('踏入新手營地。準備好後選擇練功地圖。', 'important');
    renderCamp();
    setScreen('screen-camp');
  }

  function appendCharacterLog(message, kind) {
    if (!character) return;
    if (!Array.isArray(character.logs)) character.logs = [];
    character.logs.push({ message: String(message), kind: kind || '', at: Date.now() });
    character.logs = character.logs.slice(-24);
  }

  function openSlot(index) {
    if (!isLockOwner()) return loseControl();
    account = readAccount();
    const item = account.slots[index];
    if (!item) return openCreate(index);
    activeSlot = index;
    character = item;
    const now = Date.now();
    const elapsed = window.ROCore.resolveOfflineSeconds(character.lastSavedAt, now);
    let report = character.pendingReport || null;
    if (character.battle && character.battle.map && !character.battle.paused && elapsed > 0) {
      report = mergeReports(report, window.ROCore.settleOffline(character, account, elapsed));
    }
    character.pendingReport = report && report.durationSeconds > 0 ? report : null;
    character.lastSavedAt = now;
    account.slots[index] = character;
    if (!writeAccount()) return;
    if (character.battle && character.battle.map) {
      setScreen('screen-battle');
      activeDetail = 'status';
      renderGame();
      startBattleLoop();
    } else {
      renderCamp();
      setScreen('screen-camp');
    }
    if (character.pendingReport) showOfflineReport(character.pendingReport);
  }

  function mergeReports(oldReport, newReport) {
    if (!oldReport || !oldReport.durationSeconds) return newReport;
    const merged = {
      durationSeconds: (oldReport.durationSeconds || 0) + (newReport.durationSeconds || 0),
      expGained: (oldReport.expGained || 0) + (newReport.expGained || 0),
      jobExpGained: (oldReport.jobExpGained || 0) + (newReport.jobExpGained || 0),
      goldGained: (oldReport.goldGained || 0) + (newReport.goldGained || 0),
      kills: (oldReport.kills || 0) + (newReport.kills || 0),
      levelUps: (oldReport.levelUps || []).concat(newReport.levelUps || []),
      drops: Object.assign({}, oldReport.drops || {}),
      jobCapped: Boolean(oldReport.jobCapped || newReport.jobCapped)
    };
    Object.keys(newReport.drops || {}).forEach(function (key) { merged.drops[key] = (merged.drops[key] || 0) + newReport.drops[key]; });
    return merged;
  }

  function renderCamp() {
    if (!character) return;
    $('#camp-avatar').innerHTML = playerSvg(character.gender);
    $('#camp-name').textContent = character.name;
    $('#camp-job').textContent = character.jobName + ' · Job Lv. ' + character.jobLevel;
    $('#camp-level').textContent = String(character.baseLevel);
    $('#camp-stats').replaceChildren();
    [
      ['HP', character.hp + ' / ' + character.maxHp],
      ['SP', character.sp + ' / ' + character.maxSp],
      ['STR', character.stats.str],
      ['AGI', character.stats.agi],
      ['VIT', character.stats.vit],
      ['未分配能力點', character.statPoints]
    ].forEach(function (row) {
      const cell = document.createElement('div');
      cell.className = 'stat-cell';
      const label = document.createElement('span');
      label.textContent = row[0];
      const value = document.createElement('strong');
      value.textContent = String(row[1]);
      cell.append(label, value);
      $('#camp-stats').appendChild(cell);
    });

    const list = $('#map-list');
    list.replaceChildren();
    window.ROWorld.maps.forEach(function (map) {
      const unlocked = character.baseLevel >= map.unlockLevel;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'map-option';
      button.dataset.mapId = map.id;
      button.disabled = !unlocked;
      button.title = unlocked ? '進入 ' + map.name : '需要 Base Lv. ' + map.unlockLevel + ' 才能進入';

      const image = document.createElement('img');
      image.alt = map.name;
      image.src = assetUrls[map.backgroundAssetId] || './assets/field.jpg';

      const copy = document.createElement('span');
      copy.className = 'map-copy';
      const name = document.createElement('strong');
      name.textContent = map.name;
      const level = document.createElement('small');
      level.textContent = unlocked ? '推薦等級：Base Lv. ' + map.recommendedLevels : '解鎖需求：Base Lv. ' + map.unlockLevel;
      const mobs = document.createElement('span');
      mobs.textContent = '出現怪物：' + map.monsters.map(function (entry) {
        const monster = window.ROCore.getMonster(entry.id);
        return monster ? monster.name : entry.id;
      }).join('、');
      copy.append(name, level, mobs);

      const arrow = document.createElement('span');
      arrow.className = 'map-arrow';
      arrow.textContent = unlocked ? '進入 ›' : '未解鎖';
      button.append(image, copy, arrow);
      list.appendChild(button);
    });
    $('#map-load-message').textContent = '其他地圖素材會在首次進入時下載並驗證。';
  }

  async function enterMap(mapId) {
    if (!character || !isLockOwner()) return loseControl();
    const map = window.ROCore.getMap(mapId);
    if (!map) {
      $('#map-load-message').textContent = '找不到這張地圖的資料。';
      return;
    }
    if (character.baseLevel < map.unlockLevel) {
      $('#map-load-message').textContent = '此地圖需要 Base Lv. ' + map.unlockLevel + '。';
      return;
    }
    const mapButton = Array.from($('#map-list').querySelectorAll('[data-map-id]')).find(function (item) { return item.dataset.mapId === map.id; });
    if (mapButton) mapButton.disabled = true;
    $('#map-load-message').textContent = '正在準備「' + map.name + '」的素材並驗證完整性…';

    try {
      const requiredIds = new Set([map.backgroundAssetId]);
      map.monsters.forEach(function (entry) {
        const monster = window.ROCore.getMonster(entry.id);
        if (monster && monster.assetId) requiredIds.add(monster.assetId);
      });
      const neededAssets = ASSETS.filter(function (asset) { return requiredIds.has(asset.id); });
      await ensureAssets(neededAssets, false);
      if (!isLockOwner()) return loseControl();
      if (!window.ROCore.startMap(character, map.id)) throw new Error('目前等級尚未符合地圖需求。');
      character.lastSavedAt = Date.now();
      const monster = window.ROCore.getMonster(character.battle.currentMonsterId);
      appendCharacterLog('進入「' + map.name + '」，開始自動戰鬥。', 'important');
      if (monster) appendCharacterLog('目前遭遇：' + monster.name + '。');
      if (!writeAccount()) return;
      setScreen('screen-battle');
      activeDetail = 'status';
      renderGame();
      startBattleLoop();
    } catch (error) {
      $('#map-load-message').textContent = (error && error.message ? error.message : '地圖素材準備失敗。') + ' 可檢查網路後再次進入。';
    } finally {
      if (mapButton && mapButton.isConnected) mapButton.disabled = character ? character.baseLevel < map.unlockLevel : false;
    }
  }

  function returnToCamp() {
    if (!character || !isLockOwner()) return;
    if (!window.confirm('返回安全營地？已獲得的經驗、Zeny 與掉落會保留；目前未完成的怪物戰鬥將重置。')) return;
    stopBattleLoop();
    character.battle.map = null;
    character.battle.paused = true;
    character.battle.monsterHp = character.battle.monsterMaxHp || 18;
    character.battle.monsterAttackClock = 0;
    character.lastSavedAt = Date.now();
    appendCharacterLog('返回新手營地。已獲得獎勵保留。');
    writeAccount();
    renderCamp();
    setScreen('screen-camp');
  }

  function returnToSlots() {
    if (!isLockOwner()) return loseControl();
    if (!window.confirm('返回角色選擇？目前角色會先保存。')) return;
    stopBattleLoop();
    persistCurrent();
    character = null;
    activeSlot = null;
    account = readAccount();
    renderSlots();
    setScreen('screen-slots');
  }

  function startBattleLoop() {
    stopBattleLoop();
    if (!character || !character.battle || !character.battle.map || character.battle.paused || !isLockOwner()) return;
    battleTimer = setInterval(function () {
      if (!isLockOwner()) return loseControl();
      const rounds = account.speed || 1;
      for (let index = 0; index < rounds; index += 1) {
        const result = window.ROCore.stepCombat(character, account);
        handleCombatResult(result);
      }
      renderGame();
    }, 1000);
  }

  function stopBattleLoop() {
    if (battleTimer) clearInterval(battleTimer);
    battleTimer = null;
  }

  function handleCombatResult(result) {
    if (!result || (!result.playerDamage && !result.killed)) return;
    const hero = $('#hero-sprite');
    const monster = $('#monster-actor');
    const heroInner = hero ? hero.querySelector('.hero-character') : null;
    if (heroInner) {
      heroInner.classList.remove('attack', 'hit');
      if (result.monsterDamage) heroInner.classList.add('hit');
      if (result.playerDamage) heroInner.classList.add('attack');
      window.setTimeout(function () { if (heroInner.isConnected) heroInner.classList.remove('attack', 'hit'); }, 240);
    }
    if (monster && result.playerDamage) {
      monster.classList.remove('hit');
      void monster.offsetWidth;
      monster.classList.add('hit');
      window.setTimeout(function () { if (monster.isConnected) monster.classList.remove('hit'); }, 240);
    }
    if (result.playerDamage) {
      appendCharacterLog('對' + result.monsterName + '造成 ' + result.playerDamage + ' 傷害。');
      const effect = $('#scene-effect');
      effect.textContent = '-' + result.playerDamage;
      effect.classList.remove('show');
      void effect.offsetWidth;
      effect.classList.add('show');
    }
    if (result.monsterDamage) appendCharacterLog('受到' + result.monsterName + ' ' + result.monsterDamage + ' 點傷害。', result.playerDown ? 'warning' : '');
    if (result.killed) {
      let message = '擊倒' + result.monsterName + '：Base EXP +' + result.expGained + '、Job EXP +' + result.jobExpGained + '、' + result.goldGained + ' Zeny。';
      if (result.drops.length) message += ' 掉落：' + result.drops.join('、') + '。';
      appendCharacterLog(message, 'important');
      if (result.levelUps.length) appendCharacterLog('Base 等級提升至 ' + result.levelUps[result.levelUps.length - 1] + '。', 'important');
      if (result.jobCapped) appendCharacterLog('初心者 Job Lv. 已達上限；不會自動轉職。', 'warning');
    }
    if (result.playerDown) appendCharacterLog('角色倒地後返回戰線，原型版不扣除經驗。', 'warning');
  }

  function renderGame() {
    if (!character) return;
    $('#battle-character-name').textContent = character.name;
    $('#hud-name').textContent = character.name;
    $('#hud-job').textContent = character.jobName + ' · Job Lv. ' + character.jobLevel;
    const currentMap = window.ROCore.getMap(character.battle.map);
    $('#battle-map-name').textContent = currentMap ? currentMap.name : '安全營地';
    $('#battle-avatar').innerHTML = playerSvg(character.gender);
    const hero = $('#hero-sprite');
    if (hero.dataset.gender !== character.gender) {
      hero.innerHTML = '<div class="hero-character">' + playerSvg(character.gender) + '</div>';
      hero.dataset.gender = character.gender;
    }
    const currentMonster = window.ROCore.getMonster(character.battle.currentMonsterId);
    $('#scene-background').src = assetUrls[(currentMap && currentMap.backgroundAssetId) || 'field'] || './assets/field.jpg';
    $('.monster-label strong').textContent = currentMonster ? currentMonster.name : '怪物';
    $('#monster-image').src = assetUrls[(currentMonster && currentMonster.assetId) || 'poring'] || './assets/poring.png';
    $('#monster-image').alt = currentMonster ? currentMonster.name : '怪物';
    $('#hp-text').textContent = formatNumber(character.hp) + ' / ' + formatNumber(character.maxHp);
    $('#sp-text').textContent = formatNumber(character.sp) + ' / ' + formatNumber(character.maxSp);
    $('#hp-fill').style.width = Math.max(0, Math.min(100, character.hp / Math.max(1, character.maxHp) * 100)) + '%';
    $('#sp-fill').style.width = Math.max(0, Math.min(100, character.sp / Math.max(1, character.maxSp) * 100)) + '%';
    const need = window.ROCore.baseExpToNext(character.baseLevel);
    $('#exp-text').textContent = formatNumber(character.baseExp) + ' / ' + formatNumber(need);
    $('#exp-fill').style.width = Math.max(0, Math.min(100, character.baseExp / need * 100)) + '%';
    $('#battle-gold').textContent = formatNumber(account.gold);
    $('#hud-level').textContent = 'Base ' + character.baseLevel + ' · Job ' + character.jobLevel;
    $('#monster-hp-text').textContent = character.battle.monsterHp + ' / ' + character.battle.monsterMaxHp + ' HP';
    $('#monster-hp-fill').style.width = Math.max(0, character.battle.monsterHp / character.battle.monsterMaxHp * 100) + '%';
    $('#kill-count').textContent = '擊倒 ' + formatNumber(character.battle.kills) + ' 隻';
    $('#scene-status').textContent = character.battle.paused ? '戰鬥已暫停' : '自動戰鬥中';
    $('#btn-pause').textContent = character.battle.paused ? '繼續' : '暫停';
    $$('.speed-button').forEach(function (button) { button.classList.toggle('active', Number(button.dataset.speed) === account.speed); });
    $('#job-notice').classList.toggle('hidden', !character.jobNotice);
    const logs = $('#battle-log');
    logs.replaceChildren();
    (character.logs || []).slice(-18).forEach(function (item) {
      const line = document.createElement('div');
      line.className = 'log-line' + (item.kind ? ' ' + item.kind : '');
      line.textContent = item.message;
      logs.appendChild(line);
    });
    logs.scrollTop = logs.scrollHeight;
    renderDetails();
  }

  function renderDetails() {
    const content = $('#details-content');
    $$('.detail-tab').forEach(function (button) { button.classList.toggle('active', button.dataset.detail === activeDetail); });
    content.replaceChildren();
    if (!character) return;
    if (activeDetail === 'status') {
      addDetailHeading(content, '角色狀態');
      [
        ['職業', character.jobName],
        ['Base 等級', character.baseLevel],
        ['Job 等級', character.jobLevel + ' / ' + window.ROCore.JOB_LEVEL_CAP],
        ['力量 STR', character.stats.str],
        ['敏捷 AGI', character.stats.agi],
        ['體質 VIT', character.stats.vit],
        ['未分配能力點', character.statPoints]
      ].forEach(function (row) { addDetailRow(content, row[0], row[1]); });
    } else if (activeDetail === 'warehouse') {
      addDetailHeading(content, '帳號共用倉庫');
      addDetailRow(content, '共用 Zeny', formatNumber(account.gold));
      const list = document.createElement('div');
      list.className = 'warehouse-list';
      const items = Object.entries(account.warehouse || {}).filter(function (entry) { return Number(entry[1]) > 0; }).sort(function (a, b) { return a[0].localeCompare(b[0], 'zh-Hant'); });
      if (!items.length) {
        const empty = document.createElement('p');
        empty.className = 'field-help';
        empty.textContent = '尚無物品。擊倒波利後可能獲得果凍質塊或獸毛。';
        list.appendChild(empty);
      } else {
        items.forEach(function (entry) {
          const row = document.createElement('div');
          row.className = 'warehouse-item';
          const name = document.createElement('span');
          name.textContent = entry[0];
          const qty = document.createElement('strong');
          qty.textContent = '× ' + formatNumber(entry[1]);
          row.append(name, qty);
          list.appendChild(row);
        });
      }
      content.appendChild(list);
    } else {
      addDetailHeading(content, '職業進度');
      addDetailRow(content, '目前職業', character.jobName);
      addDetailRow(content, 'Job 等級', character.jobLevel + ' / ' + window.ROCore.JOB_LEVEL_CAP);
      addDetailRow(content, 'Job EXP', formatNumber(character.jobExp) + ' / ' + (character.jobLevel >= window.ROCore.JOB_LEVEL_CAP ? '—' : window.ROCore.jobExpToNext(character.jobLevel)));
      const note = document.createElement('p');
      note.className = 'field-help';
      note.textContent = character.jobNotice ? '已達目前職業等級上限。已保留提示；不會自動轉職。' : '符合條件後由玩家自行選擇轉職。本版尚未接入正式職業樹。';
      content.appendChild(note);
      if (character.jobNotice) {
        const button = makeButton('我已查看職業提示', 'button button-secondary', function () {
          character.jobNotice = false;
          persistCurrent();
          renderGame();
        });
        button.style.marginTop = '10px';
        content.appendChild(button);
      }
    }
  }

  function addDetailHeading(parent, title) {
    const heading = document.createElement('h3');
    heading.textContent = title;
    parent.appendChild(heading);
  }

  function addDetailRow(parent, label, value) {
    const row = document.createElement('div');
    row.className = 'detail-row';
    const left = document.createElement('span');
    left.textContent = label;
    const right = document.createElement('strong');
    right.textContent = String(value);
    row.append(left, right);
    parent.appendChild(row);
  }

  function setDetail(name) {
    activeDetail = name;
    if (name === 'job' && character && character.jobNotice) {
      character.jobNotice = false;
      persistCurrent();
    }
    renderDetails();
  }

  function changeSpeed(value) {
    if (!isLockOwner()) return loseControl();
    const speed = Number(value);
    if (![1, 2, 3].includes(speed)) return;
    account = readAccount();
    account.speed = speed;
    if (character && activeSlot !== null) {
      const latest = account.slots[activeSlot];
      if (latest) character = latest;
    }
    if (!writeAccount()) return;
    if (character && character.battle && character.battle.map) {
      renderGame();
      startBattleLoop();
    }
  }

  function togglePause() {
    if (!character || !isLockOwner()) return;
    character.battle.paused = !character.battle.paused;
    character.lastSavedAt = Date.now();
    persistCurrent();
    renderGame();
    startBattleLoop();
  }

  function showOfflineReport(report) {
    $('#offline-duration').textContent = '已依真實經過時間結算 ' + formatDuration(report.durationSeconds) + '（最多 24 小時）';
    const summary = $('#offline-summary');
    summary.replaceChildren();
    [
      ['擊倒怪物', formatNumber(report.kills) + ' 隻'],
      ['Base EXP', '+' + formatNumber(report.expGained)],
      ['Job EXP', '+' + formatNumber(report.jobExpGained)],
      ['共用 Zeny', '+' + formatNumber(report.goldGained)],
      ['Base 等級', (report.levelUps && report.levelUps.length ? 'Lv. ' + report.levelUps[0] + (report.levelUps.length > 1 ? ' → ' + report.levelUps[report.levelUps.length - 1] : '') : '無變化')],
      ['掉落', Object.keys(report.drops || {}).length ? Object.entries(report.drops).map(function (entry) { return entry[0] + ' ×' + entry[1]; }).join('、') : '無物品']
    ].forEach(function (row) {
      const card = document.createElement('div');
      card.className = 'summary-stat';
      const label = document.createElement('span');
      label.textContent = row[0];
      const value = document.createElement('strong');
      value.textContent = row[1];
      card.append(label, value);
      summary.appendChild(card);
    });
    if (report.jobCapped) {
      const warning = document.createElement('p');
      warning.className = 'field-help';
      warning.textContent = '離線期間達到 Job 等級上限。請查看職業面板；不會自動轉職。';
      summary.appendChild(warning);
    }
    const dialog = $('#offline-dialog');
    if (!dialog.open) dialog.showModal();
  }

  function closeOfflineReport() {
    if (character && character.pendingReport) {
      character.pendingReport = null;
      persistCurrent();
    }
    $('#offline-dialog').close();
  }

  function openRename(index) {
    account = readAccount();
    if (!account.slots[index]) return;
    pendingRenameSlot = index;
    $('#rename-name').value = account.slots[index].name;
    $('#rename-message').textContent = '更名費用 50,000 Zeny；目前共用 Zeny：' + formatNumber(account.gold) + '。';
    $('#rename-message').style.color = 'var(--muted)';
    $('#btn-rename-confirm').disabled = account.gold < 50000;
    $('#rename-dialog').showModal();
  }

  function checkRenameInput() {
    if (pendingRenameSlot === null) return;
    account = readAccount();
    const validation = window.ROCore.validateCharacterName($('#rename-name').value, existingNames(pendingRenameSlot));
    const canPay = account.gold >= 50000;
    $('#btn-rename-confirm').disabled = !validation.ok || !canPay;
    $('#rename-message').textContent = !canPay ? '共用 Zeny 不足，需 50,000 Zeny。' : (validation.reason || '名稱可以使用；確認後會扣除 50,000 Zeny。');
    $('#rename-message').style.color = validation.ok && canPay ? 'var(--green)' : 'var(--red)';
  }

  function confirmRename() {
    if (!isLockOwner() || pendingRenameSlot === null) return loseControl();
    account = readAccount();
    const validation = window.ROCore.validateCharacterName($('#rename-name').value, existingNames(pendingRenameSlot));
    if (!validation.ok || account.gold < 50000) {
      checkRenameInput();
      return;
    }
    const item = account.slots[pendingRenameSlot];
    if (!item) return $('#rename-dialog').close();
    account.gold -= 50000;
    item.name = validation.value;
    account.slots[pendingRenameSlot] = item;
    if (!writeAccount()) return;
    $('#rename-dialog').close();
    pendingRenameSlot = null;
    renderSlots();
  }

  function openDelete(index) {
    account = readAccount();
    const item = account.slots[index];
    if (!item) return;
    pendingDeleteSlot = index;
    $('#delete-warning').textContent = '將刪除「' + item.name + '」（Base Lv. ' + item.baseLevel + '、Job Lv. ' + item.jobLevel + '）的個人進度。共用倉庫與 Zeny 會保留。';
    $('#delete-name').value = '';
    $('#delete-check').checked = false;
    $('#delete-message').textContent = '';
    $('#btn-delete-confirm').disabled = true;
    $('#delete-dialog').showModal();
  }

  function checkDeleteInput() {
    if (pendingDeleteSlot === null) return;
    account = readAccount();
    const item = account.slots[pendingDeleteSlot];
    const exact = item && $('#delete-name').value === item.name;
    const checked = $('#delete-check').checked;
    $('#btn-delete-confirm').disabled = !(exact && checked);
    $('#delete-message').textContent = !exact ? '請輸入完全相同的角色名稱。' : (!checked ? '請勾選確認框。' : '兩項確認已完成。');
    $('#delete-message').style.color = exact && checked ? 'var(--green)' : 'var(--muted)';
  }

  function confirmDelete() {
    if (!isLockOwner() || pendingDeleteSlot === null) return loseControl();
    account = readAccount();
    const item = account.slots[pendingDeleteSlot];
    if (!item || $('#delete-name').value !== item.name || !$('#delete-check').checked) return checkDeleteInput();
    Object.entries(item.personalItems || {}).forEach(function (entry) {
      account.warehouse[entry[0]] = (Number(account.warehouse[entry[0]]) || 0) + Math.max(0, Number(entry[1]) || 0);
    });
    account.slots[pendingDeleteSlot] = null;
    if (!writeAccount()) return;
    $('#delete-dialog').close();
    pendingDeleteSlot = null;
    renderSlots();
  }

  function showToast(message) {
    $('#save-status').textContent = message;
    window.setTimeout(function () {
      const status = $('#save-status');
      if (status && status.textContent === message) status.textContent = '本機存檔';
    }, 2200);
  }

  function handleVisibility() {
    if (!document.hidden) {
      if (!hiddenAt) return;
      hiddenAt = 0;
      if (!isLockOwner()) return loseControl();
      if (character && activeSlot !== null) {
        try {
          account = readAccount();
          character = account.slots[activeSlot];
          if (!character) { activeSlot = null; return renderSlots(); }
          const now = Date.now();
          const elapsed = window.ROCore.resolveOfflineSeconds(character.lastSavedAt, now);
          let report = character.pendingReport || null;
          if (character.battle && character.battle.map && !character.battle.paused && elapsed > 0) {
            report = mergeReports(report, window.ROCore.settleOffline(character, account, elapsed));
          }
          character.pendingReport = report && report.durationSeconds > 0 ? report : null;
          character.lastSavedAt = now;
          if (!writeAccount()) return;
          if (character.battle && character.battle.map) {
            renderGame();
            startBattleLoop();
          } else renderCamp();
          if (character.pendingReport) showOfflineReport(character.pendingReport);
        } catch (error) { fatal(error.message || '恢復遊戲狀態失敗。'); }
      }
      return;
    }
    hiddenAt = Date.now();
    if (character && activeSlot !== null && isLockOwner()) persistCurrent();
  }

  function onStorage(event) {
    if (event.key !== LOCK_KEY) return;
    const lock = event.newValue ? safeJson(event.newValue) : null;
    if (hasControl && (!lock || lock.token !== sessionToken)) {
      loseControl();
    } else if (!hasControl && !lock && $('#screen-lock').classList.contains('active')) {
      enterSlotsWithLock(false);
    }
  }

  function fatal(message) {
    stopBattleLoop();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (autosaveTimer) clearInterval(autosaveTimer);
    heartbeatTimer = null;
    autosaveTimer = null;
    if (isLockOwner()) releaseLock();
    else hasControl = false;
    $('#fatal-message').textContent = message;
    setScreen('screen-error');
  }

  function bindEvents() {
    $('#btn-install').addEventListener('click', prepareResources);
    $('#create-form').addEventListener('submit', handleCreate);
    $$('input[name="gender"]').forEach(function (input) { input.addEventListener('change', updateCreatePreview); });
    $$('input[name="look"]').forEach(function (input) { input.addEventListener('change', updateCreatePreview); });
    $('#create-name').addEventListener('input', function () {
      const validation = window.ROCore.validateCharacterName($('#create-name').value, existingNames(activeSlot));
      $('#create-name-message').textContent = validation.reason || (validation.value ? '名稱可以使用。' : '');
      $('#create-name-message').style.color = validation.ok ? 'var(--green)' : 'var(--red)';
    });
    $('#btn-create-cancel').addEventListener('click', function () { character = null; activeSlot = null; renderSlots(); setScreen('screen-slots'); });
    $('#btn-refresh-slots').addEventListener('click', function () { account = readAccount(); renderSlots(); showToast('已重新讀取存檔'); });
    $('#map-list').addEventListener('click', function (event) {
      const button = event.target.closest('[data-map-id]');
      if (button && !button.disabled) enterMap(button.dataset.mapId);
    });
    $('#btn-camp-back').addEventListener('click', returnToSlots);
    $('#btn-battle-camp').addEventListener('click', returnToCamp);
    $('#btn-pause').addEventListener('click', togglePause);
    $('#btn-save').addEventListener('click', function () { if (persistCurrent()) showToast('已保存到本機'); });
    $$('.speed-button').forEach(function (button) { button.addEventListener('click', function () { changeSpeed(button.dataset.speed); }); });
    $$('.detail-tab').forEach(function (button) { button.addEventListener('click', function () { setDetail(button.dataset.detail); }); });
    $('#btn-offline-close').addEventListener('click', closeOfflineReport);
    $('#rename-name').addEventListener('input', checkRenameInput);
    $('#btn-rename-cancel').addEventListener('click', function () { $('#rename-dialog').close(); pendingRenameSlot = null; });
    $('#btn-rename-confirm').addEventListener('click', confirmRename);
    $('#delete-name').addEventListener('input', checkDeleteInput);
    $('#delete-check').addEventListener('change', checkDeleteInput);
    $('#btn-delete-cancel').addEventListener('click', function () { $('#delete-dialog').close(); pendingDeleteSlot = null; });
    $('#btn-delete-confirm').addEventListener('click', confirmDelete);
    $('#btn-takeover').addEventListener('click', function () { enterSlotsWithLock(true); });
    $('#btn-lock-recheck').addEventListener('click', function () { enterSlotsWithLock(false); });
    $('#btn-lost-reload').addEventListener('click', function () { window.location.reload(); });
    $('#btn-error-reload').addEventListener('click', function () { window.location.reload(); });
    window.addEventListener('storage', onStorage);
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    window.addEventListener('beforeunload', function () {
      if (character && activeSlot !== null && isLockOwner()) persistCurrent();
      stopBattleLoop();
      releaseLock();
    });
    document.addEventListener('visibilitychange', handleVisibility);
  }

  async function init() {
    bindEvents();
    restoreDownloadStatus();
    updateNetworkStatus();
    updateCreatePreview();
    try {
      const ready = await loadCachedResources();
      if (ready) {
        setInstallMessage('已找到必要素材快取，驗證通過。', false);
        await registerServiceWorker();
        enterSlotsWithLock(false);
      } else {
        setScreen('screen-install');
        setInstallMessage('首次使用請按下按鈕下載並驗證必要素材。', false);
      }
    } catch (error) {
      setScreen('screen-install');
      setInstallMessage(error.message || '無法檢查本機素材。', true);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();