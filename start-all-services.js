#!/usr/bin/env node

/**
 * Script para iniciar todos os serviços do Talk World
 * Verifica dependências Python e inicia os serviços
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Cores para output
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

function checkPythonDependencies() {
  return new Promise((resolve) => {
    log('🔍 Verificando dependências Python...', 'cyan');
    
    exec('python -c "import whisper, TTS; print(\'Dependencies OK\')"', (error, stdout, stderr) => {
      if (error) {
        log('❌ Dependências Python não encontradas. Instalando...', 'yellow');
        
        // Instalar dependências específicas do Coqui TTS
        const packages = [
          'TTS==0.22.0',
          'openai-whisper',
          'torch>=2.0.0',
          'torchvision',
          'torchaudio',
          'transformers>=4.20.0',
          'sentencepiece',
          'flask>=2.3.0',
          'flask-cors>=4.0.0'
        ];
        
        const installProcess = spawn('pip', ['install', ...packages], {
          stdio: 'inherit',
          shell: true
        });
        
        installProcess.on('close', (code) => {
          if (code === 0) {
            log('✅ Dependências Python instaladas com sucesso!', 'green');
            resolve(true);
          } else {
            log('❌ Erro ao instalar dependências Python', 'red');
            resolve(false);
          }
        });
      } else {
        log('✅ Dependências Python OK!', 'green');
        resolve(true);
      }
    });
  });
}

function startServices() {
  log('🚀 Iniciando todos os serviços...', 'bright');
  
  const services = [
    {
      name: 'MAIN',
      command: 'cross-env',
      args: ['NODE_ENV=development', 'tsx', 'server/index.ts'],
      color: 'blue',
      port: '5000'
    },
    {
      name: 'WHISPER',
      command: 'python',
      args: ['whisper-stt-server.py'],
      color: 'green',
      port: '5001'
    },
    {
      name: 'COQUI',
      command: 'python',
      args: ['coqui-tts-server.py'],
      color: 'yellow',
      port: '5002'
    },
    {
      name: 'M2M100',
      command: 'python',
      args: ['m2m100-translation-server.py'],
      color: 'magenta',
      port: '5003'
    }
  ];
  
  const processes = [];
  
  services.forEach(service => {
    log(`🔄 Iniciando ${service.name} na porta ${service.port}...`, service.color);
    
    const process = spawn(service.command, service.args, {
      stdio: 'pipe',
      shell: true
    });
    
    process.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        log(`[${service.name}] ${message}`, service.color);
      }
    });
    
    process.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        log(`[${service.name}] ${message}`, 'red');
      }
    });
    
    process.on('close', (code) => {
      log(`[${service.name}] Processo finalizado com código ${code}`, 'magenta');
    });
    
    processes.push(process);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    log('\n🛑 Parando todos os serviços...', 'yellow');
    processes.forEach(proc => {
      proc.kill('SIGTERM');
    });
    process.exit(0);
  });
  
  log('\n✅ Todos os serviços iniciados!', 'bright');
  log('📱 Servidor principal: http://localhost:5000', 'blue');
  log('🎤 Whisper STT: http://localhost:5001', 'green');
  log('🔊 Coqui TTS: http://localhost:5002', 'yellow');
  log('🌐 M2M100 Translation: http://localhost:5003', 'magenta');
  log('\n💡 Pressione Ctrl+C para parar todos os serviços\n', 'cyan');
}

async function main() {
  log('🌍 Talk World - Iniciando todos os serviços...', 'bright');
  
  // Verificar se arquivos existem
  const requiredFiles = ['whisper-stt-server.py', 'coqui-tts-server.py', 'm2m100-translation-server.py'];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log(`❌ Arquivo não encontrado: ${file}`, 'red');
      log('💡 Execute: python install-voice-services.py', 'cyan');
      process.exit(1);
    }
  }
  
  // Iniciar serviços diretamente
  startServices();
}

main().catch(error => {
  log(`❌ Erro: ${error.message}`, 'red');
  process.exit(1);
});