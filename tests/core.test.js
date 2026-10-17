'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const world = require('../world-data.js');
const core = require('../core.js');

function testAutomaticUpdateStrategy() {
  const serviceWorker = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.match(serviceWorker, /ro-h5-shell-v19/);
  assert.match(serviceWorker, /cache: 'reload'/, 'install should bypass stale HTTP cache');
  assert.match(serviceWorker, /event\.request\.mode === 'navigate' \|\| SHELL_PATHS\.has\(url\.pathname\)/);
  assert.match(serviceWorker, /fetch\(event\.request, \{ cache: 'no-cache' \}\)/, 'app shell must revalidate on visits');
  assert.match(serviceWorker, /client\.navigate\(client\.url\)/, 'open tabs should reload after a shell update');
  assert.match(appSource, /updateViaCache: 'none'/, 'service worker script updates should bypass HTTP cache');
  assert.match(appSource, /registration\.update\(\)/, 'check for service worker updates on each launch');
  assert.match(appSource, /function enterSlots\(\)/, 'entering the game must not require a tab lock');
  assert.match(appSource, /function startAutosave\(\)/);
  assert.doesNotMatch(appSource, /isLockOwner|enterSlotsWithLock|ro-h5-active-tab-v1|screen-lock|screen-lost/);
  assert.doesNotMatch(html, /id="screen-lock"|id="screen-lost"|確認接管操作權|正在確認存檔操作權/);
}

function testNameRules() {
  assert.equal(core.validateCharacterName('  RO_Hunter  ', []).value, 'RO_Hunter');
  assert.equal(core.validateCharacterName('中文角色-01', []).ok, true);
  assert.equal(core.validateCharacterName('RO_Hunter', ['ro_hunter']).ok, false);
  assert.equal(core.validateCharacterName('名字 有空格', []).ok, false);
  assert.equal(core.validateCharacterName('bad.name', []).ok, false);
  assert.equal(core.validateCharacterName('1234567890123456789012345', []).ok, false);
  assert.equal(core.validateCharacterName('', []).ok, false);
}

function testOfflineTimeCap() {
  const now = 200000000;
  assert.equal(core.resolveOfflineSeconds(now - 12000, now), 12);
  assert.equal(core.resolveOfflineSeconds(now - 25 * 60 * 60 * 1000, now), 86400);
  assert.equal(core.resolveOfflineSeconds(now + 10000, now), 0);
  assert.equal(core.resolveOfflineSeconds(null, now), 0);
}

function testBattleAndRewards() {
  const character = core.makeCharacter('Tester', 'male', 'novice');
  const account = core.emptyAccount();
  character.battle.map = 'training';
  character.battle.paused = false;
  const report = core.settleOffline(character, account, 12, function () { return 0; });
  assert.equal(report.durationSeconds, 12);
  assert.ok(report.kills >= 1);
  assert.ok(report.expGained > 0);
  assert.ok(account.gold > 0);
  assert.ok((account.warehouse['果凍質塊'] || 0) > 0);
  assert.ok(character.baseLevel >= 2);
  assert.ok(character.statPoints >= 3);
}

function testMonsterBestiaryProgression() {
  const character = core.makeCharacter('BestiaryTester', 'male', 'novice');
  const account = core.emptyAccount();
  assert.deepEqual(character.bestiary, {}, 'new characters start with an empty bestiary');
  character.battle.map = 'novice_ground'; character.battle.paused = false;
  character.battle.currentMonsterId = 'poring'; character.battle.monsterMaxHp = 18; character.battle.monsterHp = 1;
  const result = core.stepCombat(character, account, function () { return 0.99; });
  assert.equal(result.killed, true);
  assert.equal(character.bestiary.poring, 1, 'a kill should register exactly once for the defeated monster');
  const legacy = core.makeCharacter('LegacyBestiary', 'female', 'novice');
  delete legacy.bestiary; legacy.battle.map = 'novice_ground'; legacy.battle.paused = false;
  legacy.battle.monsterMaxHp = 1000; legacy.battle.monsterHp = 1000;
  core.stepCombat(legacy, core.emptyAccount(), function () { return 0.99; });
  assert.deepEqual(legacy.bestiary, {}, 'older saves should gain the optional field without losing progress');
}

function testBestiaryUiWiring() {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  assert.match(appSource, /function renderBestiary\(content\)/);
  assert.match(appSource, /activeDetail === 'bestiary'/);
  assert.match(appSource, /character\.bestiary/);
  assert.match(html, /data-detail="bestiary">怪物圖鑑/);
  assert.match(css, /\.bestiary-entry/);
}

function testEquipmentCardMechanics() {
  const catalog = core.getItemCatalog();
  assert.equal(catalog.equipment.length, 14);
  assert.equal(catalog.cards.length, 6);
  const character = core.makeCharacter('GearTester', 'male', 'novice');
  const account = core.emptyAccount();
  const dagger = { instanceId: 'test-dagger', itemId: 'novice_dagger', cards: [] };
  account.equipmentInventory.push(dagger);
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 0);
  const equipped = core.equipItem(character, account, dagger.instanceId);
  assert.equal(equipped.ok, true);
  assert.equal(character.equipment.weapon.instanceId, 'test-dagger');
  assert.equal(account.equipmentInventory.length, 0);
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 3);
  account.warehouse['綠棉蟲卡片'] = 1;
  const socketed = core.socketCard(character, account, 'weapon', 'fabre_card');
  assert.equal(socketed.ok, true);
  assert.equal(account.warehouse['綠棉蟲卡片'], undefined, 'socketing consumes one shared card');
  assert.deepEqual(character.equipment.weapon.cards, ['fabre_card']);
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 4, 'the attached card contributes attack');
  const removed = core.unequipItem(character, account, 'weapon');
  assert.equal(removed.ok, true);
  assert.equal(character.equipment.weapon, null);
  assert.equal(account.equipmentInventory[0].instanceId, 'test-dagger');
  assert.deepEqual(account.equipmentInventory[0].cards, ['fabre_card'], 'socketed card remains attached when gear is unequipped');
}

