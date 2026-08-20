import { pgTable, serial, varchar, text, integer, boolean, timestamp, numeric, jsonb, pgEnum, index, uniqueIndex, foreignKey, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ==================== ENUMS ====================
export const roleEnum = pgEnum('role', ['admin', 'operador', 'cocina', 'solo_lectura']);
export const orderStatusEnum = pgEnum('order_status', ['recibido', 'en_cocina', 'listo', 'entregado', 'cancelado']);
export const orderTypeEnum = pgEnum('order_type', ['domicilio', 'recoger']);
export const paymentStatusEnum = pgEnum('payment_status', ['pendiente', 'parcial', 'pagado', 'anulado']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['borrador', 'emitida', 'anulada', 'rechazada_dian']);
export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', ['borrador', 'enviada', 'parcial', 'recibida', 'cancelada']);
export const movementTypeEnum = pgEnum('movement_type', ['entrada', 'salida', 'ajuste_positivo', 'ajuste_negativo', 'traslado_entrada', 'traslado_salida']);
export const paymentMethodEnum = pgEnum('payment_method', ['efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata', 'pse', 'credito']);
export const configSectionEnum = pgEnum('config_section', ['negocio', 'menu', 'ia', 'domicilios', 'pagos', 'nomina', 'bi', 'integraciones', 'notificaciones']);

// ==================== TENANTS ====================
export const tenants = pgTable('tenants', {
  id: varchar('id', { length: 50 }).primaryKey(),
  nombre: varchar('nombre', { length: 150 }).notNull(),
  segmento: varchar('segmento', { length: 20 }).notNull().default('comidas'), // comidas|salud|retail|belleza|profesionales|educacion|automotriz|inmobiliaria|turismo|logistica|mantenimiento|financieros
  ciiu: varchar('ciiu', { length: 10 }),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  nombreIdx: index('tenants_nombre_idx').on(t.nombre),
  segmentoIdx: index('tenants_segmento_idx').on(t.segmento),
}));

// ==================== USERS & RBAC ====================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  nombre: varchar('nombre', { length: 150 }).notNull(),
  telefono: varchar('telefono', { length: 20 }),
  role: roleEnum('role').notNull().default('operador'),
  activo: boolean('activo').notNull().default(true),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  twoFactorSecret: varchar('two_factor_secret', { length: 255 }),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  tenantEmailIdx: uniqueIndex('users_tenant_email_unique').on(t.tenantId, t.email),
  tenantRoleIdx: index('users_tenant_role_idx').on(t.tenantId, t.role),
}));

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(), // ej: 'orders:create', 'config:write', 'reports:read'
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(), // orders, config, reports, inventory, accounting, users
});

export const rolePermissions = pgTable('role_permissions', {
  role: roleEnum('role').notNull(),
  permissionId: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.role, t.permissionId] }),
}));

export const userPermissions = pgTable('user_permissions', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  granted: boolean('granted').notNull().default(true), // true = grant, false = revoke
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.permissionId] }),
}));

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index('sessions_user_id_idx').on(t.userId),
  expiresAtIdx: index('sessions_expires_at_idx').on(t.expiresAt),
}));

// ==================== CONFIG VERSIONING ====================
export const configVersions = pgTable('config_versions', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  section: configSectionEnum('section').notNull(),
  payload: jsonb('payload').notNull(),
  changedBy: integer('changed_by').notNull().references(() => users.id),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tenantSectionIdx: index('config_versions_tenant_section_idx').on(t.tenantId, t.section),
  createdAtIdx: index('config_versions_created_at_idx').on(t.createdAt),
}));

export const configSecrets = pgTable('config_secrets', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 100 }).notNull(),
  valueEncrypted: text('value_encrypted').notNull(), // AES-256-GCM encrypted
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  tenantKeyIdx: uniqueIndex('config_secrets_tenant_key_unique').on(t.tenantId, t.key),
}));

