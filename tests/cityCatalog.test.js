import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {CITY_CATALOG,CHINA_REGIONS,getCity} from '../src/cityCatalog.js';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {TILES} from '../src/board.js';
import {initialState,transition,rent,worth} from '../src/game.js';
import {generateCityAssets} from '../scripts/draw-city-library.mjs';
const root=fileURLToPath(new URL('../public',import.meta.url));
const cities=CITY_CATALOG;
const capitals={北京市:'北京',天津市:'天津',河北省:'石家庄',山西省:'太原',内蒙古自治区:'呼和浩特',辽宁省:'沈阳',吉林省:'长春',黑龙江省:'哈尔滨',上海市:'上海',江苏省:'南京',浙江省:'杭州',安徽省:'合肥',福建省:'福州',江西省:'南昌',山东省:'济南',河南省:'郑州',湖北省:'武汉',湖南省:'长沙',广东省:'广州',广西壮族自治区:'南宁',海南省:'海口',重庆市:'重庆',四川省:'成都',贵州省:'贵阳',云南省:'昆明',西藏自治区:'拉萨',陕西省:'西安',甘肃省:'兰州',青海省:'西宁',宁夏回族自治区:'银川',新疆维吾尔自治区:'乌鲁木齐',台湾省:'台北',香港特别行政区:'香港',澳门特别行政区:'澳门'};
test('catalog has 88 unique stable city records and required fields',()=>{
  assert.equal(cities.length,88);
  assert.equal(new Set(cities.map(c=>c.id)).size,88);
  assert.equal(new Set(cities.map(c=>c.name)).size,88);
  for(const city of cities){
    assert.match(city.id,/^[a-z]+(?:-[a-z]+)*$/);
    for(const key of ['name','nameEn','scope','country','region','kind','landmark','asset'])assert.ok(city[key],`${city.id}.${key}`);
    assert.ok(['china','world'].includes(city.scope));
    assert.ok(['capital','municipality','sar','tourism','world'].includes(city.kind));
  }
});
test('all 34 province-level regions have their corresponding city and correct category',()=>{
  assert.equal(CHINA_REGIONS.length,34);
  assert.equal(new Set(CHINA_REGIONS).size,34);
  assert.deepEqual(new Set(CHINA_REGIONS),new Set(Object.keys(capitals)));
  for(const [region,name] of Object.entries(capitals)){
    const city=cities.find(c=>c.name===name);
    assert.equal(city.region,region,name);
    assert.equal(city.scope,'china');
    assert.equal(city.country,'中国');
    assert.equal(city.kind,region.endsWith('特别行政区')?'sar':region.endsWith('市')?'municipality':'capital');
  }
  assert.equal(cities.filter(c=>c.kind==='tourism').length,24);
  for(const city of cities.filter(c=>c.scope==='china'))assert.ok(CHINA_REGIONS.includes(city.region));
});
test('world selection covers six inhabited continents with 30 cities',()=>{
  const world=cities.filter(c=>c.scope==='world');
  assert.equal(world.length,30);
  assert.deepEqual(new Set(world.map(c=>c.region)),new Set(['亚洲','欧洲','非洲','北美洲','南美洲','大洋洲']));
  assert.ok(world.every(c=>c.kind==='world'));
  assert.equal(world.find(c=>c.id==='agra').landmark,'泰姬陵');
  assert.equal(world.find(c=>c.id==='cairo').landmark,'开罗塔');
});
test('all city assets use one ID-based directory',()=>{
  assert.equal(existsSync(root+'/assets/cities'),false);
  assert.equal(readdirSync(root+'/assets/city-library').filter(file=>file.endsWith('.svg')).length,cities.length);
  for(const city of cities){
    assert.equal(city.asset,`/assets/city-library/${city.id}.svg`);
    assert.ok(existsSync(root+city.asset),city.asset);
  }
});
test('all city art has unique geometry and safe SVG content',()=>{
  const hashes=new Set();
  for(const city of cities){
    const svg=readFileSync(root+city.asset,'utf8');
    assert.match(svg,city.artStyle==='classic'?/viewBox="0 0 96 80"/:/viewBox="0 0 128 116"/);
    assert.match(svg,/shape-rendering="crispEdges"/);
    if(city.artStyle==='pixel')assert.ok(svg.includes(`<title id="title">${city.name} · ${city.landmark}</title>`));
    assert.ok((svg.match(/<rect /g)||[]).length>(city.artStyle==='pixel'?100:10),city.id);
    assert.doesNotMatch(svg,/<(?:script|image|foreignObject)\b|\bon\w+=|(?:href|url)\s*[=(]/i);
    for(const [,value] of svg.matchAll(/(?:width|height)="(-?\d+)"/g))assert.ok(Number(value)>0,`${city.id}: positive rectangle dimensions`);
    const geometry=svg.replace(/<title[^>]*>.*?<\/title>/,'');
    hashes.add(createHash('sha256').update(geometry).digest('hex'));
  }
  assert.equal(hashes.size,cities.length);
});
test('board cities resolve identity, assets and economics from the registry by ID',()=>{
  assert.throws(()=>getCity('unknown-city'),/Unknown city ID/);
  for(const tile of TILES.filter(t=>t.type==='city')){
    const city=getCity(tile.cityId);
    for(const field of ['id','name','nameEn','landmark','asset'])assert.equal(tile[field],city[field]);
    assert.equal(tile.price,city.gameplay.price);
    assert.equal(tile.group,city.gameplay.group);
    assert.ok(Object.isFrozen(city)&&Object.isFrozen(city.gameplay));
  }
  for(const city of CITY_CATALOG){assert.ok(city.gameplay.price>=1400&&city.gameplay.price<=2600);assert.ok(['north','west','east','south'].includes(city.gameplay.group));}
});
test('version-1 indexed property saves still resolve the same city and economic results',()=>{
  const saved=JSON.parse(JSON.stringify(initialState()));
  saved.players[0].pos=0;saved.properties={1:{owner:1,level:2},4:{owner:0,level:1}};
  assert.equal(TILES[1].cityId,'beijing');assert.equal(TILES[4].cityId,'chengdu');
  assert.equal(rent(saved,1),1056);assert.equal(worth(saved,0),14700);
  const landed=transition(saved,{type:'ROLL',value:1,event:0});assert.equal(landed.phase,'rent');const next=transition(landed,{type:'PAY_RENT'});
  assert.equal(next.version,1);assert.equal(next.players[0].cash,10944);
  assert.equal(next.players[1].cash,13056);assert.deepEqual(next.properties,saved.properties);
});
test('one generator reproduces all registered SVG bytes in an isolated directory',()=>{
  const dir=mkdtempSync(join(tmpdir(),'city-library-'));
  try{
    assert.equal(generateCityAssets(dir),cities.length);
    for(const city of cities)assert.equal(readFileSync(dir+city.asset,'utf8'),readFileSync(root+city.asset,'utf8'),city.id);
    assert.equal(readdirSync(dir+'/assets/city-library').length,cities.length);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
