# ScopeIQ Type Definitions

This document describes the new type organization structure for ScopeIQ, where types have been abstracted into `.d.ts` declaration files for better maintainability and cleaner separation of concerns.

## Type Organization Structure

### 📁 `src/types/` Directory

#### `entities.d.ts`

**Purpose**: Core entity type definitions

- **BaseEntity**: Common fields for all entities (id, createdAt, updatedAt)
- **Document types**: Document, S3Document, DatabaseDocument
- **Project types**: Project, S3Project, DatabaseProject, ProjectWithDocuments
- **Company types**: Company, DatabaseCompany
- **Hybrid types**: HybridDocument, HybridProject, HybridProjectWithDocuments
- **Utility types**: DocumentStatus, FileType, CreateInput, UpdateInput

#### `services.d.ts`

**Purpose**: Service and API type definitions

- **Input types**: CreateDocumentInput, UpdateDocumentInput, CreateProjectInput, etc.
- **Response types**: ServiceResponse, ListResponse
- **Upload types**: UploadResult, FileUploadData
- **Migration types**: MigrationResult, MigrationStats
- **Error types**: APIError
- **Environment types**: EnvironmentConfig

#### `components.d.ts`

**Purpose**: Component-specific type definitions

- **Environment types**: ImportMetaEnv (for Vite environment variables)
- **Component props**: BaseComponentProps, FormFieldProps, etc.
- **UI types**: NavigationItem, BreadcrumbItem, FilterOption
- **Form types**: FileUploadProps, DocumentViewerProps, ProjectFormProps
- **State types**: LoadingState, PaginationState, SortState
- **Theme types**: ThemeConfig, ToastMessage

#### `ServiceError.ts`

**Purpose**: ServiceError class (needs to be in .ts file, not .d.ts)

- **ServiceError class**: Custom error class for service-level errors

### 🔄 Migration from `services/types.ts`

The original `src/services/types.ts` file has been **removed** after successfully migrating all type definitions to the new `.d.ts` files. All imports have been updated to use the new structure, and the `src/types/index.ts` file now serves as the main export point for component imports via `@/types`.

## Benefits of This Structure

### ✅ **Improved Organization**

- **Separation of Concerns**: Entity types, service types, and component types are clearly separated
- **Easier Navigation**: Developers know exactly where to find specific types
- **Reduced File Size**: Smaller, focused files instead of one large types file

### ✅ **Better TypeScript Integration**

- **Global Declarations**: `.d.ts` files provide global type declarations
- **IDE Support**: Better IntelliSense and autocomplete
- **Module System**: Proper ES6 module exports for tree-shaking

### ✅ **Maintainability**

- **Focused Editing**: Changes to specific type categories don't affect others
- **Version Control**: Cleaner diffs when types change
- **Documentation**: Each file has clear purpose and scope

### ✅ **Extensibility**

- **Easy Addition**: New type categories can be added as separate files
- **Component Types**: Framework for component-specific types as UI grows
- **API Evolution**: Service types can evolve independently of entities

## Usage Examples

### Importing Entity Types

```typescript
// Entities are available globally due to .d.ts files
const project: Project = {
  id: '123',
  name: 'My Project',
  companyId: 'company-1',
}
```

### Importing Service Types

```typescript
// Service types for API operations
const createInput: CreateProjectInput = {
  name: 'New Project',
  description: 'Project description',
}
```

### Component Props

```typescript
// Component types for React components
interface MyComponentProps extends BaseComponentProps {
  onSubmit: (data: CreateProjectInput) => void
}
```

### Backward Compatibility

```typescript
// Now imports from consolidated src/types/index.ts
import { Document, Project } from '@/types'
```

## File Structure

```
src/
├── types/
│   ├── entities.d.ts      # Core entity definitions
│   ├── services.d.ts      # Service and API types
│   ├── components.d.ts    # Component-specific types
│   ├── ServiceError.ts    # Service error class
│   ├── index.ts           # Main export point for @/types imports
│   └── README.md          # This documentation
├── services/
│   ├── database.ts        # Uses global entity types
│   ├── api.ts            # Uses global service types
│   └── ...
└── components/
    ├── ProjectForm.tsx    # Uses @/types imports
    └── ...
```

## Migration Guidelines

### For New Code

- Import types directly from the appropriate `.d.ts` files
- Use global declarations when available
- Follow the separation of concerns pattern

### For Existing Code

- All imports now consolidated through `src/types/index.ts`
- Components use `@/types` path mapping for clean imports
- Service files use global type declarations from `.d.ts` files

### Adding New Types

1. **Entity types** → Add to `entities.d.ts`
2. **API/Service types** → Add to `services.d.ts`
3. **Component types** → Add to `components.d.ts`
4. **Classes** → Create separate `.ts` files (like `ServiceError.ts`)

## TypeScript Configuration

The project's TypeScript configuration automatically includes `.d.ts` files, making types globally available without explicit imports for basic entity types.

---

This type organization provides a solid foundation for the growing ScopeIQ codebase while maintaining backward compatibility and improving developer experience.
