/* ========================================================== 
   MoveMentor DASHBOARD.JS (FINAL FIX - ALL ERRORS FIXED)
   ========================================================== */

const API_BASE = "";
let currentUser = null;
let cachedWorkouts = [];
let progressChart = null;

let detector = null;
let poseVideo = document.getElementById("poseVideo");
let poseCanvas = null;
let poseCtx = null;
let poseStream = null;
let stopDetection = false;
let currentPoseExercise = "pushups";
let repCount = 0;
let liveCaloriesValue = 0;
let lastPhase = "up";
let lastRepTime = 0;
let squatPhase = "up";
let jumpingPhase = "in";
let plankStartTime = null;
let plankSeconds = 0;

let formScoreValue = 100;
let lastCorrectionTime = 0;
let correctionCooldown = 2000;

let voiceEnabled = true;
let lastSpokenMessage = "";
let voiceCooldown = 3000;
let lastVoiceTime = 0;

const exerciseDemoVideos = {
  pushups: "/videos/pushups.mp4",
  squats: "/videos/squats.mp4",
  deadlifts: "/videos/deadlifts.mp4",
  running: "/videos/running.mp4",
  cycling: "/videos/cycling.mp4",
  swimming: "/videos/swimming.mp4",
  plank: "/videos/plank.mp4",
  jumpingjacks: "/videos/jumpingjacks.mp4"
};

/* ===================== INIT ===================== */
document.addEventListener("DOMContentLoaded", initDashboard);

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function setupCustomExerciseSelect() {
  const select = document.getElementById("exerciseSelect");
  if (!select) return;

  const selected = select.querySelector(".selected");
  const optionsBox = select.querySelector(".options");
  const options = optionsBox.querySelectorAll("div");
  const hiddenInput = document.getElementById("selectedExerciseInput");

  // Toggle dropdown
  selected.addEventListener("click", () => {
    optionsBox.classList.toggle("open");
  });

  // Option click
  options.forEach(option => {
    option.addEventListener("click", () => {
      const exerciseKey = option.dataset.value;

      selected.textContent = option.textContent;
      hiddenInput.value = exerciseKey;

      optionsBox.classList.remove("open");

      console.log("Exercise selected:", exerciseKey); // DEBUG

      // ✅ SHOW DEMO POPUP
      showExerciseDemo(exerciseKey);
    });
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!select.contains(e.target)) {
      optionsBox.classList.remove("open");
    }
  });
}

function initDashboard() {
  const saved = localStorage.getItem("mmUser");
  
  const closeSummaryBtn = document.getElementById("closeSummaryBtn");
  if (closeSummaryBtn) {
    closeSummaryBtn.addEventListener("click", hideSessionSummary);
  }

  if (!saved) {
    window.location.href = "main.html";
    return;
  }

  currentUser = JSON.parse(saved);
  console.log("Dashboard JS loaded!");
  console.log("User :", currentUser.name);
  
  fetch(`/api/workouts/${currentUser._id}`)
  .then(res => {
    if (!res.ok) {
      throw new Error("Failed to fetch workouts");
    }
    return res.json();
  })
  .then(workouts => {
    console.log("Workouts loaded:", workouts);
    renderWorkoutHistory(workouts);
    updateStatsFromDB(workouts);
  })
  .catch(err => {
    console.error("Failed to load workouts", err);
  });

  document
  .getElementById("closeDemoBtn")
  ?.addEventListener("click", closeExerciseDemo);

  setupTabs();
  setupCustomExerciseSelect();
  setupLogout();
  setupStartCoachButton();
  setupPoseDetector();
  loadProfile();
  loadEmptyState();
  fetchUserSummary();
}

