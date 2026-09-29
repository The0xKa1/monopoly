/** City-library metadata. Landmarks are stylized references, not geographic scale models.
 * Single source for all city identity, artwork paths and optional gameplay configuration.
 */
export const CHINA_REGIONS = ['北京市','天津市','河北省','山西省','内蒙古自治区','辽宁省','吉林省','黑龙江省','上海市','江苏省','浙江省','安徽省','福建省','江西省','山东省','河南省','湖北省','湖南省','广东省','广西壮族自治区','海南省','重庆市','四川省','贵州省','云南省','西藏自治区','陕西省','甘肃省','青海省','宁夏回族自治区','新疆维吾尔自治区','台湾省','香港特别行政区','澳门特别行政区'];
// id | name | nameEn | region | kind | landmark | price? | group? | artStyle?
const china = `
beijing|北京|Beijing|北京市|municipality|故宫|2200|north|classic
 tianjin|天津|Tianjin|天津市|municipality|天津之眼
shijiazhuang|石家庄|Shijiazhuang|河北省|capital|正定南城门
 taiyuan|太原|Taiyuan|山西省|capital|永祚寺双塔
hohhot|呼和浩特|Hohhot|内蒙古自治区|capital|大召寺
shenyang|沈阳|Shenyang|辽宁省|capital|沈阳故宫大政殿
changchun|长春|Changchun|吉林省|capital|净月潭塔楼
harbin|哈尔滨|Harbin|黑龙江省|capital|圣索菲亚教堂
shanghai|上海|Shanghai|上海市|municipality|东方明珠|2600|east|classic
nanjing|南京|Nanjing|江苏省|capital|中华门|1800|north|classic
hangzhou|杭州|Hangzhou|浙江省|capital|西湖与雷峰塔|2000|east|classic
hefei|合肥|Hefei|安徽省|capital|包公祠
fuzhou|福州|Fuzhou|福建省|capital|三坊七巷
nanchang|南昌|Nanchang|江西省|capital|滕王阁
jinan|济南|Jinan|山东省|capital|趵突泉
zhengzhou|郑州|Zhengzhou|河南省|capital|二七纪念塔
wuhan|武汉|Wuhan|湖北省|capital|黄鹤楼|1600|west|classic
changsha|长沙|Changsha|湖南省|capital|岳麓书院
guangzhou|广州|Guangzhou|广东省|capital|广州塔|2200|south|classic
nanning|南宁|Nanning|广西壮族自治区|capital|青秀山龙象塔
haikou|海口|Haikou|海南省|capital|骑楼老街
chongqing|重庆|Chongqing|重庆市|municipality|洪崖洞|1800|west|classic
chengdu|成都|Chengdu|四川省|capital|熊猫与川西院落|1800|west|classic
guiyang|贵阳|Guiyang|贵州省|capital|甲秀楼
kunming|昆明|Kunming|云南省|capital|金马碧鸡坊
lhasa|拉萨|Lhasa|西藏自治区|capital|布达拉宫
xian|西安|Xi'an|陕西省|capital|大雁塔|1600|north|classic
lanzhou|兰州|Lanzhou|甘肃省|capital|中山桥
xining|西宁|Xining|青海省|capital|塔尔寺
 yinchuan|银川|Yinchuan|宁夏回族自治区|capital|鼓楼
urumqi|乌鲁木齐|Urumqi|新疆维吾尔自治区|capital|国际大巴扎观光塔
taipei|台北|Taipei|台湾省|capital|台北101
hong-kong|香港|Hong Kong|香港特别行政区|sar|维多利亚港与中银大厦
macau|澳门|Macau|澳门特别行政区|sar|大三巴牌坊
shenzhen|深圳|Shenzhen|广东省|tourism|平安金融中心|2400|south|classic
xiamen|厦门|Xiamen|福建省|tourism|鼓浪屿|1600|south|classic
qingdao|青岛|Qingdao|山东省|tourism|老城与教堂|1800|east|classic
guilin|桂林|Guilin|广西壮族自治区|tourism|象鼻山
lijiang|丽江|Lijiang|云南省|tourism|玉龙雪山与古城
dali|大理|Dali|云南省|tourism|崇圣寺三塔
sanya|三亚|Sanya|海南省|tourism|天涯海角
suzhou|苏州|Suzhou|江苏省|tourism|拙政园
huangshan|黄山|Huangshan|安徽省|tourism|黄山迎客松
zhangjiajie|张家界|Zhangjiajie|湖南省|tourism|武陵源石峰
luoyang|洛阳|Luoyang|河南省|tourism|龙门石窟
 datong|大同|Datong|山西省|tourism|云冈石窟
dunhuang|敦煌|Dunhuang|甘肃省|tourism|月牙泉
quanzhou|泉州|Quanzhou|福建省|tourism|开元寺双塔
zhuhai|珠海|Zhuhai|广东省|tourism|日月贝
ningbo|宁波|Ningbo|浙江省|tourism|天一阁
shaoxing|绍兴|Shaoxing|浙江省|tourism|水乡石桥
wuxi|无锡|Wuxi|江苏省|tourism|鼋头渚
yangzhou|扬州|Yangzhou|江苏省|tourism|瘦西湖五亭桥
yantai|烟台|Yantai|山东省|tourism|烟台山灯塔
weihai|威海|Weihai|山东省|tourism|幸福门
beihai|北海|Beihai|广西壮族自治区|tourism|银滩与潮雕塑
jingdezhen|景德镇|Jingdezhen|江西省|tourism|瓷窑与青花瓷
chaozhou|潮州|Chaozhou|广东省|tourism|广济桥
`;
// id | Chinese name | English name | country | continent | landmark
const world = `
tokyo|东京|Tokyo|日本|亚洲|东京塔
kyoto|京都|Kyoto|日本|亚洲|金阁寺
seoul|首尔|Seoul|韩国|亚洲|景福宫
singapore|新加坡|Singapore|新加坡|亚洲|滨海湾金沙
bangkok|曼谷|Bangkok|泰国|亚洲|郑王庙
hanoi|河内|Hanoi|越南|亚洲|还剑湖龟塔
kuala-lumpur|吉隆坡|Kuala Lumpur|马来西亚|亚洲|双子塔
dubai|迪拜|Dubai|阿拉伯联合酋长国|亚洲|哈利法塔
istanbul|伊斯坦布尔|Istanbul|土耳其|亚洲|圣索菲亚大教堂
agra|阿格拉|Agra|印度|亚洲|泰姬陵
paris|巴黎|Paris|法国|欧洲|埃菲尔铁塔
london|伦敦|London|英国|欧洲|伊丽莎白塔
rome|罗马|Rome|意大利|欧洲|斗兽场
barcelona|巴塞罗那|Barcelona|西班牙|欧洲|圣家堂
amsterdam|阿姆斯特丹|Amsterdam|荷兰|欧洲|运河山墙屋
athens|雅典|Athens|希腊|欧洲|帕特农神庙
prague|布拉格|Prague|捷克|欧洲|查理大桥
moscow|莫斯科|Moscow|俄罗斯|欧洲|圣瓦西里主教座堂
new-york|纽约|New York|美国|北美洲|自由女神像
san-francisco|旧金山|San Francisco|美国|北美洲|金门大桥
los-angeles|洛杉矶|Los Angeles|美国|北美洲|格里菲斯天文台
toronto|多伦多|Toronto|加拿大|北美洲|加拿大国家电视塔
mexico-city|墨西哥城|Mexico City|墨西哥|北美洲|独立纪念柱
rio-de-janeiro|里约热内卢|Rio de Janeiro|巴西|南美洲|基督像
buenos-aires|布宜诺斯艾利斯|Buenos Aires|阿根廷|南美洲|方尖碑
lima|利马|Lima|秘鲁|南美洲|利马主教座堂
cairo|开罗|Cairo|埃及|非洲|开罗塔
cape-town|开普敦|Cape Town|南非|非洲|桌山
sydney|悉尼|Sydney|澳大利亚|大洋洲|悉尼歌剧院
auckland|奥克兰|Auckland|新西兰|大洋洲|天空塔
`;
const rows = text => text.trim().split('\n').map(row=>row.trim().split('|'));
// Prototype economics live with the city record, independent of random map order.
function prototypeGameplay(city,index) {
 const hash=[...city.id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
 return {price:1400+(hash%7)*200,group:['north','west','east','south'][index%4]};
}
function record(city,index) {
  return Object.freeze({...city, asset:`/assets/city-library/${city.id}.svg`,
    gameplay:Object.freeze(city.gameplay||prototypeGameplay(city,index))});
}
export const CITY_CATALOG = Object.freeze([
  ...rows(china).map(([id,name,nameEn,region,kind,landmark,price,group,artStyle='pixel'],index)=>record({id,name,nameEn,scope:'china',country:'\u4e2d\u56fd',region,kind,landmark,artStyle,gameplay:price?{price:Number(price),group}:null},index)),
  ...rows(world).map(([id,name,nameEn,country,region,landmark],index)=>record({id,name,nameEn,scope:'world',country,region,kind:'world',landmark,artStyle:'pixel'},index))
]);
const citiesById = new Map(CITY_CATALOG.map(city=>[city.id,city]));
export function getCity(id) {
  const city=citiesById.get(id);
  if(!city)throw new Error(`Unknown city ID: ${id}`);
  return city;
}
export const CATALOG_SOURCES = [
  {title:'中国省级行政区划',url:'https://www.locpg.gov.cn/2022-06/07/c_1211652713.htm'},
  {title:'联合国教科文组织世界遗产名录',url:'https://whc.unesco.org/en/list/'},
  {title:'泰姬陵（阿格拉）',url:'https://whc.unesco.org/en/list/252'},
  {title:'悉尼歌剧院',url:'https://whc.unesco.org/en/list/166'}
];
