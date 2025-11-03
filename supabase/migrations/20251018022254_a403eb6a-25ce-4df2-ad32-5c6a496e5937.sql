-- Adicionar novo role 'lifetime' ao enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'lifetime';

-- Documentar os tiers
COMMENT ON TYPE app_role IS 'User access levels: free (1/day), student (3/day), lifetime (unlimited), admin (unlimited)';