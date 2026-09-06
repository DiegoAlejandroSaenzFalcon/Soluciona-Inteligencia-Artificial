"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogs = exports.journalEntryLines = exports.journalEntries = exports.accounts = exports.payrollDetails = exports.payrollPeriods = exports.payrollEmployees = exports.creditNotes = exports.payments = exports.invoiceItems = exports.invoices = exports.customers = exports.purchaseReceiptItems = exports.purchaseReceipts = exports.purchaseOrderItems = exports.purchaseOrders = exports.suppliers = exports.stockMovements = exports.stock = exports.productVariants = exports.products = exports.categories = exports.configSecrets = exports.configVersions = exports.sessions = exports.userPermissions = exports.rolePermissions = exports.permissions = exports.users = exports.tenants = exports.configSectionEnum = exports.paymentMethodEnum = exports.movementTypeEnum = exports.purchaseOrderStatusEnum = exports.invoiceStatusEnum = exports.paymentStatusEnum = exports.orderTypeEnum = exports.orderStatusEnum = exports.roleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// ==================== ENUMS ====================
exports.roleEnum = (0, pg_core_1.pgEnum)('role', ['admin', 'operador', 'cocina', 'solo_lectura']);
exports.orderStatusEnum = (0, pg_core_1.pgEnum)('order_status', ['recibido', 'en_cocina', 'listo', 'entregado', 'cancelado']);
exports.orderTypeEnum = (0, pg_core_1.pgEnum)('order_type', ['domicilio', 'recoger']);
exports.paymentStatusEnum = (0, pg_core_1.pgEnum)('payment_status', ['pendiente', 'parcial', 'pagado', 'anulado']);
exports.invoiceStatusEnum = (0, pg_core_1.pgEnum)('invoice_status', ['borrador', 'emitida', 'anulada', 'rechazada_dian']);
exports.purchaseOrderStatusEnum = (0, pg_core_1.pgEnum)('purchase_order_status', ['borrador', 'enviada', 'parcial', 'recibida', 'cancelada']);
exports.movementTypeEnum = (0, pg_core_1.pgEnum)('movement_type', ['entrada', 'salida', 'ajuste_positivo', 'ajuste_negativo', 'traslado_entrada', 'traslado_salida']);
exports.paymentMethodEnum = (0, pg_core_1.pgEnum)('payment_method', ['efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata', 'pse', 'credito']);
exports.configSectionEnum = (0, pg_core_1.pgEnum)('config_section', ['negocio', 'menu', 'ia', 'domicilios', 'pagos', 'nomina', 'bi', 'integraciones', 'notificaciones']);
// ==================== TENANTS ====================
exports.tenants = (0, pg_core_1.pgTable)('tenants', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    nombre: (0, pg_core_1.varchar)('nombre', { length: 150 }).notNull(),
    segmento: (0, pg_core_1.varchar)('segmento', { length: 20 }).notNull().default('comidas'), // comidas|salud|retail|belleza|profesionales|educacion|automotriz|inmobiliaria|turismo|logistica|mantenimiento|financieros
    ciiu: (0, pg_core_1.varchar)('ciiu', { length: 10 }),
    activo: (0, pg_core_1.boolean)('activo').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    nombreIdx: (0, pg_core_1.index)('tenants_nombre_idx').on(t.nombre),
    segmentoIdx: (0, pg_core_1.index)('tenants_segmento_idx').on(t.segmento),
}));
// ==================== USERS & RBAC ====================
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull(),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }).notNull(),
    nombre: (0, pg_core_1.varchar)('nombre', { length: 150 }).notNull(),
    telefono: (0, pg_core_1.varchar)('telefono', { length: 20 }),
    role: (0, exports.roleEnum)('role').notNull().default('operador'),
    activo: (0, pg_core_1.boolean)('activo').notNull().default(true),
    twoFactorEnabled: (0, pg_core_1.boolean)('two_factor_enabled').notNull().default(false),
    twoFactorSecret: (0, pg_core_1.varchar)('two_factor_secret', { length: 255 }),
    lastLoginAt: (0, pg_core_1.timestamp)('last_login_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    tenantEmailIdx: (0, pg_core_1.uniqueIndex)('users_tenant_email_unique').on(t.tenantId, t.email),
    tenantRoleIdx: (0, pg_core_1.index)('users_tenant_role_idx').on(t.tenantId, t.role),
}));
exports.permissions = (0, pg_core_1.pgTable)('permissions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    code: (0, pg_core_1.varchar)('code', { length: 100 }).notNull().unique(), // ej: 'orders:create', 'config:write', 'reports:read'
    description: (0, pg_core_1.text)('description'),
    category: (0, pg_core_1.varchar)('category', { length: 50 }).notNull(), // orders, config, reports, inventory, accounting, users
});
exports.rolePermissions = (0, pg_core_1.pgTable)('role_permissions', {
    role: (0, exports.roleEnum)('role').notNull(),
    permissionId: (0, pg_core_1.integer)('permission_id').notNull().references(() => exports.permissions.id, { onDelete: 'cascade' }),
}, (t) => ({
    pk: (0, pg_core_1.primaryKey)({ columns: [t.role, t.permissionId] }),
}));
exports.userPermissions = (0, pg_core_1.pgTable)('user_permissions', {
    userId: (0, pg_core_1.integer)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    permissionId: (0, pg_core_1.integer)('permission_id').notNull().references(() => exports.permissions.id, { onDelete: 'cascade' }),
    granted: (0, pg_core_1.boolean)('granted').notNull().default(true), // true = grant, false = revoke
}, (t) => ({
    pk: (0, pg_core_1.primaryKey)({ columns: [t.userId, t.permissionId] }),
}));
exports.sessions = (0, pg_core_1.pgTable)('sessions', {
    id: (0, pg_core_1.varchar)('id', { length: 64 }).primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    ip: (0, pg_core_1.varchar)('ip', { length: 45 }),
    userAgent: (0, pg_core_1.text)('user_agent'),
    expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (t) => ({
    userIdIdx: (0, pg_core_1.index)('sessions_user_id_idx').on(t.userId),
    expiresAtIdx: (0, pg_core_1.index)('sessions_expires_at_idx').on(t.expiresAt),
}));
// ==================== CONFIG VERSIONING ====================
exports.configVersions = (0, pg_core_1.pgTable)('config_versions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    section: (0, exports.configSectionEnum)('section').notNull(),
    payload: (0, pg_core_1.jsonb)('payload').notNull(),
    changedBy: (0, pg_core_1.integer)('changed_by').notNull().references(() => exports.users.id),
    ip: (0, pg_core_1.varchar)('ip', { length: 45 }),
    userAgent: (0, pg_core_1.text)('user_agent'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (t) => ({
    tenantSectionIdx: (0, pg_core_1.index)('config_versions_tenant_section_idx').on(t.tenantId, t.section),
    createdAtIdx: (0, pg_core_1.index)('config_versions_created_at_idx').on(t.createdAt),
}));
exports.configSecrets = (0, pg_core_1.pgTable)('config_secrets', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    key: (0, pg_core_1.varchar)('key', { length: 100 }).notNull(),
    valueEncrypted: (0, pg_core_1.text)('value_encrypted').notNull(), // AES-256-GCM encrypted
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    tenantKeyIdx: (0, pg_core_1.uniqueIndex)('config_secrets_tenant_key_unique').on(t.tenantId, t.key),
}));
// ==================== PRODUCTS & INVENTORY ====================
exports.categories = (0, pg_core_1.pgTable)('categories', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    nombre: (0, pg_core_1.varchar)('nombre', { length: 100 }).notNull(),
    descripcion: (0, pg_core_1.text)('descripcion'),
    orden: (0, pg_core_1.integer)('orden').notNull().default(0),
    activo: (0, pg_core_1.boolean)('activo').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (t) => ({
    tenantNombreIdx: (0, pg_core_1.uniqueIndex)('categories_tenant_nombre_unique').on(t.tenantId, t.nombre),
}));
exports.products = (0, pg_core_1.pgTable)('products', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    categoryId: (0, pg_core_1.integer)('category_id').references(() => exports.categories.id, { onDelete: 'set null' }),
    codigo: (0, pg_core_1.varchar)('codigo', { length: 50 }), // SKU interno
    codigoBarras: (0, pg_core_1.varchar)('codigo_barras', { length: 100 }),
    nombre: (0, pg_core_1.varchar)('nombre', { length: 200 }).notNull(),
    descripcion: (0, pg_core_1.text)('descripcion'),
    ingredientes: (0, pg_core_1.text)('ingredientes'),
    precio: (0, pg_core_1.numeric)('precio', { precision: 14, scale: 2 }).notNull(),
    costo: (0, pg_core_1.numeric)('costo', { precision: 14, scale: 2 }), // para margen
    unidadMedida: (0, pg_core_1.varchar)('unidad_medida', { length: 20 }).notNull().default('unidad'), // unidad, kg, lt, gr, ml
    manejaStock: (0, pg_core_1.boolean)('maneja_stock').notNull().default(true),
    stockMinimo: (0, pg_core_1.numeric)('stock_minimo', { precision: 10, scale: 2 }).default('0'),
    stockMaximo: (0, pg_core_1.numeric)('stock_maximo', { precision: 10, scale: 2 }),
    ubicacion: (0, pg_core_1.varchar)('ubicacion', { length: 100 }), // estante/bodega
    imagenUrl: (0, pg_core_1.varchar)('imagen_url', { length: 500 }),
    aliases: (0, pg_core_1.jsonb)('aliases').default([]).notNull(), // ["perro", "hotdog"]
    impuestos: (0, pg_core_1.jsonb)('impuestos').default([]).notNull(), // [{"codigo":"01","porcentaje":19}]
    activo: (0, pg_core_1.boolean)('activo').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    tenantCodigoIdx: (0, pg_core_1.uniqueIndex)('products_tenant_codigo_unique').on(t.tenantId, t.codigo),
    tenantNombreIdx: (0, pg_core_1.index)('products_tenant_nombre_idx').on(t.tenantId, t.nombre),
    tenantActivoIdx: (0, pg_core_1.index)('products_tenant_activo_idx').on(t.tenantId, t.activo),
}));
exports.productVariants = (0, pg_core_1.pgTable)('product_variants', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    productId: (0, pg_core_1.integer)('product_id').notNull().references(() => exports.products.id, { onDelete: 'cascade' }),
    nombre: (0, pg_core_1.varchar)('nombre', { length: 100 }).notNull(), // ej: "Grande", "Sin azúcar"
    sku: (0, pg_core_1.varchar)('sku', { length: 50 }),
    precioAdicional: (0, pg_core_1.numeric)('precio_adicional', { precision: 14, scale: 2 }).notNull().default('0'),
    stock: (0, pg_core_1.numeric)('stock', { precision: 10, scale: 2 }).notNull().default('0'),
    activo: (0, pg_core_1.boolean)('activo').notNull().default(true),
}, (t) => ({
    productSkuIdx: (0, pg_core_1.uniqueIndex)('variants_product_sku_unique').on(t.productId, t.sku),
}));
exports.stock = (0, pg_core_1.pgTable)('stock', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.integer)('product_id').notNull().references(() => exports.products.id, { onDelete: 'cascade' }),
    variantId: (0, pg_core_1.integer)('variant_id').references(() => exports.productVariants.id, { onDelete: 'set null' }),
    bodega: (0, pg_core_1.varchar)('bodega', { length: 50 }).notNull().default('principal'),
    cantidad: (0, pg_core_1.numeric)('cantidad', { precision: 12, scale: 2 }).notNull().default('0'),
    reservado: (0, pg_core_1.numeric)('reservado', { precision: 12, scale: 2 }).notNull().default('0'), // en OC o pedidos pendientes
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    tenantProductBodegaIdx: (0, pg_core_1.uniqueIndex)('stock_tenant_product_bodega_unique').on(t.tenantId, t.productId, t.variantId, t.bodega),
    tenantIdx: (0, pg_core_1.index)('stock_tenant_idx').on(t.tenantId),
}));
exports.stockMovements = (0, pg_core_1.pgTable)('stock_movements', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.integer)('product_id').notNull().references(() => exports.products.id, { onDelete: 'cascade' }),
    variantId: (0, pg_core_1.integer)('variant_id').references(() => exports.productVariants.id, { onDelete: 'set null' }),
    bodega: (0, pg_core_1.varchar)('bodega', { length: 50 }).notNull().default('principal'),
    tipo: (0, exports.movementTypeEnum)('tipo').notNull(),
    cantidad: (0, pg_core_1.numeric)('cantidad', { precision: 12, scale: 2 }).notNull(),
    costoUnitario: (0, pg_core_1.numeric)('costo_unitario', { precision: 14, scale: 2 }), // para valoración inventario
    referenciaTipo: (0, pg_core_1.varchar)('referencia_tipo', { length: 50 }), // 'purchase_order', 'sale', 'adjustment', 'transfer'
    referenciaId: (0, pg_core_1.integer)('referencia_id'), // ID de la OC, venta, ajuste
    observacion: (0, pg_core_1.text)('observacion'),
    usuarioId: (0, pg_core_1.integer)('usuario_id').references(() => exports.users.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (t) => ({
    tenantCreatedIdx: (0, pg_core_1.index)('stock_movements_tenant_created_idx').on(t.tenantId, t.createdAt),
    referenciaIdx: (0, pg_core_1.index)('stock_movements_ref_idx').on(t.referenciaTipo, t.referenciaId),
}));
// ==================== SUPPLIERS & PURCHASES ====================
exports.suppliers = (0, pg_core_1.pgTable)('suppliers', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    tipoIdentificacion: (0, pg_core_1.varchar)('tipo_identificacion', { length: 10 }).notNull().default('NIT'), // NIT, CC, CE, PP
    identificacion: (0, pg_core_1.varchar)('identificacion', { length: 30 }).notNull(),
    dv: (0, pg_core_1.varchar)('dv', { length: 1 }),
    nombre: (0, pg_core_1.varchar)('nombre', { length: 200 }).notNull(),
    nombreComercial: (0, pg_core_1.varchar)('nombre_comercial', { length: 200 }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    telefono: (0, pg_core_1.varchar)('telefono', { length: 20 }),
    direccion: (0, pg_core_1.text)('direccion'),
    ciudad: (0, pg_core_1.varchar)('ciudad', { length: 100 }),
    pais: (0, pg_core_1.varchar)('pais', { length: 50 }).notNull().default('CO'),
    regimen: (0, pg_core_1.varchar)('regimen', { length: 20 }).notNull().default('común'), // común, simplificado
    responsableIva: (0, pg_core_1.boolean)('responsable_iva').notNull().default(true),
    retencionFuente: (0, pg_core_1.numeric)('retencion_fuente', { precision: 5, scale: 2 }).default('0'),
    retencionIva: (0, pg_core_1.numeric)('retencion_iva', { precision: 5, scale: 2 }).default('0'),
    retencionIca: (0, pg_core_1.numeric)('retencion_ica', { precision: 5, scale: 2 }).default('0'),
    diasCredito: (0, pg_core_1.integer)('dias_credito').notNull().default(0),
    cupoCredito: (0, pg_core_1.numeric)('cupo_credito', { precision: 14, scale: 2 }).default('0'),
    banco: (0, pg_core_1.varchar)('banco', { length: 50 }),
    tipoCuenta: (0, pg_core_1.varchar)('tipo_cuenta', { length: 20 }), // ahorros, corriente
    numeroCuenta: (0, pg_core_1.varchar)('numero_cuenta', { length: 30 }),
    activo: (0, pg_core_1.boolean)('activo').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    tenantIdentificacionIdx: (0, pg_core_1.uniqueIndex)('suppliers_tenant_identificacion_unique').on(t.tenantId, t.identificacion),
    tenantNombreIdx: (0, pg_core_1.index)('suppliers_tenant_nombre_idx').on(t.tenantId, t.nombre),
}));
exports.purchaseOrders = (0, pg_core_1.pgTable)('purchase_orders', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    supplierId: (0, pg_core_1.integer)('supplier_id').notNull().references(() => exports.suppliers.id, { onDelete: 'restrict' }),
    numero: (0, pg_core_1.varchar)('numero', { length: 30 }).notNull(),
    estado: (0, exports.purchaseOrderStatusEnum)('estado').notNull().default('borrador'),
    fecha: (0, pg_core_1.timestamp)('fecha').notNull().defaultNow(),
    fechaEntregaEsperada: (0, pg_core_1.timestamp)('fecha_entrega_esperada'),
    subtotal: (0, pg_core_1.numeric)('subtotal', { precision: 14, scale: 2 }).notNull().default('0'),
    descuento: (0, pg_core_1.numeric)('descuento', { precision: 14, scale: 2 }).notNull().default('0'),
    impuestos: (0, pg_core_1.numeric)('impuestos', { precision: 14, scale: 2 }).notNull().default('0'),
    total: (0, pg_core_1.numeric)('total', { precision: 14, scale: 2 }).notNull().default('0'),
    observacion: (0, pg_core_1.text)('observacion'),
    creadoPor: (0, pg_core_1.integer)('creado_por').references(() => exports.users.id, { onDelete: 'set null' }),
    aprobadoPor: (0, pg_core_1.integer)('aprobado_por').references(() => exports.users.id, { onDelete: 'set null' }),
    fechaAprobacion: (0, pg_core_1.timestamp)('fecha_aprobacion'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    tenantNumeroIdx: (0, pg_core_1.uniqueIndex)('purchase_orders_tenant_numero_unique').on(t.tenantId, t.numero),
    tenantEstadoIdx: (0, pg_core_1.index)('purchase_orders_tenant_estado_idx').on(t.tenantId, t.estado),
    supplierIdx: (0, pg_core_1.index)('purchase_orders_supplier_idx').on(t.supplierId),
}));
exports.purchaseOrderItems = (0, pg_core_1.pgTable)('purchase_order_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    purchaseOrderId: (0, pg_core_1.integer)('purchase_order_id').notNull().references(() => exports.purchaseOrders.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.integer)('product_id').references(() => exports.products.id, { onDelete: 'set null' }),
    variantId: (0, pg_core_1.integer)('variant_id').references(() => exports.productVariants.id, { onDelete: 'set null' }),
    descripcion: (0, pg_core_1.varchar)('descripcion', { length: 200 }).notNull(),
    cantidad: (0, pg_core_1.numeric)('cantidad', { precision: 10, scale: 2 }).notNull(),
    cantidadRecibida: (0, pg_core_1.numeric)('cantidad_recibida', { precision: 10, scale: 2 }).notNull().default('0'),
    precioUnitario: (0, pg_core_1.numeric)('precio_unitario', { precision: 14, scale: 2 }).notNull(),
    descuento: (0, pg_core_1.numeric)('descuento', { precision: 14, scale: 2 }).notNull().default('0'),
    impuestoPorcentaje: (0, pg_core_1.numeric)('impuesto_porcentaje', { precision: 5, scale: 2 }).notNull().default('19'),
    total: (0, pg_core_1.numeric)('total', { precision: 14, scale: 2 }).notNull(),
}, (t) => ({
    poIdx: (0, pg_core_1.index)('po_items_po_idx').on(t.purchaseOrderId),
}));
exports.purchaseReceipts = (0, pg_core_1.pgTable)('purchase_receipts', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    purchaseOrderId: (0, pg_core_1.integer)('purchase_order_id').notNull().references(() => exports.purchaseOrders.id, { onDelete: 'restrict' }),
    numero: (0, pg_core_1.varchar)('numero', { length: 30 }).notNull(),
    fecha: (0, pg_core_1.timestamp)('fecha').notNull().defaultNow(),
    observacion: (0, pg_core_1.text)('observacion'),
    recibidoPor: (0, pg_core_1.integer)('recibido_por').references(() => exports.users.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (t) => ({
    tenantNumeroIdx: (0, pg_core_1.uniqueIndex)('purchase_receipts_tenant_numero_unique').on(t.tenantId, t.numero),
    poIdx: (0, pg_core_1.index)('purchase_receipts_po_idx').on(t.purchaseOrderId),
}));
exports.purchaseReceiptItems = (0, pg_core_1.pgTable)('purchase_receipt_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    purchaseReceiptId: (0, pg_core_1.integer)('purchase_receipt_id').notNull().references(() => exports.purchaseReceipts.id, { onDelete: 'cascade' }),
    poItemId: (0, pg_core_1.integer)('po_item_id').references(() => exports.purchaseOrderItems.id, { onDelete: 'set null' }),
    productId: (0, pg_core_1.integer)('product_id').notNull().references(() => exports.products.id, { onDelete: 'restrict' }),
    variantId: (0, pg_core_1.integer)('variant_id').references(() => exports.productVariants.id, { onDelete: 'set null' }),
    cantidad: (0, pg_core_1.numeric)('cantidad', { precision: 10, scale: 2 }).notNull(),
    precioUnitario: (0, pg_core_1.numeric)('precio_unitario', { precision: 14, scale: 2 }).notNull(),
    lote: (0, pg_core_1.varchar)('lote', { length: 50 }),
    fechaVencimiento: (0, pg_core_1.timestamp)('fecha_vencimiento'),
    ubicacion: (0, pg_core_1.varchar)('ubicacion', { length: 100 }),
}, (t) => ({
    prIdx: (0, pg_core_1.index)('pr_items_pr_idx').on(t.purchaseReceiptId),
}));
// ==================== ACCOUNTS RECEIVABLE / PAYABLE ====================
exports.customers = (0, pg_core_1.pgTable)('customers', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    tipoIdentificacion: (0, pg_core_1.varchar)('tipo_identificacion', { length: 10 }).notNull().default('CC'),
    identificacion: (0, pg_core_1.varchar)('identificacion', { length: 30 }).notNull(),
    dv: (0, pg_core_1.varchar)('dv', { length: 1 }),
    nombre: (0, pg_core_1.varchar)('nombre', { length: 200 }).notNull(),
    nombreComercial: (0, pg_core_1.varchar)('nombre_comercial', { length: 200 }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    telefono: (0, pg_core_1.varchar)('telefono', { length: 20 }),
    direccion: (0, pg_core_1.text)('direccion'),
    ciudad: (0, pg_core_1.varchar)('ciudad', { length: 100 }),
    regimen: (0, pg_core_1.varchar)('regimen', { length: 20 }).notNull().default('común'),
    responsableIva: (0, pg_core_1.boolean)('responsable_iva').notNull().default(true),
    cupoCredito: (0, pg_core_1.numeric)('cupo_credito', { precision: 14, scale: 2 }).default('0'),
    diasCredito: (0, pg_core_1.integer)('dias_credito').notNull().default(0),
    vendedorId: (0, pg_core_1.integer)('vendedor_id').references(() => exports.users.id, { onDelete: 'set null' }),
    activo: (0, pg_core_1.boolean)('activo').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    tenantIdentificacionIdx: (0, pg_core_1.uniqueIndex)('customers_tenant_identificacion_unique').on(t.tenantId, t.identificacion),
    tenantNombreIdx: (0, pg_core_1.index)('customers_tenant_nombre_idx').on(t.tenantId, t.nombre),
}));
exports.invoices = (0, pg_core_1.pgTable)('invoices', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    customerId: (0, pg_core_1.integer)('customer_id').references(() => exports.customers.id, { onDelete: 'set null' }),
    orderId: (0, pg_core_1.integer)('order_id'), // referencia a pedidos (tabla legacy)
    numero: (0, pg_core_1.varchar)('numero', { length: 30 }).notNull(),
    prefijo: (0, pg_core_1.varchar)('prefijo', { length: 10 }).notNull().default('SETP'),
    resolucion: (0, pg_core_1.varchar)('resolucion', { length: 30 }),
    fecha: (0, pg_core_1.timestamp)('fecha').notNull().defaultNow(),
    fechaVencimiento: (0, pg_core_1.timestamp)('fecha_vencimiento'),
    estado: (0, exports.invoiceStatusEnum)('estado').notNull().default('borrador'),
    subtotal: (0, pg_core_1.numeric)('subtotal', { precision: 14, scale: 2 }).notNull().default('0'),
    descuento: (0, pg_core_1.numeric)('descuento', { precision: 14, scale: 2 }).notNull().default('0'),
    impuestos: (0, pg_core_1.numeric)('impuestos', { precision: 14, scale: 2 }).notNull().default('0'),
    total: (0, pg_core_1.numeric)('total', { precision: 14, scale: 2 }).notNull().default('0'),
    saldoPendiente: (0, pg_core_1.numeric)('saldo_pendiente', { precision: 14, scale: 2 }).notNull().default('0'),
    cufe: (0, pg_core_1.varchar)('cufe', { length: 100 }),
    qrUrl: (0, pg_core_1.varchar)('qr_url', { length: 500 }),
    xmlUrl: (0, pg_core_1.varchar)('xml_url', { length: 500 }),
    pdfUrl: (0, pg_core_1.varchar)('pdf_url', { length: 500 }),
    observacion: (0, pg_core_1.text)('observacion'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    tenantNumeroIdx: (0, pg_core_1.uniqueIndex)('invoices_tenant_numero_unique').on(t.tenantId, t.prefijo, t.numero),
    tenantEstadoIdx: (0, pg_core_1.index)('invoices_tenant_estado_idx').on(t.tenantId, t.estado),
    customerIdx: (0, pg_core_1.index)('invoices_customer_idx').on(t.customerId),
    fechaIdx: (0, pg_core_1.index)('invoices_fecha_idx').on(t.fecha),
}));
exports.invoiceItems = (0, pg_core_1.pgTable)('invoice_items', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    invoiceId: (0, pg_core_1.integer)('invoice_id').notNull().references(() => exports.invoices.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.integer)('product_id').references(() => exports.products.id, { onDelete: 'set null' }),
    descripcion: (0, pg_core_1.varchar)('descripcion', { length: 200 }).notNull(),
    cantidad: (0, pg_core_1.numeric)('cantidad', { precision: 10, scale: 2 }).notNull(),
    precioUnitario: (0, pg_core_1.numeric)('precio_unitario', { precision: 14, scale: 2 }).notNull(),
    descuento: (0, pg_core_1.numeric)('descuento', { precision: 14, scale: 2 }).notNull().default('0'),
    impuestoCodigo: (0, pg_core_1.varchar)('impuesto_codigo', { length: 10 }).notNull().default('01'), // 01=IVA, 02=ICA, 03=Consumo
    impuestoPorcentaje: (0, pg_core_1.numeric)('impuesto_porcentaje', { precision: 5, scale: 2 }).notNull().default('19'),
    total: (0, pg_core_1.numeric)('total', { precision: 14, scale: 2 }).notNull(),
}, (t) => ({
    invoiceIdx: (0, pg_core_1.index)('invoice_items_invoice_idx').on(t.invoiceId),
}));
exports.payments = (0, pg_core_1.pgTable)('payments', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    invoiceId: (0, pg_core_1.integer)('invoice_id').references(() => exports.invoices.id, { onDelete: 'set null' }),
    purchaseOrderId: (0, pg_core_1.integer)('purchase_order_id').references(() => exports.purchaseOrders.id, { onDelete: 'set null' }),
    customerId: (0, pg_core_1.integer)('customer_id').references(() => exports.customers.id, { onDelete: 'set null' }),
    supplierId: (0, pg_core_1.integer)('supplier_id').references(() => exports.suppliers.id, { onDelete: 'set null' }),
    tipo: (0, pg_core_1.varchar)('tipo', { length: 20 }).notNull(), // 'cobro' | 'pago'
    metodo: (0, exports.paymentMethodEnum)('metodo').notNull(),
    referencia: (0, pg_core_1.varchar)('referencia', { length: 50 }), // número de transacción, cheque, etc.
    monto: (0, pg_core_1.numeric)('monto', { precision: 14, scale: 2 }).notNull(),
    fecha: (0, pg_core_1.timestamp)('fecha').notNull().defaultNow(),
    estado: (0, pg_core_1.varchar)('estado', { length: 20 }).notNull().default('aplicado'), // aplicado, anulado, pendiente
    observacion: (0, pg_core_1.text)('observacion'),
    creadoPor: (0, pg_core_1.integer)('creado_por').references(() => exports.users.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (t) => ({
    tenantTipoIdx: (0, pg_core_1.index)('payments_tenant_tipo_idx').on(t.tenantId, t.tipo),
    invoiceIdx: (0, pg_core_1.index)('payments_invoice_idx').on(t.invoiceId),
    customerIdx: (0, pg_core_1.index)('payments_customer_idx').on(t.customerId),
    supplierIdx: (0, pg_core_1.index)('payments_supplier_idx').on(t.supplierId),
    fechaIdx: (0, pg_core_1.index)('payments_fecha_idx').on(t.fecha),
}));
exports.creditNotes = (0, pg_core_1.pgTable)('credit_notes', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    invoiceId: (0, pg_core_1.integer)('invoice_id').notNull().references(() => exports.invoices.id, { onDelete: 'restrict' }),
    numero: (0, pg_core_1.varchar)('numero', { length: 30 }).notNull(),
    prefijo: (0, pg_core_1.varchar)('prefijo', { length: 10 }).notNull().default('NC'),
    fecha: (0, pg_core_1.timestamp)('fecha').notNull().defaultNow(),
    motivo: (0, pg_core_1.varchar)('motivo', { length: 100 }).notNull(), // devolución, descuento, error, otros
    subtotal: (0, pg_core_1.numeric)('subtotal', { precision: 14, scale: 2 }).notNull().default('0'),
    impuestos: (0, pg_core_1.numeric)('impuestos', { precision: 14, scale: 2 }).notNull().default('0'),
    total: (0, pg_core_1.numeric)('total', { precision: 14, scale: 2 }).notNull().default('0'),
    cude: (0, pg_core_1.varchar)('cude', { length: 100 }),
    estado: (0, pg_core_1.varchar)('estado', { length: 20 }).notNull().default('emitida'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (t) => ({
    tenantNumeroIdx: (0, pg_core_1.uniqueIndex)('credit_notes_tenant_numero_unique').on(t.tenantId, t.prefijo, t.numero),
    invoiceIdx: (0, pg_core_1.index)('credit_notes_invoice_idx').on(t.invoiceId),
}));
// ==================== PAYROLL ====================
exports.payrollEmployees = (0, pg_core_1.pgTable)('payroll_employees', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    tipoIdentificacion: (0, pg_core_1.varchar)('tipo_identificacion', { length: 10 }).notNull().default('CC'),
    identificacion: (0, pg_core_1.varchar)('identificacion', { length: 30 }).notNull(),
    dv: (0, pg_core_1.varchar)('dv', { length: 1 }),
    nombres: (0, pg_core_1.varchar)('nombres', { length: 100 }).notNull(),
    apellidos: (0, pg_core_1.varchar)('apellidos', { length: 100 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    telefono: (0, pg_core_1.varchar)('telefono', { length: 20 }),
    fechaNacimiento: (0, pg_core_1.timestamp)('fecha_nacimiento'),
    genero: (0, pg_core_1.varchar)('genero', { length: 10 }), // M, F
    estadoCivil: (0, pg_core_1.varchar)('estado_civil', { length: 20 }), // soltero, casado, union_libre, divorciado, viudo
    direccion: (0, pg_core_1.text)('direccion'),
    ciudad: (0, pg_core_1.varchar)('ciudad', { length: 100 }),
    telefonoEmergencia: (0, pg_core_1.varchar)('telefono_emergencia', { length: 20 }),
    contactoEmergencia: (0, pg_core_1.varchar)('contacto_emergencia', { length: 100 }),
    eps: (0, pg_core_1.varchar)('eps', { length: 100 }),
    fondoPension: (0, pg_core_1.varchar)('fondo_pension', { length: 100 }),
    tipoContrato: (0, pg_core_1.varchar)('tipo_contrato', { length: 30 }).notNull(), // indefinido, fijo, obra, aprendizaje, prestacion_servicios
    cargo: (0, pg_core_1.varchar)('cargo', { length: 100 }).notNull(),
    salarioBasico: (0, pg_core_1.numeric)('salario_basico', { precision: 14, scale: 2 }).notNull(),
    auxilioTransporte: (0, pg_core_1.boolean)('auxilio_transporte').notNull().default(false),
    epsPorcentaje: (0, pg_core_1.numeric)('eps_porcentaje', { precision: 5, scale: 2 }).notNull().default('4.00'),
    pensionPorcentaje: (0, pg_core_1.numeric)('pension_porcentaje', { precision: 5, scale: 2 }).notNull().default('4.00'),
    arlNivel: (0, pg_core_1.varchar)('arl_nivel', { length: 10 }).notNull().default('I'), // I, II, III, IV, V
    fechaIngreso: (0, pg_core_1.timestamp)('fecha_ingreso').notNull(),
    fechaRetiro: (0, pg_core_1.timestamp)('fecha_retiro'),
    motivoRetiro: (0, pg_core_1.varchar)('motivo_retiro', { length: 100 }), // renuncia, despido_justa, despido_injusta, mutuo_acuerdo, fallecimiento
    banco: (0, pg_core_1.varchar)('banco', { length: 50 }),
    tipoCuenta: (0, pg_core_1.varchar)('tipo_cuenta', { length: 20 }), // ahorros, corriente
    numeroCuenta: (0, pg_core_1.varchar)('numero_cuenta', { length: 30 }),
    activo: (0, pg_core_1.boolean)('activo').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    tenantIdentificacionIdx: (0, pg_core_1.uniqueIndex)('payroll_employees_tenant_identificacion_unique').on(t.tenantId, t.identificacion),
    tenantActivoIdx: (0, pg_core_1.index)('payroll_employees_tenant_activo_idx').on(t.tenantId, t.activo),
}));
exports.payrollPeriods = (0, pg_core_1.pgTable)('payroll_periods', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    nombre: (0, pg_core_1.varchar)('nombre', { length: 50 }).notNull(), // "Enero 2025 - Quincena 1"
    fechaInicio: (0, pg_core_1.timestamp)('fecha_inicio').notNull(),
    fechaFin: (0, pg_core_1.timestamp)('fecha_fin').notNull(),
    fechaPago: (0, pg_core_1.timestamp)('fecha_pago'),
    estado: (0, pg_core_1.varchar)('estado', { length: 20 }).notNull().default('borrador'), // borrador, calculado, aprobado, pagado, cerrado
    creadoPor: (0, pg_core_1.integer)('creado_por').references(() => exports.users.id, { onDelete: 'set null' }),
    aprobadoPor: (0, pg_core_1.integer)('aprobado_por').references(() => exports.users.id, { onDelete: 'set null' }),
    fechaAprobacion: (0, pg_core_1.timestamp)('fecha_aprobacion'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    tenantEstadoIdx: (0, pg_core_1.index)('payroll_periods_tenant_estado_idx').on(t.tenantId, t.estado),
}));
exports.payrollDetails = (0, pg_core_1.pgTable)('payroll_details', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    periodId: (0, pg_core_1.integer)('period_id').notNull().references(() => exports.payrollPeriods.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.integer)('employee_id').notNull().references(() => exports.payrollEmployees.id, { onDelete: 'restrict' }),
    diasLaborados: (0, pg_core_1.integer)('dias_laborados').notNull().default(0),
    salarioBasico: (0, pg_core_1.numeric)('salario_basico', { precision: 14, scale: 2 }).notNull(),
    auxilioTransporte: (0, pg_core_1.numeric)('auxilio_transporte', { precision: 14, scale: 2 }).notNull().default('0'),
    horasExtraDiurnas: (0, pg_core_1.numeric)('horas_extra_diurnas', { precision: 10, scale: 2 }).notNull().default('0'),
    horasExtraNocturnas: (0, pg_core_1.numeric)('horas_extra_nocturnas', { precision: 10, scale: 2 }).notNull().default('0'),
    horasExtraDominicales: (0, pg_core_1.numeric)('horas_extra_dominicales', { precision: 10, scale: 2 }).notNull().default('0'),
    horasExtraFestivas: (0, pg_core_1.numeric)('horas_extra_festivas', { precision: 10, scale: 2 }).notNull().default('0'),
    valorHorasExtra: (0, pg_core_1.numeric)('valor_horas_extra', { precision: 14, scale: 2 }).notNull().default('0'),
    comisiones: (0, pg_core_1.numeric)('comisiones', { precision: 14, scale: 2 }).notNull().default('0'),
    bonificaciones: (0, pg_core_1.numeric)('bonificaciones', { precision: 14, scale: 2 }).notNull().default('0'),
    otrosIngresos: (0, pg_core_1.numeric)('otros_ingresos', { precision: 14, scale: 2 }).notNull().default('0'),
    totalDevengado: (0, pg_core_1.numeric)('total_devengado', { precision: 14, scale: 2 }).notNull().default('0'),
    salud: (0, pg_core_1.numeric)('salud', { precision: 14, scale: 2 }).notNull().default('0'),
    pension: (0, pg_core_1.numeric)('pension', { precision: 14, scale: 2 }).notNull().default('0'),
    fondoSolidaridad: (0, pg_core_1.numeric)('fondo_solidaridad', { precision: 14, scale: 2 }).notNull().default('0'),
    retencionFuente: (0, pg_core_1.numeric)('retencion_fuente', { precision: 14, scale: 2 }).notNull().default('0'),
    anticipos: (0, pg_core_1.numeric)('anticipos', { precision: 14, scale: 2 }).notNull().default('0'),
    prestamos: (0, pg_core_1.numeric)('prestamos', { precision: 14, scale: 2 }).notNull().default('0'),
    otrosDescuentos: (0, pg_core_1.numeric)('otros_descuentos', { precision: 14, scale: 2 }).notNull().default('0'),
    totalDeducciones: (0, pg_core_1.numeric)('total_deducciones', { precision: 14, scale: 2 }).notNull().default('0'),
    netoPagar: (0, pg_core_1.numeric)('neto_pagar', { precision: 14, scale: 2 }).notNull().default('0'),
    // Provisiones (no afectan neto, solo contabilidad)
    provCesantias: (0, pg_core_1.numeric)('prov_cesantias', { precision: 14, scale: 2 }).notNull().default('0'),
    provInteresesCesantias: (0, pg_core_1.numeric)('prov_intereses_cesantias', { precision: 14, scale: 2 }).notNull().default('0'),
    provPrima: (0, pg_core_1.numeric)('prov_prima', { precision: 14, scale: 2 }).notNull().default('0'),
    provVacaciones: (0, pg_core_1.numeric)('prov_vacaciones', { precision: 14, scale: 2 }).notNull().default('0'),
    provArl: (0, pg_core_1.numeric)('prov_arl', { precision: 14, scale: 2 }).notNull().default('0'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    periodEmployeeIdx: (0, pg_core_1.uniqueIndex)('payroll_details_period_employee_unique').on(t.periodId, t.employeeId),
}));
// ==================== ACCOUNTING (PLAN DE CUENTAS DIAN) ====================
exports.accounts = (0, pg_core_1.pgTable)('accounts', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    codigo: (0, pg_core_1.varchar)('codigo', { length: 20 }).notNull(), // PUC Colombia: 1, 11, 1105, 110505, etc.
    nombre: (0, pg_core_1.varchar)('nombre', { length: 200 }).notNull(),
    tipo: (0, pg_core_1.varchar)('tipo', { length: 20 }).notNull(), // activo, pasivo, patrimonio, ingreso, gasto, costo
    naturaleza: (0, pg_core_1.varchar)('naturaleza', { length: 10 }).notNull(), // deudor, acreedor
    nivel: (0, pg_core_1.integer)('nivel').notNull(), // 1=mayor, 2=subcuenta, 3=auxiliar, 4=movimiento
    padreId: (0, pg_core_1.integer)('padre_id').references(() => exports.accounts.id, { onDelete: 'set null' }),
    aceptaMovimiento: (0, pg_core_1.boolean)('acepta_movimiento').notNull().default(false),
    requiereTercero: (0, pg_core_1.boolean)('requiere_tercero').notNull().default(false),
    requiereCentroCosto: (0, pg_core_1.boolean)('requiere_centro_costo').notNull().default(false),
    activo: (0, pg_core_1.boolean)('activo').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (t) => ({
    tenantCodigoIdx: (0, pg_core_1.uniqueIndex)('accounts_tenant_codigo_unique').on(t.tenantId, t.codigo),
    tenantPadreIdx: (0, pg_core_1.index)('accounts_tenant_padre_idx').on(t.tenantId, t.padreId),
}));
exports.journalEntries = (0, pg_core_1.pgTable)('journal_entries', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    numero: (0, pg_core_1.varchar)('numero', { length: 30 }).notNull(),
    fecha: (0, pg_core_1.timestamp)('fecha').notNull(),
    concepto: (0, pg_core_1.text)('concepto').notNull(),
    referenciaTipo: (0, pg_core_1.varchar)('referencia_tipo', { length: 50 }), // 'invoice', 'payment', 'payroll', 'purchase', 'adjustment'
    referenciaId: (0, pg_core_1.integer)('referencia_id'),
    totalDebito: (0, pg_core_1.numeric)('total_debito', { precision: 16, scale: 2 }).notNull().default('0'),
    totalCredito: (0, pg_core_1.numeric)('total_credito', { precision: 16, scale: 2 }).notNull().default('0'),
    estado: (0, pg_core_1.varchar)('estado', { length: 20 }).notNull().default('borrador'), // borrador, contabilizado, anulado
    creadoPor: (0, pg_core_1.integer)('creado_por').references(() => exports.users.id, { onDelete: 'set null' }),
    contabilizadoPor: (0, pg_core_1.integer)('contabilizado_por').references(() => exports.users.id, { onDelete: 'set null' }),
    fechaContabilizacion: (0, pg_core_1.timestamp)('fecha_contabilizacion'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => ({
    tenantNumeroIdx: (0, pg_core_1.uniqueIndex)('journal_entries_tenant_numero_unique').on(t.tenantId, t.numero),
    tenantFechaIdx: (0, pg_core_1.index)('journal_entries_tenant_fecha_idx').on(t.tenantId, t.fecha),
    referenciaIdx: (0, pg_core_1.index)('journal_entries_ref_idx').on(t.referenciaTipo, t.referenciaId),
}));
exports.journalEntryLines = (0, pg_core_1.pgTable)('journal_entry_lines', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    entryId: (0, pg_core_1.integer)('entry_id').notNull().references(() => exports.journalEntries.id, { onDelete: 'cascade' }),
    accountId: (0, pg_core_1.integer)('account_id').notNull().references(() => exports.accounts.id, { onDelete: 'restrict' }),
    terceroId: (0, pg_core_1.integer)('tercero_id'), // customer, supplier, employee
    terceroTipo: (0, pg_core_1.varchar)('tercero_tipo', { length: 20 }), // 'customer', 'supplier', 'employee'
    centroCosto: (0, pg_core_1.varchar)('centro_costo', { length: 50 }),
    debito: (0, pg_core_1.numeric)('debito', { precision: 16, scale: 2 }).notNull().default('0'),
    credito: (0, pg_core_1.numeric)('credito', { precision: 16, scale: 2 }).notNull().default('0'),
    concepto: (0, pg_core_1.text)('concepto'),
}, (t) => ({
    entryIdx: (0, pg_core_1.index)('jel_entry_idx').on(t.entryId),
    accountIdx: (0, pg_core_1.index)('jel_account_idx').on(t.accountId),
}));
// ==================== AUDIT LOG ====================
exports.auditLogs = (0, pg_core_1.pgTable)('audit_logs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    tenantId: (0, pg_core_1.varchar)('tenant_id', { length: 50 }).notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id, { onDelete: 'set null' }),
    accion: (0, pg_core_1.varchar)('accion', { length: 100 }).notNull(), // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, CONFIG_CHANGE, EXPORT
    entidad: (0, pg_core_1.varchar)('entidad', { length: 100 }).notNull(), // tabla afectada
    entidadId: (0, pg_core_1.varchar)('entidad_id', { length: 50 }), // ID del registro
    antes: (0, pg_core_1.jsonb)('antes'), // valores anteriores
    despues: (0, pg_core_1.jsonb)('despues'), // valores nuevos
    ip: (0, pg_core_1.varchar)('ip', { length: 45 }),
    userAgent: (0, pg_core_1.text)('user_agent'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (t) => ({
    tenantCreatedIdx: (0, pg_core_1.index)('audit_logs_tenant_created_idx').on(t.tenantId, t.createdAt),
    userCreatedIdx: (0, pg_core_1.index)('audit_logs_user_created_idx').on(t.userId, t.createdAt),
    entidadIdx: (0, pg_core_1.index)('audit_logs_entidad_idx').on(t.entidad, t.entidadId),
}));
//# sourceMappingURL=schema.js.map