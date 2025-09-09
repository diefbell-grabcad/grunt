import { IMultiTask, TaskFn } from "./ITask";
import grunt from "../grunt"
import { IFlag } from "./IFlag";

/**
 * {@link http://gruntjs.com/api/grunt.task}
 * 
 * Public API for registering and managing tasks.
 *
 * This is the minimal surface used by both the internal runner
 * and higher-level Grunt interfaces.
 */
export interface CommonTaskModule {
  /**
   * If a task list is specified, the new task will be an alias for one or more other tasks.
   * Whenever this "alias task" is run, every specified task in taskList will be run, in the order specified.
   * The taskList argument must be an array of tasks.
   */
  registerTask(taskName: string, taskList: string[]): void;
  registerTask(taskName: string, description: string, taskList: string[]): void;

  /**
   * If a description and taskFunction are passed, the specified function will be executed
   * whenever the task is run.
   *
   * In addition, the specified description will be shown when grunt --help is run.
   * Task-specific properties and methods are available inside the task function as properties
   * of the this object. The task function can return false to indicate that the task has failed.
   *
   * @note taskFunction.apply(scope: grunt.task.ITask, args: any[])
   */
  registerTask(
    taskName: string,
    taskFunction: TaskFn
  ): void;
  registerTask(
    taskName: string,
    description: string,
    taskFunction: TaskFn
  ): void;

  /**
   * Register a "multi task." A multi task is a task that implicitly iterates over all of its
   * named sub-properties (AKA targets) if no target was specified.
   * In addition to the default properties and methods, extra multi task-specific properties
   * are available inside the task function as properties of the this object.
   *
   * @note taskFunction.apply(scope: grunt.task.IMultiTask<any>, args: any[])
   */
  registerMultiTask(
    taskName: string,
    taskFunction: TaskFn
  ): void;
  registerMultiTask(
    taskName: string,
    taskDescription: string,
    taskFunction: TaskFn
  ): void;

  /**
   * Check with the name, if a task exists in the registered tasks.
   * @param name The task name to check.
   * @since 0.4.5
   */
  exists(name: string): boolean;

  /**
   * Rename a task. This might be useful if you want to override the default behavior of a task, while retaining the old name.
   * Note that if a task has been renamed, the this.name and this.nameArgs properties will change accordingly.
   * @see ITask
   * @param oldname The previous name of the task.
   * @param newname The new name for the task.
   */
  renameTask(oldname: string, newname: string): void;
}

/**
 * Context object provided to a running task.
 *
 * Bound as `this` when a task's function executes. It exposes metadata about
 * the current invocation and an `async()` helper to switch the task to
 * asynchronous completion.
 *
 * - `name`: Base task name (e.g. "build").
 * - `nameArgs`: Full task reference including colon-args (e.g. "build:prod").
 * - `args`: Positional args parsed from `nameArgs` after the first colon.
 * - `flags`: A convenience map of args-as-flags (e.g. { prod: true }).
 * - `async()`: Marks the task as async and returns a callback. Calling the
 *   callback with `false` or an `Error` fails the task; anything else passes.
 */
export interface TaskContext {
	name?: string;
	nameArgs?: string;
	args?: unknown[];
	flags?: IFlag;
	async?: () => (success?: boolean | Error) => void;
}

/**
 * Concrete implementation of {@link CommonTaskModule}.
 *
 * In addition to maintaining the task registry, this class is
 * responsible for:
 * - parsing colon args (`name:target:extra` → args + flags),
 * - managing the runnable task queue,
 * - executing custom and alias tasks,
 * - handling async completion via `TaskContext.async()`,
 * - error/success bookkeeping, and queue control.
 */
export class CommonTask implements CommonTaskModule {
	protected _current: TaskContext = {};
	public get current() { return this._current; }

	protected _tasks: Record<string, { name: string; info: string; fn: Function & { alias?: boolean } }> = {};
	protected _queue: Array<any> = [];
	protected _placeholder = { placeholder: true };
	protected _marker = { marker: true };
	protected _options: Record<string, any> = {};
	protected _running = false;
	protected _success: Record<string, boolean> = {};

	registerTask(
		name: string,
		descOrTaskListOrFn: string | string[] | TaskFn,
		taskListOrFn?: string[] | TaskFn
	): this {
		// Handle overloads
		const info: string | null =
			typeof descOrTaskListOrFn === "string" ? descOrTaskListOrFn : null;

		let fn: TaskFn | null =
			typeof descOrTaskListOrFn === "function"
				? descOrTaskListOrFn
				: typeof taskListOrFn === "function"
					? taskListOrFn
					: null;

		const tasklist: string[] | null =
			Array.isArray(descOrTaskListOrFn)
				? descOrTaskListOrFn
				: Array.isArray(taskListOrFn)
					? taskListOrFn
					: null;

		// Handle alias tasks (where no explicit fn was given)
		if (!fn && tasklist) {
			fn = this.run.bind(this, tasklist) as TaskFn;
			(fn as any).alias = true;

			// Auto-generate info if none was provided
			if (!info) {
				const quoted = tasklist.map(t => `"${t}"`).join(", ");
				const plural = tasklist.length === 1 ? "" : "s";
				// e.g. 'Alias for "lint" task.' or 'Alias for "clean", "build" tasks.'
				(fn as any).info = `Alias for ${quoted} task${plural}.`;
			}
		}

		// If still no info, set a default
		const finalInfo = info ?? "Custom task.";

		// Store in registry
		this._tasks[name] = { name, info: finalInfo, fn: fn! };
		return this;
	}


