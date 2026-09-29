import {CITY_EVENT_CARDS} from './cityEventCards.js';
import {getTiles} from './board.js';

// General chance cards stay map-independent. City cards have a separate pool.
export const EVENT_CARDS = Object.freeze([
 {id:'park_proposal',title:'求婚成功',story:'你在主题公园求婚成功。喜糖已经不够分，红包接着发。',rule:'向每位未破产的对手支付 ¥1,000。',icon:'heart',category:'玩家收支',effect:{type:'gift_all',amount:1000}},
 {id:'found_envelope',title:'旧外套的惊喜',story:'换季翻出一件旧外套，口袋里的红包比记忆更厚。',rule:'从银行获得 ¥800。',icon:'envelope',category:'银行收支',effect:{type:'bank',amount:800}},
 {id:'street_performer',title:'临时主唱',story:'街头乐队缺一位主唱。你唱完一曲，帽子里装满了零钱。',rule:'从银行获得 ¥600。',icon:'music',category:'银行收支',effect:{type:'bank',amount:600}},
 {id:'travel_refund',title:'迟到的退款',story:'半年前申请的退款终于到账。客服也松了一口气。',rule:'从银行获得 ¥1,000。',icon:'receipt',category:'银行收支',effect:{type:'bank',amount:1000}},
 {id:'repair_bill',title:'行李箱罢工',story:'行李箱的轮子提前结束旅行。修理师傅递来一张账单。',rule:'向银行支付 ¥700。',icon:'repair',category:'银行收支',effect:{type:'bank',amount:-700}},
 {id:'souvenir_spree',title:'只买一个',story:'你本来只想买一个纪念品。店员多给了你两个购物袋。',rule:'向银行支付 ¥500。',icon:'bag',category:'银行收支',effect:{type:'bank',amount:-500}},
 {id:'lucky_patron',title:'这次我请',story:'现金最多的旅伴说“这次我请”。你及时拿出了收款码。',rule:'现金最多的未破产对手向你支付最多 ¥600，不超过其现有现金。',icon:'crown',category:'玩家收支',effect:{type:'richest_gift',amount:600}},
 {id:'city_remix',title:'地图洗牌',story:'一阵风卷走了地图。重新拼好后，城市们交换了位置。',rule:'重新排列本局城市。特殊站点不动，房产与停在城市的人物随城市移动。',icon:'shuffle',category:'地图变化',effect:{type:'shuffle'}},
 {id:'midnight_rewrite',title:'午夜制图师',story:'神秘制图师连夜改了线路。旧目的地，现在有了新邻居。',rule:'重新排列本局城市。特殊站点不动，房产与停在城市的人物随城市移动。',icon:'moon',category:'地图变化',effect:{type:'shuffle'}},
 {id:'night_flight',title:'夜航通行证',story:'最后一班夜航还有一个座位。目的地这一栏，留给你填写。',rule:'选择本局地图上的任意城市前往。不领取起点奖励，到站正常购地或付租。',icon:'balloon',category:'自由移动',effect:{type:'travel'}},
 {id:'open_ticket',title:'任意门票根',story:'你在票根背面发现一扇小门。推开它，路线可以重新选择。',rule:'选择本局地图上的任意城市前往。不领取起点奖励，到站正常购地或付租。',icon:'ticket',category:'自由移动',effect:{type:'travel'}},
 {id:'pocket_compass',title:'听话的骰子',story:'古董摊主保证这颗骰子很听话。它甚至附了一张说明书。',rule:'获得 1 张遥控骰子。掷骰前使用，可指定 1～6 步。',icon:'dice',category:'道具补给',effect:{type:'item',card:'dice',count:1}},
 {id:'lucky_umbrella',title:'好运保护伞',story:'失物招领处归还了你的伞。伞柄上多了一枚免租印章。',rule:'获得 1 张租金护盾。掷骰前使用，抵消下一次应付租金。',icon:'shield',category:'道具补给',effect:{type:'item',card:'shield',count:1}},
 {id:'toolbox_drop',title:'神秘工具箱',story:'门口出现一只工具箱。里面的工具，恰好都是升级需要的。',rule:'获得 1 张建设补贴。掷骰前使用，下次升级最多抵扣 ¥600。',icon:'build',category:'道具补给',effect:{type:'item',card:'build',count:1}},
 {id:'birthday_collect',title:'今天我生日',story:'你吹灭蜡烛，大家同时低头找手机。看来愿望已经到账。',rule:'每位未破产的对手向你支付最多 ¥300，不超过其现有现金，不产生债务。',icon:'cake',category:'玩家收支',effect:{type:'collect_all',amount:300}},
 {id:'robin_hood',title:'零钱搬家',story:'一只戴羽毛帽的小鸟叼走了最鼓的钱包。它对贫富差距很有意见。',rule:'现金最多的未破产玩家向现金最少的未破产玩家支付最多 ¥800，不超过付款人现金。现金全相同时不转账；并列按玩家顺序选择。',icon:'feather',category:'玩家收支',effect:{type:'redistribution',amount:800}},
 {id:'sleepy_interest',title:'睡出来的利息',story:'你在银行大厅打了个盹。醒来时，账户比本人精神多了。',rule:'从银行获得当前现金的 10%，向下取整，最多 ¥1,500。',icon:'piggy',category:'银行收支',effect:{type:'interest',rate:.1,cap:1500}},
 {id:'property_inspection',title:'猫咪验房团',story:'一群猫挨家挨户检查屋顶。检查很认真，爪印修复费也很认真。',rule:'每座未抵押的自有房产向银行支付 ¥200；现金不足可抵押筹款。',icon:'cat',category:'房产事件',effect:{type:'property_fee',amount:200}},
 {id:'rooftop_dividend',title:'天台开集市',story:'你的天台突然成了周末集市。卖柠檬水的摊主主动交了摊位费。',rule:'每座未抵押的自有房产从银行获得 ¥300。',icon:'market',category:'房产事件',effect:{type:'property_dividend',amount:300}},
 {id:'fresh_start',title:'空手也有礼',story:'福利窗口问你有几套房。你翻了翻口袋，只找到一张车票。',rule:'没有任何房产时从银行获得 ¥1,500，否则获得 ¥400。抵押房产也计入房产数量。',icon:'seedling',category:'银行收支',effect:{type:'relief',empty:1500,owned:400}},
 {id:'mirror_map',title:'地图拿反了',story:'你终于发现地图一直拿反了。奇怪的是，所有城市都配合转了身。',rule:'本局城市顺序完全反转。特殊站点不动，房产与停在城市的人物随城市移动。',icon:'mirror',category:'地图变化',effect:{type:'shuffle',mode:'reverse'}},
 {id:'city_carousel',title:'城市旋转木马',story:'深夜响起游乐场的音乐。城市排着队，各往旁边挪了一个位置。',rule:'每座城市移至下一个城市槽位，末座移至首座。特殊站点不动，房产与停在城市的人物随城市移动。',icon:'carousel',category:'地图变化',effect:{type:'shuffle',mode:'rotate'}},
 {id:'vacant_express',title:'看房直通车',story:'中介说这趟车只停空房。你上车时，他已经拿出了合同。',rule:'选择本局一座未售城市前往，可正常购买；没有未售城市时从银行获得 ¥500。不领取起点奖励。',icon:'key',category:'自由移动',effect:{type:'travel',target:'unowned',fallback:500}},
 {id:'homecoming',title:'认得回家的路',story:'你的拖鞋自己走出了行李箱。看来它比你更想回家。',rule:'选择本局一座未抵押的自有城市前往，可正常升级；没有可选城市时从银行获得 ¥500。不领取起点奖励。',icon:'home',category:'自由移动',effect:{type:'travel',target:'owned',fallback:500}},
 {id:'runaway_bus',title:'坐过三站',story:'你在观光巴士上睡着了。司机说“下一站就到”，已经说了三次。',rule:'前往顺时针方向的第 3 座城市，跳过特殊站点。不领取起点奖励，到站正常购地、升级或付租。',icon:'bus',category:'自由移动',effect:{type:'travel',target:'forward',steps:3}},
 {id:'mystery_vending',title:'机器没有零钱',story:'自动售货机吞了硬币，屏幕弹出三个按钮：这次让你自己选。',rule:'从遥控骰子、租金护盾和建设补贴中选择 1 张，加入道具背包。',icon:'vending',category:'道具补给',effect:{type:'item_choice',count:1}},
 {id:'bonus_choice',title:'奖金还是运气',story:'抽奖主持人递来两个盒子。一个叮当作响，另一个正在自己掷骰子。',rule:'选择从银行获得 ¥800，或获得 2 张遥控骰子。',icon:'fork',category:'自选奖励',effect:{type:'reward_choice'}},
 {id:'overnight_renovation',title:'田螺施工队',story:'你只是出门买了份早餐，施工队已经把脚手架收走了。',rule:'选择一座未抵押且未满级的自有房产，免费升 1 级。不增加实际升级支出，也不消耗建设补贴；无可选房产时从银行获得 ¥500。',icon:'crane',category:'房产事件',effect:{type:'renovate',fallback:500}},
 {id:'bank_amnesty',title:'银行的橡皮擦',story:'柜员擦掉了账本上的一行，还笑着说：“今天这笔算我们的。”',rule:'选择一座自己的抵押房产，银行免除该笔抵押款并归还产权，等级保留；没有抵押房产时从银行获得 ¥500。',icon:'eraser',category:'房产事件',effect:{type:'redeem_grant',fallback:500}},
 {id:'city_siesta',title:'全城午睡',story:'房东们约好睡个午觉。门口统一挂着牌子：收租的事，下次再说。',rule:'每位未破产玩家立即获得一次租金护盾，抵消下一次应付租金。已有护盾不叠加，不加入道具背包。',icon:'hammock',category:'共同状态',effect:{type:'shield_all'}},
].map(card=>Object.freeze({...card,effect:Object.freeze(card.effect)})));

const byId=new Map([...EVENT_CARDS,...CITY_EVENT_CARDS].map(card=>[card.id,card]));
export function getEventCard(id){return byId.get(id);}
export function eligibleEventCards(game){
 if(!Array.isArray(game?.eventDeck))return EVENT_CARDS;
 const selected=[...new Set(game.eventDeck)].map(getEventCard).filter(card=>card&&!card.cityId);
 return selected.length?selected:EVENT_CARDS;
}
export function eligibleCityEventCards(game){
 const present=new Set(getTiles(game).filter(tile=>tile.type==='city').map(tile=>tile.cityId));
 return CITY_EVENT_CARDS.filter(card=>present.has(card.cityId));
}