async function fetchUserSummary() {
  try {
    const res = await fetch(`/api/users/${currentUser._id}`);
    const data = await res.json();

    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    const userGoal = document.getElementById("userGoal");
    const userBodyType = document.getElementById("userBodyType");

    if (userName) userName.textContent = data.user?.name || "User";
    if (userEmail) userEmail.textContent = data.user?.email || "";
    if (userGoal) userGoal.textContent = prettifyGoal(data.user?.fitnessGoal);
    if (userBodyType) userBodyType.textContent = prettifyBodyType(data.user?.bodyType);

    const totalWorkouts = document.getElementById("totalWorkouts");
    const totalCalories = document.getElementById("totalCalories");

    if (totalWorkouts) totalWorkouts.textContent = data.totalWorkouts || 0;
    if (totalCalories) totalCalories.textContent = Math.round(data.totalCalories || 0);

    cachedWorkouts = Array.isArray(data.workouts) ? data.workouts : [];
    console.log("Workouts loaded:", cachedWorkouts.length);

    updateAllProgress();
  } catch (err) {
    console.error("fetchUserSummary error:", err);
  }
}

/* ===================== PROFILE ===================== */
function loadProfile() {
  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const userGoal = document.getElementById("userGoal");
  const userBodyType = document.getElementById("userBodyType");

  const user = currentUser.user || currentUser;

  if (userName) userName.textContent = user.name || "User";
  if (userEmail) userEmail.textContent = user.email || "—";
  if (userGoal) userGoal.textContent = prettifyGoal(user.fitnessGoal);
  if (userBodyType) userBodyType.textContent = prettifyBodyType(user.bodyType);
}

function prettifyGoal(g) {
  return {
    weight_loss: "Weight Loss",
    muscle_gain: "Muscle Gain",
    endurance: "Endurance",
    flexibility: "Flexibility",
  }[g] || "General Fitness";
}

function prettifyBodyType(b) {
  return {
    ectomorph: "Ectomorph (Lean)",
    mesomorph: "Mesomorph (Athletic)",
    endomorph: "Endomorph (Curvy)",
  }[b] || "Not specified";
}

function showExerciseDemo(exerciseKey) {
  const modal = document.getElementById("exerciseDemoModal");
  const video = document.getElementById("demoVideo");
  const title = document.getElementById("demoTitle");

  const src = exerciseDemoVideos[exerciseKey];
  if (!src) return;

  title.textContent = "How to do " + capitalize(exerciseKey);
  video.src = src;

  modal.classList.remove("hidden");
}

function closeExerciseDemo() {
  const modal = document.getElementById("exerciseDemoModal");
  const video = document.getElementById("demoVideo");

  video.pause();
  video.src = "";
  modal.classList.add("hidden");
}

/* ===================== TABS ===================== */
function setupTabs() {
  const btns = document.querySelectorAll(".tab-btn");
  const sections = document.querySelectorAll(".tab-section");

  if (btns.length === 0) {
    console.warn("Pose buttons not found!");
    return;
  }

  console.log("Tabs setup complete");

  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;

      btns.forEach(b => b.classList.remove("active"));
      sections.forEach(s => s.classList.remove("active"));

      btn.classList.add("active");
      const section = document.getElementById(tab);
      if (section) {
        section.classList.add("active");
        if (tab === "tab-progress") {
          updateAllProgress();
        }
      }
    });
  });
}


/* ===================== LOGOUT ===================== */
function setupLogout() {
  const logoutBtn = document.querySelector(".btn-logout");
  if (!logoutBtn) {
    console.warn("Logout button not found!");
    return;
  }

  logoutBtn.addEventListener("click", () => {
    console.log("Logging out...");
    localStorage.removeItem("mmUser");
    window.location.href = "main.html";
  });

  console.log("Logout setup complete");
}

/* ===================== START AI COACH ===================== */
function setupStartCoachButton() {
  const startCoachBtn = document.querySelector(".start-coach-btn");
  const exerciseSelect = document.getElementById("exerciseSelect");

  if (!startCoachBtn) {
    console.warn("Start coach button not found!");
    return;
  }

  startCoachBtn.addEventListener("click", () => {
  const selectedInput = document.getElementById("selectedExerciseInput");

  if (!selectedInput || !selectedInput.value) {
    alert("Please select an exercise first");
    return;
  }

  currentPoseExercise = selectedInput.value.toLowerCase();

  const coachExerciseTitle = document.getElementById("coachExerciseTitle");
  if (coachExerciseTitle) {
    coachExerciseTitle.textContent = "AI Coach - " + selectedInput.value;
  }

  const coachTabBtn = document.querySelector('[data-tab="tab-coach"]');
  if (coachTabBtn) coachTabBtn.click();
});

  console.log("Start coach button setup complete");
}

