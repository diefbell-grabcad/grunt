import { CommonTask, CommonTaskModule } from "../util/CommonTask";
import { TaskFn } from "../util/ITask";
import util from "grunt-legacy-util";

/**
 * Extends the {@link CommonTask} task API with methods to dynamically load tasks
 * from local directories or npm plugins.
 *
 * - `loadTasks(path)`: load all task modules from a given local directory.
 * - `loadNpmTasks(name)`: load tasks from a locally installed npm plugin.
 */
export interface ITaskComponents extends CommonTaskModule {
  /**
   * Load task-related files from the specified directory, relative to the Gruntfile.
   * This method can be used to load task-related files from a local Grunt plugin by
   * specifying the path to that plugin's "tasks" subdirectory.
   */
  loadTasks(tasksPath: string): void;

  /**
   * Load tasks from the specified Grunt plugin.
   * This plugin must be installed locally via npm, and must be relative to the Gruntfile.
   * Grunt plugins can be created by using the grunt-init gruntplugin template: grunt init:gruntplugin.
   */
  loadNpmTasks(pluginName: string): void;
}

// Keep track of the number of log.error() calls and the last specified tasks message.
let errorcount: number | undefined;
let lastInfo: string | undefined;

/**
 * Concrete implementation of task-loading utilities that extend {@link CommonTask}.
 *
 * This class implements the behavior from the original Grunt `task` module but
 * using a class that extends your `CommonTask` runner. It keeps the same
 * registry/metadata semantics so loading task files registers metadata about them.
 */
export default class TaskComponents extends CommonTask implements ITaskComponents {
  private registry: {
    tasks: string[];
    untasks: string[];
    meta: Record<string, any>;
  } = {
    tasks: [],
    untasks: [],
    meta: {},
  };

  private loadTaskDepth = 0;
  private loadTaskStack: any[] = [];

  constructor() {
    super();
  }

  // ----- Overrides / additional registry bookkeeping -----

  registerTask(
    name: string,
    descOrTaskListOrFn?: string | string[] | TaskFn,
    taskListOrFn?: string[] | TaskFn
  ): this {
    // Track registry for reporting.
    this.registry.tasks.push(name);
    // Call base implementation to actually register the task (handles aliases/etc.).
    super.registerTask(
      name as any,
      descOrTaskListOrFn as any,
      taskListOrFn as any
    );

    // Attach metadata and wrap the task fn so it gets Grunt conveniences at runtime.
    const thisTask: any = this._tasks[name];
    thisTask.meta = util._.clone(this.registry.meta || {});

    const _fn: TaskFn = thisTask.fn;
    const self = this;

    thisTask.fn = function (this: any, arg?: any) {
      // Guarantee the real task name is available.
      const taskName = thisTask.name;

      // Initialize errorcount for this task.
      errorcount = grunt.fail.errorcount;

      // Expose errorCount getter on the task context.
      Object.defineProperty(this, "errorCount", {
        enumerable: true,
        get: function () {
          return grunt.fail.errorcount - (errorcount ?? 0);
        },
      });

      // Bind helpers onto the running task context.
      this.requires = self.requires.bind(self);
      this.requiresConfig = grunt.config.requires;

      // Provide .options() helper similar to Grunt's behavior.
      this.options = function () {
        const args = [{}]
          .concat(util.toArray(arguments))
          .concat([grunt.config([taskName, "options"])]);
        const options = util._.extend.apply(null, args);
        grunt.verbose.writeflags(options, "Options");
        return options;
      };

      // Decide logger type.
      const logger =
        (_fn as any).alias || (thisTask.multi && (!arg || arg === "*"))
          ? "verbose"
          : "log";
      grunt[logger].header(
        'Running "' +
          this.nameArgs +
          '"' +
          (this.name !== this.nameArgs ? " (" + this.name + ")" : "") +
          " task"
      );
      grunt[logger].debug("Task source: " + thisTask.meta.filepath);

      // Run original function.
      return _fn.apply(this, arguments as any);
    };

    return this;
  }

