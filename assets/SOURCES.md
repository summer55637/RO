# 素材來源與完整性

## MVP 2.2 怪物動畫素材研究指紋（2026-10-17）

- [Divine Pride Mob 1051 spritesheet](https://static.divine-pride.net/images/spritesheets/npc/1051.png)：HTTP 200、PNG、188×350 pixels、21,003 bytes；Git blob SHA-1 `03f1760eb96eb810e8c04ee28f0e2b86bc049c59`。這是整理後的靜態精靈圖集，只記錄作為研究參考，不把其格子順序當成待機／攻擊／受擊的可靠動畫順序。
- [PyRO-Tools 範例資料](https://github.com/MyGodIsHe/pyro-tools/tree/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data)固定於提交 `1a28450df59bc69e56e70e431f9b61351bafc8f6`，包含以下配對二進位檔。它們屬研究／轉檔的候選輸入，本次沒有把 `.act`／`.spr` 直接送進遊戲 runtime。

| 怪物 | 檔案 | bytes | Git blob SHA-1 |
|---|---|---:|---|
| 瘋兔（Mob 1063） | [lunatic.act](https://github.com/MyGodIsHe/pyro-tools/blob/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data/lunatic.act) | 129,468 | `fb90ed9e0d2f71392b2f25cddb4784a09a221cca` |
| 瘋兔（Mob 1063） | [lunatic.spr](https://github.com/MyGodIsHe/pyro-tools/blob/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data/lunatic.spr) | 36,287 | `1cdcc31c9135ede2140e0d951b59efcc1560eda2` |
| 狼（Mob 1013） | [wolf.act](https://github.com/MyGodIsHe/pyro-tools/blob/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data/wolf.act) | 36,564 | `93c05e86366a7d9cfab19f59d1ff8f60dd1b617d` |
| 狼（Mob 1013） | [wolf.spr](https://github.com/MyGodIsHe/pyro-tools/blob/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data/wolf.spr) | 104,662 | `61b60050dce8094bbebf04d86cc87ef1e8d61706` |

- ACT 提供動作、畫格、圖層與間隔資料，SPR 提供索引色／RGBA sprites；必須解析成配對資料並核對每個 action 的 frame references，不能只從圖集視覺排列推斷動畫。研究參考：[ACT format](https://github.com/rdw-archive/RagnarokFileFormats/blob/master/ACT.MD)、[SPR format](https://github.com/rdw-archive/RagnarokFileFormats/blob/master/SPR.MD)。



## MVP 1.5 怪物圖片 ID 稽核

- 根因：上游 images/README.md 與 tools/download_monster_images.js 把專案自訂的顯示序號當成實際 RO Mob ID 下載；例如 1001 被標成瘋兔，但 Mob DB 中 1001 是蠍子，瘋兔正確 ID 是 1063。程式目前改以正確 Mob ID 連到對應圖片。
- Mob ID 依據：[rAthena pre-renewal mob_db.yml（固定 commit）](https://github.com/rathena/rathena/blob/975c87dfc27ab267b2ec0dddff77421b2e6ee87b/db/pre-re/mob_db.yml)。這是用於核對 Mob ID 的社群資料庫，不代表所有數值均等同台灣官方版本。
- 圖片來源：[nba9001-sys/ro-idle 固定版本](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940)。Git blob SHA-1 與 bytes 由素材清單固定，下載器驗證後才啟用。
- 首次下載畫面需與此清單同步：瘋兔為 Mob 1063（`1063.png`，598 bytes），綠棉蟲為 Mob 1007（`1007.png`，789 bytes）；UI 回歸測試會檢查名稱、檔名與大小。

| 遊戲怪物 | Mob ID | 固定來源檔案 | bytes | Git blob SHA-1 |
|---|---:|---|---:|---|
| 波利 Poring | 1002 | [1002.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1002.png) | 708 | 9205f4b39eaea3eb175e0eabdcc6ba10ec296641 |
| 瘋兔 Lunatic | 1063 | [1063.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1063.png) | 598 | ae31b3bd6c29aeea5985f5b585ab0c9bb8eaa8fa |
| 綠棉蟲 Fabre | 1007 | [1007.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1007.png) | 789 | e9f3ef887164c0c7d0aa883e82d61f49b2379d59 |
| 蛹 Pupa | 1008 | [1008.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1008.png) | 771 | 6603da0bdf588b3f74381442fe0dc82aa574ef2c |
| 狼 Wolf | 1013 | [1013.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1013.png) | 1,892 | b597c222615da8a15634eeaf3da1833945ec9910 |
| 蜂兵 Hornet | 1004 | [1004.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1004.png) | 942 | 32d3c7d9cd9e71064a7e9b074b52293bc8bc97b0 |
| 哥布林 Goblin | 1122 | [1122.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1122.png) | 1,286 | 739efe8c25378c55afcc754ef42b820c2e1d3b8a |
| 半獸人戰士 Orc Warrior | 1023 | [1023.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1023.png) | 3,359 | 98b9797413239e1f4e9055a2baf48e07cfda1da3 |
| 柳精 Willow | 1010 | [1010.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1010.png) | 7,673 | df0b18eb2c2ab52b8e4d07dd470bb9f63bffe652 |
| 孢子 Spore | 1014 | [1014.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1014.png) | 1,617 | 17a0870a9c6b6e8d43dbc33cdc8171fce318b4c3 |
| 波波利 Poporing | 1031 | [1031.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1031.png) | 709 | 86f8e4f14bff569963e0a98c546e4234e6e0009e |
| 大嘴鳥 Peco Peco | 1019 | [1019.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1019.png) | 2,545 | f84f9c624b23241cd5669851fa33ad2fe5fcf331 |
| 小雞 Picky | 1049 | [1049.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1049.png) | 409 | 67b06c12d629885ad9c3cd7bf893370840d14e8e |
| 禿鷹 Condor | 1009 | [1009.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1009.png) | 4,181 | f8029dca4c909a67650986ca272180872d587214 |

- 盜蟲 Thief Bug：Divine Pride 的[怪物資料頁](https://www.divine-pride.net/database/monster/1051/thief-bug)交叉確認名稱 `THIEF_BUG` 與 Mob ID `1051`。於 2026-10-17 從[原始 PNG URL](https://static.divine-pride.net/images/mobs/png/1051.png)取得 `image/png` 回應並固定至 `assets/thief_bug.png`；檔案為 36×27 pixels、1,783 bytes，Git blob SHA-1 `342abcc99d1c1d902751b64e65b6f56d8b309342`。`world-data.js` 將本地檔案固定為此大小／雜湊，遊戲下載至 IndexedDB 前會重新驗證，失敗時僅使用獨立向量備援，不使用 Mob 1015（殭屍）。[精靈表](https://static.divine-pride.net/images/spritesheets/npc/1051.png)已可檢視多個姿態，但本次尚未匯入該表，也未取得／解析對應 ACT 動作資料；因此此改動只接入正確靜態圖像，不宣稱已接入逐格動畫。
- 錯誤舊檔：原本標成 lunatic.png 的位元組其實來自 Mob 1001（蠍子）；原 fabre.png 來自 Mob 1003；原 thief_bug.png 來自 Mob 1015（殭屍）。現在重新命名為 scorpion.png、testegg.png、zombie.png，且不再對應給錯誤怪物。

## MVP 1.4 材料與消耗品原型

- 本階段沒有新增圖片、音效或其他二進位素材；製作配方直接消耗 world-data.js 中既有怪物會掉落的材料名稱，成品保存在既有共用 warehouse。
- 目前提供 3 種自訂補給品：胡蘿蔔補給（胡蘿蔔 ×2、空瓶 ×1，最多恢復 18 HP）、果凍治療藥（果凍質塊 ×2、昆蟲外殼 ×1、空瓶 ×1，最多恢復 35 HP）、蜂蜜藥水（蜂蜜 ×1、蘑菇孢子 ×2、空瓶 ×1，最多恢復 65 HP）。
- 配方與恢復值是本遊戲的原型平衡設定；未直接匯入 rAthena 或台灣官方 PC RO 道具／配方資料，不代表正式伺服器實際數值。

## MVP 1.3 裝備／卡片資料欄位參考

- 參考 rAthena 道具資料格式文件 [`item_db.yml`](https://github.com/rathena/rathena/blob/d4b8e7b8f16061cc2496d377ac8f777ce72a4f39/doc/yaml/db/item_db.yml)，固定參考版本：`d4b8e7b8f16061cc2496d377ac8f777ce72a4f39`。該格式包含物品類型、買／賣價格、攻防數值、卡槽、職業可裝備條件、最低裝備等級等常用欄位；本專案按自己的簡化模型映射到 slot、requiredLevel、allowedJobs、effects、sellPrice。
- 本次沒有匯入完整 rAthena 資料庫或二進位素材；14 件裝備、6 張卡片、售價、能力加成及掉落機率均為本專案重新編寫的原型資料。不得把社群資料庫視為台灣官方 PC RO 當前正式平衡／掉落權重。

## MVP 1.2 裝備出售與卡片取出規則

- 本階段未新增二進位素材，也未引入完整外部道具資料庫。卡片移除沿用本專案自訂裝備 instance 的 `cards` 清單及帳號共用 `warehouse`。
- 裝備出售價格是本專案原型欄位：初心者短刀 30、棉布冒險服 40、旅人涼鞋 25、幸運草護符 50 Zeny。出售只支付基礎價，不退還精煉費；附卡裝備須先取出所有卡片，並禁止出售仍穿戴中的 instance。
- 這些出售價格和交易規則是為了測試遊戲經濟循環而自訂，不視為台灣官方 PC RO 現行 NPC 回收價格或卡片拆除規則。

## MVP 1.1 精煉規則資料結構參考

- [rAthena `db/refine.yml`](https://github.com/rathena/rathena/blob/master/db/refine.yml) 提供精煉分組、精煉等級、加成、Zeny 價格、材料、成功率、破壞率與失敗降級等欄位，可用來確認精煉系統通常需要哪些資料項目。
- 本專案 MVP 1.1 不直接複製該資料庫；採自訂的 +0 至 +5 保證成功、不破壞裝備、每目標等級 100 Zeny 的簡化原型規則，避免把特定 rAthena 伺服器的規則誤稱為台灣官方 PC RO 現行平衡。

## MVP 1.0 道具資料與欄位參考

- 欄位概念參考 [rAthena 的 `db/item_db.yml`](https://github.com/rathena/rathena/blob/master/db/item_db.yml) 及 [道具資料格式說明](https://github.com/rathena/rathena/blob/master/doc/item_db.txt)，包括道具類型、攻擊／防禦、裝備位置、卡槽和職業需求欄位。這些是社群伺服器的資料結構參考，不是台灣官方現行道具平衡的權威來源。
- 本階段的四種裝備、三種卡片、裝備效果及新增怪物掉落率是在本專案內編寫的原型資料；沒有從上游複製任何二進位素材或完整道具資料庫，也沒有宣稱數值等同台灣官方 PC RO。

## MVP 0.9 怪物圖鑑資料說明

本階段未新增圖片、音訊或其他二進位檔案。圖鑑讀取本專案 `world-data.js` 已有的怪物名稱、原型 HP、掉落資料及六張地圖遭遇表；既有圖片與素材的固定來源、bytes、Git blob SHA 仍依下方批次紀錄驗證。怪物掉落機率、數值與地圖權重屬本專案原型參數，不視為台灣官方 PC RO 現行資料。

以下檔案由素材倉庫原樣複製，未對圖片內容進行修改。Git blob SHA 可驗證檔案是否與來源版本的位元組內容一致。

| 本專案路徑 | 來源路徑 | 原始大小 | Git blob SHA |
|---|---|---:|---|
| assets/field.jpg | [images/maps/field.jpg](https://github.com/nba9001-sys/ro-idle/blob/main/images/maps/field.jpg) | 164,403 bytes | 138cef2baecce252bf9095f856927d0573642394 |
| assets/poring.png | [images/monsters/1002.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1002.png) | 708 bytes | 9205f4b39eaea3eb175e0eabdcc6ba10ec296641 |
| assets/scorpion.png | [images/monsters/1001.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1001.png) | 4,929 bytes | 538cb55daf931cc39ba677c32930e288b64d3ae1 |
| assets/testegg.png | [images/monsters/1003.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1003.png) | 330 bytes | 63091a44b7bdae2fcd59b8753ba5c4e5f04f9d37 |
| assets/pupa.png | [images/monsters/1008.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1008.png) | 771 bytes | 6603da0bdf588b3f74381442fe0dc82aa574ef2c |
| assets/zombie.png | [images/monsters/1015.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1015.png) | 1,906 bytes | ef27e37d53ddb15fad6e551e34868083df407d54 |

第一張地圖必要素材合計 170,370 bytes（約 167 KiB）；需要蛹與盜蟲圖像的地圖合計 2,554 bytes（蛹 771 bytes＋盜蟲 1,783 bytes），於首次進入需要這些素材的地圖時才下載並驗證。

專案擁有者已聲明取得 RO 公司相關授權。請另行保存正式授權文件及其涵蓋範圍；素材倉庫原本的程式碼／文字授權不應被誤認為 RO 第三方素材的權利來源。

## 第二批按需載入素材（MVP 0.2）

新增素材來源固定在 [nba9001-sys/ro-idle commit 2348031](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940)，遊戲不會下載整個上游倉庫；只在需要的地圖或角色出現時才從下列路徑讀取，並以大小及 Git blob SHA-1 驗證後存入本機 IndexedDB。

### 怪物圖像

下表已按 MVP 1.5 實際 Mob ID 更正；所有 URL 均固定至原始 commit。

| 遊戲資產 ID | 上游路徑 | bytes | Git blob SHA |
|---|---|---:|---|
| lunatic | [1063.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1063.png) | 598 | `ae31b3bd6c29aeea5985f5b585ab0c9bb8eaa8fa` |
| fabre | [1007.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1007.png) | 789 | `e9f3ef887164c0c7d0aa883e82d61f49b2379d59` |
| wolf | [1013.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1013.png) | 1,892 | `b597c222615da8a15634eeaf3da1833945ec9910` |
| hornet | [1004.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1004.png) | 942 | `32d3c7d9cd9e71064a7e9b074b52293bc8bc97b0` |
| goblin | [1122.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1122.png) | 1,286 | `739efe8c25378c55afcc754ef42b820c2e1d3b8a` |
| orc | [1023.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1023.png) | 3,359 | `98b9797413239e1f4e9055a2baf48e07cfda1da3` |
| willow | [1010.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1010.png) | 7,673 | `df0b18eb2c2ab52b8e4d07dd470bb9f63bffe652` |
| spore | [1014.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1014.png) | 1,617 | `17a0870a9c6b6e8d43dbc33cdc8171fce318b4c3` |
| poporing | [1031.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1031.png) | 709 | `86f8e4f14bff569963e0a98c546e4234e6e0009e` |
| pecopeco | [1019.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1019.png) | 2,545 | `f84f9c624b23241cd5669851fa33ad2fe5fcf331` |
| picky | [1049.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1049.png) | 409 | `67b06c12d629885ad9c3cd7bf893370840d14e8e` |
| condor | [1009.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1009.png) | 4,181 | `f8029dca4c909a67650986ca272180872d587214` |

### 地圖背景

| 資產 ID | 上游路徑 | bytes | Git blob SHA |
|---|---|---:|---|
| cave | [cave.jpg](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/maps/cave.jpg) | 142,952 | `e283f18706e578ba51d5bdf898a4897619a5d216` |
| desert | [desert.jpg](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/maps/desert.jpg) | 91,999 | `72a7dcc646fe513f232ed5a199ba97733eac6156` |

### 職業外觀圖（各性別一張站立／預設畫格）

以下是上游 `images/frames/{job}_{gender}/frame_000.png`，只接入一張靜態畫格，**尚不是逐格動畫**。載入失敗時仍會使用遊戲內建 SVG 造型。

| 資產 ID | 上游路徑 | bytes | Git blob SHA |
|---|---|---:|---|
| player_novice_male | [novice_male/frame_000.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/frames/novice_male/frame_000.png) | 3,774 | `24d0463d0864f791e2cc477e2bf0b3f5eb99f485` |
| player_novice_female | [novice_female/frame_000.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/frames/novice_female/frame_000.png) | 3,729 | `744a3e358ab813aad2b1446e5a2688bb882406d4` |
| player_swordsman_male | [swordsman_male/frame_000.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/frames/swordsman_male/frame_000.png) | 3,933 | `f8bd381135663c2309ce90294ac4bdfad2fa9803` |
| player_swordsman_female | [swordsman_female/frame_000.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/frames/swordsman_female/frame_000.png) | 3,693 | `b1f7e2d7dc848b03f577038ddf12385a0939c0d8` |
| player_mage_male | [mage_male/frame_000.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/frames/mage_male/frame_000.png) | 4,943 | `52dc6f591195512a5a0368e12c17202546090506` |
| player_mage_female | [mage_female/frame_000.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/frames/mage_female/frame_000.png) | 5,020 | `14796e535a530d7fcb66feb2377f2f59cb14c49b` |
| player_archer_male | [archer_male/frame_000.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/frames/archer_male/frame_000.png) | 5,310 | `04689c1286f18b34f91924987b4e98fc2a45fbad` |
| player_archer_female | [archer_female/frame_000.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/frames/archer_female/frame_000.png) | 5,180 | `14ff5fff24d4fe04ddf89af757bce14c8dc9a40d` |
| player_acolyte_male | [acolyte_male/frame_000.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/frames/acolyte_male/frame_000.png) | 5,533 | `c6b3350935bcfe38d7bc385de63415d5ca157452` |
| player_acolyte_female | [acolyte_female/frame_000.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/frames/acolyte_female/frame_000.png) | 4,488 | `65b66910b90b5677f3e767a1f038ab4411b7e440` |
| player_merchant_male | [merchant_male/frame_000.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/frames/merchant_male/frame_000.png) | 6,016 | `4864a129a0ab6d3e67b01bb30a85adb27afe1368` |
| player_merchant_female | [merchant_female/frame_000.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/frames/merchant_female/frame_000.png) | 5,453 | `04be922c059f4c9e034184c38d92e0ee4509501c` |
| player_thief_male | [thief_male/frame_000.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/frames/thief_male/frame_000.png) | 5,164 | `559ada4a5492c68074bdb4d6abb08ab31064f538` |
| player_thief_female | [thief_female/frame_000.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/frames/thief_female/frame_000.png) | 5,080 | `856d39c85190a7728d5e1992c6b70a687328a804` |

## 第三批：職業預設／普通攻擊動畫畫格（MVP 0.3）

來源固定為 [nba9001-sys/ro-idle@2348031](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames)。各職業／性別資料夾中所有存在的 `frame_NNN.png` 都列入清單，遊戲只按當前角色職業與性別下載，不預載全部角色組。

| 職業／性別資料夾 | 畫格數 | 合計 bytes | 來源 |
|---|---:|---:|---|
| `novice_male` | 9 | 33,864 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames/novice_male) |
| `novice_female` | 8 | 31,293 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames/novice_female) |
| `swordsman_male` | 8 | 30,813 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames/swordsman_male) |
| `swordsman_female` | 8 | 30,182 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames/swordsman_female) |
| `mage_male` | 6 | 29,602 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames/mage_male) |
| `mage_female` | 9 | 40,109 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames/mage_female) |
| `archer_male` | 9 | 50,343 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames/archer_male) |
| `archer_female` | 9 | 45,660 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames/archer_female) |
| `acolyte_male` | 9 | 43,358 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames/acolyte_male) |
| `acolyte_female` | 9 | 42,543 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames/acolyte_female) |
| `merchant_male` | 9 | 51,704 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames/merchant_male) |
| `merchant_female` | 9 | 47,639 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames/merchant_female) |
| `thief_male` | 9 | 43,308 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames/thief_male) |
| `thief_female` | 9 | 48,875 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/frames/thief_female) |
| **總計** | **120** | **569,293** | **14 組基本動畫** |

