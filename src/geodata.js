// 地图静态查找表：海外国家中文名、中国各菜校准像素坐标、海外菜→国家 ISO2。
// 纯数据、无逻辑，从 map.js 抽出以减小其体积。

// 海外国家中文名(用于「国家·N道」聚合气泡标签)。
export const COUNTRY_NAME={ES:'西班牙',FR:'法国',NL:'荷兰',IR:'伊朗',MY:'马来西亚',PE:'秘鲁',MA:'摩洛哥',JP:'日本',SE:'瑞典',VN:'越南',US:'美国',TH:'泰国',NP:'尼泊尔',TR:'土耳其',NO:'挪威',IT:'意大利',KR:'韩国',IL:'以色列',MX:'墨西哥',ID:'印度尼西亚',PH:'菲律宾',NA:'纳米比亚',GB:'英国',DE:'德国',HU:'匈牙利',RO:'罗马尼亚'};

// 中国各菜在 china.svg(viewBox 774×569)用户坐标系下的精确像素位置。
// 由"仿射拟合各省中心 → 吸附到所在省份内"校准得到，逐一验证落在正确省份。
export const CHINA_PX = {
  'fw1-01-dawei-yang':[189.3,122.2],   // 新疆·阿勒泰
  'fw1-01-naitong-rou':[577.1,118.2],  // 内蒙古·呼伦贝尔
  'fw1-01-xun-machang':[181.2,136.1],  // 新疆·乌伦古河
  'fw1-01-mizhi-huofang':[560.1,404.3],// 安徽·南屏村
  'fw1-01-nianzhuan':[493.4,327.7],    // 河南·孟津
  'fw1-01-yangyu-jiaotuan':[384.6,317.0],// 甘肃·临洮
  'fw1-01-longxu-sun':[372.4,406.2],   // 四川·瓦屋山
  'fw1-01-bachu-mogu':[66.9,247.3],    // 新疆·巴楚
  'fw1-01-taihu-dazhaxie':[589.5,383.2],// 江苏·太湖
  'fw1-01-tuhuangyou':[594.7,381.3],   // 江苏·苏州
  'fw1-01-sanbei-qiyu':[600.7,508.0],  // 中国台湾·台东
  // 第2集：澳门三道(CN-92 区块极小，仿射够不着)→ 取澳门附近，渲染时由 pixelSpread 散开
  'fw1-02-majiexiu-qiu':[504.0,515.0], // 澳门·马介休球
  'fw1-02-feizhou-ji':[507.0,517.0],   // 澳门·非洲鸡
  'fw1-02-tacho':[506.0,513.0],        // 澳门·Tacho
  'fw4-01-xiazi-laomian':[503.0,517.0],// 澳门·虾子捞面
  'fw1-03-huzhou-yangrou':[603.0,407.0],// 浙江·湖州(贴苏浙界，置浙江纵深以抗防重叠位移)
  // 第4集：边界/小区/极西校准
  'fw1-04-pidan':[607.6,381.6],         // 上海·崇明(沪区极小)
  'fw1-04-meixiancaigeng':[601.2,398.0],// 浙江·宁波(贴沪界)
  'fw1-04-guoshou-mixian':[305.6,489.2],// 云南·德宏(极西南)
  'fw1-04-chaihui-yutou':[573.0,372.0], // 江苏·扬州(贴皖界)
  // 第5集：香港两道(CN-91 极小)→ 取香港附近，渲染时散开
  'fw1-05-chiyou-ji':[511.0,513.5],     // 香港·豉油鸡
  'fw1-05-huadiao-xiexie':[515.0,512.0],// 香港·花雕蒸花蟹
  // 第二季·第1集 甜蜜缥缈录
  'fw2-01-yangzhou-shuangjue':[575.0,368.0],// 江苏·扬州(贴皖界)
  'fw2-01-shaozhu':[509.0,514.0],       // 香港·烧猪
  'fw2-01-kugua-tang':[513.5,515.5],    // 香港·苦瓜回甘汤
  // 第二季·第2集 螃蟹横行记
  'fw2-02-huangyou-xie':[495.0,510.0],  // 广东·台山(粤西南近岸)
  'fw2-02-shuixie-zhou':[505.0,516.0],  // 澳门·水蟹粥
  'fw2-02-honggao-qiangxie':[606.0,405.0],// 浙江·花岙岛(置象山近岸防浮海)
  // 第二季·第3集 酱料四海谈
  'fw2-03-suanmei-shaoe':[510.0,513.0], // 香港·深井烧鹅
  'fw2-03-shacha':[560.0,470.0],        // 福建·泉州(置闽中纵深防浮海)
  // 第二季·第4集 杂碎逆袭史
  'fw2-04-zaohuo':[606.0,383.0],        // 上海(沪区小)
  // 第二季·第5集 鸡肉风情说
  'fw2-05-wenchang-ji':[466.0,556.0],   // 海南·文昌(海南岛小，固定落岛)
  // 第二季·第6集 颗粒苍穹传
  'fw2-06-wuyuzi':[596.0,500.0],        // 中国台湾·嘉义(台湾岛小，固定落岛)
  // 第二季·第7集 香肠万象集
  'fw2-07-moyu-chang':[589.0,501.0],    // 中国台湾·澎湖(置台湾岛防浮海)
  // 第二季·第8集 根茎春秋志
  'fw2-08-jiangmu-ya':[562.0,468.0],    // 福建·泉州(避与沙茶重叠，置闽中)
  // 第三季·近海小岛 / 海南 / 珠海岛礁
  'fw3-01-baoyu':[621.0,265.0],         // 辽宁·大连海洋岛
  'fw3-01-ganbao':[618.0,267.0],        // 辽宁·大连(与海洋岛散开)
  'fw3-01-longxia-yezi':[456.0,561.0],  // 海南·陵水(海南岛，防浮海)
  'fw3-01-longxia-mapo':[459.0,562.0],  // 海南·陵水(散开)
  'fw3-01-jinxun':[582.0,471.0],        // 福建·平潭东庠岛
  'fw3-02-sanmu-xie':[461.0,558.0],     // 海南·万宁
  'fw3-02-paodan-yu':[463.0,559.0],     // 海南·万宁(散开)
  'fw3-02-xunzhi-jianyu':[465.0,557.0], // 海南·万宁(散开)
  'fw3-02-guijiao-qingchao':[607.0,397.0], // 浙江·舟山青浜岛
  'fw3-02-yanjiao-luo':[504.0,525.0],   // 广东·珠海东澳岛
  'fw3-02-laozhi-hualuo':[506.0,526.0], // 广东·珠海东澳岛(散开)
  'fw3-04-jingcong-wangtao':[589.0,312.0], // 山东·青岛灵山岛
  'fw3-04-qingzheng-kouxiagu':[591.0,313.0], // 山东·青岛灵山岛(散开)
  'fw3-06-moyu-xianxin':[545.0,503.0],  // 广东·汕头南澳岛
  'fw3-07-hongyu-bao':[447.0,553.0],    // 海南·儋州
  'fw3-07-hongyu-wuhua':[449.0,554.0],  // 海南·儋州(散开)
  'fw3-07-youyu-luohai':[547.0,504.0],  // 广东·汕头南澳岛(散开)
};

