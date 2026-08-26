/**
 * Result Pattern - Functional error handling without exceptions
 * Inspired by Railway Oriented Programming
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => result.ok;
export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } => !result.ok;

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) return result.value;
  throw result.error;
};

export const unwrapErr = <T, E>(result: Result<T, E>): E => {
  if (!result.ok) return result.error;
  throw new Error('Expected Err but got Ok');
};

export const map = <T, E, U>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  result.ok ? Ok(fn(result.value)) : Err(result.error);

export const mapErr = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
  result.ok ? Ok(result.value) : Err(fn(result.error));

export const flatMap = <T, E, U>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> =>
  result.ok ? fn(result.value) : Err(result.error);

export const match = <T, E, U>(
  result: Result<T, E>,
  onOk: (value: T) => U,
  onErr: (error: E) => U
): U => (result.ok ? onOk(result.value) : onErr(result.error));

export const fromThrowable = <T, E = Error>(
  fn: () => T,
  onError?: (error: unknown) => E
): Result<T, E> => {
  try {
    return Ok(fn());
  } catch (error) {
    return Err(onError ? onError(error) : (error as E));
  }
};

export const fromPromise = async <T, E = Error>(
  promise: Promise<T>,
  onError?: (error: unknown) => E
): Promise<Result<T, E>> => {
  try {
    const value = await promise;
    return Ok(value);
  } catch (error) {
    return Err(onError ? onError(error) : (error as E));
  }
};

export const combine = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];
  for (const result of results) {
    if (!result.ok) return Err(result.error);
    values.push(result.value);
  }
  return Ok(values);
};

export const partition = <T, E>(results: Result<T, E>[]): { ok: T[]; err: E[] } => {
  const ok: T[] = [];
  const err: E[] = [];
  for (const result of results) {
    if (result.ok) ok.push(result.value);
    else err.push(result.error);
  }
  return { ok, err };
};