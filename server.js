const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { setupSocket } = require('./socket');
const { v4: uuidv4 } = require("uuid");
const cookieParser = require('cookie-parser');

const { addUser, getUserByUsername, getUserByEmail, update } = require('./db');
const { verifyPassword, 
        generateAESKey, 
        encryptData, 
        decryptData, 
        encryptKeyRSA, 
        generateRandomString 
    } = require('./cryptography');
const { runExecutable, extractBestMove } = require("./engine");
const { console } = require('inspector');

const app = express();
const server = http.createServer(app);

let sessions = {};

// Middleware
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(cookieParser());

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Hello, world!' });
});

app.get('/establish-connection', (req, res) => {
    const session_key = req.cookies.sessionKey;

    if (!sessions[session_key]) {
        const newSessionKey = uuidv4();
        const newAESKey = generateAESKey();

        sessions[newSessionKey] = newAESKey;

        res.cookie("sessionKey", newSessionKey, {
            maxAge: 24 * 60 * 60 * 1000, 
            httpOnly: true,  
            secure: false 
        });

        setTimeout(() => {
            delete sessions[newSessionKey];
            console.log(`Session expired and removed: ${newSessionKey}`);
        }, 24 * 60 * 60 * 1000);

        res.status(200).json({ message: 'Session Set'});
        return;
    }   

    res.status(200).json({ message: "Session Established"})
});

app.post('/get-aes-key', (req, res) => {
    const session_key = req.cookies.sessionKey;

    if (!session_key || !sessions[session_key]) {
        res.status(403).json({ error: "Session Not Found" });
        return;
    }
    
    const publicKey = req.body.publicKey;

    if (!publicKey) {
        res.status(400).json({ error: "Bad Request" });
        return;
    }

    const encryptedAESKey = encryptKeyRSA(sessions[session_key], publicKey);

    if (!encryptedAESKey) {
        res.status(500).json({ error: "Internal Server Error or Incorrect Public Key" });
        return;
    }

    res.status(200).json({ aesKey: encryptedAESKey });
});

app.post('/register', async (req, res) => {
    const session_key = req.cookies.sessionKey;

    if (!session_key || !sessions[session_key]) {
        res.status(403).json({ error: "Session Not Found" });
        return;
    }

    const { encryptedData, iv } = req.body;
    const decryptedData = decryptData(encryptedData, sessions[session_key], iv);

    if (!decryptedData) {
        res.status(400).json({ error: "Bad Request" });
        return;
    }

    const { username, email, password, registerAt } = decryptedData;

    if (username === "" || email === "" || password === "" || registerAt === "") {
        res.status(400).json({ error: "Bad Request" });
        return;
    }

    const getData = await getUserByEmail({ email: decryptedData.email });

    if (getData) {
        if (getData.username === decryptedData.username) {
            const verifyPassowrd = await verifyPassword(decryptedData.password, getData.password);
            if (verifyPassowrd) {
                const encryptedResponse = encryptData({ username: getData.username, userId: getData.userId, rating: getData.rating }, sessions[session_key]);
                res.status(200).json(encryptedResponse);
                return;
            }
        }

        res.status(400).json({ error: "Incorrect Credentials" });
        return;
    }
    const userId = uuidv4();
    const user = await addUser({ userId, username, email, password });

    if (!user) {
        res.status(500).json({ error: "Internal Server Error" });
        return;
    }

    const encryptedResponse = encryptData({ username, userId, rating: 1000 }, sessions[session_key]);
    res.status(200).json({ "data" : encryptedResponse });
});

app.post('/login', async (req, res) => {    
    const session_key = req.cookies.sessionKey;

    if (!session_key || !sessions[session_key]) {
        res.status(403).json({ error: "Session Not Found" });
        return;
    }

    const { encryptedData, iv } = req.body;
    const decryptedData = decryptData(encryptedData, sessions[session_key], iv);

    console.log(decryptedData);

    if (!decryptedData) {
        res.status(400).json({ error: "Bad Request" });
        return;
    }

    const user = await getUserByEmail({ email: decryptedData.email });

    console.log(user);

    if (!user) {
        res.status(400).json({ error: "Incorrect Credentials" });
        return;
    }

    console.log("I pass");

    const verifyPassowrd = await verifyPassword(decryptedData.password, user.password);

    if (!verifyPassowrd) {
        res.status(400).json({ error: "Incorrect Credentials" });
        return;
    }

    const encryptedResponse = encryptData({ username: user.username, userId: user.userId, rating: user.rating }, sessions[session_key]);
    res.status(200).json({"data" : encryptedResponse});
});

app.post('/bestmove', async (req, res) => {
    let bestMove = null;
    try {
        let tryCount = 0;
        while(!bestMove && tryCount < 4)
        {
            const result = await runExecutable(req.body.position, req.body.depth);  // Run the executable
            bestMove = extractBestMove(result);  // Extract the best move from the output
            tryCount++;
        }
    } catch (error) {
        console.error('Error running executable:', error);
    }

    res.json({ bestmove: bestMove });
});

app.get('logout', async (req, res) => {
    const session_key = req.cookies.sessionKey;

    if (!session_key) {
        return;
    }

    if (!sessions[session_key]) {
        res.status(200).json({ message: "Logged Out" });
        return;
    }

    delete sessions[session_key];
    res.clearCookie("sessionKey");
    res.status(200).json({ message: "Logged Out" });
});

app.post('/games', async (req, res) => {

});

app.get('/game:id', async (req, res) => {
    
});

mongoose.connect('mongodb+srv://pumemaraj:pumemarajdb@test.7ozh6.mongodb.net/?retryWrites=true&w=majority&appName=test')
.then(() => {
    console.log('✅ User DB connected');
    setupSocket(server);
    // Start server only after DB connection
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
})
.catch(err => {
    console.error('❌ User DB connection error:', err);
    process.exit(1); // Exit process if DB connection fails
});
