const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const rooms = {};

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.get("/room-exists/:roomId", (req, res) => {
  const { roomId } = req.params;
  res.json({ exists: !!rooms[roomId] });
});

io.on("connection", (socket) => {
  console.log("Bağlandı:", socket.id);

 socket.on("join-room", ({ roomId, username }) => {

  //ODA YOK
  if (!rooms[roomId]) {
    socket.emit("room-not-found");
    return;
      }

  // ODA DOLU
  if (rooms[roomId].length >= 2) {
    socket.emit("room-full");
    return;
  }

  socket.join(roomId);

  rooms[roomId].push({
    socketId: socket.id,
    username
  });

    console.log(`${username} odaya girdi: ${roomId}`);
    io.to(roomId).emit("room-users", rooms[roomId]);
  });

  socket.on("disconnect", () => {
  for (const roomId in rooms) {
    rooms[roomId] = rooms[roomId].filter(
      user => user.socketId !== socket.id
    );

    if (rooms[roomId].length === 0) {
      delete rooms[roomId];
    } else {
      io.to(roomId).emit("room-users", rooms[roomId]);
    }
  }

    console.log("Çıkış:", socket.id);
    //console.log(`${username} odayı terk etti: ${roomId}`);

  });

//webrtc signaling

socket.on("webrtc-offer", ({ to, offer }) => {
  socket.to(to).emit("webrtc-offer", {
    from: socket.id,
    offer
  });
});

socket.on("webrtc-answer", ({ to, answer }) => {
  socket.to(to).emit("webrtc-answer", {
    from: socket.id,
    answer
  });
});

socket.on("webrtc-ice", ({ to, candidate }) => {
  socket.to(to).emit("webrtc-ice", {
    from: socket.id,
    candidate
  });
});



});


server.listen(5006, () => {
  console.log("Backend çalışıyor → http://localhost:5006");
});
