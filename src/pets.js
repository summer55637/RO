(() => {
  "use strict";
  const API = window.RO_GAME_API;
  if (!API) { console.error("RO pet system could not find the game API."); return; }
  const SAVE_KEY = "ro-offline-pets-v1";
  const SPECIES = {
    poring: { id:"poring", name:"波利", icon:"🩷", color:"#ef78a6", power:2, stat:"vit", blurb:"親人又可靠，帶來體力加成。" },
    drops: { id:"drops", name:"土波利", icon:"🟠", color:"#f0a35f", power:3, stat:"str", blurb:"活力十足，親密後提升攻擊。" },
    fabre: { id:"fabre", name:"綠棉蟲", icon:"🐛", color:"#79ca84", power:2, stat:"vit", blurb:"森林夥伴，偏向耐久輔助。" },
    lunatic: { id:"lunatic", name:"瘋兔", icon:"🐰", color:"#c9b6e8", power:4, stat:"agi", blurb:"動作敏捷，支援攻擊較頻繁。" },
    wolf: { id:"wolf", name:"森林狼", icon:"🐺", color:"#a7b2bd", power:5, stat:"str", blurb:"忠誠戰鬥夥伴，攻擊威力較高。" },
    familiar: { id:"familiar", name:"吸血蝙蝠", icon:"🦇", color:"#a78bd5", power:4, stat:"int", blurb:"魔力支援夥伴，親密後提升 SP。" },
    ghostring: { id:"ghostring", name:"幽靈波利", icon:"👻", color:"#9edee8", power:6, stat:"int", blurb:"稀有幽靈夥伴，支援能力更強。" }
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
        totalFeeds:Math.round(clamp(pet.totalFeeds,0,999999)), caughtAt:Math.round(clamp(pet.caughtAt,0,9999999999999))
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
    if(!select||!list) return;
    $("petTargetLabel").textContent=target?(target.name+(target.boss?"（Boss 不可收服）":" · Lv. "+target.level)):"先點擊場上的魔物，再回來嘗試收服";
    select.replaceChildren();
    if(!profile.pets.length) select.append(make("option","","尚未收服寵物"));
    profile.pets.forEach((pet)=>{
      const species=speciesOf(pet), option=make("option","",(species?species.icon+" ":"")+pet.name+" · Lv."+pet.level);
      option.value=pet.id;
      if(pet.id===(selectedId||profile.activeId)) option.selected=true;
      select.append(option);
    });
    if(selectedId&&!profile.pets.some((pet)=>pet.id===selectedId)) selectedId=null;
    $("petActiveSummary").textContent=active
      ?speciesOf(active).icon+" "+active.name+" · Lv. "+active.level+" · 親密度 "+active.intimacy+"/100"
      :"尚未召喚夥伴。收服一隻魔物就能開始培養。";
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
        const species=speciesOf(pet), card=make("article","pet-card"+(pet.id===profile.activeId?" active":""));
        const portrait=make("div","pet-portrait",species.icon); portrait.style.setProperty("--pet-color",species.color);
        const copy=make("div","pet-card-copy"); copy.append(make("strong","",pet.name+" · Lv. "+pet.level));
        copy.append(make("small","",species.blurb));
        const meter=make("div","pet-meter"), fill=make("span"); fill.style.width=pet.intimacy+"%"; meter.append(fill);
        copy.append(meter,make("small","","親密度 "+pet.intimacy+"/100 · EXP "+pet.exp+"/"+(pet.level*35)));
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
    const species=SPECIES[target.type], pet={id:target.type+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6),species:target.type,name:species.name,level:1,exp:0,intimacy:22,attackCooldown:0,totalFeeds:0,caughtAt:Date.now()};
    profile.pets.push(pet); selectedId=pet.id; if(!profile.activeId)profile.activeId=pet.id;
    API.log("成功收服「"+pet.name+"」！牠已加入寵物收藏。","muted");render();save();
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
      '<div class="pet-action-row"><button type="button" class="mini-button primary" id="petFeedButton">🍪 餵食營養餅</button><button type="button" class="mini-button" id="petBuyFoodButton">購買營養餅 · 45 Zeny</button><button type="button" class="mini-button" id="petSummonButton">✦ 召喚寵物</button></div></div>'+
      '<div class="expansion-block"><div class="expansion-block-title"><span>寵物收藏</span><span class="expansion-tag" id="petCollectionCount">0 / 6</span></div><div class="pet-collection" id="petCollection"></div></div>'+
      '<p class="expansion-notice">親密度越高，夥伴提供的能力加成越好；餵食與戰鬥會累積寵物經驗，最高 Lv. 10。寵物資料儲存在本機瀏覽器。</p>';
    anchor.parentNode.insertBefore(panel,anchor);uiReady=true;
    $("petCaptureButton").addEventListener("click",captureTarget);
    $("petBuyTameButton").addEventListener("click",()=>buyItem("pet-treat",90,"捕捉零食"));
    $("petBuyFoodButton").addEventListener("click",()=>buyItem("pet-snack",45,"寵物營養餅"));
    $("petFeedButton").addEventListener("click",feedPet); $("petSummonButton").addEventListener("click",toggleSummon);
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
    pet.attackCooldown=Math.max(0,pet.attackCooldown-Math.max(0,Math.min(dt||0,0.1)));
    const snapshot=API.getSnapshot();if(snapshot.mapType==="town"||!snapshot.targetId||snapshot.player.hp<=0)return;
    const target=snapshot.monsters.find((monster)=>monster.id===snapshot.targetId&&monster.hp>0);
    if(!target||(target.boss&&snapshot.player.level<8)||Math.hypot(target.x-snapshot.player.x,target.y-snapshot.player.y)>155||pet.attackCooldown>0)return;
    const species=speciesOf(pet),damage=Math.max(1,Math.floor(species.power+pet.level*1.45+pet.intimacy/28));
    pet.attackCooldown=Math.max(0.85,2.65-pet.level*0.11);API.petAttack(target.id,damage,pet.name);
  }
  function bonuses() {
    const pet=activePet(),species=speciesOf(pet);if(!pet||!species)return null;
    const stats={};if(pet.level>=4||pet.intimacy>=70)stats[species.stat]=pet.intimacy>=70?2:1;
    return {attack:Math.floor(pet.level/4)+(pet.intimacy>=85?2:0),hpBonus:pet.intimacy>=55?10:0,spBonus:species.stat==="int"&&pet.intimacy>=55?8:0,stats:stats};
  }
  function getActive() {const pet=activePet(),species=speciesOf(pet);return pet&&species?Object.assign({},pet,species):null;}
  load(); mountUI(); grantStarterKit();
  window.RO_PETS={species:SPECIES,getActive:getActive,getPets:()=>profile.pets.map((pet)=>Object.assign({},pet)),bonuses:bonuses,tick:tick,save:save};
  window.addEventListener("ro:monster-killed",onKill);
  window.addEventListener("ro:level-up",render);window.addEventListener("ro:map-change",render);
  window.addEventListener("ro:pet-attack",()=>{if(performance.now()-lastUiRefresh>300){render();lastUiRefresh=performance.now();}});
  window.addEventListener("pagehide",save);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")save();});
  let previous=0;function loop(now){const dt=previous?Math.min(0.05,(now-previous)/1000):0;previous=now;tick(dt);requestAnimationFrame(loop);}
  requestAnimationFrame(loop);
})();