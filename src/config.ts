/**
 * Grunt configuration object.
 * @example
 * ```ts
 * // grunt.config.ts
 * export const config: GruntConfig = {
 *   dirs: ['src/tasks', 'src/custom_tasks'],
 * };
 * ```
 * @example
 * ```ts
 * // grunt.config.js
 * 
 * //@type {typeof import("grunt").GruntConfig}
 * module.exports = {
 *   dirs: ['src/tasks', 'src/custom_tasks'],
 * };
 * ```
 */
export type GruntConfig = {
	dirs: string[];
}
