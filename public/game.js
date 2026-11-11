const socket=io();
const $=id=>document.getElementById(id);
const lobby=$("lobby"),game=$("game"),notice=$("notice"),canvas=$("arena"),ctx=canvas.getContext("2d");
let myId=null,roomCode="",players=[],bullets=[],keys={},aim={x:1,y:0},moveTimer=null;
socket.on("connect",()=>$("connection").textContent="● Онлайн");
socket.on("disconnect",()=>$("connection").textContent="● Від'єднано");
socket.on("notice",m=>notice.textContent=m);
function name(){return $("name").value.trim()||"Player"}
$("create").onclick=()=>socket.emit("createRoom",{name:name()});
$("join").onclick=()=>socket.emit("joinRoom",{name:name(),code:$("code").value});
socket.on("joined",data=>{myId=data.id;roomCode=data.code;$("roomCode").textContent=roomCode;lobby.classList.add("hidden");game.classList.remove("hidden");notice.textContent="";});
socket.on("state",data=>{players=data.players;$("players").textContent=`Гравців: ${players.length}/8`;const me=players.find(p=>p.id===myId);$("kills").textContent=`Перемоги: ${me?.kills||0}`;$("roster").innerHTML=players.map(p=>`<span class="player">${p.id===myId?"⭐ ":""}${escapeHtml(p.name)} · ${p.hp} HP · 🏆 ${p.kills}</span>`).join("");draw();});
socket.on("bullet",b=>{bullets.push(b)});
socket.on("bullets",b=>{bullets=b;draw()});
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("copy").onclick=async()=>{try{await navigator.clipboard.writeText(roomCode);$("copy").textContent="Скопійовано!";}catch{$("copy").textContent="Код: "+roomCode;}};
$("leave").onclick=()=>location.reload();
function move(){let dx=(keys.right?1:0)-(keys.left?1:0),dy=(keys.down?1:0)-(keys.up?1:0);if(dx||dy)socket.emit("move",{dx,dy});}
setInterval(move,35);
document.addEventListener("keydown",e=>{let k=e.key.toLowerCase();if(k==="w"||k==="arrowup")keys.up=true;if(k==="s"||k==="arrowdown")keys.down=true;if(k==="a"||k==="arrowleft")keys.left=true;if(k==="d"||k==="arrowright")keys.right=true;});
document.addEventListener("keyup",e=>{let k=e.key.toLowerCase();if(k==="w"||k==="arrowup")keys.up=false;if(k==="s"||k==="arrowdown")keys.down=false;if(k==="a"||k==="arrowleft")keys.left=false;if(k==="d"||k==="arrowright")keys.right=false;});
document.querySelectorAll("[data-dir]").forEach(btn=>{let k=btn.dataset.dir;btn.addEventListener("pointerdown",e=>{e.preventDefault();keys[k]=true;btn.setPointerCapture(e.pointerId)});["pointerup","pointercancel","lostpointercapture"].forEach(ev=>btn.addEventListener(ev,()=>keys[k]=false));});
canvas.addEventListener("pointermove",e=>{const r=canvas.getBoundingClientRect(),me=players.find(p=>p.id===myId);if(!me)return;const x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;aim={x:x-me.x,y:y-me.y};});
function shoot(){const me=players.find(p=>p.id===myId);if(!me)return;socket.emit("shoot",{angle:Math.atan2(aim.y,aim.x)});}
$("fire").addEventListener("pointerdown",e=>{e.preventDefault();shoot()});
function draw(){ctx.clearRect(0,0,900,600);ctx.fillStyle="#29473b";ctx.fillRect(0,0,900,600);ctx.strokeStyle="#355746";for(let x=0;x<900;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,600);ctx.stroke()}for(let y=0;y<600;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke()}
for(const b of bullets){ctx.fillStyle="#ffe17a";ctx.beginPath();ctx.arc(b.x,b.y,7,0,Math.PI*2);ctx.fill()}
for(const p of players){ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,19,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.id===myId?"white":"#172033";ctx.lineWidth=3;ctx.stroke();ctx.fillStyle="#111";ctx.font="bold 12px system-ui";ctx.textAlign="center";ctx.fillText(p.name,p.x,p.y-28);ctx.fillStyle="#1b1b1b";ctx.fillRect(p.x-20,p.y+24,40,5);ctx.fillStyle="#5df18b";ctx.fillRect(p.x-20,p.y+24,40*Math.max(0,p.hp)/100,5);if(p.id===myId){ctx.fillStyle="white";ctx.font="17px sans-serif";ctx.fillText("★",p.x,p.y+6)}}}
