# Krea 14B · G0–G8 视频质量观察站

独立静态展示源码。长短提示词两批共80段视频，短批7种方法、长批9种方法、每种5个案例；1664×960、20 秒、16 fps。三指标真实评分已完成，短批数据位于 `results.json`、`summary.csv`、`per_video.csv`；长批位于 `results-long.json`、`long_summary.csv`、`long_per_video.csv`，全部80条逐视频评分见 `all_batches_per_video.csv`，原始视频哈希见 `media_checksums.tsv`。

- FAST-VQA：作者 FAST-VQA-B 单视频接口与 sigmoid 标定。
- Patch-FGResQ：本项目定义的 FGResQ_v2 原分辨率分块/时间聚合，不冒称官方独立视频指标。
- VideoReward：VideoAlign checkpoint 11352，保留 VQ / MQ / TA / Overall。

不同指标量纲不可相加。5 个案例为探索性回归，不代表完整基准或统计显著性结论。G1–G3 是 Krea 适配方法，不等同于原论文系统复现。G6 使用独立 MemRoPE 历史机制。

站点纯 HTML/CSS/JavaScript，无构建依赖。Pages 发布源为 main 分支根目录。两批视频作为同仓库的三个独立 GitHub Release 附件，禁止将 MP4 加入 Git 历史。config.json 指定展示仓库；新增行的 release_tag 指向G7/G8独立媒体版本，旧行继续使用原版本；batches.json 为每批分别指定数据、媒体版本、下载文件及发布状态。默认展示长提示词，页面支持切换批次和两批评分总览。两批文本条件不同，均值与标准差分别按n=5计算，不能混成n=10。

网页包含原始提示词、生成种子、指标分数与视频，公开发布后均可被任何人访问。此目录不包含研究源码、集群路径、凭据、权重或运行环境。

第三方实现与来源：
- https://github.com/VQAssessment/FAST-VQA-and-FasterVQA
- https://github.com/sxfly99/FGResQ
- https://github.com/chaofengc/IQA-PyTorch
- https://github.com/KlingAIResearch/VideoAlign

当前状态：两批视频完整保存到本机，各自媒体哈希和逐视频评分均已核验；公开发布状态以对应Release实际附件为准；全部附件的名称、字节数、uploaded 状态及 GitHub SHA-256 均与原件一致。Pages 提供视频对比、原始提示词、种子、逐视频分数及结果下载。

网页：https://tetudegit.github.io/krea14b-quality-site/

已发布媒体版本：https://github.com/TetuDegit/krea14b-quality-site/releases/tag/results-20261024

长提示词媒体版本：https://github.com/TetuDegit/krea14b-quality-site/releases/tag/results-long-20261026

G7/C、G8/D已完成并追加到长提示词批次，各5条，原G0～G6视频和评分不变。新媒体版本：https://github.com/TetuDegit/krea14b-quality-site/releases/tag/results-long-g78-20261027 。两组仅残差是否空间低通不同；λ=[0.8,0.6,0.4,0.2,0.1]；G7使用σ=2、13×13 Gaussian、reflect空间padding，不沿时间滤波。两组属于train-free探索，不预设有效或宣称原创。G4使用四卡，新组双卡，保持同模型、文本、种子及采样/历史协议，不声称跨并行布局逐位相同。
