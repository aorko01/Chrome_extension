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

  // Get the input group containers
  const inputGroups = document.querySelectorAll(".input-group");
  const studyTopicGroup = studyTopicInput.closest(".input-group");
  const durationGroup = pomodoroDurationSelect.closest(".input-group");
  const sessionCountGroup = sessionCountSelect.closest(".input-group");

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

  // Update UI based on timer state
  function updateUIFromTimerState(isRunning) {
    startButton.disabled = isRunning;
    resetButton.disabled = !isRunning;
    studyTopicInput.disabled = isRunning;
    pomodoroDurationSelect.disabled = isRunning;
    sessionCountSelect.disabled = isRunning;

    // Update the class for visual graying out
    if (isRunning) {
      studyTopicGroup.classList.add("disabled");
      durationGroup.classList.add("disabled");
      sessionCountGroup.classList.add("disabled");
    } else {
      studyTopicGroup.classList.remove("disabled");
      durationGroup.classList.remove("disabled");
      sessionCountGroup.classList.remove("disabled");
    }
  }

  // Get current timer status from background script
  function checkTimerStatus() {
    chrome.runtime.sendMessage({ action: "getTimerStatus" }, (response) => {
      if (response.isRunning) {
        // Timer is running, update UI
        updateUIFromTimerState(true);
        updateTimerDisplay(
          Math.floor(response.timeLeft / 60),
          response.timeLeft % 60
        );
        currentSessionDisplay.textContent = response.currentSession;
        totalSessionsDisplay.textContent = response.totalSessions;

        if (response.studyTopic && studyTopicInput.value === "") {
          studyTopicInput.value = response.studyTopic;
        }
      } else {
        // Timer is not running
        updateUIFromTimerState(false);
        const initialDuration = parseInt(pomodoroDurationSelect.value);
        updateTimerDisplay(initialDuration, 0);
      }
    });
  }

  // Start the timer
  function startTimer() {
    const duration = parseInt(pomodoroDurationSelect.value);
    const sessions = parseInt(sessionCountSelect.value);
    const topic = studyTopicInput.value;

    chrome.runtime.sendMessage(
      {
        action: "startTimer",
        duration: duration,
        sessions: sessions,
        topic: topic,
      },
      (response) => {
        if (response.success) {
          updateUIFromTimerState(true);
          updateTimerDisplay(duration, 0);
          currentSessionDisplay.textContent = 1;
          totalSessionsDisplay.textContent = sessions;
          console.log(`Starting focus session - Topic: ${topic}`);
        }
      }
    );
  }

  // Reset the timer
  function resetTimer() {
    chrome.runtime.sendMessage({ action: "resetTimer" }, (response) => {
      if (response.success) {
        updateUIFromTimerState(false);
        const initialDuration = parseInt(pomodoroDurationSelect.value);
        updateTimerDisplay(initialDuration, 0);
        currentSessionDisplay.textContent = 1;
        console.log("Focus session reset");
      }
    });
  }

  // Listen for updates from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "timerUpdate") {
      updateTimerDisplay(request.minutes, request.seconds);
      return true;
    } else if (request.action === "sessionUpdate") {
      currentSessionDisplay.textContent = request.currentSession;
      totalSessionsDisplay.textContent = request.totalSessions;
      return true;
    }
  });

  // Event listeners
  startButton.addEventListener("click", startTimer);
  resetButton.addEventListener("click", resetTimer);
  themeToggle.addEventListener("click", toggleTheme);

  // Initialize theme
  initTheme();

  // Check timer status (in case popup was reopened during a running timer)
  checkTimerStatus();

  // Initialize timer display
  const initialDuration = parseInt(pomodoroDurationSelect.value);
  updateTimerDisplay(initialDuration, 0);
});
