const { Server } = require('socket.io');

const activeSockets = new Map();
const rooms = new Map();

const setupSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        const previousSocketId = socket.handshake.query.previousSocketId;
        const socketId = socket.id;
    
        if (previousSocketId && activeSockets.has(previousSocketId)) {
            // Reuse the previous ID
            activeSockets.set(previousSocketId, socket);
            console.log("Reused socket ID:", previousSocketId);
            socket.emit("welcome", { message: "Welcome back!", userId: previousSocketId });
        } else {
            // First-time connection
            activeSockets.set(socket.id, socket);
            console.log("New user connected:", socket.id);
            socket.emit("welcome", { message: "Welcome to the server!", userId: socket.id });
        }
    
        socket.on("create-room", (data) => {
            console.log("Creating room:", data);
            let playerJoined = false;
    
            rooms.forEach((room, roomId) => {
                if (room.players.length === 1 && room.players[0].gameType === data.gameType) {
                    room.players.push({ 
                        socketId: socketId,
                        username: data.user, 
                        rating: data.rating, 
                        color: "black", 
                        gameType: data.gameType,
                        roomId: roomId,
                    });
                    socket.join(roomId);
                    socket.emit("room-created", { roomId, userId: socket.id });
                    io.to(room.players[0].socketId).emit("play", room.players[1]);
                    io.to(room.players[1].socketId).emit("play", room.players[0]);
                }
    
                room.players.forEach(player => {
                    const playerSocketId = player.socketId;
                    if (playerSocketId === socketId) {
                        playerJoined = true;
                        return;
                    }
                });
            });
    
            if (!playerJoined) {
                const roomId = generateRandom(16);
                console.log("Room ID:", roomId);
                rooms.set(roomId, { players: [{ 
                    socketId: socketId,
                    username: data.user, 
                    rating: data.rating, 
                    color: "white",
                    gameType: data.gameType,
                    roomId: roomId,
                }] });
                socket.join(roomId);
                socket.emit("room-created", { roomId, userId: socket.id }); 
            }
        });
    
        socket.on("join-room", data => {
            const { roomId, userId } = data.roomId;
            if (!rooms.has(roomId)) {
                socket.emit("room-error", { message: "Room not found" });
                return;
            }
    
            const room = rooms.get(roomId);
            if (room.players.length === 2) {
                socket.emit("room-error", { message: "Room is full" });
            } else {
                room.players.push({socketId, userId});
                socket.join(roomId);
                socket.emit("room-joined", { roomId, players: room.players });
            }
        });
    
        socket.on("move", data => {
            const { roomId, move } = data;
            socket.to(roomId).emit("oppMove", move);
        });
    
        socket.on("game-over", data => {
            rooms.delete(data.roomId);  
        });
    
        socket.on("game-resign", data => {
            const room = rooms.get(data.roomId);
            const index = room.players.findIndex(player => player.socketId === socketId);
            if (index !== -1) {
                room.players.splice(index, 1);
                socket.to(room.players[0].socketId).emit("oppResign");
                rooms.delete(data.roomId);
            } 
        });
    
        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
            activeSockets.delete(socket.id);
            
        });
    });

    console.log('✅ WebSocket server started');
}

module.exports = { setupSocket };
