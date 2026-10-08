# 🏋️ MoveMentor — AI Fitness Trainer

MoveMentor is an AI-powered fitness trainer that uses real-time pose detection to monitor workouts, count repetitions, and estimate calories burned.

It uses **TensorFlow.js MoveNet** to analyze body movements through the user's camera and provide real-time workout feedback.

## ✨ Features

- 🎥 Real-time camera-based exercise detection
- 🦴 AI pose detection using TensorFlow.js MoveNet
- 🔢 Automatic repetition counting
- 🔥 Calorie estimation
- 🏋️ Exercise tracking for workouts such as squats and push-ups
- 📊 Workout progress and statistics
- 👤 User registration and login
- 💾 MongoDB-based workout data storage
- 📱 Responsive dark-themed fitness dashboard

## 🛠️ Tech Stack

### Frontend
- HTML
- CSS
- JavaScript
- TensorFlow.js
- MoveNet
- Chart.js

### Backend
- Node.js
- Express.js
- MongoDB

## 🧠 How It Works

1. The user selects an exercise and workout target.
2. MoveMentor accesses the camera.
3. TensorFlow.js MoveNet detects body keypoints in real time.
4. The application analyzes joint positions and angles.
5. Exercise phases are detected.
6. Repetitions are automatically counted.
7. Calories are estimated from completed repetitions.
8. Workout information is stored for progress tracking.

## 📂 Project Structure

```text
MoveMentor/
├── public/
│   ├── css/
│   ├── js/
│   └── ...
├── models/
├── server.js
├── package.json
├── package-lock.json
└── README.md
