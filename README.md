# 风味地图 · Food Map

一张真实世界/中国地图（svg-maps，Claude 暖色），把《风味人间》纪录片里的美食钉在产地上。每个标点是该菜的手绘 SVG 插画；点一道菜，看插画、介绍、纪录片文案，并能溯源到「哪一季哪一集」。另有「风味连接」视图，按集展示纪录片里食物之间的跨地域连接。纯前端、无构建、无后端、无地图 key。

当前内容：**《风味人间》第 1 季全 8 集 + 第 2 季全 8 集 + 第 3 季全 8 集 + 第 4 季全 6 集**，共 408 道美食。
- S1E1 山海之间 / S1E2 落地生根 / S1E3 滚滚红尘 / S1E4 肴变万千 / S1E5 江湖夜雨 / S1E6 香料歧路 / S1E7 万家灯火 / S1E8 风味之旅（幕后寻味，仅收新登场食物）
- S2E1 甜蜜缥缈录 / S2E2 螃蟹横行记 / S2E3 酱料四海谈 / S2E4 杂碎逆袭史 / S2E5 鸡肉风情说 / S2E6 颗粒苍穹传 / S2E7 香肠万象集 / S2E8 根茎春秋志
- S3·大海小鲜 E1 天涯·四海为家 …… 全 8 集（海洋主题，含 E8 赓续·代代相传）
- S4·谷物星球 E1 麦浪涌万年 / E2 稻香阡陌里 / E3 黍粟本嘉禾 / E4 种豆南山下 / E5 薯芋新天地 / E6 百谷皆风味

## 两个视图

- **风味地图**：世界图（海外美食单点 + 「中国 N 道」聚合）→ 点中国聚合钻取到中国近景图（按省份铺开）。点标点弹详情面板，可「查看本集全文」。
- **风味连接**：顶部切换进入，按集标签查看；选中某集，在世界图上铺开该集的菜，相连的菜之间画主题彩色弧线（如「面食西传」「嗜臭·发酵」「小龙虾·跨洋」），hover/点击弧线显示主题、高亮整条风味链。

## 运行

需要用 HTTP server（数据用 `fetch()` 读取，不能 `file://` 直接打开）：

```bash
python -m http.server 8000
# http://localhost:8000/            欢迎/门户页（滚动式，深色影院感 → 暖色）
# http://localhost:8000/fengwei.html 《风味人间》地图应用
```

入口结构：`index.html` 是欢迎/门户页（门户卡片点《风味人间》进入地图）；地图应用整套在 `fengwei.html`。以后每档新节目各占一页，门户再加卡片。

## 交互

- 世界视图：海外美食为单个图钉；中国为「中国 · N道」聚合气泡。
- 点中国气泡 → 切换到中国近景图，中国美食按省份散开；点「← 返回世界」回到世界图。
- 点任一图钉 → 右侧详情面板（插画 / 菜名 / 地点 / 季·集 / 美食介绍 / 纪录片文案）。
- 面板「查看本集全文」→ 打开该集全文，自动高亮当前菜段落；顶部导航可在集内各菜之间跳转。

## 目录结构

```
index.html            欢迎/门户页（插画墙、数据统计、节目入口卡片）
home.css              门户页样式（深色影院感 → 暖色渐变）
fengwei.html          《风味人间》地图应用主体（地图、面板、全文层）
styles.css            地图应用暖色调样式
src/home.js           门户页交互（count-up、滚动进场、风味连接 demo）
src/projection.js     经纬度 → SVG 坐标的线性映射（纯函数）
src/data.js           加载 dishes.json，按 world/china 分组
src/map.js            两层地图渲染、图钉、聚合气泡、钻取/返回、防重叠
src/panel.js          右侧详情面板
src/fulltext.js       本集全文覆盖层（高亮 + 集内跳转）
dishes.json           美食数据（一菜一条，408 道）
episodes/fwS-EE.json  各集结构化全文（带段落锚点 + links 连接数组）
assets/svg/*.svg      408 张扁平填色美食插画 + _spec.md 视觉规范
assets/covers/        各季封面图（s1.jpg … s4.jpg 等）
assets/world.svg      世界底图（svg-maps，国家 path）
assets/china.svg      中国底图（svg-maps，省份 path）
tests.html            坐标投影纯函数浏览器测试页（应显示 ALL PASS）
validate.py           数据校验（结构 / 坐标 / svg 与锚点引用一致性）
```

## 底图与对齐

底图来自 [svg-maps](https://github.com/VictorCazanave/svg-maps)（MapSVG 导出，每文件带 `mapsvg:geoViewBox`，已用 CSS 统一为 Claude 暖色）。

- **中国近景**：china.svg 为圆锥投影，经纬度线性投影在边缘/高纬会偏；中国图钉改用 `src/map.js` 中 `CHINA_PX` 的**校准像素坐标**（仿射拟合各省中心后吸附到所在省份，逐一验证落对省）。新增中国菜时在 `CHINA_PX` 补一条 `dishId → [x,y]`（缺省回退到经纬度线性投影）。
- **世界视图**：world.svg 为 Miller 类投影，线性投影不准；海外图钉改为按所在国家 path（`ES`/`FR`/`NL`）几何中心放置，「中国」聚合气泡按 `CN` path 中心放置。新增国家时在 `src/map.js` 的 `WORLD_REGION` 补一条 `dishId → ISO2` 即可。

## 平移 / 缩放

地图支持**滚轮缩放**（对准光标）、**拖动平移**、**双击复位**。实现为操作 `#map` 的 `viewBox`（`src/map.js` 底部），图钉与底图一起变换；拖动位移 <3px 视为点击，不影响图钉点击。

## 风味连接

- 连接是**集内**关系，存在每集 `episodes/fwX-YY.json` 的 `links` 数组：`[{a:菜id, b:菜id, theme:"主题", desc:"一句解释性话语"}]`。`desc` 在点击弧线时随主题一同展示（第 1、2、4 季均带 `desc`）。
- 渲染见 `src/map.js` 的 `renderConnections`：该集菜按地理铺在世界图（中国菜由 `worldPixel` 按 **Mercator 公式**定位，再 `worldSnapCN` 贴回 CN 陆地），相连菜画二次贝塞尔弧，颜色按主题分配（`THEME_PALETTE`），hover/点击高亮同主题链并显示主题文字。
- 散开后用位移上限（`CAP`）约束沿海密集簇，避免图钉被甩离真实产地；`ensureOnLand`：中国近景图防重叠后，把落到海里的图钉就近吸附回陆地。

## 如何按集扩展

1. 在 `episodes/` 新增 `fwX-YY.json`（结构同 `fw1-01.json`：有序 `paragraphs` + 美食段落 `anchor`/`dishId`；可选 `links` 连接数组）。
2. 在 `dishes.json` 追加该集记录（`scope`=`world`/`china`；`episodeAnchor` 对应锚点；`svg`=`<id>.svg`）。
3. 按 `assets/svg/_spec.md` 为每道菜画一张 SVG。
4. 海外菜在 `src/map.js` 的 `WORLD_REGION` 补 `dishId → ISO2`；中国菜默认走仿射投影，落位不准时在 `CHINA_PX` 补 `dishId → [x,y]`（用 `isPointInFill` 验证落对省）。
5. 运行 `python validate.py`，再用 http server 预览校验。