function testEquipmentCombatAndLegacyCompatibility() {
  const character = core.makeCharacter('GearCombatTester', 'male', 'novice');
  const baseline = core.makeCharacter('BaselineTester', 'male', 'novice');
  [character, baseline].forEach(function (hero) {
    hero.battle.map = 'novice_ground'; hero.battle.paused = false;
    hero.battle.currentMonsterId = 'poring'; hero.battle.monsterHp = 1000; hero.battle.monsterMaxHp = 1000;
    hero.battle.monsterAttackClock = 0;
  });
  const account = core.emptyAccount();
  account.equipmentInventory.push({ instanceId: 'gear-weapon', itemId: 'novice_dagger', cards: [] });
  core.equipItem(character, account, 'gear-weapon');
  const plainHit = core.stepCombat(baseline, core.emptyAccount(), function () { return 0.99; });
  const gearHit = core.stepCombat(character, account, function () { return 0.99; });
  assert.equal(gearHit.playerDamage, plainHit.playerDamage + 3, 'weapon attack bonus must be used in combat');
  const armor = { instanceId: 'gear-armor', itemId: 'cotton_adventurer_armor', cards: [] };
  account.equipmentInventory.push(armor);
  core.equipItem(character, account, armor.instanceId);
  character.battle.monsterAttackClock = 1; baseline.battle.monsterAttackClock = 1;
  const hpBefore = character.hp; const baselineHpBefore = baseline.hp;
  const armored = core.stepCombat(character, account, function () { return 0.99; });
  const unarmored = core.stepCombat(baseline, core.emptyAccount(), function () { return 0.99; });
  assert.equal(armored.monsterDamage, Math.max(1, unarmored.monsterDamage - 2));
  assert.equal(hpBefore - character.hp, armored.monsterDamage);
  assert.equal(baselineHpBefore - baseline.hp, unarmored.monsterDamage);

  const legacy = core.makeCharacter('LegacyGear', 'female', 'novice');
  delete legacy.equipment;
  legacy.battle.map = 'novice_ground'; legacy.battle.paused = false;
  legacy.battle.monsterHp = legacy.battle.monsterMaxHp = 1000;
  core.stepCombat(legacy, { gold: 0, warehouse: {} }, function () { return 0.99; });
  assert.deepEqual(legacy.equipment, { weapon: null, armor: null, shoes: null, accessory: null });
}

function testEquipmentDropAndSaveCompatibility() {
  const character = core.makeCharacter('GearDropTester', 'male', 'novice');
  const account = core.emptyAccount();
  character.battle.map = 'novice_ground'; character.battle.paused = false;
  character.battle.currentMonsterId = 'poring'; character.battle.monsterHp = 1; character.battle.monsterMaxHp = 18;
  const result = core.stepCombat(character, account, function () { return 0; });
  assert.equal(result.killed, true);
  assert.ok(account.equipmentInventory.some(function (item) { return item.itemId === 'novice_dagger'; }));
  assert.equal(Number(account.warehouse['波利卡片']) || 0, 1);
  assert.ok(result.drops.includes('初心者短刀'));
  const legacyAccount = core.emptyAccount(); delete legacyAccount.equipmentInventory;
  const legacyHero = core.makeCharacter('DeleteCompatibility', 'male', 'novice');
  legacyHero.equipment.weapon = { instanceId: 'preserve-cards', itemId: 'novice_dagger', cards: ['fabre_card'] };
  if (!Array.isArray(legacyAccount.equipmentInventory)) legacyAccount.equipmentInventory = [];
  legacyAccount.equipmentInventory.push(legacyHero.equipment.weapon);
  assert.deepEqual(legacyAccount.equipmentInventory[0].cards, ['fabre_card']);
}

function testEquipmentRefinementProgression() {
  const character = core.makeCharacter('RefineTester', 'male', 'novice');
  const account = core.emptyAccount(); account.gold = 10000;
  account.equipmentInventory.push({ instanceId: 'refine-dagger', itemId: 'novice_dagger', cards: ['fabre_card'], refineLevel: 0 });
  assert.equal(core.equipItem(character, account, 'refine-dagger').ok, true);
  assert.equal(core.MAX_EQUIPMENT_REFINE_LEVEL, 5);
  assert.equal(core.getRefineCost(1), 100);
  assert.equal(core.getRefineCost(5), 500);
  assert.equal(core.getRefineCost(6), 0);
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 4, 'base weapon and card bonuses apply before refinement');
  const first = core.refineItem(character, account, 'weapon');
  assert.deepEqual({ ok: first.ok, level: first.refineLevel, cost: first.cost }, { ok: true, level: 1, cost: 100 });
  assert.equal(account.gold, 9900);
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 6, 'weapon refinement adds attack');
  for (let target = 2; target <= 5; target += 1) {
    const result = core.refineItem(character, account, 'weapon');
    assert.equal(result.ok, true);
    assert.equal(result.refineLevel, target);
  }
  const goldAtCap = account.gold;
  const capped = core.refineItem(character, account, 'weapon');
  assert.equal(capped.ok, false);
  assert.equal(account.gold, goldAtCap, 'attempt beyond +5 cannot spend Zeny');
  assert.equal(character.equipment.weapon.refineLevel, 5);
  assert.deepEqual(character.equipment.weapon.cards, ['fabre_card'], 'refinement must preserve socketed cards');
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 14);

  const poor = core.makeCharacter('PoorRefineTester', 'female', 'novice');
  poor.equipment.weapon = { instanceId: 'poor-dagger', itemId: 'novice_dagger', cards: ['fabre_card'] };
  const broke = core.refineItem(poor, { gold: 0 }, 'weapon');
  assert.equal(broke.ok, false);
  assert.equal(poor.equipment.weapon.refineLevel, 0);
  assert.equal(core.getEquipmentBonuses(poor).attackBonus, 4, 'legacy equipped gear without refineLevel remains unchanged');
}

function testEquipmentRefinementCombatAndUi() {
  const character = core.makeCharacter('RefineCombatTester', 'male', 'novice');
  const baseline = core.makeCharacter('RefineBaseline', 'male', 'novice');
  [character, baseline].forEach(function (hero) {
    hero.battle.map = 'novice_ground'; hero.battle.paused = false;
    hero.battle.currentMonsterId = 'poring'; hero.battle.monsterHp = 1000; hero.battle.monsterMaxHp = 1000;
  });
  const account = core.emptyAccount(); account.gold = 1000;
  account.equipmentInventory.push({ instanceId: 'refine-combat-dagger', itemId: 'novice_dagger', cards: [], refineLevel: 0 });
  assert.equal(core.equipItem(character, account, 'refine-combat-dagger').ok, true);
  assert.equal(core.refineItem(character, account, 'weapon').ok, true);
  const plain = core.stepCombat(baseline, core.emptyAccount(), function () { return 0.99; });
  const refined = core.stepCombat(character, account, function () { return 0.99; });
  assert.equal(refined.playerDamage, plain.playerDamage + 5, 'weapon base attack plus +1 refinement should affect combat');
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(appSource, /function handleRefineEquipment\(slot\)/);
  assert.match(appSource, /window\.ROCore\.refineItem\(character, account, slot\)/);
  assert.match(appSource, /getRefineCost\(targetLevel\)/);
  assert.match(appSource, /安全精煉上限/);
  assert.match(html, /MVP 1\.4/);
}
function testCardExtractionTransactions() {
  const character = core.makeCharacter('CardExtractTester', 'male', 'novice');
  const account = core.emptyAccount();
  character.equipment.weapon = { instanceId: 'extraction-equipped', itemId: 'novice_dagger', cards: ['fabre_card'], refineLevel: 2 };
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 8, 'equipped card and +2 refinement are active before extraction');
  const extractedEquipped = core.removeSocketedCard(character, account, 'extraction-equipped', 0);
  assert.equal(extractedEquipped.ok, true);
  assert.equal(extractedEquipped.cardName, '綠棉蟲卡片');
  assert.equal(extractedEquipped.slot, 'weapon');
  assert.deepEqual(character.equipment.weapon.cards, []);
  assert.equal(character.equipment.weapon.refineLevel, 2, 'card extraction must preserve refinement');
  assert.equal(account.warehouse['綠棉蟲卡片'], 1, 'extracted card returns to shared warehouse');
  assert.equal(core.getEquipmentBonuses(character).attackBonus, 7, 'card effect is removed while gear and refinement remain active');

  account.equipmentInventory.push({ instanceId: 'extraction-inventory', itemId: 'four_leaf_charm', cards: ['lunatic_card'] });
  const extractedInventory = core.removeSocketedCard(character, account, 'extraction-inventory', 0);
  assert.equal(extractedInventory.ok, true);
  assert.equal(extractedInventory.slot, 'inventory', 'cards can be extracted without equipping the item');
  assert.equal(account.warehouse['瘋兔卡片'], 1);
  assert.deepEqual(account.equipmentInventory[0].cards, []);
  const emptySlot = core.removeSocketedCard(character, account, 'extraction-inventory', 0);
  assert.equal(emptySlot.ok, false, 'an empty socket cannot duplicate a card');
  assert.equal(account.warehouse['瘋兔卡片'], 1, 'failed extraction leaves warehouse unchanged');
}

