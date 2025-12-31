# 🧪 Guía de Testing - Backend

Esta guía explica cómo funcionan los tests en el backend de Gemini Mail, especialmente con el nuevo sistema de gestión de secretos.

## 📚 Tabla de Contenidos

1. [Configuración de Tests](#configuración-de-tests)
2. [Sistema de Mocks](#sistema-de-mocks)
3. [Ejecutar Tests](#ejecutar-tests)
4. [Escribir Nuevos Tests](#escribir-nuevos-tests)
5. [Troubleshooting](#troubleshooting)

---

## ⚙️ Configuración de Tests

### Archivos de Configuración

#### `jest.config.js`
Configuración principal de Jest con:
- **Preset**: `ts-jest` para soporte de TypeScript
- **Test Environment**: Node.js
- **Setup**: `src/test-setup.ts` se ejecuta antes de todos los tests
- **Coverage thresholds**: Mínimo 70% global, 85% para auth, 80% para encryption

#### `src/test-setup.ts`
Archivo de setup global que:
- Configura variables de entorno de test
- Silencia logs de consola (opcional)
- Establece timeout global de 10 segundos

#### `.env.test`
Variables de entorno específicas para testing:
```bash
NODE_ENV=test
DB_HOST=localhost
DB_NAME=gemini_mail_test
# ... etc
```

---

## 🎭 Sistema de Mocks

### Mock de Secretos

El módulo de secretos (`src/config/secrets.ts`) está completamente mockeado para tests.

**Ubicación**: `src/config/__mocks__/secrets.ts`

```typescript
// En tus tests, usa el mock así:
jest.mock('../config/secrets');

import { getSecret, getOptionalSecret } from '../secrets';

// Los valores son automáticamente mockeados:
getSecret('DB_PASSWORD') // → 'test_password'
getSecret('JWT_SECRET') // → 'test-jwt-secret-key-for-testing-only'
getOptionalSecret('REDIS_PASSWORD') // → 'test_redis_password'
getOptionalSecret('GMAIL_CLIENT_SECRET') // → undefined
```

### Valores de Secretos en Tests

| Secret | Valor de Test |
|--------|---------------|
| `DB_PASSWORD` | `test_password` |
| `REDIS_PASSWORD` | `test_redis_password` |
| `JWT_SECRET` | `test-jwt-secret-key-for-testing-only` |
| `GEMINI_API_KEY` | `test-gemini-api-key` |
| `GMAIL_CLIENT_SECRET` | `undefined` |
| `MICROSOFT_CLIENT_SECRET` | `undefined` |

---

## 🚀 Ejecutar Tests

### Comandos Disponibles

```bash
# Ejecutar todos los tests con coverage
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests para CI (sin watch, con coverage)
npm run test:ci

# Ejecutar un test específico
npm test -- --testPathPattern=secrets.test.ts

# Ejecutar tests sin coverage (más rápido)
npm test -- --no-coverage

# Ver tests disponibles
npm test -- --listTests
```

### Coverage Reports

Los reportes de coverage se generan en:
- **Terminal**: Resumen en consola
- **HTML**: `coverage/index.html` (abre en navegador)
- **LCOV**: `coverage/lcov.info` (para integraciones CI)
- **JSON**: `coverage/coverage-summary.json`

---

## 📝 Escribir Nuevos Tests

### Template Básico

```typescript
// src/services/__tests__/my-service.test.ts

// Mockear dependencias ANTES de importarlas
jest.mock('../config/database');
jest.mock('../config/secrets');

import { MyService } from '../my-service';
import { query } from '../config/database';
import { getSecret } from '../config/secrets';

describe('MyService', () => {
  let service: MyService;
  const mockQuery = query as jest.MockedFunction<typeof query>;

  beforeEach(() => {
    service = new MyService();
    jest.clearAllMocks();
  });

  describe('myMethod', () => {
    it('should do something', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [{ id: '1' }] } as any);

      // Act
      const result = await service.myMethod();

      // Assert
      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(/* ... */);
    });
  });
});
```

### Mockear Secretos en Tests

```typescript
// Opción 1: Usar el mock automático
jest.mock('../config/secrets');

import { getSecret } from '../config/secrets';

test('usa secreto', () => {
  const secret = getSecret('DB_PASSWORD');
  expect(secret).toBe('test_password');
});

// Opción 2: Override del mock para casos especiales
jest.mock('../config/secrets', () => ({
  getSecret: jest.fn((name) => {
    if (name === 'CUSTOM_SECRET') return 'custom-value';
    return 'default-test-value';
  }),
}));
```

### Best Practices

1. **Mockear dependencias externas**: Database, Redis, APIs externas
2. **Limpiar mocks**: Usar `jest.clearAllMocks()` en `beforeEach`
3. **Arrange-Act-Assert**: Estructura clara de tests
4. **Nombres descriptivos**: Describe qué hace el test, no cómo lo hace
5. **Un assert por concepto**: Tests enfocados y fáciles de debuggear
6. **Evitar lógica compleja**: Tests simples y directos

---

## 🔍 Troubleshooting

### Error: "Cannot find module '../config/secrets'"

**Solución**: Asegúrate de que el mock existe en `src/config/__mocks__/secrets.ts`

### Error: "Secret is undefined"

**Problema**: El mock no está siendo usado.

**Solución**:
```typescript
// Asegúrate de mockear ANTES de importar
jest.mock('../config/secrets');  // ✅ Primero

import { getSecret } from '../config/secrets';  // ✅ Después
```

### Tests Lentos

**Soluciones**:
```bash
# Ejecutar sin coverage
npm test -- --no-coverage

# Ejecutar solo un archivo
npm test -- --testPathPattern=my-test.test.ts

# Ejecutar tests en paralelo (default)
npm test -- --maxWorkers=4
```

### Coverage Bajo

**Revisar**:
```bash
# Ver reporte detallado en HTML
open coverage/index.html

# Ver en terminal
npm test

# Verificar thresholds en jest.config.js
```

### TypeScript Errors en Tests

**Problema**: Tipos incorrectos en mocks.

**Solución**:
```typescript
// Tipar correctamente los mocks
const mockQuery = query as jest.MockedFunction<typeof query>;

// O usar tipo any temporal
mockQuery.mockResolvedValueOnce({ rows: [] } as any);
```

---

## 🎯 Coverage Thresholds

### Globales
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Servicios Críticos

#### `auth.service.ts`
- **Todo**: 85% (servicio de autenticación crítico)

#### `encryption.service.ts`
- **Todo**: 80% (servicio de encriptación crítico)

---

## 📊 Estado Actual de Tests

### ✅ Tests que Pasan

- **secrets.test.ts** - Sistema de gestión de secretos ✅
- **auth.service.test.ts** - Servicio de autenticación ✅
- **encryption.service.test.ts** - Servicio de encriptación ✅
- **health.test.ts** - Health check endpoint ✅
- **auth.middleware.test.ts** - Middleware de autenticación ✅
- **auth.routes.test.ts** - Rutas de autenticación ✅

### ⚠️ Tests con Issues Conocidos

- **oauth.service.test.ts** - Error de TypeScript (campo `displayName`)
- **email.service.test.ts** - Error de TypeScript (campo `displayName`)
- **gemini.service.test.ts** - Mocks de Gemini AI necesitan actualización

---

## 🔄 Integración Continua

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## 📖 Referencias

- [Jest Documentation](https://jestjs.io/)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Última actualización**: 2024-12-21
**Autor**: Claude Code