	registerMultiTask(
		name: string,
		descriptionOrFn: string | ((this: IMultiTask<any>, ...args: any[]) => void),
		fn?: (this: IMultiTask<any>, ...args: any[]) => void
	): void {
		// TODO: implement multi-task registration similar to registerTask
	}

	exists(name: string): boolean {
		return name in this._tasks;
	}

	renameTask(oldname: string, newname: string): this {
		if (!this._tasks[oldname]) throw new Error(`Cannot rename missing "${oldname}" task.`);
		this._tasks[newname] = this._tasks[oldname];
		this._tasks[newname].name = newname;
		delete this._tasks[oldname];
		return this;
	}

	parseArgs(args: unknown[]): string[] {
		return Array.isArray(args[0]) ? (args[0] as string[]) : Array.from(args) as string[];
	}

	splitArgs(str: string | undefined): string[] {
		if (!str) return [];
		str = str.replace(/\\\\/g, "\uFFFF").replace(/\\:/g, "\uFFFE");
		return str.split(":").map(s => s.replace(/\uFFFE/g, ":").replace(/\uFFFF/g, "\\"));
	}

	protected _taskPlusArgs(name: string) {
		const parts = this.splitArgs(name);
		let i = parts.length;
		let task: any;
		do {
			task = this._tasks[parts.slice(0, i).join(":")];
		} while (!task && --i > 0);

		const args = parts.slice(i);
		const flags: Record<string, boolean> = {};
		args.forEach(arg => (flags[arg] = true));

		return { task, nameArgs: name, args, flags };
	}

	protected _push(things: any[]) {
		const index = this._queue.indexOf(this._placeholder);
		if (index === -1) {
			this._queue = this._queue.concat(things);
		} else {
			this._queue.splice(index, 0, ...things);
		}
	}

	run(...taskNames: (string | string[])[]): this {
		const things = this.parseArgs(taskNames).map(this._taskPlusArgs, this);
		const fails = things.filter(t => !t.task);
		if (fails.length > 0) {
			this._throwIfRunning(new Error(`Task "${fails[0].nameArgs}" not found.`));
			return this;
		}
		this._push(things);
		return this;
	}

	protected _throwIfRunning(obj: unknown) {
		if (this._running || !this._options.error) throw obj;
		this._options.error.call({ name: null }, obj);
	}

	protected runTaskFn(
		context: TaskContext,
		fn: (...args: any[]) => any,
		done: (err?: Error | null, success?: boolean) => void,
		asyncDone: boolean
	) {
		let async = false;

		const complete = (success: boolean | Error) => {
			let err: Error | null = null;
			if (success === false) err = new Error(`Task "${context.nameArgs}" failed.`);
			else if (success instanceof Error) {
				err = success;
				success = false;
			} else success = true;

			this._current = {};
			this._success[context.nameArgs!] = success;

			if (!success && this._options.error) {
				this._options.error.call({ name: context.name, nameArgs: context.nameArgs }, err);
			}

			if (asyncDone) process.nextTick(() => done(err, success));
			else done(err, success);
		};

		context.async = () => {
			async = true;
			return grunt.util._.once((success?: boolean | Error) => {
				setTimeout(() => complete(success!), 1);
			});
		};

		this._current = context;
		try {
			const success = fn.call(context);
			if (!async) complete(success);
		} catch (err) {
			complete(err as Error);
		}
	}

	start(opts: { done?: () => void; asyncDone?: boolean } = {}) {
		if (this._running) return false;

		const nextTask = () => {
			let thing;
			do {
				thing = this._queue.shift();
			} while (thing === this._placeholder || thing === this._marker);

			if (!thing) {
				this._running = false;
				if (this._options.done) this._options.done();
				return;
			}

			this._queue.unshift(this._placeholder);
			const context: TaskContext = {
				nameArgs: thing.nameArgs,
				name: thing.task.name,
				args: thing.args,
				flags: thing.flags,
			};

			this.runTaskFn(
				context,
				function (this: TaskContext) {
					return thing.task.fn.apply(this, this.args);
				},
				nextTask,
				!!opts.asyncDone
			);
		};

		this._running = true;
		nextTask();
		return true;
	}

	mark() {
		this._push([this._marker]);
		return this;
	}

	clearQueue(options: { untilMarker?: boolean } = {}) {
		if (options.untilMarker) {
			this._queue.splice(0, this._queue.indexOf(this._marker) + 1);
		} else this._queue = [];
		return this;
	}

	requires(...taskNames: string[]) {
		taskNames.forEach(name => {
			const success = this._success[name];
			if (!success) {
				throw new Error(`Required task "${name}" ${success === false ? "failed" : "must be run first"}.`);
			}
		});
	}

	options(options: Record<string, any>) {
		Object.assign(this._options, options);
	}
}