/* ===================== POSE SETUP ===================== */

async function initPoseDetector() {
  if (!window.poseDetection || !window.tf) {
    console.error("poseDetection or tf not available");
    return;
  }

  console.log("Initializing MoveNet detector...");

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
    }
  );

  console.log("Pose detector setup complete");
}

function setupPoseDetector() {
  poseVideo = document.getElementById("poseVideo");
  poseCanvas = document.getElementById("poseCanvas");
  const startPoseBtn = document.getElementById("startPoseBtn");
  const stopPoseBtn = document.getElementById("stopPoseBtn");

  if (!poseVideo || !poseCanvas) {
    console.warn("Pose video/canvas not found!");
    return;
  }

  if (!startPoseBtn || !stopPoseBtn) {
    console.warn("Pose buttons not found!");
    return;
  }

  poseCtx = poseCanvas.getContext("2d");
  startPoseBtn.addEventListener("click", startCamera);
  stopPoseBtn.addEventListener("click", stopCamera);

  console.log("Pose detector setup complete");
}

/* ===================== CAMERA ===================== */
async function startCamera() {
  stopDetection = false;
  repCount = 0;
  liveCaloriesValue = 0;
  lastPhase = "up";
  lastRepTime = 0;
  squatPhase = "up";
  jumpingPhase = "in";
  plankStartTime = null;
  plankSeconds = 0;
  formScoreValue = 100;
  lastCorrectionTime = 0;
  voiceEnabled = true;
  lastSpokenMessage = "";
  lastVoiceTime = 0;

  const startPoseBtn = document.getElementById("startPoseBtn");
  const stopPoseBtn = document.getElementById("stopPoseBtn");
  const poseStatus = document.getElementById("poseStatus");

  if (startPoseBtn) startPoseBtn.disabled = true;
  if (stopPoseBtn) stopPoseBtn.disabled = false;
  if (poseStatus) poseStatus.textContent = "ðŸ”„ Initializing camera...";

  console.log("Starting camera...");

  try {
    poseStream = await navigator.mediaDevices.getUserMedia({ video: true });
    poseVideo.srcObject = poseStream;

    poseVideo.onloadedmetadata = async () => {
      poseVideo.play();
      poseCanvas.width = poseVideo.videoWidth;
      poseCanvas.height = poseVideo.videoHeight;

      console.log("Camera started, loading AI model...");

      // Check if poseDetection is available
      if (typeof poseDetection !== "undefined" && poseDetection.createDetector) {
        try {
          detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
          );
          if (poseStatus) poseStatus.textContent = "AI Coach running... Start moving!";
          console.log("AI model loaded");
          runPoseLoop();
        } catch (err) {
          console.error("âŒ Error loading AI model:", err);
          if (poseStatus) poseStatus.textContent = "AI model failed to load";
        }
      } else {
        if (poseStatus) poseStatus.textContent = "AI library not loaded. Install TensorFlow & MoveNet";
        console.error(" poseDetection library not available!");
      }
      detector = await poseDetection.createDetector(
  poseDetection.SupportedModels.MoveNet,
  {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
  }
);

    };
  } catch (err) {
    if (poseStatus) poseStatus.textContent = "Camera unavailable. Check permissions.";
    console.error("Camera error:", err);
    voiceEnabled = false;
  }
}

