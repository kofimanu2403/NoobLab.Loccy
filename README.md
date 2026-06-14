# NoobLab

**NoobLab** is a web-based environment for teaching introductory programming. It combines a rich code editor, visual programming (Blockly), immediate execution of student code (in the browser where possible), graphics and simulation support, automated testing/submission flows, and detailed activity tracking.

It was originally developed at Kingston University as a practical teaching platform that could be embedded in courses or learning management systems (including Canvas integration).

## Key Features

- **Languages**
  - **Java** — both in-browser (via a vendored Doppio JVM-in-JavaScript) and server-side compilation + execution with custom I/O redirection
  - **Python** — in-browser via Skulpt
  - **C++** — server-side execution support
- Visual programming blocks (Blockly) with custom extensions (e.g. "Carol" robot, graphics primitives)
- Full-featured text editor based on CodeMirror with themes, folding, search, etc.
- Built-in 2D graphics / sprite / canvas system that student Java code can drive
- Lesson delivery system that loads external (or embedded) HTML content containing specially marked-up sections, submission boxes, hidden test code, and parameter blocks
- Time-of-day, physical location (IP), and prerequisite-based unlocking of content
- Per-user data directory for saved work, submissions, scores, and logs
- Leaderboards, activity logging, emotion/self-report logging
- Embed and single-sign-on friendly (designed for use inside an LMS)
- Admin overrides and medal awarding tools

## Quick Start

The easiest way to get a working instance for development or testing is the provided startup script:

```bash
./start.sh
```

`start.sh` will:

1. Detect the platform and verify that Java and Maven (plus a few small utilities) are available.
2. Check whether the large supporting assets needed for Java execution (class libraries and `rt.jar` for the legacy compile path) are already present.
3. If they are missing, extract them from archives that are already committed in the repository (`newdoppio/doppio_home.zip` and `doppio/browser/mini-rt.tar`). This is deliberately local-only so it does not consume bandwidth on every run.
4. Build the project (`mvn clean package`).
5. Launch an embedded Jetty server on port 8080.

Open http://localhost:8080/ in your browser.

You can choose a different port with:

```bash
PORT=9090 ./start.sh
```

On subsequent runs the script detects that the assets are already installed and skips the extraction step completely.

After the first run you can also start the server directly with:

```bash
mvn jetty:run
```

## Building a WAR

```bash
mvn clean package
```

The resulting artifact is `target/NoobLab.war`.

## Configuration

NoobLab is configured through servlet context parameters. The defaults are in `src/main/webapp/WEB-INF/web.xml`. Important parameters include:

- `datadir` — base directory on the server where per-user data, submissions, etc. are stored (example: `/data/noobdata`).
- `authType` — one of `ldap`, `ad`, `remote`, or `pretend`.
- LDAP / Active Directory connection details (when using directory authentication).
- `remote` authentication URL (when `authType` points at an external login service).
- `adminExceptions` — regex of usernames that bypass IP/time/place restrictions.
- `override` / `overrideLoginPw` — passwords that allow awarding medals or logging in as any user.
- `ssoreferer`, `emsources`, `homeip` — controls for single-sign-on, embed medals, and workshop presence detection.
- `canvastoken` — used by the built-in AJAX proxy for Canvas LMS integration.
- `httpsOnImages`, `mailhost`, `adminaddress`, etc.

In a real deployment you will typically override these via your servlet container's context configuration rather than editing `web.xml` directly.

## How Lessons Work

NoobLab is primarily a **runtime and interaction layer**. Teaching content is supplied as HTML (either fetched from a `contentsrc` URL or served locally).

The content uses a set of conventions that the frontend and the `Main` servlet understand:

- `<div class="section">` blocks become the navigable "pages" of a lesson.
- `<div class="parameter">` blocks supply metadata (course number, lesson number, language, altstyle, locks, etc.).
- `<div class="submit">` elements become "submit your work" buttons that send code back to the server.
- Special hidden blocks and `hiddenrun` spans contain test harness code.
- Internal links (starting with `#`) are rewritten to stay inside the NoobLab frame.

Many exercises also make use of the built-in graphics or Carol robot, which are driven from student Java code via the `com.nooblab.Graphics` bridge that evaluates JavaScript on the parent page.

## Java Execution Notes

Running Java both in the browser and on the server in a teaching context is non-trivial. NoobLab uses:

- A snapshot of **Doppio** (a JavaScript implementation of a JVM) for in-browser Java.
- Standard `javac` (with a legacy `rt.jar` bootclasspath for Java 6 target compatibility when needed, or straight 1.8 for the modern path) on the server.
- Custom class rewriting (`IORedefiner`) so that `System.in/out/err` and file I/O can be captured and driven from the web UI.

Because the full set of JDK class files and a usable `rt.jar` are large, they are stored in compressed archives inside the repository. The `start.sh` script (and the code in `JavaRunningUtils`) expects them to be expanded under `src/main/webapp/doppio/vendor/` at runtime. The script ensures this happens efficiently and only when necessary.

Historical notes on how the current Doppio snapshot was obtained are in `src/main/webapp/newdoppio/readme.txt`.

## Project Layout

- `src/main/java/uk/ac/kingston/nooblab/` — core servlets (Main, JavaRunner, RunPython, CPPRunner, Login, stats, submission handling, etc.)
- `src/main/webapp/` — the entire web UI (JSPs, CSS, the massive collection of static assets, CodeMirror, Blockly, Skulpt, the two Doppio trees, images, sounds, etc.)
- `pom.xml` — Maven WAR build (originally very old plugins; updated for modern JDK/Maven compatibility)

## Requirements

- Java 11 or newer (the project builds and runs on JDK 17+; student code can still target older Java levels via the legacy path)
- Apache Maven
- For production use: a servlet container compatible with the Servlet 3.0 `web.xml` (Tomcat 9, GlassFish 3/4, etc.)

## Development

The `start.sh` script is the recommended entry point for local development. It was added to make the (somewhat unusual) asset and build requirements easy to satisfy while respecting bandwidth on repeated runs.

Pull requests and issues are welcome, but be aware this is an older academic codebase with a large amount of legacy JavaScript and a number of integration points (Canvas, institutional auth, etc.) that may need adaptation.

## Credits & Third-Party Components

NoobLab incorporates or is built on top of many open source projects, including:

- CodeMirror
- Blockly
- Skulpt (Python in the browser)
- Doppio (JavaScript JVM) + BrowserFS + xterm.js (see `newdoppio/readme.txt`)
- Various jQuery plugins, gif handling, etc.

See the individual component directories and licenses for details.
