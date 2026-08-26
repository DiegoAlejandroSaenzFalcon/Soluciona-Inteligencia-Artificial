/**
 * User Entity - Authentication and authorization
 */
import { AggregateRoot } from './base';
import { createDomainEvent } from '../../shared/kernel/events';
import { Result, Ok, Err } from '../../shared/kernel/result';

export type UserRole = 'super_admin' | 'admin' | 'gerente' | 'operador' | 'cocina' | 'domiciliario' | 'contador' | 'asesor' | 'solo_lectura';

export interface UserProps {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  nombre: string | null;
  telefono: string | null;
  role: UserRole;
  activo: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  twoFactorBackupCodes: string[];
  passkeys: PasskeyCredential[];
  lastLoginAt: Date | null;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  preferences: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PasskeyCredential {
  id: string;
  publicKey: string;
  counter: number;
  deviceType: 'singleDevice' | 'multiDevice';
  transports: string[];
  createdAt: Date;
}

export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps) {
    super(props);
  }

  static create(props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt' | 'failedLoginAttempts' | 'lockedUntil' | 'createdAt' | 'updatedAt'>): Result<User, Error> {
    if (!props.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.email)) {
      return Err(new Error('Invalid email format'));
    }

    if (!props.passwordHash || props.passwordHash.length < 60) {
      return Err(new Error('Invalid password hash'));
    }

    const user = new User({
      ...props,
      id: crypto.randomUUID(),
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    user.addDomainEvent(
      createDomainEvent('UserCreated', user.id, user.props.tenantId, {
        email: user.props.email,
        role: user.props.role,
      })
    );

    return Ok(user);
  }

  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  get email(): string { return this.props.email; }
  get nombre(): string | null { return this.props.nombre; }
  get role(): UserRole { return this.props.role; }
  get activo(): boolean { return this.props.activo; }
  get tenantId(): string { return this.props.tenantId; }
  get twoFactorEnabled(): boolean { return this.props.twoFactorEnabled; }
  get mustChangePassword(): boolean { return this.props.mustChangePassword; }

  verifyPassword(password: string, hash: string): Promise<boolean> {
    // This will be implemented by the application service using bcrypt
    // The entity just defines the interface
    return Promise.resolve(false);
  }

  async changePassword(newHash: string): Promise<Result<void, Error>> {
    this.props.passwordHash = newHash;
    this.props.mustChangePassword = false;
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = null;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      createDomainEvent('PasswordChanged', this.id, this.props.tenantId, {
        userId: this.id,
      })
    );

    return Ok(undefined);
  }

  recordFailedLogin(): void {
    this.props.failedLoginAttempts += 1;
    if (this.props.failedLoginAttempts >= 5) {
      this.props.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
    }
    this.props.updatedAt = new Date();
  }

  recordSuccessfulLogin(): void {
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = null;
    this.props.lastLoginAt = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      createDomainEvent('UserLoggedIn', this.id, this.props.tenantId, {
        userId: this.id,
      })
    );
  }

  enable2FA(secret: string, backupCodes: string[]): Result<void, Error> {
    this.props.twoFactorEnabled = true;
    this.props.twoFactorSecret = secret;
    this.props.twoFactorBackupCodes = backupCodes;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      createDomainEvent('TwoFactorEnabled', this.id, this.props.tenantId, {
        userId: this.id,
      })
    );

    return Ok(undefined);
  }

  disable2FA(): void {
    this.props.twoFactorEnabled = false;
    this.props.twoFactorSecret = null;
    this.props.twoFactorBackupCodes = [];
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      createDomainEvent('TwoFactorDisabled', this.id, this.props.tenantId, {
        userId: this.id,
      })
    );
  }

  addPasskey(passkey: Omit<PasskeyCredential, 'id' | 'createdAt'>): void {
    const newPasskey: PasskeyCredential = {
      ...passkey,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    this.props.passkeys.push(newPasskey);
    this.props.updatedAt = new Date();
  }

  removePasskey(passkeyId: string): boolean {
    const index = this.props.passkeys.findIndex((p) => p.id === passkeyId);
    if (index === -1) return false;
    this.props.passkeys.splice(index, 1);
    this.props.updatedAt = new Date();
    return true;
  }

  isLocked(): boolean {
    return this.props.lockedUntil !== null && this.props.lockedUntil > new Date();
  }

  hasPermission(permission: string): boolean {
    // This will be checked by the application service against role_permissions
    return true; // Placeholder - actual check in application service
  }

  updateProfile(nombre: string | null, telefono: string | null): void {
    this.props.nombre = nombre;
    this.props.telefono = telefono;
    this.props.updatedAt = new Date();
  }

  updatePreferences(preferences: Record<string, unknown>): void {
    this.props.preferences = { ...this.props.preferences, ...preferences };
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.activo = false;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      createDomainEvent('UserDeactivated', this.id, this.props.tenantId, {
        userId: this.id,
      })
    );
  }

  activate(): void {
    this.props.activo = true;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      createDomainEvent('UserActivated', this.id, this.props.tenantId, {
        userId: this.id,
      })
    );
  }
}