// ==================== PRODUCTS & INVENTORY ====================
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  descripcion: text('descripcion'),
  orden: integer('orden').notNull().default(0),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tenantNombreIdx: uniqueIndex('categories_tenant_nombre_unique').on(t.tenantId, t.nombre),
}));

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  codigo: varchar('codigo', { length: 50 }), // SKU interno
  codigoBarras: varchar('codigo_barras', { length: 100 }),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  descripcion: text('descripcion'),
  ingredientes: text('ingredientes'),
  precio: numeric('precio', { precision: 14, scale: 2 }).notNull(),
  costo: numeric('costo', { precision: 14, scale: 2 }), // para margen
  unidadMedida: varchar('unidad_medida', { length: 20 }).notNull().default('unidad'), // unidad, kg, lt, gr, ml
  manejaStock: boolean('maneja_stock').notNull().default(true),
  stockMinimo: numeric('stock_minimo', { precision: 10, scale: 2 }).default('0'),
  stockMaximo: numeric('stock_maximo', { precision: 10, scale: 2 }),
  ubicacion: varchar('ubicacion', { length: 100 }), // estante/bodega
  imagenUrl: varchar('imagen_url', { length: 500 }),
  aliases: jsonb('aliases').default([]).notNull(), // ["perro", "hotdog"]
  impuestos: jsonb('impuestos').default([]).notNull(), // [{"codigo":"01","porcentaje":19}]
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  tenantCodigoIdx: uniqueIndex('products_tenant_codigo_unique').on(t.tenantId, t.codigo),
  tenantNombreIdx: index('products_tenant_nombre_idx').on(t.tenantId, t.nombre),
  tenantActivoIdx: index('products_tenant_activo_idx').on(t.tenantId, t.activo),
}));

export const productVariants = pgTable('product_variants', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 100 }).notNull(), // ej: "Grande", "Sin azúcar"
  sku: varchar('sku', { length: 50 }),
  precioAdicional: numeric('precio_adicional', { precision: 14, scale: 2 }).notNull().default('0'),
  stock: numeric('stock', { precision: 10, scale: 2 }).notNull().default('0'),
  activo: boolean('activo').notNull().default(true),
}, (t) => ({
  productSkuIdx: uniqueIndex('variants_product_sku_unique').on(t.productId, t.sku),
}));

export const stock = pgTable('stock', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  bodega: varchar('bodega', { length: 50 }).notNull().default('principal'),
  cantidad: numeric('cantidad', { precision: 12, scale: 2 }).notNull().default('0'),
  reservado: numeric('reservado', { precision: 12, scale: 2 }).notNull().default('0'), // en OC o pedidos pendientes
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  tenantProductBodegaIdx: uniqueIndex('stock_tenant_product_bodega_unique').on(t.tenantId, t.productId, t.variantId, t.bodega),
  tenantIdx: index('stock_tenant_idx').on(t.tenantId),
}));

export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  bodega: varchar('bodega', { length: 50 }).notNull().default('principal'),
  tipo: movementTypeEnum('tipo').notNull(),
  cantidad: numeric('cantidad', { precision: 12, scale: 2 }).notNull(),
  costoUnitario: numeric('costo_unitario', { precision: 14, scale: 2 }), // para valoración inventario
  referenciaTipo: varchar('referencia_tipo', { length: 50 }), // 'purchase_order', 'sale', 'adjustment', 'transfer'
  referenciaId: integer('referencia_id'), // ID de la OC, venta, ajuste
  observacion: text('observacion'),
  usuarioId: integer('usuario_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tenantCreatedIdx: index('stock_movements_tenant_created_idx').on(t.tenantId, t.createdAt),
  referenciaIdx: index('stock_movements_ref_idx').on(t.referenciaTipo, t.referenciaId),
}));

