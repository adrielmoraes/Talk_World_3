#!/usr/bin/env node
/**
 * Talk World System Check
 * Verifica se todos os componentes estão funcionando corretamente
 */

import { exec } from 'child_process';
import fs from 'fs';
import http from 'http';
import path from 'path';
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
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description}: ${filePath}`, 'green');
    return true;
  } else {
    log(`❌ ${description}: ${filePath}`, 'red');
    return false;
  }
}

function checkCommand(command, description) {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        log(`❌ ${description}: Não encontrado`, 'red');
        resolve(false);
      } else {
        log(`✅ ${description}: ${stdout.trim()}`, 'green');
        resolve(true);
      }
    });
  });
}

function checkPythonPackage(packageName) {
  return new Promise((resolve) => {
    exec(`python -c "import ${packageName}; print('${packageName} OK')"`, (error, stdout, stderr) => {
      if (error) {
        log(`❌ Python package: ${packageName}`, 'red');
        resolve(false);
      } else {
        log(`✅ Python package: ${packageName}`, 'green');
        resolve(true);
      }
    });
  });
}

function checkService(url, serviceName) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        log(`✅ ${serviceName}: Rodando em ${url}`, 'green');
        resolve(true);
      } else {
        log(`❌ ${serviceName}: Erro HTTP ${res.statusCode}`, 'red');
        resolve(false);
      }
    });

    req.on('error', (error) => {
      log(`❌ ${serviceName}: Não está rodando em ${url}`, 'red');
      resolve(false);
    });

    req.on('timeout', () => {
      log(`❌ ${serviceName}: Timeout em ${url}`, 'red');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function checkSystem() {
  log('🌍 Talk World - Verificação do Sistema', 'bright');
  log('======================================', 'bright');
  
  let allOk = true;
  
  // Check Node.js files
  log('\n📦 Verificando arquivos Node.js...', 'cyan');
  const nodeFiles = [
    ['package.json', 'Package.json'],
    ['server/index.ts', 'Servidor principal'],
    ['client/src/App.tsx', 'Cliente React'],
    ['vite.config.ts', 'Configuração Vite']
  ];
  
  for (const [file, desc] of nodeFiles) {
    if (!checkFile(file, desc)) allOk = false;
  }
  
  // Check Python files
  log('\n🐍 Verificando arquivos Python...', 'cyan');
  const pythonFiles = [
    ['whisper-stt-server.py', 'Servidor Whisper STT'],
    ['coqui-tts-server.py', 'Servidor Coqui TTS'],
    ['voice-requirements.txt', 'Requisitos Python'],
    ['install-voice-services.py', 'Script de instalação']
  ];
  
  for (const [file, desc] of pythonFiles) {
    if (!checkFile(file, desc)) allOk = false;
  }
  
  // Check setup files
  log('\n⚙️ Verificando arquivos de configuração...', 'cyan');
  const setupFiles = [
    ['setup-production.js', 'Script de produção'],
    ['.env.example', 'Template de ambiente'],
    ['start-all-services.js', 'Iniciador de serviços']
  ];
  
  for (const [file, desc] of setupFiles) {
    if (!checkFile(file, desc)) allOk = false;
  }
  
  // Check system commands
  log('\n💻 Verificando comandos do sistema...', 'cyan');
  const nodeOk = await checkCommand('node --version', 'Node.js');
  const npmOk = await checkCommand('npm --version', 'npm');
  const pythonOk = await checkCommand('python --version', 'Python');
  const pipOk = await checkCommand('pip --version', 'pip');
  
  if (!nodeOk || !npmOk || !pythonOk || !pipOk) allOk = false;
  
  // Check Python packages
  log('\n📚 Verificando pacotes Python...', 'cyan');
  const packages = ['whisper', 'TTS', 'flask', 'flask_cors', 'torch', 'numpy'];
  
  for (const pkg of packages) {
    const pkgOk = await checkPythonPackage(pkg);
    if (!pkgOk) allOk = false;
  }
  
  // Check if services are running (optional)
  log('\n🔌 Verificando serviços (se estiverem rodando)...', 'cyan');
  log('ℹ️ Esta verificação é opcional - os serviços podem não estar rodando', 'yellow');
  
  await checkService('http://localhost:5001', 'Whisper STT');
  await checkService('http://localhost:5002', 'Coqui TTS');
  await checkService('http://localhost:5173', 'Servidor Principal');
  
  // Check environment
  log('\n🌐 Verificando configuração de ambiente...', 'cyan');
  if (fs.existsSync('.env')) {
    log('✅ Arquivo .env encontrado', 'green');
  } else {
    log('⚠️ Arquivo .env não encontrado (use .env.example como base)', 'yellow');
  }
  
  if (fs.existsSync('.env.production')) {
    log('✅ Arquivo .env.production encontrado', 'green');
  } else {
    log('ℹ️ Arquivo .env.production não encontrado (será criado automaticamente)', 'cyan');
  }
  
  // Final result
  log('\n📊 Resultado da Verificação', 'bright');
  log('===========================', 'bright');
  
  if (allOk) {
    log('🎉 Sistema está pronto para produção!', 'green');
    log('\n📋 Para iniciar:', 'cyan');
    log('1. Configure .env com suas variáveis', 'cyan');
    log('2. Execute: npm run build', 'cyan');
    log('3. Execute: npm run start:production', 'cyan');
  } else {
    log('⚠️ Sistema tem problemas que precisam ser resolvidos', 'yellow');
    log('\n🔧 Para corrigir:', 'cyan');
    log('1. Execute: npm install', 'cyan');
    log('2. Execute: npm run setup:production', 'cyan');
    log('3. Execute novamente: node check-system.js', 'cyan');
  }
  
  log('\n📖 Para mais informações, leia PRODUCTION.md', 'cyan');
}

// Run the check
checkSystem().catch(error => {
  log(`❌ Erro durante verificação: ${error.message}`, 'red');
  process.exit(1);
});