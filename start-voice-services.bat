
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
