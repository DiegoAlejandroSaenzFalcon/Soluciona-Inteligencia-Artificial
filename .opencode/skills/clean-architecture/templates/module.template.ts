/**
 * Module Template - Clean Architecture Module Structure
 * Ubicación: src/<feature>/index.ts (barrel export)
 * 
 * Estructura de un módulo completo:
 * src/<feature>/
 *   ├── domain/
 *   │   ├── entities/
 *   │   │   ├── <entity-name>.ts
 *   │   │   └── value-objects/
 *   │   ├── repositories/
 *   │   │   └── <entity-name>.repository.ts (interface)
 *   │   └── events/
 *   │       └── <entity-name>.events.ts
 *   ├── application/
 *   │   ├── use-cases/
 *   │   │   ├── create-<entity-name>.use-case.ts
 *   │   │   ├── update-<entity-name>.use-case.ts
 *   │   │   ├── get-<entity-name>.use-case.ts
 *   │   │   ├── list-<entity-name>.use-case.ts
 *   │   │   └── delete-<entity-name>.use-case.ts
 *   │   └── dto/
 *   │       └── <entity-name>.dto.ts
 *   ├── infrastructure/
 *   │   ├── database/
 *   │   │   └── <entity-name>.repository.impl.ts
 *   │   └── external/
 *   │       └── <external-service>.adapter.ts
 *   ├── interfaces/
 *   │   └── http/
 *   │       └── routes/
 *   │           └── <feature>.routes.ts
 *   └── index.ts (este archivo)
 */

// ============================================
// DOMAIN EXPORTS
// ============================================
export * from './domain/entities/<entity-name>';
export * from './domain/repositories/<entity-name>.repository';
export * from './domain/events/<entity-name>.events';

// ============================================
// APPLICATION EXPORTS
// ============================================
export * from './application/use-cases/create-<entity-name>.use-case';
export * from './application/use-cases/update-<entity-name>.use-case';
export * from './application/use-cases/get-<entity-name>.use-case';
export * from './application/use-cases/list-<entity-name>.use-case';
export * from './application/use-cases/delete-<entity-name>.use-case';
export * from './application/dto/<entity-name>.dto';

// ============================================
// INFRASTRUCTURE EXPORTS (Solo implementaciones)
// ============================================
// NOTA: No exportar implementaciones directamente, usar DI tokens
// export { <EntityName>RepositoryImpl } from './infrastructure/database/<entity-name>.repository.impl';

// ============================================
// INTERFACES EXPORTS
// ============================================
export * from './interfaces/http/routes/<feature>.routes';

// ============================================
// MODULE CONFIGURATION (para DI Container)
// ============================================
import { Container } from 'inversify'; // O tu DI container
import { I<EntityName>Repository } from './domain/repositories/<entity-name>.repository';
import { <EntityName>RepositoryImpl } from './infrastructure/database/<entity-name>.repository.impl';
import { Create<EntityName>UseCase } from './application/use-cases/create-<entity-name>.use-case';
import { Update<EntityName>UseCase } from './application/use-cases/update-<entity-name>.use-case';
import { Get<EntityName>UseCase } from './application/use-cases/get-<entity-name>.use-case';
import { List<EntityName>UseCase } from './application/use-cases/list-<entity-name>.use-case';
import { Delete<EntityName>UseCase } from './application/use-cases/delete-<entity-name>.use-case';

export const <Feature>Module = {
  name: '<feature>',
  version: '1.0.0',
  dependencies: [
    // Otros módulos requeridos
    'shared',
    'auth',
  ],
  providers: [
    // Repositories
    { provide: I<EntityName>Repository, useClass: <EntityName>RepositoryImpl },
    
    // Use Cases
    Create<EntityName>UseCase,
    Update<EntityName>UseCase,
    Get<EntityName>UseCase,
    List<EntityName>UseCase,
    Delete<EntityName>UseCase,
  ],
  routes: [
    // Se registran automáticamente via fastify plugin
  ],
};

// Auto-registration function
export function register<Feature>Module(container: Container): void {
  // Repositories
  container.bind(I<EntityName>Repository).to(<EntityName>RepositoryImpl).inSingletonScope();
  
  // Use Cases (transient para request-scoped si necesario)
  container.bind(Create<EntityName>UseCase).toSelf();
  container.bind(Update<EntityName>UseCase).toSelf();
  container.bind(Get<EntityName>UseCase).toSelf();
  container.bind(List<EntityName>UseCase).toSelf();
  container.bind(Delete<EntityName>UseCase).toSelf();
}

// ============================================
// FEATURE FLAGS (para conditional loading)
// ============================================
export const <FEATURE>_FEATURES = {
  create: true,
  read: true,
  update: true,
  delete: true,
  list: true,
  // Feature-specific
  advancedSearch: true,
  export: false,
  import: false,
} as const;

export function is<Feature>Enabled(feature: keyof typeof <FEATURE>_FEATURES): boolean {
  return <FEATURE>_FEATURES[feature];
}

// ============================================
// EVENTS (Domain Events publicados por este módulo)
// ============================================
export const <FEATURE>_DOMAIN_EVENTS = [
  '<EntityName>Created',
  '<EntityName>Updated',
  '<EntityName>Deleted',
  '<EntityName>Activated',
  '<EntityName>Deactivated',
  // Eventos específicos del dominio
] as const;

export type <Feature>DomainEventType = typeof <FEATURE>_DOMAIN_EVENTS[number];