// ==================== SUPPLIERS & PURCHASES ====================
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  tipoIdentificacion: varchar('tipo_identificacion', { length: 10 }).notNull().default('NIT'), // NIT, CC, CE, PP
  identificacion: varchar('identificacion', { length: 30 }).notNull(),
  dv: varchar('dv', { length: 1 }),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  nombreComercial: varchar('nombre_comercial', { length: 200 }),
  email: varchar('email', { length: 255 }),
  telefono: varchar('telefono', { length: 20 }),
  direccion: text('direccion'),
  ciudad: varchar('ciudad', { length: 100 }),
  pais: varchar('pais', { length: 50 }).notNull().default('CO'),
  regimen: varchar('regimen', { length: 20 }).notNull().default('común'), // común, simplificado
  responsableIva: boolean('responsable_iva').notNull().default(true),
  retencionFuente: numeric('retencion_fuente', { precision: 5, scale: 2 }).default('0'),
  retencionIva: numeric('retencion_iva', { precision: 5, scale: 2 }).default('0'),
  retencionIca: numeric('retencion_ica', { precision: 5, scale: 2 }).default('0'),
  diasCredito: integer('dias_credito').notNull().default(0),
  cupoCredito: numeric('cupo_credito', { precision: 14, scale: 2 }).default('0'),
  banco: varchar('banco', { length: 50 }),
  tipoCuenta: varchar('tipo_cuenta', { length: 20 }), // ahorros, corriente
  numeroCuenta: varchar('numero_cuenta', { length: 30 }),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  tenantIdentificacionIdx: uniqueIndex('suppliers_tenant_identificacion_unique').on(t.tenantId, t.identificacion),
  tenantNombreIdx: index('suppliers_tenant_nombre_idx').on(t.tenantId, t.nombre),
}));

export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
  numero: varchar('numero', { length: 30 }).notNull(),
  estado: purchaseOrderStatusEnum('estado').notNull().default('borrador'),
  fecha: timestamp('fecha').notNull().defaultNow(),
  fechaEntregaEsperada: timestamp('fecha_entrega_esperada'),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull().default('0'),
  descuento: numeric('descuento', { precision: 14, scale: 2 }).notNull().default('0'),
  impuestos: numeric('impuestos', { precision: 14, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 14, scale: 2 }).notNull().default('0'),
  observacion: text('observacion'),
  creadoPor: integer('creado_por').references(() => users.id, { onDelete: 'set null' }),
  aprobadoPor: integer('aprobado_por').references(() => users.id, { onDelete: 'set null' }),
  fechaAprobacion: timestamp('fecha_aprobacion'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  tenantNumeroIdx: uniqueIndex('purchase_orders_tenant_numero_unique').on(t.tenantId, t.numero),
  tenantEstadoIdx: index('purchase_orders_tenant_estado_idx').on(t.tenantId, t.estado),
  supplierIdx: index('purchase_orders_supplier_idx').on(t.supplierId),
}));

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  purchaseOrderId: integer('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  descripcion: varchar('descripcion', { length: 200 }).notNull(),
  cantidad: numeric('cantidad', { precision: 10, scale: 2 }).notNull(),
  cantidadRecibida: numeric('cantidad_recibida', { precision: 10, scale: 2 }).notNull().default('0'),
  precioUnitario: numeric('precio_unitario', { precision: 14, scale: 2 }).notNull(),
  descuento: numeric('descuento', { precision: 14, scale: 2 }).notNull().default('0'),
  impuestoPorcentaje: numeric('impuesto_porcentaje', { precision: 5, scale: 2 }).notNull().default('19'),
  total: numeric('total', { precision: 14, scale: 2 }).notNull(),
}, (t) => ({
  poIdx: index('po_items_po_idx').on(t.purchaseOrderId),
}));

export const purchaseReceipts = pgTable('purchase_receipts', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  purchaseOrderId: integer('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'restrict' }),
  numero: varchar('numero', { length: 30 }).notNull(),
  fecha: timestamp('fecha').notNull().defaultNow(),
  observacion: text('observacion'),
  recibidoPor: integer('recibido_por').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tenantNumeroIdx: uniqueIndex('purchase_receipts_tenant_numero_unique').on(t.tenantId, t.numero),
  poIdx: index('purchase_receipts_po_idx').on(t.purchaseOrderId),
}));

export const purchaseReceiptItems = pgTable('purchase_receipt_items', {
  id: serial('id').primaryKey(),
  purchaseReceiptId: integer('purchase_receipt_id').notNull().references(() => purchaseReceipts.id, { onDelete: 'cascade' }),
  poItemId: integer('po_item_id').references(() => purchaseOrderItems.id, { onDelete: 'set null' }),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  cantidad: numeric('cantidad', { precision: 10, scale: 2 }).notNull(),
  precioUnitario: numeric('precio_unitario', { precision: 14, scale: 2 }).notNull(),
  lote: varchar('lote', { length: 50 }),
  fechaVencimiento: timestamp('fecha_vencimiento'),
  ubicacion: varchar('ubicacion', { length: 100 }),
}, (t) => ({
  prIdx: index('pr_items_pr_idx').on(t.purchaseReceiptId),
}));

