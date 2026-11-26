#!/usr/bin/env python3
"""앱(footprint) Dart 자료 → 웹 js/app-data.js
노래(songs.dart) · 즐길 거리(season_theme.dart seasonActs) · 딱 좋은 코스(courses.dart)
쓰는 법: python3 tools/sync_app_data.py ../footprint-repo
"""
import json, re, sys, pathlib

app = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "../footprint-repo") / "lib"
S = r"'((?:[^'\\]|\\.)*)'"
un = lambda s: s.replace("\\'", "'")

def strs(x): return [un(a) for a in re.findall(S, x or "")]

# ---- 노래
src = (app / "songs.dart").read_text()
book = src[src.index("const songBook"):src.index("];", src.index("const songBook"))]
songs = []
for m in re.finditer(r"Song\(" + S + r",\s*" + S + r"(?:,\s*\{([^}]*)\})?(?:,\s*\[([^\]]*)\])?(?:,\s*" + S + r")?\)", book):
    songs.append({"title": un(m[1]), "artist": un(m[2]), "tags": strs(m[3]), "places": strs(m[4]), "sido": un(m[5] or "")})
def mapblock(name):
    b = src[src.index("const " + name):]
    b = b[:b.index("};")]
    return {un(k): [int(n) for n in v.split(",") if n.strip()] for k, v in re.findall(S + r":\s*\{([^}]*)\}", b)}
months, days = mapblock("songMonths"), mapblock("songDays")
for s in songs:
    if s["title"] in months: s["months"] = months[s["title"]]
    if s["title"] in days: s["days"] = days[s["title"]]

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

# ---- 코스
cs = (app / "courses.dart").read_text()
body = cs[cs.index("const courses"):cs.index("int courseDriveMin")]
stories = dict((un(k), un(v)) for k, v in re.findall(S + r":\s*" + S, cs[cs.index("const courseStories"):]))
courses = []
for chunk in re.split(r"\n  Course\(", body)[1:]:
    g = lambda k: (re.search(k + r":\s*" + S, chunk) or [None, ""])[1]
    num = lambda k, d: float(re.search(k + r":\s*([\d.]+)", chunk)[1]) if re.search(k + r":\s*([\d.]+)", chunk) else d
    lst = lambda k: [int(n) for n in (re.search(k + r":\s*\[([^\]]*)\]", chunk) or [None, ""])[1].split(",") if n.strip()]
    tags = strs((re.search(r"tags:\s*\{([^}]*)\}", chunk) or [None, ""])[1])
    stops = []
    for sm in re.finditer(r"CourseStop\(" + S + r",\s*" + S + r",\s*" + S + r"(?:,\s*query:\s*" + S + r")?\)", chunk):
        stops.append({"time": un(sm[1]), "name": un(sm[2]), "note": un(sm[3]), "q": un(sm[4] or sm[2])})
    cid = g("id")
    courses.append({"id": cid, "title": un(g("title")), "area": un(g("area")), "lat": num("lat", 0), "lng": num("lng", 0),
                    "pop": int(num("pop", 2)), "days": int(num("days", 1)), "months": lst("months"), "peak": lst("peak"),
                    "tags": tags, "line": un(g("line")), "eat": un(g("eat")), "stops": stops, "story": stories.get(cid, "")})

assert len(songs) > 150 and len(acts) > 50 and len(courses) > 20, (len(songs), len(acts), len(courses))
out = pathlib.Path(__file__).resolve().parent.parent / "js" / "app-data.js"
out.write_text("// tools/sync_app_data.py 가 앱(lib/songs.dart·season_theme.dart·courses.dart)에서 만든 파일이에요. 손으로 고치지 말고 앱을 고친 뒤 다시 돌려 주세요.\n"
               "window.ZAPPDATA = " + json.dumps({"songs": songs, "acts": acts, "courses": courses}, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(len(songs), "songs", len(acts), "acts", len(courses), "courses ->", out)
