
#!/usr/bin/env python3
"""
Whisper STT Server for Talk World
Provides REST API for speech-to-text conversion
"""

import os
import io
import json
import tempfile
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import torch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Load Whisper model
print("Loading Whisper model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
model = whisper.load_model("base", device=device)
print(f"Whisper model loaded on {device}!")

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "service": "Whisper STT Server",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "/health": "Health check",
            "/api/transcribe": "Speech-to-text transcription",
            "/api/models": "List available models"
        }
    })

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "Whisper STT"})

@app.route("/favicon.ico", methods=["GET"])
def favicon():
    # Return a simple response for favicon requests
    return "", 204

@app.route("/api/transcribe", methods=["POST"])
def speech_to_text():
    try:
        # Check if audio file is provided
        if "audio" not in request.files:
            return jsonify({"error": "Audio file is required"}), 400
        
        audio_file = request.files["audio"]
        language = request.form.get("language", None)
        
        if audio_file.filename == "":
            return jsonify({"error": "No audio file selected"}), 400
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            audio_file.save(tmp_file.name)
            temp_path = tmp_file.name
        
        try:
            logger.info(f"Processing audio file: {audio_file.filename}")
            
            # Transcribe audio
            options = {"fp16": False}
            if language:
                options["language"] = language
            
            result = model.transcribe(temp_path, **options)
            
            response = {
                "text": result["text"].strip(),
                "language": result.get("language", "unknown"),
                "segments": result.get("segments", [])
            }
            
            logger.info(f"Transcription completed: {response['text'][:50]}...")
            return jsonify(response)
            
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            return jsonify({"error": f"Transcription failed: {str(e)}"}), 500
        
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_path)
            except:
                pass
                
    except Exception as e:
        logger.error(f"Request processing error: {str(e)}")
        return jsonify({"error": f"Request processing failed: {str(e)}"}), 500

@app.route("/api/models", methods=["GET"])
def list_models():
    return jsonify({
        "models": ["base", "small", "medium", "large"],
        "current_model": "base",
        "device": device
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print(f"Starting Whisper STT Server on {host}:{port}")
    app.run(host=host, port=port, debug=False)
