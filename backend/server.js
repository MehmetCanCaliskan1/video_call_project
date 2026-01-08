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
    origin: "*", 
    methods: ["GET", "POST"],
  },
});
/* app.get("/room-exists/:roomId", (req, res) => {
  const { roomId } = req.params;
  res.json({ exists: !!rooms[roomId] });
}); */

io.on("connection", (socket) => {
  console.log("Bağlandı:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    // 1. Oda hiç yoksa oluştur (İlk giren HOST olur)
    if (!rooms[roomId] || rooms[roomId].length === 0) {
      rooms[roomId] = [];
      
      const user = { socketId: socket.id, username, isHost: true };
      rooms[roomId].push(user);
      
      socket.join(roomId);
      
      // Kullanıcıya odaya başarıyla girdiğini ve Host olduğunu bildir
      socket.emit("room-joined", { status: "approved", isHost: true, users: rooms[roomId] });
      console.log(`Oda oluşturuldu, Host: ${username}`);
      return;
    }

    // 2. Oda dolu mu kontrolü (Opsiyonel 2 kişilik sınırın varsa)
    /* if (rooms[roomId].length >= 2) {
      socket.emit("room-full");
      return;
    } */

    // 3. Oda var, içeride Host var. Gelen kişi BEKLEMEYE alınır.
    const hostUser = rooms[roomId].find(user => user.isHost);
    
    if (hostUser) {
      // Host'a bildirim gönder: "Bu kişi girmek istiyor"
      io.to(hostUser.socketId).emit("join-request", { 
        socketId: socket.id, 
        username 
      });
      
      // Misafire bildirim gönder: "Beklemede kal"
      socket.emit("waiting-approval");
    } else {
      // Eğer odada kimse kalmadıysa ama oda silinmediyse (Nadir durum), direkt al.
      rooms[roomId].push({ socketId: socket.id, username, isHost: false });
      socket.join(roomId);
      socket.emit("room-joined", { status: "approved", isHost: false, users: rooms[roomId] });
    }
  });

  // HOST ONAY/RET CEVABI VERDİĞİNDE ÇALIŞACAK KISIM
  socket.on("handle-join-request", ({ decision, requesterId, requesterName }) => {
    // decision: 'approve' veya 'reject'
    // requesterId: İstekte bulunan kişinin socket.id'si

    const roomEntries = Object.entries(rooms).find(([id, users]) => 
      users.some(u => u.socketId === socket.id && u.isHost)
    );

    if (!roomEntries) return; // İstek yapan kişi host değilse işlem yapma
    const [roomId, users] = roomEntries;

    if (decision === "approve") {
      // 1. Kullanıcıyı listeye ekle
      rooms[roomId].push({ 
        socketId: requesterId, 
        username: requesterName, 
        isHost: false 
      });

      // 2. Bekleyen soketi odaya (socket channel) dahil et
      const requesterSocket = io.sockets.sockets.get(requesterId);
      if (requesterSocket) {
        requesterSocket.join(roomId);
        
        // 3. Bekleyen kişiye "Girebilirsin" de
        requesterSocket.emit("room-joined", { 
          status: "approved", 
          isHost: false, 
          users: rooms[roomId] 
        });
      }

      // 4. Odadaki herkese güncel listeyi at
      io.to(roomId).emit("room-users", rooms[roomId]);
      console.log(`${requesterName} odaya kabul edildi.`);

    } else {
      // REDDEDİLME DURUMU
      const requesterSocket = io.sockets.sockets.get(requesterId);
      if (requesterSocket) {
        requesterSocket.emit("join-rejected");
      }
    }
  });

  socket.on("disconnect", () => {
    // ... disconnect mantığı aynı kalabilir, sadece isHost kontrolü eklenebilir ...
    // Eğer Host çıkarsa oda patlayabilir veya yetki devredilebilir. 
    // Şimdilik basit tutup sadece listeden siliyoruz.
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(user => user.socketId !== socket.id);
      
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      } else {
        io.to(roomId).emit("room-users", rooms[roomId]);
      }
    }
    console.log("Çıkış:", socket.id);
  });
/* socket.on("check-room", (roomId, callback) => {
  const count = rooms[roomId]?.length || 0;

  if (count >= 2) {
    callback({ full: true });
  } else {
    callback({ full: false });
  }
}); */

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


const PORT = process.env.PORT || 5006;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));