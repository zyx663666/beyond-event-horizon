# 最终音频、航行控制与双语层级整合

本轮保留原有 36 秒片头、390 秒航程和 36 秒片尾，总长 462 秒。没有增删宇宙场景，也没有移动视界穿越、最后回声或科学/艺术分界。

## 音乐接入

按本轮要求，暂不随项目提供音乐。将有公开分发权的文件放在 `public/audio/score.mp3`，修改 `src/content/audio.config.json` 并重启开发服务器。`src/content/audio.ts` 提供应用配置入口。参数包含地址、音量、用户开始航行后是否启用、淡入/淡出、时间偏移、循环、高速音量及片尾行为。默认音量 0.42，淡入 4 秒、淡出 5 秒，不循环，贯穿片尾。文件不存在时显示“待接入”，不发送缺失文件请求。较短音轨自然结束，不截断影片。

`publishAllowed` 默认 false。加入文件后，只有确认拥有仓库和网站公开分发权并改成 true，生产构建才会发布音频。构建清单自动包含该文件，网址使用 Vite BASE_URL，兼容 GitHub Pages 子路径。

音乐链路位于左下导航终端，可点击连接/静默。直达 Film 或刷新不会自动播放有声音乐；Observatory 的开始航行采用同文档切换，保留真实点击授权。暂停、后台、WebGL 丢失时媒体立即暂停。重播回到零点及导演标准，保留当前用户的静音选择；页面刷新清除先前授权状态。

## 航行等级与同步

| 导航显示 | 内部影片时率 |
|---|---:|
| 待机 / STANDBY | 0 |
| 前进 I / AHEAD I | 0.55 |
| 前进 II / AHEAD II · 导演标准 | 1 |
| 前进 III / AHEAD III | 1.75 |
| 深空巡航 / DEEP TRANSIT | 4 |

数字时率不显示在观众界面。档位改变具有扫描亮度过渡和推进条响应。原仪表中的档案航速由距离/任务纪年的差分推算，单位 c，与档位分开；黑洞段保留固有时、面积半径和中继频比，不虚构光速百分比。

JourneyController 是唯一影片时钟；镜头、注释、字幕、科学事件及 Credits 都读取同一时刻。HTMLAudioElement 跟随其 currentTime 和 playbackRate，并开启 preservesPitch。定位强制对齐，常规播放在媒体时间差超过 0.16 秒时纠偏。高速模式渐减到默认音量的 24%；最好的音乐节奏仍在导演标准档。极低帧率设备的帧间显示会落后于连续媒体时钟，这不是 RTX 4060 的同步/性能验证。

浏览器规则参考：[自动播放限制](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)、[播放速度](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate)、[保持音高](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preservesPitch)。

## 双语与配置

中文在片头、章节、HUD、对象名称、事件提示、科学注释、诗句、片尾、Observatory 和入口按钮中优先显示；英文保留为较小技术副标。整体仍只有 16:9 正式布局，其他比例使用黑边。

- `src/content/language.ts`：界面语言顺序与旧档案字符串规范化。
- `src/content/uiText.ts`、`flight.ts`：仪器、导航与音乐状态。
- `src/content/opening.ts`、`chapters.ts`、`annotations.ts`、`quotes.ts`、`scienceDiagrams.ts`：标题、章节、科学、哲学与图示文案。
- `src/content/credits.ts`：署名与最终短句；原有作者/团队/学校占位保留，待作者填写。
- `src/content/audio.ts`、`audio.config.json`：音频配置。

## 发布验证

47 项测试覆盖原有光路、因果、航程连续性，加上档位、媒体定位/暂停、自动播放拒绝、短音轨/循环、延迟播放承诺与所有档位下的事件顺序。生产子路径构建通过；11 个部署文件，仅包含运行资源。地球纹理、科学查表、JS、CSS、图标在本地生产预览均返回 200。开发用生成测试音与 WebGL 恢复按钮只存在于 `DEV && qa=1`，生产检查确认其未入包。

1080p、2560×1440、3840×2160 检查采用 Edge；检查的是实际 CSS 视口和 16:9 安全区。GTX 760 上以 preview 渲染档运行功能验证，不将 4K 界面截图当作原生 4K 性能测试。RTX 4060 原生 2K/4K 帧率、正式 MP3 混音及变速听感仍需实机/真实音轨验证。

GitHub Actions 在 main push 后执行 npm ci → npm test → 生产构建 → 资源检查 → Pages 部署。临时截图、dist、本地缓存和私人附件由 .gitignore 排除，运行包采用资源白名单。网站沿用 https://tianshanyun.cloud/beyond-event-horizon/。

浏览器实测：标准档开场与关键段抽查，高速连续回放完成至 462.000 秒，最终黑屏、音乐停止、导航待机、着色器错误数 0。生成测试音验证变速/定位/暂停，播放中模拟 WebGL 丢失及恢复后保持时间连续。正式 MP3 尚未提供，因此不宣称最终音乐听感已验收。
