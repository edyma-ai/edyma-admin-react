import { useMemo, useState } from 'react'
import { RotateCcw, Smartphone } from 'lucide-react'
import { useAppVersionAdoption, useAppVersions, useUpdateAppVersion } from '@/api/queries/appVersions'
import { Bars } from '@/components/charts/Bars'
import { Donut } from '@/components/charts/Donut'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, SectionCard } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import { formatCompact, formatNumber, formatPercent } from '@/lib/format'
import type { AppPlatform, AppVersionDoc, BelowMinUser, PlatformAdoption } from '@/types/appVersions'
import { APP_PLATFORMS } from '@/types/appVersions'
import { ConfirmModal } from '@/features/hq/content/shared/ConfirmModal'
import { KpiTile } from '@/features/hq/shared/KpiTile'
import { Widget } from '@/features/hq/shared/Widget'
import { Timestamp } from '@/features/hq/shared/Timestamp'

const SEMVER = /^\d+\.\d+\.\d+$/
const PLATFORM_LABEL: Record<AppPlatform, string> = { android: 'Android', ios: 'iOS' }
const WINDOWS = [7, 30, 90]

/** Numeric compare: "1.10.0" is newer than "1.9.0", which a string compare gets wrong. */
function semverCompare(a: string, b: string): number {
  const [am, an, ap] = a.split('.').map(Number)
  const [bm, bn, bp] = b.split('.').map(Number)
  return am - bm || an - bn || ap - bp
}

