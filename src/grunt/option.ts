/**
 * {@link http://gruntjs.com/api/grunt.option}
 */
export interface OptionModule {
    /**
     * Gets or sets an option.
     * Boolean options can be negated by prepending no- onto the key. For example:
     *
     * grunt.option('staging', false);
     * var isDev = grunt.option('no-staging');
     * assert(isDev === true)
     */
    <T>(key: string, value: T): void;
    <T>(key: string): T;

    /**
     * Initialize grunt.option.
     * If initObject is omitted option will be initialized to an empty object
     * otherwise will be set to initObject.
     */
    init(initObject?: any): void;

    /**
     * Returns the options as an array of command line parameters.
     */
    readonly flags: string[];

    /**
     * All option keys.
     */
    readonly keys: string[];
}

type OptionModulePrivate = OptionModule & {
  [DATA_PROP]: Options;
};

type Options = Record<string, unknown>;

const DATA_PROP = Symbol("data");

// We can't turn this into a class, because it is also a callable function.
const Option: OptionModule = function<T>(key: string, value?: T): T | void {
  const data = (Option as OptionModulePrivate)[DATA_PROP];
  const no = key.match(/^no-(.+)$/);
  if (arguments.length === 2) {
    data[key] = value;
  } else if (no) {
    return (data[no[1]] === false) as T;
  } else {
    return data[key] as T;
  }
} as OptionModule;

// Protected static property
(Option as OptionModulePrivate)[DATA_PROP] = {};

Option.init = function(obj?: Options) {
  (Option as OptionModulePrivate)[DATA_PROP] = obj ?? {};
};

Object.defineProperty(Option, 'flags', {
  get() {
    const data = (Option as OptionModulePrivate)[DATA_PROP];
    return Object.entries(data)
      .filter(([_, val]) => !(Array.isArray(val) && val.length === 0))
      .map(([key, val]) => '--' + (val === false ? 'no-' : '') + key + (typeof val === 'boolean' ? '' : '=' + val));
  }
});

Object.defineProperty(Option, 'keys', {
  get() {
    return Object.keys((Option as OptionModulePrivate)[DATA_PROP]);
  }
});

export default Option;
