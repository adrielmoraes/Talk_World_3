# Configuração do Coqui TTS para Talk World 2.0

Este documento fornece instruções sobre como configurar e usar o Coqui TTS com o Talk World 2.0 para síntese de fala.

## Pré-requisitos

- Python 3.7 ou superior
- Node.js 16 ou superior
- npm ou yarn

## Instalação do Coqui TTS

O Coqui TTS é uma biblioteca Python que precisa ser instalada separadamente do projeto principal. Siga estas etapas para configurar o servidor Coqui TTS:

### Opção 1: Instalação via pip (recomendado para desenvolvimento)

```bash
# Crie um ambiente virtual Python (opcional, mas recomendado)
python -m venv coqui-tts-env

# Ative o ambiente virtual
# No Windows
coqui-tts-env\Scripts\activate
# No Linux/Mac
source coqui-tts-env/bin/activate

# Instale o Coqui TTS
pip install TTS
```

### Opção 2: Instalação via Docker

Se você preferir usar Docker, você pode executar o servidor Coqui TTS em um contêiner:

```bash
docker run --rm -it -p 5002:5002 ghcr.io/coqui-ai/tts-cpu
```

## Iniciando o servidor Coqui TTS

Após a instalação, você precisa iniciar o servidor Coqui TTS:

### Se instalado via pip:

```bash
# Liste os modelos disponíveis
python -m TTS.server.server --list_models

# Inicie o servidor com um modelo específico (exemplo com modelo em inglês)
python -m TTS.server.server --model_name tts_models/en/vctk/vits

# Ou para um modelo em português
python -m TTS.server.server --model_name tts_models/pt/cv/vits
```

### Se instalado via Docker:

```bash
# Dentro do contêiner Docker
python3 TTS/server/server.py --list_models
python3 TTS/server/server.py --model_name tts_models/en/vctk/vits
```

## Configuração do Talk World 2.0

Para que o Talk World 2.0 se comunique com o servidor Coqui TTS, você precisa definir a variável de ambiente `COQUI_TTS_SERVER_URL`. Por padrão, o servidor Coqui TTS é executado em `http://localhost:5002`.

### Configuração das variáveis de ambiente

Crie ou edite o arquivo `.env` na raiz do projeto e adicione:

```
COQUI_TTS_SERVER_URL=http://localhost:5002
```

Se você estiver executando o servidor Coqui TTS em outro host ou porta, ajuste a URL de acordo.

## Testando a integração

Após iniciar tanto o servidor Coqui TTS quanto o Talk World 2.0, você pode testar a integração fazendo uma requisição para o endpoint TTS:

```bash
curl -X POST http://localhost:3000/api/voice/tts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -d '{"text":"Olá, este é um teste de síntese de fala", "language":"pt-BR"}' \
  --output speech.wav
```

Isso deve gerar um arquivo `speech.wav` com o áudio sintetizado.

## Solução de problemas

### O servidor Coqui TTS não está respondendo

- Verifique se o servidor Coqui TTS está em execução
- Confirme se a URL configurada em `COQUI_TTS_SERVER_URL` está correta
- Verifique os logs do servidor Coqui TTS para erros

### Erros de síntese de fala

- Verifique se o modelo selecionado suporta o idioma solicitado
- Tente usar um texto mais curto para testar
- Verifique se há caracteres especiais no texto que podem estar causando problemas

## Idiomas suportados

O Coqui TTS suporta vários idiomas, dependendo dos modelos instalados. Os idiomas mapeados no Talk World 2.0 incluem:

- Inglês (en-US)
- Português (pt-BR)
- Espanhol (es-ES)
- Francês (fr-FR)
- Alemão (de-DE)
- Italiano (it-IT)
- Japonês (ja-JP)
- Chinês (zh-CN)
- Russo (ru-RU)
- Coreano (ko-KR)

Para adicionar suporte a mais idiomas, você precisará modificar o mapeamento de idiomas no arquivo `server/voice-translation.ts`.

## Recursos adicionais

- [Documentação oficial do Coqui TTS](https://github.com/coqui-ai/TTS)
- [API do servidor Coqui TTS](https://github.com/coqui-ai/TTS/wiki/TTS-Server)
- [Modelos disponíveis](https://github.com/coqui-ai/TTS/wiki/Models-and-Languages)