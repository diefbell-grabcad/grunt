import { IFlag } from "./IFlag";
import { ITask } from "./ITask";

export interface AsyncResultCatcher {
	/**
	 * Either false or an Error object may be passed to the done function
	 * to instruct Grunt that the task has failed.
	 */
	(success: boolean): void;
	(error: Error): void;
	(result: any): void;
	(): void;
}

/**
 * @link http://gruntjs.com/inside-tasks
 *
 * Grunt version 0.4.x
 */
export interface ITask {
	/**
	 * If a task is asynchronous, this method must be invoked to instruct Grunt to wait.
	 * It returns a handle to a "done" function that should be called when the task has completed.
	 *
	 *   // Tell Grunt this task is asynchronous.
	 *   var done = this.async();
	 *   // Your async code.
	 *   setTimeout(function() {
	 *     // Let's simulate an error, sometimes.
	 *     var success = Math.random() > 0.5;
	 *     // All done!
	 *     done(success);
	 *   }, 1000);
	 */
	async(): AsyncResultCatcher;

	/**
	 * If one task depends on the successful completion of another task (or tasks),
	 * this method can be used to force Grunt to abort if the other task didn't run,
	 * or if the other task failed.
	 *
	 * @param tasks an array of task names or individual task names, as arguments.
	 * @note that this won't actually run the specified task(s),
	 * it will just fail the current task if they haven't already run successfully.
	 */
	requires(tasks: string[]): void;
	requires(tasks: string, ...otherTasks: string[]): void;
	requires(tasks: string[], ...otherTasks: string[][]): void;

	/**
	 * Fail the current task if one or more required config properties is missing.
	 * One or more string or array config properties may be specified.
	 * this.requiresConfig(prop [, prop [, ...]])
	 */
	requiresConfig(prop: string, ...andProps: string[]): void;

	/**
	 * The name of the task, as defined in grunt.registerTask.
	 * For example, if a "sample" task was run as grunt sample or grunt sample:foo,
	 * inside the task function, this.name would be "sample".
	 */
	name: string;

	/**
	 * The name of the task, including any colon-separated arguments or flags specified on the command-line.
	 * For example, if a "sample" task was run as grunt sample:foo,
	 * inside the task function, this.nameArgs would be "sample:foo".
	 */
	nameArgs: string;

	/**
	 * An array of arguments passed to the task.
	 * For example, if a "sample" task was run as grunt sample:foo:bar,
	 * inside the task function, this.args would be ["foo", "bar"].
	 */
	args: string[];

	/**
	 * An object generated from the arguments passed to the task.
	 * For example, if a "sample" task was run as grunt sample:foo:bar,
	 * inside the task function, this.flags would be {foo: true, bar: true}.
	 */
	flags: IFlag;

	/**
	 * The number of grunt.log.error calls that occurred during this task.
	 * This can be used to fail a task if errors were logged during the task.
	 */
	errorCount: number;

	/**
	 * Returns an options object.
	 * Properties of the optional defaultsObj argument will be overridden by any task-level options
	 * object properties, which will be further overridden in multi tasks by any target-level
	 * options object properties.
	 */
	options<T>(defaultsObj: T): T;
	options(defaultsObj: any): ITaskOptions;
}

/**
 * {@link http://gruntjs.com/inside-tasks#inside-multi-tasks}
 */
export interface IMultiTask<T> extends ITask {
	/**
	 * In a multi task, this property contains the name of the target currently being iterated over.
	 * For example, if a "sample" multi task was run as grunt sample:foo with the config data
	 * {sample: {foo: "bar"}}, inside the task function, this.target would be "foo".
	 */
	target: string;

	/**
	 * In a multi task, all files specified using any Grunt-supported file formats and options,
	 * globbing patterns or dynamic mappings will automatically be normalized into a single format:
	 * the Files Array file format.
	 *
	 * What this means is that tasks don't need to contain a ton of boilerplate for explicitly
	 * handling custom file formats, globbing patterns, mapping source files to destination files
	 * or filtering out files or directories. A task user can just specify files per the Configuring
	 * tasks guide, and Grunt will handle all the details.
	 *
	 * Your task should iterate over the this.files array, utilizing the src and dest properties of
	 * each object in that array. The this.files property will always be an array.
	 * The src property will also always be an array, in case your task cares about multiple source
	 * files per destination file.
	 *
	 * @note it's possible that nonexistent files might be included in src values,
	 *       so you may want to explicitly test that source files exist before using them.
	 */
	files: IFilesArray;

	/**
	 * In a multi task, all src files files specified via any file format are reduced to a single array.
	 * If your task is "read only" and doesn't care about destination filepaths,
	 * use this array instead of this.files.
	 */
	filesSrc: string[];

	/**
	 * In a multi task, this is the actual data stored in the Grunt config object for the given target.
	 * For example, if a "sample" multi task was run as grunt sample:foo with the config data
	 * {sample: {foo: "bar"}}, inside the task function, this.data would be "bar".
	 *
	 * @note It is recommended that this.options this.files and this.filesSrc are used instead of this.data,
	 *       as their values are normalized.
	 */
	data: T;
}

/**
 * {@link http://gruntjs.com/configuring-tasks}
 *
 * A TaskConfig can be either be a full config or a compacted files config.
 * @see ITaskCompactOptions
 */
interface ITaskOptions {
	options?: any;

	// files?: grunt.file.IFilesArray
	// files?: grunt.file.IFilesMap
	files?: any;
}

/**
 * @see ITaskOptions
 */
export interface ITaskCompactOptions extends ITaskOptions, IFilesConfig {}

export type TaskFn = (this: ITask, ...args: any[]) => void;
