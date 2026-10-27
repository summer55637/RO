(() => {
  "use strict";
  const API = window.RO_GAME_API;
  if (!API) { console.error("RO pet system could not find the game API."); return; }
  const SAVE_KEY = "ro-offline-pets-v1";
  const SPECIES = {
    poring: { id:"poring", name:"波利", icon:"🩷", color:"#ef78a6", power:2, stat:"vit", blurb:"親人又可靠，帶來體力加成。", evolvedName:"天使波利", evolvedIcon:"😇", evolvedColor:"#f7e7ff", skillName:"神聖泡泡", skillMultiplier:3.1, skillCooldown:18, skillColor:"#ffe8ff" },
    drops: { id:"drops", name:"土波利", icon:"🟠", color:"#f0a35f", power:3, stat:"str", blurb:"活力十足，親密後提升攻擊。", evolvedName:"烈焰波利", evolvedIcon:"🔥", evolvedColor:"#ff8a56", skillName:"熔岩噴濺", skillMultiplier:3.45, skillCooldown:20, skillColor:"#ff9a57" },
    fabre: { id:"fabre", name:"綠棉蟲", icon:"🐛", color:"#79ca84", power:2, stat:"vit", blurb:"森林夥伴，偏向耐久輔助。", evolvedName:"翡翠甲蟲", evolvedIcon:"🪲", evolvedColor:"#a2e6a0", skillName:"森林守護", skillMultiplier:2.75, skillCooldown:16, skillColor:"#a5f4b0" },
    lunatic: { id:"lunatic", name:"瘋兔", icon:"🐰", color:"#c9b6e8", power:4, stat:"agi", blurb:"動作敏捷，支援攻擊較頻繁。", evolvedName:"月影瘋兔", evolvedIcon:"🌙", evolvedColor:"#d8d0ff", skillName:"月牙連斬", skillMultiplier:3.2, skillCooldown:17, skillColor:"#c6beff" },
    wolf: { id:"wolf", name:"森林狼", icon:"🐺", color:"#a7b2bd", power:5, stat:"str", blurb:"忠誠戰鬥夥伴，攻擊威力較高。", evolvedName:"銀月狼", evolvedIcon:"🐺", evolvedColor:"#dcecff", skillName:"銀月撕咬", skillMultiplier:3.6, skillCooldown:21, skillColor:"#cde8ff" },
    familiar: { id:"familiar", name:"吸血蝙蝠", icon:"🦇", color:"#a78bd5", power:4, stat:"int", blurb:"魔力支援夥伴，親密後提升 SP。", evolvedName:"暗夜蝠王", evolvedIcon:"🦇", evolvedColor:"#bfa4ff", skillName:"暗影脈衝", skillMultiplier:3.25, skillCooldown:19, skillColor:"#c7a3ff" },
    ghostring: { id:"ghostring", name:"幽靈波利", icon:"👻", color:"#9edee8", power:6, stat:"int", blurb:"稀有幽靈夥伴，支援能力更強。", evolvedName:"幻影幽靈波利", evolvedIcon:"👻", evolvedColor:"#c3fbff", skillName:"靈界震波", skillMultiplier:3.8, skillCooldown:22, skillColor:"#a7f2ff" }
  };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, Number.isFinite(Number(n)) ? Number(n) : min));
  const $ = (id) => document.getElementById(id);
  const make = (tag, className, text) => { const node=document.createElement(tag); if(className) node.className=className; if(text!=null) node.textContent=text; return node; };
  const defaults = () => ({ version:1, pets:[], activeId:null, starterGifted:false, lastFeedAt:0 });
  let profile = defaults();
  let uiReady = false;
  let selectedId = null;
  let lastUiRefresh = 0;

  function activePet() { return profile.pets.find((pet) => pet.id === profile.activeId) || null; }
  function speciesOf(pet) { return pet && SPECIES[pet.species] ? SPECIES[pet.species] : null; }
  function visualName(pet, species) { return pet && pet.evolved && species ? species.evolvedName : (pet ? pet.name : "寵物"); }
  function visualIcon(pet, species) {
    if (!pet || !species) return "🐾";
    if (pet.rare && pet.evolved) return "🌟";
    if (pet.evolved) return species.evolvedIcon || species.icon;
    if (pet.rare) return "✨";
    return species.icon;
  }
  function visualColor(pet, species) {
    if (!pet || !species) return "#9edee8";
    if (pet.rare && pet.evolved) return "#ffe78a";
    if (pet.evolved) return species.evolvedColor || species.color;
    if (pet.rare) return "#f6d77a";
    return species.color;
  }
  function canEvolve(pet) {
    return !!pet && !pet.evolved && pet.level >= 5 && pet.intimacy >= 70 && pet.totalFeeds >= 3;
  }
  function evolutionProgress(pet) {
    if (!pet) return "進化條件：Lv. 5、親密度 70、餵食 3 次";
    return "進化條件 " + (pet.level >= 5 ? "✓" : "Lv." + pet.level + "/5") +
      " · " + (pet.intimacy >= 70 ? "✓" : "親密 " + pet.intimacy + "/70") +
      " · " + (pet.totalFeeds >= 3 ? "✓" : "餵食 " + pet.totalFeeds + "/3");
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(profile)); }
    catch (error) { console.warn("Pet save failed.", error); }
  }
  function load() {
    try {
      const raw=localStorage.getItem(SAVE_KEY); if(!raw) return;
      const saved=JSON.parse(raw); if(!saved || typeof saved!=="object") return;
      const validPets=Array.isArray(saved.pets)?saved.pets.filter((pet)=>pet&&SPECIES[pet.species]).slice(0,6):[];
      profile=Object.assign(defaults(),saved,{pets:validPets});
      profile.pets=profile.pets.map((pet,i)=>({
        id:String(pet.id||(pet.species+"-"+i)).slice(0,80), species:pet.species,
        name:String(pet.name||SPECIES[pet.species].name).slice(0,30),
        level:Math.round(clamp(pet.level,1,10)), exp:Math.round(clamp(pet.exp,0,99999)),
        intimacy:Math.round(clamp(pet.intimacy,0,100)), attackCooldown:clamp(pet.attackCooldown,0,10),
        totalFeeds:Math.round(clamp(pet.totalFeeds,0,999999)), rare:pet.rare===true, evolved:pet.evolved===true,
        skillCooldown:clamp(pet.skillCooldown,0,120), caughtAt:Math.round(clamp(pet.caughtAt,0,9999999999999))
      }));
      if(!profile.pets.some((pet)=>pet.id===profile.activeId)) profile.activeId=profile.pets[0]?profile.pets[0].id:null;
      profile.starterGifted=saved.starterGifted===true;
    } catch(error) { console.warn("Pet save unavailable; using a new profile.",error); profile=defaults(); }
  }
  function addPetExp(pet,amount) {
    pet.exp+=amount;
    while(pet.level<10&&pet.exp>=pet.level*35){pet.exp-=pet.level*35;pet.level+=1;API.log("寵物「"+pet.name+"」升至 Lv. "+pet.level+"！","muted");}
    if(pet.level>=10) pet.exp=0;
  }
  function targetSummary() {
    const snapshot=API.getSnapshot();
    if(!snapshot.targetId) return null;
    return snapshot.monsters.find((monster)=>monster.id===snapshot.targetId&&monster.hp>0)||null;
  }
  function render() {
    if(!uiReady) return;
    const active=activePet(), target=targetSummary(), select=$("petSelect"), list=$("petCollection");
    const activeSpecies=speciesOf(active);
    if(!select||!list) return;
    $("petTargetLabel").textContent=target?(target.name+(target.boss?"（Boss 不可收服）":" · Lv. "+target.level)):"先點擊場上的魔物，再回來嘗試收服";
    select.replaceChildren();
    if(!profile.pets.length) select.append(make("option","","尚未收服寵物"));
    profile.pets.forEach((pet)=>{
      const species=speciesOf(pet), option=make("option","",(species?visualIcon(pet,species)+" ":"")+(pet.rare?"✦ ":"")+visualName(pet,species)+" · Lv."+pet.level+(pet.evolved?" · 進化":""));
      option.value=pet.id;
      if(pet.id===(selectedId||profile.activeId)) option.selected=true;
      select.append(option);
    });
    if(selectedId&&!profile.pets.some((pet)=>pet.id===selectedId)) selectedId=null;
    $("petActiveSummary").textContent=active
      ?visualIcon(active,activeSpecies)+" "+(active.rare?"✦ 稀有個體 · ":"")+visualName(active,activeSpecies)+" · Lv. "+active.level+" · 親密度 "+active.intimacy+"/100"+(active.evolved?" · 已進化":"")
      :"尚未召喚夥伴。收服一隻魔物就能開始培養。";
    const skillReady=!!active&&active.skillCooldown<=0&&!!target&&API.getSnapshot().mapType!=="town";
    $("petEvolutionStatus").textContent=active?(active.evolved?"✦ 已進化為 "+activeSpecies.evolvedName:evolutionProgress(active)):"進化條件：Lv. 5、親密度 70、餵食 3 次";
    $("petSkillStatus").textContent=active?("專屬技能："+activeSpecies.skillName+" · "+(active.skillCooldown>0?Math.ceil(active.skillCooldown)+" 秒後可用":"可施放")+(active.rare?" · 稀有傷害加成":"")):"收服寵物後解鎖專屬技能。";
    $("petEvolveButton").disabled=!canEvolve(active);
    $("petEvolveButton").textContent=active&&active.evolved?"✦ 已完成進化":(canEvolve(active)?"🌟 消耗營養餅進化":"🌟 尚未達成進化條件");
    $("petSkillButton").disabled=!skillReady;
    $("petSkillButton").textContent=active?("⚡ "+activeSpecies.skillName+(active.skillCooldown>0?" · CD":"")):"⚡ 專屬技能";
    const hasTreat=API.getInventory().some((item)=>item.id==="pet-treat"&&item.qty>0);
    const hasSnack=API.getInventory().some((item)=>item.id==="pet-snack"&&item.qty>0);
    $("petCaptureButton").disabled=!target||target.boss||!SPECIES[target.type]||!hasTreat||profile.pets.length>=6;
    $("petCaptureButton").textContent=profile.pets.length>=6?"收藏已滿（最多 6 隻）":"🍬 使用捕捉零食";
    $("petFeedButton").disabled=!active||!hasSnack;
    $("petSummonButton").disabled=!active&&!profile.pets.length;
    $("petSummonButton").textContent=active?"↔ 解除召喚":"✦ 召喚選取寵物";
    $("petCollectionCount").textContent=profile.pets.length+" / 6";
    list.replaceChildren();
    if(!profile.pets.length) {
      list.append(make("div","pet-empty","還沒有寵物。先點擊場上的波利、土波利、綠棉蟲、瘋兔或森林狼，再使用捕捉零食。"));
    } else {
      profile.pets.forEach((pet)=>{
        const species=speciesOf(pet), card=make("article","pet-card"+(pet.id===profile.activeId?" active":"")+(pet.evolved?" evolved":"")+(pet.rare?" rare":""));
        const portrait=make("div","pet-portrait",visualIcon(pet,species)); portrait.style.setProperty("--pet-color",visualColor(pet,species));
        const copy=make("div","pet-card-copy"); copy.append(make("strong","",(pet.rare?"✦ 稀有 · ":"")+visualName(pet,species)+" · Lv. "+pet.level));
        copy.append(make("small","",species.blurb+(pet.evolved?" · 進化外觀":"")));
        const meter=make("div","pet-meter"), fill=make("span"); fill.style.width=pet.intimacy+"%"; meter.append(fill);
        copy.append(meter,make("small","","親密度 "+pet.intimacy+"/100 · EXP "+pet.exp+"/"+(pet.level*35)));
        copy.append(make("small","pet-evolution-card-status",pet.evolved?"✦ 已進化 · "+species.skillName:evolutionProgress(pet)));
        const choose=make("button","mini-button",pet.id===profile.activeId?"跟隨中":"選取"); choose.type="button";
        choose.addEventListener("click",()=>{selectedId=pet.id;profile.activeId=pet.id;API.log("召喚了「"+pet.name+"」，牠開始跟隨你。","muted");render();save();});
        card.append(portrait,copy,choose); list.append(card);
      });
    }
  }
  function buyItem(itemId,cost,label) {
    if(!API.spendGold(cost)){API.log("Zeny 不足，需要 "+cost+" Zeny 才能購買"+label+"。","muted");render();return;}
    API.addItem(itemId,1); API.log("購買了"+label+"。","muted");render();
  }
  function captureTarget() {
    const target=targetSummary();
    if(!target)return API.log("請先點擊場上的魔物，選取想收服的目標。","muted");
    if(target.boss||!SPECIES[target.type])return API.log("這種魔物目前無法收服；MVP Boss 不可捕捉。","muted");
    if(profile.pets.length>=6)return API.log("寵物收藏已滿，最多可收服 6 隻。","muted");
    if(!API.removeItem("pet-treat",1))return API.log("沒有捕捉零食了，先購買一份捕捉零食。","muted");
    const player=API.getSnapshot().player, levelGap=target.level-player.level;
    const woundedBonus=target.hp<=target.maxHp*0.55?0.17:0;
    const chance=clamp(0.62-levelGap*0.035+woundedBonus,0.15,0.82);
    if(Math.random()>chance){API.log("「"+target.name+"」掙脫了捕捉零食的引誘。再試一次，或先把牠的 HP 降低。","muted");render();save();return;}
    const species=SPECIES[target.type], rare=Math.random()<(target.type==="ghostring"?0.18:0.07);
    const pet={id:target.type+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6),species:target.type,name:species.name,level:1,exp:0,intimacy:22,attackCooldown:0,skillCooldown:0,totalFeeds:0,rare:rare,evolved:false,caughtAt:Date.now()};
    profile.pets.push(pet); selectedId=pet.id; if(!profile.activeId)profile.activeId=pet.id;
    API.log("成功收服「"+(rare?"稀有個體 ":"")+pet.name+"」！牠已加入寵物收藏。"+(rare?"外觀閃耀金光，戰鬥能力也更強。":""),"muted");render();save();
  }
  function feedPet() {
    const pet=activePet(); if(!pet)return API.log("請先收服並召喚一隻寵物。","muted");
    if(!API.removeItem("pet-snack",1))return API.log("寵物營養餅不足，請先購買補給。","muted");
    const beforeLevel=pet.level; pet.intimacy=Math.min(100,pet.intimacy+12); pet.totalFeeds+=1;
    addPetExp(pet,18); profile.lastFeedAt=Date.now();
    API.log("餵食成功！「"+pet.name+"」的親密度提升，獲得 18 寵物 EXP。","muted");
    if(pet.level>beforeLevel)API.log("親密夥伴變得更強了！","muted");
    render();save();
  }
  function evolvePet() {
    const pet=activePet(), species=speciesOf(pet);
    if(!pet||!species)return API.log("請先收服並召喚一隻寵物。","muted");
    if(pet.evolved)return API.log("「"+visualName(pet,species)+"」已完成進化。","muted");
    if(!canEvolve(pet))return API.log("進化條件尚未完成："+evolutionProgress(pet)+"。","muted");
    if(!API.removeItem("pet-snack",1))return API.log("進化需要 1 份寵物營養餅。","muted");
    pet.evolved=true;pet.name=species.evolvedName;pet.skillCooldown=0;
    API.log("進化成功！「"+species.name+"」進化為「"+species.evolvedName+"」，外觀與專屬技能已強化！","muted");
    window.dispatchEvent(new CustomEvent("ro:pet-evolved",{detail:{petId:pet.id,species:pet.species,rare:pet.rare===true}}));
    render();save();
  }
  function usePetSkill(silent) {
    const pet=activePet(), species=speciesOf(pet), target=targetSummary(), snapshot=API.getSnapshot();
    if(!pet||!species||!target)return false;
    if(snapshot.mapType==="town"||target.hp<=0||Math.hypot(target.x-snapshot.player.x,target.y-snapshot.player.y)>155)return false;
    if(target.boss&&snapshot.player.level<8)return false;
    if(pet.skillCooldown>0)return false;
    const base=Math.max(1,Math.floor(species.power+pet.level*1.45+pet.intimacy/28));
    const damage=Math.max(1,Math.floor(base*species.skillMultiplier*(pet.rare?1.22:1)*(pet.evolved?1.18:1)));
    pet.skillCooldown=species.skillCooldown;pet.attackCooldown=Math.max(pet.attackCooldown,0.9);
    if(!API.petAttack(target.id,damage,visualName(pet,species)+"·"+species.skillName)){pet.skillCooldown=0;return false;}
    window.dispatchEvent(new CustomEvent("ro:pet-skill",{detail:{petId:pet.id,species:pet.species,name:species.skillName,x:target.x,y:target.y,damage:damage,color:pet.evolved?species.evolvedColor:species.skillColor,rare:pet.rare===true}}));
    if(!silent)API.log("「"+visualName(pet,species)+"」施放專屬技能「"+species.skillName+"」，造成 "+damage+" 傷害！","muted");
    render();save();return true;
  }
  function toggleSummon() {
    const selected=profile.pets.find((pet)=>pet.id===$("petSelect").value)||activePet()||profile.pets[0];
    if(!selected)return API.log("目前沒有可召喚的寵物。","muted");
    if(profile.activeId===selected.id){profile.activeId=null;API.log("寵物暫時回到收藏中。","muted");}
    else{profile.activeId=selected.id;selectedId=selected.id;API.log("「"+selected.name+"」出發跟隨你！","muted");}
    render();save();
  }
  function mountUI() {
    const anchor=document.querySelector(".log-panel"); if(!anchor||document.querySelector(".pet-panel"))return;
    const panel=make("section","panel pet-panel");
    panel.innerHTML='<div class="panel-title"><h2>寵物與夥伴</h2><span class="panel-subtitle">TAME · BOND · FIGHT</span></div>'+
      '<p class="expansion-lead">先點擊場上的可收服魔物，使用捕捉零食試著收服。召喚後會跟隨你，並在目標靠近時自動協助攻擊。</p>'+
      '<div class="pet-active-summary" id="petActiveSummary">尚未召喚夥伴。</div>'+
      '<div class="expansion-block"><div class="expansion-block-title"><span>捕捉目標</span><span class="expansion-tag">最多 6 隻</span></div>'+
      '<div class="pet-target-label" id="petTargetLabel">先點擊場上的魔物，再回來嘗試收服</div><div class="pet-action-row">'+
      '<button type="button" class="mini-button primary" id="petCaptureButton">🍬 使用捕捉零食</button><button type="button" class="mini-button" id="petBuyTameButton">購買捕捉零食 · 90 Zeny</button></div></div>'+
      '<div class="expansion-block"><div class="expansion-block-title"><span>照顧與召喚</span><span class="expansion-tag">親密 / 等級</span></div>'+
      '<label class="pet-select-label" for="petSelect">選擇寵物</label><select id="petSelect" class="pet-select" aria-label="選擇寵物"></select>'+
      '<div class="pet-action-row"><button type="button" class="mini-button primary" id="petFeedButton">🍪 餵食營養餅</button><button type="button" class="mini-button" id="petBuyFoodButton">購買營養餅 · 45 Zeny</button><button type="button" class="mini-button" id="petSummonButton">✦ 召喚寵物</button></div>'+
      '<div class="pet-evolution-status" id="petEvolutionStatus">進化條件：Lv. 5、親密度 70、餵食 3 次</div><div class="pet-action-row"><button type="button" class="mini-button primary" id="petEvolveButton" disabled>🌟 尚未達成進化條件</button></div>'+
      '<div class="pet-skill-status" id="petSkillStatus">收服寵物後解鎖專屬技能。</div><div class="pet-action-row"><button type="button" class="mini-button primary" id="petSkillButton" disabled>⚡ 專屬技能</button></div></div>'+
      '<div class="expansion-block"><div class="expansion-block-title"><span>寵物收藏</span><span class="expansion-tag" id="petCollectionCount">0 / 6</span></div><div class="pet-collection" id="petCollection"></div></div>'+
      '<p class="expansion-notice">進化條件：寵物 Lv. 5、親密度 70、餵食至少 3 次，再消耗 1 份營養餅。稀有個體有閃光外觀與傷害加成；各物種擁有可手動施放、也會自動觸發的專屬技能。最高 Lv. 10，資料儲存在本機瀏覽器。</p>';
    anchor.parentNode.insertBefore(panel,anchor);uiReady=true;
    $("petCaptureButton").addEventListener("click",captureTarget);
    $("petBuyTameButton").addEventListener("click",()=>buyItem("pet-treat",90,"捕捉零食"));
    $("petBuyFoodButton").addEventListener("click",()=>buyItem("pet-snack",45,"寵物營養餅"));
    $("petFeedButton").addEventListener("click",feedPet); $("petSummonButton").addEventListener("click",toggleSummon);
    $("petEvolveButton").addEventListener("click",evolvePet); $("petSkillButton").addEventListener("click",()=>usePetSkill(false));
    $("petSelect").addEventListener("change",()=>{selectedId=$("petSelect").value;render();});
    render();
  }
  function grantStarterKit() {
    if(profile.starterGifted)return;
    API.addItem("pet-treat",1); API.addItem("pet-snack",1); profile.starterGifted=true;
    API.log("新手寵物補給已送達：捕捉零食 ×1、寵物營養餅 ×1。","muted");save();
  }
  function onKill(event) {
    const pet=activePet(), monster=event&&event.detail&&event.detail.monster;if(!pet||!monster)return;
    addPetExp(pet,Math.max(2,Math.min(12,Math.floor((Number(monster.exp)||10)/18))));
    if(Math.random()<0.16)pet.intimacy=Math.min(100,pet.intimacy+1);
    render();save();
  }
  function tick(dt) {
    const pet=activePet();if(!pet)return;
    const step=Math.max(0,Math.min(dt||0,0.1));
    pet.attackCooldown=Math.max(0,pet.attackCooldown-step);pet.skillCooldown=Math.max(0,(pet.skillCooldown||0)-step);
    const snapshot=API.getSnapshot();if(snapshot.mapType==="town"||!snapshot.targetId||snapshot.player.hp<=0)return;
    const target=snapshot.monsters.find((monster)=>monster.id===snapshot.targetId&&monster.hp>0);
    if(!target||(target.boss&&snapshot.player.level<8)||Math.hypot(target.x-snapshot.player.x,target.y-snapshot.player.y)>155||pet.attackCooldown>0)return;
    if(pet.skillCooldown<=0&&usePetSkill(true))return;
    const species=speciesOf(pet),damage=Math.max(1,Math.floor((species.power+pet.level*1.45+pet.intimacy/28)*(pet.rare?1.2:1)*(pet.evolved?1.12:1)));
    pet.attackCooldown=Math.max(0.85,2.65-pet.level*0.11);API.petAttack(target.id,damage,visualName(pet,species));
  }
  function bonuses() {
    const pet=activePet(),species=speciesOf(pet);if(!pet||!species)return null;
    const stats={};if(pet.level>=4||pet.intimacy>=70)stats[species.stat]=pet.intimacy>=70?2:1;
    return {attack:Math.floor(pet.level/4)+(pet.intimacy>=85?2:0)+(pet.evolved?2:0)+(pet.rare?1:0),hpBonus:pet.intimacy>=55?10+(pet.evolved?15:0)+(pet.rare?8:0):0,spBonus:species.stat==="int"&&pet.intimacy>=55?8+(pet.evolved?8:0):0,stats:stats};
  }
  function getActive() {const pet=activePet(),species=speciesOf(pet);return pet&&species?Object.assign({},pet,species,{name:visualName(pet,species),icon:visualIcon(pet,species),color:visualColor(pet,species),rare:pet.rare===true,evolved:pet.evolved===true,baseName:species.name,skillName:species.skillName}):null;}
  load(); mountUI(); grantStarterKit();
  window.RO_PETS={species:SPECIES,getActive:getActive,getPets:()=>profile.pets.map((pet)=>Object.assign({},pet)),bonuses:bonuses,tick:tick,save:save,refresh:render};
  window.addEventListener("ro:monster-killed",onKill);
  window.addEventListener("ro:level-up",render);window.addEventListener("ro:map-change",render);window.addEventListener("ro:target-change",render);
  window.addEventListener("ro:pet-attack",()=>{if(performance.now()-lastUiRefresh>300){render();lastUiRefresh=performance.now();}});
  window.addEventListener("ro:pet-skill",()=>{render();save();});
  window.addEventListener("ro:pet-evolved",()=>{render();save();});
  window.addEventListener("pagehide",save);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")save();});
  let previous=0;function loop(now){const dt=previous?Math.min(0.05,(now-previous)/1000):0;previous=now;tick(dt);requestAnimationFrame(loop);}
  requestAnimationFrame(loop);
})();