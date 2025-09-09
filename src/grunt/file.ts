import * as path from "path";
import * as fs from "fs";

import * as minimatch from "minimatch";
import * as glob from "glob";
import findup from "findup-sync";
import util from "grunt-legacy-util";

/**
 * {@link http://gruntjs.com/api/grunt.file#grunt.file.defaultencoding}
 */
interface IFileEncodedOption {
  encoding: string;
}

/**
 * {@link http://gruntjs.com/api/grunt.file#grunt.file.copy}
 *
 * @see IFileWriteBufferOption
 * @see IFileWriteStringOption
 */
interface IFileWriteOptions extends IFileEncodedOption {
  /**
   * These optional globbing patterns will be matched against the filepath
   * (not the filename) using grunt.file.isMatch. If any specified globbing
   * pattern matches, the file won't be processed via the `process` function.
   * If `true` is specified, processing will be prevented.
   */
  // noProcess?: string[]
  // noProcess?: boolean
  noProcess?: any;
}

/**
 * @see IFileWriteOptions
 */
interface IFileWriteBufferOption extends IFileWriteOptions {
  /**
   * The source file contents and file path are passed into this function,
   * whose return value will be used as the destination file's contents. If
   * this function returns `false`, the file copy will be aborted.
   */
  process?: ((buffer: Buffer) => boolean) | undefined;
}

/**
 * @see IFileWriteOptions
 */
interface IFileWriteStringOption extends IFileWriteOptions {
  /**
	* The source file contents, source file path, and destination file path
	* are passed into this function, whose return value will be used as the
	* destination file's contents.
	* If this function returns 'false', the file copy will be aborted.
	* @example
	```ts
		const copyOptions: grunt.file.IFileWriteStringOption = {
		encoding: options.encoding,
		process: (contents: string, srcpath: string, destpath: string): string | boolean => {
		// some other code
		// return the content to be written or return false to cancel
		return contents;
		},
		noProcess: options.noProcess,
		};
	```
	*/
  process?:
    | ((
        contents: string,
        srcpath: string,
        destpath: string
      ) => string | boolean)
    | undefined;
}

/**
 * {@link http://gruntjs.com/api/grunt.file}
 */
export interface FileModule {
  /**
   * Set this property to change the default encoding used by all grunt.file methods.
   * Defaults to 'utf8'.
   *
   * If you do have to change this value, it's recommended that you change
   * it as early as possible inside your Gruntfile.
   */
  defaultEncoding: string;

  /**
   * Read and return a file's contents.
   * Returns a string, unless options.encoding is null in which case it returns a Buffer.
   */
  read(filepath: string): string;
  read(filepath: string, options: IFileEncodedOption): Buffer;

  /**
   * Read a file's contents, parsing the data as JSON and returning the result.
   * @see FileModule.read for a list of supported options.
   */
  readJSON(filepath: string): any;
  readJSON(filepath: string, options: IFileEncodedOption): Buffer;

  /**
   * Read a file's contents, parsing the data as YAML and returning the result.
   * @see FileModule.read for a list of supported options.
   */
  readYAML(filepath: string): any;
  readYAML(filepath: string, options: IFileEncodedOption): Buffer;

  /**
   * Write the specified contents to a file, creating intermediate directories if necessary.
   * Strings will be encoded using the specified character encoding, Buffers will be written to disk as-specified.
   *
   * @param contents If `contents` is a Buffer, encoding is ignored.
   * @param options If an encoding is not specified, default to grunt.file.defaultEncoding.
   */
  write(filepath: string, contents: string, options?: IFileEncodedOption): void;
  write(filepath: string, contents: Buffer): void;

  /**
   * Copy a source file to a destination path, creating intermediate directories if necessary.
   */
  copy(srcpath: string, destpath: string): void;
  copy(
    srcpath: string,
    destpath: string,
    options: IFileWriteStringOption
  ): void;
  copy(
    srcpath: string,
    destpath: string,
    options: IFileWriteBufferOption
  ): void;

