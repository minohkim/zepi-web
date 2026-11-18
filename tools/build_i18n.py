"""i18n/strings.json(한국어 → [영어, 중국어, 일본어]) + i18n/core.js → i18n.js"""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
d = json.loads((root / "i18n/strings.json").read_text(encoding="utf-8"))
core = (root / "i18n/core.js").read_text(encoding="utf-8")
out = core + "\nwindow.ZI18N.dict = " + json.dumps(d, ensure_ascii=False, separators=(",", ":")) + ";\n"
(root / "i18n.js").write_text(out, encoding="utf-8")
print(len(d), "phrases")
