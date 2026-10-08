 const mongoose = require("mongoose");

const WorkoutSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  exerciseName: String,
  sets: Number,
  reps: Number,
  calories: Number,
  notes: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Workout", WorkoutSchema);
