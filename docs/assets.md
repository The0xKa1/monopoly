---
title: 项目资产维护
form: reference
updated: 2026-10-20
status: active
tags: [assets]
---

# 美术与资源资产

正式素材统一放在 `public/assets/`，浏览器通过 `/assets/` 路径访问。
美术方向：奶油色、鼠尾草绿、暖金色与低分辨率像素地标；字体和图标与界面统一。

## 2026-10-20 · GitHub 展示标题
- `public/assets/readme/feature-*.svg`：12张256×224玩法示意，覆盖经营/事件/联机/外观与音乐；由 `node scripts/draw-readme-features.mjs` 重建，复用城市库、appearance与PixelEventIcon/PixelEconomyIcon原创图形，无新增第三方图像或字体，Lucide/字体原许可不变。
- `public/assets/readme/monopoly-banner.svg`：960×340，12秒CSS循环，小人行走/跳字母/掷骰/接金币，支持减少动态；README以picture嵌入，减少动态选用同目录 `monopoly-banner-still.svg` 静帧，无脚本、外链或字体依赖。
- `node scripts/draw-readme-banner.mjs` 重建；字形、街景和动画为本项目原创，人物复用 `src/appearance.js`。仅参考 SuperNav 的 SVG 标题嵌入形式，未复制其图形或字体。无新增第三方许可证依赖；本仓库尚未声明统一开源许可证。

## 已接入背景音乐（2026-10-12）
- 四首获用户选定：大厅《田埂午后》、准备《窗边等你》、常规《街角慢跑》、后期《夜色将至》。
- `public/assets/music/{lobby,ready,playing,late}.wav` 为无损32kHz双声道循环母版；`manifest.json` 记录时长、字节数与SHA-256，总约25MB，按需加载。
- 来源均为本项目原创旋律和程序合成，无第三方采样/旋律或额外素材许可。运行 `python3 scripts/prepare-music.py` 调用四份合成源并复制正式素材；需要NumPy，AAC试听仅在系统有afconvert时生成。
- 大厅正式版取16小节主题并将尾音回绕；其余使用获选循环母版。试听目录的淡出文件不作游戏循环。下方目录保留候选与获选曲试听产物，不随部署发布。

## 正式资产清单

| 路径（相对项目根目录） | 内容 | 来源与维护方式 |
| --- | --- | --- |
| `artifacts/retired/china-pixel-world.png` | 已移除的中央插画，仅本地归档 | 原内置 imagegen 生成；不在 public 中，不随构建发布 |
| `public/assets/city-library/*.svg` | 全部 88 座城市地标，中国 58 座、世界 30 座 | `scripts/draw-city-library.mjs` 统一生成 |
| `src/PixelEventIcon.jsx` | 爱心、蛋糕、验房猫、巴士、施工吊机、吊床等 30 种事件图标 | 原创 24×24 像素 SVG 几何，运行时渲染，无外部图片 |
| `src/appearance.js` | 可组合肤色、发型、服装、帽子、眼镜、配饰及两帧步行动作 | 本项目原创像素几何；运行时按玩家配置渲染 |
| `public/assets/players/*.svg` | 4 个默认外观和 8 个步行帧导出参考 | draw-assets 调用同一角色渲染器；应用不依赖固定角色文件 |
| `public/assets/stations/*.svg` | 起点、宝箱、城市事件亭 3 场景 | 原创 SVG 几何，由 draw-assets 统一调用生成器 |
| `public/assets/industries/*.svg` | 铁路站台、机场、货轮码头、火箭发射台、水坝与风机 5 场景 | 本项目原创 96×80 像素 SVG，无外部图片；draw-industries 生成 |
| `artifacts/retired/stations/*.svg` | 已撤下的高铁/海岛/驿站/庆典 | 原创旧站点归档，不参与构建，生成器已停产 |
| `public/assets/stations/city-event.svg` | 绿瓦金卡的城市事件像素场景 | `scripts/draw-city-event-station.mjs` 可独立生成 |
| `public/assets/fonts/zcool-kuaile.ttf` | ZCOOL KuaiLe 标题字体 | Google Fonts 分发，随附 SIL OFL 许可证 |
| `public/assets/fonts/OFL.txt` | 标题字体许可证 | 字体分发时一并保留 |
| `lucide-react` 依赖 | 界面线性图标 | ISC 许可证，通过 React 组件使用 |

正文使用系统中文字体。
音效由 [src/audio.js](../src/audio.js) 使用 Web Audio 本地原创合成，无需外部音频文件或下载。
骰子为短促拨动声，逐格移动为交替脚步声，到站为双音提示，金币收入上行、支出下行。
音效和动画事件同步；开关立即静音，重开取消旧声音，页面隐藏时停止播放。

## 绘制与接入

