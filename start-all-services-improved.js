#!/usr/bin/env node

/**
 * Script melhorado para iniciar todos os serviços do Talk World
 * Inclui verificações de dependências e inicialização sequencial
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    
    // Verificar se as dependências principais estão instaladas
    const checkCmd = 'python -c "import whisper, TTS, torch; print(\'Dependencies OK\')';
    
    exec(checkCmd, (error, stdout, stderr) => {
      if (error) {
        log('❌ Dependências Python não encontradas. Instalando...', 'yellow');
        
        // Instalar dependências do arquivo requirements
        const installProcess = spawn('pip', ['install', '-r', 'voice-requirements.txt'], {
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

function startService(name, command, color, port) {
  return new Promise((resolve) => {
    log(`🚀 Iniciando ${name}...`, color);
    
    const service = spawn('python', [command], {
      stdio: 'pipe',
      shell: true,
      cwd: __dirname
    });
    
    let started = false;
    
    service.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`${colors[color]}[${name}]${colors.reset} ${output.trim()}`);
      
      // Verificar se o serviço iniciou com sucesso
      if (!started && (output.includes('Running on') || output.includes('Server started') || output.includes('model loaded'))) {
        started = true;
        log(`✅ ${name} iniciado com sucesso!`, 'green');
        resolve(service);
      }
    });
    
    service.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`${colors.red}[${name} ERROR]${colors.reset} ${output.trim()}`);
    });
    
    service.on('close', (code) => {
      if (code !== 0) {
        log(`❌ ${name} encerrado com código ${code}`, 'red');
      }
    });
    
    // Timeout para serviços que demoram para iniciar
    setTimeout(() => {
      if (!started) {
        log(`⏰ ${name} ainda carregando... (isso pode demorar alguns minutos)`, 'yellow');
        resolve(service);
      }
    }, 30000);
  });
}

function startMainServer() {
  return new Promise((resolve) => {
    log('🚀 Iniciando servidor principal...', 'blue');
    
    const mainServer = spawn('npm', ['run', 'dev:main'], {
      stdio: 'pipe',
      shell: true,
      cwd: __dirname
    });
    
    mainServer.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`${colors.blue}[MAIN]${colors.reset} ${output.trim()}`);
    });
    
    mainServer.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`${colors.red}[MAIN ERROR]${colors.reset} ${output.trim()}`);
    });
    
    resolve(mainServer);
  });
}

async function main() {
  try {
    log('🌍 Iniciando Talk World 3.0...', 'bright');
    
    // Verificar dependências Python
    const depsOk = await checkPythonDependencies();
    if (!depsOk) {
      log('❌ Falha ao instalar dependências. Abortando...', 'red');
      process.exit(1);
    }
    
    log('\n📋 Iniciando serviços de voz...', 'cyan');
    
    // Iniciar serviços de voz em paralelo
    const services = await Promise.all([
      startService('Whisper STT', 'whisper-stt-server.py', 'green', 5001),
      startService('Coqui TTS', 'coqui-tts-server.py', 'yellow', 5002),
      startService('M2M100 Translation', 'm2m100-translation-server.py', 'magenta', 5003)
    ]);
    
    // Aguardar um pouco para os serviços estabilizarem
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Iniciar servidor principal
    const mainServer = await startMainServer();
    
    log('\n🎉 Todos os serviços foram iniciados!', 'green');
    log('📍 Acesse: http://localhost:3000', 'cyan');
    log('🔊 Whisper STT: http://localhost:5001', 'green');
    log('🗣️  Coqui TTS: http://localhost:5002', 'yellow');
    log('🌐 M2M100: http://localhost:5003', 'magenta');
    
    // Manter o processo vivo
    process.on('SIGINT', () => {
      log('\n🛑 Encerrando todos os serviços...', 'yellow');
      services.forEach(service => service.kill());
      mainServer.kill();
      process.exit(0);
    });
    
  } catch (error) {
    log(`❌ Erro ao iniciar serviços: ${error.message}`, 'red');
    process.exit(1);
  }
}

main().catch(error => {
  log(`❌ Erro fatal: ${error.message}`, 'red');
  process.exit(1);
});