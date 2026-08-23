import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { RequireRole } from '@/auth/RequireRole'
import { useAuth } from '@/auth/useAuth'
import { ToastProvider } from '@/components/ui/Toast'
import { AppShell } from '@/components/layout/AppShell'
import { NotFoundPage } from '@/components/layout/NotFoundPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { EngagementAnalyticsPage } from '@/features/hq/analytics/EngagementPage'
import { FunnelAnalyticsPage } from '@/features/hq/analytics/FunnelPage'
import { OpsAnalyticsPage } from '@/features/hq/analytics/OpsPage'
import { OutcomesAnalyticsPage } from '@/features/hq/analytics/OutcomesPage'
import { AssessmentCreatePage } from '@/features/hq/content/assessments/AssessmentCreatePage'
import { ContentAssessmentDetailPage } from '@/features/hq/content/assessments/ContentAssessmentDetailPage'
import { ContentAssessmentsPage } from '@/features/hq/content/assessments/ContentAssessmentsPage'
import { ChapterDetailPage } from '@/features/hq/content/curriculum/ChapterDetailPage'
import { CurriculumPage } from '@/features/hq/content/curriculum/CurriculumPage'
import { TlmCreatePage } from '@/features/hq/content/tlms/TlmCreatePage'
import { TlmDetailPage } from '@/features/hq/content/tlms/TlmDetailPage'
import { TlmsPage } from '@/features/hq/content/tlms/TlmsPage'
import { LeadsPage } from '@/features/hq/leads/LeadsPage'
import { ImportUsersPage } from '@/features/hq/onboarding/ImportUsersPage'
import { SchoolWizardPage } from '@/features/hq/onboarding/SchoolWizardPage'
import { AppVersionsPage } from '@/features/hq/ops/AppVersionsPage'
import { LlmConfigPage } from '@/features/hq/ops/LlmConfigPage'
import { NotificationsPage } from '@/features/hq/ops/NotificationsPage'
import { RbacPage } from '@/features/hq/ops/RbacPage'
import { SupportPage } from '@/features/hq/ops/SupportPage'
import { OverviewPage } from '@/features/hq/overview/OverviewPage'
import { RetailPage } from '@/features/hq/retail/RetailPage'
import { SchoolDetailPage } from '@/features/hq/schools/SchoolDetailPage'
import { SchoolsPage } from '@/features/hq/schools/SchoolsPage'
import { ParentBroadcastPage } from '@/features/hq/parents/BroadcastPage'
import { ParentContactsPage } from '@/features/hq/parents/ContactsPage'
import { ParentInboxPage } from '@/features/hq/parents/InboxPage'
import { ParentLogPage } from '@/features/hq/parents/LogPage'
import { ParentReportsPage } from '@/features/hq/parents/ReportsPage'
import { UsersPage } from '@/features/hq/users/UsersPage'
import { SchoolAnalyticsPage } from '@/features/school/analytics/SchoolAnalyticsPage'
import { AssessmentDetailPage } from '@/features/school/assessments/AssessmentDetailPage'
import { AssessmentsPage } from '@/features/school/assessments/AssessmentsPage'
import { SchoolOverviewPage } from '@/features/school/overview/SchoolOverviewPage'
import { PeoplePage } from '@/features/school/people/PeoplePage'
import { SectionDetailPage } from '@/features/school/sections/SectionDetailPage'
import { SectionsPage } from '@/features/school/sections/SectionsPage'
import { SettingsPage } from '@/features/school/settings/SettingsPage'
import type { UserRole } from '@/types/common'

/** Dev-only kit gallery — lazy so it never weighs on the production bundle. */
const KitGalleryPage = lazy(() => import('@/features/dev/KitGalleryPage').then((m) => ({ default: m.KitGalleryPage })))

const HQ: UserRole[] = ['super_admin', 'super_sales_manager', 'super_content_manager']
const SALES: UserRole[] = ['super_admin', 'super_sales_manager']
const CONTENT: UserRole[] = ['super_admin', 'super_content_manager']
const SUPER: UserRole[] = ['super_admin']
const PARENTS: UserRole[] = ['super_admin', 'school_manager']
const MANAGER: UserRole[] = ['school_manager']

/** `/` is role-driven: School OS overview for managers, HQ overview for platform roles. */
function RoleLanding() {
  const { user } = useAuth()
  if (user?.role === 'school_manager') return <SchoolOverviewPage />
  return <OverviewPage />
}

/** Platform-ops routes are super_admin-only. */
function ops(element: ReactNode) {
  return <RequireRole roles={SUPER}>{element}</RequireRole>
}