// ==================== ACCOUNTS RECEIVABLE / PAYABLE ====================
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  tipoIdentificacion: varchar('tipo_identificacion', { length: 10 }).notNull().default('CC'),
  identificacion: varchar('identificacion', { length: 30 }).notNull(),
  dv: varchar('dv', { length: 1 }),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  nombreComercial: varchar('nombre_comercial', { length: 200 }),
  email: varchar('email', { length: 255 }),
  telefono: varchar('telefono', { length: 20 }),
  direccion: text('direccion'),
  ciudad: varchar('ciudad', { length: 100 }),
  regimen: varchar('regimen', { length: 20 }).notNull().default('común'),
  responsableIva: boolean('responsable_iva').notNull().default(true),
  cupoCredito: numeric('cupo_credito', { precision: 14, scale: 2 }).default('0'),
  diasCredito: integer('dias_credito').notNull().default(0),
  vendedorId: integer('vendedor_id').references(() => users.id, { onDelete: 'set null' }),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  tenantIdentificacionIdx: uniqueIndex('customers_tenant_identificacion_unique').on(t.tenantId, t.identificacion),
  tenantNombreIdx: index('customers_tenant_nombre_idx').on(t.tenantId, t.nombre),
}));

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  orderId: integer('order_id'), // referencia a pedidos (tabla legacy)
  numero: varchar('numero', { length: 30 }).notNull(),
  prefijo: varchar('prefijo', { length: 10 }).notNull().default('SETP'),
  resolucion: varchar('resolucion', { length: 30 }),
  fecha: timestamp('fecha').notNull().defaultNow(),
  fechaVencimiento: timestamp('fecha_vencimiento'),
  estado: invoiceStatusEnum('estado').notNull().default('borrador'),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull().default('0'),
  descuento: numeric('descuento', { precision: 14, scale: 2 }).notNull().default('0'),
  impuestos: numeric('impuestos', { precision: 14, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 14, scale: 2 }).notNull().default('0'),
  saldoPendiente: numeric('saldo_pendiente', { precision: 14, scale: 2 }).notNull().default('0'),
  cufe: varchar('cufe', { length: 100 }),
  qrUrl: varchar('qr_url', { length: 500 }),
  xmlUrl: varchar('xml_url', { length: 500 }),
  pdfUrl: varchar('pdf_url', { length: 500 }),
  observacion: text('observacion'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  tenantNumeroIdx: uniqueIndex('invoices_tenant_numero_unique').on(t.tenantId, t.prefijo, t.numero),
  tenantEstadoIdx: index('invoices_tenant_estado_idx').on(t.tenantId, t.estado),
  customerIdx: index('invoices_customer_idx').on(t.customerId),
  fechaIdx: index('invoices_fecha_idx').on(t.fecha),
}));

export const invoiceItems = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  descripcion: varchar('descripcion', { length: 200 }).notNull(),
  cantidad: numeric('cantidad', { precision: 10, scale: 2 }).notNull(),
  precioUnitario: numeric('precio_unitario', { precision: 14, scale: 2 }).notNull(),
  descuento: numeric('descuento', { precision: 14, scale: 2 }).notNull().default('0'),
  impuestoCodigo: varchar('impuesto_codigo', { length: 10 }).notNull().default('01'), // 01=IVA, 02=ICA, 03=Consumo
  impuestoPorcentaje: numeric('impuesto_porcentaje', { precision: 5, scale: 2 }).notNull().default('19'),
  total: numeric('total', { precision: 14, scale: 2 }).notNull(),
}, (t) => ({
  invoiceIdx: index('invoice_items_invoice_idx').on(t.invoiceId),
}));

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  purchaseOrderId: integer('purchase_order_id').references(() => purchaseOrders.id, { onDelete: 'set null' }),
  customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  tipo: varchar('tipo', { length: 20 }).notNull(), // 'cobro' | 'pago'
  metodo: paymentMethodEnum('metodo').notNull(),
  referencia: varchar('referencia', { length: 50 }), // número de transacción, cheque, etc.
  monto: numeric('monto', { precision: 14, scale: 2 }).notNull(),
  fecha: timestamp('fecha').notNull().defaultNow(),
  estado: varchar('estado', { length: 20 }).notNull().default('aplicado'), // aplicado, anulado, pendiente
  observacion: text('observacion'),
  creadoPor: integer('creado_por').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tenantTipoIdx: index('payments_tenant_tipo_idx').on(t.tenantId, t.tipo),
  invoiceIdx: index('payments_invoice_idx').on(t.invoiceId),
  customerIdx: index('payments_customer_idx').on(t.customerId),
  supplierIdx: index('payments_supplier_idx').on(t.supplierId),
  fechaIdx: index('payments_fecha_idx').on(t.fecha),
}));

