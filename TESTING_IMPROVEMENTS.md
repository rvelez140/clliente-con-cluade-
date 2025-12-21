# 🧪 Plan de Mejoras de Testing - Gemini Mail

**Fecha**: 2025-12-21
**Objetivo**: Mejorar la calidad, eficiencia y cobertura de tests del proyecto

---

## 📊 Situación Actual

### Estadísticas de Cobertura

| Categoría | Total | Con Tests | Sin Tests | % Cobertura |
|-----------|-------|-----------|-----------|-------------|
| **Backend Services** | 10 | 2 | 8 | 20% |
| **Backend Routes** | 7 | 1 | 6 | 14% |
| **Frontend Components** | ~30+ | 1 | 29+ | <5% |
| **Frontend Pages** | ~10+ | 1 | 9+ | 10% |
| **E2E Tests** | 0 | 0 | - | 0% |
| **Desktop Tests** | 0 | 0 | - | 0% |
| **Mobile Tests** | 0 | 0 | - | 0% |

### ⚠️ Problemas Críticos Identificados

1. **Cobertura Insuficiente**: Solo ~15% del código tiene tests
2. **Servicios Críticos sin Tests**:
   - Email service (funcionalidad core)
   - Gmail API service
   - OAuth service (autenticación externa)
   - Gemini AI service (funcionalidad diferenciadora)
   - Unified email service
3. **Sin Tests E2E**: No hay validación de flujos completos
4. **Sin Quality Gates**: No hay thresholds que bloqueen código de baja calidad
5. **Desktop y Mobile sin Testing**: 50% de las plataformas sin cobertura

---

## 🎯 Plan de Mejoras Prioritarias

### Prioridad 1: Configuración de Quality Gates (Urgente)

#### 1.1 Agregar Thresholds de Cobertura en Jest

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
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // ✅ NUEVO: Thresholds de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Thresholds específicos para servicios críticos
    './src/services/email.service.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/services/auth.service.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },

  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
```

**Beneficio**: Bloquea commits con cobertura <70%, fuerza calidad desde el inicio.

---

#### 1.2 Agregar Thresholds en Vitest

**Archivo**: `packages/frontend/vitest.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
      ],

      // ✅ NUEVO: Thresholds de cobertura
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
        // Thresholds por archivo crítico
        './src/services/api.ts': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

#### 1.3 Mejorar CI/CD con Quality Gates

**Archivo**: `.github/workflows/build-test.yml`

```yaml
jobs:
  test-backend:
    name: Test Backend
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run backend tests with coverage
        working-directory: packages/backend
        run: npm run test:ci

      # ✅ NUEVO: Validar que los tests no fallan
      - name: Check test results
        if: failure()
        run: |
          echo "❌ Tests fallaron. Por favor revisa los errores arriba."
          exit 1

      # ✅ NUEVO: Validar cobertura mínima
      - name: Check coverage threshold
        working-directory: packages/backend
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          echo "Cobertura actual: ${COVERAGE}%"
          if (( $(echo "$COVERAGE < 70" | bc -l) )); then
            echo "❌ Cobertura de ${COVERAGE}% es menor al mínimo requerido (70%)"
            exit 1
          fi
          echo "✅ Cobertura de ${COVERAGE}% cumple con el mínimo (70%)"

      - name: Upload backend coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./packages/backend/coverage/lcov.info
          flags: backend
          fail_ci_if_error: true  # ✅ NUEVO: Falla CI si Codecov falla

  test-frontend:
    name: Test Frontend
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run frontend tests
        working-directory: packages/frontend
        run: npm run test:coverage

      # ✅ NUEVO: Validar cobertura frontend
      - name: Check frontend coverage
        working-directory: packages/frontend
        run: |
          if [ ! -f coverage/coverage-summary.json ]; then
            echo "⚠️ No se generó reporte de cobertura"
            exit 1
          fi

      - name: Upload frontend coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./packages/frontend/coverage/lcov.info
          flags: frontend
          fail_ci_if_error: true

  # ✅ NUEVO: Job para reportar estado de cobertura
  coverage-report:
    name: Coverage Report
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: always()

    steps:
      - name: Download all coverage reports
        uses: actions/download-artifact@v3

      - name: Generate combined report
        run: |
          echo "## 📊 Coverage Report" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Package | Lines | Functions | Branches | Statements |" >> $GITHUB_STEP_SUMMARY
          echo "|---------|-------|-----------|----------|------------|" >> $GITHUB_STEP_SUMMARY
          # TODO: Parsear coverage-summary.json y agregar al summary
```

