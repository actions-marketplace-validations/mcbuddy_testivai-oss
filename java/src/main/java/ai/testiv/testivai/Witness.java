package ai.testiv.testivai;

import com.google.gson.Gson;
import com.microsoft.playwright.ElementHandle;
import com.microsoft.playwright.Page;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

/**
 * Local-first visual regression capture for playwright-java.
 *
 * <p>Semantics mirror the JS adapters (@testivai/witness-playwright) exactly:
 * stabilization CSS completes animations at their final state; {@code
 * ignoreSelectors} are hidden from pixels AND excluded from the DOM snapshot;
 * {@code variant} keys parallel browsers/viewports into distinct baselines.
 *
 * <p>On-disk contract (shared with every TestivAI adapter):
 * {@code .testivai/temp/<name>/screenshot.png} + {@code dom.html}. The
 * compare/report half runs via the {@code @testivai/witness} CLI — see
 * {@link Runner#runReport()}.
 */
public final class Witness {

  /** Mirrors STABILIZE_CSS in @testivai/witness-playwright. */
  static final String STABILIZE_CSS =
      "*, *::before, *::after {"
          + " animation-duration: 0.001s !important;"
          + " animation-delay: 0s !important;"
          + " animation-iteration-count: 1 !important;"
          + " transition-duration: 0.001s !important;"
          + " transition-delay: 0s !important;"
          + " caret-color: transparent !important;"
          + " scroll-behavior: auto !important;"
          + " }";

  private static final String FONTS_READY_JS =
      "() => document.fonts ? document.fonts.status !== 'loading' : true";

  private static final String DOM_SNAPSHOT_JS =
      "(selectors) => {"
          + " const clone = document.documentElement.cloneNode(true);"
          + " for (const sel of selectors) {"
          + "   try { clone.querySelectorAll(sel).forEach(el => el.remove()); } catch (e) {}"
          + " }"
          + " return clone.outerHTML;"
          + "}";

  private Witness() {}

  /** Capture with defaults. */
  public static Path witness(Page page, String name) {
    return witness(page, name, new CaptureOptions());
  }

  /** Capture a visual snapshot; returns the temp directory written. */
  public static Path witness(Page page, String name, CaptureOptions options) {
    if (name == null || name.isBlank()) {
      throw new IllegalArgumentException("testivai: snapshot name is required");
    }
    Path root = options.projectRoot != null ? options.projectRoot : Path.of("").toAbsolutePath();
    LocalConfig config = LocalConfig.load(root);

    boolean stabilize = options.stabilize != null ? options.stabilize : config.stabilize;
    LinkedHashSet<String> selectors = new LinkedHashSet<>(config.ignoreSelectors);
    selectors.addAll(options.ignoreSelectors);

    String effectiveName =
        options.variant != null
            ? name + "__" + options.variant.replaceAll("[^a-zA-Z0-9_-]+", "_").toLowerCase(Locale.ROOT)
            : name;

    List<String> cssParts = new ArrayList<>();
    if (stabilize) cssParts.add(STABILIZE_CSS);
    if (!selectors.isEmpty()) {
      StringBuilder sb = new StringBuilder();
      for (String sel : selectors) sb.append(sel).append(" { visibility: hidden !important; }\n");
      cssParts.add(sb.toString());
    }

    ElementHandle styleHandle = null;
    if (!cssParts.isEmpty()) {
      try {
        styleHandle =
            page.addStyleTag(new Page.AddStyleTagOptions().setContent(String.join("\n", cssParts)));
      } catch (RuntimeException ignored) {
        // locked-down page; capture proceeds
      }
      if (stabilize) waitForFonts(page);
    }

    Path tempDir = root.resolve(".testivai").resolve("temp").resolve(effectiveName);
    try {
      Files.createDirectories(tempDir);
      try {
        page.screenshot(
            new Page.ScreenshotOptions()
                .setPath(tempDir.resolve("screenshot.png"))
                .setFullPage(true));
      } finally {
        if (styleHandle != null) {
          try {
            styleHandle.evaluate("el => el.remove()");
          } catch (RuntimeException ignored) {
            // best-effort cleanup
          }
        }
      }

      if (!options.skipDom) {
        try {
          Object dom = page.evaluate(DOM_SNAPSHOT_JS, new ArrayList<>(selectors));
          if (dom instanceof String s && !s.isEmpty()) {
            Files.writeString(tempDir.resolve("dom.html"), s, StandardCharsets.UTF_8);
          }
        } catch (RuntimeException ignored) {
          // missing dom.html only suppresses the noise hint
        }
      }
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
    return tempDir;
  }

  private static void waitForFonts(Page page) {
    long deadline = System.nanoTime() + 10_000_000_000L; // 10s bounded
    while (System.nanoTime() < deadline) {
      try {
        Object ready = page.evaluate(FONTS_READY_JS);
        if (Boolean.TRUE.equals(ready)) return;
      } catch (RuntimeException e) {
        return;
      }
      try {
        Thread.sleep(100);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        return;
      }
    }
  }

  /** Minimal .testivai/config.json subset the capture side needs. */
  static final class LocalConfig {
    boolean stabilize = true;
    List<String> ignoreSelectors = new ArrayList<>();

    static LocalConfig load(Path root) {
      Path file = root.resolve(".testivai").resolve("config.json");
      LocalConfig defaults = new LocalConfig();
      if (!Files.exists(file)) return defaults;
      try {
        Raw raw = new Gson().fromJson(Files.readString(file), Raw.class);
        if (raw == null) return defaults;
        LocalConfig cfg = new LocalConfig();
        cfg.stabilize = raw.stabilize != null ? raw.stabilize : true;
        if (raw.ignoreSelectors != null) cfg.ignoreSelectors = raw.ignoreSelectors;
        return cfg;
      } catch (IOException | RuntimeException e) {
        return defaults;
      }
    }

    private static final class Raw {
      Boolean stabilize;
      List<String> ignoreSelectors;
    }
  }
}