function testEquipmentSaleTransactions() {
  const character = core.makeCharacter('EquipmentSeller', 'female', 'novice');
  const account = core.emptyAccount();
  account.gold = 25;
  account.slots[0] = character;
  account.equipmentInventory.push({ instanceId: 'sale-dagger', itemId: 'novice_dagger', cards: [], refineLevel: 3 });
  const sold = core.sellEquipment(character, account, 'sale-dagger');
  assert.deepEqual({ ok: sold.ok, itemName: sold.itemName, salePrice: sold.salePrice }, { ok: true, itemName: '初心者短刀', salePrice: 30 });
  assert.equal(account.gold, 55, 'sale increases shared Zeny by the base prototype price');
  assert.equal(account.equipmentInventory.some(function (item) { return item.instanceId === 'sale-dagger'; }), false);
  assert.equal(sold.refineLevel, 3, 'selling refined gear reports its refinement but does not refund refinement costs');

  account.equipmentInventory.push({ instanceId: 'sale-carded', itemId: 'cotton_adventurer_armor', cards: ['poring_card'] });
  const protectedSale = core.sellEquipment(character, account, 'sale-carded');
  assert.equal(protectedSale.ok, false, 'carded gear must not be sold before card extraction');
  assert.equal(account.equipmentInventory.some(function (item) { return item.instanceId === 'sale-carded'; }), true);
  assert.equal(account.gold, 55);
  assert.equal(core.removeSocketedCard(character, account, 'sale-carded', 0).ok, true);
  assert.equal(core.sellEquipment(character, account, 'sale-carded').salePrice, 40, 'gear can be sold after the card is returned');

  character.equipment.weapon = { instanceId: 'still-worn', itemId: 'novice_dagger', cards: [] };
  account.equipmentInventory.push({ instanceId: 'still-worn', itemId: 'novice_dagger', cards: [] });
  const wornSale = core.sellEquipment(character, account, 'still-worn');
  assert.equal(wornSale.ok, false, 'an instance still equipped by any character cannot be sold');
}

function testExpandedEquipmentCatalogAndDrops() {
  const catalog = core.getItemCatalog();
  assert.equal(catalog.equipment.length, 14);
  assert.equal(catalog.cards.length, 6);
  const equipmentIds = new Set(catalog.equipment.map(function (item) { return item.id; }));
  const cardIds = new Set(catalog.cards.map(function (item) { return item.id; }));
  const validSlots = new Set(['weapon', 'armor', 'shoes', 'accessory']);
  catalog.equipment.forEach(function (item) {
    assert.ok(validSlots.has(item.slot), item.id + ' must use an implemented equipment slot');
    assert.ok(item.requiredLevel >= 1, item.id + ' must have a valid level requirement');
    assert.ok(Array.isArray(item.allowedJobs) && item.allowedJobs.length > 0, item.id + ' must define job eligibility');
    assert.ok(item.sellPrice > 0, item.id + ' must have a sale price');
  });
  Object.values(world.monsters).forEach(function (monster) {
    (monster.drops || []).forEach(function (drop) {
      if (drop.type === 'equipment') assert.ok(equipmentIds.has(drop.id), monster.id + ' references missing equipment drop ' + drop.id);
      if (drop.type === 'card') assert.ok(cardIds.has(drop.id), monster.id + ' references missing card drop ' + drop.id);
    });
  });
  ['main_gauche', 'iron_sword', 'hunter_bow', 'padded_armor', 'silk_robe', 'scale_armor', 'field_boots', 'swift_boots', 'brooch', 'coin_pouch'].forEach(function (id) {
    assert.ok(equipmentIds.has(id), 'expanded equipment should include ' + id);
  });
  ['pupa_card', 'wolf_card', 'spore_card'].forEach(function (id) {
    assert.ok(cardIds.has(id), 'expanded card catalog should include ' + id);
  });

  const thief = core.makeCharacter('NewGearThief', 'male', 'novice');
  thief.jobId = 'thief'; thief.jobName = '盜賊'; thief.baseLevel = 3;
  const account = core.emptyAccount();
  account.equipmentInventory.push({ instanceId: 'main-gauche-thief', itemId: 'main_gauche', cards: [] });
  assert.equal(core.equipItem(thief, account, 'main-gauche-thief').ok, true, 'eligible thief can equip the new short sword');
  assert.equal(core.getEquipmentBonuses(thief).attackBonus, 4);

  const mage = core.makeCharacter('RestrictedGearMage', 'female', 'novice');
  mage.jobId = 'mage'; mage.jobName = '魔法師'; mage.baseLevel = 5;
  account.equipmentInventory.push({ instanceId: 'iron-sword-mage', itemId: 'iron_sword', cards: [] });
  const restricted = core.equipItem(mage, account, 'iron-sword-mage');
  assert.equal(restricted.ok, false, 'equipment job requirements are enforced for new items');
  assert.equal(account.equipmentInventory.some(function (item) { return item.instanceId === 'iron-sword-mage'; }), true);
}

