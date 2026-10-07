---
title: 项目文件索引
form: index
updated: 2026-10-07
status: active
tags: [files]
---

# 文件与目录索引

以下路径相对项目根目录。

## 入口与文档

| 路径 | 作用 |
| --- | --- |
| [agents.md](../agents.md) | 项目协作规则；结束工作时更新 docs；单文件 150 行上限 |
| [README.md](../README.md) | 项目说明、启动命令和原型边界 |
| [docs/project.md](project.md) | 项目简介、玩法、技术方案与当前阶段 |
| [docs/index.md](index.md) | 文件与目录用途索引，即本文件 |
| [docs/handoff.md](handoff.md) | 最新交接、验证、待办和接手提示 |
| [docs/assets.md](assets.md) | 美术、字体、图标与预览资产维护 |
| [index.html](../index.html) | 网页入口、标题和 viewport 配置 |
| [package.json](../package.json) | 依赖及开发、构建、测试命令 |
| [package-lock.json](../package-lock.json) | npm 依赖锁定版本 |
| [.gitignore](../.gitignore) | 排除依赖、构建、索引、截图、系统文件与本地环境配置 |

## 应用实现

| 路径 | 作用 |
| --- | --- |
| [src/players.js](../src/players.js) | 20 人上限、昵称校验、角色创建、存档人数检查与移动中名单合并 |
| [src/players.css](../src/players.css) | 横向名单、多人同格标记与昵称输入的响应式样式 |
| [tests/players.test.js](../tests/players.test.js) | 20 人边界、回合轮转、破产跳过、重开、存档与完整对局模拟 |
| [scripts/players-check.mjs](../scripts/players-check.mjs) | 新增、人数上限、移动中添加、20 人资产与 AI 行动检查 |
| [src/game.js](../src/game.js) | 角色、季节、卡牌、城市/产业经济、升级、破产与结算；转出 ai.js 的 aiAction |
| [src/ai.js](../src/ai.js) / [tests/ai.test.js](../tests/ai.test.js) | 规则型 AI：动态现金缓冲、同色组、道具、收购应答、抵押/赎回、事件选择；及其测试 |
| [src/industries.js](../src/industries.js) | 五类公共事业资料、价格、独立计费和联动公式 |
| [src/IndustryDetails.jsx](../src/IndustryDetails.jsx) / [src/industries.css](../src/industries.css) | 产业详情、骰点/来客费用预览、联动状态与响应式场景 |
| [tests/industry-mechanics.test.js](../tests/industry-mechanics.test.js) / [scripts/industries-check.mjs](../scripts/industries-check.mjs) | 产业产权、费用快照、联动断开/恢复、债务、存档和手机交互验证 |
| [scripts/draw-industries.mjs](../scripts/draw-industries.mjs) | 五幅原创 96×80 产业场景的可复现 SVG 生成器 |
| [src/eventOptions.js](../src/eventOptions.js) | 引擎/界面共用的实时旅行目标、自选道具和合法房产选项 |
| [scripts/event-expansion-check.mjs](../scripts/event-expansion-check.mjs) | 选择刷新/两分支、产权与护盾对比、巴士逐格、无目标兜底与手机验证 |
| [tests/event-expansion.test.js](../tests/event-expansion.test.js) | 30 卡扩展的收支、条件、目标、产权、护盾、AI 与持久化校验 |
| [src/cityEventCards.js](../src/cityEventCards.js) | 88 城各一张专属故事/规则/效果，城市身份读取 city library |
| [src/CityEvents.jsx](../src/CityEvents.jsx) / [src/city-events.css](../src/city-events.css) | 本局城市卡池只读预览，独立地图入口 |
| [tests/city-events.test.js](../tests/city-events.test.js) / [scripts/city-events-check.mjs](../scripts/city-events-check.mjs) | 地图入池、来源隔离、88 卡结算/AI、存档与多尺寸浏览器校验 |
| [scripts/draw-city-event-station.mjs](../scripts/draw-city-event-station.mjs) | 原创城市事件站点的 SVG 生成器，接入 draw-assets |
| [src/eventCards.js](../src/eventCards.js) | 30 张通用奇遇、118 张统一查询和独立的本局城市卡池筛选 |
| [src/EventLab.jsx](../src/EventLab.jsx) / [src/event-lab.css](../src/event-lab.css) | 事件卡测试入口、场景选择、实况比较与响应式界面 |
| [src/eventLab.js](../src/eventLab.js) | 按当前地图构造独立卡牌样本和道具试用状态 |
| [src/gameStorage.js](../src/gameStorage.js) | 正常/测试存档分离、校验加载与返回原对局 |
| [tests/event-lab.test.js](../tests/event-lab.test.js) | 卡牌样本、现金不足、道具试用和存档隔离 |
| [scripts/event-lab-check.mjs](../scripts/event-lab-check.mjs) | 全30卡入口、低现金、选择奖励、道具使用、刷新返回与动画取消验证 |
| [src/EventCards.jsx](../src/EventCards.jsx) | 金色三选一抽卡、翻面揭示、本局城市和事件奖励/房产选择 |
| [src/PixelEventIcon.jsx](../src/PixelEventIcon.jsx) | 30 种原创像素 SVG 图标，卡面与公告共用 |
| [src/event-cards.css](../src/event-cards.css) | 金卡、翻面、城市重排、传送及移动端/减弱动态样式 |
| [tests/event-cards.test.js](../tests/event-cards.test.js) | 19 项事件流程、资金守恒、地图移动、卡库和 AI 测试 |
| [tests/map-shuffle.test.js](../tests/map-shuffle.test.js) | 城市身份重排、产权/抵押/人物迁移和旧存档校验 |
| [scripts/event-check.mjs](../scripts/event-check.mjs) | 抽卡、全部效果、公告、重排/传送、刷新重开与多尺寸浏览器验证 |
| [src/PropertyActions.jsx](../src/PropertyActions.jsx) | 租金选择、收购业主确认、抵押筹款与破产操作 |
| [src/PropertyPortfolio.jsx](../src/PropertyPortfolio.jsx) | 城市/产业净值、服务费预览、银行代持状态与原额赎回 |
| [src/property-actions.css](../src/property-actions.css) | 收购/抵押面板、银行地块与赎回响应式样式 |
| [tests/property-mechanics.test.js](../tests/property-mechanics.test.js) | 收购授权、实际建设支出、抵押/赎回、债务结算、破产回流和存档/AI |
| [scripts/property-check.mjs](../scripts/property-check.mjs) | 业主同意/拒绝、抵押刷新偿债、赎回、公告和多尺寸浏览器验证 |
| [src/BoardHub.jsx](../src/BoardHub.jsx) | 棋盘中心的当前人物、动态、收支公告、事件、自己的道具和回合记录 |
| [src/board-hub.css](../src/board-hub.css) | 中央区域的尺寸适配、局部滚动、卡片和大地图吸附布局 |
| [tests/journal.test.js](../tests/journal.test.js) | 收支公告持久化、无现金事件、条数上限和旧存档兼容 |
| [tests/game-fx.test.js](../tests/game-fx.test.js) | 特效时刻识别：真实规则转换、地图重排忽略、破产与终局 |
| [scripts/hub-check.mjs](../scripts/hub-check.mjs) | 中央信息、道具使用/锁定、公告刷新、事件及大地图操作验证 |
| [src/MapEditor.jsx](../src/MapEditor.jsx) | 地图范围/大小、对局轮数（数字/无限）、随机预览、只保存轮数或应用重开 |
| [src/useBoardViewport.js](../src/useBoardViewport.js) / [src/BoardViewportControls.jsx](../src/BoardViewportControls.jsx) | 电脑可用画布测量、环形视觉布局、适应/缩放及局部滚动 |
| [src/board-viewport.css](../src/board-viewport.css) | 全窗口棋盘、中央决策、固定操作栏与资产浮层；桌面专用 |
| [src/readability.css](../src/readability.css) | 最后导入的可读性层：--fs-* 字号阶梯、次要文字对比度、地块文字随格子放大 |
| [scripts/board-viewport-check.mjs](../scripts/board-viewport-check.mjs) | 电脑多尺寸全图可见、缩放/恢复、视觉路线、中央操作和手机回归 |
| [src/map.css](../src/map.css) | 俯视棋盘、可变网格、地图设置与移动端滚动 |
| [tests/rounds.test.js](../tests/rounds.test.js) | 自定义/无限轮数、旧存档默认 20、中途改轮数、立即结算与 AI 对局 |
| [tests/maps.test.js](../tests/maps.test.js) | 范围/尺寸、路径、存档、动态地产经济和完整对局 |
| [scripts/maps-check.mjs](../scripts/maps-check.mjs) | 换图、预览、图鉴、移动、购城、刷新与手机检查 |
| [src/board.js](../src/board.js) | 经典索引、随机地图、cityOrder 重排与产权迁移、校验、色组及路径坐标 |
| [src/cityCatalog.js](../src/cityCatalog.js) | 全部城市唯一数据源：资料、素材、游戏价格/分组、getCity 查询与参考来源 |
| [src/CityLibrary.jsx](../src/CityLibrary.jsx) | 城市库筛选、搜索、像素预览、详情及原棋盘地产入口 |
| [src/city-library.css](../src/city-library.css) | 城市库和城市详情的桌面与手机样式 |
| [src/main.jsx](../src/main.jsx) | React 入口、棋盘、图鉴、弹窗、骰子动画、音效、存档与 AI 调度 |
| [src/useGameController.js](../src/useGameController.js) | 逐格移动、到站提交、按决策人调度 AI、金币结算与动画取消 |
| [src/audio.js](../src/audio.js) | Web Audio 原创合成音效、手势解锁、静音、取消与节点释放 |
| [src/Effects.jsx](../src/Effects.jsx) | 金额滚动、金币飞行与交易双方提示 |
| [src/gameFx.js](../src/gameFx.js) | 纯函数 detectFx：从一次提交的前后状态识别买地、收购、升级、收租、起点、换人、换季、破产、终局 |
| [src/FxLayer.jsx](../src/FxLayer.jsx) / [src/fx.css](../src/fx.css) | 只读特效层、中央掷骰（DiceRoll）、像素烟花与结果领奖台；减弱动态时关闭 |
| [src/appearance.js](../src/appearance.js) | 外观选项、数据校验、旧存档补全、纯 SVG 角色渲染 |
| [src/PixelPlayer.jsx](../src/PixelPlayer.jsx) | 全局共用的动态角色头像与步行帧 |
| [src/AppearanceEditor.jsx](../src/AppearanceEditor.jsx) | 分项外观编辑、随机组合、动作预览、保存与取消 |
| [src/appearance.css](../src/appearance.css) | 外观入口和编辑器的桌面/手机样式 |
| [src/depth.css](../src/depth.css) | 角色动作、资产明细与响应式动效 |
| [src/compact.css](../src/compact.css) | 折叠资产与道具、昵称栏、手机棋盘布局与人物选择 |
| [src/style.css](../src/style.css) | 桌面与手机布局、像素呈现、配色、动效与字体声明 |
| [tests/game.test.js](../tests/game.test.js) | 11 项规则测试，包含 50 局种子模拟 |
| [tests/appearance.test.js](../tests/appearance.test.js) | 外观校验、旧存档、经济隔离与渲染变化验证 |
| [tests/cityCatalog.test.js](../tests/cityCatalog.test.js) | 8 项城市覆盖、统一素材、棋盘引用、旧存档兼容与生成一致性验证 |
| [scripts/browser-check.mjs](../scripts/browser-check.mjs) | Chrome 端到端交互验证、移动端溢出检查与截图 |
| [scripts/motion-check.mjs](../scripts/motion-check.mjs) | 移动路径、金币流向、重开取消、刷新恢复、减弱动态与俯视验证 |
| [scripts/audio-check.mjs](../scripts/audio-check.mjs) | 音效事件、真实音频信号、移动端开关和静音持久化检查 |
| [scripts/panels-check.mjs](../scripts/panels-check.mjs) | 折叠开关、人物点击、四人资产、同格选择与多尺寸布局验证 |
| [scripts/draw-assets.mjs](../scripts/draw-assets.mjs) | 调用城市/产业生成器，并绘制角色、步行帧和特殊站点 |
| [scripts/draw-city-library.mjs](../scripts/draw-city-library.mjs) | 全部 88 城生成入口，按城市库选择绘图与输出路径 |
| [scripts/city-art/classic.mjs](../scripts/city-art/classic.mjs) | 原 12 城纯绘图模块，以城市 ID 为键，不自行写入文件 |
| [scripts/city-art/pixel.mjs](../scripts/city-art/pixel.mjs) | 其余 76 城纯绘图模块，以城市 ID 为键，不自行写入文件 |
| [scripts/library-check.mjs](../scripts/library-check.mjs) | 城市库筛选、搜索、全部资产加载、详情、存档隔离与手机验证 |
| [scripts/appearance-check.mjs](../scripts/appearance-check.mjs) | 编辑/取消、刷新/重开、移动中保存、金币头像及手机验证 |

