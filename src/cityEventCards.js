import {CITY_CATALOG,getCity} from './cityCatalog.js';

// Original fictional game events. City identity and landmark names are always
// resolved through the city library; effect eligibility is handled by the game.
const DEFINITIONS=[
 ['beijing','古建补一瓦','{landmark}旁的修缮体验课开班。你补好一块模型瓦，施工师傅顺手把你的房子也修了。',{type:'renovate',fallback:500}],
 ['tianjin','转一圈就到','{landmark}的观景舱升到最高处，广播忽然报出了你的下一站。下舱时，行李已经等在那里。',{type:'travel',target:'city'}],
 ['shijiazhuang','城门夜市开张','{landmark}前的夜市缺一位报幕员。你刚喊完“开市”，摊主就把酬劳和场地费一起交来了。',{type:'city_host',amount:600,ownerBonus:400}],
 ['taiyuan','双塔量尺','画师在{landmark}下教你画对称线。你的楼只画好半边，另一半竟然自己长齐了。',{type:'renovate',fallback:500}],
 ['hohhot','风把账单吹远了','你在{landmark}附近买了一只风筝。它替大家带走了租金账单，暂时没有返航计划。',{type:'shield_all'}],
 ['shenyang','账本里的旧门票','{landmark}的参观票夹进了抵押账本。银行办寻票活动，奖励刚好是替你划掉其中一笔。',{type:'redeem_grant',fallback:500}],
 ['changchun','森林导航员','{landmark}旁，一只松鼠抢走了你的路线图。它还回来一颗骰子，表示地图这种东西太复杂。',{type:'item',card:'dice',count:1}],
 ['harbin','冰灯融化以后','你给每栋房子挂了冰灯。灯展很成功，收场时才发现屋檐都需要保养。',{type:'property_fee',amount:150}],
 ['shanghai','展览加场','{landmark}附近的像素艺术展临时加场。你负责检票，展馆业主负责再开一盏灯。',{type:'city_host',amount:600,ownerBonus:400}],
 ['nanjing','城砖拼图课','{landmark}的模型拼图还缺最后一块。你刚找到它，自己的房产模型也多出了一层。',{type:'renovate',fallback:500}],
 ['hangzhou','荷叶写的请帖','一封画着{landmark}的请帖飘进船舱。船夫看了一眼，说这次不用研究路线。',{type:'travel',target:'city'}],
 ['hefei','清清楚楚的补助','你在{landmark}旁参加算账小游戏。工作人员查完房产栏，把一份写得很明白的补助递给你。',{type:'relief',empty:1500,owned:400}],
 ['fuzhou','巷口灯会','{landmark}的巷口准备办小灯会。你扎的灯最亮，主办方连同借场地的费用一起结了。',{type:'city_host',amount:600,ownerBonus:400}],
 ['nanchang','背到最后一句','{landmark}旁的背诗挑战还差最后一句。你刚想起来，计时器先替你鼓了掌。',{type:'bank',amount:800}],
 ['jinan','泉水防水章','{landmark}边的纪念章掉进水里，捞上来变成了防水款。连租金账单上的数字也能挡住一次。',{type:'item',card:'shield',count:1}],
 ['zhengzhou','换乘不迷路','你在看得见{landmark}的候车室捡到一个包裹。失主感谢你，打开了三格小礼盒。',{type:'item_choice',count:1}],
 ['wuhan','楼前故事会','{landmark}前的故事会请你读了一段。观众没有散场，主持人决定连场地一起续租。',{type:'city_host',amount:600,ownerBonus:400}],
 ['changsha','夜宵拼桌','从{landmark}附近散步回来，你发现大家已经拼好一张大桌。你说“我先垫”，服务员记得特别清楚。',{type:'gift_all',amount:200}],
 ['guangzhou','灯光彩排','{landmark}亮起彩灯，你帮活动方找到了最佳拍摄角度。出镜费和场地费准时到账。',{type:'city_host',amount:600,ownerBonus:400}],
 ['nanning','绿荫歇脚券','{landmark}附近的树荫刚好够大家坐下。管理员发来歇脚券，背面竟写着一次免租。',{type:'shield_all'}],
 ['haikou','骑楼雨棚计划','你参考{landmark}的廊檐给房子加了雨棚。周末小摊纷纷搬来，摊位费盖过了雨声。',{type:'property_dividend',amount:200}],
 ['chongqing','索道忘了下','你坐上观光索道拍夜景，拍到{landmark}时才想起要下车。工作人员把你的目的地直接改好了。',{type:'travel',target:'city'}],
 ['chengdu','熊猫摄影助理','熊猫只肯背对镜头，你举着竹子站了半天。大家终于拍到正脸，纷纷给助理发红包。',{type:'collect_all',amount:200}],
 ['guiyang','桥边猜灯谜','{landmark}边的灯谜写得很小。你凑近一看发现是算术题，答得比主持人翻答案还快。',{type:'bank',amount:600}],
 ['kunming','花市盲盒','逛完{landmark}附近的花市，你发现店家少收了钱。补款后，老板让你从三份小礼物里挑一份。',{type:'item_choice',count:1}],
 ['lhasa','明信片提前到了','你还在规划路线，一张画着{landmark}的明信片已经送到了。背面写着：“人也快来。”',{type:'travel',target:'city'}],
 ['xian','旧砖的新工作','{landmark}旁的修复工坊教你拼一座小塔。剩下的模型砖不肯闲着，排队去了你的房子。',{type:'renovate',fallback:500}],
 ['lanzhou','桥边这碗我请','你在{landmark}旁停下来等一碗热面。现金最多的旅伴说“我请”，还把找零留给了你。',{type:'richest_gift',amount:500}],
 ['xining','外套买早了','去看{landmark}前，你认真挑了件保暖外套。同行的人说很合适，收银员也这么认为。',{type:'bank',amount:-400}],
 ['yinchuan','鼓点对账','{landmark}传来一阵节奏，你跟着把银行对账小游戏全按对了。奖品是免掉一笔抵押款。',{type:'redeem_grant',fallback:500}],
 ['urumqi','集市三只盒','{landmark}附近的摊位摆着三只锁好的盒子。摊主让你选一个，说今天钥匙免费。',{type:'item_choice',count:1}],
 ['taipei','电梯里的利息','看完{landmark}的夜景，你才想起查看账户。余额在你坐电梯的时候，悄悄爬高了一点。',{type:'interest',rate:.1,cap:1500}],
 ['hong-kong','港边快闪舞台','{landmark}前的快闪演出缺一块像素背景。你把地图投上屏幕，组织者连场地费一起结算了。',{type:'city_host',amount:600,ownerBonus:400}],
 ['macau','蛋挞摆盘冠军','{landmark}旁的小店办摆盘比赛。你的蛋挞一个没倒，评委决定先发奖金再吃。',{type:'bank',amount:700}],
 ['shenzhen','电梯路演','你在{landmark}附近演示一款会自己投骰子的闹钟。评委没睡着，还让你自己挑奖励。',{type:'reward_choice'}],
 ['xiamen','琴声暂停收租','{landmark}传来一段钢琴曲。大家停下脚步听完，连收租的提示铃都决定晚响一次。',{type:'shield_all'}],
 ['qingdao','海边代拍','你在{landmark}附近替旅伴拍了合照。海风把大家的头发吹得很整齐，拍摄费也收得很顺利。',{type:'collect_all',amount:150}],
 ['guilin','山水画里的船','你把{landmark}画进旅行本，一艘小船从纸页边缘探出头。船家问你还要不要登船。',{type:'travel',target:'city'}],
 ['lijiang','古城路牌转身','从{landmark}出来，一阵风把手里的路线图吹翻了。城市们以为这是新指令，全部倒着排好了。',{type:'shuffle',mode:'reverse'}],
 ['dali','三塔下的回信','画着{landmark}的信封终于寄回。银行说你参加的旧账抽签中了奖，里面夹着一张归还产权的回执。',{type:'redeem_grant',fallback:500}],
 ['sanya','防晒买了家庭装','你原本只想去{landmark}走走。出门前买的防晒霜，瓶子大到需要单独一个购物袋。',{type:'bank',amount:-500}],
 ['suzhou','借景也借一层','{landmark}的模型课讲到借景。你刚挪开一堵小墙，自家的模型楼也跟着多了一层景色。',{type:'renovate',fallback:500}],
 ['huangshan','迎客松来接站','你收到了画着{landmark}的接站牌。拿牌的人说行李不用提，下一格路已经铺到脚边了。',{type:'travel',target:'city'}],
 ['zhangjiajie','云里交换站台','{landmark}被云雾遮住了一会儿。云散后，城市们像排队过桥一样，集体向前挪了一个位置。',{type:'shuffle',mode:'rotate'}],
 ['luoyang','石刻拓印课','{landmark}主题工坊请你拓印一张模型图。纸张揭开时，自家的房屋图纸也升级了。',{type:'renovate',fallback:500}],
 ['datong','模型石匠','你在{landmark}主题展厅拼了一块微缩石墙。指导老师看了看剩余材料，说再修一层也够。',{type:'renovate',fallback:500}],
 ['dunhuang','风沙保护套','为拍好{landmark}，你给相机套了防沙袋。店家多送的那一只，刚好能套住租金账单。',{type:'item',card:'shield',count:1}],
 ['quanzhou','双塔影子剧','{landmark}附近的小剧场请你操控影子。演出顺利，后台按时发了劳务费和场地费。',{type:'city_host',amount:600,ownerBonus:400}],
 ['zhuhai','贝壳里的安可','{landmark}的演出结束后，你答应请大家喝水。掌声又响了一轮，名单也多确认了一遍。',{type:'gift_all',amount:100}],
 ['ningbo','书页里的图纸','{landmark}主题书展的书签夹着一张小图纸。翻到背面，竟是一张能抵升级费用的票。',{type:'item',card:'build',count:1}],
 ['shaoxing','乌篷船认路','船夫看了看你画的{landmark}，收起了方向盘。小船好像比导航还清楚你要去哪儿。',{type:'travel',target:'city'}],
 ['wuxi','湖边写生展','你在{landmark}画的速写入选了湖边小展。策展人请你签名，再把展场的费用一并结清。',{type:'city_host',amount:600,ownerBonus:400}],
 ['yangzhou','窗外多了盆景','看完{landmark}，你给各处房产都摆了一盆小树。房客纷纷预约观景茶座，茶钱准时到账。',{type:'property_dividend',amount:200}],
 ['yantai','灯塔指了三条路','{landmark}的光束扫过旅行本，照出了一颗六面骰。你可以决定下一次让它停在哪一面。',{type:'item',card:'dice',count:1}],
 ['weihai','海风补给站','你在{landmark}旁领到一张补给申请表。工作人员先看房产栏，再把属于你的那份装进信封。',{type:'relief',empty:1500,owned:400}],
 ['beihai','沙堡评委点头了','{landmark}旁的沙堡比赛到了最后一轮。你的护城河没有漏水，评委把奖金放进了干燥的口袋。',{type:'bank',amount:700}],
 ['jingdezhen','窑里多烧一层','你照着{landmark}做了一座陶瓷小楼。开窑后，它比图纸多了一层，师傅说这次算赠送。',{type:'renovate',fallback:500}],
 ['chaozhou','桥头工夫茶席','{landmark}边的茶席缺一位掌水壶的人。你忙完最后一泡，主办方把酬劳和借地的钱都转来了。',{type:'city_host',amount:600,ownerBonus:400}],
 ['tokyo','扭蛋机的选择题','{landmark}附近的扭蛋机突然停止转动，屏幕显示“今日可以自选”。你很珍惜这次不靠手气的机会。',{type:'item_choice',count:1}],
 ['kyoto','庭院模型补一角','你在{landmark}主题模型课上补好了一角屋檐。老师点点头，又送来一整层材料。',{type:'renovate',fallback:500}],
 ['seoul','路演两种奖','{landmark}附近的路演请你演示像素舞步。主持人举着现金信封和骰子盒，等你指一个。',{type:'reward_choice'}],
 ['singapore','屋顶花园试营业','看完{landmark}的景观，你给每栋房子种了一排像素花。花园试营业，门票收入比浇水声还密。',{type:'property_dividend',amount:300}],
 ['bangkok','船票背面的箭头','画着{landmark}的船票背面多了一支箭头。你沿着它转过街角，船已经靠好了岸。',{type:'travel',target:'city'}],
 ['hanoi','咖啡忘了算','你坐在能看见{landmark}的桌边写旅行本。写到第三页，才发现自己已经续了好几杯咖啡。',{type:'bank',amount:-400}],
 ['kuala-lumpur','双塔镜像路线','你拍{landmark}时开了镜像模式。地图认真参考了照片，把所有城市的先后次序都反过来了。',{type:'shuffle',mode:'reverse'}],
 ['dubai','高处看余额','望着{landmark}的高度，你顺手打开账户看看。楼没有继续长高，余额倒是增加了一截。',{type:'interest',rate:.1,cap:1500}],
 ['istanbul','渡轮换码头','从{landmark}附近赶去乘船，广播说码头临时顺延。城市们听得很认真，也一起换到了下一个位置。',{type:'shuffle',mode:'rotate'}],
 ['agra','倒影请安静','拍摄{landmark}倒影时，大家约好别出声。银行的租金提示也跟着静音，给每个人留下一次豁免。',{type:'shield_all'}],
 ['paris','铁塔下的画展','你在{landmark}下摆出一组像素速写。临时画展被选中加场，画师和场地主人都收到酬劳。',{type:'city_host',amount:600,ownerBonus:400}],
 ['london','雨伞验票','{landmark}旁突然落雨，你借出的伞全部按时归还。最后一把伞里，还夹着一张免租券。',{type:'item',card:'shield',count:1}],
 ['rome','模型修复日','{landmark}主题模型店请你修补一道小拱门。你修得太顺手，老板又送了一层房屋组件。',{type:'renovate',fallback:500}],
 ['barcelona','马赛克剩余材料','你照着{landmark}画了张色块明信片。工坊把剩下的彩片装进工具箱，附上一张建设补贴。',{type:'item',card:'build',count:1}],
 ['amsterdam','自行车铃声奖','你沿着{landmark}参加慢骑比赛。没有撞倒一只路锥，终点的小铃铛为你多响了一次。',{type:'bank',amount:600}],
 ['athens','广场上的赞助人','在{landmark}主题知识赛上，你答对了最后一题。现金最多的旅伴当场宣布赞助这位选手。',{type:'richest_gift',amount:600}],
 ['prague','桥上速写小摊','你在{landmark}为旅伴画了一组小头像。大家都认出了自己，便按手头零钱付了画费。',{type:'collect_all',amount:200}],
 ['moscow','套娃的最后一层','看完{landmark}，你打开纪念品套娃。最后一层不是更小的娃娃，而是一张活动奖金兑换券。',{type:'bank',amount:800}],
 ['new-york','港口快闪展','画着{landmark}的巨幅像素海报差点被风吹走。你稳稳扶住，策展方把劳务费和场地费都结了。',{type:'city_host',amount:600,ownerBonus:400}],
 ['san-francisco','叮当车来接你','印着{landmark}的车票在口袋里叮当响。你还没查路线，一辆观光车已经停在面前。',{type:'travel',target:'city'}],
 ['los-angeles','临时演员的片酬','{landmark}附近的小剧组缺一个抬头看星星的人。你一遍就过，导演给了两种片酬方案。',{type:'reward_choice'}],
 ['toronto','塔下直播位','你在{landmark}附近替活动方找到了不逆光的位置。直播准时开场，拍摄和场地两份费用一并到账。',{type:'city_host',amount:600,ownerBonus:400}],
 ['mexico-city','广场乐队加一曲','{landmark}旁的乐队又奏了一曲，你请旅伴们各挑一份小点心。账单上的人数记得很准确。',{type:'gift_all',amount:200}],
 ['rio-de-janeiro','最后一拍踩准了','看过{landmark}后，你参加了广场节奏挑战。最后一拍刚好踩中，奖品比你记住的动作还多。',{type:'bank',amount:900}],
 ['buenos-aires','探戈数步器','{landmark}附近的舞蹈课教你数步。老师发现你老数到六，干脆送来一颗可以指定点数的骰子。',{type:'item',card:'dice',count:1}],
 ['lima','广场旧账抽签','{landmark}附近的公益集市办旧账抽签。你的号码被读了两遍，银行才把免款回执递过来。',{type:'redeem_grant',fallback:500}],
 ['cairo','塔顶来的定位','旅行本里画着{landmark}的一页突然发光。你点了一下，系统提示：这次不用计算距离。',{type:'travel',target:'city'}],
 ['cape-town','云桌已经订好','你给{landmark}写了一张预约卡。回信说山顶那朵像桌布的云还在，车也已经等你了。',{type:'travel',target:'city'}],
 ['sydney','帆形舞台加座','{landmark}附近的小舞台临时加座，你帮忙排好了最后一行。演出结束，两份活动酬劳同时到账。',{type:'city_host',amount:600,ownerBonus:400}],
 ['auckland','天空寄来的电梯票','画着{landmark}的纪念票写着“直达”。你本以为指观景层，检票员却指向了整张地图。',{type:'travel',target:'city'}],
];

