package ai.testiv.testivai;

import java.io.IOException;
import java.nio.file.Path;

/**
 * Runs the compare/report half of the pipeline via the {@code
 * @testivai/witness} CLI. Node.js is present wherever playwright-java is —
 * Playwright for Java ships a Node driver.
 *
 * <p>Resolution: {@code TESTIVAI_CLI} env override → {@code npx --yes
 * @testivai/witness}.
 */
public final class Runner {

  private Runner() {}

  /** Run {@code testivai report} in the working directory. */
  public static int runReport() {
    return runReport(Path.of("").toAbsolutePath(), false);
  }

  /** Run {@code testivai report} in {@code projectRoot}. Returns the exit code. */
  public static int runReport(Path projectRoot, boolean failOnDiff) {
    ProcessBuilder pb;
    String override = System.getenv("TESTIVAI_CLI");
    if (override != null && !override.isBlank()) {
      String[] parts = (override + " report -q" + (failOnDiff ? " --fail-on-diff" : "")).split("\\s+");
      pb = new ProcessBuilder(parts);
    } else if (failOnDiff) {
      pb = new ProcessBuilder("npx", "--yes", "@testivai/witness", "report", "-q", "--fail-on-diff");
    } else {
      pb = new ProcessBuilder("npx", "--yes", "@testivai/witness", "report", "-q");
    }
    pb.directory(projectRoot.toFile());
    pb.inheritIO();
    try {
      return pb.start().waitFor();
    } catch (IOException e) {
      System.err.println(
          "[testivai] could not run the @testivai/witness CLI (" + e.getMessage() + "). "
              + "Captures are in .testivai/temp/ — run `npx testivai report` manually.");
      return -1;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      return -1;
    }
  }
}