export const creditNotes = pgTable('credit_notes', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id, { onDelete: 'restrict' }),
  numero: varchar('numero', { length: 30 }).notNull(),
  prefijo: varchar('prefijo', { length: 10 }).notNull().default('NC'),
  fecha: timestamp('fecha').notNull().defaultNow(),
  motivo: varchar('motivo', { length: 100 }).notNull(), // devolución, descuento, error, otros
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull().default('0'),
  impuestos: numeric('impuestos', { precision: 14, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 14, scale: 2 }).notNull().default('0'),
  cude: varchar('cude', { length: 100 }),
  estado: varchar('estado', { length: 20 }).notNull().default('emitida'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tenantNumeroIdx: uniqueIndex('credit_notes_tenant_numero_unique').on(t.tenantId, t.prefijo, t.numero),
  invoiceIdx: index('credit_notes_invoice_idx').on(t.invoiceId),
}));

// ==================== PAYROLL ====================
export const payrollEmployees = pgTable('payroll_employees', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  tipoIdentificacion: varchar('tipo_identificacion', { length: 10 }).notNull().default('CC'),
  identificacion: varchar('identificacion', { length: 30 }).notNull(),
  dv: varchar('dv', { length: 1 }),
  nombres: varchar('nombres', { length: 100 }).notNull(),
  apellidos: varchar('apellidos', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  telefono: varchar('telefono', { length: 20 }),
  fechaNacimiento: timestamp('fecha_nacimiento'),
  genero: varchar('genero', { length: 10 }), // M, F
  estadoCivil: varchar('estado_civil', { length: 20 }), // soltero, casado, union_libre, divorciado, viudo
  direccion: text('direccion'),
  ciudad: varchar('ciudad', { length: 100 }),
  telefonoEmergencia: varchar('telefono_emergencia', { length: 20 }),
  contactoEmergencia: varchar('contacto_emergencia', { length: 100 }),
  eps: varchar('eps', { length: 100 }),
  fondoPension: varchar('fondo_pension', { length: 100 }),
  tipoContrato: varchar('tipo_contrato', { length: 30 }).notNull(), // indefinido, fijo, obra, aprendizaje, prestacion_servicios
  cargo: varchar('cargo', { length: 100 }).notNull(),
  salarioBasico: numeric('salario_basico', { precision: 14, scale: 2 }).notNull(),
  auxilioTransporte: boolean('auxilio_transporte').notNull().default(false),
  epsPorcentaje: numeric('eps_porcentaje', { precision: 5, scale: 2 }).notNull().default('4.00'),
  pensionPorcentaje: numeric('pension_porcentaje', { precision: 5, scale: 2 }).notNull().default('4.00'),
  arlNivel: varchar('arl_nivel', { length: 10 }).notNull().default('I'), // I, II, III, IV, V
  fechaIngreso: timestamp('fecha_ingreso').notNull(),
  fechaRetiro: timestamp('fecha_retiro'),
  motivoRetiro: varchar('motivo_retiro', { length: 100 }), // renuncia, despido_justa, despido_injusta, mutuo_acuerdo, fallecimiento
  banco: varchar('banco', { length: 50 }),
  tipoCuenta: varchar('tipo_cuenta', { length: 20 }), // ahorros, corriente
  numeroCuenta: varchar('numero_cuenta', { length: 30 }),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  tenantIdentificacionIdx: uniqueIndex('payroll_employees_tenant_identificacion_unique').on(t.tenantId, t.identificacion),
  tenantActivoIdx: index('payroll_employees_tenant_activo_idx').on(t.tenantId, t.activo),
}));