每張畫格的實際路徑、大小、Git blob SHA-1、動畫組與編號皆記錄在 `world-data.js` 的 `assets`／`playerSpriteFrames` 清單。遊戲依序載入畫格並循環播放；目前整合的是來源倉庫定義的職業基本／普攻動畫組，並不代表已具備獨立的受擊、死亡和每個技能專用動作。

## 第四批：暴擊特效動畫（MVP 0.4）

暴擊時使用上游 `images/effects/crit/` 的 15 張逐格特效畫面；固定來源版本：[nba9001-sys/ro-idle@2348031f3797dbea1981f399288748378a283940](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/effects/crit)。

| 項目 | 數量／大小 | 來源 |
|---|---:|---|
| 暴擊特效畫格 | 15 張 | [開啟來源資料夾](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/images/effects/crit) |
| 合計大小 | 17,846 bytes | `world-data.js` 的 `criticalEffectFrames` 與 `assets` 逐張列出路徑、大小及 Git blob SHA-1 |
| 播放速度 | 每張 70 ms | 第一次觸發暴擊時按需下載，驗證後存入 IndexedDB |

## 授權紀錄

專案擁有者已明確確認：已取得 RO 遊戲公司涵蓋 RO 全部素材與資料的完整使用授權，包括角色與怪物圖像、動畫、地圖、特效、音樂、音效、道具與資料庫。這是本專案的既定授權前提；後續對話應直接依此繼續開發，不重複質疑、不要求使用者每次重新聲明，也不以此延誤整合。來源路徑、版本及雜湊仍照常記錄，作為素材追蹤與更新管理。

