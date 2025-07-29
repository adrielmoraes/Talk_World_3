#!/usr/bin/env python3
"""
M2M100 Translation Service Installation Script
Installs and configures M2M100 for Talk World audio message translation
"""

import os
import sys
import subprocess
import platform
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ is required")
        sys.exit(1)
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detected")

def install_packages():
    """Install required packages for M2M100 translation"""
    print("Installing M2M100 translation packages...")
    
    packages = [
        "torch>=2.0.0",
        "transformers>=4.30.0",
        "sentencepiece>=0.1.99",
        "sacremoses>=0.0.53",
        "flask>=2.3.0",
        "flask-cors>=4.0.0",
        "numpy>=1.24.0",
        "requests>=2.28.0",
        "langdetect>=1.0.9"
    ]
    
    for package in packages:
        try:
            print(f"Installing {package}...")
            subprocess.run([sys.executable, "-m", "pip", "install", package], 
                         check=True, capture_output=True, text=True)
            print(f"✅ {package} installed successfully")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install {package}: {e.stderr}")
            # Continue with other packages
    
    return True

def create_m2m100_server():
    """Create M2M100 translation server script"""
    print("\n=== Creating M2M100 Translation Server ===")
    
    server_script = '''
#!/usr/bin/env python3
"""
M2M100 Translation Server for Talk World
Provides REST API for multilingual translation
"""

import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer
import torch
from langdetect import detect, DetectorFactory
import time

# Set seed for consistent language detection
DetectorFactory.seed = 0

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global variables for model and tokenizer
model = None
tokenizer = None
device = None

# Language mapping for M2M100
LANGUAGE_MAP = {
    "en": "en",
    "es": "es", 
    "fr": "fr",
    "de": "de",
    "it": "it",
    "pt": "pt",
    "ru": "ru",
    "zh": "zh",
    "ja": "ja",
    "ko": "ko",
    "ar": "ar",
    "hi": "hi",
    "tr": "tr",
    "nl": "nl",
    "pl": "pl",
    "sv": "sv",
    "da": "da",
    "no": "no",
    "fi": "fi",
    "cs": "cs",
    "hu": "hu",
    "ro": "ro",
    "bg": "bg",
    "hr": "hr",
    "sk": "sk",
    "sl": "sl",
    "et": "et",
    "lv": "lv",
    "lt": "lt",
    "mt": "mt",
    "ga": "ga",
    "cy": "cy",
    "eu": "eu",
    "ca": "ca",
    "gl": "gl",
    "is": "is",
    "mk": "mk",
    "sq": "sq",
    "sr": "sr",
    "bs": "bs",
    "me": "me",
    "lb": "lb"
}

def load_model():
    """Load M2M100 model and tokenizer"""
    global model, tokenizer, device
    
    print("Loading M2M100 model...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")
    
    try:
        # Load model and tokenizer
        model_name = "facebook/m2m100_418M"  # Smaller model for faster inference
        tokenizer = M2M100Tokenizer.from_pretrained(model_name)
        model = M2M100ForConditionalGeneration.from_pretrained(model_name)
        
        # Move model to device
        model = model.to(device)
        model.eval()  # Set to evaluation mode
        
        print(f"✅ M2M100 model loaded successfully on {device}!")
        return True
        
    except Exception as e:
        print(f"❌ Failed to load M2M100 model: {e}")
        return False

def detect_language(text):
    """Detect language of input text"""
    try:
        detected = detect(text)
        # Map to M2M100 supported languages
        return LANGUAGE_MAP.get(detected, "en")
    except:
        return "en"  # Default to English

def translate_text(text, source_lang, target_lang):
    """Translate text using M2M100"""
    if not model or not tokenizer:
        raise Exception("Model not loaded")
    
    if source_lang == target_lang:
        return text
    
    try:
        # Set source language
        tokenizer.src_lang = source_lang
        
        # Encode text
        encoded = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
        encoded = {k: v.to(device) for k, v in encoded.items()}
        
        # Generate translation
        with torch.no_grad():
            generated_tokens = model.generate(
                **encoded,
                forced_bos_token_id=tokenizer.get_lang_id(target_lang),
                max_length=512,
                num_beams=5,
                early_stopping=True
            )
        
        # Decode translation
        translation = tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0]
        return translation.strip()
        
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise e

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy", 
        "service": "m2m100-translation",
        "model_loaded": model is not None,
        "device": device
    })

@app.route("/api/translate", methods=["POST"])
def translate():
    try:
        data = request.get_json()
        
        if not data or "text" not in data:
            return jsonify({"error": "Text is required"}), 400
        
        text = data["text"]
        source_lang = data.get("source_language")
        target_lang = data.get("target_language", "en")
        
        # Auto-detect source language if not provided
        if not source_lang:
            source_lang = detect_language(text)
        
        # Map languages to M2M100 format
        source_lang = LANGUAGE_MAP.get(source_lang, "en")
        target_lang = LANGUAGE_MAP.get(target_lang, "en")
        
        logger.info(f"Translating from {source_lang} to {target_lang}: {text[:50]}...")
        
        start_time = time.time()
        translation = translate_text(text, source_lang, target_lang)
        processing_time = time.time() - start_time
        
        response = {
            "original_text": text,
            "translated_text": translation,
            "source_language": source_lang,
            "target_language": target_lang,
            "processing_time": round(processing_time, 3)
        }
        
        logger.info(f"Translation completed in {processing_time:.3f}s")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Translation request error: {str(e)}")
        return jsonify({"error": f"Translation failed: {str(e)}"}), 500

@app.route("/api/detect", methods=["POST"])
def detect_lang():
    try:
        data = request.get_json()
        
        if not data or "text" not in data:
            return jsonify({"error": "Text is required"}), 400
        
        text = data["text"]
        detected_lang = detect_language(text)
        
        return jsonify({
            "text": text,
            "detected_language": detected_lang
        })
        
    except Exception as e:
        logger.error(f"Language detection error: {str(e)}")
        return jsonify({"error": f"Language detection failed: {str(e)}"}), 500

@app.route("/api/languages", methods=["GET"])
def list_languages():
    return jsonify({
        "supported_languages": list(LANGUAGE_MAP.keys()),
        "total_languages": len(LANGUAGE_MAP)
    })

if __name__ == "__main__":
    # Load model on startup
    if not load_model():
        print("❌ Failed to load model. Exiting...")
        sys.exit(1)
    
    port = int(os.environ.get("PORT", 5003))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print(f"Starting M2M100 Translation Server on {host}:{port}")
    app.run(host=host, port=port, debug=False)
'''
    
    # Write server script
    with open("m2m100-translation-server.py", "w", encoding="utf-8") as f:
        f.write(server_script)
    
    print("M2M100 translation server script created: m2m100-translation-server.py")

