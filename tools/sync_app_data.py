#!/usr/bin/env python3
"""앱(footprint) Dart 자료 → 웹 js/app-data.js
노래(data/songs.json) · 즐길 거리(season_theme.dart seasonActs) · 딱 좋은 코스(data/courses.json)
쓰는 법: python3 tools/sync_app_data.py ../footprint-repo
"""
import json, re, sys, pathlib

app = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "../footprint-repo") / "lib"
S = r"'((?:[^'\\]|\\.)*)'"
un = lambda s: s.replace("\\'", "'")

def strs(x): return [un(a) for a in re.findall(S, x or "")]

# ---- 노래
# 노래: 원본은 이 저장소의 data/songs.json (앱도 이 파일을 받아 써요)
sj = json.loads((pathlib.Path(__file__).resolve().parent.parent / "data" / "songs.json").read_text())
songs = [dict(x, places=x.get("places", []), sido=x.get("sido", "")) for x in sj["songs"]]

# ---- 즐길 거리
st = (app / "season_theme.dart").read_text()
blk = st[st.index("const seasonActs"):]
blk = blk[:blk.index("\n];")]
acts = []
for m in re.finditer(r"SeasonAct\(" + S + r",\s*" + S + r",\s*" + S + r",\s*(\d+),\s*(\d+),\s*ActGo\.(\w+)([^)]*)\)", blk):
    rest = m[7]
    arg = re.search(r"arg:\s*" + S, rest)
    a = {"emoji": un(m[1]), "title": un(m[2]), "why": un(m[3]), "from": int(m[4]), "to": int(m[5]), "go": m[6], "arg": un(arg[1]) if arg else ""}
    if "indoor: true" in rest: a["indoor"] = True
    acts.append(a)

# ---- 코스: 원본은 이 저장소의 data/courses.json (앱도 이 파일을 받아 써요)
cj = json.loads((pathlib.Path(__file__).resolve().parent.parent / "data" / "courses.json").read_text())
courses = [dict(c, stops=[dict(st, q=st.get("q") or st["name"]) for st in c["stops"]]) for c in cj["courses"]]

assert len(songs) > 150 and len(acts) > 50 and len(courses) > 20, (len(songs), len(acts), len(courses))
out = pathlib.Path(__file__).resolve().parent.parent / "js" / "app-data.js"
out.write_text("// tools/sync_app_data.py 가 앱(lib/songs.dart·season_theme.dart·courses.dart)에서 만든 파일이에요. 손으로 고치지 말고 앱을 고친 뒤 다시 돌려 주세요.\n"
               "window.ZAPPDATA = " + json.dumps({"songs": songs, "acts": acts, "courses": courses}, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(len(songs), "songs", len(acts), "acts", len(courses), "courses ->", out)
