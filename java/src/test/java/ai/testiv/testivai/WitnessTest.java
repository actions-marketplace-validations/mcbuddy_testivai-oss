package ai.testiv.testivai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.microsoft.playwright.ElementHandle;
import com.microsoft.playwright.Page;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;

/**
 * Unit tests for the Java capture adapter — the Page is mocked (same
 * duck-typed approach as the Python adapter's FakePage), so the full capture
 * flow runs without a browser.
 */
class WitnessTest {

  private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 'f', 'a', 'k', 'e'};

  @TempDir Path root;

  private Page page;
  private ElementHandle styleHandle;

  @BeforeEach
  void setUp() {
    page = mock(Page.class);
    styleHandle = mock(ElementHandle.class);
    when(page.addStyleTag(any(Page.AddStyleTagOptions.class))).thenReturn(styleHandle);
    // fonts ready immediately
    when(page.evaluate(contains("document.fonts"))).thenReturn(Boolean.TRUE);
    // DOM snapshot script
    when(page.evaluate(contains("cloneNode"), any()))
        .thenReturn("<html><head></head><body><p>Hi</p></body></html>");
    // screenshot writes the file at the requested path
    when(page.screenshot(any(Page.ScreenshotOptions.class)))
        .thenAnswer(
            inv -> {
              Page.ScreenshotOptions opts = inv.getArgument(0);
              Files.write(opts.path, PNG);
              return PNG;
            });
  }

  @Test
  void writesScreenshotAndDom() throws IOException {
    Path temp = Witness.witness(page, "homepage", new CaptureOptions().setProjectRoot(root));

    assertEquals(root.resolve(".testivai").resolve("temp").resolve("homepage"), temp);
    assertTrue(Files.exists(temp.resolve("screenshot.png")));
    assertTrue(Files.readString(temp.resolve("dom.html")).contains("<p>Hi</p>"));
  }

  @Test
  void stabilizationCssInjectedAndRemoved() {
    Witness.witness(page, "x", new CaptureOptions().setProjectRoot(root));

    ArgumentCaptor<Page.AddStyleTagOptions> captor =
        ArgumentCaptor.forClass(Page.AddStyleTagOptions.class);
    verify(page).addStyleTag(captor.capture());
    assertTrue(captor.getValue().content.contains("animation-duration: 0.001s"));
    verify(styleHandle).evaluate("el => el.remove()");
  }

  @Test
  void stabilizeFalseSkipsCss() {
    Witness.witness(page, "x", new CaptureOptions().setProjectRoot(root).setStabilize(false));
    verify(page, never()).addStyleTag(any(Page.AddStyleTagOptions.class));
  }

  @Test
  void configStabilizeFalseRespected() throws IOException {
    Files.createDirectories(root.resolve(".testivai"));
    Files.writeString(
        root.resolve(".testivai").resolve("config.json"), "{\"mode\":\"local\",\"stabilize\":false}");

    Witness.witness(page, "x", new CaptureOptions().setProjectRoot(root));
    verify(page, never()).addStyleTag(any(Page.AddStyleTagOptions.class));
  }

  @Test
  void ignoreSelectorsMergedFromConfigAndCall() throws IOException {
    Files.createDirectories(root.resolve(".testivai"));
    Files.writeString(
        root.resolve(".testivai").resolve("config.json"),
        "{\"mode\":\"local\",\"ignoreSelectors\":[\".from-config\"]}");

    Witness.witness(
        page, "x", new CaptureOptions().setProjectRoot(root).setIgnoreSelectors(List.of(".badge")));

    ArgumentCaptor<Page.AddStyleTagOptions> captor =
        ArgumentCaptor.forClass(Page.AddStyleTagOptions.class);
    verify(page).addStyleTag(captor.capture());
    String css = captor.getValue().content;
    assertTrue(css.contains(".from-config { visibility: hidden !important; }"));
    assertTrue(css.contains(".badge { visibility: hidden !important; }"));

    // merged selectors reach the DOM-exclusion script
    ArgumentCaptor<Object> arg = ArgumentCaptor.forClass(Object.class);
    verify(page).evaluate(contains("cloneNode"), arg.capture());
    assertEquals(List.of(".from-config", ".badge"), arg.getValue());
  }

  @Test
  void variantFoldsIntoName() {
    Path temp =
        Witness.witness(
            page, "homepage", new CaptureOptions().setProjectRoot(root).setVariant("Firefox Mobile @2x"));
    assertEquals("homepage__firefox_mobile_2x", temp.getFileName().toString());
  }

  @Test
  void skipDomOmitsDomHtml() {
    Path temp = Witness.witness(page, "no-dom", new CaptureOptions().setProjectRoot(root).setSkipDom(true));
    assertTrue(Files.exists(temp.resolve("screenshot.png")));
    assertFalse(Files.exists(temp.resolve("dom.html")));
    verify(page, never()).evaluate(contains("cloneNode"), any());
  }

  @Test
  void styleRemovedEvenWhenScreenshotThrows() {
    when(page.screenshot(any(Page.ScreenshotOptions.class))).thenThrow(new RuntimeException("boom"));

    assertThrows(
        RuntimeException.class,
        () -> Witness.witness(page, "explodes", new CaptureOptions().setProjectRoot(root)));
    verify(styleHandle).evaluate("el => el.remove()");
  }

  @Test
  void blankNameRejected() {
    assertThrows(IllegalArgumentException.class, () -> Witness.witness(page, " "));
    assertThrows(IllegalArgumentException.class, () -> Witness.witness(page, null, new CaptureOptions()));
  }
}
