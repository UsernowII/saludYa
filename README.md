# SaludYa — Sistema de Gestión de Citas Médicas

Aplicación web para gestionar citas médicas en consultorios pequeños.
Desarrollada como proyecto académico para la asignatura Desarrollo de Aplicaciones Web — Corporación Universitaria Iberoamericana.

## Stack

- **Frontend:** React 18 + Vite + React Router v6 + Axios
- **Backend:** Node.js + Express + PostgreSQL + JWT
- **Email:** SendGrid
- **Deploy:** Vercel (frontend) + Render (backend)

## Estructura

```
saludya/
├── frontend/   # React SPA
└── backend/    # API REST + Node.js
```

## Levantar localmente

### Backend
```bash
cd backend
cp .env.example .env    # configurar variables
npm install
psql -d saludya_dev -f migrations/001_initial.sql
npm run dev             # corre en :3001
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev             # corre en :5173
```

## Usuarios de prueba (después de correr la migración)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@saludya.co | admin123 |

## Autores

- Jhon Erick Santos Gonzalez
- Nicolas Manjarres Gonzalez
