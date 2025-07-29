# Talk World 3.0 🌍

Um aplicativo de tradução em tempo real com reconhecimento de voz e síntese de fala, powered by AI.

## 🚀 Instalação Automática

Este projeto está configurado para instalação **completamente automática** de todas as dependências:

```bash
npm install
```

O comando acima irá automaticamente:
- ✅ Instalar todas as dependências Node.js
- ✅ Verificar e configurar Python
- ✅ Instalar Whisper (OpenAI Speech-to-Text)
- ✅ Instalar Coqui TTS (Text-to-Speech)
- ✅ Baixar modelos de IA necessários
- ✅ Configurar ambiente de produção
- ✅ Criar arquivos de configuração

## 🎯 Recursos

- **Tradução em Tempo Real**: Powered by Groq AI
- **Reconhecimento de Voz**: OpenAI Whisper
- **Síntese de Fala**: Coqui TTS
- **Interface Moderna**: React + Tailwind CSS
- **WebSockets**: Comunicação em tempo real
- **Multi-idiomas**: Suporte a 20+ idiomas
- **Responsivo**: Funciona em desktop e mobile

## 🛠️ Comandos Disponíveis

### Verificação do Sistema
```bash
npm run check:system    # Verifica se tudo está funcionando
```

### Desenvolvimento
```bash
npm run dev            # Inicia todos os serviços
npm run dev:main       # Apenas servidor principal
npm run dev:whisper    # Apenas Whisper STT
npm run dev:coqui      # Apenas Coqui TTS
```

### Produção
```bash
npm run build              # Compila para produção
npm run start              # Servidor principal apenas
npm run start:production   # Todos os serviços em produção
```

### Configuração
```bash
npm run setup:voice       # Reinstala serviços de voz
npm run setup:production  # Configuração completa
```

## ⚙️ Configuração

1. **Copie o arquivo de exemplo**:
   ```bash
   cp .env.example .env
   ```

2. **Configure suas variáveis** em `.env`:
   ```env
   # API Keys
   GROQ_API_KEY=sua_chave_groq_aqui
   OPENAI_API_KEY=sua_chave_openai_aqui
   
   # Database
   DATABASE_URL=postgresql://user:pass@localhost:5432/db
   
   # Security
   SESSION_SECRET=sua_chave_secreta_aqui
   ```

3. **Execute a verificação**:
   ```bash
   npm run check:system
   ```

## 🏗️ Arquitetura

```
Talk World 3.0/
├── 📱 Frontend (React + Vite)
│   ├── Interface de usuário moderna
│   ├── WebSocket para tempo real
│   └── Gravação de áudio
│
├── 🖥️ Backend (Node.js + Express)
│   ├── API REST
│   ├── WebSocket server
│   └── Gerenciamento de sessões
│
├── 🎤 Whisper STT Server (Python)
│   ├── Reconhecimento de voz
│   ├── Suporte multi-idiomas
│   └── API REST
│
├── 🔊 Coqui TTS Server (Python)
│   ├── Síntese de fala
│   ├── Vozes naturais
│   └── API REST
│
└── 🤖 AI Services
    ├── Groq (tradução)
    ├── OpenAI (fallback)
    └── Modelos locais
```

## 🌐 Portas

- **5173**: Aplicação principal (HTTP + WebSocket)
- **5001**: Whisper STT Server
- **5002**: Coqui TTS Server

## 📋 Requisitos

### Automáticos (instalados automaticamente)
- Node.js 18+
- Python 3.8+
- pip (gerenciador Python)

### Manuais (você precisa configurar)
- Chave API do Groq: [console.groq.com](https://console.groq.com/)
- Chave API do OpenAI: [platform.openai.com](https://platform.openai.com/)
- Banco PostgreSQL (para produção)

## 🚨 Troubleshooting

### Problema: Python não encontrado
```bash
# Instale Python 3.8+ de python.org
# Certifique-se que está no PATH
python --version
```

### Problema: Erro nas dependências Python
```bash
pip install -r voice-requirements.txt
```

### Problema: Modelo Whisper não baixa
```bash
python -c "import whisper; whisper.load_model('base')"
```

### Problema: Serviços não iniciam
```bash
# Verifique se as portas estão livres
netstat -an | findstr :5001
netstat -an | findstr :5002
netstat -an | findstr :5173
```

### Reinstalação completa
```bash
npm run setup:production
npm run check:system
```

## 🔧 Desenvolvimento

### Estrutura do Projeto
```
├── client/          # Frontend React
├── server/          # Backend Node.js
├── shared/          # Código compartilhado
├── *.py            # Serviços Python
├── setup-*.js      # Scripts de configuração
└── package.json    # Configuração npm
```

### Adicionando Novos Idiomas
1. Adicione o idioma em `LANGUAGE_MAP` nos servidores Python
2. Atualize as configurações do frontend
3. Teste com `npm run check:system`

### Customizando Modelos
- **Whisper**: Edite `whisper-stt-server.py`
- **TTS**: Edite `coqui-tts-server.py`
- **Tradução**: Configure `GROQ_MODEL` no `.env`

## 📚 Documentação Adicional

- [PRODUCTION.md](./PRODUCTION.md) - Guia detalhado de produção
- [API Documentation](./docs/api.md) - Documentação da API
- [Voice Services](./docs/voice.md) - Configuração de voz

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-feature`
3. Commit: `git commit -m 'Adiciona nova feature'`
4. Push: `git push origin feature/nova-feature`
5. Abra um Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- OpenAI Whisper
- Coqui TTS
- Groq AI
- React Team
- Vite Team

---

**Talk World 3.0** - Quebrando barreiras linguísticas com IA 🌍✨