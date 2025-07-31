const fetch = require('node-fetch');

// Test configuration
const M2M100_URL = 'http://localhost:5002';
const WHISPER_URL = 'http://localhost:5001';
const COQUI_URL = 'http://localhost:5003';

// Test cases
const testCases = [
  {
    text: "Olá meu amigo, tudo bem com você?",
    expectedSource: "pt",
    targetLanguage: "en",
    description: "Portuguese to English"
  },
  {
    text: "Hello my friend, how are you?",
    expectedSource: "en",
    targetLanguage: "pt",
    description: "English to Portuguese"
  },
  {
    text: "ola adriel tudo bem com voce e sua familia",
    expectedSource: "pt",
    targetLanguage: "en",
    description: "Portuguese (informal) to English"
  },
  {
    text: "Hello my friend good night",
    expectedSource: "en",
    targetLanguage: "pt",
    description: "English greeting to Portuguese"
  }
];

async function testLanguageDetection(text) {
  try {
    console.log(`\n🔍 Testing language detection for: "${text}"`);
    
    const response = await fetch(`${M2M100_URL}/api/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Detection result:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Detection failed:`, error.message);
    return null;
  }
}

async function testTranslation(text, sourceLanguage, targetLanguage) {
  try {
    console.log(`\n🔄 Testing translation: "${text}"`);
    console.log(`   From: ${sourceLanguage} → To: ${targetLanguage}`);
    
    const response = await fetch(`${M2M100_URL}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        source_language: sourceLanguage,
        target_language: targetLanguage
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Translation result:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Translation failed:`, error.message);
    return null;
  }
}

async function testServiceHealth() {
  console.log('🏥 Testing service health...');
  
  const services = [
    { name: 'M2M100 Translation', url: `${M2M100_URL}/health` },
    { name: 'Whisper STT', url: `${WHISPER_URL}/health` },
    { name: 'Coqui TTS', url: `${COQUI_URL}/health` }
  ];

  for (const service of services) {
    try {
      const response = await fetch(service.url);
      if (response.ok) {
        console.log(`✅ ${service.name}: Healthy`);
      } else {
        console.log(`⚠️  ${service.name}: Unhealthy (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${service.name}: Offline (${error.message})`);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Translation Service Tests\n');
  
  // Test service health
  await testServiceHealth();
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Running Translation Tests');
  console.log('='.repeat(60));
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.description}`);
    console.log('-'.repeat(40));
    
    // Test language detection
    const detection = await testLanguageDetection(testCase.text);
    
    if (detection) {
      const detectedLang = detection.language || detection.detected_language;
      
      if (detectedLang === testCase.expectedSource) {
        console.log(`✅ Language detection correct: ${detectedLang}`);
      } else {
        console.log(`⚠️  Language detection mismatch: expected ${testCase.expectedSource}, got ${detectedLang}`);
      }
      
      // Test translation
      await testTranslation(testCase.text, detectedLang, testCase.targetLanguage);
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Tests completed!');
  console.log('='.repeat(60));
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testLanguageDetection, testTranslation, testServiceHealth, runTests };