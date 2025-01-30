document.getElementById('startButton').addEventListener('click', startStudy);
document.getElementById('themeToggle').addEventListener('change', toggleTheme);

// Function to Start Study Session
function startStudy() {
    const studyTopic = document.getElementById('studyTopic').value;
    const studyTime = parseInt(document.getElementById('studyTimer').value) * 60; // Convert to seconds

    if (isNaN(studyTime) || studyTime <= 0) {
        alert("Please enter a valid study time.");
        return;
    }

    chrome.storage.local.set({ studyTopic, studyTime, isStudying: true }, () => {
        startTimer(studyTime);
    });
}

// Timer Function
function startTimer(duration) {
    let timer = duration;
    const timerDisplay = document.getElementById('timerDisplay');

    const interval = setInterval(() => {
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;

        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        if (--timer < 0) {
            clearInterval(interval);
            timerDisplay.textContent = "Time's up!";
            chrome.storage.local.set({ isStudying: false });
            alert("Study session ended!");
        }
    }, 1000);
}

// Dark Mode Toggle
function toggleTheme() {
    const body = document.body;
    const container = document.querySelector('.container');
    const toggleLabel = document.getElementById('toggleLabel');
    
    // Toggle Dark Mode
    const isDarkMode = body.classList.toggle('dark-mode');
    container.classList.toggle('dark-mode');

    // Update Storage
    chrome.storage.local.set({ darkMode: isDarkMode });

    // Update Toggle Label
    toggleLabel.textContent = isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode";
}

// Load Theme Preference from Storage
chrome.storage.local.get('darkMode', function(data) {
    const themeToggle = document.getElementById('themeToggle');
    const toggleLabel = document.getElementById('toggleLabel');

    if (data.darkMode) {
        document.body.classList.add('dark-mode');
        document.querySelector('.container').classList.add('dark-mode');
        themeToggle.checked = true;
        toggleLabel.textContent = "☀️ Light Mode";
    } else {
        toggleLabel.textContent = "🌙 Dark Mode";
    }
});