const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(express.static("public"));

const rooms = new Map();
const W = 900, H = 600, MAX_PLAYERS = 8;
const cleanName = s => String(s || "Player").replace(/[<>&"']/g, "").trim().slice(0, 16) || "Player";
const roomCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();

function publicRoom(room) {
  return { code: room.code, players: [...room.players.values()].map(p => ({
    id:p.id, name:p.name, x:p.x, y:p.y, hp:p.hp, color:p.color, kills:p.kills
  })) };
}
function broadcast(room) {
  io.to(room.code).emit("state", publicRoom(room));
}
function leaveRoom(socket) {
  const code = socket.data.room;
  if (!code) return;
  const room = rooms.get(code);
  if (room) {
    room.players.delete(socket.id);
    socket.leave(code);
    if (!room.players.size) rooms.delete(code);
    else broadcast(room);
  }
  socket.data.room = null;
}
function enterRoom(socket, room, name) {
  if (room.players.size >= MAX_PLAYERS) return socket.emit("notice", "Кімната заповнена (максимум 8 гравців).");
  leaveRoom(socket);
  const colors = ["#ffd166","#06d6a0","#ef476f","#4cc9f0","#c77dff","#f4a261","#90be6d","#f72585"];
  const player = { id:socket.id, name:cleanName(name), x:100+Math.random()*700, y:100+Math.random()*400,
    hp:100, color:colors[room.players.size % colors.length], kills:0, lastShot:0 };
  room.players.set(socket.id, player);
  socket.join(room.code);
  socket.data.room = room.code;
  socket.emit("joined", { code:room.code, id:socket.id, players:[...room.players.values()] });
  broadcast(room);
}
io.on("connection", socket => {
  socket.on("createRoom", ({name}) => {
    leaveRoom(socket);
    let code; do { code=roomCode(); } while (rooms.has(code));
    const room={code,players:new Map()};
    rooms.set(code,room);
    enterRoom(socket,room,name);
  });
  socket.on("joinRoom", ({code,name}) => {
    const room=rooms.get(String(code||"").trim().toUpperCase());
    if (!room) return socket.emit("notice","Такої кімнати немає. Перевір код у друга.");
    enterRoom(socket,room,name);
  });
  socket.on("move", ({dx,dy}) => {
    const room=rooms.get(socket.data.room), p=room?.players.get(socket.id);
    if (!p) return;
    dx=Math.max(-1,Math.min(1,Number(dx)||0)); dy=Math.max(-1,Math.min(1,Number(dy)||0));
    const len=Math.hypot(dx,dy)||1;
    p.x=Math.max(24,Math.min(W-24,p.x+dx/len*4.2));
    p.y=Math.max(24,Math.min(H-24,p.y+dy/len*4.2));
    broadcast(room);
  });
  socket.on("shoot", ({angle}) => {
    const room=rooms.get(socket.data.room), p=room?.players.get(socket.id);
    if (!p || Date.now()-p.lastShot<350) return;
    p.lastShot=Date.now();
    const a=Number(angle)||0;
    const bullet={id:crypto.randomUUID(),owner:socket.id,x:p.x,y:p.y,vx:Math.cos(a)*10,vy:Math.sin(a)*10,life:65};
    io.to(room.code).emit("bullet",bullet);
  });
  socket.on("disconnect",()=>leaveRoom(socket));
});

// Authoritative lightweight projectile simulation.
const bullets=new Map();
io.on("connection", socket => {
  socket.on("bullet", b => { /* client cannot inject authoritative damage */ });
});
setInterval(() => {
  for (const [code,room] of rooms) {
    // Bullets are kept per room. This demo uses server-created bullet events and
    // collision checks are handled in the tick below.
    const list=bullets.get(code)||[];
    for (let i=list.length-1;i>=0;i--) {
      const b=list[i]; b.x+=b.vx; b.y+=b.vy; b.life--;
      let hit=false;
      for (const p of room.players.values()) {
        if (p.id===b.owner || p.hp<=0) continue;
        if (Math.hypot(p.x-b.x,p.y-b.y)<22) {
          p.hp-=25; hit=true;
          if (p.hp<=0) {
            const killer=room.players.get(b.owner);
            if (killer) killer.kills++;
            p.hp=100; p.x=100+Math.random()*700; p.y=100+Math.random()*400;
          }
          break;
        }
      }
      if (hit || b.life<=0 || b.x<0 || b.y<0 || b.x>W || b.y>H) list.splice(i,1);
    }
    bullets.set(code,list);
    if (list.length) io.to(code).emit("bullets",list);
  }
}, 30);

// Replace shoot handler with server-side bullet registration.
io.removeAllListeners; // no-op; socket handlers above remain active
// Register a second listener for the same event to create the authoritative bullet.
io.on("connection", socket => {
  socket.on("shoot", ({angle}) => {
    const code=socket.data.room;
    if (!code) return;
    const room=rooms.get(code), p=room?.players.get(socket.id);
    if (!p) return;
    const list=bullets.get(code)||[];
    const a=Number(angle)||0;
    list.push({id:crypto.randomUUID(),owner:socket.id,x:p.x,y:p.y,vx:Math.cos(a)*10,vy:Math.sin(a)*10,life:65});
    bullets.set(code,list);
  });
});
const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`Brawl Arena running on port ${PORT}`));
