import grunt from "../grunt";
import util from "grunt-legacy-util";


export enum ErrorCode {
  NoError = 0,
  Fatal = 1,
  MissingGruntfile = 2,
  Task = 3,
  Template = 4,
  Autocomplete = 5,
  Warning = 6,
};

/**
 * Public facing interface for fail module.
 */
interface FailModule {
    /**
     * Display a warning and abort Grunt immediately.
     * Grunt will continue processing tasks if the --force command-line option was specified.
     */
    warn(error: string, errorCode?: ErrorCode): void;
    warn(error: Error, errorCode?: ErrorCode): void;

    /**
     * Display a warning and abort Grunt immediately.
     */
    fatal(error: string, errorCode?: ErrorCode): void;
    fatal(error: Error, errorCode?: ErrorCode): void;
}

/**
 * Internal interface for fail module.
 */
interface Fail extends FailModule {
  code: typeof ErrorCode;
  errorcount: number;
  warncount: number;
  report(): void;
}


// The module to be exported.
const fail = {
  code: ErrorCode,
  errorcount: 0,
  warncount: 0,
} as Fail;

// DRY it up!
/**
 * Util function.
 * Original code just commented "DRY it up!". Idk what that means. 
 */
const writeln = (e: string | Error, mode: "warn" | "fatal") => {
  grunt.log.muted = false;
  let msg: string = e instanceof Error ? e.message : e;
  if (!grunt.option('no-color')) { msg += '\x07'; } // Beep!
  if (mode === 'warn') {
    msg = 'Warning: ' + msg + ' ';
    msg += (grunt.option('force') ? 'Used --force, continuing.'.underline : 'Use --force to continue.');
    msg = msg.yellow;
  } else {
    msg = ('Fatal error: ' + msg).red;
  }
  grunt.log.writeln(msg);
}

interface ErrorWithOrig {
  origError: { stack: string };
}

const isErrorWithOrig = (e: unknown): e is ErrorWithOrig => {
  return typeof e === 'object' && e !== null && "origError" in e;
}

/**
 * Util function.
 * Dumps the error stack if --stack is enabled.
 */
function dumpStack(e: Error | ErrorWithOrig) {
  if (!grunt.option('stack')) return;

  if (isErrorWithOrig(e)) {
    console.log(e.origError.stack);
  } else if(e.stack) {
    console.log(e.stack);
  }
}

// A warning occurred. Abort immediately unless -f or --force was used.
fail.warn = (e: string | Error, errcode?: ErrorCode) => {
  var message = typeof e === 'string' ? e : e.message;
  fail.warncount++;
  writeln(message, 'warn');
  // If -f or --force aren't used, stop script processing.
  if (!grunt.option('force')) {
    if(e instanceof Error) dumpStack(e);
    grunt.log.writeln().fail('Aborted due to warnings.');
    grunt.util.exit(typeof errcode === 'number' ? errcode : fail.code.Warning);
  }
};

fail.fatal = (e: string | Error, errcode?: ErrorCode): void => {
  writeln(e, 'fatal');
  if(e instanceof Error) dumpStack(e);
  util.exit(typeof errcode === 'number' ? errcode : fail.code.Fatal);
};

// This gets called at the very end.
fail.report = () => {
  if (fail.warncount > 0) {
    grunt.log.writeln().fail('Done, but with warnings.');
  } else {
    grunt.log.writeln().success('Done.');
  }
};

export default fail;
