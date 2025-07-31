
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
    "pt-br": "pt",  # Brazilian Portuguese
    "pt-pt": "pt",  # European Portuguese
    "ru": "ru",
    "zh": "zh",
    "zh-cn": "zh",  # Simplified Chinese
    "zh-tw": "zh",  # Traditional Chinese
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
        
        print(f"[OK] M2M100 model loaded successfully on {device}!")
        return True
        
    except Exception as e:
        print(f"[ERROR] Failed to load M2M100 model: {e}")
        return False

def detect_language(text):
    """Detect language using langdetect and map to M2M100 supported languages"""
    try:
        logger.info(f"Detecting language for text: '{text[:50]}{'...' if len(text) > 50 else ''}'")
        detected = detect(text)
        logger.info(f"Langdetect result: {detected}")
        
        # Map to M2M100 supported language
        if detected in LANGUAGE_MAP:
            mapped_lang = LANGUAGE_MAP[detected]
            logger.info(f"Mapped {detected} to {mapped_lang}")
            return mapped_lang
        
        # Check if already in M2M100 format
        if detected in LANGUAGE_MAP.values():
            logger.info(f"Language {detected} already in M2M100 format")
            return detected
            
        logger.warning(f"Language {detected} not supported, defaulting to English")
        return "en"
    except Exception as e:
        logger.error(f"Language detection failed: {str(e)}")
        return "en"  # Default to English if detection fails

def translate_text(text, source_lang, target_lang):
    """Translate text using M2M100"""
    if not model or not tokenizer:
        raise Exception("Model not loaded")
    
    logger.info(f"Translating text: '{text[:100]}{'...' if len(text) > 100 else ''}'")
    logger.info(f"Source language: {source_lang}, Target language: {target_lang}")
    
    if source_lang == target_lang:
        logger.info("Source and target languages are the same, returning original text")
        return text
    
    try:
        # Set source language
        tokenizer.src_lang = source_lang
        
        logger.info(f"Input encoded, generating translation...")
        
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
        
        logger.info(f"Translation completed: '{translation[:100]}{'...' if len(translation) > 100 else ''}'")
        
        return translation.strip()
        
    except Exception as e:
        logger.error(f"Translation error: {e}")
        logger.error(f"Returning error due to translation failure")
        raise e

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "service": "M2M100 Translation Server",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "/health": "Health check",
            "/api/translate": "Text translation",
            "/api/detect": "Language detection",
            "/api/languages": "List supported languages"
        }
    })

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy", 
        "service": "m2m100-translation",
        "model_loaded": model is not None,
        "device": device
    })

@app.route("/favicon.ico", methods=["GET"])
def favicon():
    # Return a simple response for favicon requests
    return "", 204

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
        
        # Return both formats for compatibility
        return jsonify({
            "text": text,
            "language": detected_lang,  # Expected by TypeScript code
            "detected_language": detected_lang,  # Legacy format
            "confidence": 0.8  # Add confidence score
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
        print("[ERROR] Failed to load model. Exiting...")
        sys.exit(1)
    
    port = int(os.environ.get("PORT", 5003))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print(f"Starting M2M100 Translation Server on {host}:{port}")
    app.run(host=host, port=port, debug=False)