export const payrollPeriods = pgTable('payroll_periods', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 50 }).notNull(), // "Enero 2025 - Quincena 1"
  fechaInicio: timestamp('fecha_inicio').notNull(),
  fechaFin: timestamp('fecha_fin').notNull(),
  fechaPago: timestamp('fecha_pago'),
  estado: varchar('estado', { length: 20 }).notNull().default('borrador'), // borrador, calculado, aprobado, pagado, cerrado
  creadoPor: integer('creado_por').references(() => users.id, { onDelete: 'set null' }),
  aprobadoPor: integer('aprobado_por').references(() => users.id, { onDelete: 'set null' }),
  fechaAprobacion: timestamp('fecha_aprobacion'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  tenantEstadoIdx: index('payroll_periods_tenant_estado_idx').on(t.tenantId, t.estado),
}));

export const payrollDetails = pgTable('payroll_details', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').notNull().references(() => payrollPeriods.id, { onDelete: 'cascade' }),
  employeeId: integer('employee_id').notNull().references(() => payrollEmployees.id, { onDelete: 'restrict' }),
  diasLaborados: integer('dias_laborados').notNull().default(0),
  salarioBasico: numeric('salario_basico', { precision: 14, scale: 2 }).notNull(),
  auxilioTransporte: numeric('auxilio_transporte', { precision: 14, scale: 2 }).notNull().default('0'),
  horasExtraDiurnas: numeric('horas_extra_diurnas', { precision: 10, scale: 2 }).notNull().default('0'),
  horasExtraNocturnas: numeric('horas_extra_nocturnas', { precision: 10, scale: 2 }).notNull().default('0'),
  horasExtraDominicales: numeric('horas_extra_dominicales', { precision: 10, scale: 2 }).notNull().default('0'),
  horasExtraFestivas: numeric('horas_extra_festivas', { precision: 10, scale: 2 }).notNull().default('0'),
  valorHorasExtra: numeric('valor_horas_extra', { precision: 14, scale: 2 }).notNull().default('0'),
  comisiones: numeric('comisiones', { precision: 14, scale: 2 }).notNull().default('0'),
  bonificaciones: numeric('bonificaciones', { precision: 14, scale: 2 }).notNull().default('0'),
  otrosIngresos: numeric('otros_ingresos', { precision: 14, scale: 2 }).notNull().default('0'),
  totalDevengado: numeric('total_devengado', { precision: 14, scale: 2 }).notNull().default('0'),
  salud: numeric('salud', { precision: 14, scale: 2 }).notNull().default('0'),
  pension: numeric('pension', { precision: 14, scale: 2 }).notNull().default('0'),
  fondoSolidaridad: numeric('fondo_solidaridad', { precision: 14, scale: 2 }).notNull().default('0'),
  retencionFuente: numeric('retencion_fuente', { precision: 14, scale: 2 }).notNull().default('0'),
  anticipos: numeric('anticipos', { precision: 14, scale: 2 }).notNull().default('0'),
  prestamos: numeric('prestamos', { precision: 14, scale: 2 }).notNull().default('0'),
  otrosDescuentos: numeric('otros_descuentos', { precision: 14, scale: 2 }).notNull().default('0'),
  totalDeducciones: numeric('total_deducciones', { precision: 14, scale: 2 }).notNull().default('0'),
  netoPagar: numeric('neto_pagar', { precision: 14, scale: 2 }).notNull().default('0'),
  // Provisiones (no afectan neto, solo contabilidad)
  provCesantias: numeric('prov_cesantias', { precision: 14, scale: 2 }).notNull().default('0'),
  provInteresesCesantias: numeric('prov_intereses_cesantias', { precision: 14, scale: 2 }).notNull().default('0'),
  provPrima: numeric('prov_prima', { precision: 14, scale: 2 }).notNull().default('0'),
  provVacaciones: numeric('prov_vacaciones', { precision: 14, scale: 2 }).notNull().default('0'),
  provArl: numeric('prov_arl', { precision: 14, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  periodEmployeeIdx: uniqueIndex('payroll_details_period_employee_unique').on(t.periodId, t.employeeId),
}));

