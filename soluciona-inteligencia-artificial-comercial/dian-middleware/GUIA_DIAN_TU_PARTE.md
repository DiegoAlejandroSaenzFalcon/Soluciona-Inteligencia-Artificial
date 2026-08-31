# GUÍA DIAN — Tu parte (acciones humanas en el portal)

> Objetivo: conseguir las credenciales de desarrollo para que el `dian-middleware`
> pueda conectarse al ambiente de habilitación (Sandbox) de la DIAN.
> Tú haces la parte del portal; el código hace el resto.

---

## 0. Mentalidad clave (léelo una vez)

- **No necesitas RUT de empresa ni negocio formal.** Con tu cédula entras como
  *persona natural* solo al ambiente de **habilitación** (Sandbox).
- Ese ambiente **no factura de verdad, no genera impuestos y no te compromete
  jurídicamente**. Es un laboratorio para probar tu código.
- Lo único que sí te identifica es el **certificado digital** (firma). En Sandbox
  puedes usar el certificado de prueba `certs/firma.p12` que ya generaste.
- Cuando vendas el producto, **cada cliente** entra a *su* portal DIAN, registra
  *tu software*, y te pasa *su* `TestSetID`, *su* llave técnica y *su* certificado.
  El que responde ante la DIAN por los impuestos es tu cliente, no tú.

---

## 1. Prerrequisitos (antes de abrir el portal)

- [ ] Cédula colombiana (tu NIT como persona natural).
- [ ] Correo electrónico actualizado en el RUT (ahí llega el token de acceso).
- [ ] (Solo cuando vayas a producción) Certificado digital `.p12` emitido por
      entidad acreditada ONAC. **Para Sandbox NO lo necesitas: usa `firma.p12`.**

---

## 2. Entrar al portal de habilitación

1. Ve a `https://www.dian.gov.co`.
2. Menú **Temas de interés** → **Factura Electrónica** → **Habilitación**.
3. Click en **Ingreso al sistema de habilitación**.
4. Elige **Persona natural** (o **Usuario nuevo** si es tu primera vez).
5. Digita tu cédula (NIT) y los datos del representante (tú).
6. La DIAN envía un **token de un solo uso** a tu correo del RUT.
   - Revisa bandeja de entrada y **spam**.
   - Abre el enlace y entra al sistema.

> ⚠️ El token caduca rápido. Si se vence, vuelve a pedirlo.

---

## 3. Registrar tu "Software Propio"

1. En el menú lateral izquierdo → **Participantes** → **Facturador**.
2. Si apareces como facturador, bien. Si no, click en **Registrar**.
3. Busca **Configurar Modos de Operación**.
4. En el desplegable de modos elige: **Software Propio**.
5. Ponle un nombre identificable a tu software, ej. `Soluciona FE Engine`.
6. Inventa un **PIN de 5 dígitos**, ej. `12345`. **Anótalo** (se guarda en el
   `.env` como `DIAN_PIN_SOFTWARE`).
7. Click en **Agregar**.

---

## 4. Capturar tus llaves (lo más importante)

Aparece una fila con tu software. Al final hay un **engranaje / "Detalles de
aprobación"**. Click ahí. Copia y guarda en un lugar seguro (gestor de
contraseñas o bloc de notas cifrado):

| Dato | Dónde va en `.env` | Notas |
|------|--------------------|-------|
| `TestSetID` | se usa en el header SOAP | Código alfanumérico largo. Identifica tu software ante la DIAN. |
| URL Web Service (habilitación) | `DIAN_WSDL_URL` | El código ya trae la correcta (`vpfe-hab.dian.gov.co`). Verifica que coincida. |
| **Llave técnica** (Clave Técnica) | `DIAN_CODIGO_SOFTWARE` | ⚠️ **Se muestra UNA sola vez.** Cópiala completa. |
| PIN de 5 dígitos | `DIAN_PIN_SOFTWARE` | El que inventaste en el paso 3. |
| Identificador / código del software | `DIAN_CODIGO_SOFTWARE` | UUID del software registrado. |

> 🔴 Si no guardaste la llave técnica cuando se mostró, tendrás que regenerarla
> desde el engranaje del software (opción "Ver/regenerar llave técnica").

---

## 5. (Solo producción, cuando vendas) Lo que TU CLIENTE hará

Para ahorrarte confusiones, esto es lo que hará **cada cliente tuyo** cuando le
vendas el software — no lo haces tú:

1. El cliente entra a *su* portal DIAN con su RUT y su firma.
2. Registra **tu software** (tu nombre + PIN).
3. La DIAN le da *su* `TestSetID` y *su* llave técnica.
4. El cliente pega en tu CRM: `TestSetID`, llave técnica, su `.p12` y la clave
   de su certificado.

Tu código (multi-tenant) usa esos datos para firmar y enviar en su nombre.

---

## 6. Resumen de lo que debes entregar al código (`.env`)

Cuando termines el portal, completa estas variables en `dian-middleware/.env`:

```env
# Ambiente Sandbox (pruebas)
DIAN_AMBIENTE=habilitacion

DIAN_NIT=            # tu cédula (solo dígitos, sin DV)
DIAN_DV=             # dígito de verificación de tu NIT
DIAN_RAZON_SOCIAL="Tus Nombres y Apellidos"

# Credenciales del software (paso 4)
DIAN_CODIGO_SOFTWARE=   # UUID del software + llave técnica
DIAN_PIN_SOFTWARE=      # PIN de 5 dígitos

# Certificado (en Sandbox usa el de prueba)
DIAN_CERT_PATH=./certs/firma.p12
DIAN_CERT_PASS=test1234
```

El `TestSetID` lo toma el código automáticamente del header SOAP en habilitación.

---

## 7. Checklist "ya hice mi parte"

- [x] Entré al portal con mi cédula.
- [x] Registré el software en modo **Software Propio**.
- [x] Guardé `TestSetID` + llave técnica + PIN + URLs.
- [x] Completé `dian-middleware/.env` con esos datos.
- [ ] (Solo producción) Mi cliente subió su certificado `.p12` y sus llaves.

Cuando marques todo, avísame y probamos `runHabilitacion({ submit: true })`.