---

### Prioridad 2: Tests para Servicios Críticos

#### 2.1 Email Service Tests

**Crear**: `packages/backend/src/services/__tests__/email.service.test.ts`

```typescript
import { EmailService } from '../email.service';
import nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('EmailService', () => {
  let emailService: EmailService;
  let mockTransporter: any;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: '123' }),
      verify: jest.fn().mockResolvedValue(true),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
    emailService = new EmailService();
  });

  describe('sendEmail', () => {
    it('debe enviar un email correctamente', async () => {
      const emailData = {
        to: 'user@example.com',
        subject: 'Test',
        body: 'Test body',
      };

      await emailService.sendEmail(emailData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: emailData.to,
          subject: emailData.subject,
        })
      );
    });

    it('debe lanzar error si falla el envío', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        emailService.sendEmail({ to: 'fail@test.com', subject: 'Test', body: 'Body' })
      ).rejects.toThrow('SMTP error');
    });
  });

  describe('receiveEmails', () => {
    it('debe recibir emails vía IMAP', async () => {
      // TODO: Implementar mock de IMAP
    });
  });
});
```

**Cobertura objetivo**: 85%

---

#### 2.2 Gmail API Service Tests

**Crear**: `packages/backend/src/services/__tests__/gmail-api.service.test.ts`

```typescript
import { GmailAPIService } from '../gmail-api.service';
import { google } from 'googleapis';

jest.mock('googleapis');

describe('GmailAPIService', () => {
  let gmailService: GmailAPIService;
  let mockGmail: any;

  beforeEach(() => {
    mockGmail = {
      users: {
        messages: {
          list: jest.fn(),
          get: jest.fn(),
          send: jest.fn(),
        },
      },
    };
    (google.gmail as jest.Mock).mockReturnValue(mockGmail);
    gmailService = new GmailAPIService('mock-token');
  });

  describe('listMessages', () => {
    it('debe listar mensajes correctamente', async () => {
      mockGmail.users.messages.list.mockResolvedValue({
        data: {
          messages: [{ id: '1', threadId: 't1' }],
        },
      });

      const messages = await gmailService.listMessages();

      expect(messages).toHaveLength(1);
      expect(mockGmail.users.messages.list).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('debe enviar mensaje usando Gmail API', async () => {
      mockGmail.users.messages.send.mockResolvedValue({
        data: { id: 'sent-123' },
      });

      const result = await gmailService.sendMessage({
        to: 'test@gmail.com',
        subject: 'Test',
        body: 'Body',
      });

      expect(result.id).toBe('sent-123');
    });
  });
});
```

**Cobertura objetivo**: 80%

---

#### 2.3 Gemini AI Service Tests

**Crear**: `packages/backend/src/services/__tests__/gemini.service.test.ts`

```typescript
import { GeminiService } from '../gemini.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

jest.mock('@google/generative-ai');

describe('GeminiService', () => {
  let geminiService: GeminiService;
  let mockModel: any;

  beforeEach(() => {
    mockModel = {
      generateContent: jest.fn(),
    };
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: () => mockModel,
    }));
    geminiService = new GeminiService();
  });

  describe('classifyEmail', () => {
    it('debe clasificar email como importante', async () => {
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ category: 'important', confidence: 0.95 }),
        },
      });

      const result = await geminiService.classifyEmail({
        subject: 'Urgent: Meeting tomorrow',
        body: 'This is important',
      });

      expect(result.category).toBe('important');
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('generateSmartReply', () => {
    it('debe generar respuesta inteligente', async () => {
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: () => 'Thank you for your email. I will review and respond shortly.',
        },
      });

      const reply = await geminiService.generateSmartReply({
        subject: 'Question about project',
        body: 'Can you help me?',
      });

      expect(reply).toContain('Thank you');
    });
  });
});
```

**Cobertura objetivo**: 75%

---

#### 2.4 OAuth Service Tests

**Crear**: `packages/backend/src/services/__tests__/oauth.service.test.ts`