// ==================== ACCOUNTING (PLAN DE CUENTAS DIAN) ====================
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  codigo: varchar('codigo', { length: 20 }).notNull(), // PUC Colombia: 1, 11, 1105, 110505, etc.
  nombre: varchar('nombre', { length: 200 }).notNull(),
  tipo: varchar('tipo', { length: 20 }).notNull(), // activo, pasivo, patrimonio, ingreso, gasto, costo
  naturaleza: varchar('naturaleza', { length: 10 }).notNull(), // deudor, acreedor
  nivel: integer('nivel').notNull(), // 1=mayor, 2=subcuenta, 3=auxiliar, 4=movimiento
  padreId: integer('padre_id').references(() => accounts.id, { onDelete: 'set null' }),
  aceptaMovimiento: boolean('acepta_movimiento').notNull().default(false),
  requiereTercero: boolean('requiere_tercero').notNull().default(false),
  requiereCentroCosto: boolean('requiere_centro_costo').notNull().default(false),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tenantCodigoIdx: uniqueIndex('accounts_tenant_codigo_unique').on(t.tenantId, t.codigo),
  tenantPadreIdx: index('accounts_tenant_padre_idx').on(t.tenantId, t.padreId),
}));

export const journalEntries = pgTable('journal_entries', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  numero: varchar('numero', { length: 30 }).notNull(),
  fecha: timestamp('fecha').notNull(),
  concepto: text('concepto').notNull(),
  referenciaTipo: varchar('referencia_tipo', { length: 50 }), // 'invoice', 'payment', 'payroll', 'purchase', 'adjustment'
  referenciaId: integer('referencia_id'),
  totalDebito: numeric('total_debito', { precision: 16, scale: 2 }).notNull().default('0'),
  totalCredito: numeric('total_credito', { precision: 16, scale: 2 }).notNull().default('0'),
  estado: varchar('estado', { length: 20 }).notNull().default('borrador'), // borrador, contabilizado, anulado
  creadoPor: integer('creado_por').references(() => users.id, { onDelete: 'set null' }),
  contabilizadoPor: integer('contabilizado_por').references(() => users.id, { onDelete: 'set null' }),
  fechaContabilizacion: timestamp('fecha_contabilizacion'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  tenantNumeroIdx: uniqueIndex('journal_entries_tenant_numero_unique').on(t.tenantId, t.numero),
  tenantFechaIdx: index('journal_entries_tenant_fecha_idx').on(t.tenantId, t.fecha),
  referenciaIdx: index('journal_entries_ref_idx').on(t.referenciaTipo, t.referenciaId),
}));

export const journalEntryLines = pgTable('journal_entry_lines', {
  id: serial('id').primaryKey(),
  entryId: integer('entry_id').notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  terceroId: integer('tercero_id'), // customer, supplier, employee
  terceroTipo: varchar('tercero_tipo', { length: 20 }), // 'customer', 'supplier', 'employee'
  centroCosto: varchar('centro_costo', { length: 50 }),
  debito: numeric('debito', { precision: 16, scale: 2 }).notNull().default('0'),
  credito: numeric('credito', { precision: 16, scale: 2 }).notNull().default('0'),
  concepto: text('concepto'),
}, (t) => ({
  entryIdx: index('jel_entry_idx').on(t.entryId),
  accountIdx: index('jel_account_idx').on(t.accountId),
}));

// ==================== AUDIT LOG ====================
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 }).notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  accion: varchar('accion', { length: 100 }).notNull(), // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, CONFIG_CHANGE, EXPORT
  entidad: varchar('entidad', { length: 100 }).notNull(), // tabla afectada
  entidadId: varchar('entidad_id', { length: 50 }), // ID del registro
  antes: jsonb('antes'), // valores anteriores
  despues: jsonb('despues'), // valores nuevos
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tenantCreatedIdx: index('audit_logs_tenant_created_idx').on(t.tenantId, t.createdAt),
  userCreatedIdx: index('audit_logs_user_created_idx').on(t.userId, t.createdAt),
  entidadIdx: index('audit_logs_entidad_idx').on(t.entidad, t.entidadId),
}));

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type ConfigVersion = typeof configVersions.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Stock = typeof stock.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type PayrollEmployee = typeof payrollEmployees.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;