  /**
   * Delete the specified filepath. Will delete files and folders recursively.
   *
   * @return true if the files could be deleted, otherwise false.
   */
  delete(filepath: string, options?: { force?: boolean | undefined }): boolean;

  /**
   * Works like mkdir -p. Create a directory along with any intermediate directories.
   * If mode isn't specified, it defaults to 0777 & (~process.umask()).
   */
  mkdir(dirpath: string, mode?: string): void;

  /**
   * Recurse into a directory, executing callback for each file.
   *
   * Callback args:
   * abspath  - The full path to the current file,
   *            which is nothing more than the rootdir + subdir + filename arguments, joined.
   * rootdir  - The root director, as originally specified.
   * subdir   - The current file's directory, relative to rootdir.
   * filename - The filename of the current file, without any directory parts.
   */
  recurse(
    rootdir: string,
    callback: (
      abspath: string,
      rootdir: string,
      subdir: string,
      filename: string
    ) => void
  ): void;

  /**
   * Return a unique array of all file or directory paths that match the given globbing pattern(s).
   * This method accepts either comma separated globbing patterns or an array of globbing patterns.
   * Paths matching patterns that begin with ! will be excluded from the returned array.
   * Patterns are processed in order, so inclusion and exclusion order is significant.
   *
   * File paths are relative to the Gruntfile unless the current working directory is changed with
   * grunt.file.setBase or the --base command-line option.
   */
  expand(patterns: string | string[]): string[];
  expand(options: IFilesConfig, patterns: string | string[]): string[];

  /**
   * Returns an array of src-dest file mapping objects.
   * For each source file matched by a specified pattern, join that file path to the specified dest.
   * This file path may be flattened or renamed, depending on the options specified.
   *
   * @see FileModule.expand method documentation for an explanation of how the patterns
   *      and options arguments may be specified.
   */
  expandMapping(
    patterns: string[],
    dest: string,
    options: IExpandedFilesConfig
  ): IFileMap[];

  /**
   * Match one or more globbing patterns against one or more file paths.
   * Returns a uniqued array of all file paths that match any of the specified globbing patterns.
   * Both the patterns and filepaths argument can be a single string or array of strings.
   * Paths matching patterns that begin with ! will be excluded from the returned array.
   * Patterns are processed in order, so inclusion and exclusion order is significant.
   */
  match(pattern: string, filepath: string): string[];
  match(pattern: string, filepaths: string[]): string[];
  match(patterns: string[], filepath: string): string[];
  match(patterns: string[], filepaths: string[]): string[];
  match(
    options: minimatch.IMinimatchOptions,
    pattern: string,
    filepath: string
  ): string[];
  match(
    options: minimatch.IMinimatchOptions,
    pattern: string,
    filepaths: string[]
  ): string[];
  match(
    options: minimatch.IMinimatchOptions,
    patterns: string[],
    filepath: string
  ): string[];
  match(
    options: minimatch.IMinimatchOptions,
    patterns: string[],
    filepaths: string[]
  ): string[];

  /**
   * This method contains the same signature and logic as the grunt.file.match method,
   * but simply returns true if any files were matched, otherwise false.
   *
   * @see FileModule.match
   */
  isMatch(pattern: string, filepath: string): boolean;
  isMatch(pattern: string, filepaths: string[]): boolean;
  isMatch(patterns: string[], filepath: string): boolean;
  isMatch(patterns: string[], filepaths: string[]): boolean;
  isMatch(
    options: minimatch.IMinimatchOptions,
    pattern: string,
    filepath: string
  ): boolean;
  isMatch(
    options: minimatch.IMinimatchOptions,
    pattern: string,
    filepaths: string[]
  ): boolean;
  isMatch(
    options: minimatch.IMinimatchOptions,
    patterns: string[],
    filepath: string
  ): boolean;
  isMatch(
    options: minimatch.IMinimatchOptions,
    patterns: string[],
    filepaths: string[]
  ): boolean;

  /*
   * Like the Node.js path.join method, the methods below will
   * join all arguments together and normalize the resulting path.
   */

  /**
   * Does the given path exist?
   */
  exists(path: string, ...append: string[]): boolean;

