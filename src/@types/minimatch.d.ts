/**
 * {@link https://github.com/isaacs/minimatch}
 */
declare module "minimatch" {
    /**
     * A minimal matching utility options.
     *
     * This is the matching library used internally by npm.
     * Eventually, it will replace the C binding in node-glob.
     * It works by converting glob expressions into JavaScript RegExp objects.
     */
    interface IMinimatchOptions {
        /*
         All options are false by default.
         */

        /**
         * Dump a ton of stuff to stderr.
         */
        debug?: boolean | undefined;

        /**
         * Do not expand {a,b} and {1..3} brace sets.
         */
        nobrace?: boolean | undefined;

        /**
         * Disable ** matching against multiple folder names.
         */
        noglobstar?: boolean | undefined;

        /**
         * Allow patterns to match filenames starting with a period,
         * even if the pattern does not explicitly have a period in that spot.
         */
        // Note that by default, a/**\/b will not match a/.d/b, unless dot is set.
        dot?: boolean | undefined;

        /**
         * Disable "extglob" style patterns like +(a|b).
         */
        noext?: boolean | undefined;

        /**
         * Perform a case-insensitive match.
         */
        nocase?: boolean | undefined;

        /**
         * When a match is not found by minimatch.match, return a list containing the pattern itself.
         * When set, an empty list is returned if there are no matches.
         */
        nonull?: boolean | undefined;

        /**
         * If set, then patterns without slashes will be matched against the basename of the path if it contains slashes.
         * For example, a?b would match the path /xyz/123/acb, but not /xyz/acb/123.
         */
        matchBase?: boolean | undefined;

        /**
         * Suppress the behavior of treating # at the start of a pattern as a comment.
         */
        nocomment?: boolean | undefined;

        /**
         * Suppress the behavior of treating a leading ! character as negation.
         */
        nonegate?: boolean | undefined;

        /**
         * Returns from negate expressions the same as if they were not negated. (Ie, true on a hit, false on a miss.)
         */
        flipNegate?: boolean | undefined;
    }
    
    /**
     * Filter an array of file paths, returning only those that match a glob pattern.
     *
     * This is a convenience method provided by Grunt’s use of `minimatch`.
     *
     * @param list - An array of file paths to match against.
     * @param pattern - The glob pattern to match each file path.
     * @param options - Optional minimatch options (dot, nocase, etc.).
     * @returns A new array containing only the file paths that match the pattern.
     *
     * @example
     * const files = ["a.js", "b.ts", "c.js"];
     * const jsFiles = minimatch.match(files, "*.js");
     * // jsFiles => ["a.js", "c.js"]
     */
    function match(list: string[], pattern: string, options?: Minimatch.IOptions): string[];
}