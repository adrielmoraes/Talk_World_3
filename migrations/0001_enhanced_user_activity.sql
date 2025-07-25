-- Migração para melhorar o sistema de status online e visto por último

-- Adicionar novas colunas à tabela users
ALTER TABLE users 
ADD COLUMN is_online BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
ADD COLUMN last_activity_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Criar tabela para rastrear atividade detalhada dos usuários
CREATE TABLE user_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'online', 'typing', 'viewing_chat', 'app_background', 'app_foreground'
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  metadata JSONB, -- Dados adicionais da atividade
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_type ON user_activity(activity_type);
CREATE INDEX idx_user_activity_conversation ON user_activity(conversation_id);
CREATE INDEX idx_user_activity_created_at ON user_activity(created_at);
CREATE INDEX idx_users_online_status ON users(is_online);
CREATE INDEX idx_users_last_seen ON users(last_seen_at);
CREATE INDEX idx_users_last_activity ON users(last_activity_at);

-- Atualizar last_activity_at para todos os usuários existentes baseado na última mensagem
UPDATE users 
SET last_activity_at = COALESCE(
  (SELECT MAX(created_at) FROM messages WHERE sender_id = users.id),
  users.created_at
),
last_seen_at = COALESCE(
  (SELECT MAX(created_at) FROM messages WHERE sender_id = users.id),
  users.created_at
);