"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partition = exports.combine = exports.fromPromise = exports.fromThrowable = exports.match = exports.flatMap = exports.mapErr = exports.map = exports.unwrapErr = exports.unwrap = exports.isErr = exports.isOk = exports.Err = exports.Ok = void 0;
const Ok = (value) => ({ ok: true, value });
exports.Ok = Ok;
const Err = (error) => ({ ok: false, error });
exports.Err = Err;
const isOk = (result) => result.ok;
exports.isOk = isOk;
const isErr = (result) => !result.ok;
exports.isErr = isErr;
const unwrap = (result) => {
    if (result.ok)
        return result.value;
    throw result.error;
};
exports.unwrap = unwrap;
const unwrapErr = (result) => {
    if (!result.ok)
        return result.error;
    throw new Error('Expected Err but got Ok');
};
exports.unwrapErr = unwrapErr;
const map = (result, fn) => result.ok ? (0, exports.Ok)(fn(result.value)) : (0, exports.Err)(result.error);
exports.map = map;
const mapErr = (result, fn) => result.ok ? (0, exports.Ok)(result.value) : (0, exports.Err)(fn(result.error));
exports.mapErr = mapErr;
const flatMap = (result, fn) => result.ok ? fn(result.value) : (0, exports.Err)(result.error);
exports.flatMap = flatMap;
const match = (result, onOk, onErr) => (result.ok ? onOk(result.value) : onErr(result.error));
exports.match = match;
const fromThrowable = (fn, onError) => {
    try {
        return (0, exports.Ok)(fn());
    }
    catch (error) {
        return (0, exports.Err)(onError ? onError(error) : error);
    }
};
exports.fromThrowable = fromThrowable;
const fromPromise = async (promise, onError) => {
    try {
        const value = await promise;
        return (0, exports.Ok)(value);
    }
    catch (error) {
        return (0, exports.Err)(onError ? onError(error) : error);
    }
};
exports.fromPromise = fromPromise;
const combine = (results) => {
    const values = [];
    for (const result of results) {
        if (!result.ok)
            return (0, exports.Err)(result.error);
        values.push(result.value);
    }
    return (0, exports.Ok)(values);
};
exports.combine = combine;
const partition = (results) => {
    const ok = [];
    const err = [];
    for (const result of results) {
        if (result.ok)
            ok.push(result.value);
        else
            err.push(result.error);
    }
    return { ok, err };
};
exports.partition = partition;
//# sourceMappingURL=result.js.map