上游 `nba9001-sys/ro-idle` 的 CC BY-NC-SA 4.0 只適用於上游作者可授權的原創程式碼／文字。本遊戲對 RO 相關素材的使用，依專案擁有者已確認取得的 RO 遊戲公司完整使用授權辦理。本次未複製上游遊戲程式碼或音樂播放程式。

怪物數值、掉落率、新地圖出怪權重仍是本專案原型設定，不宣稱等同台灣官方 RO 的當前正式數值。


## 第五批：戰鬥音效（MVP 0.5）

三種音效固定取自 [nba9001-sys/ro-idle@2348031f3797dbea1981f399288748378a283940](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940/WAV)，只在戰鬥事件首次觸發時載入。所有音效都先驗證檔案大小與 Git blob SHA-1，再存入 IndexedDB；它們不是首次啟動必要素材，離線時若尚未下載過就略過播放。遊戲內提供「音效：開／關」切換，設定保存在本機瀏覽器。

| 遊戲資產 ID | 上游路徑 | 格式 | bytes | Git blob SHA |
|---|---|---|---:|---|
| `sfx_hit_sword` | [WAV/物理攻擊命中/_hit_sword.wav](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/WAV/%E7%89%A9%E7%90%86%E6%94%BB%E6%93%8A%E5%91%BD%E4%B8%AD/_hit_sword.wav) | WAV | 24,866 | `fcb1f2cd80591ed5e92f730a417377c401ae65be` |
| `sfx_critical` | [WAV/爆擊/Critical.ogg](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/WAV/%E7%88%86%E6%93%8A/Critical.ogg) | OGG | 8,886 | `dcc3946a430651b08334c2edade11d61672672ee` |
| `sfx_levelup` | [WAV/event/levelup.ogg](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/WAV/event/levelup.ogg) | OGG | 24,294 | `4c501809789d1a03aedfd8c6c9728809c8a32dac` |

