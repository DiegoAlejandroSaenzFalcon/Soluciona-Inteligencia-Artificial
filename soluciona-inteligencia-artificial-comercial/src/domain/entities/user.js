"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
/**
 * User Entity - Authentication and authorization
 */
const base_1 = require("./base");
const events_1 = require("../../shared/kernel/events");
const result_1 = require("../../shared/kernel/result");
class User extends base_1.AggregateRoot {
    constructor(props) {
        super(props);
    }
    static create(props) {
        if (!props.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.email)) {
            return (0, result_1.Err)(new Error('Invalid email format'));
        }
        if (!props.passwordHash || props.passwordHash.length < 60) {
            return (0, result_1.Err)(new Error('Invalid password hash'));
        }
        const user = new User({
            ...props,
            id: crypto.randomUUID(),
            failedLoginAttempts: 0,
            lockedUntil: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        user.addDomainEvent((0, events_1.createDomainEvent)('UserCreated', user.id, user.props.tenantId, {
            email: user.props.email,
            role: user.props.role,
        }));
        return (0, result_1.Ok)(user);
    }
    static reconstitute(props) {
        return new User(props);
    }
    get email() { return this.props.email; }
    get nombre() { return this.props.nombre; }
    get role() { return this.props.role; }
    get activo() { return this.props.activo; }
    get tenantId() { return this.props.tenantId; }
    get twoFactorEnabled() { return this.props.twoFactorEnabled; }
    get mustChangePassword() { return this.props.mustChangePassword; }
    verifyPassword(password, hash) {
        // This will be implemented by the application service using bcrypt
        // The entity just defines the interface
        return Promise.resolve(false);
    }
    async changePassword(newHash) {
        this.props.passwordHash = newHash;
        this.props.mustChangePassword = false;
        this.props.failedLoginAttempts = 0;
        this.props.lockedUntil = null;
        this.props.updatedAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('PasswordChanged', this.id, this.props.tenantId, {
            userId: this.id,
        }));
        return (0, result_1.Ok)(undefined);
    }
    recordFailedLogin() {
        this.props.failedLoginAttempts += 1;
        if (this.props.failedLoginAttempts >= 5) {
            this.props.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
        }
        this.props.updatedAt = new Date();
    }
    recordSuccessfulLogin() {
        this.props.failedLoginAttempts = 0;
        this.props.lockedUntil = null;
        this.props.lastLoginAt = new Date();
        this.props.updatedAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('UserLoggedIn', this.id, this.props.tenantId, {
            userId: this.id,
        }));
    }
    enable2FA(secret, backupCodes) {
        this.props.twoFactorEnabled = true;
        this.props.twoFactorSecret = secret;
        this.props.twoFactorBackupCodes = backupCodes;
        this.props.updatedAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('TwoFactorEnabled', this.id, this.props.tenantId, {
            userId: this.id,
        }));
        return (0, result_1.Ok)(undefined);
    }
    disable2FA() {
        this.props.twoFactorEnabled = false;
        this.props.twoFactorSecret = null;
        this.props.twoFactorBackupCodes = [];
        this.props.updatedAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('TwoFactorDisabled', this.id, this.props.tenantId, {
            userId: this.id,
        }));
    }
    addPasskey(passkey) {
        const newPasskey = {
            ...passkey,
            id: crypto.randomUUID(),
            createdAt: new Date(),
        };
        this.props.passkeys.push(newPasskey);
        this.props.updatedAt = new Date();
    }
    removePasskey(passkeyId) {
        const index = this.props.passkeys.findIndex((p) => p.id === passkeyId);
        if (index === -1)
            return false;
        this.props.passkeys.splice(index, 1);
        this.props.updatedAt = new Date();
        return true;
    }
    isLocked() {
        return this.props.lockedUntil !== null && this.props.lockedUntil > new Date();
    }
    hasPermission(permission) {
        // This will be checked by the application service against role_permissions
        return true; // Placeholder - actual check in application service
    }
    updateProfile(nombre, telefono) {
        this.props.nombre = nombre;
        this.props.telefono = telefono;
        this.props.updatedAt = new Date();
    }
    updatePreferences(preferences) {
        this.props.preferences = { ...this.props.preferences, ...preferences };
        this.props.updatedAt = new Date();
    }
    deactivate() {
        this.props.activo = false;
        this.props.updatedAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('UserDeactivated', this.id, this.props.tenantId, {
            userId: this.id,
        }));
    }
    activate() {
        this.props.activo = true;
        this.props.updatedAt = new Date();
        this.addDomainEvent((0, events_1.createDomainEvent)('UserActivated', this.id, this.props.tenantId, {
            userId: this.id,
        }));
    }
}
exports.User = User;
//# sourceMappingURL=user.js.map