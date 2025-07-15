# Talk World - Real-Time Translation Messaging App

## Overview

Talk World is a WhatsApp-inspired messaging application built with a React frontend and Express backend. The app features real-time messaging with automatic translation capabilities, voice calls with live translation, and a mobile-first design. The application uses PostgreSQL with Drizzle ORM for data persistence and WebSocket connections for real-time communication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a fullstack TypeScript architecture with clear separation between client and server components:

- **Frontend**: React with TypeScript, using Vite for development and building
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time Communication**: WebSocket connections for live messaging and voice calls
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing

## Key Components

### Frontend Architecture
- **Component Structure**: Uses shadcn/ui component library with custom styling
- **Pages**: Modular page components for welcome, OTP verification, profile setup, main app, chat, and voice calls
- **Hooks**: Custom hooks for WebSocket connections, WebRTC, and mobile detection
- **Styling**: Tailwind CSS with custom WhatsApp-inspired color scheme and dark mode support

### Backend Architecture
- **API Routes**: RESTful endpoints for authentication, user management, messaging, and calls
- **WebSocket Server**: Real-time communication for messages and voice call signaling
- **Authentication**: JWT-based authentication with phone number verification via OTP
- **Database Layer**: Drizzle ORM with PostgreSQL for type-safe database operations

### Database Schema
- **Users**: Phone number authentication, user profiles with language preferences
- **OTP Codes**: Temporary verification codes for phone number validation
- **Contacts**: User contact relationships
- **Conversations**: Chat sessions between users with translation settings
- **Messages**: Text messages with original and translated content
- **Calls**: Voice call records and metadata

## Data Flow

1. **Authentication Flow**: 
   - User enters phone number → OTP sent → OTP verification → JWT token issued
   - Optional profile setup for new users (username, gender, language, photo)

2. **Messaging Flow**:
   - Real-time WebSocket connection established after authentication
   - Messages sent through WebSocket with automatic translation when enabled
   - Translation uses mock service (designed for future API integration)

3. **Voice Call Flow**:
   - WebRTC peer connections for voice communication
   - Real-time audio capture, transcription, translation, and synthesis
   - WebSocket signaling for call setup and management

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL database connection
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives for shadcn/ui
- **ws**: WebSocket server implementation
- **jsonwebtoken**: JWT authentication

### Development Tools
- **Vite**: Development server and build tool
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing

### Integrations Implemented
- ✅ **Groq API**: Ultra-fast text translation with llama-3.3-70b-versatile model
- ✅ **OpenAI Whisper**: Speech-to-text transcription for voice translation
- ⚠️ SMS service for OTP delivery (placeholder implementation)
- 🚧 Text-to-speech service (Coqui TTS - placeholder for future implementation)

## Deployment Strategy

The application is configured for deployment on Replit with:

- **Development**: Vite dev server with HMR and runtime error overlay
- **Production**: Built static assets served by Express with API routes
- **Environment Variables**: Database URL and JWT secret configuration
- **Database Migrations**: Drizzle Kit for schema management

The build process creates a single Express server that serves both the API and static frontend assets, making it suitable for platforms like Replit, Heroku, or similar Node.js hosting environments.

## Current Status

**Version 2.0 - Contact Management Complete (Janeiro 2025)**