```typescript
import { OAuthService } from '../oauth.service';

describe('OAuthService', () => {
  let oauthService: OAuthService;

  beforeEach(() => {
    oauthService = new OAuthService();
  });

  describe('getAuthorizationUrl', () => {
    it('debe generar URL de autorización para Gmail', () => {
      const url = oauthService.getAuthorizationUrl('gmail');

      expect(url).toContain('accounts.google.com');
      expect(url).toContain('scope=https://www.googleapis.com/auth/gmail');
    });

    it('debe generar URL de autorización para Outlook', () => {
      const url = oauthService.getAuthorizationUrl('outlook');

      expect(url).toContain('login.microsoftonline.com');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('debe intercambiar código por token de acceso', async () => {
      // Mock HTTP request
      const result = await oauthService.exchangeCodeForToken('code123', 'gmail');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });
  });
});
```

---

### Prioridad 3: Tests E2E con Playwright

#### 3.1 Instalar Playwright

```bash
# En el root del proyecto
npm install -D @playwright/test
npx playwright install
```

#### 3.2 Configuración de Playwright

**Crear**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev --workspace=@gemini-mail/frontend',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### 3.3 Tests E2E Críticos

**Crear**: `e2e/auth-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('debe permitir registro de nuevo usuario', async ({ page }) => {
    await page.goto('/register');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Bienvenido')).toBeVisible();
  });

  test('debe permitir login con credenciales válidas', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('debe mostrar error con credenciales inválidas', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Credenciales inválidas');
  });
});
```

**Crear**: `e2e/email-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Email Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada test
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('debe mostrar lista de emails', async ({ page }) => {
    await page.goto('/inbox');

    await expect(page.locator('.email-list')).toBeVisible();
    await expect(page.locator('.email-item')).toHaveCount.greaterThan(0);
  });

  test('debe poder componer y enviar email', async ({ page }) => {
    await page.click('button:has-text("Nuevo Email")');

    await page.fill('[name="to"]', 'recipient@example.com');
    await page.fill('[name="subject"]', 'Test Email');
    await page.fill('[name="body"]', 'This is a test email body');

    await page.click('button:has-text("Enviar")');

    await expect(page.locator('.success-message')).toContainText('Email enviado');
  });

  test('debe poder buscar emails', async ({ page }) => {
    await page.goto('/inbox');

    await page.fill('[name="search"]', 'important');
    await page.press('[name="search"]', 'Enter');

    await expect(page.locator('.email-item')).toHaveCount.greaterThan(0);
    // Verificar que los resultados contengan la búsqueda
  });

  test('debe poder usar clasificación AI', async ({ page }) => {
    await page.goto('/inbox');

    const firstEmail = page.locator('.email-item').first();
    await firstEmail.click();

    await expect(page.locator('.ai-classification')).toBeVisible();
    await expect(page.locator('.ai-classification')).toContainText(/important|spam|newsletter|personal/i);
  });
});
```

#### 3.4 Agregar E2E a CI/CD

```yaml
  test-e2e:
    name: E2E Tests
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

### Prioridad 4: Tests de Performance

#### 4.1 Load Testing con Artillery

**Instalar**:
```bash
npm install -D artillery
```

**Crear**: `performance/load-test.yml`

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"

scenarios:
  - name: "Authentication Flow"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "SecurePass123!"
          capture:
            - json: "$.token"
              as: "authToken"

      - get:
          url: "/api/emails"
          headers:
            Authorization: "Bearer {{ authToken }}"

  - name: "Email Listing"
    flow:
      - get:
          url: "/api/emails"
          headers:
            Authorization: "Bearer {{ authToken }}"

assertions:
  - http.response_time.p95: 500  # 95% de requests < 500ms
  - http.response_time.p99: 1000 # 99% de requests < 1s
  - http.codes.200: 95           # 95% success rate
```

#### 4.2 Script para Performance Testing

**Agregar a `package.json` (root)**:
```json
{
  "scripts": {
    "perf:test": "artillery run performance/load-test.yml",
    "perf:report": "artillery run --output report.json performance/load-test.yml && artillery report report.json"
  }
}
```

---

### Prioridad 5: Testing para Desktop (Electron)

#### 5.1 Configurar Spectron/Playwright para Electron

**Instalar**:
```bash
cd packages/desktop
npm install -D @playwright/test playwright-electron
```