async function stopCamera() {
  stopDetection = true;
  voiceEnabled = false;
  window.speechSynthesis.cancel();
  lastSpokenMessage = "";
  const startPoseBtn = document.getElementById("startPoseBtn");
  const stopPoseBtn = document.getElementById("stopPoseBtn");
  const poseStatus = document.getElementById("poseStatus");

  if (startPoseBtn) startPoseBtn.disabled = false;
  if (stopPoseBtn) stopPoseBtn.disabled = true;
  if (poseStatus) poseStatus.textContent = "Workout stopped";

  if (poseStream) {
    poseStream.getTracks().forEach(t => t.stop());
    poseStream = null;
  }

  console.log("ðŸ›‘ Camera stopped");

  if (repCount > 0 || plankSeconds > 0) {
    saveAICoachWorkout();
    const repsOrTime = currentPoseExercise.includes("plank")
      ? `${plankSeconds} seconds`
      : repCount;
    const coachExerciseTitle = document.getElementById("coachExerciseTitle");
    showSessionSummary(
      coachExerciseTitle ? coachExerciseTitle.textContent.replace(" AI Coach ", "") : "Exercise",
      repsOrTime,
      liveCaloriesValue
    );
  }
  await saveWorkoutToDB();
}

async function saveWorkoutToDB() {
  if (!currentUser || !currentUser._id) {
    console.error("❌ Invalid user. Cannot save workout.");
    return;
  }

  if (repCount === 0 && plankSeconds === 0) {
    console.warn("⚠️ No reps/time recorded");
    return;
  }

  const payload = {
    userId: currentUser._id,                 // ✅ MUST be _id
    exerciseName: currentPoseExercise,       // e.g. "squats"
    sets: Number(setsInput?.value || 1),     // ✅ ensure number
    reps: Number(repCount),
    calories: Number(Math.round(liveCaloriesValue)),
    notes: notesInput?.value || ""
  };

  console.log("📤 Sending workout payload:", payload);

  try {
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Backend rejected save:", data);
      return;
    }

    console.log("✅ Workout saved to DB:", data);
  } catch (err) {
    console.error("❌ Save failed:", err);
  }
}

/* ===================== POSE LOOP ===================== */
  async function runPoseLoop() {
  if (stopDetection || !detector || !poseVideo) return;

  try {
    const poses = await detector.estimatePoses(poseVideo);

    poseCtx.clearRect(0, 0, poseCanvas.width, poseCanvas.height);

    if (poses && poses.length > 0) {
      const kp = poses[0].keypoints;

      drawSkeleton(kp); // ✅ ONLY THIS

      if (currentPoseExercise.includes("push")) {
        detectPushup(kp);
      } else if (currentPoseExercise.includes("squat")) {
        detectSquat(kp);
      } else if (currentPoseExercise.includes("jump")) {
        detectJumpingJacks(kp);
      } else if (currentPoseExercise.includes("plank")) {
        detectPlank(kp);
      }
    }
  } catch (err) {
    console.error("Pose loop error:", err);
  }

  requestAnimationFrame(runPoseLoop);
}

/* ===================== REP DETECTION ===================== */
function detectPushup(kp) {
  const shoulder = kp.find(k => k.name === "left_shoulder");
  const elbow = kp.find(k => k.name === "left_elbow");
  const wrist = kp.find(k => k.name === "left_wrist");
  
  if (
  !shoulder || !elbow || !wrist ||
  shoulder.score < 0.6 ||
  elbow.score < 0.6 ||
  wrist.score < 0.6
) {
  return; // 🚫 ignore noisy frame
}

  const angle = getAngle(shoulder, elbow, wrist);
  const now = Date.now();

  if (angle < 85 && lastPhase === "up") {
    lastPhase = "down";
  }

  if (angle > 165 && lastPhase === "down") {
    if (now - lastRepTime > 800) {
      repCount++;
      liveCaloriesValue += 0.6;
      updateCoachStats();
      updateAISuggestionsLive();
      lastRepTime = now;
    }
    lastPhase = "up";
  }
}

function getAngle(a, b, c) {
  const AB = Math.hypot(a.x - b.x, a.y - b.y);
  const BC = Math.hypot(b.x - c.x, b.y - c.y);
  const AC = Math.hypot(a.x - c.x, a.y - c.y);
  const denom = 2 * AB * BC;
  if (denom === 0) return 0;
  return (Math.acos((AB * AB + BC * BC - AC * AC) / denom) * 180) / Math.PI;
}

