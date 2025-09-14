import React from 'react'
import { Link, LinkProps } from 'react-router-dom'
import {
  preloadProject,
  preloadDocument,
  preloadCompanyProjects,
  preloadProjectDocuments,
} from '@/utils/performance'

interface PrefetchCompanyLinkProps extends LinkProps {
  companyId: string
  children: React.ReactNode
}

interface PrefetchProjectLinkProps extends LinkProps {
  projectId: string
  /** Also preload project documents on hover */
  includeDocuments?: boolean
  children: React.ReactNode
}

interface PrefetchDocumentLinkProps extends LinkProps {
  companyId: string
  projectId: string
  documentId: string
  children: React.ReactNode
}

/**
 * Link component that preloads company data (projects list) on hover
 */
export const PrefetchCompanyLink: React.FC<PrefetchCompanyLinkProps> = ({
  companyId,
  children,
  onMouseEnter,
  ...linkProps
}) => {
  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    preloadCompanyProjects(companyId)
    onMouseEnter?.(e)
  }

  return (
    <Link {...linkProps} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  )
}

/**
 * Link component that preloads project data on hover
 */
export const PrefetchProjectLink: React.FC<PrefetchProjectLinkProps> = ({
  projectId,
  includeDocuments = false,
  children,
  onMouseEnter,
  ...linkProps
}) => {
  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    preloadProject(projectId)
    if (includeDocuments) {
      preloadProjectDocuments(projectId)
    }
    onMouseEnter?.(e)
  }

  return (
    <Link {...linkProps} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  )
}

/**
 * Link component that preloads document validation on hover
 */
export const PrefetchDocumentLink: React.FC<PrefetchDocumentLinkProps> = ({
  companyId,
  projectId,
  documentId,
  children,
  onMouseEnter,
  ...linkProps
}) => {
  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    preloadDocument(companyId, projectId, documentId)
    onMouseEnter?.(e)
  }

  return (
    <Link {...linkProps} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  )
}
