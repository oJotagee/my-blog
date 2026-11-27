'use client'

import { FileTextIcon, LayoutGridIcon, LogOutIcon, SettingsIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

import { logout } from '../_actions/logout'

const ITEMS = [
  { href: '/painel', label: 'Visão geral', icon: LayoutGridIcon },
  { href: '/painel/posts', label: 'Posts', icon: FileTextIcon },
  { href: '/painel/configuracoes', label: 'Tags e home', icon: SettingsIcon },
]

export function PanelSidebar({ email }: { email: string }) {
  const pathname = usePathname()

  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar>
      <SidebarHeader className="h-16 justify-center border-b border-border px-5">
        <p className="font-mono text-sm font-semibold">
          jg<span className="text-faint">/</span>admin
        </p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {ITEMS.map(({ href, label, icon: Icon }) => {
              // "/painel" é prefixo de todos, então só vale quando for igual.
              const active = href === '/painel' ? pathname === href : pathname.startsWith(href)

              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={active}
                    render={
                      <Link
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setOpenMobile(false)}
                      />
                    }
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-4">
        <div className="mb-2 min-w-0 px-2">
          <p className="text-xs font-medium">Administrador</p>
          <p className="truncate text-xs text-faint">{email}</p>
        </div>
        <form action={logout}>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton type="submit">
                <LogOutIcon />
                <span>Sair do painel</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}
