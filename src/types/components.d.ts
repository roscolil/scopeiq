/**
 * Component-specific type definitions for ScopeIQ
 * Defines props and state types for React components
 */

// ================================
// Import Meta Environment Types
// ================================

export interface ImportMetaEnv {
  readonly VITE_S3_BUCKET_NAME?: string
  readonly VITE_AWS_REGION?: string
  readonly VITE_AWS_ACCESS_KEY_ID?: string
  readonly VITE_AWS_SECRET_ACCESS_KEY?: string
  readonly VITE_OPENAI_API_KEY?: string
  // Add other environment variables as needed
}

export interface ImportMeta {
  readonly env: ImportMetaEnv
}

// ================================
// Common Component Props
// ================================

export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

// ================================
// Form Types
// ================================

export interface FormFieldProps extends BaseComponentProps {
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
}

export interface FormSelectOption {
  value: string
  label: string
  disabled?: boolean
}

// ================================
// Navigation Types
// ================================

export interface NavigationItem {
  label: string
  href: string
  icon?: React.ComponentType<Record<string, unknown>>
  active?: boolean
  disabled?: boolean
}

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

// ================================
// File Upload Component Types
// ================================

export interface FileUploadProps extends BaseComponentProps {
  onFileSelect: (files: File[]) => void
  accept?: string
  multiple?: boolean
  maxSize?: number
  maxFiles?: number
  disabled?: boolean
}

export interface FileUploadState {
  isDragging: boolean
  isUploading: boolean
  progress: number
  error?: string
}

// ================================
// Document Viewer Types
// ================================

export interface DocumentViewerProps extends BaseComponentProps {
  document: Document
  onClose?: () => void
  showThumbnail?: boolean
}

export interface DocumentListProps extends BaseComponentProps {
  documents: Document[]
  onDocumentSelect?: (document: Document) => void
  onDocumentDelete?: (documentId: string) => void
  loading?: boolean
  emptyMessage?: string
}

// ================================
// Project Component Types
// ================================

export interface ProjectFormProps extends BaseComponentProps {
  project?: Partial<Project>
  onSubmit: (project: CreateProjectInput) => void
  onCancel?: () => void
  loading?: boolean
}

export interface ProjectListProps extends BaseComponentProps {
  projects: Project[]
  onProjectSelect?: (project: Project) => void
  onProjectDelete?: (projectId: string) => void
  loading?: boolean
  emptyMessage?: string
}

export interface ProjectSelectorProps extends BaseComponentProps {
  selectedProject?: Project
  onProjectChange: (project: Project | null) => void
  projects: Project[]
  loading?: boolean
  placeholder?: string
}

// ================================
// Search and Filter Types
// ================================

export interface SearchProps extends BaseComponentProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSubmit?: (value: string) => void
  loading?: boolean
}

export interface FilterOption {
  key: string
  label: string
  value: string | number | boolean
  count?: number
}

export interface FilterProps extends BaseComponentProps {
  options: FilterOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  title?: string
  multiple?: boolean
}

// ================================
// Modal and Dialog Types
// ================================

export interface ModalProps extends BaseComponentProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export interface ConfirmDialogProps extends ModalProps {
  onConfirm: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}

// ================================
// Loading and State Types
// ================================

export interface LoadingState {
  loading: boolean
  error?: string
  success?: boolean
}

export interface PaginationState {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

// ================================
// Voice Input Types
// ================================

export interface VoiceInputProps extends BaseComponentProps {
  onResult: (transcript: string) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
  disabled?: boolean
  language?: string
}

// ================================
// Config Debugger Types
// ================================

export interface ConfigDebuggerProps extends BaseComponentProps {
  showSensitive?: boolean
  onConfigChange?: (config: EnvironmentConfig) => void
}

export interface ConfigStatus {
  service: string
  status: 'connected' | 'error' | 'unknown'
  message?: string
}

// ================================
// Theme and UI Types
// ================================

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system'
  primaryColor?: string
  fontSize?: 'sm' | 'md' | 'lg'
}

export interface ToastMessage {
  id: string
  title?: string
  description: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}
