# 风味地图 · Food Map

一张手绘 SVG 世界地图，把《风味人间》纪录片里的美食钉在产地上。点一道菜，看插画、介绍、纪录片文案，并能溯源到「哪一季哪一集」。纯前端、无构建、无后端、无地图 key。

当前内容：**风味人间 1 · 第 1 集《山海之间》**，14 道美食（海外 3 + 中国 11）。

## 运行

需要用 HTTP server（数据用 `fetch()` 读取，不能 `file://` 直接打开）：

```bash
python -m http.server 8000
# 浏览器打开 http://localhost:8000/
```

## 交互

- 世界视图：海外美食为单个图钉；中国为「中国 · N道」聚合气泡。
- 点中国气泡 → 切换到中国近景图，中国美食按省份散开；点「← 返回世界」回到世界图。
- 点任一图钉 → 右侧详情面板（插画 / 菜名 / 地点 / 季·集 / 美食介绍 / 纪录片文案）。
- 面板「查看本集全文」→ 打开该集全文，自动高亮当前菜段落；顶部导航可在集内各菜之间跳转。

## 目录结构

```
index.html            应用主体（地图、面板、全文层）
styles.css            Claude 暖色调样式
src/projection.js     经纬度 → SVG 坐标的线性映射（纯函数）
src/data.js           加载 dishes.json，按 world/china 分组
src/map.js            两层地图渲染、图钉、聚合气泡、钻取/返回、防重叠
src/panel.js          右侧详情面板
src/fulltext.js       本集全文覆盖层（高亮 + 集内跳转）
dishes.json           美食数据（一菜一条）
episodes/fw1-01.json  第1集结构化全文（带段落锚点）
assets/svg/*.svg      14 张扁平填色美食插画 + _spec.md 视觉规范
assets/world.svg      世界底图（svg-maps，国家 path）
assets/china.svg      中国底图（svg-maps，省份 path）
tests.html            坐标投影纯函数浏览器测试页（应显示 ALL PASS）
validate.py           数据校验（结构 / 坐标 / svg 与锚点引用一致性）
```

## 底图与对齐

底图来自 [svg-maps](https://github.com/VictorCazanave/svg-maps)（MapSVG 导出，每文件带 `mapsvg:geoViewBox`，已用 CSS 统一为 Claude 暖色）。

- **中国近景**：china.svg 近似等距圆柱投影，图钉由 `src/projection.js` 按经纬度线性投影定位（精确落到省份）。
- **世界视图**：world.svg 为 Miller 类投影，线性投影不准；海外图钉改为按所在国家 path（`ES`/`FR`/`NL`）几何中心放置，「中国」聚合气泡按 `CN` path 中心放置。新增国家时在 `src/map.js` 的 `WORLD_REGION` 补一条 `dishId → ISO2` 即可。

## 如何按集扩展

1. 在 `episodes/` 新增 `fwX-YY.json`（结构同 `fw1-01.json`：有序 `paragraphs`，美食段落带 `anchor` + `dishId`）。
2. 在 `dishes.json` 追加该集美食记录（`scope` 为 `world` 或 `china`；`episodeAnchor` 对应全文锚点；`svg` 指向插画文件名）。
3. 按 `assets/svg/_spec.md` 规范为每道新菜画一张 SVG，放入 `assets/svg/`。
4. 运行 `python validate.py` 确认数据一致，再用 http server 预览。