## 资产与生成目录

| 路径 | 作用 |
| --- | --- |
| `artifacts/retired/china-pixel-world.png` | 已移除的中央插画归档，不随应用发布 |
| `public/assets/city-library/*.svg` | 全部 88 座城市素材，统一按稳定英文 ID 命名 |
| `public/assets/players/*.svg` | 默认外观及步行帧导出参考；应用使用 appearance.js 实时渲染 |
| `public/assets/stations/*.svg` | 起点、奇遇、城市事件像素场景 |
| `public/assets/industries/*.svg` | 铁路、航空、航运、太空冒险、水利电力原创像素场景 |
| `artifacts/retired/stations/*.svg` | 已撤下高铁/度假/驿站/庆典的历史素材，不随应用发布 |
| `public/assets/fonts/zcool-kuaile.ttf` | 本地标题字体 |
| `public/assets/fonts/OFL.txt` | 字体许可证 |
| [public/assets/ASSETS.md](../public/assets/ASSETS.md) | 素材来源及历史插画生成提示词 |
| `artifacts/` | 本地浏览器截图；可重新生成，非正式美术素材 |
| `dist/` | `npm run build` 生成的静态页面与资源 |
| `node_modules/` | npm 安装的依赖 |
| `.codegraph/` | 本地代码结构索引与数据库 |

`artifacts/`、`dist/`、`node_modules/`、`.codegraph/` 均为本地产物，已列入忽略规则。
新增、删除或移动源码与正式资产后，在本文件同步更新路径及用途。