def update_requirements():
    """Update requirements file with M2M100 dependencies"""
    print("\n=== Updating Requirements File ===")
    
    m2m100_requirements = """
# M2M100 Translation Requirements
torch>=2.0.0
transformers>=4.30.0
sentencepiece>=0.1.99
sacremoses>=0.0.53
langdetect>=1.0.9
"""
    
    # Append to existing voice-requirements.txt
    with open("voice-requirements.txt", "a", encoding="utf-8") as f:
        f.write(m2m100_requirements)
    
    print("Requirements file updated with M2M100 dependencies")

def update_startup_scripts():
    """Update startup scripts to include M2M100 server"""
    print("\n=== Updating Startup Scripts ===")
    
    # Update Windows batch script
    windows_script = '''
@echo off
echo Starting Talk World Voice Services...

echo Starting Whisper STT Server...
start "Whisper STT" python whisper-stt-server.py

echo Starting Coqui TTS Server...
start "Coqui TTS" python coqui-tts-server.py

echo Starting M2M100 Translation Server...
start "M2M100 Translation" python m2m100-translation-server.py

echo Voice services started!
echo Whisper STT: http://localhost:5001
echo Coqui TTS: http://localhost:5002
echo M2M100 Translation: http://localhost:5003
pause
'''
    
    with open("start-voice-services.bat", "w") as f:
        f.write(windows_script)
    
    # Update Unix shell script
    unix_script = '''
#!/bin/bash
echo "Starting Talk World Voice Services..."

echo "Starting Whisper STT Server..."
python3 whisper-stt-server.py &
WHISPER_PID=$!

echo "Starting Coqui TTS Server..."
python3 coqui-tts-server.py &
COQUI_PID=$!

echo "Starting M2M100 Translation Server..."
python3 m2m100-translation-server.py &
M2M100_PID=$!

echo "Voice services started!"
echo "Whisper STT: http://localhost:5001"
echo "Coqui TTS: http://localhost:5002"
echo "M2M100 Translation: http://localhost:5003"
echo "Press Ctrl+C to stop services"

# Wait for interrupt
trap "kill $WHISPER_PID $COQUI_PID $M2M100_PID; exit" INT
wait
'''
    
    with open("start-voice-services.sh", "w") as f:
        f.write(unix_script)
    
    # Make shell script executable on Unix systems
    if platform.system() != "Windows":
        os.chmod("start-voice-services.sh", 0o755)
    
    print("Startup scripts updated!")

def main():
    """Main installation function"""
    print("Talk World M2M100 Translation Service Installation")
    print("=================================================")
    
    # Check Python version
    check_python_version()
    
    # Install packages
    print("\nInstalling Python packages...")
    install_packages()
    
    # Create M2M100 server
    create_m2m100_server()
    
    # Update requirements
    update_requirements()
    
    # Update startup scripts
    update_startup_scripts()
    
    print("\n=== M2M100 Installation Complete! ===")
    print("\nTo start all voice services including M2M100:")
    if platform.system() == "Windows":
        print("  Windows: start-voice-services.bat")
    else:
        print("  Unix/Linux/Mac: ./start-voice-services.sh")
    
    print("\nServices will be available at:")
    print("  Whisper STT: http://localhost:5001")
    print("  Coqui TTS: http://localhost:5002")
    print("  M2M100 Translation: http://localhost:5003")
    
    print("\nNext steps:")
    print("1. Start the voice services")
    print("2. Update your .env file with M2M100_TRANSLATION_SERVER_URL=http://localhost:5003")
    print("3. Restart your Talk World application")
    print("\nNote: First run will download the M2M100 model (~1.6GB)")

if __name__ == "__main__":
    main()