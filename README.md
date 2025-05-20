# Focus Timer Chrome Extension

A Chrome extension to help users maintain focus during study sessions by monitoring webpage relevance to their current study topic using the all-MiniLM-L6-v2 model.

## Features

- Pomodoro-style timer for focused study sessions
- Webpage content analysis to determine relevance to study topic
- ML-based topic matching using all-MiniLM-L6-v2 model
- Real-time notifications when browsing irrelevant content

## Project Structure

- `extension/`: Chrome extension source code
  - `background.js`: Background service worker
  - `content.js`: Content script
  - `popup.html/js`: Extension popup UI
  - `manifest.json`: Extension manifest file
- `backend/`: Flask backend with ML model
  - `app.py`: Flask API server
  - `requirements.txt`: Python dependencies

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:

   ```
   cd backend
   ```

2. Create a Python virtual environment:

   ```
   python -m venv venv
   ```

3. Activate the virtual environment:

   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install the required packages:

   ```
   pip install -r requirements.txt
   ```

5. Run the server:
   ```
   python app.py
   ```

The backend server will run on `http://localhost:5000`.

### Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `extension` folder
4. The Focus Timer extension should now appear in your extensions list

## Usage

1. Click on the Focus Timer extension icon
2. Enter your study topic, session duration, and number of sessions
3. Click "Start Timer"
4. The extension will monitor your browsing activity and provide feedback on whether the content you're viewing is relevant to your study topic

## How It Works

1. The extension captures the content of your active browser tab
2. The content is analyzed to extract relevant text (headings, paragraphs, etc.)
3. The extracted text is sent to the backend for analysis with the all-MiniLM-L6-v2 model
4. The model calculates the semantic similarity between your study topic and the webpage content
5. The extension notifies you if the content is relevant or not