**Crear**: `packages/desktop/tests/app.spec.ts`

```typescript
import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Electron App', () => {
  test('debe iniciar la aplicación', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await expect(window).toHaveTitle(/Gemini Mail/);

    await app.close();
  });

  test('debe mostrar ventana de login', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await expect(window.locator('input[name="email"]')).toBeVisible();
    await expect(window.locator('input[name="password"]')).toBeVisible();

    await app.close();
  });
});
```

---

### Prioridad 6: Testing para Mobile (React Native)

#### 6.1 Configurar Detox para React Native

**Instalar**:
```bash
cd packages/mobile
npm install -D detox detox-cli
```

**Crear**: `packages/mobile/.detoxrc.js`

```javascript
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupTimeout: 120000
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/GeminiMail.app',
      build: 'xcodebuild -workspace ios/GeminiMail.xcworkspace -scheme GeminiMail -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [8081]
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_5_API_31'
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    }
  }
};
```

**Crear**: `packages/mobile/e2e/login.test.js`

```javascript
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('debe mostrar pantalla de login', async () => {
    await expect(element(by.id('emailInput'))).toBeVisible();
    await expect(element(by.id('passwordInput'))).toBeVisible();
  });

  it('debe permitir login con credenciales válidas', async () => {
    await element(by.id('emailInput')).typeText('test@example.com');
    await element(by.id('passwordInput')).typeText('SecurePass123!');
    await element(by.id('loginButton')).tap();

    await expect(element(by.id('dashboardScreen'))).toBeVisible();
  });
});
```

---

## 📈 Métricas de Éxito

### Objetivos de Cobertura (3 meses)

| Métrica | Actual | Objetivo Mes 1 | Objetivo Mes 2 | Objetivo Mes 3 |
|---------|--------|----------------|----------------|----------------|
| **Backend Lines** | ~20% | 50% | 70% | 85% |
| **Frontend Lines** | ~10% | 40% | 60% | 75% |
| **E2E Coverage** | 0% | 20% | 50% | 80% |
| **Test Execution Time** | ~5s | <10s | <15s | <20s |
| **Flaky Test Rate** | N/A | <5% | <3% | <1% |

### KPIs de Calidad

1. **Code Coverage**: Mínimo 70% en todos los packages
2. **Test Success Rate**: Mínimo 95% en CI/CD
3. **Performance**:
   - P95 response time < 500ms
   - P99 response time < 1s
4. **Reliability**: Cero tests flaky en suite principal

---

## 🚀 Roadmap de Implementación

### Semana 1-2: Fundamentos
- [ ] Configurar thresholds en Jest y Vitest
- [ ] Mejorar CI/CD con quality gates
- [ ] Configurar reportes de cobertura mejorados
- [ ] Instalar y configurar Playwright

### Semana 3-4: Backend Critical
- [ ] Tests para email.service.ts (85% coverage)
- [ ] Tests para gmail-api.service.ts (80% coverage)
- [ ] Tests para oauth.service.ts (80% coverage)
- [ ] Tests para gemini.service.ts (75% coverage)

### Semana 5-6: Backend Complete
- [ ] Tests para unified-email.service.ts
- [ ] Tests para smart-search.service.ts
- [ ] Tests para microsoft-graph.service.ts
- [ ] Tests para ai-classifier.service.ts

### Semana 7-8: Routes & Integration
- [ ] Tests para email.routes.ts
- [ ] Tests para ai.routes.ts
- [ ] Tests para gemini.routes.ts
- [ ] Tests para oauth.routes.ts
- [ ] Tests para encryption.routes.ts

### Semana 9-10: Frontend Core
- [ ] Tests para componentes críticos (EmailList, Composer, etc.)
- [ ] Tests para páginas principales (Dashboard, Settings, etc.)
- [ ] Tests para stores/contexts
- [ ] Tests para hooks personalizados

### Semana 11-12: E2E Testing
- [ ] 10+ E2E tests críticos con Playwright
- [ ] Tests de flujos completos (auth, email, search)
- [ ] Tests de integración frontend-backend
- [ ] Performance testing con Artillery

### Semana 13-14: Desktop & Mobile
- [ ] Configurar Playwright Electron
- [ ] 5+ tests para desktop
- [ ] Configurar Detox para React Native
- [ ] 5+ tests para mobile

