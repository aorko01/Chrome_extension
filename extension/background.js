// Background script for Focus Timer extension

// Timer state variables
let timer = null;
let contentFetchTimer = null;
let timeLeft = 0;
let currentSession = 1;
let totalSessions = 1;
let isRunning = false;
let studyTopic = "";

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getActiveTabContent") {
    getActiveTabContent()
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({ error: error.message });
      });
    return true; // Keep the message channel open for async response
  }

  // Handle timer start request
  else if (request.action === "startTimer") {
    startTimer(request.duration, request.sessions, request.topic);
    sendResponse({ success: true, isRunning: isRunning });
    return true;
  }

  // Handle timer reset request
  else if (request.action === "resetTimer") {
    resetTimer();
    sendResponse({ success: true, isRunning: isRunning });
    return true;
  }

  // Handle timer status request
  else if (request.action === "getTimerStatus") {
    sendResponse({
      isRunning: isRunning,
      timeLeft: timeLeft,
      currentSession: currentSession,
      totalSessions: totalSessions,
      studyTopic: studyTopic,
    });
    return true;
  }
});

// Start the timer
function startTimer(duration, sessions, topic) {
  // Clear any existing timers
  if (timer) clearInterval(timer);
  if (contentFetchTimer) clearInterval(contentFetchTimer);

  // Set timer state
  timeLeft = duration * 60;
  totalSessions = sessions;
  currentSession = 1;
  studyTopic = topic;
  isRunning = true;

  console.log(
    `Starting timer: ${duration} minutes, ${sessions} sessions, Topic: ${topic}`
  );

  // Start content fetch timer (every 30 seconds)
  fetchAndPrintWebpageContent();
  contentFetchTimer = setInterval(fetchAndPrintWebpageContent, 30000);

  // Start the main countdown timer
  timer = setInterval(() => {
    timeLeft--;

    // Send timer update to popup if it's open
    chrome.runtime
      .sendMessage({
        action: "timerUpdate",
        timeLeft: timeLeft,
        minutes: Math.floor(timeLeft / 60),
        seconds: timeLeft % 60,
      })
      .catch(() => {}); // Ignore errors if popup is closed

    if (timeLeft <= 0) {
      clearInterval(timer);

      if (currentSession < totalSessions) {
        // Move to next session
        currentSession++;
        timeLeft = duration * 60;

        // Notify popup if it's open
        chrome.runtime
          .sendMessage({
            action: "sessionUpdate",
            currentSession: currentSession,
            totalSessions: totalSessions,
          })
          .catch(() => {}); // Ignore errors if popup is closed

        // Restart timer for the next session
        timer = setInterval(() => {
          timeLeft--;

          chrome.runtime
            .sendMessage({
              action: "timerUpdate",
              timeLeft: timeLeft,
              minutes: Math.floor(timeLeft / 60),
              seconds: timeLeft % 60,
            })
            .catch(() => {});

          if (timeLeft <= 0) {
            clearInterval(timer);

            if (currentSession < totalSessions) {
              currentSession++;
              timeLeft = duration * 60;

              // Notify popup if it's open
              chrome.runtime
                .sendMessage({
                  action: "sessionUpdate",
                  currentSession: currentSession,
                  totalSessions: totalSessions,
                })
                .catch(() => {});

              // Continue to next session (restart the timer)
              startTimer(duration, totalSessions, studyTopic);
            } else {
              // All sessions complete
              completeAllSessions();
            }
          }
        }, 1000);
      } else {
        // All sessions complete
        completeAllSessions();
      }
    }
  }, 1000);
}

// Reset the timer
function resetTimer() {
  if (timer) clearInterval(timer);
  if (contentFetchTimer) clearInterval(contentFetchTimer);

  isRunning = false;
  timeLeft = 0;
  currentSession = 1;

  console.log("Focus session ended - webpage content updates stopped");
}

// All sessions completed
function completeAllSessions() {
  clearInterval(timer);
  clearInterval(contentFetchTimer);
  isRunning = false;
  console.log("All focus sessions completed - webpage content updates stopped");
}

// Function to fetch and print webpage content
function fetchAndPrintWebpageContent() {
  getActiveTabContent()
    .then((response) => {
      if (response && !response.error) {
        console.log(
          "\n------- CONTENT UPDATE (" +
            new Date().toLocaleTimeString() +
            ") -------"
        );
        console.log("Active page URL:", response.url);
        console.log("Active page title:", response.title);

        // Print some of the extracted content
        if (response.content) {
          console.log(
            "Page meta description:",
            response.content.metaDescription || "Not available"
          );

          if (
            response.content.headings &&
            response.content.headings.length > 0
          ) {
            console.log(
              "Page headings:",
              response.content.headings.map((h) => h.text).join(", ")
            );
          } else {
            console.log("Page headings: None found");
          }

          if (response.content.fullPageText) {
            console.log(
              "Page text excerpt:",
              response.content.fullPageText.substring(0, 200) + "..."
            );
          } else {
            console.log("Page text: No text content found");
          }
        } else {
          console.log("No content could be extracted from the page");
        }
        console.log("-------------------------------------------\n");
      } else {
        console.error(
          "Error getting page content:",
          response?.error || "Unknown error"
        );
      }
    })
    .catch((error) => {
      console.error("Error in fetchAndPrintWebpageContent:", error);
    });
}

// Function to get content from the active tab
async function getActiveTabContent() {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      return { error: "No active tab found" };
    }

    // Try to execute script in the tab
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractPageContent,
      });

      return {
        url: tab.url,
        title: tab.title,
        content: results[0].result,
      };
    } catch (scriptError) {
      return {
        url: tab.url,
        title: tab.title,
        error: "Could not extract content: " + scriptError.message,
        fallbackMessage:
          "Content extraction failed. The page might be restricted.",
      };
    }
  } catch (error) {
    return { error: "Error accessing tab: " + error.message };
  }
}

// Function to be injected into the page
function extractPageContent() {
  try {
    // Extract all headings (h1-h6)
    const headings = [];
    const headingElements = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    headingElements.forEach((heading) => {
      const text = heading.innerText.trim();
      if (text) {
        headings.push({
          type: heading.tagName.toLowerCase(),
          text: text,
        });
      }
    });

    // Extract all paragraphs
    const paragraphs = [];
    const paragraphElements = document.querySelectorAll("p");
    paragraphElements.forEach((p) => {
      const text = p.innerText.trim();
      if (text && text.length > 10) {
        // Filter out very short paragraphs
        paragraphs.push(text);
      }
    });

    // Get meta information
    const metaDescription =
      document.querySelector('meta[name="description"]')?.content || "";

    // Get main article content if available
    const articleElement =
      document.querySelector("article") ||
      document.querySelector(".article") ||
      document.querySelector(".post") ||
      document.querySelector("main");

    const articleText = articleElement ? articleElement.innerText : "";

    // Return structured data
    return {
      metaDescription,
      headings: headings,
      paragraphs: paragraphs,
      articleContent: articleText,
      fullPageText: document.body.innerText.substring(0, 5000), // Limit to 5000 chars
    };
  } catch (error) {
    return { extractionError: error.message };
  }
}
