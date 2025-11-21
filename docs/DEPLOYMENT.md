# Deployment Guide

This guide covers different deployment scenarios for the Office Space Reservation System.

## Prerequisites

- Docker and Docker Compose installed
- Git for cloning the repository
- Make (optional, for using Makefile commands)

## Quick Start with Docker Compose

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd office-space-reservations
```

### 2. Start All Services
```bash
# Using Docker Compose directly
docker-compose -f deploy/docker-compose.yml up --build -d

# Or using Makefile
make dev
```

### 3. Verify Deployment
```bash
# Check all services are running
docker-compose -f deploy/docker-compose.yml ps

# Check logs
docker-compose -f deploy/docker-compose.yml logs -f

# Test API
curl http://localhost:8080/api/health

# Access frontend
open http://localhost:5173
```

## Environment Configuration

### Backend Environment Variables

Create `app/backend/.env` from `app/backend/env.example`:

```bash
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USER=office_user
DB_PASSWORD=office_pass
DB_NAME=office_reservations
DB_SSLMODE=disable

# Server Configuration
PORT=8080
GIN_MODE=release

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend Environment Variables

Create `app/frontend/.env` from `app/frontend/env.example`:

```bash
# API Configuration
VITE_API_URL=http://localhost:8080/api

# Development
VITE_DEV_MODE=false
```

## Production Deployment

### Docker Compose Production

1. **Update Environment Variables**
   ```bash
   # Update database credentials
   # Set GIN_MODE=release
   # Update CORS origins for production domain
   ```

2. **Build and Deploy**
   ```bash
   docker-compose -f deploy/docker-compose.yml up --build -d
   ```

3. **Setup Reverse Proxy (Optional)**
   ```nginx
   # /etc/nginx/sites-available/office-reservations
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5173;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /api/ {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Kubernetes Deployment

#### 1. Create Namespace
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: office-reservations
```

#### 2. Database Deployment
```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: office-reservations
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: office_reservations
        - name: POSTGRES_USER
          value: office_user
        - name: POSTGRES_PASSWORD
          value: office_pass
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: office-reservations
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

#### 3. Backend Deployment
```yaml
# k8s/backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: office-reservations
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: office-reservations-backend:latest
        env:
        - name: DB_HOST
          value: postgres-service
        - name: DB_PORT
          value: "5432"
        - name: DB_USER
          value: office_user
        - name: DB_PASSWORD
          value: office_pass
        - name: DB_NAME
          value: office_reservations
        - name: PORT
          value: "8080"
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: office-reservations
spec:
  selector:
    app: backend
  ports:
  - port: 8080
    targetPort: 8080
```

#### 4. Frontend Deployment
```yaml
# k8s/frontend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: office-reservations
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: office-reservations-frontend:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: office-reservations
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
```

#### 5. Ingress
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: office-reservations-ingress
  namespace: office-reservations
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: office-reservations.your-domain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 8080
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

#### Deploy to Kubernetes
```bash
kubectl apply -f k8s/
```

## Cloud Deployment

### AWS ECS

1. **Build and Push Images**
   ```bash
   # Build images
   docker build -f deploy/Dockerfile.backend -t office-backend ./app/backend
   docker build -f deploy/Dockerfile.frontend -t office-frontend ./app/frontend
   
   # Tag for ECR
   docker tag office-backend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/office-backend:latest
   docker tag office-frontend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/office-frontend:latest
   
   # Push to ECR
   docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/office-backend:latest
   docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/office-frontend:latest
   ```

2. **Create ECS Task Definition**
   ```json
   {
     "family": "office-reservations",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "containerDefinitions": [
       {
         "name": "backend",
         "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/office-backend:latest",
         "portMappings": [
           {
             "containerPort": 8080,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "DB_HOST",
             "value": "your-rds-endpoint"
           }
         ]
       }
     ]
   }
   ```

### Google Cloud Run

1. **Build and Deploy Backend**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT-ID/office-backend ./app/backend
   gcloud run deploy office-backend \
     --image gcr.io/PROJECT-ID/office-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

2. **Build and Deploy Frontend**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT-ID/office-frontend ./app/frontend
   gcloud run deploy office-frontend \
     --image gcr.io/PROJECT-ID/office-frontend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

## Database Setup

### PostgreSQL on Cloud

#### AWS RDS
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier office-reservations-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username office_user \
  --master-user-password your-secure-password \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxxx
```

