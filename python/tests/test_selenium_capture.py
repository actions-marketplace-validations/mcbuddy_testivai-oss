"""
Unit tests for the Selenium capture adapter. The WebDriver is duck-typed,
so fakes exercise the full capture flow without a browser — same approach
as the playwright adapter's tests.
"""

import base64
import json
from pathlib import Path

import pytest

from testivai.selenium import _STYLE_ID, witness


PNG = b"\x89PNG\r\n\x1a\nfakepixels"
PNG_B64 = base64.b64encode(PNG).decode()


class FakeChromeDriver:
    """Duck-typed Chrome: CDP full-page + execute_script surface."""

    capabilities = {"browserName": "chrome"}

    def __init__(self, dom="<html><head></head><body><p>Hi</p></body></html>", fail_cdp=False):
        self.dom = dom
        self.fail_cdp = fail_cdp
        self.scripts: list[tuple] = []
        self.injected_css: list[str] = []
        self.style_removed = False
        self.viewport_screenshots = 0

    def execute_script(self, script, *args):
        self.scripts.append((script, args))
        if "createElement('style')" in script:
            self.injected_css.append(args[1])
            return None
        if "getElementById" in script and "remove" in script:
            self.style_removed = True
            return None
        if "document.fonts" in script:
            return True
        if "cloneNode" in script:
            dom = self.dom
            for sel in args[0] or []:
                dom = dom.replace(f'<div class="{sel.lstrip(".")}">SECRET</div>', "")
            return dom
        return None

    def execute_cdp_cmd(self, cmd, params):
        assert cmd == "Page.captureScreenshot"
        assert params["captureBeyondViewport"] is True
        if self.fail_cdp:
            raise RuntimeError("cdp boom")
        return {"data": PNG_B64}

    def get_screenshot_as_png(self):
        self.viewport_screenshots += 1
        return PNG


class FakeFirefoxDriver(FakeChromeDriver):
    capabilities = {"browserName": "firefox"}

    def __init__(self, **kw):
        super().__init__(**kw)
        self.full_page_calls = 0

    execute_cdp_cmd = None  # firefox bindings have no CDP helper

    def get_full_page_screenshot_as_png(self):
        self.full_page_calls += 1
        return PNG


class FakeSafariDriver(FakeChromeDriver):
    capabilities = {"browserName": "safari"}
    execute_cdp_cmd = None


@pytest.fixture()
def project(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    return tmp_path


def write_config(root: Path, **overrides):
    cfg = {"mode": "local", **overrides}
    (root / ".testivai").mkdir(parents=True, exist_ok=True)
    (root / ".testivai" / "config.json").write_text(json.dumps(cfg))


def test_chrome_full_page_via_cdp(project):
    driver = FakeChromeDriver()
    temp = witness(driver, "homepage")

    assert temp == project / ".testivai" / "temp" / "homepage"
    assert (temp / "screenshot.png").read_bytes() == PNG
    assert "<p>Hi</p>" in (temp / "dom.html").read_text()
    assert driver.viewport_screenshots == 0  # CDP path, not viewport


def test_chrome_cdp_failure_falls_back_to_viewport(project):
    driver = FakeChromeDriver(fail_cdp=True)
    temp = witness(driver, "x")
    assert (temp / "screenshot.png").read_bytes() == PNG
    assert driver.viewport_screenshots == 1


def test_firefox_uses_native_full_page(project):
    driver = FakeFirefoxDriver()
    witness(driver, "x")
    assert driver.full_page_calls == 1
    assert driver.viewport_screenshots == 0


def test_unknown_browser_viewport_fallback(project):
    driver = FakeSafariDriver()
    witness(driver, "x")
    assert driver.viewport_screenshots == 1


def test_stabilization_css_injected_and_removed(project):
    driver = FakeChromeDriver()
    witness(driver, "x")

    assert any("animation-duration: 0.001s" in css for css in driver.injected_css)
    assert driver.style_removed
    assert any("document.fonts" in script for script, _ in driver.scripts)
    # style element uses the reserved id
    inject_calls = [a for s, a in driver.scripts if "createElement('style')" in s]
    assert inject_calls[0][0] == _STYLE_ID


def test_stabilize_false_via_config(project):
    write_config(project, stabilize=False)
    driver = FakeChromeDriver()
    witness(driver, "x")
    assert driver.injected_css == []


def test_ignore_selectors_merged_and_passed_to_dom_snapshot(project):
    write_config(project, ignoreSelectors=[".from-config"])
    driver = FakeChromeDriver(
        dom='<html><body><div class="badge">SECRET</div><p>Hi</p></body></html>'
    )
    witness(driver, "x", ignore_selectors=[".badge"])

    injected = "\n".join(driver.injected_css)
    assert ".from-config { visibility: hidden !important; }" in injected
    assert ".badge { visibility: hidden !important; }" in injected

    dom_calls = [args for script, args in driver.scripts if "cloneNode" in script]
    assert dom_calls == [([".from-config", ".badge"],)]
    assert "SECRET" not in (project / ".testivai" / "temp" / "x" / "dom.html").read_text()


def test_variant_folds_into_name(project):
    driver = FakeChromeDriver()
    temp = witness(driver, "homepage", variant="Firefox 128 @2x")
    assert temp.name == "homepage__firefox_128_2x"


def test_skip_dom(project):
    driver = FakeChromeDriver()
    temp = witness(driver, "no-dom", skip_dom=True)
    assert (temp / "screenshot.png").exists()
    assert not (temp / "dom.html").exists()


def test_style_removed_even_when_screenshot_fails(project):
    class Exploding(FakeChromeDriver):
        def execute_cdp_cmd(self, cmd, params):
            raise RuntimeError("boom")

        def get_screenshot_as_png(self):
            raise RuntimeError("boom")

    driver = Exploding()
    with pytest.raises(RuntimeError):
        witness(driver, "explodes")
    assert driver.style_removed


def test_empty_name_rejected(project):
    with pytest.raises(ValueError):
        witness(FakeChromeDriver(), "")


def test_top_level_alias():
    from testivai import witness_selenium

    assert witness_selenium is witness
