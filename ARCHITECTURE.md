# Arquitectura del Proyecto - Clean Architecture & SOLID

Este documento describe la arquitectura refactorizada del proyecto siguiendo los principios de Clean Architecture y SOLID.

## Estructura General

El proyecto está organizado en capas siguiendo Clean Architecture:

```
app/
├── backend/
│   └── internal/
│       ├── domain/          # Capa de dominio (entidades y interfaces)
│       ├── application/     # Capa de aplicación (servicios/usecases)
│       ├── infrastructure/  # Capa de infraestructura (implementaciones)
│       └── interfaces/      # Capa de interfaces (HTTP handlers, DTOs)
└── frontend/
    └── src/
        ├── domain/          # Entidades y repositorios (interfaces)
        ├── application/     # Servicios y lógica de negocio
        ├── infrastructure/  # Clientes de API, almacenamiento
        └── presentation/    # Componentes, páginas, hooks de UI
```

## Backend (Go)

### Capa de Dominio (`internal/domain/`)

**Entidades** (`entities/`):
- `reservation.go`: Entidad de dominio para reservaciones
- `space.go`: Entidad de dominio para espacios
- `office_map.go`: Entidad de dominio para mapas de oficina

**Repositorios** (`repositories/`):
- Interfaces que definen contratos para acceso a datos:
  - `reservation_repository.go`: Contrato para operaciones de reservaciones
  - `space_repository.go`: Contrato para operaciones de espacios
  - `office_map_repository.go`: Contrato para operaciones de mapas

### Capa de Aplicación (`internal/application/`)

**Servicios** (`services/`):
- `reservation_service.go`: Lógica de negocio para reservaciones
  - Validaciones de fecha y hora
  - Lógica de sobrescritura de reservaciones
  - Manejo de grupos de meeting rooms
- `space_service.go`: Lógica de negocio para espacios

### Capa de Infraestructura (`internal/infrastructure/`)

**Repositorios** (`repositories/`):
- Implementaciones concretas de los repositorios usando GORM:
  - `reservation_repository_impl.go`
  - `space_repository_impl.go`

**Mappers** (`mappers/`):
- Conversión entre entidades de dominio y modelos de base de datos:
  - `reservation_mapper.go`
  - `space_mapper.go`

**DI Container** (`di/`):
- `container.go`: Contenedor de inyección de dependencias

### Capa de Interfaces (`internal/interfaces/`)

**HTTP Handlers** (`http/`):
- `reservation_handler.go`: Handlers HTTP para reservaciones
  - Usa los servicios de la capa de aplicación
  - Maneja DTOs y conversiones

**DTOs** (`dto/`):
- `reservation_dto.go`: Data Transfer Objects para requests/responses HTTP

## Frontend (TypeScript/React)

### Capa de Dominio (`domain/`)

**Entidades** (`entities/`):
- `OfficeMap.ts`: Tipos de dominio para mapas, espacios y reservaciones

**Repositorios** (`repositories/`):
- `ReservationRepository.ts`: Interfaz que define el contrato para operaciones de reservaciones

### Capa de Aplicación (`application/`)

**Servicios** (`services/`):
- `ReservationService.ts`: Servicio que encapsula la lógica de negocio
  - Validaciones de tiempo
  - Métodos helper para consultas comunes

### Capa de Infraestructura (`infrastructure/`)

**API Clients** (`api/`):
- `ReservationApiClient.ts`: Implementación del repositorio usando HTTP/axios

**DI Container** (`di/`):
- `container.ts`: Contenedor de dependencias para servicios

### Capa de Presentación (`presentation/`)

**Componentes** (`components/`):
- Componentes de UI puros (sin lógica de negocio)

**Páginas** (`pages/`):
- Componentes de página que orquestan componentes y hooks

**Hooks** (`hooks/`):
- Hooks personalizados para manejo de estado y efectos

## Principios SOLID Aplicados

### Single Responsibility Principle (SRP)
- Cada clase/servicio tiene una única responsabilidad
- Handlers solo manejan HTTP, servicios contienen lógica de negocio, repositorios solo acceso a datos

### Open/Closed Principle (OCP)
- Uso de interfaces permite extender funcionalidad sin modificar código existente
- Nuevos repositorios pueden implementar las interfaces sin cambiar servicios

### Liskov Substitution Principle (LSP)
- Las implementaciones de repositorios son intercambiables
- Cualquier implementación que cumpla la interfaz puede usarse

### Interface Segregation Principle (ISP)
- Interfaces específicas y pequeñas (ReservationRepository, SpaceRepository)
- No hay interfaces "gordas" con métodos no utilizados

### Dependency Inversion Principle (DIP)
- Servicios dependen de interfaces (repositorios), no de implementaciones concretas
- El contenedor de DI inyecta las dependencias

## Beneficios de la Nueva Arquitectura

1. **Testabilidad**: Fácil de testear con mocks de repositorios
2. **Mantenibilidad**: Código organizado y fácil de entender
3. **Escalabilidad**: Fácil agregar nuevas funcionalidades
4. **Flexibilidad**: Cambiar implementaciones sin afectar otras capas
5. **Separación de Concerns**: Cada capa tiene responsabilidades claras

## Migración y Compatibilidad

- El código legacy se mantiene funcionando
- Los handlers antiguos siguen disponibles para Maps y Spaces
- Las funciones en `utils/api.ts` ahora usan los nuevos servicios internamente
- La migración es gradual y no rompe funcionalidad existente

## Próximos Pasos

1. Refactorizar handlers de Maps y Spaces siguiendo el mismo patrón
2. Agregar tests unitarios para servicios
3. Agregar tests de integración para repositorios
4. Documentar casos de uso específicos

