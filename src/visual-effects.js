(() => {
  "use strict";
  const API = window.RO_GAME_API;
  if (!API) { console.error("RO visual effects could not find the game API."); return; }
  const WORLD_W = 960, WORLD_H = 600;
  const rand = (min,max) => min + Math.random() * (max-min);
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  const frame = document.querySelector(".game-frame");
  const gameCanvas = document.getElementById("game");
  if (!frame || !gameCanvas) return;
  const overlay = document.createElement("canvas");
  overlay.className = "game-visual-overlay";
  overlay.setAttribute("aria-hidden","true");
  overlay.width = gameCanvas.width; overlay.height = gameCanvas.height;
  const hint = frame.querySelector(".canvas-hint");
  if (hint) frame.insertBefore(overlay,hint); else frame.append(overlay);
  const ctx = overlay.getContext("2d");
  let width = 0, height = 0, dpr = 1, lastMap = "";
  let playerHitAt = 0;
  const effects = [];
  const particles = Array.from({length:52},(_,i)=>({
    x:rand(20,WORLD_W-20),y:rand(20,WORLD_H-20),size:rand(1,2.6),
    speed:rand(5,18),phase:rand(0,Math.PI*2),drift:rand(-7,7),seed:i
  }));
  function resize() {
    const box = frame.getBoundingClientRect();
    const nextDpr = Math.min(2,window.devicePixelRatio||1);
    if (Math.abs(width-box.width)<0.5 && Math.abs(height-box.height)<0.5 && dpr===nextDpr) return;
    width=box.width;height=box.height;dpr=nextDpr;
    overlay.width=Math.max(1,Math.round(width*dpr));
    overlay.height=Math.max(1,Math.round(height*dpr));
    overlay.style.width="100%";overlay.style.height="100%";
  }
  function snapshot() { try { return API.getSnapshot(); } catch (_) { return null; } }
  function addEffect(type,x,y,color,duration,detail) {
    effects.push({type:type,x:clamp(Number(x)||0,0,WORLD_W),y:clamp(Number(y)||0,0,WORLD_H),
      color:color||"#fff0bd",start:performance.now(),duration:duration||420,detail:detail||null});
    while(effects.length>70)effects.shift();
  }
  function targetPoint() {
    const s=snapshot();if(!s||!s.targetId)return null;
    const m=s.monsters.find((item)=>item.id===s.targetId&&item.hp>0);
    return m?{x:m.x,y:m.y-8}:null;
  }
  function onAttack() { const p=targetPoint();if(p)addEffect("slash",p.x,p.y,"#fff0a6",330); }
  window.addEventListener("ro:attack",onAttack);
  window.addEventListener("ro:monster-hurt",(event)=>{
    const d=event.detail||{};addEffect("impact",d.x,d.y,d.damage>25?"#fff1a5":"#ffd7e4",400,d.damage);
  });
  window.addEventListener("ro:player-hurt",()=>{
    playerHitAt=performance.now();const s=snapshot();
    if(s)addEffect("player-hit",s.player.x,s.player.y-8,"#ff7d8a",380);
  });
  window.addEventListener("ro:pet-attack",(event)=>{
    const d=event.detail||{};addEffect("pet-burst",d.x,d.y-6,"#a9e8ff",520,d);
  });
  window.addEventListener("ro:pet-skill",(event)=>{
    const d=event.detail||{};addEffect("pet-skill",d.x,d.y-8,d.color||"#c8b4ff",700,d);
  });
  window.addEventListener("ro:pet-evolved",(event)=>{
    const d=event.detail||{},s=snapshot(),pet=window.RO_PETS&&window.RO_PETS.getActive?window.RO_PETS.getActive():null;
    if(s&&pet)addEffect("pet-skill",s.player.x-30,s.player.y-8,pet.color||"#ffe78a",850,{name:"進化成功！",petName:pet.name,rare:d.rare});
  });
  window.addEventListener("ro:monster-killed",(event)=>{
    const id=event.detail&&event.detail.monster&&event.detail.monster.id;
    const s=snapshot(),m=s&&s.monsters.find((item)=>item.id===id);
    if(m)addEffect("death",m.x,m.y,"#ffe59a",650);
  });
  window.addEventListener("ro:level-up",()=>{
    const s=snapshot();if(s)addEffect("level",s.player.x,s.player.y,"#ffef9f",1000);
  });
  window.addEventListener("ro:map-change",()=>{lastMap="";});
  function drawParticles(s,now,dt) {
    const mode=s.mapType;
    particles.forEach((p)=>{
      p.y-=p.speed*dt;
      p.x+=Math.sin(now/1000+p.phase)*p.drift*dt;
      if(p.y<8){p.y=WORLD_H-rand(8,50);p.x=rand(15,WORLD_W-15);}
      if(p.x<4)p.x=WORLD_W-4;if(p.x>WORLD_W-4)p.x=4;
      const pulse=.22+.33*(.5+.5*Math.sin(now/550+p.phase));
      ctx.globalAlpha=pulse;
      if(mode==="cave"){
        ctx.fillStyle=p.seed%3===0?"#b3a0ff":"#7ce5ff";
        ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8;
        ctx.beginPath();ctx.arc(p.x,p.y,p.size*.75,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      }else if(mode==="town"){
        ctx.fillStyle="#ffe8a6";
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(now/1200+p.phase);
        ctx.fillRect(-p.size*1.6,-.6,p.size*3.2,1.2);ctx.fillRect(-.6,-p.size*1.6,1.2,p.size*3.2);ctx.restore();
      }else if(mode==="forest"){
        ctx.fillStyle=p.seed%4===0?"#f0e99a":"#b5f0b2";
        ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
      }else{
        ctx.fillStyle=p.seed%3===0?"#fff0b2":"#b8e9c0";
        ctx.beginPath();ctx.ellipse(p.x,p.y,p.size*1.25,p.size*.65,Math.sin(now/700+p.phase),0,Math.PI*2);ctx.fill();
      }
    });
    ctx.globalAlpha=1;
  }
  function drawPet(s,now) {
    const pet=window.RO_PETS&&typeof window.RO_PETS.getActive==="function"?window.RO_PETS.getActive():null;
    if(!pet)return;
    const px=s.player.x-29+Math.sin(now/210)*2;
    const py=s.player.y+7+Math.sin(now/95)*2;
    ctx.save();
    ctx.globalAlpha=.32;ctx.fillStyle="#152018";ctx.beginPath();ctx.ellipse(px,py+9,13,5,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;ctx.translate(px,py);
    const pulse=.5+.5*Math.sin(now/180);
    ctx.strokeStyle=pet.rare?"rgba(255,226,126,.95)":pet.intimacy>=70?"rgba(255,224,142,.7)":"rgba(167,226,255,.42)";
    ctx.lineWidth=pet.evolved?2.3:1.5;ctx.beginPath();ctx.ellipse(0,1,15+pulse*2,14+pulse,0,0,Math.PI*2);ctx.stroke();
    ctx.shadowColor=pet.color;ctx.shadowBlur=pet.intimacy>=70?15:8;
    ctx.fillStyle=pet.color;
    if(pet.species==="lunatic"){ctx.beginPath();ctx.ellipse(-6,-11,4,9,-.2,0,Math.PI*2);ctx.ellipse(6,-11,4,9,.2,0,Math.PI*2);ctx.fill();}
    if(pet.species==="wolf"){ctx.beginPath();ctx.moveTo(-10,-3);ctx.lineTo(-13,-10);ctx.lineTo(-4,-7);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(10,-3);ctx.lineTo(13,-10);ctx.lineTo(4,-7);ctx.closePath();ctx.fill();}
    if(pet.species==="familiar"){ctx.beginPath();ctx.ellipse(-12,-1,6,8,Math.sin(now/90)*.22,0,Math.PI*2);ctx.ellipse(12,-1,6,8,-Math.sin(now/90)*.22,0,Math.PI*2);ctx.fill();}
    if(pet.evolved){ctx.fillRect(-13,-4,4,9);ctx.fillRect(9,-4,4,9);ctx.fillRect(-7,-12,14,3);ctx.fillRect(-4,-16,8,4);}
    if(pet.rare){ctx.fillStyle="#ffe78a";ctx.fillRect(-15,-14,4,4);ctx.fillRect(11,-17,4,4);ctx.fillRect(0,-20,4,4);}
    ctx.beginPath();ctx.ellipse(0,0,11,10,0,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle="rgba(255,255,255,.6)";ctx.beginPath();ctx.ellipse(-4,-4,4,2.8,-.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#26313c";ctx.beginPath();ctx.arc(-4,0,1.8,0,Math.PI*2);ctx.arc(4,0,1.8,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,.75)";ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,3,3,.2,Math.PI-.2);ctx.stroke();
    if(pet.intimacy>=80){ctx.fillStyle="#ffe69a";ctx.font="bold 12px sans-serif";ctx.textAlign="center";ctx.fillText("✦",0,-18-pulse*3);}
    ctx.restore();
  }
  function drawEffects(now) {
    for(let i=effects.length-1;i>=0;i--){
      const e=effects[i],t=(now-e.start)/e.duration;
      if(t>=1){effects.splice(i,1);continue;}
      const alpha=1-t;
      ctx.save();ctx.globalAlpha=alpha;ctx.lineCap="round";
      if(e.type==="slash"){
        ctx.strokeStyle=e.color;ctx.lineWidth=4.5*(1-t*.5);ctx.shadowColor=e.color;ctx.shadowBlur=14;
        ctx.beginPath();ctx.arc(e.x,e.y,14+t*22,-1.3+t*.9,1.05+t*.9);ctx.stroke();
        ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(e.x-2,e.y+1,19+t*16,-1.1+t*.6,.35+t*.6);ctx.stroke();
        for(let k=0;k<5;k++){const a=k*1.1+t*3;ctx.fillStyle=k%2?"#fff0ad":e.color;ctx.beginPath();ctx.arc(e.x+Math.cos(a)*(8+t*31),e.y+Math.sin(a)*(7+t*22),2.4*(1-t)+.3,0,Math.PI*2);ctx.fill();}
      }else if(e.type==="impact"||e.type==="pet-burst"||e.type==="pet-skill"||e.type==="death"||e.type==="level"){
        const r=8+t*(e.type==="level"?56:e.type==="pet-skill"?48:39);
        ctx.strokeStyle=e.color;ctx.lineWidth=(e.type==="death"||e.type==="pet-skill")?3:2.5;ctx.shadowColor=e.color;ctx.shadowBlur=e.type==="pet-skill"?18:12;
        ctx.beginPath();ctx.ellipse(e.x,e.y,r,r*.7,0,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.ellipse(e.x,e.y,r*.65,r*.9,now/500,0,Math.PI*2);ctx.stroke();
        ctx.shadowBlur=0;
        const count=(e.type==="death"||e.type==="pet-skill")?12:7;
        for(let k=0;k<count;k++){const a=k*Math.PI*2/count+t*2;const rr=6+t*((e.type==="death"||e.type==="pet-skill")?51:35);const size=(e.type==="level"||e.type==="pet-skill"?3:2.2)*(1-t);
          ctx.fillStyle=k%2?"#fff4ca":e.color;
          if(e.type==="pet-skill"){ctx.save();ctx.translate(e.x+Math.cos(a)*rr,e.y+Math.sin(a)*rr*.7);ctx.rotate(a+t*3);ctx.fillRect(-Math.max(.4,size),-Math.max(.4,size),Math.max(.8,size*2),Math.max(.8,size*2));ctx.restore();}
          else{ctx.beginPath();ctx.arc(e.x+Math.cos(a)*rr,e.y+Math.sin(a)*rr*.7,Math.max(.4,size),0,Math.PI*2);ctx.fill();}}
        if((e.type==="pet-burst"||e.type==="pet-skill")&&t<.72){ctx.fillStyle=e.type==="pet-skill"?"#fff0bf":"#d9f5ff";ctx.font="bold 12px sans-serif";ctx.textAlign="center";const label=e.detail&&(e.detail.name||e.detail.petName);ctx.fillText((e.type==="pet-skill"?"✦ ":"")+((label)||"夥伴"),e.x,e.y-27-t*16);}
        if(e.type==="level"){ctx.fillStyle="#fff1b4";ctx.font="bold 18px sans-serif";ctx.textAlign="center";ctx.fillText("LEVEL UP!",e.x,e.y-27-t*24);}
      }else if(e.type==="player-hit"){
        ctx.strokeStyle="#ff8c94";ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(e.x,e.y,10+t*28,0,Math.PI*2);ctx.stroke();
        for(let k=0;k<7;k++){const a=k*Math.PI*2/7+t*3;ctx.fillStyle="#ffc0c4";ctx.fillRect(e.x+Math.cos(a)*(8+t*24),e.y+Math.sin(a)*(7+t*22),3,3);}
      }
      ctx.restore();
    }
  }
  function render(now) {
    resize();
    const s=snapshot();
    if(!s){requestAnimationFrame(render);return;}
    const box=frame.getBoundingClientRect();
    const scale=Math.min(box.width/WORLD_W,box.height/WORLD_H);
    const ox=(box.width-WORLD_W*scale)/2,oy=(box.height-WORLD_H*scale)/2;
    const dt=Math.min(.05,Math.max(0,(now-(render.previous||now))/1000));render.previous=now;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
    drawParticles(s,now,dt);drawPet(s,now);drawEffects(now);
    const hit=Math.max(0,1-(now-playerHitAt)/420);
    if(hit>0){ctx.globalAlpha=hit*.09;ctx.fillStyle="#ff3548";ctx.fillRect(0,0,WORLD_W,WORLD_H);ctx.globalAlpha=1;}
    if(s.mapType==="cave"){
      const gradient=ctx.createRadialGradient(WORLD_W/2,WORLD_H/2,110,WORLD_W/2,WORLD_H/2,560);
      gradient.addColorStop(0,"rgba(20,25,43,0)");gradient.addColorStop(1,"rgba(9,12,25,.22)");
      ctx.fillStyle=gradient;ctx.fillRect(0,0,WORLD_W,WORLD_H);
    }
    ctx.restore();
    requestAnimationFrame(render);
  }
  resize();
  requestAnimationFrame(render);
})();