  // Normalize multi task files.
  normalizeMultiTaskFiles(data: any, target: string) {
    let prop: string;
    let obj: any;
    let files: any[] = [];
    if (util.kindOf(data) === "object") {
      if ("src" in data || "dest" in data) {
        obj = {};
        for (prop in data) {
          if (prop !== "options") {
            obj[prop] = data[prop];
          }
        }
        files.push(obj);
      } else if (util.kindOf(data.files) === "object") {
        for (prop in data.files) {
          files.push({
            src: data.files[prop],
            dest: grunt.config.process(prop),
          });
        }
      } else if (Array.isArray(data.files)) {
        util._.flattenDeep(data.files).forEach(function (obj: any) {
          let prop2: string;
          if ("src" in obj || "dest" in obj) {
            files.push(obj);
          } else {
            for (prop2 in obj) {
              files.push({
                src: obj[prop2],
                dest: grunt.config.process(prop2),
              });
            }
          }
        });
      }
    } else {
      files.push({ src: data, dest: grunt.config.process(target) });
    }
  }

  // This is the most common "multi task" pattern.
  registerMultiTask(name: string, info: any, fn: any): void {
    if (fn == null) {
      fn = info;
      info = "Custom multi task.";
    }

    const self = this;
    let thisTask: any;

    this.registerTask(name, info, function (this: any, target: any) {
      const nameLocal = thisTask.name;
      // Arguments (sans target) as an array.
      this.args = util.toArray(arguments).slice(1);
      // If a target wasn't specified, run this task once for each target.
      if (!target || target === "*") {
        return self.runAllTargets(nameLocal, this.args);
      } else if (!self.isValidMultiTaskTarget(target)) {
        throw new Error('Invalid target "' + target + '" specified.');
      }
      // Fail if any required config properties have been omitted.
      this.requiresConfig([nameLocal, target]);
      // Return an options object with the specified defaults overwritten by task-
      // and/or target-specific overrides, via the "options" property.
      this.options = function () {
        const targetObj = grunt.config([nameLocal, target]);
        const args = [{}]
          .concat(util.toArray(arguments))
          .concat([
            grunt.config([nameLocal, "options"]),
            util.kindOf(targetObj) === "object" ? targetObj.options : {},
          ]);
        const options = util._.extend.apply(null, args);
        grunt.verbose.writeflags(options, "Options");
        return options;
      };
      // Expose the current target.
      this.target = target;
      // Recreate flags object so that the target isn't set as a flag.
      this.flags = {};
      this.args.forEach(function (arg: any) {
        this.flags[arg] = true;
      }, this);
      // Expose data on `this` (as well as task.current).
      this.data = grunt.config([nameLocal, target]);
      // Expose normalized files object.
      this.files = self.normalizeMultiTaskFiles(this.data, target);
      // Expose normalized, flattened, uniqued array of src files.
      Object.defineProperty(this, "filesSrc", {
        enumerable: true,
        get: function () {
          return util
            ._(this.files)
            .chain()
            .map("src")
            .flatten()
            .uniq()
            .value();
        }.bind(this),
      });
      // Call original task function, passing in the target and any other args.
      return fn.apply(this, this.args);
    });

    thisTask = this._tasks[name];
    thisTask.multi = true;
  }

  // Init tasks don't require properties in config, and as such will preempt
  // config loading errors.
  registerInitTask(name: string, info: any, fn: any) {
    this.registerTask(name, info, fn);
    this._tasks[name].init = true;
  }

  // Override built-in renameTask to use the registry.
  renameTask(oldname: string, newname: string) {
    try {
      const result = super.renameTask(oldname, newname as any);
      this.registry.untasks.push(oldname);
      this.registry.tasks.push(newname);
      return result;
    } catch (e: any) {
      grunt.log.error(e.message);
    }
  }

  // If a property wasn't passed, run all task targets in turn.
  runAllTargets(taskname: string, args: any[]) {
    // Get an array of sub-property keys under the given config object.
    let targets = Object.keys(grunt.config.getRaw(taskname) || {});
    // Remove invalid target properties.
    targets = targets.filter(this.isValidMultiTaskTarget);
    // Fail if there are no actual properties to iterate over.
    if (targets.length === 0) {
      grunt.log.error('No "' + taskname + '" targets found.');
      return false;
    }
    // Iterate over all targets, running a task for each.
    targets.forEach((target: string) => {
      // Be sure to pass in any additionally specified args.
      this.run([taskname, target].concat(args || []).join(":"));
    });
  }

  // ----- Loading logic (files / npm modules) -----
  private _loadTasksMessage(info: string) {
    if (this.loadTaskDepth === 0) {
      lastInfo = info;
    }
    grunt.verbose.subhead("Registering " + info + " tasks.");
  }

  private _loadTasksDir(tasksdir: string) {
    try {
      const files = grunt.file.glob.sync("*.{js,cjs,coffee}", {
        cwd: tasksdir,
        maxDepth: 1,
      });
      files.forEach((filename: string) => {
        this._loadTask(path.join(tasksdir, filename));
      });
    } catch (e: any) {
      grunt.log.verbose.error(e.stack).or.error(e);
    }
  }

