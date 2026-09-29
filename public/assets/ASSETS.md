# 资产说明

- 原中央插画已从应用和发布资源移除，归档于 `artifacts/retired/china-pixel-world.png`；原内置 imagegen 生成提示词保留如下。
- `city-library/*.svg`：全部 88 座原创城市像素地标，统一按英文 ID 命名，由 `scripts/draw-city-library.mjs` 生成，不使用外部图片素材。
- `scripts/city-art/classic.mjs` 保留原 12 城绘图，`pixel.mjs` 保存其余 76 城绘图；原中文素材已迁移，图像内容未变。
- 城市库元数据、地标名称与事实参考来源保存在 `src/cityCatalog.js`；参考网页仅用于地理与地标核对，图像由项目代码绘制。
- `players/*.svg`：4 个默认外观和 8 个步行帧导出参考，由 `scripts/draw-assets.mjs` 调用 `src/appearance.js` 生成；应用按玩家自定义配置实时绘制，不再使用固定职业形象。
- `stations/*.svg`：起点、奇遇宝箱及独立城市事件场景；已撤下的高铁、度假、驿站、庆典归档在 `artifacts/retired/stations/`，不随构建发布。
- `industries/*.svg`：铁路、航空、航运、太空冒险、水利电力 5 幅原创 96×80 像素几何场景，由 `scripts/draw-industries.mjs` 生成，draw-assets 统一调用；无外部图片或另行第三方美术许可依赖。
- `stations/city-event.svg`：原创城市事件像素卡亭，由 `scripts/draw-city-event-station.mjs` 可复现绘制，并接入 draw-assets。
- 城市事件卡面复用 city library 的 88 城原创地标，金边与绿色印章用 CSS；故事在 `src/cityEventCards.js`。未新增外部图片、字体或音频依赖。
- 城市、人物及站点 SVG 在 2026-09-29 本轮细化；中央插画现已停用。
- `fonts/zcool-kuaile.ttf`：ZCOOL KuaiLe，Google Fonts 分发，SIL OFL 许可证见 `fonts/OFL.txt`。
- 界面线性图标来自 lucide-react，采用 ISC 许可证。

- `src/PixelEventIcon.jsx`：30 种原创 24×24 像素 SVG 事件图标，卡面和公告共用，无下载素材。
- `src/event-cards.css`：原创金色卡背、边框、光纹、翻牌与地图重排/传送动画；故事文案在 `src/eventCards.js`。

## 音效

- `src/audio.js`：本项目使用 Web Audio 合成的骰子、脚步、到站和金币音效，无外部音频素材。
- 金币收入与支出使用不同音阶；静音、重开及后台切换会停止声音。

## 历史插画提示词

Use case: stylized-concept. Asset type: background illustration for the center of a Chinese travel monopoly browser game. Create a beautifully crafted wide landscape pixel art diorama, 3:2 aspect ratio. A miniature lush green Chinese island with winding pale aqua river, small arched bridge, Chinese red-roof pagoda and traditional palace on left, clustered Shanghai skyline with pearl tower on right, small cream houses, ginkgo trees, pines, distant blue-green mountains, a tiny orange train in front. Cozy sophisticated indie game art, authentic crisp low-resolution pixel art, orthographic slightly elevated side view, extremely clean controlled pixel clusters, subtle dithering. Muted sage green, jade, butter yellow, warm ivory, terracotta, pale turquoise palette. Generous very pale sage green empty sky at upper third for overlay game title. Island centered with space around edges. Gentle bright daytime. No text, no letters, no UI, no board game tiles, no frame, no watermark. Pixel art, not smooth vector, not 3D render.
