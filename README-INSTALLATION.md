# Talk World 3.0 - Guia de Instalação Atualizado

## 🚀 Instalação Rápida

### Pré-requisitos
- Node.js 18+ 
- Python 3.8+
- pip (gerenciador de pacotes Python)

### Instalação Completa

```bash
# 1. Instalar dependências Node.js e Python automaticamente
npm install

# OU instalar manualmente:
npm install
npm run postinstall
```

### O que acontece durante a instalação:

1. **Dependências Node.js**: Instala todas as dependências do frontend e backend
2. **Coqui TTS v0.22.0**: Versão compatível com PyTorch 2.6+
3. **Whisper STT**: Para reconhecimento de voz
4. **M2M100**: Para tradução de texto
5. **PyTorch**: Versão otimizada para TTS

## 🎯 Iniciar o Projeto

### Desenvolvimento (Todos os Serviços)
```bash
npm run dev
# OU
npm run dev:all
```

### Produção (Todos os Serviços)
```bash
npm run build
npm start
```

### Serviços Individuais
```bash
# Servidor principal apenas
npm run dev:main

# Whisper STT apenas
npm run dev:whisper

# Coqui TTS apenas  
npm run dev:coqui

# M2M100 Translation apenas
npm run dev:m2m100
```

## 🌐 URLs dos Serviços

Quando todos os serviços estão rodando:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3000/api
- **Whisper STT**: http://localhost:5001
- **Coqui TTS**: http://localhost:5002
- **M2M100 Translation**: http://localhost:5003

## 🔧 Configurações Específicas

### Coqui TTS
- **Modelo**: `tts_models/multilingual/multi-dataset/xtts_v2`
- **Versão**: 0.22.0 (compatível com PyTorch 2.6+)
- **Correções**: Inclui fixes para serialização PyTorch
- **Modo**: Voice cloning (clonagem de voz)

### Whisper STT
- **Modelo**: Base (download automático)
- **Idiomas**: Suporte multilíngue
- **Formato**: WAV, MP3, M4A

### M2M100 Translation
- **Modelo**: facebook/m2m100_418M
- **Idiomas**: 100+ idiomas suportados
- **Modo**: Offline (sem necessidade de internet)

## 🛠️ Comandos de Manutenção

### Reinstalar Dependências Python
```bash
npm run setup:all
```

### Instalar apenas Coqui TTS
```bash
npm run setup:coqui
```

### Verificar Sistema
```bash
npm run check:system
```

### Build para Produção
```bash
npm run setup:production
```

## 🐛 Solução de Problemas

### Erro de Serialização PyTorch
✅ **Resolvido automaticamente** - O projeto inclui correções para PyTorch 2.6+

### Modelo Coqui TTS não carrega
```bash
# Reinstalar com versão específica
pip install TTS==0.22.0 --force-reinstall
```

### Dependências Python em conflito
```bash
# Limpar e reinstalar
pip uninstall TTS torch torchvision torchaudio
npm run setup:coqui
```

### Porta em uso
- Whisper STT: Mude a porta em `whisper-stt-server.py`
- Coqui TTS: Mude a porta em `coqui-tts-server.py`
- M2M100: Mude a porta em `m2m100-translation-server.py`

## 📁 Estrutura do Projeto

```
Talk_World_3-1/
├── client/                 # Frontend React
├── server/                 # Backend Node.js
├── coqui-tts-server.py    # Servidor TTS (Porta 5002)
├── whisper-stt-server.py  # Servidor STT (Porta 5001)
├── m2m100-translation-server.py # Servidor Tradução (Porta 5003)
├── voice-requirements.txt # Dependências Python
├── package.json          # Dependências Node.js
└── start-all-services.js # Script de inicialização
```

## 🎉 Recursos Principais

- ✅ **Síntese de Voz (TTS)**: Coqui TTS com clonagem de voz
- ✅ **Reconhecimento de Voz (STT)**: Whisper OpenAI
- ✅ **Tradução**: M2M100 para 100+ idiomas
- ✅ **Interface Web**: React com Tailwind CSS
- ✅ **API REST**: Express.js com WebSocket
- ✅ **Banco de Dados**: Neon PostgreSQL
- ✅ **Autenticação**: JWT + Passport.js

## 📞 Suporte

Se encontrar problemas:
1. Verifique se todas as dependências estão instaladas: `npm run check:system`
2. Reinstale as dependências: `npm run setup:all`
3. Verifique os logs dos serviços individuais
4. Consulte a documentação específica de cada serviço