function testEquipmentDodgeAndZenyBonuses() {
  const evasive = core.makeCharacter('EvasiveGearTester', 'female', 'novice');
  const plain = core.makeCharacter('PlainEvasionTester', 'female', 'novice');
  [evasive, plain].forEach(function (hero) {
    hero.baseLevel = 6;
    hero.battle.map = 'payon_field'; hero.battle.paused = false;
    hero.battle.currentMonsterId = 'wolf'; hero.battle.monsterHp = 1000; hero.battle.monsterMaxHp = 1000;
    hero.battle.monsterAttackClock = 1;
  });
  evasive.equipment.shoes = { instanceId: 'swift-boots-test', itemId: 'swift_boots', cards: [] };
  const rolls = [0.5, 0.5, 0.01];
  let index = 0;
  const evasiveResult = core.stepCombat(evasive, core.emptyAccount(), function () { return rolls[Math.min(index++, rolls.length - 1)]; });
  const plainRolls = [0.5, 0.5, 0.01];
  index = 0;
  const plainResult = core.stepCombat(plain, core.emptyAccount(), function () { return plainRolls[Math.min(index++, plainRolls.length - 1)]; });
  assert.equal(evasiveResult.dodged, true, 'swift boots should add dodge chance during actual monster attacks');
  assert.equal(plainResult.dodged, false, 'the same random roll should not dodge without the equipment bonus');

  const merchant = core.makeCharacter('ZenyGearTester', 'male', 'novice');
  const merchantPlain = core.makeCharacter('ZenyGearBaseline', 'male', 'novice');
  [merchant, merchantPlain].forEach(function (hero) {
    hero.jobId = 'merchant'; hero.jobName = '商人';
    hero.baseLevel = 99; hero.stats.str = 99;
    hero.battle.map = 'morroc_desert'; hero.battle.paused = false;
    hero.battle.currentMonsterId = 'orc'; hero.battle.monsterHp = 1; hero.battle.monsterMaxHp = 76;
  });
  merchant.equipment.accessory = { instanceId: 'coin-pouch-test', itemId: 'coin_pouch', cards: [] };
  const gearAccount = core.emptyAccount();
  const plainAccount = core.emptyAccount();
  core.stepCombat(merchant, gearAccount, function () { return 0.99; });
  core.stepCombat(merchantPlain, plainAccount, function () { return 0.99; });
  assert.equal(core.getEquipmentBonuses(merchant).zenyBonus, 0.1);
  assert.equal(gearAccount.gold, 18, 'merchant passive and coin pouch stack on kill Zeny');
  assert.equal(plainAccount.gold, 16, 'the same merchant without the coin pouch receives less Zeny');
}

function testEquipmentUiWiring() {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  assert.match(appSource, /function renderEquipment\(content\)/);
  assert.match(appSource, /window\.ROCore\.equipItem\(character, account, instanceId\)/);
  assert.match(appSource, /window\.ROCore\.socketCard\(character, account, slot, cardId\)/);
  assert.ok(appSource.includes('window.ROCore.removeSocketedCard(character, account, instanceId, cardIndex)'));
  assert.ok(appSource.includes('window.ROCore.sellEquipment(character, account, instanceId)'));
  assert.ok(appSource.includes('function handleRemoveSocketedCard(instanceId, cardIndex, cardName)'));
  assert.ok(appSource.includes('function handleSellEquipment(instanceId)'));
  assert.ok(appSource.includes('出售（'));
  assert.match(appSource, /account\.equipmentInventory\.push\(equipped\)/, 'deleting a character must return equipped items to account inventory');
  assert.match(appSource, /parsed\.equipmentInventory = \[\]/, 'legacy account saves should safely gain gear inventory');
  assert.match(html, /data-detail="equipment">裝備／卡片/);
  assert.match(html, /MVP 1\.4/);
  assert.match(css, /\.equipment-slot/);
}

function testPause() {
  const character = core.makeCharacter('PauseTester', 'female', 'novice');
  const account = core.emptyAccount();
  character.battle.map = 'training';
  character.battle.paused = true;
  const report = core.settleOffline(character, account, 30, function () { return 0; });
  assert.equal(report.kills, 0);
  assert.equal(report.expGained, 0);
  assert.equal(account.gold, 0);
}


function testMapAndMonsterProgression() {
  const character = core.makeCharacter('Mapper', 'male', 'novice');
  assert.equal(core.getMap('training').id, 'novice_ground');
  assert.equal(core.startMap(character, 'prt_fild01', function () { return 0; }), false);
  assert.equal(core.startMap(character, 'novice_ground', function () { return 0; }), true);
  assert.equal(character.battle.currentMonsterId, 'poring');

  const account = core.emptyAccount();
  const report = core.settleOffline(character, account, 12, function () { return 0; });
  assert.ok(report.kills >= 1);
  assert.ok(character.baseLevel >= 2);
  assert.equal(core.startMap(character, 'prt_fild01', function () { return 0; }), true);
  assert.equal(character.battle.currentMonsterId, 'thief_bug');
  assert.equal(character.battle.monsterMaxHp, core.getMonster('thief_bug').maxHp);
}



function testStatPointAllocation() {
  assert.equal(core.statPointGainForLevelUp(1), 3);
  assert.equal(core.statPointGainForLevelUp(5), 4);
  assert.equal(core.statPointGainForLevelUp(10), 5);
  assert.equal(core.statPointCost(1), 2);
  assert.equal(core.statPointCost(10), 2);
  assert.equal(core.statPointCost(11), 3);

  const character = core.makeCharacter('StatTester', 'male', 'novice');
  character.statPoints = 7;
  const oldMaxHp = character.maxHp;
  const oldMaxSp = character.maxSp;

  const vit = core.allocateStat(character, 'vit');
  assert.equal(vit.ok, true);
  assert.equal(character.stats.vit, 2);
  assert.equal(character.statPoints, 5);
  assert.equal(character.maxHp, oldMaxHp + 5);

  const int = core.allocateStat(character, 'int');
  assert.equal(int.ok, true);
  assert.equal(character.maxSp, oldMaxSp + 2);
  assert.equal(character.statPoints, 3);

  assert.equal(core.allocateStat(character, 'str').ok, true);
  assert.equal(character.statPoints, 1);
  assert.equal(core.allocateStat(character, 'dex').ok, false);
  assert.equal(core.allocateStat(character, 'unknown').ok, false);

  character.stats.luk = core.STAT_CAP;
  assert.equal(core.allocateStat(character, 'luk').ok, false);
}

function testFirstJobPromotion() {
  const character = core.makeCharacter('JobTester', 'female', 'novice');
  character.baseLevel = 12;
  character.baseExp = 9;
  character.statPoints = 14;
  character.jobLevel = 9;
  character.jobExp = 77;
  character.battle.map = 'novice_ground';
  character.battle.paused = false;

  assert.equal(core.getJobLevelCap(character), 10);
  assert.equal(core.changeJob(character, 'swordsman').ok, false);
  assert.equal(character.jobId, 'novice');

  character.jobLevel = 10;
  const result = core.changeJob(character, 'swordsman');
  assert.equal(result.ok, true);
  assert.equal(character.jobId, 'swordsman');
  assert.equal(character.jobName, '劍士');
  assert.equal(character.jobLevel, 1);
  assert.equal(character.jobExp, 0);
  assert.equal(character.jobNotice, false);
  assert.equal(core.getJobLevelCap(character), 50);
  assert.equal(character.baseLevel, 12);
  assert.equal(character.baseExp, 9);
  assert.equal(character.statPoints, 14);
  assert.equal(character.battle.map, 'novice_ground');
  assert.equal(character.battle.paused, false);
  assert.equal(core.changeJob(character, 'mage').ok, false);
  assert.equal(core.changeJob(character, 'unknown-job').ok, false);

  const mage = core.makeCharacter('MageTester', 'male', 'novice');
  mage.jobLevel = 10;
  assert.equal(core.changeJob(mage, 'mage').ok, true);
  assert.equal(mage.jobName, '魔法師');
}

