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

              // Restart timer for next session
              timer = setInterval(() => {
                timeLeft--;
                // Existing timer updates...
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
                  completeAllSessions();
                }
              }, 1000);
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

        // Extract content that would be relevant for ML classification
        let relevantContent = {
          url: response.url,
          title: response.title,
          studyTopic: studyTopic,
          extractedText: "",
        };

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
            // Add headings to relevant content
            relevantContent.headings = response.content.headings.map(
              (h) => h.text
            );
          } else {
            console.log("Page headings: None found");
          }

          // Add paragraphs if available
          if (
            response.content.paragraphs &&
            response.content.paragraphs.length > 0
          ) {
            console.log(
              "Key paragraphs:",
              response.content.paragraphs
                .slice(0, 3)
                .join(" ")
                .substring(0, 200) + "..."
            );
            relevantContent.paragraphs = response.content.paragraphs;
          }

          // Include article content if available as it's highly relevant
          if (response.content.articleContent) {
            console.log(
              "Article content excerpt:",
              response.content.articleContent.substring(0, 200) + "..."
            );
            relevantContent.articleContent = response.content.articleContent;
          }

          if (response.content.fullPageText) {
            console.log(
              "Page text excerpt:",
              response.content.fullPageText.substring(0, 200) + "..."
            );
            // Use fullPageText as a fallback if no specific content is available
            if (
              !relevantContent.articleContent &&
              !relevantContent.paragraphs
            ) {
              relevantContent.extractedText = response.content.fullPageText;
            }
          } else {
            console.log("Page text: No text content found");
          }

          // Combine all text content for analysis
          relevantContent.extractedText = [
            relevantContent.title,
            response.content.metaDescription,
            ...(relevantContent.headings || []),
            ...(relevantContent.paragraphs || []),
            relevantContent.articleContent || relevantContent.extractedText,
          ]
            .filter(Boolean)
            .join(" ");

          // Send the extracted content to the backend for topic relevance analysis
          checkTopicRelevance(relevantContent);
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

    // Extract all paragraphs - now with more content and better filtering
    const paragraphs = [];
    const paragraphElements = document.querySelectorAll(
      "p, li, td, div.content, div.text"
    );
    paragraphElements.forEach((p) => {
      const text = p.innerText.trim();
      // Check for meaningful content with enough length and not too much technical junk
      if (text && text.length > 20 && !/^\s*\{.*\}\s*$/.test(text)) {
        paragraphs.push(text);
      }
    });

    // Extract important keywords using meta tags
    const keywords =
      document.querySelector('meta[name="keywords"]')?.content || "";

    // Get meta information
    const metaDescription =
      document.querySelector('meta[name="description"]')?.content || "";

    // Get main article content if available - extended search for content containers
    const articleElement =
      document.querySelector("article") ||
      document.querySelector(".article") ||
      document.querySelector(".post") ||
      document.querySelector("main") ||
      document.querySelector("#content") ||
      document.querySelector(".content") ||
      document.querySelector(".main-content");

    const articleText = articleElement ? articleElement.innerText : "";

    // Get code blocks that might be relevant for programming topics
    const codeBlocks = [];
    const codeElements = document.querySelectorAll("pre, code, .code");
    codeElements.forEach((code) => {
      const text = code.innerText.trim();
      if (text && text.length > 20) {
        codeBlocks.push(text);
      }
    });

    // Extract text from important sections like "Summary", "Abstract", "Introduction"
    const sectionElements = document.querySelectorAll(
      'section, div[id*="summary"], div[id*="abstract"], div[id*="introduction"]'
    );
    const importantSections = Array.from(sectionElements)
      .map((section) => section.innerText.trim())
      .filter((text) => text.length > 30);

    // Return structured data
    return {
      metaDescription,
      keywords,
      headings: headings,
      paragraphs: paragraphs,
      importantSections,
      codeBlocks,
      articleContent: articleText,
      fullPageText: document.body.innerText.substring(0, 10000), // Increased limit to 10000 chars
      documentClasses: Array.from(document.body.classList),
      pageType:
        document.querySelector('meta[property="og:type"]')?.content || "",
    };
  } catch (error) {
    return { extractionError: error.message };
  }
}

// Function to send content to backend for topic relevance analysis
async function checkTopicRelevance(contentData) {
  if (!studyTopic || !contentData.extractedText) {
    console.log("No study topic or content available for analysis");
    return;
  }

  try {
    console.log("Sending content to backend for topic relevance analysis...");
    console.log(`Study topic: "${studyTopic}"`);
    console.log(
      `Content length: ${contentData.extractedText.length} characters`
    );

    // Sample of content being sent for analysis (first 100 chars)
    console.log(
      `Content sample: "${contentData.extractedText.substring(0, 100)}..."`
    );

    // Create the request payload
    const payload = {
      studyTopic: studyTopic,
      pageContent: contentData.extractedText,
      pageUrl: contentData.url,
      pageTitle: contentData.title,
    };

    // TODO: Replace with your actual backend URL
    const backendUrl = "http://localhost:5000/api/analyze-relevance";

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();

      console.log("Topic relevance analysis result:", result);

      // Update the UI with the result
      chrome.runtime
        .sendMessage({
          action: "topicRelevanceUpdate",
          isRelevant: result.isRelevant,
          confidenceScore: result.confidenceScore,
          message: result.message,
        })
        .catch(() => {}); // Ignore errors if popup is closed
    } catch (error) {
      console.error("Error sending data to backend:", error);

      // For development: simulate backend response
      // Remove this in production
      simulateBackendAnalysis(contentData);
    }
  } catch (error) {
    console.error("Error in checkTopicRelevance:", error);
  }
}

// Temporary function to simulate backend analysis during development
// This function will be removed once the backend is set up
function simulateBackendAnalysis(contentData) {
  console.log("Simulating backend analysis with all-MiniLM-L6-v2 model");

  // Check if the content contains the study topic words as a simple simulation
  const contentLower = contentData.extractedText.toLowerCase();
  const topicLower = studyTopic.toLowerCase();

  // Split topic into keywords
  const topicKeywords = topicLower
    .split(/\s+/)
    .filter((word) => word.length > 3); // Filter out small words

  // Count how many keywords are in the content
  const matchedKeywords = topicKeywords.filter((keyword) =>
    contentLower.includes(keyword)
  );

  // Calculate a simple relevance score
  const relevanceScore =
    topicKeywords.length > 0
      ? matchedKeywords.length / topicKeywords.length
      : 0;

  // Simulate the response
  const simulatedResponse = {
    isRelevant: relevanceScore > 0.3, // Threshold for relevance
    confidenceScore: relevanceScore,
    message:
      relevanceScore > 0.7
        ? "Highly relevant to your study topic!"
        : relevanceScore > 0.3
        ? "Somewhat relevant to your study topic"
        : "Not very relevant to your study topic",
  };

  console.log("Simulated analysis result:", simulatedResponse);

  // Send the simulated result to the popup
  chrome.runtime
    .sendMessage({
      action: "topicRelevanceUpdate",
      isRelevant: simulatedResponse.isRelevant,
      confidenceScore: simulatedResponse.confidenceScore,
      message: simulatedResponse.message,
    })
    .catch(() => {}); // Ignore errors if popup is closed
}