  /**
   * Is the given path a symbolic link?
   */
  isLink(path: string, ...append: string[]): boolean;

  /**
   * Is the given path a symbolic link?
   */
  isDir(path: string, ...append: string[]): boolean;

  /**
   * Is the given path a file?
   */
  isFile(path: string, ...append: string[]): boolean;

  /**
   * Is a given file path absolute?
   */
  isPathAbsolute(path: string, ...append: string[]): boolean;

  /**
   * Do all the specified paths refer to the same path?
   */
  arePathsEquivalent(path: string, ...append: string[]): boolean;

  /**
   * Are all descendant path(s) contained within the specified ancestor path?
   */
  doesPathContain(ancestorPath: string, decendantPaths: string[]): boolean;

  /**
   * Is a given file path the current working directory (CWD)?
   */
  isPathCwd(path: string, ...append: string[]): boolean;

  /**
   * Change grunt's current working directory (CWD).
   * By default, all file paths are relative to the Gruntfile.
   * This works just like the --base command-line option.
   */
  setBase(path: string, ...append: string[]): void;

  // External libraries
  // TODO: Create declarations
  glob: any;
  minimatch: any;
  findup: any;
}

/**
 * A convenience type.
 *
 * {@link http://gruntjs.com/configuring-tasks#files}
 */
export interface IFilesArray extends Array<IFilesConfig> {}

/**
 * {@link http://gruntjs.com/configuring-tasks#files}
 */
interface IFilesConfig extends minimatch.IMinimatchOptions {
  /**
   * Pattern(s) to match, relative to the {@link IExpandedFilesConfig.cwd}.
   */
  src?: string[] | undefined;

  /**
   * Destination path prefix.
   */
  dest?: string | undefined;

  /**
   * Process a dynamic src-dest file mapping,
   * @see {@link http://gruntjs.com/configuring-tasks#building-the-files-object-dynamically for more information.
   */
  expand?: boolean | undefined; // = false

  /**
   * Either a valid fs.Stats method name:
   * - isFile
   * - isDirectory
   * - isBlockDevice
   * - isCharacterDevice
   * - isSymbolicLink
   * - isFIFO
   * - isSocket
   *
   * or a function that is passed the matched src filepath and returns true or false.
   *
   * string
   * (src: string) => boolean
   */
  // filter?: string
  // filter?: (src: string) => boolean
  filter?: any;

  /**
   * Patterns will be matched relative to this path, and all returned filepaths will
   * also be relative to this path.
   */
  cwd?: string | undefined;
}

/**
 * These are valid for compact-format
 */
interface IExpandedFilesConfig extends IFilesConfig {
  /**
   * Enables the following options
   */
  expand?: boolean | undefined; // = true

  /**
   * All {@link IExpandedFilesConfig.src} matches are relative to (but don't include) this path.
   */
  cwd?: string | undefined;

  /**
   * Replace any existing extension with this value in generated {@link IExpandedFilesConfig.dest} paths.
   */
  ext?: string | undefined;

  /**
   * Remove all path parts from generated {@link IExpandedFilesConfig.dest} paths.
   */
  flatten?: boolean | undefined;

  /**
   * This function is called for each matched src file, (after extension renaming and flattening).
   * The {@link IExpandedFilesConfig.dest} and matched {@link IExpandedFilesConfig.src} path are passed in,
   * and this function must return a new dest value.
   * If the same dest is returned more than once, each src which used it will be added to an array of sources for it.
   */
  rename?: Function | undefined;
}

/**
 * @see {@link http://gruntjs.com/configuring-tasks#files-array-format}
 */
interface IFileMap {
  /**
   * source filenames.
   */
  src: string[];
  /**
   * destination filename.
   */
  dest: string;
}

const win32 = process.platform === "win32";

// Normalize \\ paths to / paths.
const unixifyPath = (filepath: string): string => {
  if (win32) {
    return filepath.replace(/\\/g, "/");
  } else {
    return filepath;
  }
};

type Pattern = string | Pattern[];

