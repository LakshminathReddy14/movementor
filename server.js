const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const User = require('./models/user');
const Workout = require('./models/workout');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB
mongoose
  .connect(process.env.MONGO_URI, { dbName: 'movementor' })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// -------- AUTH ROUTES --------

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, fitnessGoal, bodyType } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      fitnessGoal,
      bodyType
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({ message: 'User registered', user: userObj });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: 'Invalid credentials' });

    const userObj = user.toObject();
    delete userObj.password;

    res.json({ message: 'Login successful', user: userObj });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// -------- USER PROFILE / SUMMARY --------

// Get user + basic summary
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const workouts = await Workout.find({ user: userId }).sort({ date: 1 });

    const totalWorkouts = workouts.length;
    const totalCalories = workouts.reduce(
      (sum, w) => sum + (w.calories || 0),
      0
    );

    res.json({ user, totalWorkouts, totalCalories, workouts });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// -------- WORKOUT ROUTES --------

// Create workout
// -------- WORKOUT ROUTES --------

// Create workout
app.post('/api/workouts', async (req, res) => {
  try {
    console.log("📥 Incoming workout payload:", req.body);

    const { userId, exerciseName, sets, reps, calories, notes } = req.body;

    // 🔒 Safety check
    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    const workout = await Workout.create({
      user: userId,           // MUST be MongoDB _id
      exerciseName,
      sets,
      reps,
      calories,
      notes
    });

    console.log("✅ Workout saved to DB:", workout);

    res.status(201).json(workout);
  } catch (err) {
    console.error("❌ Create workout error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// -------- "AI" SUGGESTIONS --------

app.get('/api/ai/suggestions/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const workouts = await Workout.find({ user: user._id }).sort({
      createdAt: -1
    });

    const goal = user.fitnessGoal || 'general_fitness';

    const suggestions = [];

    if (goal === 'weight_loss') {
      suggestions.push(
        'Include more cardio like jumping jacks or running in place for at least 20 minutes.',
        'Try circuit workouts with short rest periods to keep your heart rate high.'
      );
    } else if (goal === 'muscle_gain') {
      suggestions.push(
        'Increase resistance or difficulty for push-ups and squats and aim for 3–5 sets.',
        'Focus on controlled reps and slightly higher rest between sets for proper recovery.'
      );
    } else if (goal === 'endurance') {
      suggestions.push(
        'Do longer sessions with moderate intensity, like 3 sets of 30–40 reps.',
        'Add plank holds and mountain climbers to build core endurance.'
      );
    } else if (goal === 'flexibility') {
      suggestions.push(
        'Add dynamic stretches before workout and static stretches after.',
        'Include yoga-inspired moves like lunges with a twist and hip openers.'
      );
    } else {
      suggestions.push(
        'Mix strength (push-ups, squats) with light cardio for balanced fitness.'
      );
    }

    if (workouts.length === 0) {
      suggestions.push(
        'You have no logged workouts yet. Start with 3 basic exercises: push-ups, squats and jumping jacks.'
      );
    } else {
      const last = workouts[0];
      suggestions.push(
        `Last time you did ${last.exerciseName} (${last.sets} sets x ${last.reps} reps). Try to beat that by a small margin today.`
      );
    }

    res.json({ suggestions });
  } catch (err) {
    console.error('AI suggestions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// -------- SPA FALLBACK (optional) --------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main.html'));
});




// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
