import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { RequireRole } from '@/auth/RequireRole'
import { ToastProvider } from '@/components/ui/Toast'
import { AdminLayout } from '@/layouts/AdminLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SchoolsPage } from '@/pages/SchoolsPage'
import { UsersPage } from '@/pages/UsersPage'
import { ClassroomsPage } from '@/pages/ClassroomsPage'
import { ClassroomDetailPage } from '@/pages/ClassroomDetailPage'
import { SubjectChaptersPage } from '@/pages/SubjectChaptersPage'
import { ChapterDetailPage } from '@/pages/ChapterDetailPage'
import { SupportTicketsPage } from '@/pages/SupportTicketsPage'
import { LLMConfigPage } from '@/pages/LLMConfigPage'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route
                  path="schools"
                  element={
                    <RequireRole roles={['super_admin', 'super_sales_manager', 'super_content_manager']}>
                      <SchoolsPage />
                    </RequireRole>
                  }
                />
                <Route path="users" element={<UsersPage />} />
                <Route path="classrooms" element={<ClassroomsPage />} />
                <Route path="classrooms/:classroomId" element={<ClassroomDetailPage />} />
                <Route
                  path="classrooms/:classroomId/subjects/:subjectId/chapters"
                  element={<SubjectChaptersPage />}
                />
                <Route
                  path="classrooms/:classroomId/subjects/:subjectId/chapters/:chapterId"
                  element={<ChapterDetailPage />}
                />
                <Route
                  path="support"
                  element={
                    <RequireRole roles={['super_admin']}>
                      <SupportTicketsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="llm-config"
                  element={
                    <RequireRole roles={['super_admin']}>
                      <LLMConfigPage />
                    </RequireRole>
                  }
                />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