#### Google Cloud SQL
```bash
# Create Cloud SQL instance
gcloud sql instances create office-reservations-db \
  --database-version=POSTGRES_13 \
  --tier=db-f1-micro \
  --region=us-central1
```

### Database Migration

The application automatically runs migrations on startup. For manual migration:

```bash
# Connect to database
psql -h your-db-host -U office_user -d office_reservations

# Run migration SQL
\i deploy/init.sql
```

## Monitoring and Logging

### Health Checks

The application provides health check endpoints:

```bash
# API health check
curl http://localhost:8080/api/health

# Database connectivity check
curl http://localhost:8080/api/health/db
```

### Logging

#### Docker Compose Logs
```bash
# View all logs
docker-compose -f deploy/docker-compose.yml logs -f

# View specific service logs
docker-compose -f deploy/docker-compose.yml logs -f backend
docker-compose -f deploy/docker-compose.yml logs -f frontend
docker-compose -f deploy/docker-compose.yml logs -f postgres
```

#### Application Logs

Backend logs include:
- Request/response logging
- Database query logging
- Error logging with stack traces
- Performance metrics

Frontend logs include:
- API request/response logging
- User interaction events
- Error boundary catches
- Performance metrics

## Backup and Recovery

### Database Backup

```bash
# Create backup
docker-compose -f deploy/docker-compose.yml exec postgres pg_dump -U office_user office_reservations > backup.sql

# Restore backup
docker-compose -f deploy/docker-compose.yml exec -T postgres psql -U office_user office_reservations < backup.sql
```

### Automated Backups

```bash
# Add to crontab for daily backups
0 2 * * * /path/to/backup-script.sh
```

## Security Considerations

### Production Security Checklist

- [ ] Change default database passwords
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up firewall rules
- [ ] Enable database encryption at rest
- [ ] Implement rate limiting
- [ ] Set up monitoring and alerting
- [ ] Regular security updates
- [ ] Backup encryption

### Environment Variables Security

```bash
# Use Docker secrets in production
docker secret create db_password /path/to/password/file

# Or use external secret management
# AWS Secrets Manager, HashiCorp Vault, etc.
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check if PostgreSQL is running
   docker-compose -f deploy/docker-compose.yml ps postgres
   
   # Check database logs
   docker-compose -f deploy/docker-compose.yml logs postgres
   
   # Test connection
   docker-compose -f deploy/docker-compose.yml exec postgres psql -U office_user -d office_reservations
   ```

2. **Backend API Not Responding**
   ```bash
   # Check backend logs
   docker-compose -f deploy/docker-compose.yml logs backend
   
   # Check if port is accessible
   curl http://localhost:8080/api/health
   
   # Check environment variables
   docker-compose -f deploy/docker-compose.yml exec backend env
   ```

3. **Frontend Not Loading**
   ```bash
   # Check frontend logs
   docker-compose -f deploy/docker-compose.yml logs frontend
   
   # Check nginx configuration
   docker-compose -f deploy/docker-compose.yml exec frontend cat /etc/nginx/conf.d/default.conf
   
   # Test frontend directly
   curl http://localhost:5173
   ```

### Performance Optimization

1. **Database Optimization**
   - Add indexes for frequently queried columns
   - Use connection pooling
   - Optimize query performance

2. **Frontend Optimization**
   - Enable gzip compression
   - Use CDN for static assets
   - Implement caching strategies

3. **Backend Optimization**
   - Use HTTP/2
   - Implement response caching
   - Optimize JSON serialization
