const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store active rooms and users
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  let currentRoom = null;
  let isHost = false;

  // Handle client joining a room
  socket.on('join', (data) => {
    const roomId = data.roomId;
    
    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        hostSocket: null,
        clientSockets: new Set(),
      });
    }
    
    const room = rooms.get(roomId);
    
    // Check if joining as host or client
    if (data.isHost) {
      if (room.hostSocket) {
        socket.emit('error', 'Room already has a host');
        return;
      }
      
      isHost = true;
      room.hostSocket = socket.id;
      console.log(`Host joined room: ${roomId}`);
    } else {
      room.clientSockets.add(socket.id);
      console.log(`Client joined room: ${roomId}`);
    }
    
    // Join the Socket.IO room
    socket.join(roomId);
    currentRoom = roomId;
    
    // Notify client they've joined successfully
    socket.emit('joined', { roomId });
    
    // If host is connecting, send list of existing clients
    if (data.isHost && room.hostSocket === socket.id) {
      const clients = Array.from(room.clientSockets).map(id => ({ id }));
      socket.emit('clients-list', { clients });
    }
    
    // If client is connecting and host exists, notify host
    if (!data.isHost && room.hostSocket) {
      io.to(room.hostSocket).emit('new-client', { clientId: socket.id });
    }
  });

  // Handle SDP offer
  socket.on('offer', (data) => {
    console.log(`Offer received from ${socket.id} in room ${data.roomId}`);
    const room = rooms.get(data.roomId);
    
    if (room) {
      if (isHost) {
        // If host is sending an offer, forward to specific client
        if (data.clientId && room.clientSockets.has(data.clientId)) {
          io.to(data.clientId).emit('offer', {
            sdp: data.sdp,
            hostId: socket.id
          });
        }
      } else {
        // If client is sending an offer, forward to host
        if (room.hostSocket) {
          io.to(room.hostSocket).emit('offer', {
            sdp: data.sdp,
            clientId: socket.id,
            roomId: data.roomId
          });
        }
      }
    }
  });

  // Handle SDP answer
  socket.on('answer', (data) => {
    console.log(`Answer received from ${socket.id} in room ${data.roomId}`);
    const room = rooms.get(data.roomId);
    
    if (room) {
      if (isHost && data.clientId) {
        // Host answering to a specific client
        io.to(data.clientId).emit('answer', {
          sdp: data.sdp,
          hostId: socket.id
        });
      } else if (!isHost && room.hostSocket) {
        // Client answering to host
        io.to(room.hostSocket).emit('answer', {
          sdp: data.sdp,
          clientId: socket.id
        });
      }
    }
  });

  // Handle ICE candidates
  socket.on('ice-candidate', (data) => {
    const room = rooms.get(data.roomId);
    
    if (room) {
      if (isHost && data.clientId) {
        // Host sending ICE candidate to specific client
        io.to(data.clientId).emit('ice-candidate', {
          candidate: data.candidate,
          hostId: socket.id
        });
      } else if (!isHost && room.hostSocket) {
        // Client sending ICE candidate to host
        io.to(room.hostSocket).emit('ice-candidate', {
          candidate: data.candidate,
          clientId: socket.id
        });
      }
    }
  });

  // Handle stop sharing
  socket.on('stop-sharing', (data) => {
    const room = rooms.get(data.roomId);
    
    if (room) {
      if (isHost && data.clientId) {
        // Notify specific client to stop sharing
        io.to(data.clientId).emit('stop-sharing');
      } else if (!isHost && room.hostSocket) {
        // Notify host that client stopped sharing
        io.to(room.hostSocket).emit('client-stopped', { clientId: socket.id });
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    // Clean up rooms
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      
      if (room) {
        if (isHost) {
          // Host disconnected, notify all clients
          socket.to(currentRoom).emit('host-disconnected');
          rooms.delete(currentRoom);
        } else {
          // Client disconnected, remove from room and notify host
          room.clientSockets.delete(socket.id);
          if (room.hostSocket) {
            io.to(room.hostSocket).emit('client-disconnected', { clientId: socket.id });
          }
          
          // If room is empty, delete it
          if (room.clientSockets.size === 0 && !room.hostSocket) {
            rooms.delete(currentRoom);
          }
        }
      }
    }
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'host.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
