import { useParams, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import NotFound from '@/pages/core/NotFound'
import { projectService } from '@/services/data/hybrid'

const projectCache = new Map<string, boolean>()

export const ProjectGuard = () => {
  const { projectId } = useParams()
  const [state, setState] = useState<'checking' | 'ok' | 'invalid'>('checking')

  useEffect(() => {
    let cancelled = false
    const id = projectId || ''
    if (!id) {
      setState('invalid')
      return
    }
    const validate = async () => {
      try {
        if (projectCache.has(id)) {
          setState(projectCache.get(id)! ? 'ok' : 'invalid')
          return
        }
        const resolved = await projectService.resolveProject(id)
        const exists = !!resolved
        projectCache.set(id, exists)
        if (!cancelled) setState(exists ? 'ok' : 'invalid')
      } catch (e) {
        console.warn('ProjectGuard validation error', e)
        if (!cancelled) setState('invalid')
      }
    }
    validate()
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (state === 'checking') {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-xs text-gray-400">
        Validating project...
      </div>
    )
  }
  if (state === 'invalid') return <NotFound />
  return <Outlet />
}

export default ProjectGuard
