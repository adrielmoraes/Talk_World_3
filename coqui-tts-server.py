
#!/usr/bin/env python3
"""
Coqui TTS Server for Talk World
Provides REST API for text-to-speech conversion
"""

import os
import io
import json
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from TTS.api import TTS
import tempfile
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize TTS model
print("Loading TTS model...")
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
print("TTS model loaded successfully!")

# Language mapping for XTTS v2
LANGUAGE_MAP = {
    "en": "en",
    "es": "es", 
    "fr": "fr",
    "de": "de",
    "it": "it",
    "pt": "pt",
    "pl": "pl",
    "tr": "tr",
    "ru": "ru",
    "nl": "nl",
    "cs": "cs",
    "ar": "ar",
    "zh-cn": "zh-cn",
    "ja": "ja",
    "hu": "hu",
    "ko": "ko"
}

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "coqui-tts"})

@app.route("/api/tts", methods=["POST"])
def text_to_speech():
    try:
        data = request.get_json()
        
        if not data or "text" not in data:
            return jsonify({"error": "Text is required"}), 400
        
        text = data["text"]
        language = data.get("language_id", "en")
        speaker_wav = data.get("speaker_wav", "")
        speed = data.get("speed", 1.0)
        
        # Map language to supported language
        mapped_language = LANGUAGE_MAP.get(language, "en")
        
        logger.info(f"Generating speech for text: {text[:50]}... in language: {mapped_language}")
        
        # Create temporary file for output
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            output_path = tmp_file.name
        
        try:
            # Generate speech
            tts.tts_to_file(
                text=text,
                language=mapped_language,
                file_path=output_path,
                speed=speed
            )
            
            # Return the audio file
            return send_file(
                output_path,
                mimetype="audio/wav",
                as_attachment=False
            )
            
        except Exception as e:
            logger.error(f"TTS generation error: {str(e)}")
            return jsonify({"error": f"TTS generation failed: {str(e)}"}), 500
        
        finally:
            # Clean up temporary file
            try:
                os.unlink(output_path)
            except:
                pass
                
    except Exception as e:
        logger.error(f"Request processing error: {str(e)}")
        return jsonify({"error": f"Request processing failed: {str(e)}"}), 500

@app.route("/api/models", methods=["GET"])
def list_models():
    return jsonify({
        "models": ["tts_models/multilingual/multi-dataset/xtts_v2"],
        "languages": list(LANGUAGE_MAP.keys())
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print(f"Starting Coqui TTS Server on {host}:{port}")
    app.run(host=host, port=port, debug=False)
