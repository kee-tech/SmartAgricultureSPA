require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./db');
const agricultureData = require('./agriculture');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

// --------------------------------------------------
// BASIC API ROUTES
// --------------------------------------------------

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

// --------------------------------------------------
// JWT AUTHENTICATION MIDDLEWARE
// --------------------------------------------------

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

// --------------------------------------------------
// SIGNUP
// --------------------------------------------------

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: 'Please provide your name, email and password.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [
      normalizedEmail,
    ]);

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [
      name.trim(),
      normalizedEmail,
      hashedPassword,
    ]);

    return res.status(201).json({
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

    return res.status(500).json({
      message: 'Could not create your account.',
    });
  }
});

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: 'Please enter your email and password.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [users] = await db.query('SELECT id, name, email, password FROM users WHERE email = ?', [
      normalizedEmail,
    ]);

    if (users.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const user = users[0];
    const passwordMatches = await bcrypt.compare(password, user.password);

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

    return res.json({
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

    return res.status(500).json({
      message: 'Login failed. Please try again.',
    });
  }
});

// --------------------------------------------------
// GET SAVED CROPS FOR THE LOGGED-IN USER
// --------------------------------------------------

app.get('/api/crops-db', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, season, area, status, created_at
       FROM crops
       WHERE user_id = ?
       ORDER BY id DESC`,
      [req.user.userId],
    );

    return res.json(rows);
  } catch (error) {
    console.error('Load crops error:', error);

    return res.status(500).json({
      message: 'Could not load saved crops from MySQL.',
    });
  }
});

// --------------------------------------------------
// REGISTER A CROP
// --------------------------------------------------

app.post('/api/crops-db', requireAuth, async (req, res) => {
  try {
    const { name, season, area, status } = req.body;
    const numericArea = Number(area);

    if (!name?.trim() || !season || !Number.isFinite(numericArea) || numericArea <= 0 || !status) {
      return res.status(400).json({
        message: 'Please enter valid crop details.',
      });
    }

    const [result] = await db.query(
      `INSERT INTO crops (user_id, name, season, area, status)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.userId, name.trim(), season, numericArea, status],
    );

    return res.status(201).json({
      message: 'Crop registered successfully.',
      id: result.insertId,
    });
  } catch (error) {
    console.error('Register crop error:', error);

    return res.status(500).json({
      message: 'Could not save crop to MySQL.',
    });
  }
});

// --------------------------------------------------
// GET SETTINGS FOR THE LOGGED-IN FARMER
// --------------------------------------------------

app.get('/api/settings', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT soil_type, soil_moisture, soil_ph,
              temperature, humidity, rainfall,
              irrigation_status, water_usage
       FROM farmer_settings
       WHERE user_id = ?`,
      [req.user.userId],
    );

    if (rows.length === 0) {
      return res.json({
        soil: {
          type: 'Loamy',
          moisture: 45,
          ph: 6.5,
        },
        weather: {
          temperature: 28,
          humidity: 65,
          rainfall: 0,
        },
        irrigation: {
          status: 'Automatic',
          waterUsage: 120,
          unit: 'litres',
        },
      });
    }

    const settings = rows[0];

    return res.json({
      soil: {
        type: settings.soil_type,
        moisture: Number(settings.soil_moisture),
        ph: Number(settings.soil_ph),
      },
      weather: {
        temperature: Number(settings.temperature),
        humidity: Number(settings.humidity),
        rainfall: Number(settings.rainfall),
      },
      irrigation: {
        status: settings.irrigation_status,
        waterUsage: Number(settings.water_usage),
        unit: 'litres',
      },
    });
  } catch (error) {
    console.error('Load settings error:', error);

    return res.status(500).json({
      message: 'Could not load settings.',
    });
  }
});

// --------------------------------------------------
// SAVE OR UPDATE SETTINGS IN MYSQL
// --------------------------------------------------

app.put('/api/settings', requireAuth, async (req, res) => {
  try {
    const { soil, weather, irrigation } = req.body;

    const soilTypes = ['Loamy', 'Clay', 'Sandy', 'Silty', 'Peaty', 'Chalky'];

    const irrigationOptions = ['Automatic', 'Manual', 'On', 'Off'];

    const moisture = Number(soil?.moisture);
    const ph = Number(soil?.ph);
    const temperature = Number(weather?.temperature);
    const humidity = Number(weather?.humidity);
    const rainfall = Number(weather?.rainfall);
    const waterUsage = Number(irrigation?.waterUsage);

    if (
      !soilTypes.includes(soil?.type) ||
      !Number.isFinite(moisture) ||
      moisture < 0 ||
      moisture > 100 ||
      !Number.isFinite(ph) ||
      ph < 0 ||
      ph > 14 ||
      !Number.isFinite(temperature) ||
      temperature < -50 ||
      temperature > 70 ||
      !Number.isFinite(humidity) ||
      humidity < 0 ||
      humidity > 100 ||
      !Number.isFinite(rainfall) ||
      rainfall < 0 ||
      !irrigationOptions.includes(irrigation?.status) ||
      !Number.isFinite(waterUsage) ||
      waterUsage < 0
    ) {
      return res.status(400).json({
        message: 'Please enter valid settings.',
      });
    }

    await db.query(
      `INSERT INTO farmer_settings
        (user_id, soil_type, soil_moisture, soil_ph,
         temperature, humidity, rainfall,
         irrigation_status, water_usage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         soil_type = VALUES(soil_type),
         soil_moisture = VALUES(soil_moisture),
         soil_ph = VALUES(soil_ph),
         temperature = VALUES(temperature),
         humidity = VALUES(humidity),
         rainfall = VALUES(rainfall),
         irrigation_status = VALUES(irrigation_status),
         water_usage = VALUES(water_usage)`,
      [
        req.user.userId,
        soil.type,
        moisture,
        ph,
        temperature,
        humidity,
        rainfall,
        irrigation.status,
        waterUsage,
      ],
    );

    return res.json({
      message: 'Settings saved successfully.',
    });
  } catch (error) {
    console.error('Save settings error:', error);

    return res.status(500).json({
      message: 'Could not save settings.',
    });
  }
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log('Smart Agriculture backend running at http://localhost:' + PORT);
});