### Fase 3: Gerenciamento de Contatos ✅ (NOVO)
- ✅ Schema de banco PostgreSQL atualizado com tabelas de contatos
- ✅ Sistema de sincronização de contatos da agenda do dispositivo
- ✅ APIs RESTful completas para gerenciamento de contatos (/api/contacts/*)
- ✅ Interface moderna para exibir contatos registrados vs não registrados
- ✅ Busca e filtros avançados de contatos
- ✅ Histórico de sincronização com métricas detalhadas
- ✅ Integração com sistema de usuários existente
- ✅ Suporte a apelidos personalizados para contatos

### Fase 5: Tradução de Texto ✅
- ✅ Integração Groq API para tradução ultra-rápida de texto
- ✅ Interface do chat com controles de tradução automática
- ✅ Seleção de idioma de destino e painel de configuração
- ✅ Detecção automática de idioma de origem
- ✅ Tradução em tempo real durante envio de mensagens
- ✅ Suporte para 10+ idiomas (Português, Inglês, Espanhol, Francês, etc.)
- ✅ Exibição de texto original e traduzido nas mensagens

### Fase 7: Tradução de Voz ✅
- ✅ Integração Whisper STT com OpenAI para transcrição de áudio
- ✅ Pipeline completo: Whisper → Groq Translation → TTS
- ✅ Processamento de chunks de áudio em tempo real (3 segundos)
- ✅ Interface de chamada de voz com traduções ao vivo
- ✅ WebSocket para broadcasting de traduções entre participantes
- ✅ Status de tradução e indicadores visuais durante chamadas

### Funcionalidades Implementadas
- ✅ Core messaging application fully functional
- ✅ Phone authentication with OTP verification working
- ✅ Real-time WebSocket messaging implemented
- ✅ **Advanced contact management with device sync** (NOVO)
- ✅ **Phone number lookup and user discovery** (NOVO)
- ✅ **Contact categorization (registered vs unregistered)** (NOVO)
- ✅ Voice calling interface complete
- ✅ **Groq API translation service with real-time performance**
- ✅ **Text translation with context awareness**
- ✅ **Voice translation with Whisper STT integration**
- ✅ PostgreSQL database with full CRUD operations
- ✅ JWT authentication system working properly
- ✅ WhatsApp-inspired UI with dark mode support

## Recent Changes (Janeiro 2025)

### Migração Completa para Replit (Janeiro 2025) - NOVO
- ✅ Migração bem-sucedida do Replit Agent para ambiente Replit
- ✅ Configuração do PostgreSQL com variáveis de ambiente
- ✅ Configuração de API keys (GROQ_API_KEY, OPENAI_API_KEY)
- ✅ Correção de problemas de sintaxe e imports
- ✅ Aplicação funcionando completamente na porta 5000

### Melhorias no Gerenciamento de Contatos (Janeiro 2025) - NOVO
- ✅ Adicionado funcionalidade de adicionar contatos manualmente
- ✅ Interface melhorada com diálogo para adicionar contatos por telefone
- ✅ Sistema de busca e descoberta de usuários por número de telefone
- ✅ Integração completa com backend para gerenciamento de contatos
- ✅ Sincronização de contatos do dispositivo (simulada para web)

### Implementação Groq API (Fases 5 e 7)
- ✅ Criado serviço `groqTranslationService` com suporte a tradução de texto
- ✅ Integrado Whisper STT para transcrição de áudio em tempo real
- ✅ Implementadas APIs RESTful para tradução (`/api/translation/*`)
- ✅ Adicionados controles de tradução na interface do chat
- ✅ Melhorada interface de chamadas de voz com traduções ao vivo
- ✅ Suporte a detecção automática de idioma e tradução contextual

## Future Roadmap

**Phase 2 - Advanced Features** 
- ✅ ~~Integrate real-time voice translation with Whisper STT and Groq API~~ CONCLUÍDO
- ✅ ~~Add advanced translation features with Groq API~~ CONCLUÍDO
- 🚧 Implement Coqui TTS for voice synthesis
- 🚧 Implement end-to-end encryption for messages and calls
- 🚧 Add file sharing and media messaging capabilities

**Phase 3 - Mobile & Scaling**
- Build React Native mobile applications for iOS and Android
- Add group messaging and group calls functionality
- Implement advanced privacy controls and user settings

## Architecture Decisions

### Database Choice
- **PostgreSQL with Drizzle**: Chosen for type safety, excellent TypeScript integration, and robust relational data handling
- **Neon Database**: Serverless PostgreSQL provider for easy deployment and scaling

### Real-time Communication
- **WebSocket**: Native WebSocket implementation for reliable real-time messaging
- **WebRTC**: Direct peer-to-peer connections for voice calls to minimize latency

### UI/UX Design
- **WhatsApp-inspired**: Familiar interface patterns for user adoption
- **Mobile-first**: Responsive design prioritizing mobile experience
- **Dark mode**: Built-in theme switching for user preference

### Translation Architecture
- **Server-side processing**: Translation happens on the backend to maintain consistency
- **Per-conversation settings**: Users can enable/disable translation per chat
- **Dual text storage**: Both original and translated text stored for user reference