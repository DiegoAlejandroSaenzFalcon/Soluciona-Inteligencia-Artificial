# SOLUCIONA INTELIGENCIA ARTIFICIAL

Plataforma de automatización y atención con Inteligencia Artificial, organizada en variantes hermanas según el segmento de mercado.

Este repositorio privado agrupa los dos desarrollos activos y reserva el espacio para el tercero. El objetivo: poder reconstruir cualquiera de las variantes de forma exacta y profesional desde el código aquí versionado.

## Variantes

| Variante | Carpeta | Estado | Descripción |
|----------|---------|--------|-------------|
| **Comercial** | `soluciona-inteligencia-artificial-comercial/` | Activo | Bot de pedidos por WhatsApp para establecimientos comerciales (restaurantes, locales). Sistema multi-negocio: pedidos, menú, clientes, conversaciones, consumo IA, panel web, panel central. |
| **Empresarial** | `soluciona-inteligencia-artificial-empresarial/` | Activo | Motor de soporte TI automatizado: tickets con SLA, base de conocimiento, triage con IA, agentes de opencode, paquetes de confianza y política de seguridad. |
| **Residencial** | `soluciona-inteligencia-artificial-residencial/` | Sin desarrollar | Reservado. Se desarrollará a futuro. |

## Cómo reconstruir cada variante

Cada carpeta es autónoma y contiene su propio `README.md`, instrucciones de instalación, configuración de ejemplo y despliegue.

- Comercial: ver `soluciona-inteligencia-artificial-comercial/README.md`
- Empresarial: ver `soluciona-inteligencia-artificial-empresarial/README.md`

## Seguridad

- **No se versionan secretos**: ni API keys reales, ni sesiones de WhatsApp (`auth_info/`, `.wwebjs_auth/`), ni bases de datos con datos de clientes (`data/`), ni configuraciones reales (`config.json`, `.env`).
- Cada variante incluye plantillas de configuración (`config.example.json`, `.env.example`) para reproducir el entorno de forma segura.

## Estructura de despliegue

- **Comercial**: Node.js + SQLite (migración opcional a PostgreSQL), Docker / Docker Compose, panel web en puerto 3000 y panel central en 4000.
- **Empresarial**: documentación y scripts de automatización (PowerShell / bash), agentes de opencode, base de conocimiento en Markdown.