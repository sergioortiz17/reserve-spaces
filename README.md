# Office Space Reservation System

Un sistema completo de reserva de espacios de oficina con constructor de mapas interactivo.

## 🏗️ Arquitectura

- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Backend**: Go + Gin + PostgreSQL
- **Deployment**: Docker + Docker Compose

## 🚀 Inicio Rápido

### Ejecutar con Docker Compose

```bash
# Navegar al proyecto
cd /home/sergio/Documents/NO-CLIENTS/Sergio/k8s/office-map

# Levantar todo el stack
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

### Acceso a la Aplicación

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080
- **Health Check**: http://localhost:8080/api/health

## 📁 Estructura del Proyecto

```
office-map/
├── docker-compose.yml          # Orquestación principal
├── init.sql                    # Schema inicial de PostgreSQL
├── app/
│   ├── frontend/               # React + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── components/     # Componentes reutilizables
│   │   │   ├── pages/         # Páginas principales
│   │   │   ├── types/         # Definiciones TypeScript
│   │   │   └── utils/         # Utilidades (API, fechas)
│   │   ├── Dockerfile         # Imagen React + Nginx
│   │   ├── nginx.conf         # Configuración Nginx
│   │   └── package.json
│   └── backend/               # Go + Gin
│       ├── cmd/server/        # Punto de entrada
│       ├── internal/
│       │   ├── handlers/      # Controladores API
│       │   ├── models/        # Modelos de datos
│       │   ├── database/      # Configuración DB
│       │   └── middleware/    # Middleware HTTP
│       ├── Dockerfile         # Imagen Go
│       └── go.mod
└── README.md
```

## 🎯 Funcionalidades

### ✅ Sistema de Reservas
- **Reservas hasta 1 semana** de anticipación
- **Validación de disponibilidad** en tiempo real
- **Prevención de doble reserva**
- **Estados visuales** claros (disponible/ocupado)

### ✅ Interfaz de Usuario
- **Dashboard** con estadísticas
- **Constructor de mapas** (básico)
- **Lista de reservas** con gestión
- **Vista calendario** semanal
- **Diseño responsive**

### ✅ API REST Completa
- **Endpoints CRUD** para mapas, espacios y reservas
- **Validaciones robustas**
- **Health checks**

## 🔧 Desarrollo Local

### Backend
```bash
cd app/backend
go mod tidy
go run cmd/server/main.go
```

### Frontend
```bash
cd app/frontend
npm install
npm run dev
```

### Base de Datos
```bash
# PostgreSQL con Docker
docker run --name office-postgres \
  -e POSTGRES_DB=office_reservations \
  -e POSTGRES_USER=office_user \
  -e POSTGRES_PASSWORD=office_pass \
  -p 5432:5432 -d postgres:15-alpine
```

## 📝 API Endpoints

### Health Check
- `GET /api/health` - Verificar estado del servicio

### Mapas
- `GET /api/maps` - Listar mapas
- `POST /api/maps` - Crear mapa
- `PUT /api/maps/:id` - Actualizar mapa
- `DELETE /api/maps/:id` - Eliminar mapa

### Espacios
- `GET /api/spaces` - Listar espacios
- `POST /api/spaces` - Crear espacio
- `PUT /api/spaces/:id` - Actualizar espacio
- `DELETE /api/spaces/:id` - Eliminar espacio

### Reservas
- `GET /api/reservations` - Listar reservas
- `POST /api/reservations` - Crear reserva
- `DELETE /api/reservations/:id` - Cancelar reserva

### Ejemplo de Uso

```bash
# Crear reserva
curl -X POST http://localhost:8080/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "space_id": "uuid-here",
    "user_id": "john.doe",
    "user_name": "John Doe",
    "date": "2024-01-15",
    "start_time": "09:00",
    "end_time": "17:00",
    "notes": "Working on project X"
  }'
```

## 🗄️ Base de Datos

### Tablas
- `office_maps` - Configuración de mapas
- `spaces` - Espacios individuales
- `reservations` - Reservas de usuarios

### Conexión
```
postgresql://office_user:office_pass@localhost:5432/office_reservations
```

## 🚨 Validaciones

### Reglas de Negocio
- ✅ Reservas máximo 1 semana por adelantado
- ✅ No reservas en fechas pasadas
- ✅ Prevención de doble reserva
- ✅ Validación de horarios (inicio < fin)

## 🐛 Troubleshooting

### Problemas Comunes

#### Backend no inicia
```bash
# Ver logs
docker-compose logs backend

# Verificar PostgreSQL
docker-compose ps postgres
```

#### Frontend no conecta
```bash
# Verificar que backend esté en puerto 8080
curl http://localhost:8080/api/health

# Ver logs del frontend
docker-compose logs frontend
```

#### Base de datos
```bash
# Resetear base de datos
docker-compose down -v
docker-compose up -d
```

## 🎨 Tecnologías

### Frontend
- **React 18** con TypeScript
- **Vite** para desarrollo rápido
- **TailwindCSS** para estilos
- **React Router** para navegación
- **Axios** para API calls
- **React Hot Toast** para notificaciones

### Backend
- **Go 1.21** con Gin framework
- **GORM** ORM con PostgreSQL
- **UUID** para IDs seguros
- **CORS** configurado
- **Middleware** para logging

### Base de Datos
- **PostgreSQL 15** con extensión UUID
- **Índices optimizados**
- **Constraints** para integridad

## 📄 Licencia

MIT License - ver archivo LICENSE para detalles.