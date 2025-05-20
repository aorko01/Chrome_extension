from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer, util
import torch
import re

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load the all-MiniLM-L6-v2 model
model = SentenceTransformer("all-MiniLM-L6-v2")


@app.route("/api/analyze-relevance", methods=["POST"])
def analyze_relevance():
    data = request.json

    if not data or not data.get("studyTopic") or not data.get("pageContent"):
        return jsonify({"error": "Missing required data"}), 400

    study_topic = data["studyTopic"]
    page_content = data["pageContent"]
    page_title = data.get("pageTitle", "")

    # Clean the content by removing extra whitespace
    page_content = clean_content(page_content)

    # Process the content - limit length to avoid issues with very large texts
    max_length = 5000
    if len(page_content) > max_length:
        # Keep the beginning and end of the content
        page_content = (
            page_content[: max_length // 2] + " ... " + page_content[-max_length // 2 :]
        )

    # Prepare inputs for the model
    # Include the page title in the content for better context
    if page_title:
        page_content = f"{page_title}\n\n{page_content}"

    # Encode the study topic and page content
    topic_embedding = model.encode(study_topic, convert_to_tensor=True)
    content_embedding = model.encode(page_content, convert_to_tensor=True)

    # Calculate cosine similarity between topic and page content
    similarity = util.pytorch_cos_sim(topic_embedding, content_embedding).item()

    # Determine if the content is relevant to the study topic
    # Adjust these thresholds based on your needs
    is_relevant = similarity > 0.3
    confidence_score = similarity

    if similarity > 0.7:
        message = "Highly relevant to your study topic!"
    elif similarity > 0.3:
        message = "Somewhat relevant to your study topic."
    else:
        message = "Not relevant to your study topic. Consider changing to a more relevant page."

    # Return the analysis results
    return jsonify(
        {
            "isRelevant": is_relevant,
            "confidenceScore": float(confidence_score),  # Convert tensor to float
            "message": message,
            "similarity": float(similarity),
        }
    )


def clean_content(text):
    """
    Clean webpage content by:
    1. Removing consecutive whitespace characters (spaces, tabs, newlines)
    2. Replacing multiple newlines with a single newline
    3. Stripping leading/trailing whitespace
    """
    # Replace multiple whitespace characters with a single space
    text = re.sub(r"\s+", " ", text)
    # Restore paragraph breaks (replace double spaces after periods with newline)
    text = re.sub(r"\.  ", ".\n", text)
    # Strip leading/trailing whitespace
    text = text.strip()
    return text


if __name__ == "__main__":
    app.run(debug=True, port=5000)
