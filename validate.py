#!/usr/bin/env python3
"""校验 dishes.json 与 episodes/*.json 的结构与引用一致性。"""
import json, os, sys, glob

ROOT = os.path.dirname(os.path.abspath(__file__))
REQUIRED = ["id","name","season","episode","episodeTitle","region",
            "lng","lat","scope","intro","quote","episodeAnchor","svg"]

def fail(msg): print("FAIL:", msg); sys.exit(1)

def main():
    with open(os.path.join(ROOT,"dishes.json"),encoding="utf-8") as f:
        dishes = json.load(f)
    if not isinstance(dishes, list) or not dishes:
        fail("dishes.json 应为非空数组")
    ids = set()
    for d in dishes:
        for k in REQUIRED:
            if k not in d: fail(f"{d.get('id','?')} 缺字段 {k}")
        if d["id"] in ids: fail(f"重复 id {d['id']}")
        ids.add(d["id"])
        if d["scope"] not in ("world","china"): fail(f"{d['id']} scope 非法")
        if not (-180 <= d["lng"] <= 180): fail(f"{d['id']} lng 越界")
        if not (-90 <= d["lat"] <= 90): fail(f"{d['id']} lat 越界")
        svg = os.path.join(ROOT,"assets","svg",d["svg"])
        if not os.path.exists(svg): fail(f"{d['id']} 缺 svg 文件 {d['svg']}")
        ep = os.path.join(ROOT,"episodes",f"fw{d['season']}-{d['episode']:02d}.json")
        if not os.path.exists(ep): fail(f"{d['id']} 缺集文件 {ep}")
        with open(ep,encoding="utf-8") as f:
            anchors = {p["anchor"] for p in json.load(f)["paragraphs"] if "anchor" in p}
        if d["episodeAnchor"] not in anchors:
            fail(f"{d['id']} 的 episodeAnchor {d['episodeAnchor']} 在 {ep} 中不存在")
    print(f"OK: {len(dishes)} dishes valid")

if __name__ == "__main__":
    main()
