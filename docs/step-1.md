# Prototype 0.1 — Step 1 模块化拆分

完成日期：2026-09-29。

## 修改范围

沿用现有工程及依赖，仅拆分原有 `src/main.ts`：

| 文件 | 职责 |
| --- | --- |
| `src/main.ts` | 导入样式、取得画布、创建 App |
| `src/app/App.ts` | 装配模块、保留动画循环、FPS 采样和页面指标、转发缩放 |
| `src/core/RendererHost.ts` | WebGL2 初始化、渲染设置、GPU 信息、Shader 诊断、上下文丢失处理 |
| `src/core/FrameClock.ts` | 将原有 performance.now() 动画时间封装为秒数 |
| `src/scene/BlackHoleScene.ts` | 原有星点、黑球、圆盘、内联 Shader、相机更新与投影缩放 |

未新增功能、依赖、质量档、后期效果或物理算法。页面、CSS、package.json 和锁文件保持原样；README 更新目录和模块说明。原有 REPORT.md 保留，作为先前环境验证记录。

## 验证结果

- `npm run build` 成功：TypeScript 类型检查通过，Vite 生产构建通过。
- Vite 仍提示压缩后的 JS 大于 500 kB（本次约 532.03 kB）；不是构建错误，本步骤不额外调整打包策略。
- 对照拆分前保存在临时目录的 main.ts：四段 GLSL 在统一换行符后逐字一致。
- 使用真实 Three.js 场景对象对照原始初始化代码与新模块：2,500 个星点的位置数据、所有几何体、材质及物体变换一致。
- 在 0、0.016、1、10、24.9、25、30、60 秒比较相机位置、朝向、投影矩阵与盘面 uTime，全部一致。
- 相机缩放后的投影矩阵一致；FrameClock 保留原有墙钟秒数计算方式。
- package.json、package-lock.json、index.html、src/style.css 与拆分前逐字节一致。

本次检查没有进行浏览器截图对照或 RTX 4060 性能测试；构建及场景数据对照不等同于 GPU 画面验收。

## Step 2 准备情况

Shader 与材质创建已集中到 BlackHoleScene，渲染诊断已集中到 RendererHost。下一步可以从场景模块提取四段 GLSL 到独立文件，再建立 Shader 定义、uniform 管理与预编译流程，无需再次拆分入口和帧循环。

本次没有创建 ShaderManager，也没有实现引力透镜、时间膨胀、信号系统或复杂交互。
