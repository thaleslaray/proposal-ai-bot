import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { adminLog, adminWarn } from '@/utils/adminLog';
import { getCachedRole, setCachedRole, clearRoleCache } from '@/lib/roleCache';
import { debugLog, debugWarn } from '@/utils/debugLogger';
import { logger } from '@/lib/logger';

/**
 * Interface para dados de validação de acesso Hotmart
 */
interface HotmartAccess {
  hasAccess: boolean;
  role: 'free' | 'student' | 'lifetime';
  validationStatus: 'success' | 'error' | 'timeout' | 'pending';
  lastCheck: string;
  expiresAt: string;
  errorMessage?: string;
}

/**
 * Interface para evento ativo do usuário
 */
interface ActiveEvent {
  event_slug: string;
  event_name: string;
  custom_limit: number | null;
  end_date: string;
}

/**
 * Interface para resultado da verificação de roles
 */
interface UserRolesResult {
  isAdminRole: boolean;
  isLifetimeRole: boolean;
  isStudentRole: boolean;
}

/**
 * Interface para payload de notificação de mudança de role
 */
interface RoleChangePayload {
  new?: {
    type?: string;
    title?: string;
    body?: string;
  };
}

/**
 * Interface do contexto de autenticação
 *
 * Expõe estados e métodos de autenticação para toda a aplicação.
 */
