"""
Unit tests for the Python capture adapter. The Page object is duck-typed, so
a fake exercises the full capture flow without a browser — same approach as
the WebdriverIO adapter's tests.
"""

import json
from pathlib import Path

import pytest

from testivai import STABILIZE_CSS, build_ignore_css, load_local_config, sanitize_variant, witness


class FakeStyleHandle:
    def __init__(self):
        self.removed = False

    def evaluate(self, script):
        if "remove" in script:
            self.removed = True


class FakePage:
    """Duck-typed playwright.sync_api.Page covering witness()'s surface."""

    PNG = b"\x89PNG\r\n\x1a\nfakepixels"

    def __init__(self, dom="<html><head></head><body><p>Hi</p></body></html>", fail_screenshot=False):
        self.dom = dom
        self.fail_screenshot = fail_screenshot
        self.styles: list[str] = []
        self.handles: list[FakeStyleHandle] = []
        self.evaluated: list[tuple] = []

    def add_style_tag(self, content):
        self.styles.append(content)
        handle = FakeStyleHandle()
        self.handles.append(handle)
        return handle

    def evaluate(self, script, arg=None):
        self.evaluated.append((script, arg))
        if "document.fonts" in script:
            return True
        if "cloneNode" in script:
            # simulate exclusion: drop any selector's text crudely for assertions
            dom = self.dom
            for sel in arg or []:
                dom = dom.replace(f'<div class="{sel.lstrip(".")}">SECRET</div>', "")
            return dom
        return None

    def screenshot(self, path, full_page):
        assert full_page is True
        if self.fail_screenshot:
            raise RuntimeError("boom")
        Path(path).write_bytes(self.PNG)


@pytest.fixture()
def project(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    return tmp_path


def write_config(root: Path, **overrides):
    cfg = {"mode": "local", **overrides}
    (root / ".testivai").mkdir(parents=True, exist_ok=True)
    (root / ".testivai" / "config.json").write_text(json.dumps(cfg))


def test_writes_screenshot_and_dom(project):
    page = FakePage()
    temp = witness(page, "homepage")

    assert temp == project / ".testivai" / "temp" / "homepage"
    assert (temp / "screenshot.png").read_bytes() == FakePage.PNG
    assert "<p>Hi</p>" in (temp / "dom.html").read_text()


def test_stabilization_css_injected_and_removed(project):
    page = FakePage()
    witness(page, "x")

    assert any("animation-duration: 0.001s" in s for s in page.styles)
    assert all(h.removed for h in page.handles)
    # fonts were awaited
    assert any("document.fonts" in script for script, _ in page.evaluated)


def test_stabilize_false_via_config(project):
    write_config(project, stabilize=False)
    page = FakePage()
    witness(page, "x")

    assert page.styles == []


def test_per_call_stabilize_override_wins(project):
    write_config(project, stabilize=True)
    page = FakePage()
    witness(page, "x", stabilize=False)
    assert page.styles == []


def test_ignore_selectors_merged_and_passed_to_dom_snapshot(project):
    write_config(project, ignoreSelectors=[".from-config"])
    page = FakePage(dom='<html><body><div class="badge">SECRET</div><p>Hi</p></body></html>')
    witness(page, "x", ignore_selectors=[".badge"])

    injected = "\n".join(page.styles)
    assert ".from-config { visibility: hidden !important; }" in injected
    assert ".badge { visibility: hidden !important; }" in injected

    # the DOM snapshot script received the merged selector list
    dom_calls = [arg for script, arg in page.evaluated if "cloneNode" in script]
    assert dom_calls == [[".from-config", ".badge"]]


def test_variant_folds_into_name(project):
    page = FakePage()
    temp = witness(page, "homepage", variant="Firefox Mobile @2x")
    assert temp.name == "homepage__firefox_mobile_2x"


def test_skip_dom(project):
    page = FakePage()
    temp = witness(page, "no-dom", skip_dom=True)
    assert (temp / "screenshot.png").exists()
    assert not (temp / "dom.html").exists()


def test_style_removed_even_when_screenshot_fails(project):
    page = FakePage(fail_screenshot=True)
    with pytest.raises(RuntimeError, match="boom"):
        witness(page, "explodes")
    assert all(h.removed for h in page.handles)


def test_empty_name_rejected(project):
    with pytest.raises(ValueError):
        witness(FakePage(), "")


def test_helpers():
    assert sanitize_variant("Desktop Chrome @ 2x") == "desktop_chrome_2x"
    assert "visibility: hidden" in build_ignore_css([".x"])
    assert "caret-color: transparent" in STABILIZE_CSS
    cfg = load_local_config(Path("/nonexistent"))
    assert cfg["stabilize"] is True and cfg["threshold"] == 0.1
