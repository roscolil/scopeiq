import { useState, useEffect, useCallback } from 'react'
import { Layout } from '@/components/layout/Layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Server,
  Database,
  Brain,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  Globe,
  Zap,
  Shield,
} from 'lucide-react'
import { pythonAPIClient } from '@/services/ai/python-api-client'
import { checkPythonBackendHealth } from '@/services/file/python-document-upload'
import { isPythonChatAvailable } from '@/services/ai/python-chat-service'
import { getPythonBackendConfig } from '@/config/python-backend'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  message: string
  responseTime?: number
  lastChecked: Date
  details?: Record<string, any>
}

interface EndpointHealth {
  name: string
  url: string
  status: HealthStatus
  description: string
  icon: React.ReactNode
}

interface ServiceHealth {
  name: string
  status: HealthStatus
  description: string
  icon: React.ReactNode
  endpoints?: EndpointHealth[]
}

const HealthConsole = () => {
  const [services, setServices] = useState<ServiceHealth[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: HealthStatus['status']) => {
    const variants = {
      healthy: 'default',
      degraded: 'secondary',
      unhealthy: 'destructive',
      unknown: 'outline',
    } as const

    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const checkPythonBackend = useCallback(async (): Promise<HealthStatus> => {
    const startTime = Date.now()
    try {
      const response = await pythonAPIClient.healthCheck()
      const responseTime = Date.now() - startTime

      if (response.success && response.data) {
        return {
          status: response.data.status,
          message: `Python backend is ${response.data.status}`,
          responseTime,
          lastChecked: new Date(),
          details: {
            version: response.data.version,
            uptime: response.data.uptime_seconds,
            services: response.data.services,
          },
        }
      } else {
        return {
          status: 'unhealthy',
          message: response.error || 'Health check failed',
          responseTime,
          lastChecked: new Date(),
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Connection failed',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      }
    }
  }, [])

  const checkDocumentUploadService =
    useCallback(async (): Promise<HealthStatus> => {
      const startTime = Date.now()
      try {
        const isHealthy = await checkPythonBackendHealth()
        const responseTime = Date.now() - startTime

        return {
          status: isHealthy ? 'healthy' : 'unhealthy',
          message: isHealthy
            ? 'Document upload service is available'
            : 'Document upload service is unavailable',
          responseTime,
          lastChecked: new Date(),
        }
      } catch (error) {
        return {
          status: 'unhealthy',
          message:
            error instanceof Error ? error.message : 'Service check failed',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
        }
      }
    }, [])

  const checkChatService = useCallback(async (): Promise<HealthStatus> => {
    const startTime = Date.now()
    try {
      const isAvailable = await isPythonChatAvailable()
      const responseTime = Date.now() - startTime

      return {
        status: isAvailable ? 'healthy' : 'unhealthy',
        message: isAvailable
          ? 'Chat service is available'
          : 'Chat service is unavailable',
        responseTime,
        lastChecked: new Date(),
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message:
          error instanceof Error ? error.message : 'Service check failed',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      }
    }
  }, [])

  const checkConfiguration = useCallback(async (): Promise<HealthStatus> => {
    try {
      const config = getPythonBackendConfig()
      const validation = {
        isValid: true,
        errors: [] as string[],
      }

      // Basic validation
      if (!config.baseURL) {
        validation.errors.push('Base URL is not configured')
        validation.isValid = false
      }

      if (config.timeout <= 0) {
        validation.errors.push('Invalid timeout configuration')
        validation.isValid = false
      }

      if (config.retryAttempts < 0) {
        validation.errors.push('Invalid retry attempts configuration')
        validation.isValid = false
      }

      return {
        status: validation.isValid ? 'healthy' : 'degraded',
        message: validation.isValid
          ? 'Configuration is valid'
          : `Configuration issues: ${validation.errors.join(', ')}`,
        lastChecked: new Date(),
        details: {
          baseURL: config.baseURL,
          timeout: config.timeout,
          retryAttempts: config.retryAttempts,
          retryDelay: config.retryDelay,
          enableFallback: config.enableFallback,
        },
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message:
          error instanceof Error ? error.message : 'Configuration check failed',
        lastChecked: new Date(),
      }
    }
  }, [])

  const checkEndpoints = useCallback(async (): Promise<EndpointHealth[]> => {
    const config = getPythonBackendConfig()
    const baseURL = config.baseURL

    const endpoints: EndpointHealth[] = [
      {
        name: 'Health Check',
        url: `${baseURL}/api/v1/health`,
        status: {
          status: 'unknown',
          message: 'Not checked',
          lastChecked: new Date(),
        },
        description: 'Backend health and service status',
        icon: <Activity className="h-4 w-4" />,
      },
      {
        name: 'Document Upload',
        url: `${baseURL}/api/v1/documents/upload`,
        status: {
          status: 'unknown',
          message: 'Not checked',
          lastChecked: new Date(),
        },
        description: 'Document upload and processing endpoint',
        icon: <Database className="h-4 w-4" />,
      },
      {
        name: 'Chat Conversation',
        url: `${baseURL}/api/v1/chat/conversation`,
        status: {
          status: 'unknown',
          message: 'Not checked',
          lastChecked: new Date(),
        },
        description: 'AI chat and conversation endpoint',
        icon: <Brain className="h-4 w-4" />,
      },
    ]

    // Check each endpoint
    for (const endpoint of endpoints) {
      const startTime = Date.now()
      try {
        const response = await fetch(endpoint.url, {
          method: 'HEAD', // Just check if endpoint exists
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        endpoint.status = {
          status: response.ok ? 'healthy' : 'degraded',
          message: response.ok
            ? 'Endpoint is reachable'
            : `HTTP ${response.status}`,
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
        }
      } catch (error) {
        endpoint.status = {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Connection failed',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
        }
      }
    }

    return endpoints
  }, [])

  const refreshHealth = useCallback(async () => {
    setIsLoading(true)
    try {
      console.log('Starting health checks...')

      const [pythonBackend, documentService, chatService, config, endpoints] =
        await Promise.all([
          checkPythonBackend().catch(err => {
            console.error('Python backend check failed:', err)
            return {
              status: 'unhealthy' as const,
              message: `Python backend check failed: ${err.message}`,
              lastChecked: new Date(),
            }
          }),
          checkDocumentUploadService().catch(err => {
            console.error('Document service check failed:', err)
            return {
              status: 'unhealthy' as const,
              message: `Document service check failed: ${err.message}`,
              lastChecked: new Date(),
            }
          }),
          checkChatService().catch(err => {
            console.error('Chat service check failed:', err)
            return {
              status: 'unhealthy' as const,
              message: `Chat service check failed: ${err.message}`,
              lastChecked: new Date(),
            }
          }),
          checkConfiguration().catch(err => {
            console.error('Configuration check failed:', err)
            return {
              status: 'unhealthy' as const,
              message: `Configuration check failed: ${err.message}`,
              lastChecked: new Date(),
            }
          }),
          checkEndpoints().catch(err => {
            console.error('Endpoints check failed:', err)
            return []
          }),
        ])

      console.log('Health check results:', {
        pythonBackend,
        documentService,
        chatService,
        config,
        endpoints,
      })

      const newServices: ServiceHealth[] = [
        {
          name: 'Python Backend',
          status: pythonBackend,
          description: 'Main Python AI backend service',
          icon: <Server className="h-5 w-5" />,
          endpoints: endpoints,
        },
        {
          name: 'Document Upload Service',
          status: documentService,
          description: 'Document processing and upload service',
          icon: <Database className="h-5 w-5" />,
        },
        {
          name: 'Chat Service',
          status: chatService,
          description: 'AI chat and conversation service',
          icon: <Brain className="h-5 w-5" />,
        },
        {
          name: 'Configuration',
          status: config,
          description: 'Backend configuration and settings',
          icon: <Shield className="h-5 w-5" />,
        },
      ]

      console.log('Setting services:', newServices)
      setServices(newServices)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Health check failed:', error)

      // Set a fallback service to show something
      const fallbackServices: ServiceHealth[] = [
        {
          name: 'System Status',
          status: {
            status: 'unhealthy',
            message: 'Health check system failed to initialize',
            lastChecked: new Date(),
          },
          description: 'Unable to check system health',
          icon: <AlertTriangle className="h-5 w-5" />,
        },
      ]

      setServices(fallbackServices)
      setLastRefresh(new Date())
    } finally {
      setIsLoading(false)
    }
  }, [
    checkPythonBackend,
    checkDocumentUploadService,
    checkChatService,
    checkConfiguration,
    checkEndpoints,
  ])

  useEffect(() => {
    refreshHealth()
  }, [refreshHealth])

  const getOverallStatus = () => {
    if (services.length === 0) return 'unknown'

    const statuses = services.map(s => s.status.status)
    if (statuses.every(s => s === 'healthy')) return 'healthy'
    if (statuses.some(s => s === 'unhealthy')) return 'unhealthy'
    if (statuses.some(s => s === 'degraded')) return 'degraded'
    return 'unknown'
  }

  const overallStatus = getOverallStatus()

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Health Console
            </h1>
            <p className="text-muted-foreground">
              Monitor the health and status of all backend services
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
            <Button
              onClick={refreshHealth}
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overall Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              System Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(overallStatus)}
                <div>
                  <p className="font-medium">Overall System Status</p>
                  <p className="text-sm text-muted-foreground">
                    {services.length} services monitored
                  </p>
                </div>
              </div>
              {getStatusBadge(overallStatus)}
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        {isLoading && services.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading health status...</span>
              </div>
            </CardContent>
          </Card>
        ) : services.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                <p className="text-muted-foreground">
                  No services available to monitor
                </p>
                <Button
                  onClick={refreshHealth}
                  className="mt-2"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {services.map(service => (
              <Card key={service.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {service.icon}
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                    </div>
                    {getStatusBadge(service.status.status)}
                  </div>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Service Status */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Status</span>
                      <span className="font-medium">
                        {service.status.message}
                      </span>
                    </div>

                    {service.status.responseTime && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Response Time</span>
                        <span className="font-medium">
                          {service.status.responseTime}ms
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span>Last Checked</span>
                      <span className="font-medium">
                        {service.status.lastChecked.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Service Details */}
                  {service.status.details && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Details</h4>
                        {Object.entries(service.status.details).map(
                          ([key, value]) => {
                            // Special handling for services object
                            if (
                              key === 'services' &&
                              typeof value === 'object'
                            ) {
                              return (
                                <div key={key} className="space-y-1">
                                  <span className="capitalize text-sm font-medium">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                  </span>
                                  <div className="ml-2 space-y-1">
                                    {Object.entries(
                                      value as Record<string, string>,
                                    ).map(([serviceName, status]) => (
                                      <div
                                        key={serviceName}
                                        className="flex items-center justify-between text-xs"
                                      >
                                        <span className="capitalize">
                                          {serviceName}
                                        </span>
                                        <Badge
                                          variant={
                                            status === 'up'
                                              ? 'default'
                                              : 'destructive'
                                          }
                                          className="text-xs"
                                        >
                                          {status}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <div
                                key={key}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className="font-medium">
                                  {typeof value === 'boolean'
                                    ? value
                                      ? 'Yes'
                                      : 'No'
                                    : String(value)}
                                </span>
                              </div>
                            )
                          },
                        )}
                      </div>
                    </>
                  )}

                  {/* Endpoints */}
                  {service.endpoints && service.endpoints.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Endpoints</h4>
                        {service.endpoints.map(endpoint => (
                          <div
                            key={endpoint.name}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <div className="flex items-center gap-2">
                              {endpoint.icon}
                              <div>
                                <p className="font-medium text-sm">
                                  {endpoint.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {endpoint.description}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(endpoint.status.status)}
                              {endpoint.status.responseTime && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {endpoint.status.responseTime}ms
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Manual refresh indicator */}
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            Health checks are performed on page load. Click the refresh button
            to update the status manually.
          </AlertDescription>
        </Alert>
      </div>
    </Layout>
  )
}

export default HealthConsole