function detectSquat(kp) {
  const hip = kp.find(k => k.name === "left_hip");
  const knee = kp.find(k => k.name === "left_knee");
  const ankle = kp.find(k => k.name === "left_ankle");

  if (
  !hip || !knee || !ankle ||
  hip.score < 0.6 ||
  knee.score < 0.6 ||
  ankle.score < 0.6
) {
  return; // 🚫 ignore noisy frames
}

  const angle = getAngle(hip, knee, ankle);
  const now = Date.now();

  if (angle < 100 && squatPhase === "up") {
    squatPhase = "down";
  }

  if (angle > 170 && squatPhase === "down") {
    if (now - lastRepTime > 800) {
      repCount++;
      liveCaloriesValue += 0.5;
      updateCoachStats();
      updateAISuggestionsLive();
      lastRepTime = now;
    }
    squatPhase = "up";
  }
}

function detectJumpingJacks(kp) {
  const lw = kp.find(k => k.name === "left_wrist");
  const rw = kp.find(k => k.name === "right_wrist");
  const la = kp.find(k => k.name === "left_ankle");
  const ra = kp.find(k => k.name === "right_ankle");

  if (
  !lw || !rw || !la || !ra ||
  lw.score < 0.6 ||
  rw.score < 0.6 ||
  la.score < 0.6 ||
  ra.score < 0.6
) {
  return; // 🚫 ignore noisy frames
}

  const handDist = Math.abs(lw.x - rw.x);
  const legDist = Math.abs(la.x - ra.x);
  const now = Date.now();

  if (handDist > 210 && legDist > 190 && jumpingPhase === "in") {
    jumpingPhase = "out";
  }

  if (handDist < 95 && legDist < 95 && jumpingPhase === "out") {
    if (now - lastRepTime > 700) {
      repCount++;
      liveCaloriesValue += 0.4;
      updateCoachStats();
      updateAISuggestionsLive();
      lastRepTime = now;
    }
    jumpingPhase = "in";
  }
}

function detectPlank(kp) {
  const shoulder = kp.find(k => k.name === "left_shoulder");
  const hip = kp.find(k => k.name === "left_hip");
  const ankle = kp.find(k => k.name === "left_ankle");

  if (!shoulder || !hip || !ankle) return;

  const angle = getAngle(shoulder, hip, ankle);

  if (angle > 160) {
    if (!plankStartTime) {
      plankStartTime = Date.now();
    }
    plankSeconds = Math.floor((Date.now() - plankStartTime) / 1000);
    liveCaloriesValue = plankSeconds * 0.08;
    updateCoachStats();
    updateAISuggestionsLive();
  } else {
    plankStartTime = null;
  }
}

function drawSkeleton(keypoints) {
  const connections = [
    ["left_shoulder", "left_elbow"],
    ["left_elbow", "left_wrist"],
    ["right_shoulder", "right_elbow"],
    ["right_elbow", "right_wrist"],
    ["left_hip", "left_knee"],
    ["left_knee", "left_ankle"],
    ["right_hip", "right_knee"],
    ["right_knee", "right_ankle"],
  ];

  poseCtx.strokeStyle = "#00ff00";
  poseCtx.lineWidth = 2;

  connections.forEach(([start, end]) => {
    const s = keypoints.find(k => k.name === start);
    const e = keypoints.find(k => k.name === end);

    if (s && e && s.score > 0.15 && e.score > 0.15)
    {
      poseCtx.beginPath();
      poseCtx.moveTo(s.x, s.y);
      poseCtx.lineTo(e.x, e.y);
      poseCtx.stroke();
    }
  });

  poseCtx.fillStyle = "#ff0000";
  keypoints.forEach(kp => {
     if (kp.score > 0.15)
 {
      poseCtx.beginPath();
      poseCtx.arc(kp.x, kp.y, 5, 0, Math.PI * 2);
      poseCtx.fill();
    }
  });
}

function updateAISuggestionsLive() {
  const box = document.getElementById("aiSuggestions");
  if (!box) return;

  if (repCount < 5) {
    box.textContent = "Start slow and focus on form 🧘";
    speak("Focus on form");
  } else if (repCount < 10) {
    box.textContent = "Good pace! Keep breathing steady 💨";
    speak("Good pace");
  } else {
    box.textContent = "Great work! Maintain posture 🔥";
    speak("Maintain posture");
  }
}

