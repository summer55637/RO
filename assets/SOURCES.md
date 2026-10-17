# 素材來源與完整性

以下檔案由素材倉庫原樣複製，未對圖片內容進行修改。Git blob SHA 可驗證檔案是否與來源版本的位元組內容一致。

| 本專案路徑 | 來源路徑 | 原始大小 | Git blob SHA |
|---|---|---:|---|
| assets/field.jpg | [images/maps/field.jpg](https://github.com/nba9001-sys/ro-idle/blob/main/images/maps/field.jpg) | 164,403 bytes | 138cef2baecce252bf9095f856927d0573642394 |
| assets/poring.png | [images/monsters/1002.png](https://github.com/nba9001-sys/ro-idle/blob/main/images/monsters/1002.png) | 708 bytes | 9205f4b39eaea3eb175e0eabdcc6ba10ec296641 |
| assets/lunatic.png | [images/monsters/1001.png](https://github.com/nba9001-sys/ro-idle/blob/main/images/monsters/1001.png) | 4,929 bytes | 538cb55daf931cc39ba677c32930e288b64d3ae1 |
| assets/fabre.png | [images/monsters/1003.png](https://github.com/nba9001-sys/ro-idle/blob/main/images/monsters/1003.png) | 330 bytes | 63091a44b7bdae2fcd59b8753ba5c4e5f04f9d37 |
| assets/pupa.png | [images/monsters/1008.png](https://github.com/nba9001-sys/ro-idle/blob/main/images/monsters/1008.png) | 771 bytes | 6603da0bdf588b3f74381442fe0dc82aa574ef2c |
| assets/thief_bug.png | [images/monsters/1015.png](https://github.com/nba9001-sys/ro-idle/blob/main/images/monsters/1015.png) | 1,906 bytes | ef27e37d53ddb15fad6e551e34868083df407d54 |

第一張地圖必要素材合計 170,370 bytes（約 167 KiB）；第二張地圖的蛹與盜蟲素材合計 2,677 bytes，於首次進入該地圖時才下載。

專案擁有者已聲明取得 RO 公司相關授權。請另行保存正式授權文件及其涵蓋範圍；素材倉庫原本的程式碼／文字授權不應被誤認為 RO 第三方素材的權利來源。

## 第二批按需載入素材（MVP 0.2）

新增素材來源固定在 [nba9001-sys/ro-idle commit 2348031](https://github.com/nba9001-sys/ro-idle/tree/2348031f3797dbea1981f399288748378a283940)，遊戲不會下載整個上游倉庫；只在需要的地圖或角色出現時才從下列路徑讀取，並以大小及 Git blob SHA-1 驗證後存入本機 IndexedDB。

### 怪物圖像

| 遊戲資產 ID | 上游路徑 | bytes | Git blob SHA |
|---|---|---:|---|
| wolf | [1004.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1004.png) | 942 | `32d3c7d9cd9e71064a7e9b074b52293bc8bc97b0` |
| hornet | [1005.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1005.png) | 2,538 | `692209109b70578cdd3d4914aa03de2c464885b7` |
| goblin | [1006.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1006.png) | 1,784 | `b998113c83d4c6719783f50409a80fc391abcfa9` |
| orc | [1007.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1007.png) | 789 | `e9f3ef887164c0c7d0aa883e82d61f49b2379d59` |
| willow | [1009.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1009.png) | 4,181 | `f8029dca4c909a67650986ca272180872d587214` |
| spore | [1010.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1010.png) | 7,673 | `df0b18eb2c2ab52b8e4d07dd470bb9f63bffe652` |
| poporing | [1011.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1011.png) | 746 | `1ea107008c80a57c3bf6a0aca881af905cca81b1` |
| pecopeco | [1012.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1012.png) | 1,069 | `5bbc57e564dc5b34dacda5e74449d6f71a7aa8ec` |
| picky | [1013.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1013.png) | 1,892 | `b597c222615da8a15634eeaf3da1833945ec9910` |
| condor | [1024.png](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/images/monsters/1024.png) | 1,013 | `1b77b3c4eb7d24ba90301497200074e772297684` |

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

### 授權範圍提醒

上游 [LICENSE](https://github.com/nba9001-sys/ro-idle/blob/2348031f3797dbea1981f399288748378a283940/LICENSE) 採 CC BY-NC-SA 4.0，涵蓋該專案可授權的原創程式碼／文字，不自動涵蓋 RO 圖像、商標、音樂等第三方素材，也不代表上游作者能轉授這些權利。此遊戲使用 RO 美術的權利依專案擁有者另外聲明取得的授權辦理；發布前仍須由專案管理端保存並確認授權文件及適用範圍。

本次未複製上游遊戲程式碼、完整資料庫或音樂。怪物數值、掉落率、四張新地圖的出怪權重為本專案的原型測試值，不應當作台灣官方 RO 正式數值。