function makePromotedFighter(jobId) {
  const character = core.makeCharacter('Fighter-' + jobId, 'male', 'novice');
  character.jobLevel = 10;
  const promotion = core.changeJob(character, jobId);
  assert.equal(promotion.ok, true, 'promotion should succeed for ' + jobId);
  character.battle.map = 'novice_ground';
  character.battle.paused = false;
  character.battle.currentMonsterId = 'poring';
  character.battle.monsterHp = 1000;
  character.battle.monsterMaxHp = 1000;
  character.battle.monsterAttackClock = 0;
  return character;
}

function testFirstJobCombatPassives() {
  assert.equal(core.FIRST_JOBS.length, 6);

  const swordsman = makePromotedFighter('swordsman');
  const mage = makePromotedFighter('mage');
  const swordHit = core.stepCombat(swordsman, core.emptyAccount(), function () { return 0.99; });
  const mageHit = core.stepCombat(mage, core.emptyAccount(), function () { return 0.99; });
  assert.equal(mageHit.playerDamage, swordHit.playerDamage + 1);

  const acolyte = makePromotedFighter('acolyte');
  acolyte.hp = 20;
  acolyte.battle.monsterHp = 1;
  acolyte.battle.monsterMaxHp = 1;
  const acolyteResult = core.stepCombat(acolyte, core.emptyAccount(), function () { return 0.99; });
  assert.equal(acolyteResult.killed, true);
  assert.equal(acolyteResult.healingGained, 3);
  assert.equal(acolyte.hp, 23);

  const merchant = makePromotedFighter('merchant');
  merchant.battle.monsterHp = 1;
  merchant.battle.monsterMaxHp = 1;
  const merchantResult = core.stepCombat(merchant, core.emptyAccount(), function () { return 0.99; });
  assert.equal(merchantResult.goldGained, 6);

  const thief = makePromotedFighter('thief');
  thief.battle.monsterAttackClock = 1;
  const thiefResult = core.stepCombat(thief, core.emptyAccount(), function () { return 0.05; });
  assert.equal(thiefResult.dodged, true);
  assert.equal(thiefResult.monsterDamage, 0);

  const capped = makePromotedFighter('swordsman');
  capped.jobLevel = 49;
  capped.jobExp = core.jobExpToNext(49);
  capped.battle.monsterHp = 1;
  capped.battle.monsterMaxHp = 1;
  const capResult = core.stepCombat(capped, core.emptyAccount(), function () { return 0.99; });
  assert.equal(capped.jobLevel, 50);
  assert.equal(capped.jobExp, 0);
  assert.equal(capResult.jobCapped, true);
  assert.equal(capped.jobCapReached, true);

  capped.jobNotice = false; // The player has inspected the job panel.
  capped.battle.monsterHp = 1;
  capped.battle.monsterMaxHp = 1;
  const repeatCapResult = core.stepCombat(capped, core.emptyAccount(), function () { return 0.99; });
  assert.equal(repeatCapResult.jobCapped, false);
  assert.equal(capped.jobNotice, false, 'dismissed cap notice should stay dismissed');
}

