# Nuxt CMS Module - Domain Context

## Core Concepts

The Nuxt CMS module is built around a specific domain language that defines its entities and relationships. These terms are used consistently throughout the codebase to maintain clear domain boundaries and improve AI-navigability.

### Collection
A **Collection** is a data container defined by a Drizzle schema with dashboard configuration. It represents a database table that users can manage through the CMS admin interface.

**Key Characteristics:**
- Contains schema definition (Drizzle table)
- Has dashboard configuration for list and form views
- Supports validation rules and field widgets
- Has lifecycle hooks for data transformation
- Can define relationships with other collections

**Examples:** products, articles, users, media

### Widget
A **Widget** is a form field component with validation rules and UI metadata. It defines how a field appears in the admin interface and validates user input.

**Key Characteristics:**
- Renders UI component in admin forms
- Has validation rules (required, min, pattern, etc.)
- Provides default values and type inference
- Contains configuration options for customization
- Registered globally for build-time discovery

**Examples:** text, number, select, relation, file

### Relation
A **Relation** is a relationship between collections stored in one of three formats:
- **Inline Relation**: Foreign key stored on source collection table
- **Inverse Relation**: Foreign key stored on target collection table
- **Junction Relation**: Many-to-many relationship with dedicated junction table

**Key Characteristics:**
- Configured through field definitions
- Validated during collection setup
- Extracted from form data during CRUD operations
- Persisted through dedicated repository logic
- Has configuration options for display and filtering

### Field
A **Field** is a single column definition within a Collection with type and validation. It represents the basic building block of data storage and user input.

**Key Characteristics:**
- Maps to a database column
- Has specific type (text, number, boolean, etc.)
- Contains validation rules
- Associated with a widget for UI rendering
- Can have default values

### Dashboard
A **Dashboard** is the admin UI configuration for a Collection that defines how data is presented and edited. It includes both list and form configurations.

**Key Components:**
- **List Configuration**: Columns, filters, sorting, cell renderers
- **Form Configuration**: Tabs, sections, fields, widgets
- **Layout**: Organized presentation of data
- **Search**: Configurable search across fields

### Hook
A **Hook** is a lifecycle event that can modify data or execute side-effects during CRUD operations. It allows for custom business logic and data transformation.

**Types:**
- **beforeCreate**: Transform data before creation
- **afterCreate**: Execute logic after creation
- **beforeUpdate**: Transform data before update
- **afterUpdate**: Execute logic after update
- **beforeDelete**: Validate before deletion
- **afterDelete**: Execute logic after deletion
- **validate**: Custom validation rules

## Domain Relationships

The domain concepts interrelate as follows:

1. **Collection → Widget**: A Collection defines fields that use Widgets
2. **Field → Validation**: Each Field has Validation rules
3. **Widget → Field**: Widgets provide the UI for Fields
4. **Collection → Relation**: A Collection can have Relations with other Collections
5. **Relation → Storage Type**: Relations use one of three storage types
6. **Dashboard → Collection**: A Dashboard configures how a Collection is presented
7. **Hook → Collection**: Collections can define Hooks for data lifecycle

## Design Principles

### Interface is the Test Surface
All domain modules should be testable through their interface alone. This means:
- Mock dependencies, don't create them
- Return results instead of producing side effects
- Keep interfaces small and focused

### Depth Over Shallow
A deep module has significant implementation hidden behind a small interface:
- **Deep Example**: Collection definition with complex validation and UI configuration behind simple name/schema parameters
- **Shallow Example**: Service class that just passes through to database operations

### Seams for Alteration
Seams are locations where behavior can be changed without editing in that location:
- Widget registry seams for adding new widget types
- Validation strategy seams for different validation approaches
- Repository seams for different storage implementations