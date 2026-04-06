"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Middlewares
const authenticate = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token)
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        res.status(401).json({ message: 'Token invalid' });
    }
};
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
};
/* --- Public Routes --- */
app.get('/api/meals', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const meals = yield prisma.meal.findMany({ include: { category: true, providerProfile: true } });
        res.json(meals);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch meals' });
    }
}));
app.get('/api/meals/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const meal = yield prisma.meal.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { category: true, providerProfile: true, reviews: true }
        });
        if (!meal)
            return res.status(404).json({ message: 'Not found' });
        res.json(meal);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
}));
app.get('/api/providers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const providers = yield prisma.providerProfile.findMany({ include: { user: true } });
        res.json(providers);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
}));
app.get('/api/providers/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const provider = yield prisma.providerProfile.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { user: true, meals: true }
        });
        if (!provider)
            return res.status(404).json({ message: 'Not found' });
        res.json(provider);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
}));
/* --- Auth Routes --- */
app.post('/api/auth/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name, role, companyName } = req.body;
        const exists = yield prisma.user.findUnique({ where: { email } });
        if (exists)
            return res.status(400).json({ message: 'Email in use' });
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const user = yield prisma.user.create({
            data: { email, password: hashedPassword, name, role }
        });
        if (role === 'PROVIDER' && companyName) {
            yield prisma.providerProfile.create({
                data: { userId: user.id, companyName }
            });
        }
        res.json({ message: 'Registered successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to register' });
    }
}));
app.post('/api/auth/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(401).json({ message: 'Invalid credentials' });
        const valid = yield bcrypt_1.default.compare(password, user.password);
        if (!valid)
            return res.status(401).json({ message: 'Invalid credentials' });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET);
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to login' });
    }
}));
app.get('/api/auth/me', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma.user.findUnique({
            where: { id: req.user.userId },
            include: { providerProfile: true }
        });
        if (user) {
            const _a = user, { password } = _a, details = __rest(_a, ["password"]);
            res.json(details);
        }
        else {
            res.status(404).json({ message: 'User not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Error' });
    }
}));
/* --- Orders Routes --- */
app.post('/api/orders', authenticate, authorize(['CUSTOMER']), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { items, deliveryAddress, totalAmount } = req.body; // items: {mealId, quantity, price}[]
        const order = yield prisma.order.create({
            data: {
                userId: req.user.userId,
                deliveryAddress,
                totalAmount,
                orderItems: {
                    create: items.map((item) => ({
                        mealId: item.mealId,
                        quantity: item.quantity,
                        price: item.price
                    }))
                }
            }
        });
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to place order' });
    }
}));
app.get('/api/orders', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let orders;
        if (req.user.role === 'CUSTOMER') {
            orders = yield prisma.order.findMany({ where: { userId: req.user.userId }, include: { orderItems: { include: { meal: true } } } });
        }
        else if (req.user.role === 'PROVIDER') {
            const profile = yield prisma.providerProfile.findUnique({ where: { userId: req.user.userId } });
            if (!profile)
                return res.status(404).json({ message: 'Profile not found' });
            orders = yield prisma.order.findMany({
                where: { orderItems: { some: { meal: { providerProfileId: profile.id } } } },
                include: { orderItems: { include: { meal: true } } }
            });
        }
        else {
            orders = yield prisma.order.findMany({ include: { user: true, orderItems: true } });
        }
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
}));
app.get('/api/orders/:id', authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = yield prisma.order.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { orderItems: { include: { meal: true } }, user: true }
        });
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
}));
/* --- Provider Routes --- */
app.post('/api/provider/meals', authenticate, authorize(['PROVIDER']), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, price, imageUrl, categoryId } = req.body;
        const profile = yield prisma.providerProfile.findUnique({ where: { userId: req.user.userId } });
        if (!profile)
            return res.status(404).json({ message: 'Profile missing' });
        const meal = yield prisma.meal.create({
            data: { name, description, price, imageUrl, categoryId, providerProfileId: profile.id }
        });
        res.json(meal);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
}));
app.patch('/api/provider/orders/:id', authenticate, authorize(['PROVIDER', 'ADMIN']), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.body;
        const order = yield prisma.order.update({
            where: { id: parseInt(req.params.id) },
            data: { status }
        });
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
}));
/* --- Admin Routes --- */
app.get('/api/admin/users', authenticate, authorize(['ADMIN']), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma.user.findMany({ include: { providerProfile: true } });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
}));
app.patch('/api/admin/users/:id', authenticate, authorize(['ADMIN']), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { isActive } = req.body;
        const user = yield prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: { isActive }
        });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
}));
app.listen(PORT, () => {
    console.log(`FoodHub backend is running on http://localhost:${PORT}`);
});
