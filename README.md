# Krea 14B · G0–G6 视频质量观察站

独立静态展示源码。35 段配对视频、7 种方法、每组 5 个案例；1664×960、20 秒、16 fps。三指标真实评分已完成，公开数据位于 `results.json`、`summary.csv`、`per_video.csv`，原始视频哈希见 `media_checksums.tsv`。

- FAST-VQA：作者 FAST-VQA-B 单视频接口与 sigmoid 标定。
- Patch-FGResQ：本项目定义的 FGResQ_v2 原分辨率分块/时间聚合，不冒称官方独立视频指标。
- VideoReward：VideoAlign checkpoint 11352，保留 VQ / MQ / TA / Overall。

不同指标量纲不可相加。5 个案例为探索性回归，不代表完整基准或统计显著性结论。G1–G3 是 Krea 适配方法，不等同于原论文系统复现。G6 使用独立 MemRoPE 历史机制。

站点纯 HTML/CSS/JavaScript，无构建依赖。Pages 发布源为 main 分支根目录。视频作为同仓库、同版本 GitHub Release 附件，禁止将 MP4 加入 Git 历史。config.json 控制仓库与版本；published 字段仅在媒体发布核验后设为 true。

网页包含原始提示词、生成种子、指标分数与视频，公开发布后均可被任何人访问。此目录不包含研究源码、集群路径、凭据、权重或运行环境。

第三方实现与来源：
- https://github.com/VQAssessment/FAST-VQA-and-FasterVQA
- https://github.com/sxfly99/FGResQ
- https://github.com/chaofengc/IQA-PyTorch
- https://github.com/KlingAIResearch/VideoAlign

当前状态：本机完整视频与交互检查通过，正在上传 GitHub Release 并启用 Pages。

计划网页：https://tetudegit.github.io/krea14b-quality-site/

计划媒体版本：https://github.com/TetuDegit/krea14b-quality-site/releases/tag/results-20261024