const money=amount=>`¥${Math.abs(amount).toLocaleString('en-US')}`;
const ITEM_NAMES={dice:'遥控骰子',shield:'租金护盾',build:'建设补贴'};
const ITEM_RULES={dice:'掷骰前使用，可指定 1～6 步。',shield:'掷骰前使用，抵消下一次应付租金。',build:'掷骰前使用，下次升级最多抵扣 ¥600。'};
const PRESENTATION={
 bank:{icon:'envelope',category:'银行收支'},gift_all:{icon:'heart',category:'玩家收支'},collect_all:{icon:'cake',category:'玩家收支'},
 richest_gift:{icon:'crown',category:'玩家收支'},item_choice:{icon:'vending',category:'道具补给'},reward_choice:{icon:'fork',category:'自选奖励'},
 shuffle:{icon:'shuffle',category:'地图变化'},interest:{icon:'piggy',category:'银行收支'},property_fee:{icon:'repair',category:'房产事件'},
 property_dividend:{icon:'market',category:'房产事件'},relief:{icon:'seedling',category:'银行收支'},shield_all:{icon:'hammock',category:'共同状态'},
 renovate:{icon:'crane',category:'房产事件'},redeem_grant:{icon:'eraser',category:'房产事件'},travel:{icon:'ticket',category:'自由移动'},
 city_host:{icon:'market',category:'城市活动'},
};
function ruleFor(effect,city){
 switch(effect.type){
  case 'bank':return effect.amount>0?`从银行获得 ${money(effect.amount)}。`:`向银行支付 ${money(effect.amount)}；现金不足可抵押筹款。`;
  case 'gift_all':return `向每位未破产的对手支付 ${money(effect.amount)}；现金不足可抵押筹款。`;
  case 'collect_all':return `每位未破产的对手向你支付最多 ${money(effect.amount)}，不超过其现有现金，不产生债务。`;
  case 'richest_gift':return `现金最多的未破产对手向你支付最多 ${money(effect.amount)}，不超过其现有现金；并列按玩家顺序选择。`;
  case 'item':return `获得 ${effect.count} 张${ITEM_NAMES[effect.card]}。${ITEM_RULES[effect.card]}`;
  case 'item_choice':return `从遥控骰子、租金护盾和建设补贴中选择 ${effect.count} 张，加入道具背包。`;
  case 'reward_choice':return '选择从银行获得 ¥800，或获得 2 张遥控骰子。';
  case 'shuffle':return `${effect.mode==='reverse'?'本局城市顺序完全反转。':effect.mode==='rotate'?'每座城市移至下一个城市槽位，末座移至首座。':'重新排列本局城市。'}特殊站点不动，房产与停在城市的人物随城市移动。`;
  case 'interest':return `从银行获得当前现金的 ${effect.rate*100}%，向下取整，最多 ${money(effect.cap)}。`;
  case 'property_fee':return `每座未抵押的自有房产向银行支付 ${money(effect.amount)}；现金不足可抵押筹款。`;
  case 'property_dividend':return `每座未抵押的自有房产从银行获得 ${money(effect.amount)}。`;
  case 'relief':return `没有任何房产时从银行获得 ${money(effect.empty)}，否则获得 ${money(effect.owned)}。抵押房产也计入房产数量。`;
  case 'shield_all':return '每位未破产玩家立即获得一次租金护盾，抵消下一次应付租金。已有护盾不叠加，不加入道具背包。';
  case 'renovate':return `${city.name}是你未抵押且未满级的房产时，可免费升 1 级，不增加实际升级支出，也不消耗建设补贴；不符合条件时从银行获得 ${money(effect.fallback)}。`;
  case 'redeem_grant':return `${city.name}是你的抵押房产时，银行免除该笔抵押款并归还产权，等级保留；不符合条件时从银行获得 ${money(effect.fallback)}。`;
  case 'travel':return `前往${city.name}，不领取起点奖励；到站按普通购地、升级、收租或银行代持免租规则处理。`;
  case 'city_host':return `银行向你支付 ${money(effect.amount)}；若${city.name}有未破产且未抵押的业主，再向该业主支付 ${money(effect.ownerBonus)}。业主是你时可兼得；未售或银行代持时无业主奖励。`;
  default:throw new Error(`Missing city event rule: ${effect.type}`);
 }
}