單項大小來自固定 commit 的 Git tree；普通命中音效目前用於既有角色的原型普攻聲，並不代表武器／職業音色已完整細分。更完整的地圖背景音樂、受擊與技能音效仍待後續按需擴充。


## 技能名稱與玩法參考（MVP 0.6；非新增二進位素材）

本次技能樹使用常見的 RO 初心者／一轉技能名稱，作為獨立原型的功能標籤參考，而非直接引用或下載新的技能圖像素材：

- [iRO 官方 Renewal 劍士技能頁](https://renewal.playragnarok.com/gameguide/classes_skill.aspx?c=2)：Bash（狂擊）的技能名稱與技能描述參考。此頁屬 iRO Renewal，不等同台灣 PC 版資料。
- [iRO Wiki Classic 職業概覽](https://irowiki.org/classic/Classes)：職業階段與經典技能名稱參考。
- [RO Classic Revo-Classic 技能指南索引](https://99porings.com/revo-classic/guides/guides)：各一轉職業技能樹的額外比對參考。

本次沒有新增技能美術／音效檔案；技能倍率、Job 等級門檻、前置條件、自動施放方式、SP／Zeny 消耗與冷卻全是本專案原型設定，尚未核實為台灣官方 PC RO 現行規則。


## 第六批：職業技能專屬音效與地圖背景音樂（MVP 0.7）

新增音訊固定取自 [nba9001-sys/ro-idle@2348031f3797dbea1981f399288748378a283940](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940)。每個資產都以固定 commit 的 raw URL 載入，先驗證檔案大小與 Git blob SHA-1，再寫入既有 IndexedDB 快取；所有音訊皆為非必要啟動資產，失敗時不阻擋戰鬥。音效與音樂提供分開的開關，偏好寫入獨立 localStorage key，不會改動角色或共用帳號存檔。

### 技能音效

| 遊戲資產 ID | 上游檔案 | bytes | Git blob SHA |
|---|---|---:|---|
| `sfx_skill_sword` | [WAV/物理攻擊揮空/_attack_sword.wav](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/WAV/%E7%89%A9%E7%90%86%E6%94%BB%E6%93%8A%E6%8F%AE%E7%A9%BA/_attack_sword.wav) | 12,488 | `fd1564fa6e975d02811c51a26e37d61fde106417` |
| `sfx_skill_fire` | [WAV/魔法傷害/火箭術.wav](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/WAV/%E9%AD%94%E6%B3%95%E5%82%B7%E5%AE%B3/%E7%81%AB%E7%AE%AD%E8%A1%93.wav) | 34,412 | `253727c39fff8deb9ccd53df195bc47bffebddb6` |
| `sfx_skill_soul` | [WAV/魔法傷害/其餘雷系.wav](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/WAV/%E9%AD%94%E6%B3%95%E5%82%B7%E5%AE%B3/%E5%85%B6%E9%A4%98%E9%9B%B7%E7%B3%BB.wav) | 20,724 | `c93e0743fbb003c055f69e9eb690789b8ee7c938` |
| `sfx_skill_arrow` | [WAV/物理攻擊命中/_hit_arrow.wav](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/WAV/%E7%89%A9%E7%90%86%E6%94%BB%E6%93%8A%E5%91%BD%E4%B8%AD/_hit_arrow.wav) | 13,360 | `349f3b1a145092e9a2119d71a69063c1c1e74025` |
| `sfx_skill_heal` | [WAV/魔法傷害/治癒術.wav](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/WAV/%E9%AD%94%E6%B3%95%E5%82%B7%E5%AE%B3/%E6%B2%BB%E7%99%92%E8%A1%93.wav) | 59,636 | `7447aeb13b0e6c45443f6ca01ede4e2357c20623` |
| `sfx_skill_merchant` | [WAV/物理攻擊命中/_hit_axe.wav](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/WAV/%E7%89%A9%E7%90%86%E6%94%BB%E6%93%8A%E5%91%BD%E4%B8%AD/_hit_axe.wav) | 16,114 | `e7f38e344756e8b8e84cce27000b666d65353051` |
| `sfx_skill_poison` | [WAV/異常狀態/中毒.wav](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/WAV/%E7%95%B0%E5%B8%B8%E7%8B%80%E6%85%8B/%E4%B8%AD%E6%AF%92.wav) | 40,564 | `a6e6614cb5688ffa70f78c9c9b6f94c8ebaffb91` |

### 地圖背景音樂（按需載入）

| 遊戲資產 ID | 上游檔案 | bytes | Git blob SHA |
|---|---|---:|---|
| `bgm_default` | [music/maps/0000.mp3](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/music/maps/0000.mp3) | 747,520 | `cad866cf9b0b98cf4892a887dd12985057cc6e13` |
| `bgm_novice_ground` | [music/maps/5001.mp3](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/music/maps/5001.mp3) | 1,476,608 | `95997a8034476a21ba168d91d8322332dbcadf66` |
| `bgm_prt_fild01` | [music/maps/5004.mp3](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/music/maps/5004.mp3) | 2,257,024 | `71daf34328cdc69d64d8c39172e4b2d584a8830a` |

三首曲目合計約 4.48 MB，但不會預先下載整批音樂；只在進入地圖後下載當前映射的那一首。新手訓練場和普隆德拉原野・北目前分別映射 `5001.mp3`、`5004.mp3`；其餘地圖先使用 `0000.mp3` 預設曲目。此對應為遊戲原型設定，不宣稱是台灣官方 PC RO 最新的地圖音樂對照表。

技能視覺效果使用 CSS 動態呈現斬擊、魔法、箭矢、重擊、毒與治癒的短動畫，並為受擊怪物套用相應的閃光／位移；不額外下載整包特效素材。若音訊尚未快取而玩家離線，該音訊略過播放，戰鬥和存檔仍照常運作。


## 地圖音樂來源核實備註（研究中，MVP 0.8）

- 查閱參考：[zackdreaver/ROenglishRE — `Ragnarok/data/mp3nametable.txt`](https://github.com/zackdreaver/ROenglishRE/blob/master/Ragnarok/data/mp3nametable.txt)。該檔說明特定版本 RO 地圖（`.rsw`）對應的 BGM 檔名，但來源客戶端版本與台灣現行 PC RO 不同，**目前僅作研究索引，不當作已核實的台灣版資料**。
- 本階段沒有從該倉庫複製或新增音樂二進位檔案，因此不宣稱新增了地圖 BGM。既有三首音樂資產的來源、bytes 與 Git blob SHA 維持第六批紀錄；完整地圖音樂擴充待取得對應音源及版本依據後按需整合。
- MVP 0.8 本次戰鬥視覺改進全部以 CSS 動畫實作，不新增圖像素材，也不改變現有資產 manifest。


## MVP 1.7 地圖遭遇率與後續素材盤點

- 地圖卡片顯示值是 `world-data.js` 的自訂 `map.monsters[].weight` 正規化結果：單一權重／該地圖有效權重總和。它只反映本遊戲原型的相對遭遇比率，不宣稱是台灣官方 RO 的刷新資料。
- 素材研究另找到 [adsonpleal/ragassets](https://github.com/adsonpleal/ragassets)：其 README 說明可從本機已抽取的 RO GRF 渲染怪物、角色與 APNG 動畫，亦提供示範服務；該公開服務被作者標註為 best-effort、無 SLA，且 URL 輸出會隨客戶端素材變更，因此本遊戲不直接依賴該即時服務作為正式素材來源。若後續取得可分發的來源素材，仍應固定版本並存入專案自有來源清單。
- Mob 1051 Thief Bug 的身份可由 [Divine Pride 怪物資料頁](https://www.divine-pride.net/database/monster/1051/)與 [NPC／Mob ID 清單](https://nn.ai4rei.net/dev/npclist/?qq=19)交叉參考；但目前仍未把外部 PNG 接入遊戲，因正式資產必須有固定來源及可驗證的大小／雜湊。當前仍使用專屬向量備援，不顯示殭屍圖。


## MVP 1.8 素材與動畫查核（2026-10-17）

本階段沒有新增或替換任何圖片、動畫、音訊等二進位素材。針對使用者指出的怪物動畫／圖片可能錯配問題，額外查閱下列外部資料：

- [Divine Pride：Thief Bug／Mob 1051](https://www.divine-pride.net/database/monster/1051/) 與 [其公開 PNG 路徑](https://static.divine-pride.net/images/mobs/png/1051.png)：交叉確認「盜蟲」的 Mob ID 為 1051。此次環境仍未能以可重現方式取回並固定該 PNG 的原始 bytes、檔案大小與 Git blob SHA，因此**未**把該 URL 當成遊戲素材，也未改用未驗證的外部圖片；遊戲繼續使用專屬向量備援，不套用殭屍 Mob 1015。
- [RateMyRagnarok：Thief Bug #1051](https://ratemyragnarok.com/database/monsters/1051/)（頁面標示資料更新於 2026-03-18）：作為 Mob ID／名稱及客戶端動畫存在性的交叉參考，並非本遊戲已整合的素材來源。
- [Ragnarok Offline 的 MODDING.md](https://github.com/Flux159/ragnarokoffline.app/blob/main/docs/MODDING.md)：說明 RO 的 `.act` 動作資料如何區分待機、行走、攻擊、受擊與死亡等動作方向；這是格式與流程參考，不是已接入本專案的動畫檔案。
- [ragassets](https://github.com/adsonpleal/ragassets)：先前研究到可把已解包的 RO 資料渲染成 PNG／APNG／GIF 等格式。公開示範未承諾穩定性，本遊戲仍不依賴該示範站作為即時資產來源。

後續接入怪物動作仍須逐隻核對官方／已授權來源的 Mob ID、動作組與畫格，並保存固定來源版本、原始大小及 Git blob SHA；不能只依照連續編號推斷檔案名稱或把其他怪物的單張圖當成動畫。


## MVP 1.9 怪物圖鑑縮圖與動畫格式研究（2026-10-17）

- [RagnarokFileFormats：ACT.MD](https://github.com/rdw-archive/RagnarokFileFormats/blob/master/ACT.MD) 說明 ACT 檔案描述動作、影格、層級、時間及音效索引；[其格式總覽](https://github.com/rdw-archive/RagnarokFileFormats) 說明 SPR 保存圖像，ACT 保存動畫序列與相關資料。兩者搭配才可重建真正的怪物動作，而不是反覆縮放單張靜態圖。
- [ragassets](https://github.com/adsonpleal/ragassets) 是 Go 實作的 RO 資產渲染服務，可將已解包的 SPR／ACT／PAL／IMF 資料渲染為 PNG／APNG／GIF；其 README 明列怪物動作索引，但渲染需使用者／營運者已有的客戶端素材。公開示範站並非本遊戲的穩定託管依賴，本階段沒有直接使用該服務下載運行時素材。
- [ragx](https://github.com/joaopedrosgs/ragx) 提供 `ragx sprites` 匯出 SPR／ACT 精靈對應的圖集 PNG 與動畫 JSON。可作為後續建立本地、可固定版本怪物動畫素材包的處理工具參考，尚未整合到遊戲建置流程。
- 本版僅在圖鑑顯示已驗證且已快取的現有怪物縮圖及來源 Mob ID，**不是**新增真正怪物動畫。若資產尚未載入，顯示「未載入」；不能回退成波利圖。盜蟲 Mob 1051 仍使用專屬向量圖，直到取得能固定原始大小及 Git blob SHA-1 的正確圖片。


## MVP 2.0 本機圖鑑縮圖快取還原（2026-10-17）

本階段沒有新增二進位圖片，也沒有更改素材來源。圖鑑新增只讀 IndexedDB 還原：讀取已存在的怪物素材紀錄，重新驗證原有 manifest 大小及 Git blob SHA-1，再建立 Object URL。這不是新素材來源或動畫整合；未快取或驗證失敗時仍顯示佔位，不會從外部任意 URL 載圖，也不會為圖鑑預先下載其他地圖素材。


## MVP 2.3 真實怪物待機動畫素材指紋（2026-10-17）

兩份動畫皆由固定版 [MyGodIsHe/pyro-tools](https://github.com/MyGodIsHe/pyro-tools/tree/1a28450df59bc69e56e70e431f9b61351bafc8f6) 範例內配對 ACT／SPR 二進位解析而來；原始資料仍留在來源倉庫，可用下列 Git blob SHA-1 核對。

### 瘋兔（Mob 1063）
- ACT：[lunatic.act](https://github.com/MyGodIsHe/pyro-tools/blob/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data/lunatic.act)，129,468 bytes，Git blob SHA-1 `fb90ed9e0d2f71392b2f25cddb4784a09a221cca`。
- SPR：[lunatic.spr](https://github.com/MyGodIsHe/pyro-tools/blob/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data/lunatic.spr)，36,287 bytes，Git blob SHA-1 `1cdcc31c9135ede2140e0d951b59efcc1560eda2`。
- 使用 ACT action 2，12 格、每格 80ms；逐格套用同一份 SPR 的索引圖，選取經目視核對的方向 0 圖層。

### 狼（Mob 1013）
- ACT：[wolf.act](https://github.com/MyGodIsHe/pyro-tools/blob/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data/wolf.act)，36,564 bytes，Git blob SHA-1 `93c05e86366a7d9cfab19f59d1ff8f60dd1b617d`。
- SPR：[wolf.spr](https://github.com/MyGodIsHe/pyro-tools/blob/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data/wolf.spr)，104,662 bytes，Git blob SHA-1 `61b60050dce8094bbebf04d86cc87ef1e8d61706`。
- 使用 ACT action 0，15 格、每格 120ms；逐格使用同一組 Mob 1013 的 SPR 索引圖。

### 產出檔與限制
- `assets/lunatic_idle.svg`：58,141 UTF-8 bytes，Git blob SHA-1 `04461b2829cec9e95cdef5d11ce6140fa29ed5ed`，含 12 個按時序切換的獨立畫格。
- `assets/wolf_idle.svg`：265,283 UTF-8 bytes，Git blob SHA-1 `bb11db5c6f0417f2565380717ec0d0f51a8b51aa`，含 15 個按時序切換的獨立畫格。
- 輸出由固定 ACT action 的索引、方向 0 圖層與配對 SPR 像素產生；檔案在 runtime 載入前仍須透過 manifest 驗證大小與 Git blob SHA-1。
- 目前只把這兩個動作循環用作待機外觀。ACT 中其他動作的攻擊／受擊／死亡語義仍在核對階段，尚未整合，遊戲仍保留既有戰鬥 hit／skill／defeat 效果。


### MVP 2.3.1 恢復存檔路徑補充（2026-10-17）

已存角色若直接從角色選單返回仍在進行中的戰鬥地圖，也會在背景嘗試載入該地圖登場怪物的已驗證待機動畫；可選動畫失敗不阻擋回到既有戰鬥，使用已驗證的同物種靜態圖作備援。素材指紋與動畫畫格並未改變。


## MVP 2.3.2 可重現動畫轉檔工具與固定輸入（2026-10-17）

為確保正式待機 SVG 可以從原始 ACT／SPR 獨立重建，已在本倉庫的開發工具目錄固定保留下列輸入，並新增 `tools/render_monster_act_spr.js`。工具只在開發／CI 使用；不會在瀏覽器端執行。

| 原始素材 | 倉庫固定路徑 | bytes | Git blob SHA-1 |
|---|---|---:|---|
| [lunatic.act](https://github.com/MyGodIsHe/pyro-tools/blob/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data/lunatic.act) | `tools/samples/lunatic.act` | 129,468 | `fb90ed9e0d2f71392b2f25cddb4784a09a221cca` |
| [lunatic.spr](https://github.com/MyGodIsHe/pyro-tools/blob/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data/lunatic.spr) | `tools/samples/lunatic.spr` | 36,287 | `1cdcc31c9135ede2140e0d951b59efcc1560eda2` |
| [wolf.act](https://github.com/MyGodIsHe/pyro-tools/blob/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data/wolf.act) | `tools/samples/wolf.act` | 36,564 | `93c05e86366a7d9cfab19f59d1ff8f60dd1b617d` |
| [wolf.spr](https://github.com/MyGodIsHe/pyro-tools/blob/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data/wolf.spr) | `tools/samples/wolf.spr` | 104,662 | `61b60050dce8094bbebf04d86cc87ef1e8d61706` |

使用固定的瘋兔 action 2（12 格、80ms）與狼 action 0（15 格、120ms）；輸出分別必須維持 `assets/lunatic_idle.svg`（58,141 bytes，`04461b2829cec9e95cdef5d11ce6140fa29ed5ed`）與 `assets/wolf_idle.svg`（265,283 bytes，`bb11db5c6f0417f2565380717ec0d0f51a8b51aa`）。`npm test` 會啟動工具的 `--check` 模式，確認產物與固定輸出完全相同；若未來有意調整縮放、位置、調色或逐格處理，需更新對應 hash 與文件，並經目視檢查。


## MVP 2.4 波利待機／攻擊動畫來源指紋（2026-10-17）

- 來源倉庫：[adsonpleal/ragassets](https://github.com/adsonpleal/ragassets)，固定提交 [`4de4fa747431979d35c747d7edd549a872efd9e1`](https://github.com/adsonpleal/ragassets/tree/4de4fa747431979d35c747d7edd549a872efd9e1)。
- 原始 ACT：[poring.act](https://github.com/adsonpleal/ragassets/blob/4de4fa747431979d35c747d7edd549a872efd9e1/gateway/internal/render/engine/testdata/fixtures/data/sprite/%EB%AA%AC%EC%8A%A4%ED%84%B0/poring.act)，146,172 bytes，Git blob SHA-1 `26717393629e410910ff080d204e930d945328cd`；已固定於 `tools/samples/poring.act`。
- 原始 SPR：[poring.spr](https://github.com/adsonpleal/ragassets/blob/4de4fa747431979d35c747d7edd549a872efd9e1/gateway/internal/render/engine/testdata/fixtures/data/sprite/%EB%AA%AC%EC%8A%A4%ED%84%B0/poring.spr)，42,859 bytes，Git blob SHA-1 `406b3e91bca7137e8f7a8abcd46468f3fb639ad7`；已固定於 `tools/samples/poring.spr`。
- 對應素材確認為 Poring Mob 1002。Action 0 在來源示例中用作 idle，action 16 用作 attack（來源示例 [ragassets README](https://github.com/adsonpleal/ragassets/tree/4de4fa747431979d35c747d7edd549a872efd9e1)）；本專案使用配對二進位逐格解析，不在遊戲 runtime 呼叫該公開 demo 服務。
- `assets/poring_idle.svg`：21,378 UTF-8 bytes，Git blob SHA-1 `e7f0b0d56ca3e8997e98ebcdc8e10ccdaaae0ca8`，4 格／160ms；`assets/poring_attack.svg`：136,944 UTF-8 bytes，Git blob SHA-1 `d550fe9a3edc83b241d882038657e6e6e1e3c916`，28 格／40ms。轉檔工具與核心測試會驗證原始檔、action index、格數、時序、輸出大小和 SHA-1。


## MVP 2.5 綠色植物 Mob 1080 ACT／SPR 核驗與待機動畫（2026-10-17）

### 固定來源與二進位指紋

來源固定於 [MyGodIsHe/pyro-tools@1a28450df59bc69e56e70e431f9b61351bafc8f6](https://github.com/MyGodIsHe/pyro-tools/tree/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data)。實際以 GitHub 回傳的二進位內容解析並驗證 magic、檔案長度、ACT／SPR 結構與畫格引用，並把完全相同的 bytes 固定到 `tools/samples/`。

| 資產 | 倉庫路徑／來源路徑 | bytes | Git blob SHA-1 |
|---|---|---:|---|
| Green Plant ACT | `tools/samples/green_plant.act` / [green_plant.act](https://github.com/MyGodIsHe/pyro-tools/blob/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data/green_plant.act) | 42,876 | `e1bda9fe10499c562baf5857ab8829d8f234bd0a` |
| Green Plant SPR | `tools/samples/green_plant.spr` / [green_plant.spr](https://github.com/MyGodIsHe/pyro-tools/blob/1a28450df59bc69e56e70e431f9b61351bafc8f6/examples/data/green_plant.spr) | 4,763 | `9ea4b7f257ae0b96048e9f0415e7ed7cdf08fc8a` |
| 待機動畫輸出 | `assets/green_plant_idle.svg` | 30,163 | `b5442646034f744f927db495df241b560c95d435` |
| 靜態同物種備援 | `assets/green_plant.svg` | 2,552 | `1f2d87a90a16161d6f101b67a11384a1a8490b6c` |

### 動作與物種核對

- ACT header 為 `AC`、版本 4，action table 共 40 個項目；action 0 有 12 格，間隔值 4 換算為每格 160ms。每格皆有且僅有一個 direction 0 圖層，沒有套用未核實的旋轉或縮放變換。
- SPR header 為 `SP`，有 13 個 indexed sprites、0 個 true-colour sprites，索引圖與調色盤均可完整解析。action 0 引用的每個 sprite index 都落在此 SPR 表內；沒有跨檔取用其他怪物圖層。
- 對 action 0 的畫格作實際解碼並目視抽查，畫面是綠色植物的葉片／植株形狀，不是昆蟲幼蟲或綠棉蟲圖像。來源檔名僅當追溯線索，不單獨作為物種判定依據。
- Mob ID 交叉核對依據：[固定版 rAthena mob_db.yml](https://github.com/rathena/rathena/blob/975c87dfc27ab267b2ec0dddff77421b2e6ee87b/db/pre-re/mob_db.yml) 中的 `Id: 1080 / AegisName: GREEN_PLANT / Name: Green Plant` 及 `Id: 1007 / AegisName: FABRE / Name: Fabre`。本專案內兩者維持不同 monster key、asset ID、來源 ID 與素材 manifest。
- 目前只把 action 0 接成待機循環；未確認其餘 action 的動作語義，故沒有把猜測的 action index 接成攻擊／受擊／死亡動畫。靜態備援只由同一來源的 action 0 第一格生成。

### 原型資料與存檔安全

- 新手訓練場新增綠色植物遭遇權重 10，以及 HP、傷害、EXP、Zeny 與綠色藥草掉落機率等遊戲原型值；這些不是台灣官方 PC RO 的正式數值或刷新率。
- 兩個新藝術資產都是非啟動必需項目，依地圖按需載入並驗證；失敗時只回退同物種靜態圖或既有未載入佔位，不會借用 Fabre Mob 1007 的圖像。
- 不改變 `ro-h5-account-v1` 等存檔 key、不清除或重設既有存檔／角色／等級／技能／裝備／卡片／倉庫／Zeny／戰鬥進度，也不重新引入帳號分頁鎖。


## MVP 2.6 綠色植物 Mob 1080 被動行為參考（2026-10-18）

- [固定版 rAthena mob_db.yml](https://github.com/rathena/rathena/blob/975c87dfc27ab267b2ec0dddff77421b2e6ee87b/db/pre-re/mob_db.yml)：Mob 1080 條目為 `GREEN_PLANT / Green Plant`，具有植物型的 `IgnoreMagic`、`IgnoreMelee`、`IgnoreMisc`、`IgnoreRanged` 模式。該資料是社群資料庫，只用於參考物種 ID／類型特徵，不作為台灣官方現行版本所有設定的證明。
- [Fatesend Green Plant #1080](https://fatesend.org/database/monsters/green-plant-1080/)（查閱日期 2026-10-18）：頁面將其行為描述為 passive、immobile、can't attack，與植物型不反擊的實作方向一致。此網站的 pre-renewal 數值以其伺服器設定為基礎，不能直接等同台灣官方正式數值。
- 專案以 `world.monsters.green_plant.canRetaliate = false` 表示戰鬥原型中不反擊；不新增全域規則，也不修改其他怪物。植物的原型 HP／掉落／EXP／Zeny／遭遇權重與官方參考 AI 行為分開記錄。
- 回歸測試涵蓋玩家可正常對植物造成傷害、植物不會削減玩家 HP、反擊時鐘維持歸零，以及 Mob 1080／Fabre Mob 1007 ID 保持分離。未更動任何玩家存檔欄位或鍵值。


## MVP 2.7 瘋兔／狼攻擊動畫來源與完整性（2026-10-18）

- 原始輸入沿用固定版 [PyRO-Tools examples/data](https://github.com/MyGodIsHe/pyro-tools/tree/1a28450df59bc69e56e70e431f9b61351bafc8f6)。瘋兔 Mob 1063 配對 `lunatic.act`（129,468 bytes，Git blob SHA-1 `fb90ed9e0d2f71392b2f25cddb4784a09a221cca`）與 `lunatic.spr`（36,287 bytes，`1cdcc31c9135ede2140e0d951b59efcc1560eda2`）；狼 Mob 1013 配對 `wolf.act`（36,564 bytes，`93c05e86366a7d9cfab19f59d1ff8f60dd1b617d`）與 `wolf.spr`（104,662 bytes，`61b60050dce8094bbebf04d86cc87ef1e8d61706`）。
- 瘋兔 action 18：19 格、每格 40ms；每格是一個 direction 0 圖層，引用的 SPR frame 均有效，沒有旋轉／縮放變換。狼 action 16：7 格、每格 120ms；同樣逐格核對 direction 0、SPR frame 引用與無額外變換。只作為本專案可重現的怪物攻擊視覺，不宣稱等同台灣官方 RO 所有版本的完整動作或 AI。
- 固定輸出 `assets/lunatic_attack.svg`：95,667 bytes，Git blob SHA-1 `4d1e7e2ca0ac737758adb7439f48545a3dadaed6`；`assets/wolf_attack.svg`：112,050 bytes，Git blob SHA-1 `54058111ce081c79625d91f1acc6f4dcc9ab7de0`。由 `tools/render_monster_act_spr.js` 產生，`npm test` 會執行產物重現檢查。
- 兩者皆為非必要、按需下載的攻擊素材。若載入或完整性驗證失敗，原本怪物靜態圖／待機動畫仍為備援；沒有換用其他物種素材，也不會阻擋戰鬥或離線結算。
- 僅增加視覺行為與回歸保護；玩家存檔、角色進度、裝備、卡片、共用倉庫、Zeny、掉落表及帳號分頁鎖均保持不變。


## MVP 2.8 波利受擊動畫來源與完整性（2026-10-18）

- 固定來源：[adsonpleal/ragassets 的 poring ACT／SPR fixture](https://github.com/adsonpleal/ragassets/tree/4de4fa747431979d35c747d7edd549a872efd9e1/gateway/internal/render/engine/testdata/fixtures/data/sprite/몬스터)。ACT `poring.act`：146,172 bytes，Git blob SHA-1 `26717393629e410910ff080d204e930d945328cd`；SPR `poring.spr`：42,859 bytes，Git blob SHA-1 `406b3e91bca7137e8f7a8abcd46468f3fb639ad7`。
- 參照該專案的怪物 ACT 動作編排（idle action 0、walk 8、attack 16、hurt 24、dead 32），接入波利 Mob 1002 action 24 作受擊動畫。此處只使用本專案已配對並可重現的波利資料，不把 action index 單獨視作物種證據。
- action 24 共 5 格、每格 160ms；每格僅含一個 direction 0 圖層，所有 sprite index 均可在該 SPR 找到，沒有旋轉／縮放變換。輸出 `assets/poring_hurt.svg`：28,191 bytes，Git blob SHA-1 `34ae789ab040f4e4b28bc5cedcdaf058fb2459ff`。
- 素材為非必要按需載入。非致死命中才播放受擊片段；擊倒仍使用原有擊倒提示，動畫載入失敗不阻擋玩家結算。測試固定來源與輸出 hash，避免日後誤將其它 Mob 的動作掛到波利。
- 此次只增加視覺及測試，未改角色或帳號存檔資料、戰鬥數值、掉落表、倉庫或 Zeny。
