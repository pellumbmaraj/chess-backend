const User = require("./user.model");
const bcrypt = require("bcryptjs")

const addUser = async (data) => {
    const hashed_password = await bcrypt.hash(data.password, 10);

    const newUser = new User({
        username: data.username,
        email: data.email,
        password: hashed_password,
        userId: data.userId,
        rating: 1000,
        games: [],
    });

    try {
        await newUser.save();
        return true;
    } catch (err) {
        return false;
    }
}

const getUserByUsername = async (username) => {
    try {
        return await User.findOne({ username: username });
    } catch (err) {
        return null;
    }
};

const getUserByEmail = async (email) => {
    try {
        return await User.findOne({
            email: email,
        });
    }
    catch (err) {
        return null;
    }
};

const update = async (username, newData) => {
    try {
        const result = await User.updateOne(
            { username: username }, 
            {
                $set: { rating: newData.rating, },  
                $push: { games: newData.game } 
            } 
        );

        if (result.modifiedCount === 0) {
            return false;
        } else {
            return true;
        }
    } catch (err) {
        return false;
    }
}

module.exports = { addUser, getUserByUsername, getUserByEmail, update };
