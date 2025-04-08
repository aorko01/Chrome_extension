document.addEventListener("DOMContentLoaded", () => {
  const studyTopicInput = document.getElementById("studyTopic");
  const pomodoroDurationSelect = document.getElementById("pomodoroDuration");
  const sessionCountSelect = document.getElementById("sessionCount");
  const minutesDisplay = document.getElementById("minutes");
  const secondsDisplay = document.getElementById("seconds");
  const currentSessionDisplay = document.getElementById("currentSession");
  const totalSessionsDisplay = document.getElementById("totalSessions");
  const startButton = document.getElementById("startButton");
  const resetButton = document.getElementById("resetButton");
  const themeToggle = document.getElementById("themeToggle");

  let timer;
  let timeLeft;
  let currentSession = 1;
  let totalSessions = 1;
  let isRunning = false;

  // Theme handling
  function updateThemeIcon(theme) {
    // Using Unicode code points for better browser compatibility
    themeToggle.innerHTML = theme === "light" ? "&#127769;" : "&#9728;";
  }

  function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme);
  }

  // Update timer display
  function updateTimerDisplay(minutes, seconds) {
    minutesDisplay.textContent = minutes.toString().padStart(2, "0");
    secondsDisplay.textContent = seconds.toString().padStart(2, "0");
  }

  // Start the timer
  function startTimer() {
    if (isRunning) return;

    const duration = parseInt(pomodoroDurationSelect.value);
    timeLeft = duration * 60;
    totalSessions = parseInt(sessionCountSelect.value);
    currentSession = 1;

    updateTimerDisplay(duration, 0);
    currentSessionDisplay.textContent = currentSession;
    totalSessionsDisplay.textContent = totalSessions;

    isRunning = true;
    startButton.disabled = true;
    resetButton.disabled = false;

    timer = setInterval(() => {
      timeLeft--;
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;

      updateTimerDisplay(minutes, seconds);

      if (timeLeft <= 0) {
        clearInterval(timer);
        if (currentSession < totalSessions) {
          currentSession++;
          currentSessionDisplay.textContent = currentSession;
          startTimer();
        } else {
          isRunning = false;
          startButton.disabled = false;
          resetButton.disabled = true;
        }
      }
    }, 1000);
  }

  // Reset the timer
  function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    const duration = parseInt(pomodoroDurationSelect.value);
    updateTimerDisplay(duration, 0);
    currentSession = 1;
    currentSessionDisplay.textContent = currentSession;
    startButton.disabled = false;
    resetButton.disabled = true;
  }

  // Event listeners
  startButton.addEventListener("click", startTimer);
  resetButton.addEventListener("click", resetTimer);
  themeToggle.addEventListener("click", toggleTheme);

  // Initialize theme
  initTheme();

  // Initialize timer display
  const initialDuration = parseInt(pomodoroDurationSelect.value);
  updateTimerDisplay(initialDuration, 0);
});
