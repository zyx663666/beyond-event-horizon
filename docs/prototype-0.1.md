# Prototype 0.1 — Black Hole Visual Core

交付日期：2026-09-29。该版本承接 Step 1，并完成 Shader、参数、诊断与视觉核心增强。

## 完成内容

- 六个独立 GLSL ES 3.00 阶段文件，以及共享三维噪声片段。
- Shader 注册、统一材质创建、共享帧 uniform、材质参数工厂、预编译与销毁。
- 集中的黑洞、吸积盘、星空、相机、曝光、泛光及质量配置；危险几何和非法输入在创建 GPU 资源前拒绝。
- preview / target / ultra 三个独立配置。target 为默认档，原型不根据 GTX 760 帧率降低展示设定。
- 固定种子恒星数据、亮度与颜色层级、无限远背景近似及淡银河带。
- 双面程序薄盘、径向颜色和强度、差速旋转、环向连续噪声、经过导数过滤的细丝纹理。
- 深度正确的黑色几何遮挡体；保持其作为视觉近似的明确标记。
- 160 秒平滑周期相机轨迹，按绝对场景时间采样，输出位置、四元数和速度。
- HDR 半浮点场景缓冲区、适量 Bloom、展示档 SMAA、ACES 与单次显示颜色转换。
- 只读遥测、完整配置详情、固定时间研发入口、隐藏页面暂停、窗口缩放、销毁与热重载清理。
- 无远程素材依赖的生产构建与本地预览。

## 技术选择

采用 Three.js ShaderMaterial + GLSL3；内置矩阵和属性由 Three.js 提供。ShaderManager 管理材质所有权，WebGL program 缓存仍由 Three.js 管理。编译宏只用于噪声层数，时间和艺术参数通过 uniform 传递。

使用 Three.js 官方 addons 的 EffectComposer、RenderPass、UnrealBloomPass、SMAAPass 与 OutputPass，没有引入其他框架。球体仅使用不受光照影响的黑色材质；透明盘面采用普通 alpha 合成和深度测试，星点使用加法合成，绘制顺序明确。最终展示档使用 SMAA 而非 MSAA，保持分辨率、程序细节和恒星数量目标；当前 Three.js 的 SMAAPass 在线性空间运行，位于 OutputPass 之前。

画布采用支持 alpha 的浏览器上下文，但场景清屏和背景仍为不透明黑色。DOM 界面有独立层叠顺序与合成层，以减少旧显卡/内置浏览器的文字叠层问题。

FrameClock 表达播放时间，不伪装成观察者固有时。VisualCore、CameraDriver 与 ObserverState 为未来科学成像和信号模型保留接入点。当前固有时、信号传播和引力透镜均未实现。

## 实际验证

| 检查 | 结果 |
| --- | --- |
| npm test | 6 项通过，0 失败 |
| npm run build | TypeScript 与 Vite 均通过 |
| 构建提示 | JS 约 627.79 kB，gzip 约 180.51 kB（含内嵌 SMAA 查找图）；存在 500 kB 体积提示，无构建错误 |
| 生产服务 | 本地 HTTP 200，浏览器成功加载生产构建 |
| Shader 变体 | preview、target、ultra 均成功编译并显示画面 |
| 展示档桌面检查 | 1440×900，14,000 星，HDR / ACES / Bloom，Shader 错误 0 |
| 动态运行检查（加入 SMAA 前） | target 场景时间到达约 92 秒，首尾抽样均为 5 geo / 13 tex，18 draw calls，Shader 错误 0 |
| 最终 SMAA 管线 | 1600×900 target 动态运行至 91.50 秒；首尾抽样均为 5 geo / 17 tex，21 draw calls，Shader 错误 0 |
| 浏览器错误 | 正常运行页面未记录到 error / warn；非法 quality 的错误提示是预期行为 |
| 配置错误出口 | quality=invalid 显示 Unknown quality: invalid |
| 画面复核 | 桌面构图、窄侧栏构图与 t=24 固定时间画面已查看 |

实测浏览器报告 ANGLE / NVIDIA GeForce GTX 760 / Direct3D11。加入 SMAA 前的动态检查末尾滚动窗口显示约 120 FPS、8.33 ms 平均 RAF 间隔、8.40 ms P95、0.34 ms CPU 更新与提交耗时。这只是该浏览器会话的抽样，不是 GPU 计时、整段最低帧率或 RTX 4060 验收数据；不可用它替代最终 SMAA 管线的性能验收。

最终 SMAA 管线在 91.50 秒抽样时显示 118.0 FPS、8.47 ms 平均 RAF 间隔、8.40 ms P95、0.38 ms CPU 更新与提交耗时。少量长帧可能使平均值高于 P95，这两个统计量的含义不同。正常页面没有捕获到浏览器 error / warn；最终实际截图中文字叠层显示正常。这仍是当前会话的滚动 120 帧样本，不代表整段最低帧率或最终硬件性能承诺。

## 验证边界

- 尚未在 RTX 4060 实机复测，也未完成 4K 性能验收。
- 尚未故障注入验证上下文丢失/恢复，也未在缺少浮点颜色缓冲扩展的设备上验证 LDR fallback。
- 资源计数首尾一致不能代替长时间压力测试或显存分析。
- 390×844 自动化视口切换遇到浏览器控制超时，未计为通过；新标签页恢复后生产预览正常。
- 吸积盘、黑洞阴影和方向亮度均为视觉近似。无透镜、光子环、多重像、真实多普勒或流体模拟。

## 预览产物

- artifacts/prototype-0.1-target.png：生产构建 target 档的实际浏览器截图。
- artifacts/prototype-0.1-preview.png：开发预览档的实际浏览器截图。
- artifacts/target-telemetry.txt：加入 SMAA 前动态运行约 92 秒时的诊断快照。
- artifacts/final-target-telemetry.txt：最终 SMAA 管线运行到 91.50 秒时的诊断快照。

## 下一阶段

1. 在 RTX 4060 上固定分辨率、浏览器和轨迹，建立逐 Pass 的 GPU 性能基线，并完成上下文恢复与长时间运行验收。
2. 增加少量代表性镜头的固定时间回归截图，约束改算法时的构图、曝光与星点稳定性。
3. 开始 Schwarzschild 外部光路的独立技术实验：先建立低分辨率参考解，再比较实时积分或预计算查表方案。届时用新成像核心替换几何近似，继续复用星表、参数和输出管线。
4. 科学光路验证完成后，再讨论时间与信号模型；剧情与观众交互继续保持独立阶段。
