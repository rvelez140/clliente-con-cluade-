# 🧪 Guía de Testing - Gemini Mail

Esta guía documenta la configuración completa de tests para el proyecto Gemini Mail.

## 📋 Índice

1. [Overview](#overview)
2. [Backend Testing (Jest)](#backend-testing-jest)
3. [Frontend Testing (Vitest)](#frontend-testing-vitest)
4. [CI/CD Integration](#cicd-integration)
5. [Comandos Útiles](#comandos-útiles)
6. [Mejores Prácticas](#mejores-prácticas)

---

## 🎯 Overview

El proyecto ahora cuenta con testing automatizado completo:

- **Backend**: Jest + ts-jest + Supertest
- **Frontend**: Vitest + React Testing Library
- **CI/CD**: Tests automáticos en cada PR y push
- **Coverage**: Reportes de cobertura de código

### Stack de Testing

| Componente | Framework | Propósito |
|------------|-----------|-----------|
| **Backend Unit Tests** | Jest | Tests de servicios y lógica de negocio |
| **Backend Integration** | Supertest | Tests de endpoints API |
| **Frontend Unit Tests** | Vitest | Tests de componentes React |
| **Frontend Integration** | React Testing Library | Tests de interacción de usuario |
| **Mocking** | jest.mock / vi.mock | Mocks de dependencias |

---

## 🔧 Backend Testing (Jest)

### Configuración

**Archivo**: `packages/backend/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Estructura de Tests

```
packages/backend/src/
├── __tests__/
│   └── health.test.ts              # Tests de endpoints básicos
├── services/
│   └── __tests__/
│       ├── auth.service.test.ts    # Tests del servicio de autenticación
│       └── encryption.service.test.ts
├── middleware/
│   └── __tests__/
│       └── auth.middleware.test.ts # Tests del middleware de auth
└── routes/
    └── __tests__/
        └── auth.routes.test.ts     # Tests de rutas de autenticación
```

### Ejemplos de Tests

#### 1. Test de Servicio (Unit Test)

```typescript
// src/services/__tests__/auth.service.test.ts
import { AuthService } from '../auth.service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    // Arrange
    const email = 'test@example.com';
    const password = 'password123';

    // Act
    const result = await authService.register(email, password);

    // Assert
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('token');
  });
});
```

#### 2. Test de Endpoint (Integration Test)

```typescript
// src/routes/__tests__/auth.routes.test.ts
import request from 'supertest';
import express from 'express';
import authRoutes from '../auth.routes';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  it('POST /auth/login - should login with valid credentials', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
  });
});
```

### Comandos Backend

```bash
cd packages/backend

# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con coverage
npm run test:ci

# Ejecutar tests específicos
npm test -- auth.service.test.ts

# Actualizar snapshots
npm test -- -u
```

---

## ⚛️ Frontend Testing (Vitest)

### Configuración

**Archivo**: `packages/frontend/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', 'dist/'],
    },
  },
});
```

### Setup de Testing

**Archivo**: `packages/frontend/src/test/setup.ts`

```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

### Estructura de Tests

```
packages/frontend/src/
├── components/
│   └── __tests__/
│       └── Sidebar.test.tsx        # Tests de componentes
├── pages/
│   └── __tests__/
│       └── Login.test.tsx          # Tests de páginas
└── services/
    └── __tests__/
        └── api.test.ts             # Tests de servicios API
```

### Ejemplos de Tests

#### 1. Test de Componente

```typescript
// src/components/__tests__/Sidebar.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';

describe('Sidebar Component', () => {
  it('should render navigation items', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(screen.getByText(/Gemini Mail/i)).toBeInTheDocument();
    expect(screen.getByText(/Bandeja de entrada/i)).toBeInTheDocument();
  });
});
```

#### 2. Test de Página con Interacción

```typescript
// src/pages/__tests__/Login.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../Login';
import axios from 'axios';

vi.mock('axios');

describe('Login Page', () => {
  it('should submit form with valid credentials', async () => {
    render(<Login />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
  });
});
```

### Comandos Frontend

```bash
cd packages/frontend

# Ejecutar todos los tests
npm test

# Ejecutar tests con UI interactiva
npm run test:ui

# Ejecutar tests con coverage
npm run test:coverage

# Ejecutar tests en modo watch
npm test -- --watch

# Ejecutar tests específicos
npm test -- Sidebar.test.tsx
```

---

## 🚀 CI/CD Integration

### Workflow Actualizado

Los tests se ejecutan automáticamente en GitHub Actions:

