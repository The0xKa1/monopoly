# monopoly

像素风中国城市大富翁，支持单机与多人联机。React + Vite，游戏规则使用独立、纯 JavaScript 状态转换，后续可以复用到微信小游戏或小程序的逻辑层；当前界面是浏览器 DOM 实现。

仓库：[The0xKa1/monopoly](https://github.com/The0xKa1/monopoly)。

在线试玩：[monopoly](https://monopoly.the0xka1.cc)（[备用入口](https://monopoly-the0xka1.pages.dev)）。创建房间后分享邀请链接，所有真人准备后由房主开始。

新局启用起点补给递减（第11轮减半、第21轮归零）、弃购/破产资产公开拍卖，以及第21轮起的产权争夺：收购价为常规报价150%，业主可向银行支付常规报价30%的防守费保留产权。第41轮起每人每轮经营费¥200，此后每轮增加¥200，现金不足进入抵押/破产流程。旧存档保留原规则，重新开局启用；规则参数见 `src/economy.js`。

## 联机开发与部署

采用 Cloudflare Pages + Pages Functions + SQLite Durable Objects。前后端均在 Cloudflare；自定义子域名通过外部 DNS CNAME 接入 Pages。

```sh
npm ci
npm run dev:rooms    # 终端一：房间服务 8787
npm run dev:online   # 终端二：网页 8788
BASE_URL=http://localhost:8788 npm run test:online
node scripts/multiplayer-protocol-check.mjs
npm run deploy:rooms # 先部署 DO Worker
npm run deploy:web   # 再发布 Pages
```

需要 Node.js 22+ 和已登录的 Wrangler。生产配置见两个 `wrangler.jsonc`；部署状态、DNS 与运维说明见 [交接](docs/handoff.md)。

联机支持 2～20 个角色、AI、准备大厅、服务器结算、自动保存与重连。每次决策 120 秒，超时 AI 代行；所有人离线暂停，房间保留 7 天。身份绑定当前浏览器；尚无跨设备账号恢复、观战或中途加入。

## 单机启动与验证

```sh
npm install
npm run dev -- --port 5173 --strictPort
npm test
npm run build
node scripts/browser-check.mjs
node scripts/motion-check.mjs
node scripts/audio-check.mjs
node scripts/panels-check.mjs
node scripts/library-check.mjs
node scripts/appearance-check.mjs
node scripts/players-check.mjs
node scripts/maps-check.mjs
node scripts/hub-check.mjs
node scripts/property-check.mjs
node scripts/event-check.mjs
node scripts/event-lab-check.mjs
node scripts/event-expansion-check.mjs
node scripts/city-events-check.mjs
node scripts/industries-check.mjs
node scripts/board-viewport-check.mjs
```

单机访问 `http://localhost:5173/?local=1`。浏览器检查需要本机 Google Chrome 和开发服务，可用 `BASE_URL` 切换端口。`dist/` 为前端构建；联机还需要 Pages Functions 与 DO 绑定，不能只上传静态文件。

## 已完成

- 经典地图 12 城：北京、西安、成都、重庆、武汉、南京、杭州、上海、广州、深圳、厦门、青岛。
- 城市库 88 城：中国 58 城（34 个省级行政区对应城市、24 座旅游城市）与世界 30 城；新增 76 幅像素地标。
- 图鉴按中国、世界、当前棋盘浏览，支持地区筛选与城市、地标搜索；全部城市可参与随机地图。
- 中国、世界、混合随机地图，可选 20 / 28 / 36 格环形棋盘；默认 1 位玩家 + 3 位 AI，支持新增至总计 20 个角色；20 轮资产结算和破产提前结束。
- 买城、收租、城市升级至 4 级；集齐当前地图同色组全部城市租金 ×1.5。
- 棋盘顶部“事件卡测试”：逐张选择、普通/现金不足、实际变化对比、道具试用、刷新恢复与返回原对局；独立存档不覆盖本局。
- 独立城市事件：88 城每城一张，仅本局城市入池；专属地图格到站抽卡，顶部/站点可预览卡池，测试入口分池。
- 城市卡用城市库地标配原创故事，包含绑定本城的旅行、免费改建、抵押减免、业主活动奖励等，地图重排后仍按城市身份结算。
- 30 张通用金色像素奇遇卡：三选一展开、翻面揭示、有趣故事与抽卡公告，包含获得道具的事件。
- 支持生日红包、财富转移、利息、房产检修/分红、免费改建、抵押减免、全员免租、自选道具与现金奖励。
- 地图支持洗牌/反转/轮转；旅行可选任意/未售/自有城市，巴士前往顺时针第 3 城；无目标按卡面补偿，卡库独立于地图。
- 地图重排保留产权、抵押及城市中的人物；城市聚拢回位和传送均有动画，刷新可继续未执行的事件。
- 4 种季节轮换，当前热门区域租金 ×1.3，可以叠加区域与角色加成。
- 遥控骰子、租金护盾、建设补贴；道具驿站已移除，事件继续赠送道具。
- 铁路、航空、航运、太空冒险、水利电力五类可购买产业，分别按交通网络、骰点、来客城市数、轮次和产业网络计费，同业主产业可联动加成。
- 点击产业格查看准确公式、业主与联动，调整骰点/来客预览；到站服务费固定，不消耗护盾、不套城市加成，不能升级。
- 产业可在付费前提出原价收购，抵押获得原价一半，原额赎回；银行代持期间不收费、不交易、不参与联动，破产后回到市场。
- 所有玩家支持分项自定义像素外观；外观与现有能力、资产规则独立。
- 玩家栏“新增”设置昵称和外观；新角色由 AI 控制，从起点加入。名单、昵称与外观在刷新和重开后保留。
- 名单可横向滚动；同格超过 4 人时显示部分形象和人数，点击选择任意角色查看资产。
- 玩家栏“外观”或资产详情“编辑外观”进入编辑器，支持随机、动作预览、保存与取消，刷新和重开保留。
- 付租前可按地产原价 + 累计实际升级支出提出收购，业主同意免本次租金，拒绝后继续付租。
- 现金不足可抵押，金额为地产原价的 50% + 累计实际升级支出；银行代持期间免租、不可购买，可在自己的掷骰前或回合结束时原额赎回。
- 已无可抵押房产且仍欠款时确认破产，公告全部房产回流市场、等级归零；资产净值扣除抵押款与待付款。
- 本地自动存档、城市图鉴、规则指南、重新开始、可开关骰子音效。
- 桌面与移动布局，弹窗键盘焦点与 Esc 关闭。
- 仅俯视棋盘，移除中央插画；电脑按窗口宽高完整适应、可缩放，手机大地图支持滚动与角色跟随，逐格行走、姓名标识、路线高亮与到站反馈。
- 棋盘中央显示行动者、季节/特殊事件、最近 40 条收支公告与自己的道具；可直接用卡，公告随存档保存。
- 现金、地产、总资产和资产账本；按实际交易播放金币流向、数值滚动与收支高亮。
- 88 座城市地标、3 个特殊站点、5 幅产业场景及可组合外观的动态像素角色。

## 文件

- `src/game.js`：独立规则与状态转换，无 DOM、无框架依赖；随机数由调用者提供。
- `src/ai.js`：AI 决策（纯函数），由 game.js 转出 `aiAction`。
- `src/board.js`：随机地图、城市 ID 组装与路径坐标，经典图保留旧存档索引。
- `src/industries.js` / `src/IndustryDetails.jsx` / `src/industries.css`：公共事业计价、联动、详情与预览，像素画由 `scripts/draw-industries.mjs` 生成。
- `src/BoardHub.jsx` / `src/board-hub.css`：棋盘中央状态、公告、事件、道具与回合记录。
- `src/eventCards.js` / `src/EventCards.jsx` / `src/PixelEventIcon.jsx` / `src/event-cards.css`：事件库、金卡抽取、原创像素图标与特殊动画。
- `src/cityEventCards.js` / `src/CityEvents.jsx`：逐城事件定义、本局卡池只读预览，独立于通用奇遇。
- `src/PropertyActions.jsx` / `src/PropertyPortfolio.jsx` / `src/property-actions.css`：收购确认、抵押筹款、资产明细与赎回。
- `src/MapEditor.jsx` / `src/map.css`：地图设置、随机预览与俯视地图布局。
- `src/useGameController.js`：移动与结算动画、取消、到站提交和 AI 调度。
- `src/audio.js`：本地合成骰子、脚步、到站和金币收支音效，支持手势解锁及静音。
- `src/appearance.js` / `src/PixelPlayer.jsx` / `src/AppearanceEditor.jsx`：外观数据、共用角色渲染与编辑器。
- `src/Effects.jsx` / `src/depth.css`：金币、金额滚动及角色动作样式。
- `src/main.jsx` / `src/style.css`：界面、交互、AI 调度、本地存储。
- `scripts/draw-assets.mjs`：调用城市生成器，并生成角色与站点 SVG。
- `src/cityCatalog.js`：全部 88 城的唯一资料源，含地标、素材、游戏价格与分组。
- `src/CityLibrary.jsx`：城市筛选搜索与预览；与棋盘、房产详情共享城市库。
- `scripts/draw-city-library.mjs`：全部 88 座城市 SVG 的统一生成入口；绘图源在 `scripts/city-art/`。
- `public/assets/city-library/`：全部城市素材；其余插画、角色及字体位于 `public/assets/` 对应目录。
- `tests/game.test.js`：经济、卡牌、区域加成、非法操作与 50 局种子模拟。
- `scripts/browser-check.mjs`：实际浏览器交互与移动端无溢出验证。

## 原型边界

当前已支持浏览器多人联机与单机，没有微信登录、排行榜、支付或小程序发布包，未提交微信审核。AI 使用纯规则策略，不调用外部模型。联机由服务端统一执行规则与随机数；单机存档仍保存在浏览器，二者互不覆盖。

资产来源及生成提示见 `public/assets/ASSETS.md`。标题字体 ZCOOL KuaiLe 使用 SIL Open Font License，许可证随字体提供。
