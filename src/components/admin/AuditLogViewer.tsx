/**
 * Audit Log Viewer Component
 * Displays security audit logs for administrators
 */

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Download,
  Trash2,
  Search,
  Filter,
} from 'lucide-react'
import {
  auditLog,
  type AuditAction,
  type AuditLogEntry,
} from '@/services/audit/audit-log'

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([])
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [resultFilter, setResultFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState(auditLog.getStats())

  // Load logs on mount
  useEffect(() => {
    loadLogs()
  }, [])

  // Apply filters when logs or filters change
  useEffect(() => {
    let filtered = logs

    // Filter by action
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter)
    }

    // Filter by result
    if (resultFilter !== 'all') {
      filtered = filtered.filter(log => log.result === resultFilter)
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        log =>
          log.userId?.toLowerCase().includes(search) ||
          log.userEmail?.toLowerCase().includes(search) ||
          log.resource?.toLowerCase().includes(search) ||
          log.resourceId?.toLowerCase().includes(search) ||
          log.action?.toLowerCase().includes(search),
      )
    }

    setFilteredLogs(filtered)
  }, [logs, actionFilter, resultFilter, searchTerm])

  const loadLogs = () => {
    const allLogs = auditLog.getLogs()
    setLogs(allLogs)
    setFilteredLogs(allLogs)
    setStats(auditLog.getStats())
  }

  const handleExportJSON = () => {
    const json = auditLog.exportLogs()
    downloadFile(json, 'audit-logs.json', 'application/json')
  }

  const handleExportCSV = () => {
    const csv = auditLog.exportLogsCSV()
    downloadFile(csv, 'audit-logs.csv', 'text/csv')
  }

  const handleClearLogs = () => {
    if (
      confirm(
        'Are you sure you want to clear all audit logs? This cannot be undone.',
      )
    ) {
      auditLog.clearLogs()
      loadLogs()
    }
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case 'ACCESS_DENIED':
        return <ShieldAlert className="h-4 w-4 text-red-500" />
      case 'ACCESS_GRANTED':
        return <ShieldCheck className="h-4 w-4 text-green-500" />
      case 'ROLE_CHANGE':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <Shield className="h-4 w-4 text-gray-500" />
    }
  }

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>
      case 'allowed':
        return <Badge className="bg-green-600">Allowed</Badge>
      case 'success':
        return <Badge className="bg-blue-600">Success</Badge>
      case 'failure':
        return <Badge variant="destructive">Failure</Badge>
      default:
        return <Badge variant="secondary">{result}</Badge>
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Permission Checks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.permissionChecks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.denied}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Role Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.roleChanges}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                Security and permission audit trail
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportJSON}>
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="destructive" size="sm" onClick={handleClearLogs}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Logs
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="PERMISSION_CHECK">
                  Permission Check
                </SelectItem>
                <SelectItem value="ACCESS_DENIED">Access Denied</SelectItem>
                <SelectItem value="ACCESS_GRANTED">Access Granted</SelectItem>
                <SelectItem value="ROLE_CHANGE">Role Change</SelectItem>
                <SelectItem value="USER_CREATED">User Created</SelectItem>
                <SelectItem value="USER_DELETED">User Deleted</SelectItem>
                <SelectItem value="PROJECT_CREATED">Project Created</SelectItem>
                <SelectItem value="PROJECT_DELETED">Project Deleted</SelectItem>
                <SelectItem value="DOCUMENT_UPLOADED">
                  Document Uploaded
                </SelectItem>
                <SelectItem value="DOCUMENT_DELETED">
                  Document Deleted
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="allowed">Allowed</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredLogs.length} of {logs.length} logs
          </div>

          {/* Logs Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Component</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground">
                        No audit logs found
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.slice(0, 100).map((log, index) => (
                    <TableRow key={index}>
                      <TableCell>{getActionIcon(log.action)}</TableCell>
                      <TableCell className="text-xs">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {log.userId?.slice(0, 8)}...
                          </span>
                          {log.userRole && (
                            <Badge variant="outline" className="w-fit text-xs">
                              {log.userRole}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono">{log.action}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{log.resource}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {log.resourceId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getResultBadge(log.result)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.component || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredLogs.length > 100 && (
            <div className="text-sm text-muted-foreground mt-4 text-center">
              Showing first 100 logs. Use filters to narrow results or export
              for full data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

