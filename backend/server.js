
require('dotenv').config();

const db = require('./db');
const express = require('express');
const cors = require('cors');
const agricultureData = require('./agriculture');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

// -------------------- PUBLIC AGRICULTURE APIs --------------------

app.get('/', (req, res) => {
  res.send('Smart Agriculture API is running!');
});

app.get('/api/agriculture', (req, res) => {
  res.json(agricultureData);
});

app.get('/api/crops', (req, res) => {
  res.json(agricultureData.crops);
});

app.get('/api/soil', (req, res) => {
  res.json(agricultureData.soil);
});

app.get('/api/weather', (req, res) => {
  res.json(agricultureData.weather);
});

app.get('/api/irrigation', (req, res) => {
  res.json(agricultureData.irrigation);
});

// -------------------- JWT AUTHENTICATION --------------------

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Please log in to access this resource.',
    });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({
      message: 'Login configuration is missing.',
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired login session. Please log in again.',
    });
  }
}

// -------------------- GET ONLY THE LOGGED-IN USER'S CROPS --------------------

app.get('/api/crops-db', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, season, area, status, created_at FROM crops WHERE user_id = ? ORDER BY id DESC',
      [req.user.userId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Fetch crops error:', error);
    res.status(500).json({
      message: 'Failed to fetch crops.',
    });
  }
});

// -------------------- REGISTER A CROP FOR THE LOGGED-IN USER --------------------

app.post('/api/crops-db', requireAuth, async (req, res) => {
  try {
    const { name, season, area, status } = req.body;

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof season !== 'string' ||
      !season.trim() ||
      area === undefined ||
      area === '' ||
      !Number.isFinite(Number(area)) ||
      Number(area) <= 0 ||
      typeof status !== 'string' ||
      !status.trim()
    ) {
      return res.status(400).json({
        message: 'Please enter valid details for all crop fields.',
      });
    }

    const [result] = await db.query(
      'INSERT INTO crops (name, season, area, status, user_id) VALUES (?, ?, ?, ?, ?)',
      [
        name.trim(),
        season.trim(),
        Number(area),
        status.trim(),
        req.user.userId,
      ]
    );

    res.status(201).json({
      message: 'Crop registered successfully.',
      id: result.insertId,
    });
  } catch (error) {
    console.error('Register crop error:', error);
    res.status(500).json({
      message: 'Failed to register crop.',
    });
  }
});

// -------------------- SIGN UP --------------------

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        message: 'Name, email, and password are required.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), normalizedEmail, passwordHash]
    );

    res.status(201).json({
      message: 'Account created successfully.',
      user: {
        id: result.insertId,
        name: name.trim(),
        email: normalizedEmail,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    res.status(500).json({
      message: 'Could not create account.',
    });
  }
});

// -------------------- LOG IN --------------------

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    const [users] = await db.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = ?',
      [email.trim().toLowerCase()],
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const user = users[0];

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        message: 'Login configuration is missing.',
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: '2h' },
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      message: 'Could not log in.',
      detail: error.message,
    });
  }
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log('Smart Agriculture backend running at http://localhost:' + PORT);
});
