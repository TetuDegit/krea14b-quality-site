// Local-only experimental appendix. Published results.json remains the frozen
// completed G0-G6 batch; pending scores are never substituted with zeros.
(async function () {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return;
  try {
    const response = await fetch('local_experiments.json', {cache: 'no-cache'});
    if (!response.ok) return;
    const data = await response.json();
    const root = document.createElement('section');
    root.className = 'section'; root.id = 'local-experiments';
    const title = document.createElement('h2'); title.textContent = '长提示词追加实验 · G7/C 与 G8/D';
    const note = document.createElement('p');
    note.textContent = `配对旧批次：${data.reused_batch}。${data.status_note} 长批次原有七组与评分直接复用。`;
    root.append(title, note);
    const methods = document.createElement('p');
    methods.textContent = 'G7/C：空间低频残差引导＋直接2×五步；G8/D：整体latent残差引导＋直接2×五步。λ=[0.8,0.6,0.4,0.2,0.1]。';
    root.append(methods);
    const table = document.createElement('table');
    const head = document.createElement('tr');
    ['方法', '案例', '状态', 'FAST-VQA', 'Patch-FGResQ', 'VideoReward Overall'].forEach(label => {
      const th = document.createElement('th'); th.textContent = label; head.append(th);
    });
    const thead = document.createElement('thead'); thead.append(head); table.append(thead);
    const body = document.createElement('tbody');
    data.items.forEach(row => {
      const tr = document.createElement('tr');
      const values = [row.method, row.sample_id, row.state,
        row.scores?.fast_vqa?.score, row.scores?.patch_fgresq?.score, row.scores?.video_reward?.Overall];
      values.forEach((value, index) => {
        const cell = document.createElement('td');
        cell.textContent = value === undefined || value === null ? '待运行' : index > 2 ? Number(value).toFixed(4) : value;
        tr.append(cell);
      });
      body.append(tr);
    });
    table.append(body);
    const scroll = document.createElement('div'); scroll.className = 'table-scroll'; scroll.append(table); root.append(scroll);
    const caution = document.createElement('p');
    caution.className = 'caption';
    caution.textContent = '仅本地附录。技术检查不要求质量改善；尚未观看的结构、细节、模糊、运动、边界和闪烁不预填结论。新分数就绪后与G4/G1/G2/G3配对分析。';
    root.append(caution); document.querySelector('main').append(root);
  } catch (error) { console.error('Local experiment appendix:', error); }
})();
