# Coqui TTS Integration for Talk World

## Overview

Talk World integrates with Coqui TTS (Text-to-Speech) technology to provide high-quality, open-source voice synthesis for real-time voice translation features. This implementation provides a robust TTS solution with OpenAI TTS as a fallback.

## Architecture

### Primary TTS Engine: Coqui TTS
- **Server URL**: Configurable via `COQUI_TTS_SERVER_URL` environment variable
- **Default Port**: 5002 (http://localhost:5002)
- **API Endpoint**: `/api/tts`
- **Audio Format**: WAV
- **Languages Supported**: 50+ languages with specific speaker IDs

### Fallback TTS Engine: OpenAI TTS
- **Used when**: Coqui TTS server is unavailable or returns errors
- **API**: OpenAI Speech API
- **Audio Format**: MP3
- **Model**: tts-1

## Language Support

### Coqui TTS Language Mapping
The system maps language codes to Coqui TTS compatible language/speaker combinations:

```typescript
const languageMap: Record<string, { language: string; speaker?: string }> = {
  'en-US': { language: 'en', speaker: 'p225' },
  'en-GB': { language: 'en', speaker: 'p226' },
  'pt-BR': { language: 'pt', speaker: 'p227' },
  'pt-PT': { language: 'pt', speaker: 'p228' },
  'es-ES': { language: 'es', speaker: 'p229' },
  'es-MX': { language: 'es', speaker: 'p230' },
  'fr-FR': { language: 'fr', speaker: 'p231' },
  'fr-CA': { language: 'fr', speaker: 'p232' },
  'de-DE': { language: 'de', speaker: 'p233' },
  'it-IT': { language: 'it', speaker: 'p234' },
  'ja-JP': { language: 'ja', speaker: 'p235' },
  'ko-KR': { language: 'ko', speaker: 'p236' },
  'zh-CN': { language: 'zh-cn', speaker: 'p237' },
  'zh-TW': { language: 'zh-tw', speaker: 'p238' },
  'ru-RU': { language: 'ru', speaker: 'p239' },
  'ar-SA': { language: 'ar', speaker: 'p240' },
  'hi-IN': { language: 'hi', speaker: 'p241' },
  'th-TH': { language: 'th', speaker: 'p242' },
  'vi-VN': { language: 'vi', speaker: 'p243' },
  'tr-TR': { language: 'tr', speaker: 'p244' },
  'pl-PL': { language: 'pl', speaker: 'p245' },
  'nl-NL': { language: 'nl', speaker: 'p246' },
  'sv-SE': { language: 'sv', speaker: 'p247' },
  'da-DK': { language: 'da', speaker: 'p248' },
  'fi-FI': { language: 'fi', speaker: 'p249' },
  'no-NO': { language: 'no', speaker: 'p250' },
  'cs-CZ': { language: 'cs', speaker: 'p251' },
  'hu-HU': { language: 'hu', speaker: 'p252' },
  'ro-RO': { language: 'ro', speaker: 'p253' },
  'uk-UA': { language: 'uk', speaker: 'p254' },
  'he-IL': { language: 'he', speaker: 'p255' },
  'fa-IR': { language: 'fa', speaker: 'p256' },
  'ur-PK': { language: 'ur', speaker: 'p257' },
  'bn-BD': { language: 'bn', speaker: 'p258' },
  'ta-IN': { language: 'ta', speaker: 'p259' },
  'te-IN': { language: 'te', speaker: 'p260' },
  'ml-IN': { language: 'ml', speaker: 'p261' },
  'kn-IN': { language: 'kn', speaker: 'p262' },
  'gu-IN': { language: 'gu', speaker: 'p263' },
  'pa-IN': { language: 'pa', speaker: 'p264' },
  'ne-NP': { language: 'ne', speaker: 'p265' },
  'si-LK': { language: 'si', speaker: 'p266' },
  'my-MM': { language: 'my', speaker: 'p267' },
  'km-KH': { language: 'km', speaker: 'p268' },
  'lo-LA': { language: 'lo', speaker: 'p269' },
  'ka-GE': { language: 'ka', speaker: 'p270' },
  'am-ET': { language: 'am', speaker: 'p271' },
  'sw-KE': { language: 'sw', speaker: 'p272' },
  'zu-ZA': { language: 'zu', speaker: 'p273' },
  'af-ZA': { language: 'af', speaker: 'p274' },
  'ms-MY': { language: 'ms', speaker: 'p275' },
  'tl-PH': { language: 'tl', speaker: 'p276' },
  'id-ID': { language: 'id', speaker: 'p277' },
  'jv-ID': { language: 'jv', speaker: 'p278' },
};
```

## Implementation Details

### Voice Translation Service
Located in `server/voice-translation.ts`, the `VoiceTranslationService` class handles:

1. **Audio Processing**: Receives WebRTC audio chunks
2. **Speech-to-Text**: Uses OpenAI Whisper for transcription
3. **Translation**: Uses Groq API for ultra-fast translation
4. **Text-to-Speech**: Uses Coqui TTS (primary) or OpenAI TTS (fallback)

### TTS Generation Process

```typescript
async generateSpeech(text: string, language: string = 'en-US'): Promise<Buffer | null> {
  // 1. Map language code to Coqui TTS format
  const mappedLanguage = languageMap[language] || { language: 'en', speaker: 'p225' };
  
  // 2. Try Coqui TTS first
  try {
    const payload = {
      text: text,
      language_id: mappedLanguage.language,
      speaker_id: mappedLanguage.speaker,
      style_wav: '',
      speed: 1.0
    };
    
    const response = await fetch(`${coquiServerUrl}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/wav',
      },
      body: JSON.stringify(payload),
    });
    
    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }
  } catch (error) {
    // Fall back to OpenAI TTS
  }
  
  // 3. OpenAI TTS fallback
  const mp3Response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: voiceMap[language] || 'alloy',
    input: text,
    response_format: 'mp3',
    speed: 1.0
  });
  
  return Buffer.from(await mp3Response.arrayBuffer());
}
```

## Setting Up Coqui TTS Server

### Option 1: Docker Setup (Recommended)
```bash
# Pull and run Coqui TTS server
docker run -d \
  --name coqui-tts \
  -p 5002:5002 \
  -e COQUI_TTS_SERVER_URL=http://localhost:5002 \
  coqui/tts:latest
