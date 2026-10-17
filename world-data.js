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
      { id: 'field', path: './assets/field.jpg', version: '1.0.0', bytes: 164403, gitSha: '138cef2baecce252bf9095f856927d0573642394', statusId: 'asset-status-field', name: '新手原野背景', dependencies: ['map:novice_ground', 'map:prt_fild01'], approvalStatus: 'owner-authorized' },
      { id: 'poring', path: './assets/poring.png', version: '1.0.0', bytes: 708, gitSha: '9205f4b39eaea3eb175e0eabdcc6ba10ec296641', statusId: 'asset-status-poring', name: '波利圖像', dependencies: ['monster:poring'], approvalStatus: 'owner-authorized' },
      { id: 'lunatic', path: './assets/lunatic.png', version: '1.0.0', bytes: 4929, gitSha: '538cb55daf931cc39ba677c32930e288b64d3ae1', statusId: 'asset-status-lunatic', name: '瘋兔圖像', dependencies: ['monster:lunatic'], approvalStatus: 'owner-authorized' },
      { id: 'fabre', path: './assets/fabre.png', version: '1.0.0', bytes: 330, gitSha: '63091a44b7bdae2fcd59b8753ba5c4e5f04f9d37', statusId: 'asset-status-fabre', name: '綠棉蟲圖像', dependencies: ['monster:fabre'], approvalStatus: 'owner-authorized' },
      { id: 'pupa', path: './assets/pupa.png', version: '1.0.0', bytes: 771, gitSha: '6603da0bdf588b3f74381442fe0dc82aa574ef2c', statusId: 'asset-status-pupa', name: '蛹圖像', dependencies: ['monster:pupa'], approvalStatus: 'owner-authorized' },
      { id: 'thief_bug', path: './assets/thief_bug.png', version: '1.0.0', bytes: 1906, gitSha: 'ef27e37d53ddb15fad6e551e34868083df407d54', statusId: 'asset-status-thief_bug', name: '盜蟲圖像', dependencies: ['monster:thief_bug'], approvalStatus: 'owner-authorized' }
    ],
    monsters: {
      poring: { id: 'poring', name: '波利', assetId: 'poring', maxHp: 18, attackMin: 1, attackMax: 2, baseExp: 4, jobExp: 2, zenyMin: 1, zenyMax: 5, drops: [{ id: 'jellopy', name: '果凍質塊', chance: 0.35 }, { id: 'fluff', name: '獸毛', chance: 0.08 }] },
      lunatic: { id: 'lunatic', name: '瘋兔', assetId: 'lunatic', maxHp: 24, attackMin: 2, attackMax: 3, baseExp: 5, jobExp: 3, zenyMin: 1, zenyMax: 6, drops: [{ id: 'clover', name: '三葉幸運草', chance: 0.2 }, { id: 'carrot', name: '胡蘿蔔', chance: 0.25 }] },
      fabre: { id: 'fabre', name: '綠棉蟲', assetId: 'fabre', maxHp: 20, attackMin: 1, attackMax: 2, baseExp: 4, jobExp: 2, zenyMin: 1, zenyMax: 4, drops: [{ id: 'fluff', name: '獸毛', chance: 0.3 }, { id: 'chrysalis', name: '昆蟲外殼', chance: 0.12 }] },
      pupa: { id: 'pupa', name: '蛹', assetId: 'pupa', maxHp: 30, attackMin: 1, attackMax: 2, baseExp: 5, jobExp: 3, zenyMin: 2, zenyMax: 4, drops: [{ id: 'chrysalis', name: '昆蟲外殼', chance: 0.25 }] },
      thief_bug: { id: 'thief_bug', name: '盜蟲', assetId: 'thief_bug', maxHp: 32, attackMin: 2, attackMax: 4, baseExp: 6, jobExp: 3, zenyMin: 2, zenyMax: 6, drops: [{ id: 'insect_feeler', name: '昆蟲觸角', chance: 0.2 }] }
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
      }
    ],
    balanceDataStatus: 'prototype-unverified'
  };
});