function validate(values: { latest_version: string; min_version: string; update_url: string }): string | null {
  if (!SEMVER.test(values.latest_version)) return 'Latest version must look like 1.2.3'
  if (!SEMVER.test(values.min_version)) return 'Minimum version must look like 1.2.3'
  if (semverCompare(values.min_version, values.latest_version) > 0) return 'The minimum cannot be above the latest - there would be nothing to update to'
  if (values.update_url && !/^https?:\/\//.test(values.update_url)) return 'The store URL must start with http(s)://'
  return null
}

/**
 * One platform's floor: latest, minimum, store URL.
 *
 * Raising the minimum locks out every install below it on its next app open,
 * so that - and only that - asks for confirmation.
 */
function FloorForm({ doc, platform }: { doc: AppVersionDoc | undefined; platform: AppPlatform }) {
  const toast = useToast()
  const update = useUpdateAppVersion(platform)
  const base = useMemo(() => ({ latest_version: doc?.latest_version ?? '', min_version: doc?.min_version ?? '', update_url: doc?.update_url ?? '' }), [doc])
  const [values, setValues] = useState(base)
  const [confirming, setConfirming] = useState(false)

  const dirty = values.latest_version !== base.latest_version || values.min_version !== base.min_version || values.update_url !== base.update_url
  const error = dirty ? validate(values) : null
  const raisesMinimum = SEMVER.test(values.min_version) && SEMVER.test(base.min_version) && semverCompare(values.min_version, base.min_version) > 0

  async function save() {
    setConfirming(false)
    try {
      await update.mutateAsync({ latest_version: values.latest_version.trim(), min_version: values.min_version.trim(), update_url: values.update_url.trim() })
      toast.show(`${PLATFORM_LABEL[platform]} versions saved`)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <SectionCard
      title={PLATFORM_LABEL[platform]}
      description={doc?.updated_at ? <span>Last set <Timestamp at={doc.updated_at} /></span> : 'Not configured yet'}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} disabled={!dirty} onClick={() => setValues(base)}>
            Discard
          </Button>
          <Button size="sm" loading={update.isPending} disabled={!dirty || Boolean(error)} onClick={() => (raisesMinimum ? setConfirming(true) : void save())}>
            Save
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Latest version" mono value={values.latest_version} placeholder="1.1.4" onChange={(e) => setValues({ ...values, latest_version: e.target.value })} hint="Installs below this see an update suggestion" />
        <Input label="Minimum version" mono value={values.min_version} placeholder="1.1.4" onChange={(e) => setValues({ ...values, min_version: e.target.value })} hint="Installs below this cannot run until updated" />
        <Input
          className="sm:col-span-2"
          label="Store URL"
          mono
          value={values.update_url}
          placeholder="https://play.google.com/store/apps/details?id=in.edyma.app"
          onChange={(e) => setValues({ ...values, update_url: e.target.value })}
          hint="Where the Update button opens. Leave empty until the listing exists - the app then shows guidance instead of a dead button"
        />
      </div>
      {error ? <p className="mt-2 text-[12px] font-medium text-danger">{error}</p> : null}

      {confirming ? (
        <ConfirmModal
          title={`Raise the ${PLATFORM_LABEL[platform]} minimum to ${values.min_version}?`}
          description="Every install below this version will be blocked the next time it opens, with only an Update button, until the student updates from the store. Make sure the store actually has this version before you confirm."
          confirmLabel="Raise minimum"
          tone="danger"
          loading={update.isPending}
          onConfirm={save}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </SectionCard>
  )
}

const BELOW_MIN_COLUMNS: Column<BelowMinUser>[] = [
  { key: 'name', header: 'User', render: (row) => <span className="font-semibold text-ink">{row.display_name || row.user_id}</span>, sortValue: (row) => row.display_name },
  { key: 'role', header: 'Role', render: (row) => row.role ?? '-' },
  { key: 'school', header: 'School', mono: true, render: (row) => row.school_id ?? <span className="text-muted">-</span> },
  { key: 'platform', header: 'Platform', render: (row) => <Badge tone="neutral">{PLATFORM_LABEL[row.platform] ?? row.platform}</Badge> },
  { key: 'version', header: 'Version', mono: true, render: (row) => row.app_version ?? '-', sortValue: (row) => row.app_version },
  { key: 'os', header: 'OS', render: (row) => row.os_version || '-' },
  { key: 'device', header: 'Device', render: (row) => row.device_model || '-' },
  { key: 'seen', header: 'Last opened', render: (row) => <Timestamp at={row.seen_at} />, sortValue: (row) => row.seen_at },
]

function platformLabel(row: PlatformAdoption): string {
  return PLATFORM_LABEL[row.platform] ?? row.platform
}

/** HQ /ops/app-versions - set the floor per platform; see who runs what. */
export function AppVersionsPage() {
  const versions = useAppVersions()
  const [days, setDays] = useState(30)
  const adoption = useAppVersionAdoption(days)

  const byPlatform = useMemo(() => Object.fromEntries((versions.data ?? []).map((doc) => [doc.platform, doc])) as Partial<Record<AppPlatform, AppVersionDoc>>, [versions.data])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="App versions"
        description="What the store has, the oldest release still allowed to run, and which versions and devices students actually use."
        actions={
          <Select
            value={String(days)}
            onChange={(event) => setDays(Number(event.target.value))}
            options={WINDOWS.map((window) => ({ value: String(window), label: `Last ${window} days` }))}
            aria-label="Adoption window"
          />
        }
      />

      {versions.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-card" />
          <Skeleton className="h-56 w-full rounded-card" />
        </div>
      ) : versions.isError ? (
        <Card padded={false}>
          <ErrorState message={apiErrorMessage(versions.error)} onRetry={() => void versions.refetch()} />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {APP_PLATFORMS.map((platform) => (
            // Keyed on the saved document so a successful save remounts the
            // form on the new base values instead of syncing state in an effect.
            <FloorForm key={`${platform}-${byPlatform[platform]?.updated_at ?? 'new'}`} platform={platform} doc={byPlatform[platform]} />
          ))}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-[15px] font-bold tracking-tight text-ink">Adoption</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Counted from each user's last app open in the window. A user who has not opened the app since this shipped is not here yet.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile label="Users seen" query={adoption} value={(data) => formatNumber(data.platforms.reduce((sum, row) => sum + row.users_seen, 0))} hint={(data) => `Last ${data.days} days`} />
          <KpiTile
            label="On latest"
            query={adoption}
            value={(data) => {
              const seen = data.platforms.reduce((sum, row) => sum + row.users_seen, 0)
              const latest = data.platforms.reduce((sum, row) => sum + row.on_latest, 0)
              return seen ? formatPercent((latest / seen) * 100) : '-'
            }}
            hint={() => 'Share of users on the store release'}
          />
          <KpiTile label="Below minimum" query={adoption} value={(data) => formatNumber(data.below_min_total)} hint={() => 'Blocked on their next app open'} />
          <KpiTile
            label="Platforms"
            query={adoption}
            value={(data) => data.platforms.filter((row) => row.users_seen > 0).map(platformLabel).join(' · ') || '-'}
            hint={() => 'With at least one user seen'}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Widget title="Users by version" description="Per platform, in the window" query={adoption} className="lg:col-span-2" skeletonHeight={280}>
            {(data) => {
              const versionsSeen = Array.from(new Set(data.platforms.flatMap((row) => row.by_version.map((entry) => entry.version)))).sort(semverCompare)
              return (
                <Bars
                  data={versionsSeen.map((version) => ({
                    version,
                    ...Object.fromEntries(data.platforms.map((row) => [row.platform, row.by_version.find((entry) => entry.version === version)?.count ?? 0])),
                  }))}
                  xKey="version"
                  series={data.platforms.map((row) => ({ key: row.platform, label: platformLabel(row) }))}
                  stacked
                  height={260}
                  emptyLabel="No app opens in this window yet"
                />
              )
            }}
          </Widget>
          <Widget title="Platform split" description="Users seen" query={adoption} skeletonHeight={280}>
            {(data) => (
              <Donut
                data={data.platforms.map((row) => ({ name: platformLabel(row), value: row.users_seen }))}
                centerLabel={formatCompact(data.platforms.reduce((sum, row) => sum + row.users_seen, 0))}
                centerCaption="users"
                height={240}
                emptyLabel="No app opens in this window yet"
              />
            )}
          </Widget>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Widget title="Users by OS version" description="Across platforms" query={adoption} skeletonHeight={260}>
            {(data) => (
              <Bars
                data={data.platforms.flatMap((row) => row.by_os).sort((a, b) => b.count - a.count).slice(0, 12).map((entry) => ({ os: entry.os, users: entry.count }))}
                xKey="os"
                series={[{ key: 'users', label: 'Users' }]}
                height={240}
                emptyLabel="No app opens in this window yet"
              />
            )}
          </Widget>
          <Widget title="Top devices" description="Most common device models" query={adoption} skeletonHeight={260}>
            {(data) => (
              <Bars
                data={data.platforms.flatMap((row) => row.by_model).sort((a, b) => b.count - a.count).slice(0, 12).map((entry) => ({ model: entry.model, users: entry.count }))}
                xKey="model"
                series={[{ key: 'users', label: 'Users' }]}
                height={240}
                emptyLabel="No app opens in this window yet"
              />
            )}
          </Widget>
        </div>

        <SectionCard
          title="Below the minimum"
          description={adoption.data?.below_min_users_truncated ? `Showing the most recent ${adoption.data.below_min_users.length} of ${adoption.data.below_min_total}` : 'Every install that will be blocked on its next open'}
          padded={false}
        >
          <DataTable
            columns={BELOW_MIN_COLUMNS}
            rows={adoption.data?.below_min_users ?? []}
            rowKey={(row) => `${row.platform}-${row.user_id}`}
            loading={adoption.isPending}
            error={adoption.isError ? apiErrorMessage(adoption.error) : null}
            onRetry={() => void adoption.refetch()}
            pageSize={10}
            initialSort={{ key: 'seen', direction: 'desc' }}
            emptyState={<EmptyState icon={Smartphone} title="Nobody is below the minimum" description="Every user seen in this window is on a supported version." />}
          />
        </SectionCard>
      </section>
    </div>
  )
}
