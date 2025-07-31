
#!/usr/bin/env python3
"""Coqui TTS Server for Talk World
Provides REST API for text-to-speech conversion
"""

import os
import io
import json
import torch
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from TTS.api import TTS
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import XttsAudioConfig, XttsArgs
from TTS.config.shared_configs import BaseDatasetConfig
import tempfile
import logging

# Fix for PyTorch weights_only issue with XTTS v2
torch.serialization.add_safe_globals([XttsConfig, XttsAudioConfig, BaseDatasetConfig, XttsArgs])

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize TTS model
print("Loading TTS model...")
try:
    # Use the correct model name for XTTS v2
    # Set device to CPU for better compatibility
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")
    
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    print("TTS model loaded successfully!")
    
    # Log model capabilities
    if hasattr(tts, 'speakers') and tts.speakers:
        print(f"Available speakers: {len(tts.speakers)}")
    else:
        print("No preset speakers available - voice cloning mode only")
        
except Exception as e:
    logger.error(f"Failed to load TTS model: {str(e)}")
    print(f"Error details: {str(e)}")
    raise

# Language mapping for XTTS v2 (supports 17 languages)
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
    "ko": "ko",
    "hi": "hi"  # Hindi support added in XTTS v2
}

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "service": "Coqui TTS Server",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "/health": "Health check",
            "/api/tts": "Text-to-speech synthesis",
            "/api/models": "List available models",
            "/api/speakers": "List available speakers"
        }
    })

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "coqui-tts"})

@app.route("/favicon.ico", methods=["GET"])
def favicon():
    # Return a simple response for favicon requests
    return "", 204

@app.route("/api/tts", methods=["POST"])
def text_to_speech():
    try:
        data = request.get_json()
        
        if not data or "text" not in data:
            return jsonify({"error": "Text is required"}), 400
        
        text = data["text"]
        language = data.get("language_id", "en")
        speaker_wav = data.get("speaker_wav", None)
        speaker = data.get("speaker", None)
        speed = data.get("speed", 1.0)
        
        # Map language to supported language
        mapped_language = LANGUAGE_MAP.get(language, "en")
        
        logger.info(f"Generating speech for text: {text[:50]}... in language: {mapped_language}")
        
        # Create temporary file for output
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            output_path = tmp_file.name
        
        try:
            # Generate speech with XTTS v2
            if speaker_wav:
                # Voice cloning mode
                logger.info(f"Using voice cloning with speaker_wav: {speaker_wav}")
                tts.tts_to_file(
                    text=text,
                    speaker_wav=speaker_wav,
                    language=mapped_language,
                    file_path=output_path,
                    speed=speed
                )
            elif speaker:
                # Preset speaker mode
                logger.info(f"Using preset speaker: {speaker}")
                tts.tts_to_file(
                    text=text,
                    speaker=speaker,
                    language=mapped_language,
                    file_path=output_path,
                    speed=speed
                )
            else:
                # Default mode - use first available speaker if any
                logger.info("Using default TTS mode")
                if hasattr(tts, 'speakers') and tts.speakers:
                    # Use first available speaker
                    default_speaker = tts.speakers[0]
                    tts.tts_to_file(
                        text=text,
                        speaker=default_speaker,
                        language=mapped_language,
                        file_path=output_path,
                        speed=speed
                    )
                else:
                    # Fallback for models without speakers
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
    try:
        model_info = {
            "models": ["tts_models/multilingual/multi-dataset/xtts_v2"],
            "languages": list(LANGUAGE_MAP.keys()),
            "features": {
                "voice_cloning": True,
                "multilingual": True,
                "supported_languages_count": len(LANGUAGE_MAP),
                "requires_speaker_reference": True
            }
        }
        
        # Add speaker information if available
        if hasattr(tts, 'speakers') and tts.speakers:
            model_info["speakers"] = tts.speakers
            model_info["speakers_count"] = len(tts.speakers)
        else:
            model_info["speakers"] = []
            model_info["speakers_count"] = 0
            
        return jsonify(model_info)
        
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        return jsonify({"error": f"Failed to list models: {str(e)}"}), 500

@app.route("/api/speakers", methods=["GET"])
def list_speakers():
    """List available speakers for the TTS model"""
    try:
        speakers_info = {
            "speakers": [],
            "count": 0,
            "supports_voice_cloning": True
        }
        
        if hasattr(tts, 'speakers') and tts.speakers:
            speakers_info["speakers"] = tts.speakers
            speakers_info["count"] = len(tts.speakers)
            
        return jsonify(speakers_info)
        
    except Exception as e:
        logger.error(f"Error listing speakers: {str(e)}")
        return jsonify({"error": f"Failed to list speakers: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print(f"Starting Coqui TTS Server on {host}:{port}")
    app.run(host=host, port=port, debug=False)
