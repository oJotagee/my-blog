import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { auth } from '@/lib/auth'

import { PanelSidebar } from './_components/panel-sidebar'

export const metadata: Metadata = {
  title: 'Painel',
  robots: { index: false, follow: false },
}

export default async function PanelLayout({ children }: LayoutProps<'/painel'>) {
  const session = await auth()

  if (!session?.user) redirect('/entrar')

  return (
    <SidebarProvider>
      <PanelSidebar email={session.user.email ?? ''} />
      <SidebarInset className="min-w-0">{children}</SidebarInset>
    </SidebarProvider>
  )
}