```

### Option 2: Local Installation
```bash
# Install Coqui TTS
pip install coqui-tts[server]

# Start the server
tts-server --model_name tts_models/multilingual/multi-dataset/xtts_v2 --port 5002
```

### Option 3: Using Coqui TTS API
```bash
# Using the official Coqui TTS API (if available)
export COQUI_TTS_SERVER_URL=https://api.coqui.ai/v1
```

## Environment Variables

Add to your `.env` file:
```env
# Coqui TTS Configuration
COQUI_TTS_SERVER_URL=http://localhost:5002

# OpenAI API Key (for fallback TTS and Whisper STT)
OPENAI_API_KEY=your_openai_api_key_here

# Groq API Key (for translation)
GROQ_API_KEY=your_groq_api_key_here
```

## API Endpoints

### Voice TTS Endpoint
```
POST /api/voice/tts
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "text": "Hello, world!",
  "language": "en-US"
}

Response: Audio buffer (WAV or MP3)
```

## Voice Translation Pipeline

The complete voice translation pipeline:

1. **Audio Capture**: WebRTC captures audio chunks (3-second intervals)
2. **Speech-to-Text**: OpenAI Whisper transcribes audio to text
3. **Translation**: Groq API translates text to target language
4. **Text-to-Speech**: Coqui TTS generates audio from translated text
5. **Audio Playback**: Browser plays the generated audio

## Error Handling

The system includes comprehensive error handling:

- **Coqui TTS Unavailable**: Automatically falls back to OpenAI TTS
- **Network Errors**: Retry logic with exponential backoff
- **Invalid Language Codes**: Default to English (en-US)
- **Empty Text**: Skip TTS generation
- **Audio Format Issues**: Convert between WAV and MP3 as needed

## Performance Considerations

### Coqui TTS Benefits
- **Open Source**: No API costs after initial setup
- **Privacy**: On-premises processing
- **Customization**: Support for custom voices and styles
- **High Quality**: Neural TTS with natural-sounding voices

### OpenAI TTS Fallback Benefits
- **Reliability**: Cloud-based with high availability
- **Speed**: Fast generation times
- **Quality**: High-quality voices
- **Simplicity**: No server setup required

## Monitoring and Logging

The system includes comprehensive logging:
```typescript
console.log(`[VoiceTranslation] Generated ${audioBuffer.length} bytes of audio via Coqui TTS`);
console.warn('[VoiceTranslation] Coqui TTS unavailable, falling back to OpenAI TTS');
console.error('[VoiceTranslation] Error generating speech:', error);
```

## Testing

### Testing Coqui TTS Integration
```bash
# Test Coqui TTS server health
curl -X GET http://localhost:5002/health

# Test TTS generation
curl -X POST http://localhost:5002/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "language_id": "en", "speaker_id": "p225"}' \
  --output test.wav
```

### Testing Fallback to OpenAI TTS
```bash
# Stop Coqui TTS server to test fallback
docker stop coqui-tts

# Test voice translation endpoint
curl -X POST http://localhost:5000/api/voice/tts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"text": "Hello world", "language": "en-US"}' \
  --output test.mp3
```

## Future Enhancements

1. **Voice Cloning**: Support for custom voice models
2. **Emotion Control**: Adjust speech emotion and style
3. **SSML Support**: Speech Synthesis Markup Language
4. **Batch Processing**: Multiple texts in single request
5. **Real-time Streaming**: Streaming TTS for faster playback
6. **Voice Caching**: Cache generated audio for repeated phrases

## Troubleshooting

### Common Issues

1. **Coqui TTS Server Not Starting**
   - Check port availability: `netstat -an | grep 5002`
   - Verify Docker installation: `docker --version`
   - Check server logs: `docker logs coqui-tts`

2. **Poor Audio Quality**
   - Try different speaker IDs
   - Adjust speed parameter
   - Use higher quality models

3. **Slow TTS Generation**
   - Use GPU acceleration if available
   - Optimize server resources
   - Consider using streaming TTS

4. **Language Not Supported**
   - Check language mapping in code
   - Use fallback to OpenAI TTS
   - Add custom language mapping

### Debug Mode
Enable debug logging:
```env
DEBUG=voice-translation,coqui-tts
```

## Conclusion

The Coqui TTS integration provides Talk World with a robust, open-source TTS solution that maintains high quality while offering privacy and customization benefits. The fallback to OpenAI TTS ensures reliability and provides a seamless user experience even when the Coqui TTS server is unavailable.