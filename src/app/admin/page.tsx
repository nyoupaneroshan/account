'use client'

import dynamic from 'next/dynamic'

const AdminPortal = dynamic(
  () => import('@/components/admin/admin-portal').then(m => ({ default: m.AdminPortal })),
  { ssr: false }
)

export default function AdminPage() {
  return <AdminPortal />
}
