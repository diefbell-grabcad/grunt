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
}

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
 * Class implementing fail module.
 */
class Fail implements FailModule {
  code = ErrorCode;
  errorcount = 0;
  warncount = 0;

  private writeln(e: string | Error, mode: "warn" | "fatal") {
    grunt.log.muted = false;
    let msg: string = e instanceof Error ? e.message : e;
    if (!grunt.option("no-color")) {
      msg += "\x07"; // Beep
    }

    if (mode === "warn") {
      msg = "Warning: " + msg + " ";
      msg += grunt.option("force")
        ? "Used --force, continuing.".underline
        : "Use --force to continue.";
      msg = msg.yellow;
    } else {
      msg = ("Fatal error: " + msg).red;
    }

    grunt.log.writeln(msg);
  }

  private dumpStack(e: string | (Error & { origError?: { stack?: string } })) {
    if (!grunt.option("stack")) return;
    if (e instanceof Error) {
      if (e.origError?.stack) {
        console.log(e.origError.stack);
      } else if (e.stack) {
        console.log(e.stack);
      }
    }
  }

  warn(e: string | Error, errcode?: ErrorCode) {
    const message = typeof e === "string" ? e : e.message;
    this.warncount++;
    this.writeln(message, "warn");

    if (!grunt.option("force")) {
      this.dumpStack(e);
      grunt.log.writeln().fail("Aborted due to warnings.");
      grunt.util.exit(
        typeof errcode === "number" ? errcode : this.code.Warning
      );
    }
  }

  fatal(e: string | Error, errcode?: ErrorCode) {
    this.writeln(e, "fatal");
    this.dumpStack(e);
    util.exit(typeof errcode === "number" ? errcode : this.code.Fatal);
  }

  report() {
    if (this.warncount > 0) {
      grunt.log.writeln().fail("Done, but with warnings.");
    } else {
      grunt.log.writeln().success("Done.");
    }
  }
}

// Export a singleton instance to match original behavior
export default new Fail();
