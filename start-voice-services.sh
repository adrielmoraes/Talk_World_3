
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
