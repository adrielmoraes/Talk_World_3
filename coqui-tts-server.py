
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

# Set environment variables to accept Coqui TTS license automatically
os.environ["COQUI_TOS_AGREED"] = "1"
os.environ["TTS_CACHE_PATH"] = os.path.expanduser("~/.local/share/tts")
os.environ["COQUI_STUDIO_TOKEN"] = "dummy"
os.environ["COQUI_AGREE_TO_LICENSE"] = "1"

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize TTS model with error handling
print("Loading TTS model...")
try:
    # Try to use a simpler model first
    tts = TTS("tts_models/en/ljspeech/tacotron2-DDC")
    print("TTS model (Tacotron2) loaded successfully!")
except Exception as e:
    print(f"Failed to load Tacotron2, trying XTTS v2: {e}")
    try:
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        print("TTS model (XTTS v2) loaded successfully!")
    except Exception as e2:
        print(f"Failed to load XTTS v2: {e2}")
        tts = None

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
        if tts is None:
            return jsonify({"error": "TTS model not available"}), 503
            
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
            # Generate speech - adjust parameters based on model type
            if "tacotron2" in str(tts.model_name).lower():
                # Tacotron2 doesn't support language parameter
                tts.tts_to_file(
                    text=text,
                    file_path=output_path
                )
            else:
                # XTTS v2 supports language and speed
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