**Archivo**: `.github/workflows/build-test.yml`

```yaml
jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: packages/backend
        run: npm ci

      - name: Run tests
        working-directory: packages/backend
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./packages/backend/coverage/lcov.info

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: packages/frontend
        run: npm ci

      - name: Run tests
        working-directory: packages/frontend
        run: npm run test:coverage

  build:
    needs: [test-backend, test-frontend]
    # ... build steps
```

### Triggers

Los tests se ejecutan automáticamente en:

- ✅ **Pull Requests** hacia `main`
- ✅ **Pushes** a cualquier rama (excepto `main`)
- ✅ **Workflow dispatch** manual

### Protecciones de Rama

Los tests deben pasar antes de mergear:

1. Tests de backend deben pasar
2. Tests de frontend deben pasar
3. Build de Docker debe completarse

---

## 📊 Comandos Útiles

### Tests Locales

```bash
# Desde la raíz del proyecto - ejecutar todos los tests
npm run test                    # (si se configura en package.json raíz)

# Backend
cd packages/backend
npm test                        # Ejecutar tests
npm run test:watch             # Modo watch
npm run test:ci                # Para CI (con coverage)

# Frontend
cd packages/frontend
npm test                        # Ejecutar tests
npm run test:ui                # UI interactiva
npm run test:coverage          # Con coverage
```

### Ver Coverage

```bash
# Backend
cd packages/backend
npm run test:ci
open coverage/lcov-report/index.html

# Frontend
cd packages/frontend
npm run test:coverage
open coverage/index.html
```

### Debug de Tests

```bash
# Backend - con inspector de Node.js
node --inspect-brk node_modules/.bin/jest --runInBand

# Frontend - con UI de Vitest
npm run test:ui
```

---

## ✅ Mejores Prácticas

### 1. Estructura de Tests

```typescript
describe('Componente/Servicio', () => {
  // Setup
  beforeEach(() => {
    // Preparar estado
  });

  afterEach(() => {
    // Limpiar
  });

  describe('método específico', () => {
    it('should hacer algo específico', () => {
      // Arrange (preparar)
      const input = 'test';

      // Act (ejecutar)
      const result = someFunction(input);

      // Assert (verificar)
      expect(result).toBe('expected');
    });
  });
});
```

### 2. Naming Conventions

```typescript
// ✅ BUENO - Descriptivo y claro
it('should return 401 when token is invalid')
it('should display error message on failed login')

// ❌ MALO - Vago y poco descriptivo
it('works')
it('test 1')
```

### 3. Mocking

```typescript
// Mock de módulos externos
jest.mock('axios');
vi.mock('axios');

// Mock de funciones específicas
const mockFn = jest.fn();
mockFn.mockReturnValue('value');
mockFn.mockResolvedValue(Promise.resolve('async value'));

// Verificar llamadas
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(1);
```

### 4. Tests de Componentes React

```typescript
// ✅ BUENO - Testear comportamiento del usuario
it('should submit form when button is clicked', () => {
  render(<LoginForm />);

  const button = screen.getByRole('button', { name: /submit/i });
  fireEvent.click(button);

  expect(mockSubmit).toHaveBeenCalled();
});

// ❌ MALO - Testear detalles de implementación
it('should call setState when button is clicked', () => {
  // No testear implementación interna
});
```

### 5. Coverage Mínimo

```javascript
// jest.config.js / vitest.config.ts
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

---

## 🎯 Checklist de Testing

Antes de hacer commit, asegúrate de:

- [ ] Todos los tests pasan localmente
- [ ] Coverage está por encima del 70%
- [ ] Tests nuevos para features nuevas
- [ ] Tests actualizados para cambios en código existente
- [ ] No hay tests comentados o skipped sin razón
- [ ] Mocks están correctamente configurados
- [ ] Tests son determinísticos (no dependen de timing o random)

---

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/guide/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

---

## 🐛 Troubleshooting

### Tests fallan en CI pero pasan localmente

```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install

# Ejecutar tests en modo CI
npm run test:ci
```

### Error: "Cannot find module"

```bash
# Verificar paths en jest.config.js o vitest.config.ts
# Asegurarse que moduleNameMapper está configurado correctamente
```

### Tests de frontend muy lentos

```typescript
// En vitest.config.ts
test: {
  pool: 'threads',          // o 'forks'
  poolOptions: {
    threads: {
      singleThread: false,
      maxThreads: 4,
    },
  },
}
```

---

**Última actualización**: 2025-12-21
**Versión**: 1.0
