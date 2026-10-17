(function (root, factory) {
  const data = factory();
  if (root) root.ROWorld = data;
  if (typeof module === 'object' && module.exports) module.exports = data;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  return {
    manifestVersion: '1.1.0',
    assetApprovalStatus: 'owner-authorized',
    assetApprovalNote: '專案擁有者已確認取得 RO 素材使用授權；正式授權文件由專案擁有者另行保存。',
    assets: [
      { id: 'field', requiredOnStart: true, path: './assets/field.jpg', version: '1.0.0', bytes: 164403, gitSha: '138cef2baecce252bf9095f856927d0573642394', statusId: 'asset-status-field', name: '新手原野背景', dependencies: ['map:novice_ground', 'map:prt_fild01'], approvalStatus: 'owner-authorized' },
      { id: 'poring', requiredOnStart: true, path: './assets/poring.png', version: '1.0.0', bytes: 708, gitSha: '9205f4b39eaea3eb175e0eabdcc6ba10ec296641', statusId: 'asset-status-poring', name: '波利圖像', dependencies: ['monster:poring'], approvalStatus: 'owner-authorized' },
      { id: 'lunatic', requiredOnStart: true, path: './assets/lunatic.png', version: '1.0.0', bytes: 4929, gitSha: '538cb55daf931cc39ba677c32930e288b64d3ae1', statusId: 'asset-status-lunatic', name: '瘋兔圖像', dependencies: ['monster:lunatic'], approvalStatus: 'owner-authorized' },
      { id: 'fabre', requiredOnStart: true, path: './assets/fabre.png', version: '1.0.0', bytes: 330, gitSha: '63091a44b7bdae2fcd59b8753ba5c4e5f04f9d37', statusId: 'asset-status-fabre', name: '綠棉蟲圖像', dependencies: ['monster:fabre'], approvalStatus: 'owner-authorized' },
      { id: 'pupa', requiredOnStart: false, path: './assets/pupa.png', version: '1.0.0', bytes: 771, gitSha: '6603da0bdf588b3f74381442fe0dc82aa574ef2c', statusId: 'asset-status-pupa', name: '蛹圖像', dependencies: ['monster:pupa'], approvalStatus: 'owner-authorized' },
      { id: 'thief_bug', requiredOnStart: false, path: './assets/thief_bug.png', version: '1.0.0', bytes: 1906, gitSha: 'ef27e37d53ddb15fad6e551e34868083df407d54', statusId: 'asset-status-thief_bug', name: '盜蟲圖像', dependencies: ['monster:thief_bug'], approvalStatus: 'owner-authorized' },
      { id: 'wolf', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/monsters/1004.png', version: '1.0.0', bytes: 942, gitSha: '32d3c7d9cd9e71064a7e9b074b52293bc8bc97b0', name: '狼圖像', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/monsters/1004.png', assetKind: 'monster', approvalStatus: 'owner-authorized' },
      { id: 'hornet', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/monsters/1005.png', version: '1.0.0', bytes: 2538, gitSha: '692209109b70578cdd3d4914aa03de2c464885b7', name: '蜂兵圖像', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/monsters/1005.png', assetKind: 'monster', approvalStatus: 'owner-authorized' },
      { id: 'goblin', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/monsters/1006.png', version: '1.0.0', bytes: 1784, gitSha: 'b998113c83d4c6719783f50409a80fc391abcfa9', name: '哥布林圖像', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/monsters/1006.png', assetKind: 'monster', approvalStatus: 'owner-authorized' },
      { id: 'orc', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/monsters/1007.png', version: '1.0.0', bytes: 789, gitSha: 'e9f3ef887164c0c7d0aa883e82d61f49b2379d59', name: '半獸人戰士圖像', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/monsters/1007.png', assetKind: 'monster', approvalStatus: 'owner-authorized' },
      { id: 'willow', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/monsters/1009.png', version: '1.0.0', bytes: 4181, gitSha: 'f8029dca4c909a67650986ca272180872d587214', name: '柳精圖像', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/monsters/1009.png', assetKind: 'monster', approvalStatus: 'owner-authorized' },
      { id: 'spore', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/monsters/1010.png', version: '1.0.0', bytes: 7673, gitSha: 'df0b18eb2c2ab52b8e4d07dd470bb9f63bffe652', name: '孢子圖像', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/monsters/1010.png', assetKind: 'monster', approvalStatus: 'owner-authorized' },
      { id: 'poporing', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/monsters/1011.png', version: '1.0.0', bytes: 746, gitSha: '1ea107008c80a57c3bf6a0aca881af905cca81b1', name: '波波利圖像', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/monsters/1011.png', assetKind: 'monster', approvalStatus: 'owner-authorized' },
      { id: 'pecopeco', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/monsters/1012.png', version: '1.0.0', bytes: 1069, gitSha: '5bbc57e564dc5b34dacda5e74449d6f71a7aa8ec', name: '大嘴鳥圖像', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/monsters/1012.png', assetKind: 'monster', approvalStatus: 'owner-authorized' },
      { id: 'picky', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/monsters/1013.png', version: '1.0.0', bytes: 1892, gitSha: 'b597c222615da8a15634eeaf3da1833945ec9910', name: '小雞圖像', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/monsters/1013.png', assetKind: 'monster', approvalStatus: 'owner-authorized' },
      { id: 'condor', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/monsters/1024.png', version: '1.0.0', bytes: 1013, gitSha: '1b77b3c4eb7d24ba90301497200074e772297684', name: '禿鷹圖像', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/monsters/1024.png', assetKind: 'monster', approvalStatus: 'owner-authorized' },
      { id: 'cave', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/maps/cave.jpg', version: '1.0.0', bytes: 142952, gitSha: 'e283f18706e578ba51d5bdf898a4897619a5d216', name: '迷宮背景', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/maps/cave.jpg', assetKind: 'map', approvalStatus: 'owner-authorized' },
      { id: 'desert', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/maps/desert.jpg', version: '1.0.0', bytes: 91999, gitSha: '72a7dcc646fe513f232ed5a199ba97733eac6156', name: '沙漠背景', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/maps/desert.jpg', assetKind: 'map', approvalStatus: 'owner-authorized' },
      { id: 'player_novice_male', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/frames/novice_male/frame_000.png', version: '1.0.0', bytes: 3774, gitSha: '24d0463d0864f791e2cc477e2bf0b3f5eb99f485', name: '男性初心者造型', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/frames/novice_male/frame_000.png', assetKind: 'character', approvalStatus: 'owner-authorized' },
      { id: 'player_novice_female', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/frames/novice_female/frame_000.png', version: '1.0.0', bytes: 3729, gitSha: '744a3e358ab813aad2b1446e5a2688bb882406d4', name: '女性初心者造型', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/frames/novice_female/frame_000.png', assetKind: 'character', approvalStatus: 'owner-authorized' },
      { id: 'player_swordsman_male', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/frames/swordsman_male/frame_000.png', version: '1.0.0', bytes: 3933, gitSha: 'f8bd381135663c2309ce90294ac4bdfad2fa9803', name: '男性劍士造型', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/frames/swordsman_male/frame_000.png', assetKind: 'character', approvalStatus: 'owner-authorized' },
      { id: 'player_swordsman_female', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/frames/swordsman_female/frame_000.png', version: '1.0.0', bytes: 3693, gitSha: 'b1f7e2d7dc848b03f577038ddf12385a0939c0d8', name: '女性劍士造型', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/frames/swordsman_female/frame_000.png', assetKind: 'character', approvalStatus: 'owner-authorized' },
      { id: 'player_mage_male', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/frames/mage_male/frame_000.png', version: '1.0.0', bytes: 4943, gitSha: '52dc6f591195512a5a0368e12c17202546090506', name: '男性魔法師造型', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/frames/mage_male/frame_000.png', assetKind: 'character', approvalStatus: 'owner-authorized' },
      { id: 'player_mage_female', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/frames/mage_female/frame_000.png', version: '1.0.0', bytes: 5020, gitSha: '14796e535a530d7fcb66feb2377f2f59cb14c49b', name: '女性魔法師造型', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/frames/mage_female/frame_000.png', assetKind: 'character', approvalStatus: 'owner-authorized' },
      { id: 'player_archer_male', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/frames/archer_male/frame_000.png', version: '1.0.0', bytes: 5310, gitSha: '04689c1286f18b34f91924987b4e98fc2a45fbad', name: '男性弓箭手造型', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/frames/archer_male/frame_000.png', assetKind: 'character', approvalStatus: 'owner-authorized' },
      { id: 'player_archer_female', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/frames/archer_female/frame_000.png', version: '1.0.0', bytes: 5180, gitSha: '14ff5fff24d4fe04ddf89af757bce14c8dc9a40d', name: '女性弓箭手造型', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/frames/archer_female/frame_000.png', assetKind: 'character', approvalStatus: 'owner-authorized' },
      { id: 'player_acolyte_male', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/frames/acolyte_male/frame_000.png', version: '1.0.0', bytes: 5533, gitSha: 'c6b3350935bcfe38d7bc385de63415d5ca157452', name: '男性服事造型', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/frames/acolyte_male/frame_000.png', assetKind: 'character', approvalStatus: 'owner-authorized' },
      { id: 'player_acolyte_female', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/frames/acolyte_female/frame_000.png', version: '1.0.0', bytes: 4488, gitSha: '65b66910b90b5677f3e767a1f038ab4411b7e440', name: '女性服事造型', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/frames/acolyte_female/frame_000.png', assetKind: 'character', approvalStatus: 'owner-authorized' },
      { id: 'player_merchant_male', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/frames/merchant_male/frame_000.png', version: '1.0.0', bytes: 6016, gitSha: '4864a129a0ab6d3e67b01bb30a85adb27afe1368', name: '男性商人造型', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/frames/merchant_male/frame_000.png', assetKind: 'character', approvalStatus: 'owner-authorized' },
      { id: 'player_merchant_female', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/frames/merchant_female/frame_000.png', version: '1.0.0', bytes: 5453, gitSha: '04be922c059f4c9e034184c38d92e0ee4509501c', name: '女性商人造型', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/frames/merchant_female/frame_000.png', assetKind: 'character', approvalStatus: 'owner-authorized' },
      { id: 'player_thief_male', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/frames/thief_male/frame_000.png', version: '1.0.0', bytes: 5164, gitSha: '559ada4a5492c68074bdb4d6abb08ab31064f538', name: '男性盜賊造型', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/frames/thief_male/frame_000.png', assetKind: 'character', approvalStatus: 'owner-authorized' },
      { id: 'player_thief_female', requiredOnStart: false, path: 'https://raw.githubusercontent.com/nba9001-sys/ro-idle/2348031f3797dbea1981f399288748378a283940/images/frames/thief_female/frame_000.png', version: '1.0.0', bytes: 5080, gitSha: '856d39c85190a7728d5e1992c6b70a687328a804', name: '女性盜賊造型', sourceRepository: 'nba9001-sys/ro-idle', sourcePath: 'images/frames/thief_female/frame_000.png', assetKind: 'character', approvalStatus: 'owner-authorized' }
    ],
    monsters: {
      poring: { id: 'poring', name: '波利', assetId: 'poring', maxHp: 18, attackMin: 1, attackMax: 2, baseExp: 4, jobExp: 2, zenyMin: 1, zenyMax: 5, drops: [{ id: 'jellopy', name: '果凍質塊', chance: 0.35 }, { id: 'fluff', name: '獸毛', chance: 0.08 }] },
      lunatic: { id: 'lunatic', name: '瘋兔', assetId: 'lunatic', maxHp: 24, attackMin: 2, attackMax: 3, baseExp: 5, jobExp: 3, zenyMin: 1, zenyMax: 6, drops: [{ id: 'clover', name: '三葉幸運草', chance: 0.2 }, { id: 'carrot', name: '胡蘿蔔', chance: 0.25 }] },
      fabre: { id: 'fabre', name: '綠棉蟲', assetId: 'fabre', maxHp: 20, attackMin: 1, attackMax: 2, baseExp: 4, jobExp: 2, zenyMin: 1, zenyMax: 4, drops: [{ id: 'fluff', name: '獸毛', chance: 0.3 }, { id: 'chrysalis', name: '昆蟲外殼', chance: 0.12 }] },
      pupa: { id: 'pupa', name: '蛹', assetId: 'pupa', maxHp: 30, attackMin: 1, attackMax: 2, baseExp: 5, jobExp: 3, zenyMin: 2, zenyMax: 4, drops: [{ id: 'chrysalis', name: '昆蟲外殼', chance: 0.25 }] },
      thief_bug: { id: 'thief_bug', name: '盜蟲', assetId: 'thief_bug', maxHp: 32, attackMin: 2, attackMax: 4, baseExp: 6, jobExp: 3, zenyMin: 2, zenyMax: 6, drops: [{ id: 'insect_feeler', name: '昆蟲觸角', chance: 0.2 }] },
      wolf: { id: 'wolf', name: '狼', assetId: 'wolf', maxHp: 42, attackMin: 3, attackMax: 5, baseExp: 8, jobExp: 5, zenyMin: 2, zenyMax: 8, drops: [{ id: 'fang', name: '尖牙', chance: 0.22 }, { id: 'animal_skin', name: '動物外皮', chance: 0.12 }] },
      hornet: { id: 'hornet', name: '蜂兵', assetId: 'hornet', maxHp: 35, attackMin: 2, attackMax: 5, baseExp: 7, jobExp: 4, zenyMin: 2, zenyMax: 7, drops: [{ id: 'insect_feeler', name: '昆蟲觸角', chance: 0.22 }, { id: 'honey', name: '蜂蜜', chance: 0.1 }] },
      goblin: { id: 'goblin', name: '哥布林', assetId: 'goblin', maxHp: 60, attackMin: 5, attackMax: 8, baseExp: 11, jobExp: 7, zenyMin: 4, zenyMax: 12, drops: [{ id: 'monster_feed', name: '寵物飼料', chance: 0.12 }, { id: 'iron', name: '鐵', chance: 0.08 }] },
      orc: { id: 'orc', name: '半獸人戰士', assetId: 'orc', maxHp: 76, attackMin: 6, attackMax: 9, baseExp: 14, jobExp: 9, zenyMin: 5, zenyMax: 14, drops: [{ id: 'orc_fang', name: '半獸人之牙', chance: 0.18 }, { id: 'rough_ore', name: '粗糙的鐵礦石', chance: 0.08 }] },
      willow: { id: 'willow', name: '柳精', assetId: 'willow', maxHp: 40, attackMin: 2, attackMax: 4, baseExp: 7, jobExp: 5, zenyMin: 2, zenyMax: 8, drops: [{ id: 'tree_root', name: '樹根', chance: 0.2 }, { id: 'wooden_stick', name: '樹枝', chance: 0.12 }] },
      spore: { id: 'spore', name: '孢子', assetId: 'spore', maxHp: 52, attackMin: 3, attackMax: 5, baseExp: 10, jobExp: 6, zenyMin: 3, zenyMax: 10, drops: [{ id: 'mushroom_spore', name: '蘑菇孢子', chance: 0.2 }, { id: 'poison_spore', name: '毒魔菇孢子', chance: 0.05 }] },
      poporing: { id: 'poporing', name: '波波利', assetId: 'poporing', maxHp: 70, attackMin: 4, attackMax: 7, baseExp: 14, jobExp: 8, zenyMin: 4, zenyMax: 14, drops: [{ id: 'jellopy', name: '果凍質塊', chance: 0.3 }, { id: 'empty_bottle', name: '空瓶', chance: 0.1 }] },
      pecopeco: { id: 'pecopeco', name: '大嘴鳥', assetId: 'pecopeco', maxHp: 64, attackMin: 5, attackMax: 8, baseExp: 12, jobExp: 7, zenyMin: 4, zenyMax: 12, drops: [{ id: 'bird_feather', name: '鳥類羽毛', chance: 0.2 }, { id: 'animal_skin', name: '動物外皮', chance: 0.1 }] },
      picky: { id: 'picky', name: '小雞', assetId: 'picky', maxHp: 28, attackMin: 1, attackMax: 3, baseExp: 5, jobExp: 3, zenyMin: 1, zenyMax: 5, drops: [{ id: 'bird_feather', name: '鳥類羽毛', chance: 0.12 }] },
      condor: { id: 'condor', name: '禿鷹', assetId: 'condor', maxHp: 58, attackMin: 4, attackMax: 7, baseExp: 10, jobExp: 6, zenyMin: 3, zenyMax: 10, drops: [{ id: 'bird_feather', name: '鳥類羽毛', chance: 0.2 }, { id: 'claw', name: '獸爪', chance: 0.08 }] }
    },
    maps: [
      {
        id: 'novice_ground',
        name: '新手訓練場',
        imageId: 5001,
        backgroundAssetId: 'field',
        unlockLevel: 1,
        recommendedLevels: '1–5',
        sourcePath: 'tools/add_maps.js',
        monsters: [{ id: 'poring', weight: 40 }, { id: 'lunatic', weight: 35 }, { id: 'fabre', weight: 25 }]
      },
      {
        id: 'prt_fild01',
        name: '普隆德拉原野・北',
        imageId: 5004,
        backgroundAssetId: 'field',
        unlockLevel: 2,
        recommendedLevels: '2–6',
        sourcePath: 'tools/add_maps.js',
        monsters: [{ id: 'thief_bug', weight: 30 }, { id: 'fabre', weight: 20 }, { id: 'pupa', weight: 10 }, { id: 'lunatic', weight: 80 }, { id: 'poring', weight: 30 }]
      },
      {
        id: 'prt_fild00',
        name: '普隆德拉原野・東',
        imageId: 5003,
        backgroundAssetId: 'field',
        unlockLevel: 3,
        recommendedLevels: '3–7',
        sourcePath: 'nba9001-sys/ro-idle tools/add_maps.js（遭遇權重已重新平衡）',
        monsters: [{ id: 'hornet', weight: 25 }, { id: 'fabre', weight: 20 }, { id: 'pupa', weight: 10 }, { id: 'lunatic', weight: 20 }, { id: 'poring', weight: 25 }]
      },
      {
        id: 'payon_field',
        name: '培恩森林原野',
        imageId: 5016,
        backgroundAssetId: 'field',
        unlockLevel: 5,
        recommendedLevels: '5–10',
        sourcePath: 'nba9001-sys/ro-idle tools/add_maps.js（遭遇權重已重新平衡）',
        monsters: [{ id: 'spore', weight: 45 }, { id: 'willow', weight: 20 }, { id: 'poporing', weight: 15 }, { id: 'wolf', weight: 20 }]
      },
      {
        id: 'morroc_desert',
        name: '摩洛克沙漠',
        imageId: 5018,
        backgroundAssetId: 'desert',
        unlockLevel: 6,
        recommendedLevels: '6–12',
        sourcePath: 'nba9001-sys/ro-idle tools/add_maps.js（遭遇權重已重新平衡）',
        monsters: [{ id: 'pecopeco', weight: 40 }, { id: 'picky', weight: 10 }, { id: 'goblin', weight: 20 }, { id: 'orc', weight: 15 }, { id: 'condor', weight: 15 }]
      },
      {
        id: 'prt_maze01',
        name: '迷藏森林地洞',
        imageId: 5034,
        backgroundAssetId: 'cave',
        unlockLevel: 7,
        recommendedLevels: '7–13',
        sourcePath: '自訂原型地圖；名稱參考 RO 地圖資料',
        monsters: [{ id: 'thief_bug', weight: 25 }, { id: 'pupa', weight: 20 }, { id: 'spore', weight: 25 }, { id: 'goblin', weight: 15 }, { id: 'wolf', weight: 15 }]
      }
    ],
    balanceDataStatus: 'prototype-unverified',
    expansionSource: 'nba9001-sys/ro-idle@2348031f3797dbea1981f399288748378a283940',
    expansionNote: 'Map IDs, monster IDs and source image URLs are pinned to the cited public repository. All combat numbers and this fork’s map weights are prototype values.'
  };
});