require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/energyEmpire', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Схема пользователя
const userSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true },
    name: String,
    energy: { type: Number, default: 0 },
    gamma: { type: Number, default: 0 },
    ton: { type: Number, default: 0 },
    buildings: {
        solar: { level: Number, count: Number, production: Number },
        wind: { level: Number, count: Number, production: Number }
    },
    lastCollect: Date
});

const User = mongoose.model('User', userSchema);

// Middleware для проверки пользователя
app.use(async (req, res, next) => {
    const userId = req.body.userId || req.query.userId;
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    
    try {
        let user = await User.findOne({ userId });
        if (!user) {
            user = new User({ 
                userId,
                buildings: {
                    solar: { level: 1, count: 0, production: 700 },
                    wind: { level: 1, count: 0, production: 2100 }
                }
            });
            await user.save();
        }
        req.user = user;
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для сохранения данных
app.post('/api/save', async (req, res) => {
    try {
        const { energy, gamma, ton, buildings } = req.body;
        const user = req.user;
        
        user.energy = energy || user.energy;
        user.gamma = gamma || user.gamma;
        user.ton = ton || user.ton;
        user.buildings = buildings || user.buildings;
        user.lastCollect = new Date();
        
        await user.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для загрузки данных
app.get('/api/data', async (req, res) => {
    try {
        const user = req.user;
        res.json({
            energy: user.energy,
            gamma: user.gamma,
            ton: user.ton,
            buildings: user.buildings,
            lastCollect: user.lastCollect
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для лидерборда
app.get('/api/leaderboard', async (req, res) => {
    try {
        const topUsers = await User.find({})
            .sort({ energy: -1 })
            .limit(10)
            .select('userId name energy');
        res.json(topUsers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