// 世界图海外钉按所在国家 path 几何中心放置。
export const WORLD_REGION = {
  'fw1-01-iberico':'ES', 'fw1-01-aligot':'FR', 'fw1-01-holland-crab':'NL',
  'fw1-02-sangak':'IR', 'fw1-02-hainan-jifan':'MY', 'fw1-02-chifa-yuntun':'PE', 'fw1-02-mushu-wuhua':'PE',
  'fw1-03-tagine':'MA', 'fw1-03-juan-doufu':'JP',
  'fw1-04-herring':'SE', 'fw1-04-roquefort':'FR', 'fw1-04-yulu':'VN', 'fw1-04-bresi-ji':'FR',
  'fw1-05-cajun-crawfish':'US',
  'fw1-06-lvchali-ji':'TH', 'fw1-06-dongyingong':'TH',
  'fw1-07-injera':'ET', 'fw1-07-geelan-sha':'IS', 'fw1-07-pachamanca':'PE', 'fw1-07-ecuador-hongshaoyu':'EC', 'fw1-07-ecuador-baixia':'EC',
  'fw1-08-wild-wheat':'IR',
  'fw2-01-yamie':'NP', 'fw2-01-baklava':'TR', 'fw2-01-haidan':'MY',
  'fw2-02-diwang-xie':'NO', 'fw2-02-ruanke-xie':'IT', 'fw2-02-xiebing':'US', 'fw2-02-jiang-xie':'KR',
  'fw2-03-humusi':'IL', 'fw2-03-shankui':'JP', 'fw2-03-fajiang':'FR', 'fw2-03-moli-jiang':'MX', 'fw2-03-shadie':'ID',
  'fw2-04-xixige':'PH', 'fw2-04-zheng-yangtou':'MA', 'fw2-04-changtaotao':'FR', 'fw2-04-ankang-gan':'JP', 'fw2-04-zhuti-xiangrou':'IT',
  'fw2-05-malasong-ji':'NA', 'fw2-05-shenji-tang':'KR', 'fw2-05-zhaji':'KR', 'fw2-05-shaoniao':'JP', 'fw2-05-buleisi-ji':'FR',
  'fw2-06-feiyu-zi':'US', 'fw2-06-kalikesi-zi':'SE', 'fw2-06-scotch-egg':'GB', 'fw2-06-xiandan-icecream':'US', 'fw2-06-mayi-dan':'MX',
  'fw2-07-taisuan-chang':'TH', 'fw2-07-salami':'IT', 'fw2-07-baichang':'DE', 'fw2-07-mangalica':'HU',
  'fw2-08-chuniu':'PE', 'fw2-08-bailusun':'FR', 'fw2-08-dasuan-cai':'RO',
  // 第三季
  'fw3-03-spain-haishen':'ES',
  'fw3-06-italy-haixian':'IT',
  // 第四季
  'fw4-01-feimai-kaoji':'PS', 'fw4-01-feimai-pilaf':'PS', 'fw4-01-whisky':'GB', 'fw4-01-italy-jiao':'IT', 'fw4-01-manti':'TR',
  'fw4-01-huayuan-xiaoyu':'PT', 'fw4-01-tempura':'JP', 'fw4-01-zisu-haidan-tempura':'JP', 'fw4-01-xingman-tempura':'JP',
  'fw4-02-mozhi-haixianfan':'ES', 'fw4-02-risotto':'IT', 'fw4-02-shiguo-banfan':'KR', 'fw4-02-shousi':'JP', 'fw4-02-biryani':'IN', 'fw4-02-mandi':'SA', 'fw4-02-paella':'ES', 'fw4-02-shanbei-yemita':'US', 'fw4-02-yemi-anchun':'FR', 'fw4-02-heguozi':'JP',
  'fw4-03-mexico-bobing':'MX', 'fw4-03-mexico-yumitang':'MX', 'fw4-03-shousi-niurou-taco':'MX', 'fw4-03-yumi-haixian-mian':'MX', 'fw4-03-baojiang-yumi-wanzi':'MX', 'fw4-03-yumi-heisonglu':'MX',
  'fw4-04-alabo-duncandou':'EG', 'fw4-04-polcan':'MX', 'fw4-04-pibipollo':'MX', 'fw4-04-qingmugua-shala':'TH', 'fw4-04-taishi-zhujingrou':'TH', 'fw4-04-shadie':'ID',
  'fw4-05-maling-nongtang':'PE', 'fw4-05-donggan-maling':'PE', 'fw4-05-andisi-genjingta':'PE', 'fw4-05-cujiangshu-jiu':'PE',
  'fw4-06-shige-qiaomaimian':'JP', 'fw4-06-chaoji-guwutong':'BO', 'fw4-06-limai-yangtuo-tang':'BO', 'fw4-06-xianli-huayuan':'BO', 'fw4-06-limai-pingguozhi':'BO', 'fw4-06-limai-doufu':'BO',
};
