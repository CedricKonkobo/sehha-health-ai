import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { Toaster } from '@/components/ui/Toaster'
import { Suspense } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { usePatientRealtime } from '@/hooks/usePatientRealtime'

export function AppShell() {
  usePatientRealtime()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense
              fallback={
                <div className="flex h-[60vh] items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}