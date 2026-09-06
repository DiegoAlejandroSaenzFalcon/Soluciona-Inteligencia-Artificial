/**
 * Result Pattern - Functional error handling without exceptions
 * Inspired by Railway Oriented Programming
 */
export type Result<T, E = Error> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};
export declare const Ok: <T>(value: T) => Result<T, never>;
export declare const Err: <E>(error: E) => Result<never, E>;
export declare const isOk: <T, E>(result: Result<T, E>) => result is {
    ok: true;
    value: T;
};
export declare const isErr: <T, E>(result: Result<T, E>) => result is {
    ok: false;
    error: E;
};
export declare const unwrap: <T, E>(result: Result<T, E>) => T;
export declare const unwrapErr: <T, E>(result: Result<T, E>) => E;
export declare const map: <T, E, U>(result: Result<T, E>, fn: (value: T) => U) => Result<U, E>;
export declare const mapErr: <T, E, F>(result: Result<T, E>, fn: (error: E) => F) => Result<T, F>;
export declare const flatMap: <T, E, U>(result: Result<T, E>, fn: (value: T) => Result<U, E>) => Result<U, E>;
export declare const match: <T, E, U>(result: Result<T, E>, onOk: (value: T) => U, onErr: (error: E) => U) => U;
export declare const fromThrowable: <T, E = Error>(fn: () => T, onError?: (error: unknown) => E) => Result<T, E>;
export declare const fromPromise: <T, E = Error>(promise: Promise<T>, onError?: (error: unknown) => E) => Promise<Result<T, E>>;
export declare const combine: <T, E>(results: Result<T, E>[]) => Result<T[], E>;
export declare const partition: <T, E>(results: Result<T, E>[]) => {
    ok: T[];
    err: E[];
};
//# sourceMappingURL=result.d.ts.map