interface PrdPermissions {
  canToggleVisibility: boolean;
  canDelete: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isStudent: boolean;
  isLifetime: boolean;
  isAdmin: boolean;
  loading: boolean;
  hotmartAccess: HotmartAccess | null;
  validateHotmartAccess: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  currentEvent: ActiveEvent | null;
  eventLimit: number | null;
  permissions: PrdPermissions;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isStudent, setIsStudent] = useState(false);
  const [isLifetime, setIsLifetime] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hotmartAccess, setHotmartAccess] = useState<HotmartAccess | null>(null);
  const [currentEvent, setCurrentEvent] = useState<ActiveEvent | null>(null);
  const [eventLimit, setEventLimit] = useState<number | null>(null);
  const [isCheckingRoles, setIsCheckingRoles] = useState(false);
  const [isValidatingHotmart, setIsValidatingHotmart] = useState(false);
  const [permissions, setPermissions] = useState<PrdPermissions>({
    canToggleVisibility: false,
    canDelete: false,
  });
  const hasInitialized = useRef(false);
  const checkRolesPromise = useRef<Promise<UserRolesResult> | null>(null);
  const hotmartValidationRef = useRef(false);

  // Removed: checkActiveEvent - now integrated in checkUserRoles via get_user_full_context RPC

  const checkUserRoles = useCallback(async (userId: string) => {
    // Se já existe uma Promise em andamento, retornar ela
    if (checkRolesPromise.current) {
      debugLog('⏭️ Retornando Promise existente');
      return checkRolesPromise.current;
    }

    // Criar nova Promise e armazenar
    checkRolesPromise.current = (async () => {
      try {
        let result;

        // 1. Verificar cache primeiro
        const cached = getCachedRole(userId);
        if (cached) {
          result = {
            isAdminRole: cached.includes('admin'),
            isLifetimeRole: cached.includes('lifetime'),
            isStudentRole: cached.includes('student'),
          };
          adminLog(result.isAdminRole, '✅ User roles loaded (cached):', result);

          // Set cached roles immediately
          setIsAdmin(result.isAdminRole);
          setIsLifetime(result.isLifetimeRole);
          setIsStudent(result.isStudentRole);

          return result;
        }

        // 2. Query optimizada: busca roles + evento ativo em uma única chamada
        const { data, error } = await supabase.rpc('get_user_full_context', {
          p_user_id: userId,
        });

        if (error) throw error;

        const context = data?.[0];
        const roles = context?.roles || [];

        // Cache roles
        setCachedRole(userId, roles.join(','));

        result = {
          isAdminRole: roles.includes('admin'),
          isLifetimeRole: roles.includes('lifetime'),
          isStudentRole: roles.includes('student'),
        };

        adminLog(result.isAdminRole, '✅ User context loaded:', result);

        // 3. Atualizar todos os estados de uma vez
        setIsAdmin(result.isAdminRole);
        setIsLifetime(result.isLifetimeRole);
        setIsStudent(result.isStudentRole);

        // 4. Atualizar evento ativo (se existir)
        if (context?.active_event_slug) {
          setCurrentEvent({
            event_slug: context.active_event_slug,
            event_name: context.active_event_name,
            custom_limit: context.event_custom_limit,
            end_date: context.event_end_date,
          });
          setEventLimit(context.event_custom_limit);
          debugLog('🎉 Evento ativo detectado:', context.active_event_name);
        } else {
          setCurrentEvent(null);
          setEventLimit(null);
        }

        return result;
      } catch (error) {
        logger.error('Error checking user context:', error);
        setIsStudent(false);
        setIsLifetime(false);
        setIsAdmin(false);
        setCurrentEvent(null);
        setEventLimit(null);
        return { isAdminRole: false, isLifetimeRole: false, isStudentRole: false };
      } finally {
        // Limpar Promise ao terminar
        checkRolesPromise.current = null;
      }
    })();

    return checkRolesPromise.current;
  }, []);

  useEffect(() => {
    // Sempre começar com loading = true para evitar race conditions
    setLoading(true);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        debugLog('🔄 Initial session - loading roles for user:', session.user.id);
        checkUserRoles(session.user.id).then(result => {
          hasInitialized.current = true;
          setLoading(false);
          debugLog('✅ Initial role loading complete - roles:', result);
        });
      } else {
        setLoading(false);
        hasInitialized.current = true;
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        debugLog('🔄 Auth state change - loading roles for user:', session.user.id);
        setLoading(true);
        checkUserRoles(session.user.id).then(result => {
          setLoading(false);
          debugLog('✅ Role loading complete - roles:', result);
        });
      } else if (!session?.user) {
        debugLog('🚪 User logged out - clearing roles');
        setIsStudent(false);
        setIsLifetime(false);
        setIsAdmin(false);
        setHotmartAccess(null);
        setCurrentEvent(null);
        setEventLimit(null);
        setLoading(false);
        hasInitialized.current = false;
      }
    });

    // Escutar mudanças de role via notificações Realtime
    let roleChangeChannel: RealtimeChannel | null = null;
    if (session?.user) {
      roleChangeChannel = supabase
        .channel('role-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`,
          },
          async (payload: RoleChangePayload) => {
            if (payload.new?.type === 'role_change') {
              debugLog('🔄 Role mudou! Recarregando permissões...');
              clearRoleCache();
              if (session?.user) {
                await checkUserRoles(session.user.id);
              }

              // Mostrar toast de sucesso
              const toast = await import('sonner');
              toast.toast.success(payload.new.title ?? '', {
                description: payload.new.body ?? '',
                duration: 8000,
              });
            }
          }
        )
        .subscribe();
    }

    return () => {
      subscription.unsubscribe();
      if (roleChangeChannel) {
        supabase.removeChannel(roleChangeChannel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkUserRoles]);
  // Note: session is intentionally NOT in deps - auth listeners should only be created once on mount
  // The session parameter in callbacks comes from the event itself, not from closure

  const validateHotmartAccess = useCallback(async () => {
    if (!user || !session) return;

    if (isValidatingHotmart) {
      debugLog('⏭️ Pulando validateHotmart - já em execução');
      return;
    }

    setIsValidatingHotmart(true);

    try {
      const email = user.email || user.user_metadata?.email;
      if (!email) {
        adminWarn(isAdmin, '⚠️ Usuário sem email, pulando validação Hotmart');
        return;
      }

      adminLog(isAdmin, '🔍 Validando acesso Hotmart para:', email);

      const { data, error } = await supabase.functions.invoke('validate-hotmart-access', {
        body: {
          user_id: user.id,
          email: email,
        },
      });

      if (error) {
        logger.error('Erro ao validar Hotmart:', error);
        return;
      }

      if (data) {
        setHotmartAccess({
          hasAccess: data.hasAccess || false,
          role: data.role || 'free',
          validationStatus: data.validationStatus || 'success',
          lastCheck: data.lastCheck || new Date().toISOString(),
          expiresAt: data.expiresAt || '',
          errorMessage: data.errorMessage,
        });

        // Se houve erro, agendar retry em 5min
        if (data.validationStatus === 'error' || data.validationStatus === 'timeout') {
          adminLog(isAdmin, '⏱️ Agendando retry em 5 minutos devido a erro');
          setTimeout(
            () => {
              adminLog(isAdmin, '🔄 Executando retry agendado');
              validateHotmartAccess();
            },
            5 * 60 * 1000
          );
        }
      }
    } catch (error) {
      logger.error('Erro crítico ao validar Hotmart:', error);
    } finally {
      setIsValidatingHotmart(false);
    }
  }, [user, session, isValidatingHotmart, isAdmin]);

  // Validar ao carregar usuário + revalidar a cada 12h
  useEffect(() => {
    if (!user?.id || !session?.access_token) return;
    
    // Prevenir múltiplas validações simultâneas
    if (hotmartValidationRef.current) {
      debugLog('⏭️ Pulando validação - já em execução');
      return;
    }
    
    hotmartValidationRef.current = true;

    const timer = setTimeout(() => {
      validateHotmartAccess().finally(() => {
        hotmartValidationRef.current = false;
      });
    }, 100);

    // Revalidar a cada 12h
    const interval = setInterval(
      () => {
        if (!hotmartValidationRef.current) {
          hotmartValidationRef.current = true;
          validateHotmartAccess().finally(() => {
            hotmartValidationRef.current = false;
          });
        }
      },
      12 * 60 * 60 * 1000
    );

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      hotmartValidationRef.current = false;
    };
  }, [user?.id, session?.access_token]);

  const fetchPermissions = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_user_prd_permissions', { _user_id: user.id });

      if (error) throw error;

      if (data && data.length > 0) {
        setPermissions({
          canToggleVisibility: data[0].can_toggle_visibility || false,
          canDelete: data[0].can_delete || false,
        });
      }
    } catch (error) {
      logger.error('Error fetching permissions:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchPermissions();
    }
  }, [user, fetchPermissions]);

  const refreshRoles = async () => {
    if (user) {
      // Execute queries in parallel for faster refresh
      await Promise.all([checkUserRoles(user.id), fetchPermissions()]);
    }
  };

  const signOut = async () => {
    debugLog('🚪 Signing out - resetting state');
    await supabase.auth.signOut();
    clearRoleCache(); // Limpar cache ao fazer logout
    hasInitialized.current = false; // Reset para forçar reload na próxima autenticação
    setUser(null);
    setSession(null);
    setIsStudent(false);
    setIsLifetime(false);
    setIsAdmin(false);
    setHotmartAccess(null);
    setCurrentEvent(null);
    setEventLimit(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isStudent,
        isLifetime,
        isAdmin,
        loading,
        hotmartAccess,
        validateHotmartAccess,
        signOut,
        refreshRoles,
        currentEvent,
        eventLimit,
        permissions,
        refreshPermissions: fetchPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook para acessar o contexto de autenticação
 *
 * @returns Objeto AuthContextType com estados e métodos de autenticação
 * @throws {Error} Se usado fora de um AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isStudent, signOut } = useAuth();
 *
 *   if (!user) return <Login />;
 *
 *   return (
 *     <div>
 *       <p>Olá, {user.email}</p>
 *       {isStudent && <StudentFeature />}
 *       <button onClick={signOut}>Sair</button>
 *     </div>
 *   );
 * }
 * ```
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
