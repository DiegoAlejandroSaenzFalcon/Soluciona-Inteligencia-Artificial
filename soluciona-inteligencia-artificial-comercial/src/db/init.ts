import { getDb } from './index';
import * as schema from './schema';
import { eq, sql } from 'drizzle-orm';
import { config } from '../../config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

interface AccountSeed {
  codigo: string;
  nombre: string;
  tipo: string;
  naturaleza: string;
  nivel: number;
  padreCodigo?: string;
  aceptaMovimiento: boolean;
  requiereTercero?: boolean;
  requiereCentroCosto?: boolean;
}

const DEFAULT_PERMISSIONS = [
  // Orders
  { code: 'orders:read', description: 'Ver pedidos', category: 'orders' },
  { code: 'orders:create', description: 'Crear pedidos', category: 'orders' },
  { code: 'orders:update', description: 'Actualizar pedidos', category: 'orders' },
  { code: 'orders:delete', description: 'Eliminar/Cancelar pedidos', category: 'orders' },
  { code: 'orders:confirm', description: 'Confirmar pedidos', category: 'orders' },
  { code: 'orders:status', description: 'Cambiar estado de pedidos', category: 'orders' },
  // Kitchen
  { code: 'kitchen:read', description: 'Ver cocina/KDS', category: 'orders' },
  { code: 'kitchen:update', description: 'Actualizar estados en cocina', category: 'orders' },
  // Customers
  { code: 'customers:read', description: 'Ver clientes', category: 'customers' },
  { code: 'customers:create', description: 'Crear clientes', category: 'customers' },
  { code: 'customers:update', description: 'Actualizar clientes', category: 'customers' },
  { code: 'customers:delete', description: 'Eliminar clientes', category: 'customers' },
  // Conversations
  { code: 'conversations:read', description: 'Ver conversaciones', category: 'conversations' },
  { code: 'conversations:reply', description: 'Responder conversaciones', category: 'conversations' },
  // Config
  { code: 'config:read', description: 'Ver configuración', category: 'config' },
  { code: 'config:write', description: 'Modificar configuración', category: 'config' },
  { code: 'config:secrets', description: 'Gestionar secrets', category: 'config' },
  // Reports
  { code: 'reports:read', description: 'Ver reportes', category: 'reports' },
  { code: 'reports:export', description: 'Exportar reportes', category: 'reports' },
  // Inventory
  { code: 'inventory:read', description: 'Ver inventario', category: 'inventory' },
  { code: 'inventory:write', description: 'Gestionar inventario', category: 'inventory' },
  { code: 'inventory:adjust', description: 'Ajustes de inventario', category: 'inventory' },
  { code: 'inventory:transfers', description: 'Traslados entre bodegas', category: 'inventory' },
  // Purchases
  { code: 'purchases:read', description: 'Ver órdenes de compra', category: 'purchases' },
  { code: 'purchases:create', description: 'Crear órdenes de compra', category: 'purchases' },
  { code: 'purchases:approve', description: 'Aprobar órdenes de compra', category: 'purchases' },
  { code: 'purchases:receive', description: 'Recibir mercancía', category: 'purchases' },
  // Accounting
  { code: 'accounting:read', description: 'Ver contabilidad', category: 'accounting' },
  { code: 'accounting:write', description: 'Contabilizar asientos', category: 'accounting' },
  { code: 'accounting:reconcile', description: 'Conciliar bancos', category: 'accounting' },
  { code: 'accounting:close', description: 'Cierre contable', category: 'accounting' },
  // Payroll
  { code: 'payroll:read', description: 'Ver nómina', category: 'payroll' },
  { code: 'payroll:write', description: 'Procesar nómina', category: 'payroll' },
  { code: 'payroll:approve', description: 'Aprobar nómina', category: 'payroll' },
  // Users
  { code: 'users:read', description: 'Ver usuarios', category: 'users' },
  { code: 'users:create', description: 'Crear usuarios', category: 'users' },
  { code: 'users:update', description: 'Actualizar usuarios', category: 'users' },
  { code: 'users:delete', description: 'Eliminar usuarios', category: 'users' },
  { code: 'users:roles', description: 'Gestionar roles/permisos', category: 'users' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'], // all permissions
  operador: [
    'orders:read', 'orders:create', 'orders:update', 'orders:confirm', 'orders:status',
    'kitchen:read', 'kitchen:update',
    'customers:read', 'customers:create', 'customers:update',
    'conversations:read', 'conversations:reply',
    'config:read',
    'reports:read',
    'inventory:read', 'inventory:write',
    'purchases:read', 'purchases:create', 'purchases:receive',
    'accounting:read',
  ],
  cocina: [
    'orders:read', 'orders:status',
    'kitchen:read', 'kitchen:update',
  ],
  solo_lectura: [
    'orders:read',
    'customers:read',
    'conversations:read',
    'config:read',
    'reports:read',
    'inventory:read',
    'purchases:read',
    'accounting:read',
  ],
};

export async function initializeDatabase() {
  const db = getDb();
  
  console.log('[INIT] Verificando conexión...');
  try {
    await db.execute(sql`SELECT 1`);
    console.log('[INIT] Conexión OK');
  } catch (e) {
    console.error('[INIT] Error de conexión:', e);
    throw e;
  }

  console.log('[INIT] Insertando permisos por defecto...');
  for (const perm of DEFAULT_PERMISSIONS) {
    await db.insert(schema.permissions)
      .values(perm)
      .onConflictDoNothing({ target: schema.permissions.code });
  }

  console.log('[INIT] Insertando role_permissions...');
  for (const [role, codes] of Object.entries(ROLE_PERMISSIONS)) {
    if (codes.includes('*')) {
      // Admin gets all permissions
      const allPerms = await db.select({ id: schema.permissions.id }).from(schema.permissions);
      for (const perm of allPerms) {
        await db.insert(schema.rolePermissions)
          .values({ role: role as any, permissionId: perm.id })
          .onConflictDoNothing();
      }
    } else {
      for (const code of codes) {
        const perm = await db.select({ id: schema.permissions.id })
          .from(schema.permissions)
          .where(eq(schema.permissions.code, code))
          .limit(1);
        if (perm.length) {
          await db.insert(schema.rolePermissions)
            .values({ role: role as any, permissionId: perm[0].id })
            .onConflictDoNothing();
        }
      }
    }
  }

  console.log('[INIT] Verificando tenant por defecto...');
  const defaultTenant = await db.select().from(schema.tenants).where(eq(schema.tenants.id, 'default')).limit(1);
  if (!defaultTenant.length) {
    await db.insert(schema.tenants).values({
      id: 'default',
      nombre: config.negocio || 'Mi Negocio',
      segmento: config.segmento || 'comidas',
      ciiu: config.ciiu || '',
      activo: true,
    });
    console.log('[INIT] Tenant default creado');
  }

  console.log('[INIT] Verificando usuario admin por defecto...');
  const adminUser = await db.select().from(schema.users)
    .where(eq(schema.users.email, 'admin@localhost'))
    .limit(1);
  if (!adminUser.length) {
    const adminPass = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('hex');
    const passwordHash = await bcrypt.hash(adminPass, 12);
    await db.insert(schema.users).values({
      tenantId: 'default',
      email: 'admin@localhost',
      passwordHash,
      nombre: 'Administrador',
      role: 'admin',
      activo: true,
    });
    if (process.env.ADMIN_PASSWORD) {
      console.log('[INIT] Usuario admin creado (admin@localhost) con contraseña de ADMIN_PASSWORD.');
    } else {
      console.log('[INIT] Usuario admin creado (admin@localhost). Contraseña generada (guárdala ahora): ' + adminPass);
    }
  }

  console.log('[INIT] Verificando plan de cuentas básico (PUC Colombia)...');
  const accountsCount = await db.select({ count: sql<number>`count(*)` }).from(schema.accounts).where(eq(schema.accounts.tenantId, 'default'));
  if (Number(accountsCount[0].count) === 0) {
    await seedChartOfAccounts(db);
    console.log('[INIT] Plan de cuentas PUC sembrado');
  }

  console.log('[INIT] Inicialización completada');
}

async function seedChartOfAccounts(db: any) {
  const accounts: AccountSeed[] = [
    // ACTIVOS (1)
    { codigo: '1', nombre: 'ACTIVOS', tipo: 'activo', naturaleza: 'deudor', nivel: 1, aceptaMovimiento: false },
    { codigo: '11', nombre: 'DISPONIBLE', tipo: 'activo', naturaleza: 'deudor', nivel: 2, padreCodigo: '1', aceptaMovimiento: false },
    { codigo: '1105', nombre: 'CAJA', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '11', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '1110', nombre: 'BANCOS', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '11', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '111005', nombre: 'Banco - Cuenta Corriente', tipo: 'activo', naturaleza: 'deudor', nivel: 4, padreCodigo: '1110', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '111010', nombre: 'Banco - Cuenta Ahorros', tipo: 'activo', naturaleza: 'deudor', nivel: 4, padreCodigo: '1110', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '1115', nombre: 'MONEDAS EXTRANJERAS', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '11', aceptaMovimiento: false },
    { codigo: '1120', nombre: 'INVERSIONES TEMPORALES', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '11', aceptaMovimiento: false },

    { codigo: '13', nombre: 'DEUDORES', tipo: 'activo', naturaleza: 'deudor', nivel: 2, padreCodigo: '1', aceptaMovimiento: false },
    { codigo: '1305', nombre: 'CLIENTES', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '13', aceptaMovimiento: true, requiereTercero: true, requiereCentroCosto: true },
    { codigo: '1310', nombre: 'CUENTAS POR COBRAR COMERCIALES', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '13', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '1315', nombre: 'CUENTAS POR COBRAR A EMPLEADOS', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '13', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '1320', nombre: 'ANTICIPOS Y AVANZOS', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '13', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '1330', nombre: 'RETENCIONES EN FAVOR', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '13', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '1335', nombre: 'IVA DESCONTABLE', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '13', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '1340', nombre: 'IVA GENERADO', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '13', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '1365', nombre: 'OTROS DEUDORES', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '13', aceptaMovimiento: true, requiereTercero: true },

    { codigo: '14', nombre: 'INVENTARIOS', tipo: 'activo', naturaleza: 'deudor', nivel: 2, padreCodigo: '1', aceptaMovimiento: false },
    { codigo: '1405', nombre: 'MERCANCIAS NO FABRICADAS', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '14', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '1410', nombre: 'PRODUCTOS EN PROCESO', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '14', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '1415', nombre: 'PRODUCTOS TERMINADOS', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '14', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '1420', nombre: 'MATERIAS PRIMAS', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '14', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '1425', nombre: 'MATERIALES DE EMPAQUE Y EMBALAJE', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '14', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '1430', nombre: 'REPUESTOS Y ACCESORIOS', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '14', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '1435', nombre: 'EN TRANSITO', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '14', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '1440', nombre: 'EXISTENCIAS POR RECIBIR', tipo: 'activo', naturaleza: 'deudor', nivel: 3, padreCodigo: '14', aceptaMovimiento: true, requiereTercero: false },

    // PASIVOS (2)
    { codigo: '2', nombre: 'PASIVOS', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 1, aceptaMovimiento: false },
    { codigo: '21', nombre: 'OBLIGACIONES FINANCIERAS', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 2, padreCodigo: '2', aceptaMovimiento: false },
    { codigo: '2105', nombre: 'BANCOS NACIONALES', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '21', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '2110', nombre: 'OBLIGACIONES CON ENTIDADES FINANCIERAS', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '21', aceptaMovimiento: true, requiereTercero: true },

    { codigo: '22', nombre: 'PROVEEDORES Y CUENTAS POR PAGAR', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 2, padreCodigo: '2', aceptaMovimiento: false },
    { codigo: '2205', nombre: 'PROVEEDORES NACIONALES', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '22', aceptaMovimiento: true, requiereTercero: true, requiereCentroCosto: true },
    { codigo: '2210', nombre: 'PROVEEDORES EXTRANJEROS', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '22', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '2215', nombre: 'CUENTAS POR PAGAR', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '22', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '2220', nombre: 'COSTOS Y GASTOS POR PAGAR', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '22', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '2225', nombre: 'ANTICIPO RECIBIDO DE CLIENTES', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '22', aceptaMovimiento: true, requiereTercero: true },

    { codigo: '23', nombre: 'CUENTAS POR PAGAR A ENTIDADES OFICIALES', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 2, padreCodigo: '2', aceptaMovimiento: false },
    { codigo: '2305', nombre: 'RETENCIÓN EN LA FUENTE', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '23', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '2310', nombre: 'RETENCIÓN DE IVA', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '23', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '2315', nombre: 'RETENCIÓN DE ICA', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '23', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '2320', nombre: 'IVA POR PAGAR', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '23', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '2325', nombre: 'IMPUESTO DE INDUSTRIA Y COMERCIO', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '23', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '2330', nombre: 'IMPUESTO PREDIAL', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '23', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '2335', nombre: 'CONTRIBUCIONES ESPECIALES', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '23', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '2340', nombre: 'SEGURIDAD SOCIAL', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '23', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '234005', nombre: 'Salud - EPS', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2340', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '234010', nombre: 'Pensión - AFP', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2340', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '234015', nombre: 'Fondo Solidaridad Pensional', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2340', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '234020', nombre: 'Riesgos Laborales - ARL', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2340', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '234025', nombre: 'Caja de Compensación', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2340', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '234030', nombre: 'ICBF', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2340', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '234035', nombre: 'SENA', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2340', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '234040', nombre: 'Cesantías', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2340', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '234045', nombre: 'Intereses Cesantías', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2340', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '234050', nombre: 'Prima de Servicios', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2340', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '234055', nombre: 'Vacaciones', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2340', aceptaMovimiento: true, requiereTercero: false },

    { codigo: '2345', nombre: 'IMPUESTOS DIFERIDOS', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '23', aceptaMovimiento: false },
    { codigo: '2350', nombre: 'ESTIMACIONES Y PROVISIONES', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '23', aceptaMovimiento: false },
    { codigo: '235005', nombre: 'Provisión Cesantías', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2350', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '235010', nombre: 'Provisión Intereses Cesantías', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2350', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '235015', nombre: 'Provisión Prima Servicios', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2350', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '235020', nombre: 'Provisión Vacaciones', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2350', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '235025', nombre: 'Provisión ARL', tipo: 'pasivo', naturaleza: 'acreedor', nivel: 4, padreCodigo: '2350', aceptaMovimiento: true, requiereTercero: false },

    // PATRIMONIO (3)
    { codigo: '3', nombre: 'PATRIMONIO', tipo: 'patrimonio', naturaleza: 'acreedor', nivel: 1, aceptaMovimiento: false },
    { codigo: '31', nombre: 'CAPITAL', tipo: 'patrimonio', naturaleza: 'acreedor', nivel: 2, padreCodigo: '3', aceptaMovimiento: false },
    { codigo: '3105', nombre: 'CAPITAL SUSCRITO Y PAGADO', tipo: 'patrimonio', naturaleza: 'acreedor', nivel: 3, padreCodigo: '31', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '3110', nombre: 'CAPITAL SUSCRITO NO PAGADO', tipo: 'patrimonio', naturaleza: 'acreedor', nivel: 3, padreCodigo: '31', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '3115', nombre: 'SUPERÁVIT EN COLOCACIÓN DE ACCIONES', tipo: 'patrimonio', naturaleza: 'acreedor', nivel: 3, padreCodigo: '31', aceptaMovimiento: true, requiereTercero: false },

    { codigo: '33', nombre: 'RESERVAS', tipo: 'patrimonio', naturaleza: 'acreedor', nivel: 2, padreCodigo: '3', aceptaMovimiento: false },
    { codigo: '3305', nombre: 'RESERVA LEGAL', tipo: 'patrimonio', naturaleza: 'acreedor', nivel: 3, padreCodigo: '33', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '3310', nombre: 'RESERVA ESTATUTARIA', tipo: 'patrimonio', naturaleza: 'acreedor', nivel: 3, padreCodigo: '33', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '3315', nombre: 'RESERVA OCASIONAL', tipo: 'patrimonio', naturaleza: 'acreedor', nivel: 3, padreCodigo: '33', aceptaMovimiento: true, requiereTercero: false },

    { codigo: '34', nombre: 'RESULTADOS DEL EJERCICIO', tipo: 'patrimonio', naturaleza: 'acreedor', nivel: 2, padreCodigo: '3', aceptaMovimiento: false },
    { codigo: '3405', nombre: 'RESULTADOS ACUMULADOS', tipo: 'patrimonio', naturaleza: 'acreedor', nivel: 3, padreCodigo: '34', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '3410', nombre: 'RESULTADO DEL EJERCICIO', tipo: 'patrimonio', naturaleza: 'acreedor', nivel: 3, padreCodigo: '34', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '3415', nombre: 'DIVIDENDOS DECRETADOS', tipo: 'patrimonio', naturaleza: 'deudor', nivel: 3, padreCodigo: '34', aceptaMovimiento: true, requiereTercero: false },

    // INGRESOS (4)
    { codigo: '4', nombre: 'INGRESOS', tipo: 'ingreso', naturaleza: 'acreedor', nivel: 1, aceptaMovimiento: false },
    { codigo: '41', nombre: 'INGRESOS OPERACIONALES', tipo: 'ingreso', naturaleza: 'acreedor', nivel: 2, padreCodigo: '4', aceptaMovimiento: false },
    { codigo: '4105', nombre: 'VENTAS NACIONALES', tipo: 'ingreso', naturaleza: 'acreedor', nivel: 3, padreCodigo: '41', aceptaMovimiento: true, requiereTercero: true, requiereCentroCosto: true },
    { codigo: '4110', nombre: 'VENTAS EXPORTACIÓN', tipo: 'ingreso', naturaleza: 'acreedor', nivel: 3, padreCodigo: '41', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '4115', nombre: 'DEVOLUCIONES EN VENTAS', tipo: 'ingreso', naturaleza: 'deudor', nivel: 3, padreCodigo: '41', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '4120', nombre: 'DESCUENTOS EN VENTAS', tipo: 'ingreso', naturaleza: 'deudor', nivel: 3, padreCodigo: '41', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '4125', nombre: 'REBAJAS EN VENTAS', tipo: 'ingreso', naturaleza: 'deudor', nivel: 3, padreCodigo: '41', aceptaMovimiento: true, requiereTercero: true },

    { codigo: '42', nombre: 'INGRESOS NO OPERACIONALES', tipo: 'ingreso', naturaleza: 'acreedor', nivel: 2, padreCodigo: '4', aceptaMovimiento: false },
    { codigo: '4205', nombre: 'INTERESES GANADOS', tipo: 'ingreso', naturaleza: 'acreedor', nivel: 3, padreCodigo: '42', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '4210', nombre: 'DIVIDENDOS GANADOS', tipo: 'ingreso', naturaleza: 'acreedor', nivel: 3, padreCodigo: '42', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '4215', nombre: 'ARRIENDOS GANADOS', tipo: 'ingreso', naturaleza: 'acreedor', nivel: 3, padreCodigo: '42', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '4220', nombre: 'REGALÍAS GANADAS', tipo: 'ingreso', naturaleza: 'acreedor', nivel: 3, padreCodigo: '42', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '4225', nombre: 'UTILIDAD EN VENTA DE ACTIVOS', tipo: 'ingreso', naturaleza: 'acreedor', nivel: 3, padreCodigo: '42', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '4230', nombre: 'RECUPERACIÓN DE PROVISIONES', tipo: 'ingreso', naturaleza: 'acreedor', nivel: 3, padreCodigo: '42', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '4235', nombre: 'OTROS INGRESOS', tipo: 'ingreso', naturaleza: 'acreedor', nivel: 3, padreCodigo: '42', aceptaMovimiento: true, requiereTercero: false },

    // GASTOS (5)
    { codigo: '5', nombre: 'GASTOS', tipo: 'gasto', naturaleza: 'deudor', nivel: 1, aceptaMovimiento: false },
    { codigo: '51', nombre: 'GASTOS DE ADMINISTRACIÓN', tipo: 'gasto', naturaleza: 'deudor', nivel: 2, padreCodigo: '5', aceptaMovimiento: false },
    { codigo: '5105', nombre: 'SUELDOS Y SALARIOS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5110', nombre: 'HORAS EXTRAS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5115', nombre: 'PRIMAS LEGALES', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5120', nombre: 'CESANTÍAS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5125', nombre: 'INTERESES SOBRE CESANTÍAS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5130', nombre: 'VACACIONES', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5135', nombre: 'APORTES PATRONALES', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5140', nombre: 'DOTACIÓN Y SUMINISTROS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5145', nombre: 'CAPACITACIÓN', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5150', nombre: 'VIÁTICOS Y GASTOS DE VIAJE', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5155', nombre: 'IMPUESTOS Y TASAS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5160', nombre: 'ARRENDAMIENTOS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5165', nombre: 'SEGUROS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5170', nombre: 'MANTENIMIENTO Y REPARACIONES', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5175', nombre: 'SERVICIOS PÚBLICOS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5180', nombre: 'COMUNICACIONES', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5185', nombre: 'PAPELERÍA Y ÚTILES', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5190', nombre: 'GASTOS LEGALES Y NOTARIALES', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5195', nombre: 'OTROS GASTOS DE ADMINISTRACIÓN', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '51', aceptaMovimiento: true, requiereCentroCosto: true },

    { codigo: '52', nombre: 'GASTOS DE VENTAS', tipo: 'gasto', naturaleza: 'deudor', nivel: 2, padreCodigo: '5', aceptaMovimiento: false },
    { codigo: '5205', nombre: 'COMISIONES SOBRE VENTAS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '52', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5210', nombre: 'PUBLICIDAD Y PROPAGANDA', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '52', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5215', nombre: 'ENVASES Y EMBALAJES', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '52', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5220', nombre: 'TRANSPORTE Y FLETES', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '52', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5225', nombre: 'EXPOSICIONES Y FERIAS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '52', aceptaMovimiento: true, requiereCentroCosto: true },
    { codigo: '5230', nombre: 'OTROS GASTOS DE VENTAS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '52', aceptaMovimiento: true, requiereCentroCosto: true },

    { codigo: '53', nombre: 'GASTOS FINANCIEROS', tipo: 'gasto', naturaleza: 'deudor', nivel: 2, padreCodigo: '5', aceptaMovimiento: false },
    { codigo: '5305', nombre: 'INTERESES PAGADOS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '53', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '5310', nombre: 'COMISIONES BANCARIAS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '53', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '5315', nombre: 'DIFERENCIA EN CAMBIO', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '53', aceptaMovimiento: true, requiereTercero: false },
    { codigo: '5320', nombre: 'GASTOS FINANCIEROS VARIOS', tipo: 'gasto', naturaleza: 'deudor', nivel: 3, padreCodigo: '53', aceptaMovimiento: true, requiereTercero: false },

    // COSTOS (6)
    { codigo: '6', nombre: 'COSTOS DE VENTAS / PRODUCCIÓN', tipo: 'costo', naturaleza: 'deudor', nivel: 1, aceptaMovimiento: false },
    { codigo: '61', nombre: 'COSTO DE MERCANCÍAS VENDIDAS', tipo: 'costo', naturaleza: 'deudor', nivel: 2, padreCodigo: '6', aceptaMovimiento: false },
    { codigo: '6105', nombre: 'COMPRAS', tipo: 'costo', naturaleza: 'deudor', nivel: 3, padreCodigo: '61', aceptaMovimiento: true, requiereTercero: true, requiereCentroCosto: true },
    { codigo: '6110', nombre: 'DEVOLUCIONES EN COMPRAS', tipo: 'costo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '61', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '6115', nombre: 'DESCUENTOS EN COMPRAS', tipo: 'costo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '61', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '6120', nombre: 'REBAJAS EN COMPRAS', tipo: 'costo', naturaleza: 'acreedor', nivel: 3, padreCodigo: '61', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '6125', nombre: 'GASTOS DE ADQUISICIÓN', tipo: 'costo', naturaleza: 'deudor', nivel: 3, padreCodigo: '61', aceptaMovimiento: true, requiereTercero: true },
    { codigo: '6130', nombre: 'VARIACIÓN DE INVENTARIOS', tipo: 'costo', naturaleza: 'deudor', nivel: 3, padreCodigo: '61', aceptaMovimiento: true, requiereTercero: false },
  ];

  // Insert in order, resolving padreCodigo to padreId
  const accountMap = new Map<string, number>();
  
  for (const acc of accounts) {
    let padreId: number | null = null;
    if (acc.padreCodigo) {
      padreId = accountMap.get(acc.padreCodigo) || null;
    }
    
    const inserted = await db.insert(schema.accounts).values({
      tenantId: 'default',
      codigo: acc.codigo,
      nombre: acc.nombre,
      tipo: acc.tipo as any,
      naturaleza: acc.naturaleza as any,
      nivel: acc.nivel,
      padreId: padreId ?? undefined,
      aceptaMovimiento: acc.aceptaMovimiento,
      requiereTercero: acc.requiereTercero ?? false,
      requiereCentroCosto: acc.requiereCentroCosto ?? false,
      activo: true,
    }).returning({ id: schema.accounts.id });
    
    accountMap.set(acc.codigo, inserted[0].id);
  }
}

export async function closeDatabase() {
  const { closeDb } = await import('./index');
  await closeDb();
}