  loadTasks(tasksdir: string) {
    this._loadTasksMessage('"' + tasksdir + '"');
    if (grunt.file.exists(tasksdir)) {
      this._loadTasksDir(tasksdir);
    } else {
      grunt.log.error('Tasks directory "' + tasksdir + '" not found.');
    }
  }

  loadNpmTasks(name: string) {
    this._loadTasksMessage('"' + name + '" local Npm module');
    let root = path.resolve("node_modules");
    let pkgpath = path.join(root, name);
    let pkgfile = path.join(pkgpath, "package.json");

    if (!grunt.file.exists(pkgpath)) {
      const nameParts = name.split("/");
      const normailzedName =
        name[0] === "@" ? nameParts.slice(0, 2).join("/") : nameParts[0];
      try {
        pkgfile = require.resolve(normailzedName + "/package.json");
        root = pkgfile.substr(
          0,
          pkgfile.length - normailzedName.length - "/package.json".length
        );
      } catch (err: any) {
        grunt.log.error(
          'Local Npm module "' +
            normailzedName +
            '" not found. Is it installed?'
        );
        return;
      }
    }

    const pkg = grunt.file.exists(pkgfile)
      ? grunt.file.readJSON(pkgfile)
      : { keywords: [] };

    // Process collection plugins.
    if (pkg.keywords && pkg.keywords.indexOf("gruntcollection") !== -1) {
      this.loadTaskDepth++;
      Object.keys(pkg.dependencies || {}).forEach((depName: string) => {
        const filepath = grunt.file.findup("node_modules/" + depName, {
          cwd: path.resolve("node_modules", name),
          nocase: true,
        });
        if (filepath) {
          this.loadNpmTasks(path.relative(root, filepath));
        }
      });
      this.loadTaskDepth--;
      return;
    }

    // Process task plugins.
    const tasksdir = path.join(root, name, "tasks");
    if (grunt.file.exists(tasksdir)) {
      this._loadTasksDir(tasksdir);
    } else {
      grunt.log.error(
        'Local Npm module "' + name + '" not found. Is it installed?'
      );
    }
  }

  // Initialize tasks.
  init(tasks: string[], options?: any) {
    if (!options) {
      options = {};
    }

    // Were only init tasks specified?
    const allInit =
      tasks.length > 0 &&
      tasks.every((name) => {
        const obj = this._taskPlusArgs(name).task;
        return obj && obj.init;
      });

    // Find Gruntfile, unless init-only or explicitly disabled.
    let gruntfile: string | null;
    let msg: string | undefined;
    if (allInit || options.gruntfile === false) {
      gruntfile = null;
    } else {
      gruntfile =
        grunt.option("gruntfile") ||
        grunt.file.findup("Gruntfile.{js,cjs,coffee}", { nocase: true });
      msg =
        'Reading "' +
        (gruntfile ? path.basename(gruntfile) : "???") +
        '" Gruntfile...';
    }

    if (options.gruntfile === false) {
      // Running as a lib with {gruntfile: false}
    } else if (gruntfile && grunt.file.exists(gruntfile)) {
      grunt.verbose.writeln().write(msg).ok();
      process.chdir(grunt.option("base") || path.dirname(gruntfile));
      this._loadTasksMessage("Gruntfile");
      this._loadTask(gruntfile);
    } else if (options.help || allInit) {
      // don't complain
    } else if (grunt.option("gruntfile")) {
      grunt.log.writeln().write(msg).error();
      grunt.fatal(
        'Unable to find "' + gruntfile + '" Gruntfile.',
        grunt.fail.code.MISSING_GRUNTFILE
      );
    } else if (!grunt.option("help")) {
      grunt.verbose.writeln().write(msg).error();
      grunt.log.writelns(
        "A valid Gruntfile could not be found. Please see the getting " +
          "started guide for more information on how to configure grunt: " +
          "http://gruntjs.com/getting-started"
      );
      grunt.fatal(
        "Unable to find Gruntfile.",
        grunt.fail.code.MISSING_GRUNTFILE
      );
    }

    // Load user-specified --npm tasks and --tasks.
    (grunt.option("npm") || [])
      .map(String)
      .forEach((n: string) => this.loadNpmTasks(n));
    (grunt.option("tasks") || [])
      .map(String)
      .forEach((t: string) => this.loadTasks(t));
  }
}

