// This content script will be injected into web pages
// It can access and manipulate the DOM of the page

// Function to extract all visible text from the page
function extractPageText() {
  return document.body.innerText;
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractText") {
    const text = extractPageText();
    sendResponse({ text });
  }
  return true; // Required to use sendResponse asynchronously
});

console.log("Focus Timer content script loaded");
