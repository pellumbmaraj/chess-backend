const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userId: { type: String, required: true, unique: true },
    rating: { type: Number, required: true },
    games: [{ 
        result: { type: String, required: true, },
        opponent: { type: String, required: true, },
        moves: { type: String, required: true, },
        date: { type: Date, required: true, }, 
        opponent_rating: { type: Number, required: true, }
    }],
}, {
    timestamps: true, 
});

const User = mongoose.model('User', userSchema);

module.exports = User;