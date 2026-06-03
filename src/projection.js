// 经纬度 → SVG 坐标的线性映射。cfg: {lngMin,lngMax,latTop,latBottom,width,height}
export function project(lng, lat, cfg) {
  const x = (lng - cfg.lngMin) / (cfg.lngMax - cfg.lngMin) * cfg.width;
  const y = (cfg.latTop - lat) / (cfg.latTop - cfg.latBottom) * cfg.height;
  return { x, y };
}
