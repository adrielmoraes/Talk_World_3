#!/usr/bin/env node
/**
 * Talk World Production Setup Script
 * Automatically installs and configures all dependencies for production
 * Runs after npm install via postinstall hook
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPython() {
  return new Promise((resolve) => {
    log('🔍 Verificando instalação do Python...', 'cyan');
    
    exec('python --version', (error, stdout, stderr) => {
      if (error) {
        exec('python3 --version', (error3, stdout3, stderr3) => {
          if (error3) {
            log('❌ Python não encontrado. Por favor, instale Python 3.8+ primeiro.', 'red');
            log('💡 Download: https://www.python.org/downloads/', 'cyan');
            resolve(false);
          } else {
            log(`✅ Python encontrado: ${stdout3.trim()}`, 'green');
            resolve(true);
          }
        });
      } else {
        log(`✅ Python encontrado: ${stdout.trim()}`, 'green');
        resolve(true);
      }
    });
  });
}

function checkPip() {
  return new Promise((resolve) => {
    log('🔍 Verificando pip...', 'cyan');
    
    exec('pip --version', (error, stdout, stderr) => {
      if (error) {
        exec('pip3 --version', (error3, stdout3, stderr3) => {
          if (error3) {
            log('❌ pip não encontrado. Instalando pip...', 'yellow');
            // Try to install pip
            exec('python -m ensurepip --upgrade', (pipError) => {
              if (pipError) {
                log('❌ Erro ao instalar pip. Instale manualmente.', 'red');
                resolve(false);
              } else {
                log('✅ pip instalado com sucesso!', 'green');
                resolve(true);
              }
            });
          } else {
            log(`✅ pip encontrado: ${stdout3.trim()}`, 'green');
            resolve(true);
          }
        });
      } else {
        log(`✅ pip encontrado: ${stdout.trim()}`, 'green');
        resolve(true);
      }
    });
  });
}

function installPythonDependencies() {
  return new Promise((resolve) => {
    log('📦 Instalando dependências Python...', 'cyan');
    
    // Check if voice-requirements.txt exists
    if (!fs.existsSync('voice-requirements.txt')) {
      log('❌ Arquivo voice-requirements.txt não encontrado.', 'red');
      resolve(false);
      return;
    }
    
    const pipCommand = os.platform() === 'win32' ? 'pip' : 'pip3';
    const installProcess = spawn(pipCommand, ['install', '-r', 'voice-requirements.txt'], {
      stdio: 'inherit',
      shell: true
    });
    
    installProcess.on('close', (code) => {
      if (code === 0) {
        log('✅ Dependências Python instaladas com sucesso!', 'green');
        resolve(true);
      } else {
        log('❌ Erro ao instalar dependências Python', 'red');
        log('💡 Tente executar manualmente: pip install -r voice-requirements.txt', 'cyan');
        resolve(false);
      }
    });
    
    installProcess.on('error', (error) => {
      log(`❌ Erro ao executar pip: ${error.message}`, 'red');
      resolve(false);
    });
  });
}

function downloadWhisperModel() {
  return new Promise((resolve) => {
    log('🎤 Baixando modelo Whisper...', 'cyan');
    
    const pythonCommand = os.platform() === 'win32' ? 'python' : 'python3';
    const downloadProcess = spawn(pythonCommand, ['-c', 'import whisper; whisper.load_model("base")'], {
      stdio: 'inherit',
      shell: true
    });
    
    downloadProcess.on('close', (code) => {
      if (code === 0) {
        log('✅ Modelo Whisper baixado com sucesso!', 'green');
        resolve(true);
      } else {
        log('⚠️ Erro ao baixar modelo Whisper (será baixado na primeira execução)', 'yellow');
        resolve(true); // Continue anyway
      }
    });
    
    downloadProcess.on('error', (error) => {
      log(`⚠️ Erro ao baixar modelo Whisper: ${error.message}`, 'yellow');
      resolve(true); // Continue anyway
    });
  });
}

function checkVoiceServices() {
  const requiredFiles = [
    'whisper-stt-server.py',
    'coqui-tts-server.py',
    'install-voice-services.py',
    'voice-requirements.txt'
  ];
  
  log('🔍 Verificando arquivos de serviços de voz...', 'cyan');
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log(`❌ Arquivo não encontrado: ${file}`, 'red');
      return false;
    }
  }
  
  log('✅ Todos os arquivos de serviços de voz encontrados!', 'green');
  return true;
}

function createProductionEnv() {
  log('📝 Criando arquivo .env.production...', 'cyan');
  
  const envContent = `# Talk World Production Environment
NODE_ENV=production
PORT=5173

# Voice Services
WHISPER_STT_URL=http://localhost:5001
COQUI_TTS_URL=http://localhost:5002

# Database (configure with your production database)
# DATABASE_URL=postgresql://user:password@localhost:5432/talkworld

# API Keys (configure with your production keys)
# GROQ_API_KEY=your_groq_api_key_here
# OPENAI_API_KEY=your_openai_api_key_here

# Security
SESSION_SECRET=your_secure_session_secret_here
`;
  
  if (!fs.existsSync('.env.production')) {
    fs.writeFileSync('.env.production', envContent);
    log('✅ Arquivo .env.production criado!', 'green');
    log('💡 Configure suas variáveis de ambiente em .env.production', 'cyan');
  } else {
    log('ℹ️ Arquivo .env.production já existe', 'yellow');
  }
}

function createProductionReadme() {
  log('📝 Criando guia de produção...', 'cyan');
  
  const readmeContent = `# Talk World - Guia de Produção

## Instalação Automática

Este projeto está configurado para instalação automática de todas as dependências:

\`\`\`bash
npm install
\`\`\`

O comando acima irá:
1. Instalar dependências Node.js
2. Verificar e instalar Python e pip
3. Instalar dependências Python (Whisper, Coqui TTS, etc.)
4. Baixar modelos necessários
5. Configurar ambiente de produção

## Comandos Disponíveis

### Desenvolvimento
\`\`\`bash
npm run dev          # Inicia todos os serviços em modo desenvolvimento
npm run dev:main     # Apenas servidor principal
npm run dev:whisper  # Apenas Whisper STT
npm run dev:coqui    # Apenas Coqui TTS
\`\`\`

### Produção
\`\`\`bash
npm run build              # Compila para produção
npm run start              # Inicia apenas servidor principal
npm run start:production   # Inicia todos os serviços em produção
\`\`\`

### Configuração
\`\`\`bash
npm run setup:voice       # Reinstala serviços de voz
npm run setup:production  # Configuração completa para produção
\`\`\`

## Dependências

### Node.js
- Express.js (servidor web)
- React (interface)
- Socket.io (WebSockets)
- Vite (build tool)

### Python
- OpenAI Whisper (Speech-to-Text)
- Coqui TTS (Text-to-Speech)
- Flask (API servers)

## Portas

- **5173**: Servidor principal (HTTP + WebSocket)
- **5001**: Whisper STT Server
- **5002**: Coqui TTS Server

## Configuração

1. Configure suas variáveis de ambiente em \`.env.production\`
2. Configure sua base de dados
3. Configure suas chaves de API (Groq, OpenAI)

## Troubleshooting

Se houver problemas com a instalação automática:

1. **Python não encontrado**:
   - Instale Python 3.8+ de https://www.python.org/downloads/
   - Certifique-se que está no PATH

2. **Erro nas dependências Python**:
   \`\`\`bash
   pip install -r voice-requirements.txt
   \`\`\`

3. **Erro no modelo Whisper**:
   \`\`\`bash
   python -c "import whisper; whisper.load_model('base')"
   \`\`\`

4. **Reinstalação completa**:
   \`\`\`bash
   npm run setup:production
   \`\`\`
`;
  
  fs.writeFileSync('PRODUCTION.md', readmeContent);
  log('✅ Guia de produção criado: PRODUCTION.md', 'green');
}

async function main() {
  log('🌍 Talk World - Configuração para Produção', 'bright');
  log('============================================', 'bright');
  
  try {
    // Check if this is a CI environment or if we should skip setup
    if (process.env.CI || process.env.SKIP_POSTINSTALL) {
      log('ℹ️ Ambiente CI detectado ou setup ignorado', 'yellow');
      return;
    }
    
    // Check voice services files
    if (!checkVoiceServices()) {
      log('❌ Arquivos de serviços de voz não encontrados', 'red');
      log('💡 Certifique-se que todos os arquivos estão presentes', 'cyan');
      return;
    }
    
    // Check Python
    const pythonOk = await checkPython();
    if (!pythonOk) {
      log('❌ Python é necessário para os serviços de voz', 'red');
      return;
    }
    
    // Check pip
    const pipOk = await checkPip();
    if (!pipOk) {
      log('❌ pip é necessário para instalar dependências Python', 'red');
      return;
    }
    
    // Install Python dependencies
    const depsOk = await installPythonDependencies();
    if (!depsOk) {
      log('⚠️ Erro ao instalar dependências Python', 'yellow');
      log('💡 Execute manualmente: pip install -r voice-requirements.txt', 'cyan');
    }
    
    // Download Whisper model
    await downloadWhisperModel();
    
    // Create production files
    createProductionEnv();
    createProductionReadme();
    
    log('\n🎉 Configuração para produção concluída!', 'green');
    log('\n📋 Próximos passos:', 'cyan');
    log('1. Configure .env.production com suas variáveis', 'cyan');
    log('2. Execute: npm run build', 'cyan');
    log('3. Execute: npm run start:production', 'cyan');
    log('\n📖 Leia PRODUCTION.md para mais detalhes', 'cyan');
    
  } catch (error) {
    log(`❌ Erro durante a configuração: ${error.message}`, 'red');
    log('💡 Execute npm run setup:production para tentar novamente', 'cyan');
  }
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };