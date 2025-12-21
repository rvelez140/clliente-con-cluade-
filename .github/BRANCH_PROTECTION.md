# Configuración de Protección de Rama Principal

Este documento explica cómo configurar la protección de la rama `main` para asegurar que solo se merge código que pase las verificaciones de construcción de imágenes Docker.

## Flujo de Trabajo

### 1. **En Pull Requests (PRs)**
- El workflow `build-test.yml` se ejecuta automáticamente
- Verifica que ambas imágenes (backend y frontend) se construyen exitosamente
- **NO** publica las imágenes al registry
- Solo valida que el código puede construirse correctamente

### 2. **En la Rama Principal (main)**
- El workflow `deploy.yml` se ejecuta solo cuando se hace push a `main`
- Construye las imágenes Docker
- Las publica en GitHub Container Registry (ghcr.io)
- Despliega automáticamente al VPS

## Configurar Protección de Rama en GitHub

Para asegurar que solo código verificado llegue a `main`, sigue estos pasos:

### Paso 1: Ir a Configuración del Repositorio
1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Branches** (Ramas)

### Paso 2: Agregar Regla de Protección
1. Click en **Add rule** o **Add branch protection rule**
2. En "Branch name pattern" escribe: `main`

### Paso 3: Configurar Reglas Requeridas

Marca las siguientes opciones:

#### ✅ Require a pull request before merging
- Exige que los cambios pasen por un PR antes de llegar a `main`
- **Opcional**: "Require approvals" (requiere aprobación de revisores)

#### ✅ Require status checks to pass before merging
- Esta es la opción **MÁS IMPORTANTE**
- Click en el campo de búsqueda y selecciona:
  - `test-build (backend)` - Verifica construcción del backend
  - `test-build (frontend)` - Verifica construcción del frontend

**Nota**: Estas opciones solo aparecerán después de que el workflow se ejecute por primera vez.

#### ✅ Require branches to be up to date before merging
- Asegura que el branch está actualizado con `main` antes del merge

#### ✅ Do not allow bypassing the above settings
- Previene que incluso los administradores puedan saltarse estas reglas

### Paso 4: Guardar Cambios
1. Scroll hasta el final de la página
2. Click en **Create** o **Save changes**

## Flujo de Trabajo Completo

```
┌─────────────────────────────────────────────────────────┐
│  Desarrollador crea feature branch                      │
│  git checkout -b feature/nueva-funcionalidad            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  Desarrollador hace commit y push                       │
│  git push origin feature/nueva-funcionalidad            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  Se crea Pull Request a main                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  ⚙️  GitHub Actions ejecuta "build-test.yml"            │
│  • Construye imagen de backend                          │
│  • Construye imagen de frontend                         │
│  • NO publica imágenes                                  │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ├─────── ❌ Build falla
                  │         └─→ PR bloqueado, no se puede merge
                  │
                  └─────── ✅ Build exitoso
                            │
                            ▼
                  ┌─────────────────────────────────────┐
                  │ PR puede ser mergeado a main        │
                  └─────────┬───────────────────────────┘
                            │
                            ▼
                  ┌─────────────────────────────────────┐
                  │ Se hace merge a main                │
                  └─────────┬───────────────────────────┘
                            │
                            ▼
                  ┌─────────────────────────────────────┐
                  │ ⚙️  GitHub Actions ejecuta           │
                  │    "deploy.yml"                     │
                  │ • Construye imágenes                │
                  │ • Publica a ghcr.io                 │
                  │ • Despliega a VPS                   │
                  └─────────────────────────────────────┘
```

## Verificar que Funciona

### Prueba 1: Crear un PR de prueba
```bash
# Crear una rama de prueba
git checkout -b test/branch-protection

# Hacer un cambio menor
echo "# Test" >> TEST.md

# Commit y push
git add TEST.md
git commit -m "test: Verificar protección de rama"
git push origin test/branch-protection
```

### Prueba 2: Ver el workflow en acción
1. Crea un PR desde `test/branch-protection` a `main`
2. Ve a la pestaña **Actions** en GitHub
3. Deberías ver el workflow "Build Test" ejecutándose
4. En el PR, deberías ver los checks de estado

### Prueba 3: Verificar protección
- Si los builds pasan: El botón "Merge" estará habilitado ✅
- Si algún build falla: El botón "Merge" estará deshabilitado ❌

## Comandos Git Útiles

### Ver el estado de la rama actual
```bash
git status
```

### Crear una nueva rama desde main
```bash
git checkout main
git pull origin main
git checkout -b feature/mi-nueva-feature
```

### Actualizar tu rama con los cambios de main
```bash
git checkout feature/mi-nueva-feature
git fetch origin
git rebase origin/main
```

### Push de tu rama
```bash
git push origin feature/mi-nueva-feature
```

## Troubleshooting

### Los checks no aparecen en la configuración de protección
- **Solución**: Los checks solo aparecen después de que el workflow se ejecuta por primera vez
- Crea un PR de prueba primero, espera a que el workflow se ejecute
- Luego ve a Settings > Branches y configura la protección

### El workflow falla pero no sé por qué
- Ve a la pestaña **Actions** en GitHub
- Click en el workflow que falló
- Revisa los logs para ver el error específico

### Necesito hacer push directo a main (emergencia)
- Si configuraste "Do not allow bypassing", ni siquiera los administradores pueden hacerlo
- Esto es intencional para proteger la rama
- Considera desactivar temporalmente la regla en Settings > Branches si es absolutamente necesario

## Beneficios de Esta Configuración

✅ **Calidad del código**: Solo código que compila llega a producción
✅ **Prevención de errores**: Los errores de construcción se detectan antes del merge
✅ **Despliegue automático**: Cuando se merge a main, se despliega automáticamente
✅ **Trazabilidad**: Historial claro de qué cambios se desplegaron y cuándo
✅ **Seguridad**: La rama principal está protegida contra pushes directos

## Recursos Adicionales

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Docker Build Push Action](https://github.com/marketplace/actions/build-and-push-docker-images)
