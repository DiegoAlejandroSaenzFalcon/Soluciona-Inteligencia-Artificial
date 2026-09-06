/**
 * User Entity - Authentication and authorization
 */
import { AggregateRoot } from './base';
import { Result } from '../../shared/kernel/result';
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
export declare class User extends AggregateRoot<UserProps> {
    private constructor();
    static create(props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt' | 'failedLoginAttempts' | 'lockedUntil' | 'createdAt' | 'updatedAt'>): Result<User, Error>;
    static reconstitute(props: UserProps): User;
    get email(): string;
    get nombre(): string | null;
    get role(): UserRole;
    get activo(): boolean;
    get tenantId(): string;
    get twoFactorEnabled(): boolean;
    get mustChangePassword(): boolean;
    verifyPassword(password: string, hash: string): Promise<boolean>;
    changePassword(newHash: string): Promise<Result<void, Error>>;
    recordFailedLogin(): void;
    recordSuccessfulLogin(): void;
    enable2FA(secret: string, backupCodes: string[]): Result<void, Error>;
    disable2FA(): void;
    addPasskey(passkey: Omit<PasskeyCredential, 'id' | 'createdAt'>): void;
    removePasskey(passkeyId: string): boolean;
    isLocked(): boolean;
    hasPermission(permission: string): boolean;
    updateProfile(nombre: string | null, telefono: string | null): void;
    updatePreferences(preferences: Record<string, unknown>): void;
    deactivate(): void;
    activate(): void;
}
//# sourceMappingURL=user.d.ts.map