const definitionsByCity=new Map();
for(const [id,title,story,effect] of DEFINITIONS){
 getCity(id);
 if(definitionsByCity.has(id))throw new Error(`Duplicate city event: ${id}`);
 definitionsByCity.set(id,{title,story,effect});
}
const missing=CITY_CATALOG.filter(city=>!definitionsByCity.has(city.id));
if(missing.length||definitionsByCity.size!==CITY_CATALOG.length)throw new Error(`City event coverage mismatch: ${missing.map(city=>city.id).join(',')}`);

export const CITY_EVENT_CARDS=Object.freeze(CITY_CATALOG.map(city=>{
 const definition=definitionsByCity.get(city.id),raw=definition.effect;
 const bound=['renovate','redeem_grant','city_host'].includes(raw.type)||raw.type==='travel'&&raw.target==='city';
 const effect=Object.freeze({...raw,...(bound?{cityId:city.id}:{})});
 const presentation=effect.type==='item'?{icon:effect.card,category:'道具补给'}:PRESENTATION[effect.type];
 if(!presentation)throw new Error(`Missing city event presentation: ${effect.type}`);
 return Object.freeze({id:`city_${city.id}`,cityId:city.id,title:definition.title,
  story:definition.story.replaceAll('{landmark}',city.landmark).replaceAll('{city}',city.name),
  rule:ruleFor(effect,city),...presentation,effect});
}));
