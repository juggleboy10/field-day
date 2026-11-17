"""v102: the frame-rate readout, VR sharpness and the camera's eyepiece in heavy places.

  - the readout is off by default; the Settings switch turns it on, and it's remembered
  - with it on: the corner readout in the browser, the numbers on the watch panel, and the frame rate on the watch face
  - draw calls are counted per frame, and a place over budget is marked heavy
  - VR sharpness: the setting is remembered and sets the framebuffer scale when VR starts
  - fixed foveation goes to full when VR starts
  - in a heavy place the eyepiece draws every other frame; elsewhere every frame

    THREE_JS=/path/to/three.min.js python3 tests/v102.py
"""
import os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = (ROOT / "index.html").as_uri()
fails = []
def check(name, ok, extra=""):
    print(("ok   " if ok else "FAIL ") + name + (f"  [{extra}]" if extra and not ok else ""))
    if not ok: fails.append(name)

# a pretend headset: enough of WebXR for enterVR to run
FAKE_XR = """
(() => {
  window.__xr = { scale: null, fov: null };
  const layer = { fixedFoveation: 0, framebufferWidth: 100, framebufferHeight: 100, framebuffer: null, getViewport: () => ({ x: 0, y: 0, width: 50, height: 100 }) };
  class Session extends EventTarget {
    constructor() { super(); this.renderState = { baseLayer: null }; this.inputSources = []; this.visibilityState = 'visible'; }
    updateRenderState(s) { if (s.baseLayer) this.renderState.baseLayer = layer; }
    requestReferenceSpace() { return Promise.resolve({ getOffsetReferenceSpace() { return this; } }); }
    requestAnimationFrame() { return 1; }
    cancelAnimationFrame() {}
    end() { this.dispatchEvent(new Event('end')); return Promise.resolve(); }
  }
  window.XRWebGLLayer = function (s, gl, opts) { window.__xr.scale = opts && opts.framebufferScaleFactor; return layer; };
  window.__xrLayer = layer;
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) if (C) C.prototype.makeXRCompatible = () => Promise.resolve();
  Object.defineProperty(navigator, 'xr', { value: { isSessionSupported: () => Promise.resolve(true), requestSession: () => Promise.resolve(new Session()), addEventListener() {} }, configurable: true });
})();
"""

def open_page(b, q="?test", init=None):
    page = b.new_page()     # (b is one browser profile: what one page saves, the next one finds)
    page.route("**/three.min.js", lambda r: r.fulfill(path=os.environ["THREE_JS"], content_type="application/javascript"))
    for pat in ("**/fonts.g*/**", "**/cdn.jsdelivr.net/**", "**/records.php*", "**/photos.php*"): page.route(pat, lambda r: r.abort())
    errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
    if init: page.add_init_script(init)
    page.goto(PAGE + q); page.wait_for_function("window.__fdReady === true", timeout=60000)
    return page, errs

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--use-gl=swiftshader", "--no-sandbox"])
    b = browser.new_context()
    page, errs = open_page(b)
    check("readout off by default", page.evaluate("__fd.PERF.on === false && !document.getElementById('perf-toggle').checked"))
    check("VR sharpness starts at Normal", page.evaluate("document.getElementById('vr-scale').value") == "normal")
    page.click("#perf-toggle")
    page.select_option("#vr-scale", "fast")
    check("turning it on is remembered", page.evaluate("__fd.PERF.on === true && JSON.stringify(localStorage).includes('\\\\\"perf\\\\\":true')"),
          page.evaluate("JSON.stringify(localStorage).slice(0, 300)"))
    page.evaluate("__fd.startGame('flat')")
    page.wait_for_timeout(2300)
    txt = page.evaluate("(document.getElementById('perf') || {}).textContent || ''")
    check("the corner readout shows in the browser", "fps" in txt and "draws" in txt and page.evaluate("!document.getElementById('perf').hidden"), txt)
    calls = page.evaluate("__fd.PERF.calls")
    check("draw calls are counted", calls > 20, str(calls))
    check("the clubhouse isn't heavy", page.evaluate("__fd.state.heavy") is False, str(calls))
    i = page.evaluate("LEVEL_META.findIndex((m) => m.id === 'recess')")
    page.evaluate(f"__fd.switchLevel({i})"); page.wait_for_function(f"__fd.state.level === {i}"); page.wait_for_timeout(600)
    check("recess is heavy", page.evaluate("__fd.state.heavy") is True, str(page.evaluate("__fd.PERF.calls")))
    # the watch: numbers on the panel and the face
    page.evaluate("__fd.watch.draw()")
    check("watch panel draws with the readout on", page.evaluate("__fd.watch.draw().length > 1000"))
    page.close()
    # remembered next time, with the sharpness
    page, errs2 = open_page(b, "?test", FAKE_XR)
    check("still on after reloading", page.evaluate("__fd.PERF.on === true && document.getElementById('perf-toggle').checked"))
    check("sharpness remembered", page.evaluate("document.getElementById('vr-scale').value") == "fast")
    page.evaluate("document.getElementById('btn-vr').disabled = false; document.getElementById('btn-vr').click()")
    page.wait_for_function("__fd.state.mode === 'vr'", timeout=10000)
    xr = page.evaluate("({ scale: window.__xr.scale, fov: window.__xrLayer.fixedFoveation })")
    check("VR starts at the chosen sharpness (0.8)", abs((xr["scale"] or 0) - 0.8) < 1e-6, str(xr))
    check("fixed foveation at full", xr["fov"] == 1, str(xr))
    page.close()
    errs3 = []
    browser.close()

# the eyepiece rule itself, read from the source (driving the real eyepiece needs a headset pose held to the eye)
src = (ROOT / "src/js/app/camera.js").read_text()
check("eyepiece skips alternate frames when heavy", "(!state.heavy || C.frame % 2 === 0) && aim()) renderTo(eyeRT)" in src)
check("no page errors", not (errs or errs2 or errs3), str((errs + errs2 + errs3)[:3]))
print(f"\n{len(fails)} failed" if fails else "\nall passed")
sys.exit(1 if fails else 0)
