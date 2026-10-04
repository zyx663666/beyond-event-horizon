# Prototype 0.2 — Cinematic Observation Core

## 目标与技术决策

保留 App → RendererHost / FrameClock → BlackHoleScene → RenderPipeline 的模块边界。继续使用 Three.js、TypeScript、WebGL2 与独立 GLSL3，没有新框架、远程素材或第三方运行时依赖。

| 方向 | 实现 | 选择原因 |
| --- | --- | --- |
| 吸积盘 | 32 个径向分段构成轻微外张表面；剪切噪声、局部热点、径向辐射包络、D³ 方向权重 | 在原有栅格化架构中增加流动与空间层次，成本可控，各参数可独立研究 |
| 黑洞边缘 | 独立 OpticalRim；按球体切线投影放置轮廓，fwidth 抗锯齿，前景盘面直线求交遮挡 | 先建立可替换的光学表现模块，避免把艺术轮廓误当成完整透镜 |
| 镜头 | 180 秒确定性观测循环；建立视角、低角度掠视、靠近、升高、回到起点；五次平滑插值 | 位置与变焦在节点处保持连续、速度和加速度收敛，便于固定时间复现，无镜头切换与剧情 |
| 仪器 | 模型距离、倾角、角直径、FOV、归一化径向辐射曲线 | 让画面有可读的观测依据；用真实模型计算替代虚构的天体质量、频谱或信号 |
| 输出 | 延续线性 HDR → Bloom → SMAA → ACES/sRGB | 避免重复色调映射，保留亮区动态范围与现有可扩展输出链路 |

## 科学模型边界

径向包络使用 F(r) ∝ r⁻³[1−√(Rin/r)]，归一化峰值位于 r = 49 Rin / 36。模型参考 [薄盘辐射公式，MNRAS](https://academic.oup.com/mnrasl/article/462/1/L56/2589646)，这里仅取其空间形状，不赋予物理质量、吸积率或绝对辐射单位。

SR 启发式权重使用 D = √(1−β²)/(1−β cosθ)，亮度乘 D³。β 随半径递减，视线按局部坐标计算。没有光线弯曲、引力红移、光谱积分、迟延时间、GRMHD 或速度/时间尺度的闭合求解，不能作为定量相对论成像使用。径向颜色是艺术映射。

[NASA 黑洞结构介绍](https://science.nasa.gov/universe/black-holes/anatomy/) 将光子环与强引力导致的弯曲光路联系起来。本版本的细亮边及副轮廓仅是 optical proxy，未计算这些光路；星空保持直线投影。黑色球体也不是实际黑洞阴影大小的物理解。

盘面是双面外张表面，不是体积流体。轮廓遮挡用单一高度平面近似，因此在盘面交界处可能存在小幅偏差。未来光线追踪实现应整体替换该模块，而非在其上叠加“真实光子环”。

## 模块与接口

- ShaderManager 继续统一创建和释放材质，definitions 注册 rim 并组合公共 diskProfile 源码。
- uniforms 工厂新增盘面局部观察位置与边缘参数；AccretionDisk 更新观察方向，OpticalRim 更新投影。
- CameraDriver、ObserverState、VisualCore 契约不变；轨迹实现另提供 fieldOfViewAt。
- ObservationPanel 仅读取模型与相机，250 ms 刷新一次，没有事件监听或观众交互控制。
- preview / target / ultra 的像素、恒星及噪声预算保持原样；默认 target，不按 GTX 760 自动降档。

## 复现

运行 npm run build 后以 npm run preview -- --port 5176 --strictPort 启动本机预览。

- 动态观测：<http://127.0.0.1:5176/?quality=target&debug=0>
- 低角度：?quality=target&t=43
- 近景：?quality=target&t=84
- 升高视角：?quality=target&t=130
- 同帧对照关闭边缘：?quality=target&t=84&rim=0
- 开发诊断：?quality=preview&debug=1

## 验证

- TypeScript 与 Vite 生产构建通过。
- 10 项自动测试通过：既有配置隔离、固定星表、时间暂停、性能统计，以及新增薄盘包络边界/峰值/衰减、轮廓角半径、镜头所有节点的位置/姿态/速度/视场连续性、近似参数约束。
- 浏览器实测记录及截图见 artifacts/prototype-0.2-*。RTX 4060 未在此开发设备上验收，当前采样不作为其性能承诺。
- target 在 1600×900 绘制缓冲区下从启动运行到 108.32 秒，前后均为 22 draw calls / 6 geometries / 17 textures，Shader 错误为 0；该次滚动采样为 120 FPS、8.33 ms 平均帧间隔，不能解释为全程平均或 GPU 时间。
- 对照 preview + rim=0：1280×720，18 draw calls / 5 geometries / 13 textures，Shader 错误为 0。轮廓关闭时不提交其几何体。
- 检查 t=43 / 84 / 130 三个镜头位置；检查 1600×900 桌面、420×840 窄屏和默认预览尺寸。窄屏隐藏径向图，核心数值仍保留，盘面构图完整。浏览器控制台无 error/warn。
- 最终构建主 JS 636.22 kB（gzip 182.99 kB）。Vite 有大于 500 kB 的包体提示，构建成功；包含 Three.js 与 SMAA 内嵌查找图，暂未为此独立拆包。

## 下一阶段

先在 RTX 4060 上做 1440p / 4K 连续运行与 GPU 时间测量，再考虑独立成像实验：静态 Schwarzschild 光路与星空偏折的定量对照。保留此版本作为栅格化视觉基线。剧情、信号传播与交互体验仍不在本版本范围内。
