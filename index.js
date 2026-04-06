"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Public Routes
app.get('/api/meals', async (req, res) => {
    try {
        const meals = await prisma.meal.findMany({
            include: { category: true, providerProfile: true }
        });
        res.json(meals);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch meals' });
    }
});
app.get('/api/providers', async (req, res) => {
    try {
        const providers = await prisma.providerProfile.findMany({
            include: { user: true }
        });
        res.json(providers);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch providers' });
    }
});
// Auth & other placeholder routes
app.post('/api/auth/register', (req, res) => res.status(501).json({ message: "Not Implemented" }));
app.post('/api/auth/login', (req, res) => res.status(501).json({ message: "Not Implemented" }));
app.listen(PORT, () => {
    console.log(`FoodHub backend is running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map