- 城市统一入口：[scripts/draw-city-library.mjs](../scripts/draw-city-library.mjs)，运行后重建全部 88 图。
- 城市记录在 `src/cityCatalog.js`，素材均为 `city-library/<id>.svg`；旧中文文件已迁移，图像字节未变。
- 绘图源在 `scripts/city-art/classic.mjs`（原 12 城）与 `pixel.mjs`（其余 76 城）；均为无文件写入的纯绘图模块。
- 新增城市先登记资料和 artStyle，再补对应 ID 的绘图；生成器会检查缺失及未登记图案。
- 在项目根目录运行 `node scripts/draw-assets.mjs`，会调用城市、产业生成器，并重建角色、步行帧和站点。
- 五类产业资料/素材路径统一在 `src/industries.js`；运行 `node scripts/draw-industries.mjs` 可独立重建产业画，未知 ID 不回退到其他产业图。
- 修改图像时优先修改绘图源，再生成；不要直接改 SVG 后被脚本覆盖。
- 城市库元数据与来源见 `src/cityCatalog.js`；建筑为风格化地标，不是比例测绘模型。
- 角色外观存在 `players[].appearance`；所有展示使用 `PixelPlayer`，金币双方也共用该组件。
- 新增角色继续使用相同的原创像素组件，按外观实时绘制，不新增固定编号资产。
- 修改角色组件或色板时维护 `src/appearance.js`，不要为玩家单独维护固定形象。
- 图像接入在 `src/main.jsx`；基础样式在 `src/style.css`，角色动态位于 `src/depth.css`，俯视地图位于 `src/map.css`。
- 插画来源与完整生成提示词：[public/assets/ASSETS.md](../public/assets/ASSETS.md)。

## 验证截图

- `artifacts/desktop.png`：初始桌面布局的早期快照，可能早于后续修改。
- `artifacts/desktop-played.png`：浏览器交互检查后的桌面画面。
- `artifacts/mobile.png`：交互检查后的 390px 手机画面。
- `artifacts/mobile-fresh.png`：重新开始后的手机画面。
- 后三张由 `scripts/browser-check.mjs` 生成；截图是验证产物，不能替代游戏素材。

- `artifacts/depth-desktop.png`、`depth-mobile.png`：历史立体棋盘预览，已不是当前视角。
- `artifacts/moving-desktop.png`：逐格移动中的桌面预览。
- `artifacts/coins-desktop.png`、`coins-mobile.png`：金币交易和资产反馈预览。
- 动态场景截图由 `scripts/motion-check.mjs` 生成；不作为正式素材引用。
- `artifacts/compact-*.png`：折叠布局、资产展开、人物资产弹窗与多尺寸预览，由 `scripts/panels-check.mjs` 生成。
- `artifacts/library-*.png`：首府合集、世界城市、手机图鉴与城市详情，由 `scripts/library-check.mjs` 生成。
- `artifacts/appearance-*.png`：外观编辑器与手机组合预览，由 `scripts/appearance-check.mjs` 生成。

- `artifacts/players-*.png`：新增角色编辑器与 20 人对局的多尺寸预览，由 `scripts/players-check.mjs` 生成。

- `artifacts/maps-*.png`：地图设置、世界大地图与俯视手机预览，由 `scripts/maps-check.mjs` 生成。

- `artifacts/hub-*.png`：中央信息区、道具、交易公告、特殊事件与大地图预览，由 `scripts/hub-check.mjs` 生成。
- 中央信息区复用原 PixelPlayer 和 Lucide 图标，本轮未新增或替换正式美术与音效资产。

- `artifacts/property-*.png`：收购、业主确认、320/390/1440px 抵押、赎回详情及破产公告，由 `scripts/property-check.mjs` 生成。
- 房产操作复用城市库 SVG、金币动效/音效与 Lucide 图标；银行代持采用 CSS 灰色和虚线标记，无新增正式资产。

- `artifacts/events-*.png`：金卡展开、求婚卡面、抽卡公告、320/390/1440px 选城和地图重排中间态，由 `scripts/event-check.mjs` 生成。
- 事件卡框、金色纹理与动画由 `src/event-cards.css` 绘制；故事和效果文案在 `src/eventCards.js`，为本项目原创。
- 城市事件卡面复用全部 88 城现有地标；每城故事和效果在 `src/cityEventCards.js`，为原创虚构游戏内容，未引入外部素材。
- `artifacts/city-events-*.png`：本局卡池、分池测试、金绿城市抽卡、地标揭示与多尺寸地图入口的验证截图。
- `artifacts/events-30-icons.png`：全部 30 个原创金色像素图标的联系表，本地预览产物。
- 维护事件图标改 `src/PixelEventIcon.jsx`，卡面和公告共用；不生成或下载固定城市相关的事件图片。

- `artifacts/event-lab-*.png`：测试卡表、样本和真实结果比较，由 `scripts/event-lab-check.mjs` 等本地浏览器验证生成。
- `artifacts/industries-assets.png`：五幅产业原画联系表；`artifacts/industry-*.png`：计价详情、收费、资产与手机验证截图。
- 测试入口复用事件像素图标；`artifacts/event-expansion-*.png` 为自选奖励、产权和护盾对比的多尺寸预览。