/* ===================== COACH UI ===================== */
function updateCoachStats() {
  const repsEl = document.getElementById("liveReps");
  const caloriesEl = document.getElementById("liveCalories");
  const formScore = document.getElementById("formScore");

  if (repsEl) repsEl.textContent = repCount;
  if (caloriesEl) caloriesEl.textContent = liveCaloriesValue.toFixed(1);
  if (formScore) formScore.textContent = formScoreValue;
}

function speak(message) {
  if (!voiceEnabled || !("speechSynthesis" in window)) return;

  const now = Date.now();
  if (now - lastVoiceTime < voiceCooldown) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 1.2;
  window.speechSynthesis.speak(utterance);
  lastVoiceTime = now;
}

/* ===================== SAVE WORKOUT ===================== */
function saveAICoachWorkout() {
  const workout = {
    userId: currentUser._id,
    exerciseName: currentPoseExercise || "AI Workout",
    sets: 1,
    reps: repCount || plankSeconds,
    calories: liveCaloriesValue,
    date: new Date(),
    notes: "AI Coach Session",
  };

  cachedWorkouts.push(workout);
  updateAllProgress();
  console.log("Workout saved:", workout);
}

/* ===================== SESSION SUMMARY ===================== */
function showSessionSummary(exercise, reps, calories) {
  const box = document.getElementById("sessionSummary");
  const ex = document.getElementById("summaryExercise");
  const repsEl = document.getElementById("summaryReps");
  const calEl = document.getElementById("summaryCalories");

  if (!box) return;

  if (ex) ex.textContent = "Exercise: " + exercise;
  if (repsEl) repsEl.textContent = "Reps / Time: " + reps;
  if (calEl) calEl.textContent = "Calories: " + calories.toFixed(1) + " kcal";

  box.classList.remove("hidden");
}

function hideSessionSummary() {
  const box = document.getElementById("sessionSummary");
  if (box) box.classList.add("hidden");
}

/* ===================== PROGRESS ===================== */
function loadEmptyState() {
  renderWorkoutTable([]);
  updateAllProgress();
}

function updateAllProgress() {
  const totalWorkouts = document.getElementById("totalWorkouts");
  const totalCalories = document.getElementById("totalCalories");

  if (totalWorkouts) totalWorkouts.textContent = cachedWorkouts.length;
  if (totalCalories) {
    const total = cachedWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
    totalCalories.textContent = Math.round(total);
  }

  updateProgressStats();
  renderWorkoutTable(cachedWorkouts);
}

function updateProgressStats() {
  const stats = document.querySelectorAll(".stat-card p:last-child");
  
  if (stats[0]) stats[0].textContent = cachedWorkouts.length;
  if (stats[1]) {
    const total = cachedWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
    stats[1].textContent = Math.round(total);
  }
  if (stats[2]) stats[2].textContent = "5";
  if (stats[3]) {
    const percentage = (cachedWorkouts.length / 5) * 100;
    stats[3].textContent = Math.round(Math.min(percentage, 100)) + "%";
  }

  const progressBar = document.querySelector(".progress-bar-inner");
  if (progressBar) {
    const percentage = (cachedWorkouts.length / 5) * 100;
    progressBar.style.width = Math.min(percentage, 100) + "%";
  }
}

function renderWorkoutTable(workouts) {
  const tbody = document.querySelector("table tbody");
  if (!tbody) return;

  if (workouts.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="empty-row">No workouts yet. Start exercising!</td></tr>';
    return;
  }

  tbody.innerHTML = workouts
    .map(
      w =>
        `<tr>
      <td>${formatDate(w.date)}</td>
      <td>${w.exerciseName}</td>
      <td>${w.reps || 0}</td>
      <td>${Math.round(w.calories || 0)} kcal</td>
    </tr>`
    )
    .join("");
}

function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

console.log(" Dashboard JS loaded!");