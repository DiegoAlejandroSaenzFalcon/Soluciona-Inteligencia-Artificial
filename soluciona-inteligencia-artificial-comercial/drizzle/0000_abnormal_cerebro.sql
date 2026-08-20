DO $$ BEGIN
 CREATE TYPE "public"."config_section" AS ENUM('negocio', 'menu', 'ia', 'domicilios', 'pagos', 'nomina', 'bi', 'integraciones', 'notificaciones');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."invoice_status" AS ENUM('borrador', 'emitida', 'anulada', 'rechazada_dian');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."movement_type" AS ENUM('entrada', 'salida', 'ajuste_positivo', 'ajuste_negativo', 'traslado_entrada', 'traslado_salida');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."order_status" AS ENUM('recibido', 'en_cocina', 'listo', 'entregado', 'cancelado');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."order_type" AS ENUM('domicilio', 'recoger');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_method" AS ENUM('efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata', 'pse', 'credito');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_status" AS ENUM('pendiente', 'parcial', 'pagado', 'anulado');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."purchase_order_status" AS ENUM('borrador', 'enviada', 'parcial', 'recibida', 'cancelada');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."role" AS ENUM('admin', 'operador', 'cocina', 'solo_lectura');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"naturaleza" varchar(10) NOT NULL,
	"nivel" integer NOT NULL,
	"padre_id" integer,
	"acepta_movimiento" boolean DEFAULT false NOT NULL,
	"requiere_tercero" boolean DEFAULT false NOT NULL,
	"requiere_centro_costo" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"user_id" integer,
	"accion" varchar(100) NOT NULL,
	"entidad" varchar(100) NOT NULL,
	"entidad_id" varchar(50),
	"antes" jsonb,
	"despues" jsonb,
	"ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "config_secrets" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"key" varchar(100) NOT NULL,
	"value_encrypted" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "config_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"section" "config_section" NOT NULL,
	"payload" jsonb NOT NULL,
	"changed_by" integer NOT NULL,
	"ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"invoice_id" integer NOT NULL,
	"numero" varchar(30) NOT NULL,
	"prefijo" varchar(10) DEFAULT 'NC' NOT NULL,
	"fecha" timestamp DEFAULT now() NOT NULL,
	"motivo" varchar(100) NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"impuestos" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"cude" varchar(100),
	"estado" varchar(20) DEFAULT 'emitida' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"tipo_identificacion" varchar(10) DEFAULT 'CC' NOT NULL,
	"identificacion" varchar(30) NOT NULL,
	"dv" varchar(1),
	"nombre" varchar(200) NOT NULL,
	"nombre_comercial" varchar(200),
	"email" varchar(255),
	"telefono" varchar(20),
	"direccion" text,
	"ciudad" varchar(100),
	"regimen" varchar(20) DEFAULT 'común' NOT NULL,
	"responsable_iva" boolean DEFAULT true NOT NULL,
	"cupo_credito" numeric(14, 2) DEFAULT '0',
	"dias_credito" integer DEFAULT 0 NOT NULL,
	"vendedor_id" integer,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"product_id" integer,
	"descripcion" varchar(200) NOT NULL,
	"cantidad" numeric(10, 2) NOT NULL,
	"precio_unitario" numeric(14, 2) NOT NULL,
	"descuento" numeric(14, 2) DEFAULT '0' NOT NULL,
	"impuesto_codigo" varchar(10) DEFAULT '01' NOT NULL,
	"impuesto_porcentaje" numeric(5, 2) DEFAULT '19' NOT NULL,
	"total" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"customer_id" integer,
	"order_id" integer,
	"numero" varchar(30) NOT NULL,
	"prefijo" varchar(10) DEFAULT 'SETP' NOT NULL,
	"resolucion" varchar(30),
	"fecha" timestamp DEFAULT now() NOT NULL,
	"fecha_vencimiento" timestamp,
	"estado" "invoice_status" DEFAULT 'borrador' NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"descuento" numeric(14, 2) DEFAULT '0' NOT NULL,
	"impuestos" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"saldo_pendiente" numeric(14, 2) DEFAULT '0' NOT NULL,
	"cufe" varchar(100),
	"qr_url" varchar(500),
	"xml_url" varchar(500),
	"pdf_url" varchar(500),
	"observacion" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"numero" varchar(30) NOT NULL,
	"fecha" timestamp NOT NULL,
	"concepto" text NOT NULL,
	"referencia_tipo" varchar(50),
	"referencia_id" integer,
	"total_debito" numeric(16, 2) DEFAULT '0' NOT NULL,
	"total_credito" numeric(16, 2) DEFAULT '0' NOT NULL,
	"estado" varchar(20) DEFAULT 'borrador' NOT NULL,
	"creado_por" integer,
	"contabilizado_por" integer,
	"fecha_contabilizacion" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journal_entry_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"tercero_id" integer,
	"tercero_tipo" varchar(20),
	"centro_costo" varchar(50),
	"debito" numeric(16, 2) DEFAULT '0' NOT NULL,
	"credito" numeric(16, 2) DEFAULT '0' NOT NULL,
	"concepto" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"invoice_id" integer,
	"purchase_order_id" integer,
	"customer_id" integer,
	"supplier_id" integer,
	"tipo" varchar(20) NOT NULL,
	"metodo" "payment_method" NOT NULL,
	"referencia" varchar(50),
	"monto" numeric(14, 2) NOT NULL,
	"fecha" timestamp DEFAULT now() NOT NULL,
	"estado" varchar(20) DEFAULT 'aplicado' NOT NULL,
	"observacion" text,
	"creado_por" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"dias_laborados" integer DEFAULT 0 NOT NULL,
	"salario_basico" numeric(14, 2) NOT NULL,
	"auxilio_transporte" numeric(14, 2) DEFAULT '0' NOT NULL,
	"horas_extra_diurnas" numeric(10, 2) DEFAULT '0' NOT NULL,
	"horas_extra_nocturnas" numeric(10, 2) DEFAULT '0' NOT NULL,
	"horas_extra_dominicales" numeric(10, 2) DEFAULT '0' NOT NULL,
	"horas_extra_festivas" numeric(10, 2) DEFAULT '0' NOT NULL,
	"valor_horas_extra" numeric(14, 2) DEFAULT '0' NOT NULL,
	"comisiones" numeric(14, 2) DEFAULT '0' NOT NULL,
	"bonificaciones" numeric(14, 2) DEFAULT '0' NOT NULL,
	"otros_ingresos" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_devengado" numeric(14, 2) DEFAULT '0' NOT NULL,
	"salud" numeric(14, 2) DEFAULT '0' NOT NULL,
	"pension" numeric(14, 2) DEFAULT '0' NOT NULL,
	"fondo_solidaridad" numeric(14, 2) DEFAULT '0' NOT NULL,
	"retencion_fuente" numeric(14, 2) DEFAULT '0' NOT NULL,
	"anticipos" numeric(14, 2) DEFAULT '0' NOT NULL,
	"prestamos" numeric(14, 2) DEFAULT '0' NOT NULL,
	"otros_descuentos" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_deducciones" numeric(14, 2) DEFAULT '0' NOT NULL,
	"neto_pagar" numeric(14, 2) DEFAULT '0' NOT NULL,
	"prov_cesantias" numeric(14, 2) DEFAULT '0' NOT NULL,
	"prov_intereses_cesantias" numeric(14, 2) DEFAULT '0' NOT NULL,
	"prov_prima" numeric(14, 2) DEFAULT '0' NOT NULL,
	"prov_vacaciones" numeric(14, 2) DEFAULT '0' NOT NULL,
	"prov_arl" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"tipo_identificacion" varchar(10) DEFAULT 'CC' NOT NULL,
	"identificacion" varchar(30) NOT NULL,
	"dv" varchar(1),
	"nombres" varchar(100) NOT NULL,
	"apellidos" varchar(100) NOT NULL,
	"email" varchar(255),
	"telefono" varchar(20),
	"fecha_nacimiento" timestamp,
	"genero" varchar(10),
	"estado_civil" varchar(20),
	"direccion" text,
	"ciudad" varchar(100),
	"telefono_emergencia" varchar(20),
	"contacto_emergencia" varchar(100),
	"eps" varchar(100),
	"fondo_pension" varchar(100),
	"tipo_contrato" varchar(30) NOT NULL,
	"cargo" varchar(100) NOT NULL,
	"salario_basico" numeric(14, 2) NOT NULL,
	"auxilio_transporte" boolean DEFAULT false NOT NULL,
	"eps_porcentaje" numeric(5, 2) DEFAULT '4.00' NOT NULL,
	"pension_porcentaje" numeric(5, 2) DEFAULT '4.00' NOT NULL,
	"arl_nivel" varchar(10) DEFAULT 'I' NOT NULL,
	"fecha_ingreso" timestamp NOT NULL,
	"fecha_retiro" timestamp,
	"motivo_retiro" varchar(100),
	"banco" varchar(50),
	"tipo_cuenta" varchar(20),
	"numero_cuenta" varchar(30),
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"fecha_inicio" timestamp NOT NULL,
	"fecha_fin" timestamp NOT NULL,
	"fecha_pago" timestamp,
	"estado" varchar(20) DEFAULT 'borrador' NOT NULL,
	"creado_por" integer,
	"aprobado_por" integer,
	"fecha_aprobacion" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"sku" varchar(50),
	"precio_adicional" numeric(14, 2) DEFAULT '0' NOT NULL,
	"stock" numeric(10, 2) DEFAULT '0' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"category_id" integer,
	"codigo" varchar(50),
	"codigo_barras" varchar(100),
	"nombre" varchar(200) NOT NULL,
	"descripcion" text,
	"ingredientes" text,
	"precio" numeric(14, 2) NOT NULL,
	"costo" numeric(14, 2),
	"unidad_medida" varchar(20) DEFAULT 'unidad' NOT NULL,
	"maneja_stock" boolean DEFAULT true NOT NULL,
	"stock_minimo" numeric(10, 2) DEFAULT '0',
	"stock_maximo" numeric(10, 2),
	"ubicacion" varchar(100),
	"imagen_url" varchar(500),
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"impuestos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_order_id" integer NOT NULL,
	"product_id" integer,
	"variant_id" integer,
	"descripcion" varchar(200) NOT NULL,
	"cantidad" numeric(10, 2) NOT NULL,
	"cantidad_recibida" numeric(10, 2) DEFAULT '0' NOT NULL,
	"precio_unitario" numeric(14, 2) NOT NULL,
	"descuento" numeric(14, 2) DEFAULT '0' NOT NULL,
	"impuesto_porcentaje" numeric(5, 2) DEFAULT '19' NOT NULL,
	"total" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"supplier_id" integer NOT NULL,
	"numero" varchar(30) NOT NULL,
	"estado" "purchase_order_status" DEFAULT 'borrador' NOT NULL,
	"fecha" timestamp DEFAULT now() NOT NULL,
	"fecha_entrega_esperada" timestamp,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"descuento" numeric(14, 2) DEFAULT '0' NOT NULL,
	"impuestos" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"observacion" text,
	"creado_por" integer,
	"aprobado_por" integer,
	"fecha_aprobacion" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_receipt_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_receipt_id" integer NOT NULL,
	"po_item_id" integer,
	"product_id" integer NOT NULL,
	"variant_id" integer,
	"cantidad" numeric(10, 2) NOT NULL,
	"precio_unitario" numeric(14, 2) NOT NULL,
	"lote" varchar(50),
	"fecha_vencimiento" timestamp,
	"ubicacion" varchar(100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"purchase_order_id" integer NOT NULL,
	"numero" varchar(30) NOT NULL,
	"fecha" timestamp DEFAULT now() NOT NULL,
	"observacion" text,
	"recibido_por" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_permissions" (
	"role" "role" NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "role_permissions_role_permission_id_pk" PRIMARY KEY("role","permission_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"ip" varchar(45),
	"user_agent" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"product_id" integer NOT NULL,
	"variant_id" integer,
	"bodega" varchar(50) DEFAULT 'principal' NOT NULL,
	"cantidad" numeric(12, 2) DEFAULT '0' NOT NULL,
	"reservado" numeric(12, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"product_id" integer NOT NULL,
	"variant_id" integer,
	"bodega" varchar(50) DEFAULT 'principal' NOT NULL,
	"tipo" "movement_type" NOT NULL,
	"cantidad" numeric(12, 2) NOT NULL,
	"costo_unitario" numeric(14, 2),
	"referencia_tipo" varchar(50),
	"referencia_id" integer,
	"observacion" text,
	"usuario_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"tipo_identificacion" varchar(10) DEFAULT 'NIT' NOT NULL,
	"identificacion" varchar(30) NOT NULL,
	"dv" varchar(1),
	"nombre" varchar(200) NOT NULL,
	"nombre_comercial" varchar(200),
	"email" varchar(255),
	"telefono" varchar(20),
	"direccion" text,
	"ciudad" varchar(100),
	"pais" varchar(50) DEFAULT 'CO' NOT NULL,
	"regimen" varchar(20) DEFAULT 'común' NOT NULL,
	"responsable_iva" boolean DEFAULT true NOT NULL,
	"retencion_fuente" numeric(5, 2) DEFAULT '0',
	"retencion_iva" numeric(5, 2) DEFAULT '0',
	"retencion_ica" numeric(5, 2) DEFAULT '0',
	"dias_credito" integer DEFAULT 0 NOT NULL,
	"cupo_credito" numeric(14, 2) DEFAULT '0',
	"banco" varchar(50),
	"tipo_cuenta" varchar(20),
	"numero_cuenta" varchar(30),
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"segmento" varchar(20) DEFAULT 'comidas' NOT NULL,
	"ciiu" varchar(10),
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_permissions" (
	"user_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"granted" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_permissions_user_id_permission_id_pk" PRIMARY KEY("user_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"telefono" varchar(20),
	"role" "role" DEFAULT 'operador' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" varchar(255),
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_padre_id_accounts_id_fk" FOREIGN KEY ("padre_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "config_secrets" ADD CONSTRAINT "config_secrets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "config_versions" ADD CONSTRAINT "config_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "config_versions" ADD CONSTRAINT "config_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_vendedor_id_users_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_creado_por_users_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_contabilizado_por_users_id_fk" FOREIGN KEY ("contabilizado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_entry_id_journal_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_creado_por_users_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_details" ADD CONSTRAINT "payroll_details_period_id_payroll_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_details" ADD CONSTRAINT "payroll_details_employee_id_payroll_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."payroll_employees"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_employees" ADD CONSTRAINT "payroll_employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_creado_por_users_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_aprobado_por_users_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_creado_por_users_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_aprobado_por_users_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_receipt_id_purchase_receipts_id_fk" FOREIGN KEY ("purchase_receipt_id") REFERENCES "public"."purchase_receipts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_po_item_id_purchase_order_items_id_fk" FOREIGN KEY ("po_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_recibido_por_users_id_fk" FOREIGN KEY ("recibido_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock" ADD CONSTRAINT "stock_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock" ADD CONSTRAINT "stock_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock" ADD CONSTRAINT "stock_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_tenant_codigo_unique" ON "accounts" USING btree ("tenant_id","codigo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_tenant_padre_idx" ON "accounts" USING btree ("tenant_id","padre_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_created_idx" ON "audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_created_idx" ON "audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entidad_idx" ON "audit_logs" USING btree ("entidad","entidad_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "categories_tenant_nombre_unique" ON "categories" USING btree ("tenant_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "config_secrets_tenant_key_unique" ON "config_secrets" USING btree ("tenant_id","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "config_versions_tenant_section_idx" ON "config_versions" USING btree ("tenant_id","section");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "config_versions_created_at_idx" ON "config_versions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "credit_notes_tenant_numero_unique" ON "credit_notes" USING btree ("tenant_id","prefijo","numero");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_notes_invoice_idx" ON "credit_notes" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenant_identificacion_unique" ON "customers" USING btree ("tenant_id","identificacion");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_tenant_nombre_idx" ON "customers" USING btree ("tenant_id","nombre");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoice_items_invoice_idx" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_tenant_numero_unique" ON "invoices" USING btree ("tenant_id","prefijo","numero");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_tenant_estado_idx" ON "invoices" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_customer_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_fecha_idx" ON "invoices" USING btree ("fecha");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "journal_entries_tenant_numero_unique" ON "journal_entries" USING btree ("tenant_id","numero");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_entries_tenant_fecha_idx" ON "journal_entries" USING btree ("tenant_id","fecha");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_entries_ref_idx" ON "journal_entries" USING btree ("referencia_tipo","referencia_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jel_entry_idx" ON "journal_entry_lines" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jel_account_idx" ON "journal_entry_lines" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_tenant_tipo_idx" ON "payments" USING btree ("tenant_id","tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_invoice_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_customer_idx" ON "payments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_supplier_idx" ON "payments" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_fecha_idx" ON "payments" USING btree ("fecha");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_details_period_employee_unique" ON "payroll_details" USING btree ("period_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_employees_tenant_identificacion_unique" ON "payroll_employees" USING btree ("tenant_id","identificacion");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_employees_tenant_activo_idx" ON "payroll_employees" USING btree ("tenant_id","activo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_periods_tenant_estado_idx" ON "payroll_periods" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "variants_product_sku_unique" ON "product_variants" USING btree ("product_id","sku");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "products_tenant_codigo_unique" ON "products" USING btree ("tenant_id","codigo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_tenant_nombre_idx" ON "products" USING btree ("tenant_id","nombre");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_tenant_activo_idx" ON "products" USING btree ("tenant_id","activo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "po_items_po_idx" ON "purchase_order_items" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_orders_tenant_numero_unique" ON "purchase_orders" USING btree ("tenant_id","numero");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_orders_tenant_estado_idx" ON "purchase_orders" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_orders_supplier_idx" ON "purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pr_items_pr_idx" ON "purchase_receipt_items" USING btree ("purchase_receipt_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_receipts_tenant_numero_unique" ON "purchase_receipts" USING btree ("tenant_id","numero");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_receipts_po_idx" ON "purchase_receipts" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_tenant_product_bodega_unique" ON "stock" USING btree ("tenant_id","product_id","variant_id","bodega");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_tenant_idx" ON "stock" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_tenant_created_idx" ON "stock_movements" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_ref_idx" ON "stock_movements" USING btree ("referencia_tipo","referencia_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_tenant_identificacion_unique" ON "suppliers" USING btree ("tenant_id","identificacion");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suppliers_tenant_nombre_idx" ON "suppliers" USING btree ("tenant_id","nombre");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenants_nombre_idx" ON "tenants" USING btree ("nombre");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenants_segmento_idx" ON "tenants" USING btree ("segmento");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_tenant_email_unique" ON "users" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_tenant_role_idx" ON "users" USING btree ("tenant_id","role");