function testAssetManifestCoverage() {
  assert.equal(world.assets.filter(function (asset) { return asset.requiredOnStart; }).length, 4);
  assert.ok(world.assets.filter(function (asset) { return !asset.requiredOnStart; }).length >= 20);
  const assetIds = new Set(world.assets.map(function (asset) { return asset.id; }));
  assert.equal(assetIds.size, world.assets.length, 'asset IDs must be unique');
  world.assets.filter(function (asset) { return asset.sourceRepository; }).forEach(function (asset) {
    assert.equal(asset.sourceRepository, 'nba9001-sys/ro-idle');
    assert.match(asset.path, /raw\.githubusercontent\.com\/nba9001-sys\/ro-idle\/2348031f3797dbea1981f399288748378a283940\//);
    assert.match(asset.gitSha, /^[a-f0-9]{40}$/);
    assert.ok(asset.bytes > 0);
  });
  const spriteGroups = world.playerSpriteFrames;
  assert.equal(Object.keys(spriteGroups).length, 14, 'all six first jobs plus novice need both gender groups');
  let totalFrames = 0;
  Object.entries(spriteGroups).forEach(function (entry) {
    const group = entry[0];
    const frameIds = entry[1];
    assert.ok(frameIds.length >= 6 && frameIds.length <= 9, 'unexpected frame count for ' + group);
    assert.equal(frameIds[0], 'player_' + group, 'frame zero must reuse the existing preview asset');
    frameIds.forEach(function (id, index) {
      assert.ok(assetIds.has(id), 'missing animation frame asset: ' + id);
      const asset = world.assets.find(function (candidate) { return candidate.id === id; });
      assert.ok(asset.assetKind === 'character-frame' || asset.assetKind === 'character');
      assert.equal(asset.approvalStatus, 'owner-authorized');
      if (index > 0) assert.equal(asset.spriteGroup, group);
      totalFrames += 1;
    });
  });
  assert.equal(totalFrames, 120, 'all available frames from the 14 source folders should be registered');
  assert.ok(world.playerAnimationFrameIntervalMs >= 80);
  assert.equal(world.animationSource, 'nba9001-sys/ro-idle@2348031f3797dbea1981f399288748378a283940');
  world.maps.forEach(function (map) {
    assert.ok(assetIds.has(map.backgroundAssetId), 'missing map background asset: ' + map.id);
    map.monsters.forEach(function (entry) {
      const monster = world.monsters[entry.id];
      assert.ok(monster, 'missing monster data: ' + entry.id);
      assert.ok(assetIds.has(monster.assetId), 'missing monster image asset: ' + entry.id);
    });
  });
}

function testCriticalEffectManifest() {
  assert.equal(world.criticalEffectFrames.length, 15);
  assert.equal(world.criticalEffectFrameIntervalMs, 70);
  const assetMap = new Map(world.assets.map(function (asset) { return [asset.id, asset]; }));
  let totalBytes = 0;
  world.criticalEffectFrames.forEach(function (assetId, index) {
    const asset = assetMap.get(assetId);
    assert.ok(asset, 'critical effect references missing frame: ' + assetId);
    assert.equal(asset.assetKind, 'effect-frame');
    assert.equal(asset.spriteGroup, 'crit');
    assert.equal(asset.frameNumber, index);
    assert.equal(asset.sourcePath, 'images/effects/crit/msg_frame_' + String(index).padStart(3, '0') + '.png');
    assert.match(asset.gitSha, /^[a-f0-9]{40}$/);
    assert.ok(asset.bytes > 0);
    totalBytes += asset.bytes;
  });
  assert.equal(totalBytes, 17846);
}

function testExpandedWorldContent() {
  const expectedMaps = ['prt_fild00', 'payon_field', 'morroc_desert', 'prt_maze01'];
  expectedMaps.forEach(function (mapId) {
    assert.ok(core.getMap(mapId), 'expected expanded map: ' + mapId);
  });
  assert.ok(world.monsters.wolf && world.monsters.hornet && world.monsters.goblin);
  assert.ok(world.monsters.orc && world.monsters.willow && world.monsters.spore);
  assert.ok(world.monsters.poporing && world.monsters.pecopeco && world.monsters.picky && world.monsters.condor);
  assert.equal(core.getMap('morroc_desert').backgroundAssetId, 'desert');
  assert.equal(core.getMap('prt_maze01').backgroundAssetId, 'cave');

  const character = core.makeCharacter('MapUnlockTester', 'male', 'novice');
  character.baseLevel = 5;
  assert.equal(core.startMap(character, 'morroc_desert', function () { return 0; }), false);
  character.baseLevel = 6;
  assert.equal(core.startMap(character, 'morroc_desert', function () { return 0; }), true);
  assert.equal(character.battle.currentMonsterId, 'pecopeco');
  assert.equal(character.battle.monsterMaxHp, world.monsters.pecopeco.maxHp);

  character.battle.paused = true;
  character.baseLevel = 6;
  assert.equal(core.startMap(character, 'prt_maze01', function () { return 0; }), false);
  character.baseLevel = 7;
  assert.equal(core.startMap(character, 'prt_maze01', function () { return 0; }), true);
  assert.equal(character.battle.currentMonsterId, 'thief_bug');
}

function testSpriteFramesUsePinnedSourceAndHaveNoMissingReferences() {
  const assetMap = new Map(world.assets.map(function (asset) { return [asset.id, asset]; }));
  Object.entries(world.playerSpriteFrames).forEach(function (entry) {
    entry[1].forEach(function (assetId, index) {
      const asset = assetMap.get(assetId);
      assert.ok(asset, 'sprite references missing asset: ' + assetId);
      assert.match(asset.gitSha, /^[a-f0-9]{40}$/);
      assert.ok(asset.bytes > 0);
      if (index > 0) {
        assert.ok(asset.path.includes('/2348031f3797dbea1981f399288748378a283940/images/frames/'));
        assert.equal(asset.assetKind, 'character-frame');
      }
    });
  });
}


function testSoundEffectManifest() {
  const expected = {
    hit: 'sfx_hit_sword',
    critical: 'sfx_critical',
    levelup: 'sfx_levelup',
    skill_sword: 'sfx_skill_sword',
    skill_fire: 'sfx_skill_fire',
    skill_soul: 'sfx_skill_soul',
    skill_arrow: 'sfx_skill_arrow',
    skill_heal: 'sfx_skill_heal',
    skill_merchant: 'sfx_skill_merchant',
    skill_poison: 'sfx_skill_poison'
  };
  assert.deepEqual(world.soundEffects, expected);
  const assetMap = new Map(world.assets.map(function (asset) { return [asset.id, asset]; }));
  const pinned = '2348031f3797dbea1981f399288748378a283940';
  const definitions = {
    sfx_hit_sword: { bytes: 24866, gitSha: 'fcb1f2cd80591ed5e92f730a417377c401ae65be', sourcePath: 'WAV/物理攻擊命中/_hit_sword.wav' },
    sfx_critical: { bytes: 8886, gitSha: 'dcc3946a430651b08334c2edade11d61672672ee', sourcePath: 'WAV/爆擊/Critical.ogg' },
    sfx_levelup: { bytes: 24294, gitSha: '4c501809789d1a03aedfd8c6c9728809c8a32dac', sourcePath: 'WAV/event/levelup.ogg' },
    sfx_skill_sword: { bytes: 12488, gitSha: 'fd1564fa6e975d02811c51a26e37d61fde106417', sourcePath: 'WAV/物理攻擊揮空/_attack_sword.wav' },
    sfx_skill_fire: { bytes: 34412, gitSha: '253727c39fff8deb9ccd53df195bc47bffebddb6', sourcePath: 'WAV/魔法傷害/火箭術.wav' },
    sfx_skill_soul: { bytes: 20724, gitSha: 'c93e0743fbb003c055f69e9eb690789b8ee7c938', sourcePath: 'WAV/魔法傷害/其餘雷系.wav' },
    sfx_skill_arrow: { bytes: 13360, gitSha: '349f3b1a145092e9a2119d71a69063c1c1e74025', sourcePath: 'WAV/物理攻擊命中/_hit_arrow.wav' },
    sfx_skill_heal: { bytes: 59636, gitSha: '7447aeb13b0e6c45443f6ca01ede4e2357c20623', sourcePath: 'WAV/魔法傷害/治癒術.wav' },
    sfx_skill_merchant: { bytes: 16114, gitSha: 'e7f38e344756e8b8e84cce27000b666d65353051', sourcePath: 'WAV/物理攻擊命中/_hit_axe.wav' },
    sfx_skill_poison: { bytes: 40564, gitSha: 'a6e6614cb5688ffa70f78c9c9b6f94c8ebaffb91', sourcePath: 'WAV/異常狀態/中毒.wav' }
  };
  Object.entries(definitions).forEach(function (entry) {
    const asset = assetMap.get(entry[0]);
    assert.ok(asset, 'missing sound effect asset: ' + entry[0]);
    assert.equal(asset.requiredOnStart, false, 'sound effects must be loaded on demand');
    assert.equal(asset.assetKind, 'sound-effect');
    assert.equal(asset.sourceRepository, 'nba9001-sys/ro-idle');
    assert.equal(asset.sourcePath, entry[1].sourcePath);
    assert.ok(asset.path.includes('/' + pinned + '/'));
    assert.equal(asset.bytes, entry[1].bytes);
    assert.equal(asset.gitSha, entry[1].gitSha);
    assert.match(asset.gitSha, /^[a-f0-9]{40}$/);
  });
  assert.equal(world.soundSource, 'nba9001-sys/ro-idle@' + pinned);

  const expectedMusic = { default: 'bgm_default', novice_ground: 'bgm_novice_ground', prt_fild01: 'bgm_prt_fild01' };
  assert.deepEqual(world.mapMusic, expectedMusic);
  const musicDefinitions = {
    bgm_default: { bytes: 747520, gitSha: 'cad866cf9b0b98cf4892a887dd12985057cc6e13', sourcePath: 'music/maps/0000.mp3' },
    bgm_novice_ground: { bytes: 1476608, gitSha: '95997a8034476a21ba168d91d8322332dbcadf66', sourcePath: 'music/maps/5001.mp3' },
    bgm_prt_fild01: { bytes: 2257024, gitSha: '71daf34328cdc69d64d8c39172e4b2d584a8830a', sourcePath: 'music/maps/5004.mp3' }
  };
  Object.entries(musicDefinitions).forEach(function (entry) {
    const asset = assetMap.get(entry[0]);
    assert.ok(asset, 'missing background music asset: ' + entry[0]);
    assert.equal(asset.requiredOnStart, false, 'background music must be lazy-loaded');
    assert.equal(asset.assetKind, 'background-music');
    assert.equal(asset.sourceRepository, 'nba9001-sys/ro-idle');
    assert.equal(asset.sourcePath, entry[1].sourcePath);
    assert.ok(asset.path.includes('/' + pinned + '/'));
    assert.equal(asset.bytes, entry[1].bytes);
    assert.equal(asset.gitSha, entry[1].gitSha);
  });
}

function testSoundEffectWiring() {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  assert.match(appSource, /function playSoundEffect\(type\)/);
  assert.match(appSource, /ro-h5-sound-effects-v1/);
  assert.match(appSource, /MUSIC_ENABLED_KEY/);
  assert.match(appSource, /SKILL_SOUND_BY_NAME\[result\.skillName\]/);
  assert.match(appSource, /playSoundEffect\('skill_heal'\)/);
  assert.match(appSource, /playSoundEffect\('levelup'\)/);
  assert.match(appSource, /ensureAssets\(\[asset\], false\)/);
  assert.match(appSource, /playMapMusic\(map\)/);
  assert.match(appSource, /showSceneEffect\(effectLabel, effectKind/);
  assert.match(html, /id="btn-sound"/);
  assert.match(html, /id="btn-music"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(css, /skill-fx-magic/);
  assert.match(css, /skill-hit-poison/);
  assert.match(appSource, /function showMonsterDefeatEffect\(monsterName\)/);
  assert.match(appSource, /function showPlayerHitEffect\(damage, playerDown\)/);
  assert.match(appSource, /function playHeroSkillAnimation\(kind\)/);
  assert.match(appSource, /if \(result\.killed\) showMonsterDefeatEffect\(result\.monsterName\)/);
  assert.match(html, /id="monster-defeat-effect"/);
  assert.match(html, /id="player-hit-effect"/);
  assert.match(css, /monsterIdleBreathe/);
  assert.match(css, /monsterDefeatBurst/);
  assert.match(css, /playerHitFloat/);
  assert.match(css, /heroCastMagic/);
  assert.match(css, /prefers-reduced-motion:reduce/);
}
function testSkillTreeProgression() {
  const expectedJobs = ['novice', 'swordsman', 'mage', 'archer', 'acolyte', 'merchant', 'thief'];
  assert.deepEqual(Object.keys(core.SKILL_TREES).sort(), expectedJobs.slice().sort());
  expectedJobs.forEach(function (jobId) {
    const tree = core.getSkillTree(jobId);
    assert.ok(tree && tree.skills.length >= 2, 'missing skill tree for ' + jobId);
    const ids = tree.skills.map(function (skill) { return skill.id; });
    assert.equal(new Set(ids).size, ids.length, 'duplicate skill id in ' + jobId);
    tree.skills.forEach(function (skill) {
      assert.ok(skill.maxLevel > 0);
      assert.ok(skill.requiredJobLevel >= 1);
      if (skill.prerequisite) assert.ok(ids.includes(skill.prerequisite), 'prerequisite must be in same job tree');
    });
  });

  const novice = core.makeCharacter('SkillNovice', 'male', 'novice');
  assert.equal(novice.skillPoints, 0);
  assert.equal(core.allocateSkill(novice, 'basic_training').ok, false);
  novice.skillPoints = 5;
  assert.equal(core.allocateSkill(novice, 'basic_training').level, 1);
  assert.equal(core.allocateSkill(novice, 'basic_training').level, 2);
  assert.equal(core.allocateSkill(novice, 'basic_training').level, 3);
  novice.jobLevel = 5;
  const firstAid = core.allocateSkill(novice, 'first_aid');
  assert.equal(firstAid.ok, true);
  assert.equal(novice.skillPoints, 1);
  assert.equal(core.allocateSkill(novice, 'sword_mastery').ok, false, 'a skill from a different job is rejected');

  const swordsman = makePromotedFighter('swordsman');
  swordsman.skillPoints = 8;
  assert.equal(core.allocateSkill(swordsman, 'bash').ok, false, 'job level requirement must be enforced');
  swordsman.jobLevel = 5;
  assert.equal(core.allocateSkill(swordsman, 'bash').ok, false, 'prerequisite rank must be enforced');
  core.allocateSkill(swordsman, 'sword_mastery');
  core.allocateSkill(swordsman, 'sword_mastery');
  core.allocateSkill(swordsman, 'sword_mastery');
  assert.equal(core.getSkillLevel(swordsman, 'sword_mastery'), 3);
  assert.equal(core.allocateSkill(swordsman, 'bash').ok, true);
  assert.equal(core.getSkillLevel(swordsman, 'bash'), 1);
}

function testSkillCombatEffects() {
  const baseline = makePromotedFighter('swordsman');
  const boosted = makePromotedFighter('swordsman');
  boosted.jobLevel = 5;
  boosted.skillPoints = 8;
  for (let i = 0; i < 3; i += 1) core.allocateSkill(boosted, 'sword_mastery');
  core.allocateSkill(boosted, 'bash');
  core.allocateSkill(boosted, 'bash');
  baseline.battle.monsterHp = baseline.battle.monsterMaxHp = 1000;
  boosted.battle.monsterHp = boosted.battle.monsterMaxHp = 1000;
  const account = core.emptyAccount();
  const plainHit = core.stepCombat(baseline, core.emptyAccount(), function () { return 0.99; });
  const skillHit = core.stepCombat(boosted, account, function () { return 0.99; });
  assert.equal(skillHit.skillName, '狂擊');
  assert.ok(skillHit.playerDamage > plainHit.playerDamage, 'Bash should increase damage');
  assert.equal(boosted.sp, 15, 'Bash rank 2 should consume 5 SP');
  assert.equal(boosted.battle.skillCooldown, 5);

  const healer = makePromotedFighter('acolyte');
  healer.jobLevel = 5;
  healer.skillPoints = 8;
  for (let i = 0; i < 3; i += 1) core.allocateSkill(healer, 'divine_protection');
  core.allocateSkill(healer, 'heal');
  healer.hp = 20;
  healer.battle.monsterHp = healer.battle.monsterMaxHp = 1000;
  const healResult = core.stepCombat(healer, core.emptyAccount(), function () { return 0.99; });
  assert.equal(healResult.skillName, '治癒術');
  assert.equal(healResult.skillHealingGained, 9);
  assert.equal(healer.hp, 29);
  assert.equal(healer.sp, 15);

  const merchant = makePromotedFighter('merchant');
  merchant.jobLevel = 5;
  merchant.skillPoints = 8;
  for (let i = 0; i < 3; i += 1) core.allocateSkill(merchant, 'overcharge');
  core.allocateSkill(merchant, 'mammonite');
  merchant.battle.monsterHp = merchant.battle.monsterMaxHp = 1000;
  const emptyWallet = core.emptyAccount();
  const uncast = core.stepCombat(merchant, emptyWallet, function () { return 0.99; });
  assert.equal(uncast.skillName, '', 'Mammonite must not cast without Zeny');
  assert.equal(merchant.sp, 20);
  emptyWallet.gold = 100;
  const cast = core.stepCombat(merchant, emptyWallet, function () { return 0.99; });
  assert.equal(cast.skillName, '金錢攻擊');
  assert.equal(emptyWallet.gold, 90, 'rank 1 Mammonite should cost 10 Zeny');
  assert.equal(merchant.sp, 18);
}

function testSkillPointsAndLegacySaveCompatibility() {
  const character = makePromotedFighter('swordsman');
  character.jobExp = core.jobExpToNext(character.jobLevel) - core.getMonster('poring').jobExp;
  character.battle.monsterHp = character.battle.monsterMaxHp = 1;
  const result = core.stepCombat(character, core.emptyAccount(), function () { return 0.99; });
  assert.equal(result.killed, true);
  assert.equal(character.jobLevel, 2);
  assert.equal(character.skillPoints, 1, 'each Job level gained should award a skill point');

  const legacy = makePromotedFighter('mage');
  delete legacy.skills;
  delete legacy.skillPoints;
  delete legacy.battle.skillCooldown;
  delete legacy.battle.combatTicks;
  delete legacy.bestiary;
  assert.equal(core.getSkillLevel(legacy, 'fire_bolt'), 0);
  legacy.battle.monsterHp = legacy.battle.monsterMaxHp = 1000;
  core.stepCombat(legacy, core.emptyAccount(), function () { return 0.99; });
  assert.equal(legacy.skillPoints, 0);
  assert.deepEqual(legacy.skills, {});
  assert.deepEqual(legacy.bestiary, {});
  assert.equal(legacy.battle.skillCooldown, 0);
  assert.equal(legacy.battle.combatTicks, 1);
}

function testSkillTreeUiWiring() {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(appSource, /function renderSkillTree\(content\)/);
  assert.match(appSource, /function allocateSkillPoint\(skillId\)/);
  assert.match(appSource, /data-skill-id/);
  assert.match(appSource, /activeDetail === 'skills'/);
  assert.match(appSource, /window\.ROCore\.allocateSkill\(character, skillId\)/);
  assert.match(html, /data-detail="skills">技能樹/);
  assert.match(html, /MVP 1\.4/);
}


function testCraftingMaterialsAndTransactions() {
  const catalog = core.getConsumableCatalog();
  assert.equal(catalog.consumables.length, 3);
  assert.equal(catalog.recipes.length, 3);
  const account = core.emptyAccount();
  account.warehouse = { '胡蘿蔔': 4, '空瓶': 2, '果凍質塊': 4, '昆蟲外殼': 2, '蜂蜜': 2, '蘑菇孢子': 4, '既有獸毛': 7 };
  const crafted = core.craftConsumable(account, 'carrot_tonic', 2);
  assert.equal(crafted.ok, true);
  assert.equal(crafted.quantity, 2);
  assert.equal(account.warehouse['胡蘿蔔'], undefined);
  assert.equal(account.warehouse['空瓶'], undefined);
  assert.equal(account.warehouse['胡蘿蔔補給'], 2);
  assert.equal(account.warehouse['既有獸毛'], 7, 'unrelated warehouse items are preserved');
  const beforeShortage = JSON.stringify(account);
  assert.equal(core.craftConsumable(account, 'honey_potion', 3).ok, false);
  assert.equal(JSON.stringify(account), beforeShortage, 'failed crafting must not partially consume materials');
  assert.equal(core.craftConsumable(account, 'unknown_recipe', 1).ok, false);
  assert.equal(core.craftConsumable(account, 'honey_potion', 100).ok, false);
}

function testConsumableUseAndUiWiring() {
  const character = core.makeCharacter('PotionTester', 'male', 'novice');
  character.maxHp = 100; character.hp = 10;
  const account = core.emptyAccount();
  account.warehouse['胡蘿蔔補給'] = 1; account.warehouse['蜂蜜藥水'] = 1;
  const small = core.useConsumable(character, account, 'carrot_tonic');
  assert.equal(small.ok, true); assert.equal(small.healed, 18); assert.equal(character.hp, 28);
  assert.equal(account.warehouse['胡蘿蔔補給'], undefined);
  character.hp = 80;
  const strong = core.useConsumable(character, account, 'honey_potion');
  assert.equal(strong.ok, true); assert.equal(strong.healed, 20); assert.equal(character.hp, 100);
  const beforeFullHp = JSON.stringify(account);
  assert.equal(core.useConsumable(character, account, 'honey_potion').ok, false, 'full HP must not waste an item');
  assert.equal(JSON.stringify(account), beforeFullHp);
  assert.equal(core.useConsumable(character, account, 'missing_item').ok, false);
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.match(appSource, /function renderCraftingRecipes\(content\)/);
  assert.match(appSource, /data-craft-recipe/);
  assert.match(appSource, /data-use-consumable/);
  assert.ok(appSource.includes('window.ROCore.craftConsumable(account, recipeId, 1)'));
  assert.ok(appSource.includes('window.ROCore.useConsumable(character, account, itemId)'));
  assert.match(html, /MVP 1\.4/);
  assert.match(sw, /ro-h5-shell-v19/);
}

testAutomaticUpdateStrategy();
testAssetManifestCoverage();
testSpriteFramesUsePinnedSourceAndHaveNoMissingReferences();
testCriticalEffectManifest();
testSoundEffectManifest();
testSoundEffectWiring();
testSkillTreeProgression();
testSkillCombatEffects();
testSkillPointsAndLegacySaveCompatibility();
testSkillTreeUiWiring();
testExpandedWorldContent();
testFirstJobPromotion();
testFirstJobCombatPassives();
testStatPointAllocation();
testNameRules();
testOfflineTimeCap();
testBattleAndRewards();
testPause();
testMapAndMonsterProgression();
testMonsterBestiaryProgression();
testBestiaryUiWiring();
testEquipmentCardMechanics();
testEquipmentCombatAndLegacyCompatibility();
testEquipmentDropAndSaveCompatibility();
testEquipmentUiWiring();
testEquipmentRefinementProgression();
testEquipmentRefinementCombatAndUi();
testCardExtractionTransactions();
testEquipmentSaleTransactions();
testExpandedEquipmentCatalogAndDrops();
testEquipmentDodgeAndZenyBonuses();
testCraftingMaterialsAndTransactions();
testConsumableUseAndUiWiring();

console.log('RO H5 core tests passed (33 suites).');