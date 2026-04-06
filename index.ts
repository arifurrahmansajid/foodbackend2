import express from 'express';
import cors from 'cors';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

app.use(cors());
app.use(express.json());

// Middlewares
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalid' });
  }
};

const authorize = (roles: Role[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};

/* --- Public Routes --- */
app.get('/api/meals', async (req, res) => {
  try {
    const meals = await prisma.meal.findMany({ include: { category: true, providerProfile: true } });
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

app.get('/api/meals/:id', async (req: any, res: any) => {
  try {
    const meal = await prisma.meal.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { category: true, providerProfile: true, reviews: true }
    });
    if (!meal) return res.status(404).json({ message: 'Not found' });
    res.json(meal);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/providers', async (req, res) => {
  try {
    const providers = await prisma.providerProfile.findMany({ include: { user: true } });
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/providers/:id', async (req: any, res: any) => {
  try {
    const provider = await prisma.providerProfile.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: true, meals: true }
    });
    if (!provider) return res.status(404).json({ message: 'Not found' });
    res.json(provider);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

/* --- Auth Routes --- */
app.post('/api/auth/register', async (req: any, res: any) => {
  try {
    const { email, password, name, role, companyName } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ message: 'Email in use' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role }
    });

    if (role === 'PROVIDER' && companyName) {
      await prisma.providerProfile.create({
        data: { userId: user.id, companyName }
      });
    }
    res.json({ message: 'Registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register' });
  }
});

app.post('/api/auth/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.get('/api/auth/me', authenticate, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { providerProfile: true }
    });
    if (user) {
      const { password, ...details } = user as any;
      res.json(details);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
});

/* --- Orders Routes --- */
app.post('/api/orders', authenticate, authorize(['CUSTOMER']), async (req: any, res: any) => {
  try {
    const { items, deliveryAddress, totalAmount } = req.body; // items: {mealId, quantity, price}[]
    const order = await prisma.order.create({
      data: {
        userId: req.user.userId,
        deliveryAddress,
        totalAmount,
        orderItems: {
          create: items.map((item: any) => ({
            mealId: item.mealId,
            quantity: item.quantity,
            price: item.price
          }))
        }
      }
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to place order' });
  }
});

app.get('/api/orders', authenticate, async (req: any, res: any) => {
  try {
    let orders;
    if (req.user.role === 'CUSTOMER') {
      orders = await prisma.order.findMany({ where: { userId: req.user.userId }, include: { orderItems: { include: { meal: true } } } });
    } else if (req.user.role === 'PROVIDER') {
      const profile = await prisma.providerProfile.findUnique({ where: { userId: req.user.userId } });
      if (!profile) return res.status(404).json({ message: 'Profile not found' });
      orders = await prisma.order.findMany({
        where: { orderItems: { some: { meal: { providerProfileId: profile.id } } } },
        include: { orderItems: { include: { meal: true } } }
      });
    } else {
      orders = await prisma.order.findMany({ include: { user: true, orderItems: true } });
    }
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/orders/:id', authenticate, async (req: any, res: any) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { orderItems: { include: { meal: true } }, user: true }
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

/* --- Provider Routes --- */
app.post('/api/provider/meals', authenticate, authorize(['PROVIDER']), async (req: any, res: any) => {
  try {
    const { name, description, price, imageUrl, categoryId } = req.body;
    const profile = await prisma.providerProfile.findUnique({ where: { userId: req.user.userId } });
    if (!profile) return res.status(404).json({ message: 'Profile missing' });

    const meal = await prisma.meal.create({
      data: { name, description, price, imageUrl, categoryId, providerProfileId: profile.id }
    });
    res.json(meal);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.patch('/api/provider/orders/:id', authenticate, authorize(['PROVIDER', 'ADMIN']), async (req: any, res: any) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: { status }
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

/* --- Admin Routes --- */
app.get('/api/admin/users', authenticate, authorize(['ADMIN']), async (req: any, res: any) => {
  try {
    const users = await prisma.user.findMany({ include: { providerProfile: true } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.patch('/api/admin/users/:id', authenticate, authorize(['ADMIN']), async (req: any, res: any) => {
  try {
    const { isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.listen(PORT, () => {
  console.log(`FoodHub backend is running on http://localhost:${PORT}`);
});