- `artifacts/viewport-*.png`：电脑全图画布、缩放和中央决策的验证截图；本轮沿用原像素图、人物和音效，无新美术素材。
- `artifacts/monopoly-brand-{320,390,1024,1440}.png`：小写 monopoly 品牌与手机/桌面导航的本地响应式验证截图，非正式美术素材。

- `artifacts/multiplayer-desktop.png` / `multiplayer-mobile.png`：联机双浏览器桌面/手机验证截图。大厅沿用项目字体、PixelPlayer 与 CSS，没有新增第三方素材。

## 2026-10-12 · 经营机制像素图标
- `src/PixelEconomyIcon.jsx`：24×24网格原创SVG，拍卖槌、产权盾、银行、补给箱；本项目手写路径生成，React直接渲染，无外部素材或第三方许可证要求。
- `src/economy-fx.css` / `src/FxLayer.jsx`：阶梯动画、落槌/盖章/缴费金币/补给提示；只读提交状态，减少动态时关闭。
- `artifacts/economy-rebalance/` 保存验收截图，仅为验证产物，不作正式资产。

## 2026-10-12 · 像素联机大厅
- `src/NetworkApp.jsx` / `src/network.css`：原创 CSS 网格、像素云朵/太阳/街道、硬边框；复用城市库 getCity().asset 和 PixelPlayer，无新增外部素材或许可证。
- 动画复用 PixelPlayer 两帧步行；CSS 实现人物散步、云朵/鸟/水面/阳光与已准备角色待机。可暂停、后台暂停、系统减少动态时静止，无新外部资产。
- `artifacts/lobby-pixel/`：大厅首页、准备大厅 1440/390/320px、外观编辑与动画验证截图，本地验证产物。

## 2026-10-12 · 初版背景音乐候选（未采用）
- `scripts/synthesize-bgm.py`：本项目原创旋律与程序合成，NumPy 生成带限方波/三角波、噪声鼓点；无第三方采样或旋律，无额外第三方素材许可依赖。
- `artifacts/bgm-v1/`：大厅108、准备88、常规对局116、后期140、结算104 BPM；WAV试听/循环母版、AAC试听、连播与 manifest.json。仅本地候选，未放入 public 或部署。
- 运行 `python3 scripts/synthesize-bgm.py` 重建WAV/清单；AAC用系统 afconvert（m4af/aac，160kbps）转换；index.html 为本地试听页。

## 2026-10-12 · 乡间民谣 8-bit 第二版试听
- `scripts/synthesize-folk-bgm.py`：原创《田埂午后》，F大调、92BPM、62:38摇摆；拨弦/芯片笛音、交替低音、木质敲击与轻刷声，全程序合成，无第三方采样或引用旋律。
- `artifacts/bgm-folk-v2/`：约53秒WAV/AAC、参数清单与试听页；脚本可完整重建。保留带引子/结尾试听，并新增约42秒精确循环母版供正式接入。

## 2026-10-12 · 准备界面音乐候选
- 《田埂午后》已用于大厅。用户已选定《窗边等你》用于准备界面：78BPM、3/4拍、降B大调、芯片FM电钢琴/柔和低音。
- `scripts/synthesize-ready-bgm.py` 完整重建 `artifacts/bgm-ready-v2/`：47秒WAV/AAC试听、约37秒PCM循环版、清单与试听页；全原创合成，无第三方素材；循环版已发布。

## 2026-10-12 · 常规对局音乐试听
- `scripts/synthesize-playing-bgm.py` 原创《街角慢跑》：112BPM、降E大调、32小节；短促芯片旋律/切分低音/轻鼓点，第三段减少配器。无第三方采样或旋律。
- `artifacts/bgm-playing-v2/` 保存69秒试听、精确PCM循环母版、连续两轮试听、AAC、清单与试听页；脚本可重建。循环接缝保留原始样本，只有试听首尾淡入淡出；循环版已发布。

## 2026-10-12 · 后期对局音乐候选
- 常规对局《街角慢跑》已接入。后期获选曲《夜色将至》：120BPM、D小调、24小节，低音3+3+2脉冲与短句，中段稀疏，无强军鼓/高频踩镲。
- `scripts/synthesize-late-bgm.py` 完整生成 `artifacts/bgm-late-v2/`：48秒试听/PCM循环母版、96秒连播、AAC/清单/试听页；原创程序合成，无第三方素材，循环版已发布。

## 后续维护
- `artifacts/reconnect-{320,390,1440}.png`：连接页按钮样式验收截图，沿用配色与字体，无新增外部资产。

- 增删或替换素材时同步本清单及 `docs/index.md`；在 `docs/handoff.md` 记录改动和预览结果。
- 保留来源、许可证及可复现绘制方式；生成插画时更新完整提示词记录。
- 检查资源可加载、像素缩放、手机显示和控制台错误，再交付视觉修改。
- 本文件与其他 docs 一样不超过 150 行。
