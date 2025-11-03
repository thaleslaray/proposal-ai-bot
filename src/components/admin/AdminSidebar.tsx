import { LayoutDashboard, Users, FileText, BarChart3, Settings, Calendar } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const menuItems = [
  { title: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
  { title: 'Usuários', path: '/admin/users', icon: Users },
  { title: 'Documentos', path: '/admin/documents', icon: FileText },
  { title: 'Eventos', path: '/admin/eventos', icon: Calendar },
  { title: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { title: 'Configurações', path: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const { open } = useSidebar();
  const queryClient = useQueryClient();

  // OTIMIZAÇÃO: Prefetch ao hover para navegação instantânea
  const handleMouseEnter = (path: string) => {
    switch (path) {
      case '/admin':
        queryClient.prefetchQuery({ queryKey: ['admin-stats'] });
        break;
      
      case '/admin/users':
        queryClient.prefetchQuery({ 
          queryKey: ['admin-users'],
          staleTime: 5 * 60 * 1000
        });
        break;
      
      case '/admin/documents':
        queryClient.prefetchQuery({ 
          queryKey: ['document-history', { page: 1, limit: 20, search_term: '' }],
          staleTime: 5 * 60 * 1000
        });
        break;
      
      case '/admin/analytics':
        queryClient.prefetchQuery({ 
          queryKey: ['analytics-data'],
          staleTime: 10 * 60 * 1000
        });
        break;
      
      case '/admin/eventos':
        queryClient.prefetchQuery({ 
          queryKey: ['admin-events'],
          staleTime: 3 * 60 * 1000
        });
        break;
    }
  };

  return (
    <Sidebar className="bg-white border-4 border-black shadow-brutal">
      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="font-black text-lg text-[#0a0a0a] px-4 py-4 uppercase tracking-wider">
            {open ? 'ADMIN PANEL' : 'ADM'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.exact}
                    onMouseEnter={() => handleMouseEnter(item.path)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-4 px-4 py-4 w-full rounded-none transition-all duration-200",
                        "font-bold text-base uppercase tracking-wide",
                        isActive
                          ? "bg-[#FF6B35] text-white border-4 border-black shadow-brutal font-black"
                          : "bg-white text-[#0a0a0a] hover:bg-[#FF6B35]/10 hover:text-[#0a0a0a]"
                      )
                    }
                  >
                    <item.icon className="h-6 w-6 flex-shrink-0" />
                    {open && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
