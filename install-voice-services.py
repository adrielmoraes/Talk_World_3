#!/usr/bin/env python3
"""
Talk World Voice Services Installation Script
Installs Whisper STT and Coqui TTS for real-time voice translation
"""

import os
import sys
import subprocess
import platform
import json
from pathlib import Path

def run_command(command, check=True):
    """Run a command and return the result"""
    print(f"Running: {command}")
    try:
        result = subprocess.run(command, shell=True, check=check, capture_output=True, text=True)
        if result.stdout:
            print(result.stdout)
        return result
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        if e.stderr:
            print(f"Error output: {e.stderr}")
        if check:
            sys.exit(1)
        return e

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)
    print(f"Python version: {version.major}.{version.minor}.{version.micro}")

def install_packages():
    """Install required packages for voice services"""
    print("Installing voice service packages...")
    
    # First, try to install with compatible versions
    packages = [
        "openai-whisper",
        "flask>=2.3.0",
        "flask-cors>=4.0.0",
        "numpy>=1.24.0",
        "scipy>=1.10.0",
        "librosa>=0.10.0",
        "soundfile>=0.12.0",
        "requests>=2.28.0"
    ]
    
    for package in packages:
        try:
            print(f"Installing {package}...")
            subprocess.run([sys.executable, "-m", "pip", "install", package], 
                         check=True, capture_output=True, text=True)
            print(f"✓ {package} installed successfully")
        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to install {package}: {e.stderr}")
            # Continue with other packages
    
    # Try to install TTS with fallback
    try:
        print("Installing TTS (Coqui TTS)...")
        subprocess.run([sys.executable, "-m", "pip", "install", "TTS"], 
                     check=True, capture_output=True, text=True)
        print("✓ TTS installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install TTS: {e.stderr}")
        print("Note: TTS installation failed. The system will use OpenAI TTS as fallback.")
    
    return True

def install_whisper():
    """Install OpenAI Whisper"""
    print("\n=== Installing OpenAI Whisper ===")
    
    # Download base model
    print("Downloading Whisper base model...")
    run_command("python -c \"import whisper; whisper.load_model('base')\"")
    
    print("Whisper installation completed!")

def install_coqui_tts():
    """Install Coqui TTS"""
    print("\n=== Installing Coqui TTS ===")
    
    # Install specific version of Coqui TTS that works with PyTorch 2.6+
    packages = [
        "TTS==0.22.0",
        "torch>=2.0.0",
        "torchvision",
        "torchaudio",
        "transformers>=4.20.0",
        "sentencepiece"
    ]
    
    for package in packages:
        print(f"Installing {package}...")
        result = run_command(f"pip install {package}", check=False)
        if result.returncode != 0:
            print(f"Warning: Failed to install {package}")
    
    print("Coqui TTS installation completed!")

def create_coqui_server():
    """Create Coqui TTS server script"""
    print("\n=== Creating Coqui TTS Server ===")
    
    server_script = '''
#!/usr/bin/env python3
"""
Coqui TTS Server for Talk World
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
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

try:
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    print("TTS model loaded successfully!")
    
    # Check if model has speaker capabilities
    if hasattr(tts, 'speakers') and tts.speakers:
        print(f"Available speakers: {len(tts.speakers)}")
    else:
        print("No preset speakers available - voice cloning mode only")
except Exception as e:
    logger.error(f"Failed to load TTS model: {e}")
    print(f"Error details: {e}")
    exit(1)

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
'''
    
    # Write server script
    with open("coqui-tts-server.py", "w", encoding="utf-8") as f:
        f.write(server_script)
    
    print("Coqui TTS server script created: coqui-tts-server.py")

def create_whisper_server():
    """Create Whisper STT server script"""
    print("\n=== Creating Whisper STT Server ===")
    
    server_script = '''
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

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "whisper-stt"})

@app.route("/api/stt", methods=["POST"])
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
'''
    
    # Write server script
    with open("whisper-stt-server.py", "w", encoding="utf-8") as f:
        f.write(server_script)
    
    print("Whisper STT server script created: whisper-stt-server.py")

def create_startup_scripts():
    """Create startup scripts for voice services"""
    print("\n=== Creating Startup Scripts ===")
    
    # Windows batch script
    windows_script = '''
@echo off
echo Starting Talk World Voice Services...

echo Starting Whisper STT Server...
start "Whisper STT" python whisper-stt-server.py

echo Starting Coqui TTS Server...
start "Coqui TTS" python coqui-tts-server.py

echo Voice services started!
echo Whisper STT: http://localhost:5001
echo Coqui TTS: http://localhost:5002
pause
'''
    
    with open("start-voice-services.bat", "w") as f:
        f.write(windows_script)
    
    # Unix shell script
    unix_script = '''
#!/bin/bash
echo "Starting Talk World Voice Services..."

echo "Starting Whisper STT Server..."
python3 whisper-stt-server.py &
WHISPER_PID=$!

echo "Starting Coqui TTS Server..."
python3 coqui-tts-server.py &
COQUI_PID=$!

echo "Voice services started!"
echo "Whisper STT: http://localhost:5001"
echo "Coqui TTS: http://localhost:5002"
echo "Press Ctrl+C to stop services"

# Wait for interrupt
trap "kill $WHISPER_PID $COQUI_PID; exit" INT
wait
'''
    
    with open("start-voice-services.sh", "w") as f:
        f.write(unix_script)
    
    # Make shell script executable on Unix systems
    if platform.system() != "Windows":
        os.chmod("start-voice-services.sh", 0o755)
    
    print("Startup scripts created!")

def create_requirements():
    """Create requirements.txt for voice services"""
    requirements = '''
# Voice Services Requirements
openai-whisper>=20231117
TTS>=0.22.0
flask>=2.3.0
flask-cors>=4.0.0
torch>=2.0.0
torchvision>=0.15.0
torchaudio>=2.0.0
numpy>=1.24.0
scipy>=1.10.0
librosa>=0.10.0
soundfile>=0.12.0
'''
    
    with open("voice-requirements.txt", "w") as f:
        f.write(requirements)
    
    print("Requirements file created: voice-requirements.txt")

def main():
    """Main installation function"""
    print("Talk World Voice Services Installation")
    print("=====================================")
    
    # Check Python version
    check_python_version()
    
    # Create requirements file
    create_requirements()
    
    # Install packages
    print("\nInstalling Python packages...")
    install_packages()
    
    # Install Whisper
    install_whisper()
    
    # Install Coqui TTS
    install_coqui_tts()
    
    # Create server scripts
    create_whisper_server()
    create_coqui_server()
    
    # Create startup scripts
    create_startup_scripts()
    
    print("\n=== Installation Complete! ===")
    print("\nTo start the voice services:")
    if platform.system() == "Windows":
        print("  Windows: start-voice-services.bat")
    else:
        print("  Unix/Linux/Mac: ./start-voice-services.sh")
    
    print("\nServices will be available at:")
    print("  Whisper STT: http://localhost:5001")
    print("  Coqui TTS: http://localhost:5002")
    
    print("\nNext steps:")
    print("1. Start the voice services")
    print("2. Update your .env file with the service URLs")
    print("3. Restart your Talk World application")

if __name__ == "__main__":
    main()