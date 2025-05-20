# Focus Timer Backend

This is the backend server for the Focus Timer Chrome Extension. It provides topic relevance analysis using the all-MiniLM-L6-v2 model.

## Setup Instructions

1. Create a Python virtual environment:

   ```
   python -m venv venv
   ```

2. Activate the virtual environment:

   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

3. Install the required packages:

   ```
   pip install -r requirements.txt
   ```

4. Run the server:
   ```
   python app.py
   ```

The server will run on `http://localhost:5000`.

## API Endpoints

### POST /api/analyze-relevance

Analyzes if the provided webpage content is relevant to the study topic.

**Request Body:**

```json
{
  "studyTopic": "Machine Learning",
  "pageContent": "Text content from the webpage...",
  "pageUrl": "https://example.com",
  "pageTitle": "Example Page Title"
}
```

**Response:**

```json
{
  "isRelevant": true,
  "confidenceScore": 0.85,
  "message": "Highly relevant to your study topic!",
  "similarity": 0.85
}
```