### Semana 15-16: Optimización
- [ ] Refactorizar tests lentos
- [ ] Eliminar tests flaky
- [ ] Optimizar CI/CD pipeline
- [ ] Documentación completa

---

## 🛠️ Herramientas Recomendadas

### Testing Libraries
- ✅ **Jest**: Backend unit/integration tests
- ✅ **Vitest**: Frontend unit tests (más rápido que Jest)
- ✅ **React Testing Library**: Component tests
- ✅ **Supertest**: API endpoint tests
- 🆕 **Playwright**: E2E tests (multi-browser)
- 🆕 **Artillery**: Performance/load testing
- 🆕 **Playwright Electron**: Desktop app testing
- 🆕 **Detox**: React Native testing

### Code Quality
- 🆕 **SonarQube**: Análisis estático de código
- 🆕 **ESLint**: Linting (ya instalado)
- 🆕 **Prettier**: Formatting (recomendado)
- 🆕 **Husky**: Git hooks para pre-commit tests
- 🆕 **lint-staged**: Run linters on staged files

### CI/CD
- ✅ **GitHub Actions**: CI/CD actual
- ✅ **Codecov**: Coverage reporting
- 🆕 **Dependabot**: Dependency updates
- 🆕 **Renovate**: Alternative to Dependabot

---

## 💡 Mejores Prácticas

### General
1. **Test Naming**: Usar patrón "should [expected behavior] when [condition]"
2. **AAA Pattern**: Arrange, Act, Assert
3. **One Assertion**: Un concepto por test
4. **Mocking**: Solo mock dependencias externas, no lógica de negocio
5. **Test Data**: Usar factories/builders, no datos hardcoded

### Performance
1. **Parallel Execution**: Correr tests en paralelo
2. **Cleanup**: Limpiar estado después de cada test
3. **Avoid Sleeps**: Usar waitFor/waitUntil en vez de sleep/timeout
4. **Database**: Usar transacciones y rollback para tests de DB

### Mantenimiento
1. **DRY**: Extraer setup común a beforeEach/beforeAll
2. **Helpers**: Crear test helpers/utilities reutilizables
3. **Page Objects**: Para E2E, usar Page Object Model
4. **Documentation**: Documentar tests complejos

---

## 📚 Referencias

- [Jest Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Testing Library Guiding Principles](https://testing-library.com/docs/guiding-principles)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [React Testing Patterns](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## ✅ Checklist de Implementación

### Configuración Inicial
- [ ] Agregar thresholds a jest.config.js
- [ ] Agregar thresholds a vitest.config.ts
- [ ] Mejorar .github/workflows/build-test.yml
- [ ] Instalar Playwright
- [ ] Configurar Artillery
- [ ] Agregar scripts a package.json

### Backend Tests
- [ ] email.service.test.ts
- [ ] gmail-api.service.test.ts
- [ ] oauth.service.test.ts
- [ ] gemini.service.test.ts
- [ ] unified-email.service.test.ts
- [ ] smart-search.service.test.ts
- [ ] microsoft-graph.service.test.ts
- [ ] ai-classifier.service.test.ts
- [ ] email.routes.test.ts
- [ ] ai.routes.test.ts
- [ ] gemini.routes.test.ts
- [ ] oauth.routes.test.ts
- [ ] encryption.routes.test.ts

### Frontend Tests
- [ ] EmailList.test.tsx
- [ ] EmailComposer.test.tsx
- [ ] Dashboard.test.tsx
- [ ] Settings.test.tsx
- [ ] useAuth.test.ts (hook)
- [ ] useEmails.test.ts (hook)
- [ ] email.store.test.ts

### E2E Tests
- [ ] auth-flow.spec.ts
- [ ] email-flow.spec.ts
- [ ] search-flow.spec.ts
- [ ] settings-flow.spec.ts
- [ ] ai-features.spec.ts

### Platform Tests
- [ ] desktop/tests/app.spec.ts
- [ ] mobile/e2e/login.test.js
- [ ] mobile/e2e/email.test.js

### Performance Tests
- [ ] performance/load-test.yml
- [ ] performance/stress-test.yml

---

**Última actualización**: 2025-12-21
**Responsable**: Development Team
**Estado**: Pendiente de aprobación
