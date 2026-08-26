// Test setup file - runs before all tests
// Mock everything BEFORE importing any modules that use node:sqlite

// Mock the config
vi.mock('@/config.js', () => ({
  config: {
    dataDir: ':memory:',
    clienteId: 'test',
    negocio: 'Test Business',
    panel_password: 'test123',
    jwt_issuer: 'test-issuer',
    jwt_audience: 'test-audience',
    llm: { proveedor: 'test', modelo: 'test', base_url: 'http://test', api_key: '', limite_diario: 1000, limite_mensual: 10000 },
    asistentes_ia: { modelo: 'test', api_key: '', limite_diario: 100, limite_mensual: 1000 },
    vision: { modelo: 'test', api_key: '', limite_diario: 100, limite_mensual: 1000 },
    gemini_api_key: '',
    gemini_model: 'test',
    integracion: { tipo: 'pos-propio' },
    facturacion: { proveedor: '', emision_automatica: false, estado_dispara: 'pagado', enviar_mail: true, email_remitente: '', email_cliente: '' },
    alertas: { telegram: { token: '', chat_id: '' } },
    segmento: 'comidas',
    ciiu: '',
    ubicacion_negocio: { lat: 0, lng: 0 },
    domicilios: { faixas: [], radio_max_entrega_km: 0, gratis_si_total_sobre: 0 },
    stock: {},
    mensaje_agotado: '',
    mensaje_llamada: '',
    recursos: [],
    paquetes: [],
  }
}));

// Mock the database modules
const mockTestDb = {
  exec: vi.fn(),
  prepare: vi.fn(() => ({
    all: vi.fn(),
    get: vi.fn(),
    run: vi.fn(),
  })),
  close: vi.fn(),
};

vi.mock('node:sqlite', () => ({
  DatabaseSync: vi.fn(() => mockTestDb),
}));

vi.mock('../../core/db-sqlite.js', () => ({
  db: { exec: vi.fn(), prepare: vi.fn(() => ({ all: vi.fn(), get: vi.fn(), run: vi.fn() })), close: vi.fn() },
  getDb: () => ({ exec: vi.fn(), prepare: vi.fn(() => ({ all: vi.fn(), get: vi.fn(), run: vi.fn() })), close: vi.fn() }),
  tenantId: 'test'
}));

vi.mock('../../src/db/connection.js', () => ({
  getClient: () => ({
    unsafe: vi.fn(),
    async begin(fn) { return fn(this); },
    async end() {},
  }),
  query: vi.fn(),
  closeConnection: () => Promise.resolve()
}));

vi.mock('../../config.js', () => ({
  config: {
    dataDir: ':memory:',
    clienteId: 'test',
    negocio: 'Test Business',
    panel_password: 'test123',
    jwt_issuer: 'test-issuer',
    jwt_audience: 'test-audience',
    llm: { proveedor: 'test', modelo: 'test', base_url: 'http://test', api_key: '', limite_diario: 1000, limite_mensual: 10000 },
    asistentes_ia: { modelo: 'test', api_key: '', limite_diario: 100, limite_mensual: 1000 },
    vision: { modelo: 'test', api_key: '', limite_diario: 100, limite_mensual: 1000 },
    gemini_api_key: '',
    gemini_model: 'test',
    integracion: { tipo: 'pos-propio' },
    facturacion: { proveedor: '', emision_automatica: false, estado_dispara: 'pagado', enviar_mail: true, email_remitente: '', email_cliente: '' },
    alertas: { telegram: { token: '', chat_id: '' } },
    segmento: 'comidas',
    ciiu: '',
    ubicacion_negocio: { lat: 0, lng: 0 },
    domicilios: { faixas: [], radio_max_entrega_km: 0, gratis_si_total_sobre: 0 },
    stock: {},
    mensaje_agotado: '',
    mensaje_llamada: '',
    recursos: [],
    paquetes: [],
  }
}));

// Mock the auth module's database dependencies
vi.mock('../../src/auth/index.js', () => {
  const originalModule = require('../../src/auth/index.js');
  return {
    ...originalModule,
    getClient: vi.fn(),
  };
});

export {};