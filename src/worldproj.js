// 世界底图(world.svg, Miller/Mercator 类投影)的几何参数 + 经纬度→像素纯函数。map.js 与 home.js 共用。
export const WORLD_GEO = { lngMin:-169.110266, lngMax:190.486279, latTop:83.600842, latBottom:-58.508473, width:1009.6727, height:665.96301 };
export function worldMerc(lng, lat, geo = WORLD_GEO){
  const merc = l => Math.log(Math.tan(Math.PI/4 + l*Math.PI/360));
  const MTOP = merc(geo.latTop), MBOT = merc(geo.latBottom);
  return {
    x: (lng - geo.lngMin)/(geo.lngMax - geo.lngMin) * geo.width,
    y: (MTOP - merc(lat))/(MTOP - MBOT) * geo.height
  };
}