/** School OS routes are manager-only. */
function managed(element: ReactNode) {
  return <RequireRole roles={MANAGER}>{element}</RequireRole>
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<RoleLanding />} />

                {/* HQ — Leads, Schools, Users, Retail */}
                <Route
                  path="leads"
                  element={
                    <RequireRole roles={SALES}>
                      <LeadsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="schools"
                  element={
                    <RequireRole roles={SALES}>
                      <SchoolsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="schools/new"
                  element={
                    // Onboarding writes schools, users and sections; every one
                    // of those permissions stops short of super_sales_manager,
                    // so the wizard would 403 on its first step for them.
                    <RequireRole roles={SUPER}>
                      <SchoolWizardPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="schools/:schoolId"
                  element={
                    <RequireRole roles={SALES}>
                      <SchoolDetailPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="schools/:schoolId/import"
                  element={
                    <RequireRole roles={SALES}>
                      <ImportUsersPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="users"
                  element={
                    <RequireRole roles={SALES}>
                      <UsersPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="retail"
                  element={
                    <RequireRole roles={HQ}>
                      <RetailPage />
                    </RequireRole>
                  }
                />

                {/* HQ — Content */}
                <Route
                  path="content/curriculum"
                  element={
                    <RequireRole roles={HQ}>
                      <CurriculumPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="content/curriculum/chapters/:chapterId"
                  element={
                    <RequireRole roles={HQ}>
                      <ChapterDetailPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="content/assessments"
                  element={
                    <RequireRole roles={CONTENT}>
                      <ContentAssessmentsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="content/assessments/new"
                  element={
                    <RequireRole roles={CONTENT}>
                      <AssessmentCreatePage />
                    </RequireRole>
                  }
                />
                <Route
                  path="content/assessments/:assessmentId"
                  element={
                    <RequireRole roles={CONTENT}>
                      <ContentAssessmentDetailPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="content/tlms"
                  element={
                    <RequireRole roles={CONTENT}>
                      <TlmsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="content/tlms/new"
                  element={
                    <RequireRole roles={CONTENT}>
                      <TlmCreatePage />
                    </RequireRole>
                  }
                />
                <Route
                  path="content/tlms/:tlmId"
                  element={
                    <RequireRole roles={CONTENT}>
                      <TlmDetailPage />
                    </RequireRole>
                  }
                />

                {/* HQ — Analytics pillars. Guarded at HQ so content managers land on the
                    in-page notice (AnalyticsLayout) rather than a silent redirect. */}
                <Route
                  path="analytics/engagement"
                  element={
                    <RequireRole roles={HQ}>
                      <EngagementAnalyticsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="analytics/outcomes"
                  element={
                    <RequireRole roles={HQ}>
                      <OutcomesAnalyticsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="analytics/funnel"
                  element={
                    <RequireRole roles={HQ}>
                      <FunnelAnalyticsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="analytics/ops"
                  element={
                    <RequireRole roles={HQ}>
                      <OpsAnalyticsPage />
                    </RequireRole>
                  }
                />

                {/* HQ — Ops */}
                <Route path="ops/llm-config" element={ops(<LlmConfigPage />)} />
                <Route path="ops/rbac" element={ops(<RbacPage />)} />
                <Route path="ops/support" element={ops(<SupportPage />)} />
                <Route path="ops/notifications" element={ops(<NotificationsPage />)} />
                <Route path="ops/app-versions" element={ops(<AppVersionsPage />)} />

                {/* Parent communication — reports, inbox, notices, log */}
                <Route path="parents/reports" element={<RequireRole roles={PARENTS}><ParentReportsPage /></RequireRole>} />
                <Route path="parents/inbox" element={<RequireRole roles={PARENTS}><ParentInboxPage /></RequireRole>} />
                <Route path="parents/broadcast" element={<RequireRole roles={PARENTS}><ParentBroadcastPage /></RequireRole>} />
                <Route path="parents/contacts" element={<RequireRole roles={PARENTS}><ParentContactsPage /></RequireRole>} />
                <Route path="parents/log" element={<RequireRole roles={PARENTS}><ParentLogPage /></RequireRole>} />

                {/* School OS */}
                <Route path="sections" element={managed(<SectionsPage />)} />
                <Route path="sections/:sectionId" element={managed(<SectionDetailPage />)} />
                <Route path="teachers" element={managed(<PeoplePage role="teacher" />)} />
                <Route path="students" element={managed(<PeoplePage role="student" />)} />
                <Route path="assessments" element={managed(<AssessmentsPage />)} />
                <Route path="assessments/:assessmentId" element={managed(<AssessmentDetailPage />)} />
                <Route path="analytics" element={managed(<SchoolAnalyticsPage />)} />
                <Route path="settings" element={managed(<SettingsPage />)} />

                {import.meta.env.DEV ? (
                  <Route
                    path="dev/kit"
                    element={
                      <Suspense fallback={null}>
                        <KitGalleryPage />
                      </Suspense>
                    }
                  />
                ) : null}

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
