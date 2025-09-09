declare module "grunt-legacy-util" {
	/**
	 * Return the "kind" of a value. Like typeof but returns the internal [Class](Class/) value.
	 * Possible results are "number", "string", "boolean", "function", "regexp", "array", "date",
	 * "error", "null", "undefined" and the catch-all "object".
	 */
	export function kindOf(value: any): string;

	/**
	 * Return a new Error instance (that can be thrown) with the appropriate message.
	 * If an Error object is specified instead of message that object will be returned.
	 * Also, if an Error object is specified for origError and Grunt was run with the --debug 9 option,
	 * the original Error stack will be dumped.
	 */
	export function error(message: string, origError?: Error): Error;
	export function error(error: Error, origError?: Error): Error;
	export function error(error: any, origError?: Error): Error;

	/**
	 * The linefeed character, normalized for the current operating system.
	 * (\r\n on Windows, \n otherwise)
	 */
	export const linefeed: string;

	/**
	 * Given a string, return a new string with all the linefeeds normalized for the current operating system.
	 * (\r\n on Windows, \n otherwise)
	 */
	export function normalizelf(str: string): string;

	/**
	 * Recurse through nested objects and arrays, executing callbackFunction for each non-object value.
	 * If continueFunction returns false, a given object or value will be skipped.
	 */
	export function recurse(
		object: any,
		callbackFunction: (value: any) => void,
		continueFunction: (objOrValue: any) => boolean,
	): void;

	/**
	 * Return string str repeated n times.
	 */
	export function repeat(n: number, str: string): string;

	/**
	 * Given str of "a/b", If n is 1, return "a" otherwise "b".
	 * You can specify a custom separator if '/' doesn't work for you.
	 */
	export function pluralize(n: number, str: string, separator?: string): string;

	/**
	 * Spawn a child process, keeping track of its stdout, stderr and exit code.
	 * The method returns a reference to the spawned child.
	 * When the child exits, the done function is called.
	 *
	 * @param done a function with arguments:
	 *        error  - If the exit code was non-zero and a fallback wasn't specified,
	 *                 an Error object, otherwise null.
	 *        result - The result object is an
	 *        code   - The numeric exit code.
	 */
	export function spawn(
		options: ISpawnOptions,
		done: (error: Error, result: ISpawnResult, code: number) => void,
	): ISpawnedChild;

	/**
	 * Given an array or array-like object, return an array.
	 * Great for converting arguments objects into arrays.
	 */
	export function toArray<T>(arrayLikeObject: any): T[];

	/**
	 * Normalizes both "returns a value" and "passes result to a callback" functions to always
	 * pass a result to the specified callback. If the original function returns a value,
	 * that value will now be passed to the callback, which is specified as the last argument,
	 * after all other predefined arguments. If the original function passed a value to a callback,
	 * it will continue to do so.
	 */
	export function callbackify<R>(syncOrAsyncFunction: () => R): (callback: (result: R) => void) => void;
	export function callbackify<A, R>(syncOrAsyncFunction: (a: A) => R): (a: A, callback: (result: R) => void) => void;
	export function callbackify<A, B, R>(
		syncOrAsyncFunction: (a: A, b: B) => R,
	): (a: A, b: B, callback: (result: R) => void) => void;
	export function callbackify<A, B, C, R>(
		syncOrAsyncFunction: (a: A, b: B, c: C) => R,
	): (a: A, b: B, c: C, callback: (result: R) => void) => void;
	export function callbackify<A, B, C, D, R>(
		syncOrAsyncFunction: (a: A, b: B, c: C, d: D) => R,
	): (a: A, b: B, c: C, d: D, callback: (result: R) => void) => void;

	// Internal libraries
	export const namespace: any;
	export const task: typeof import("../util/CommonTask") | undefined;

	// Idk what this is, but it's used in util/task.ts
	export const _: any;

	// Idk why it's not just using `process.exit`
	export const exit: typeof process.exit;
}