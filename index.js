// 初始化飞书SDK
lark.ready(async () => {
  // 1. 获取当前多维表格上下文（表格ID、视图ID等）
  const context = await lark.context.get();
  const { app_id: tableAppId, table_id, record_ids } = context.bitable; // 仅当从记录/表格触发时能获取

  // 2. 加载当前表格的图片字段，填充下拉框
  const loadImageFields = async () => {
    // 调用多维表格API获取表格元数据
    const res = await lark.api.request({
      url: `/open-apis/bitable/v1/apps/${tableAppId}/tables/${table_id}/fields`,
      method: 'GET'
    });
    // 筛选出「图片类型」字段
    const imageFields = res.data.items.filter(field => field.type === 'Image');
    const fieldSelect = document.getElementById('fieldSelect');
    imageFields.forEach(field => {
      const option = document.createElement('option');
      option.value = field.id;
      option.textContent = field.name;
      fieldSelect.appendChild(option);
    });
  };
  await loadImageFields();

  // 3. 监听上传按钮点击
  document.getElementById('uploadBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const fieldId = document.getElementById('fieldSelect').value;
    const files = fileInput.files;
    if (!files.length) {
      alert('请选择至少一张图片');
      return;
    }

    const progressDom = document.getElementById('progress');
    const resultDom = document.getElementById('result');
    progressDom.textContent = '开始上传...';
    resultDom.textContent = '';

    // 4. 批量上传图片到飞书媒体服务器
    const mediaIds = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progressDom.textContent = `正在上传第 ${i+1}/${files.length} 张图片...`;
      // 调用飞书媒体上传API
      const uploadRes = await lark.api.request({
        url: '/open-apis/tenant/v1/media/upload',
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        data: {
          file: file,
          file_type: 'image',
          parent_type: 'bitable',
          parent_node: tableAppId
        }
      });
      mediaIds.push(uploadRes.data.media_id);
    }

    // 5. 将media_id写入多维表格指定字段（示例：写入选中的记录）
    if (record_ids?.length) {
      await lark.api.request({
        url: `/open-apis/bitable/v1/apps/${tableAppId}/tables/${table_id}/records/batch_update`,
        method: 'POST',
        data: {
          records: record_ids.map(recordId => ({
            record_id: recordId,
            fields: {
              [fieldId]: mediaIds.map(mediaId => ({ file_token: mediaId })) // 图片字段格式要求
            }
          }))
        }
      });
      progressDom.textContent = '';
      resultDom.textContent = `成功上传 ${files.length} 张图片，已写入字段！`;
    } else {
      resultDom.textContent = '未选中记录，请从记录/表格行触发插件';
    }
  });
});