// Process specified wildcard glob patterns or filenames against a
// callback, excluding and uniquing files in the result set.
const processPatterns = (
  patterns: Pattern,
  fn: (pattern: string) => string[]
): string[] => {
  // Filepaths to return.
  let result: string[] = [];

  // Iterate over flattened patterns array.
  util._.flattenDeep(patterns).forEach((pattern) => {
    // If the first character is ! it should be omitted
    const exclusion = pattern.indexOf("!") === 0;

    // If the pattern is an exclusion, remove the !
    if (exclusion) {
      pattern = pattern.slice(1);
    }
    // Find all matching files for this pattern.
    const matches = fn(pattern);

    if (exclusion) {
      // If an exclusion, remove matching files.
      result = util._.difference(result, matches);
    } else {
      // Otherwise add matching files.
      result = util._.union(result, matches);
    }
  });
  return result;
};

type ExpandOptions = glob.IOptions & {
  filter?: ((filepath: string) => boolean) | "isFile" | "isDirectory";
  cwd?: string; // override current working directory
};

type FileMapping = {
  src: string[];
  dest: string;
}

class GruntFile implements FileModule {
  public glob = glob;
  public minimatch = minimatch;
  public findup = findup;

  public setBase(...paths: string[]) {
    const dirpath = path.join(...paths);
    process.chdir(dirpath);
  }

  /**
   * Match one or more globbing patterns against one or more file paths.
   * Returns a uniqued array of all file paths that match any of the specified globbing patterns.
   * Both the patterns and filepaths argument can be a single string or array of strings.
   * Paths matching patterns that begin with ! will be excluded from the returned array.
   * Patterns are processed in order, so inclusion and exclusion order is significant.
   */
  public match(pattern: string, filepath: string): string[];
  public match(pattern: string, filepaths: string[]): string[];
  public match(patterns: string[], filepath: string): string[];
  public match(patterns: string[], filepaths: string[]): string[];
  public match(
    options: minimatch.IMinimatchOptions,
    pattern: string,
    filepath: string
  ): string[];
  public match(
    options: minimatch.IMinimatchOptions,
    pattern: string,
    filepaths: string[]
  ): string[];
  public match(
    options: minimatch.IMinimatchOptions,
    patterns: string[],
    filepath: string
  ): string[];
  public match(
    options: minimatch.IMinimatchOptions,
    patterns: string[],
    filepaths: string[]
  ): string[];

  // implementation
  public match(
    optionsOrPatterns: minimatch.IMinimatchOptions | string | string[],
    patternsOrFilepaths?: string | string[],
    filepathsArg?: string | string[]
  ): string[] {
    let options: minimatch.IMinimatchOptions;
    let patterns: string | string[];
    let filepaths: string | string[];

    if (
      util.kindOf(optionsOrPatterns) === "object" &&
      !Array.isArray(optionsOrPatterns)
    ) {
      options = optionsOrPatterns as minimatch.IMinimatchOptions;
      patterns = patternsOrFilepaths!;
      filepaths = filepathsArg!;
    } else {
      options = {};
      patterns = optionsOrPatterns as string | string[];
      filepaths = patternsOrFilepaths!;
    }

    if (patterns == null || filepaths == null) return [];
    if (!Array.isArray(patterns)) patterns = [patterns];
    if (!Array.isArray(filepaths)) filepaths = [filepaths];
    if (patterns.length === 0 || filepaths.length === 0) return [];

    return processPatterns(patterns, (pattern) =>
      this.minimatch.match(filepaths!, pattern, options)
    );
  }

  /**
   * This method contains the same signature and logic as the grunt.file.match method,
   * but simply returns true if any files were matched, otherwise false.
   *
   * @see FileModule.match
   */
  isMatch(pattern: string, filepath: string): boolean;
  isMatch(pattern: string, filepaths: string[]): boolean;
  isMatch(patterns: string[], filepath: string): boolean;
  isMatch(patterns: string[], filepaths: string[]): boolean;
  isMatch(
    options: minimatch.IMinimatchOptions,
    pattern: string,
    filepath: string
  ): boolean;
  isMatch(
    options: minimatch.IMinimatchOptions,
    pattern: string,
    filepaths: string[]
  ): boolean;
  isMatch(
    options: minimatch.IMinimatchOptions,
    patterns: string[],
    filepath: string
  ): boolean;
  isMatch(
    options: minimatch.IMinimatchOptions,
    patterns: string[],
    filepaths: string[]
  ): boolean;

