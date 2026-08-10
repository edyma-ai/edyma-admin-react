import { useMemo, useState } from 'react'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { useGrantRolePermission, usePermissions, useReloadRbacCache, useRevokeRolePermission, useRoles, useRolePermissions } from '@/api/queries/ops'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tooltip } from '@/components/ui/Tooltip'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import { ROLE_LABELS } from '@/lib/roles'
import type { UserRole } from '@/types/common'
import type { PermissionDoc } from '@/types/ops'

/** Column order: app roles first, admin roles after, super_admin (read-only) last. */
const ROLE_ORDER = ['teacher', 'student', 'school_manager', 'super_sales_manager', 'super_content_manager', 'super_admin']

function roleRank(name: string): number {
  const index = ROLE_ORDER.indexOf(name)
  return index === -1 ? ROLE_ORDER.length : index
}

function roleLabel(name: string): string {
  return name in ROLE_LABELS ? ROLE_LABELS[name as UserRole] : name
}

interface PermissionGroup {
  prefix: string
  permissions: PermissionDoc[]
}

function groupByPrefix(permissions: PermissionDoc[]): PermissionGroup[] {
  const groups = new Map<string, PermissionDoc[]>()
  for (const permission of permissions) {
    const prefix = permission.name.split('.')[0]
    const bucket = groups.get(prefix)
    if (bucket) bucket.push(permission)
    else groups.set(prefix, [permission])
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([prefix, docs]) => ({ prefix, permissions: docs }))
}

/** The permissions × roles grant matrix, edited live with an explicit cache reload to apply. */
export function RbacPage() {
  const toast = useToast()
  const roles = useRoles()
  const permissions = usePermissions()
  const mappings = useRolePermissions()
  const grant = useGrantRolePermission()
  const revoke = useRevokeRolePermission()
  const reload = useReloadRbacCache()

  const [needsReload, setNeedsReload] = useState(false)
  // Revokes optimistically remove the mapping, leaving the cell enabled+unchecked — a
  // fast second click would POST a grant against the in-flight DELETE. Lock those cells.
  const [pendingRevokes, setPendingRevokes] = useState<ReadonlySet<string>>(new Set())

  const orderedRoles = useMemo(() => [...(roles.data ?? [])].sort((a, b) => roleRank(a.name) - roleRank(b.name) || a.name.localeCompare(b.name)), [roles.data])
  const groups = useMemo(() => groupByPrefix(permissions.data ?? []), [permissions.data])
  const grantIds = useMemo(() => new Map((mappings.data ?? []).map((doc) => [`${doc.role_name}:${doc.permission_name}`, doc.id])), [mappings.data])

  const loading = roles.isPending || permissions.isPending || mappings.isPending
  const failed = roles.isError || permissions.isError || mappings.isError
  const failure = roles.error ?? permissions.error ?? mappings.error

  async function toggle(roleName: string, permissionName: string) {
    const cellKey = `${roleName}:${permissionName}`
    const mappingId = grantIds.get(cellKey)
    if (mappingId) {
      setPendingRevokes((prev) => new Set(prev).add(cellKey))
    }
    try {
      if (mappingId) await revoke.mutateAsync(mappingId)
      else await grant.mutateAsync({ role_name: roleName, permission_name: permissionName })
      setNeedsReload(true)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    } finally {
      if (mappingId) {
        setPendingRevokes((prev) => {
          const next = new Set(prev)
          next.delete(cellKey)
          return next
        })
      }
    }
  }

  async function reloadCache() {
    try {
      const result = await reload.mutateAsync()
      setNeedsReload(false)
      toast.show(result.message)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  function retryAll() {
    void roles.refetch()
    void permissions.refetch()
    void mappings.refetch()
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="RBAC"
        description="Which role may call which routes. Grants persist immediately but only apply after the cache reload."
        actions={
          <>
            {needsReload ? <Badge tone="warning">Reload pending</Badge> : null}
            <Button icon={<RefreshCw className="h-4 w-4" />} variant={needsReload ? 'primary' : 'secondary'} loading={reload.isPending} onClick={reloadCache}>
              Reload cache
            </Button>
          </>
        }
      />

      {loading ? (
        <Card className="flex flex-col gap-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-64 w-full" />
        </Card>
      ) : failed ? (
        <Card padded={false}>
          <ErrorState message={apiErrorMessage(failure)} onRetry={retryAll} />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th scope="col" className="sticky top-0 z-10 border-b border-hairline bg-surface px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-muted">
                    Permission
                  </th>
                  {orderedRoles.map((role) => (
                    <th key={role.id} scope="col" className="sticky top-0 z-10 border-b border-hairline bg-surface px-3 py-2.5 text-center text-xs font-bold text-muted">
                      {role.name === 'super_admin' ? (
                        <Tooltip content="super_admin bypasses RBAC, so every route is always allowed">
                          <span className="inline-flex items-center gap-1 normal-case">
                            <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
                            {roleLabel(role.name)}
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="normal-case">{roleLabel(role.name)}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <PermissionGroupRows
                    key={group.prefix}
                    group={group}
                    roleNames={orderedRoles.map((role) => role.name)}
                    grantIds={grantIds}
                    pendingRevokes={pendingRevokes}
                    onToggle={toggle}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

interface GroupRowsProps {
  group: PermissionGroup
  roleNames: string[]
  grantIds: Map<string, string>
  /** `role:permission` pairs with a DELETE in flight — held disabled until it settles. */
  pendingRevokes: ReadonlySet<string>
  onToggle: (roleName: string, permissionName: string) => void
}

function PermissionGroupRows({ group, roleNames, grantIds, pendingRevokes, onToggle }: GroupRowsProps) {
  return (
    <>
      <tr>
        <td colSpan={roleNames.length + 1} className="border-b border-hairline bg-canvas/60 px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
          {group.prefix}
        </td>
      </tr>
      {group.permissions.map((permission) => (
        <tr key={permission.id} className="border-b border-hairline last:border-b-0">
          <td className="px-4 py-2.5">
            <p className="font-mono text-xs font-semibold text-ink">{permission.name}</p>
            {permission.description ? <p className="mt-0.5 max-w-md truncate text-[11px] text-muted">{permission.description}</p> : null}
            <p className="mt-0.5 font-mono text-[10px] text-muted">
              {permission.apis.length} route{permission.apis.length === 1 ? '' : 's'}
            </p>
          </td>
          {roleNames.map((roleName) => {
            const mappingId = grantIds.get(`${roleName}:${permission.name}`)
            if (roleName === 'super_admin') {
              return (
                <td key={roleName} className="px-3 py-2.5 text-center">
                  <Tooltip content="Always allowed (bypasses RBAC)">
                    <ShieldCheck aria-hidden className="h-4 w-4 text-muted" />
                  </Tooltip>
                </td>
              )
            }
            return (
              <td key={roleName} className="px-3 py-2.5 text-center">
                <Checkbox
                  aria-label={`${permission.name} for ${roleLabel(roleName)}`}
                  checked={Boolean(mappingId)}
                  // A cell with a grant or revoke still in flight stays locked until it settles.
                  disabled={mappingId?.startsWith('optimistic-') || pendingRevokes.has(`${roleName}:${permission.name}`)}
                  onChange={() => onToggle(roleName, permission.name)}
                  className="justify-center"
                />
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}