  // implementation
  public isMatch(
    optionsOrPatterns: minimatch.IMinimatchOptions | string | string[],
    patternsOrFilepaths?: string | string[],
    filepaths?: string | string[]
  ): boolean {
    return (
      this.match(
        optionsOrPatterns as Parameters<typeof this.match>[0],
        patternsOrFilepaths as Parameters<typeof this.match>[1],
        filepaths as Parameters<typeof this.match>[2]
      ).length > 0
    );
  }

  /**
   * Return an array of all file paths that match the given wildcard patterns.
   */
  public expand(
    optionsOrPatterns: ExpandOptions | string | string[],
    ...patternsRest: (string | string[])[]
  ): string[] {
    let options: ExpandOptions = {};
    let patterns: string[];

    // If the first argument is an options object, separate it
    if (typeof optionsOrPatterns === "object" && !Array.isArray(optionsOrPatterns)) {
      options = optionsOrPatterns as ExpandOptions;
      patterns = Array.isArray(patternsRest[0]) ? patternsRest[0] as string[] : (patternsRest as string[]);
    } else {
      patterns = [optionsOrPatterns as string, ...patternsRest.flat() as string[]];
    }

    if (patterns.length === 0) return [];

    let matches = processPatterns(patterns, (pattern) => this.glob.sync(pattern, options));

    // Apply filter if specified
    if (options.filter) {
      matches = matches.filter((filepath) => {
        filepath = path.join(options.cwd || "", filepath);
        try {
          if (typeof options.filter === "function") {
            return options.filter(filepath);
          } else {
            const stat = fs.statSync(filepath);
            if (options.filter === "isFile") return stat.isFile();
            if (options.filter === "isDirectory") return stat.isDirectory();
            return false;
          }
        } catch {
          return false;
        }
      });
    }

    return matches;
  }


  /**
   * Returns an array of src-dest file mapping objects.
   * For each source file matched by a specified pattern, join that file path to the specified dest.
   * This file path may be flattened or renamed, depending on the options specified.
   *
   * @see FileModule.expand method documentation for an explanation of how the patterns
   *      and options arguments may be specified.
   */
  expandMapping(
    patterns: string[],
    destBase: string,
    opts: IExpandedFilesConfig
  ): IFileMap[] {
    const pathSeparatorRe = /[\/\\]/g;

	// The "ext" option refers to either everything after the first dot (default)
	// or everything after the last dot.
	const extDotRe = {
		first: /(\.[^\/]*)?$/,
		last: /(\.[^\/\.]*)?$/,
	} as const;

    const options = {
      extDot: "first",
      rename: (destBase: string, destPath: string) => path.join(destBase || "", destPath),
      ...opts,
    } as const;

    const files: FileMapping[] = [];
    const fileByDest: Record<string, FileMapping> = {};

    this.expand(options as ExpandOptions, patterns).forEach((src) => {
      let destPath = src;

      if (options.flatten) {
        destPath = path.basename(destPath);
      }

      if ("ext" in options && options.ext !== undefined) {
        destPath = destPath.replace(extDotRe[options.extDot!], options.ext);
      }

      let dest = options.rename(destBase, destPath, options);

      if (options.cwd) {
        src = path.join(options.cwd, src);
      }

      // Normalize paths to unix-style
      dest = dest.replace(pathSeparatorRe, "/");
      src = src.replace(pathSeparatorRe, "/");

      if (fileByDest[dest]) {
        fileByDest[dest].src.push(src);
      } else {
        const mapping: FileMapping = { src: [src], dest };
        files.push(mapping);
        fileByDest[dest] = mapping;
      }
    });

    return files;
  }
}

export default new GruntFile();
