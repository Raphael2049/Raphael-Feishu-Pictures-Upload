import React, { useState, useEffect } from 'react';
import './App.css';

// 声明飞书SDK的全局类型（避免TS报错）
declare global {
  interface Window {
    lark: any;
  }
}

const App = () => {
  // 状态管理
  const [imageFields, setImageFields] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState('');
  // 多维表格上下文
  const [tableContext, setTableContext] = useState<{
    app_id: string;
    table_id: string;
    record_ids: string[];
  } | null>(null);

  // 1. 初始化飞书SDK + 获取表格上下文
  useEffect(() => {
    const initFeishuSDK = async () => {
      try {
        // 等待飞书SDK加载完成
        await window.lark.ready();
        // 获取当前多维表格上下文
        const context = await window.lark.context.get();
        const bitableCtx = context.bitable;
        if (!bitableCtx) {
          setResult('未在多维表格环境中启动插件！');
          return;
        }
        setTableContext({
          app_id: bitableCtx.app_id,
          table_id: bitableCtx.table_id,
          record_ids: bitableCtx.record_ids || [],
        });
        // 加载图片字段
        await loadImageFields(bitableCtx.app_id, bitableCtx.table_id);
      } catch (err) {
        setResult(`初始化失败：${(err as Error).message}`);
        console.error('初始化报错：', err);
      }
    };

    // 2. 加载表格的图片字段
    const loadImageFields = async (appId: string, tableId: string) => {
      try {
        const res = await window.lark.api.request({
          url: `/open-apis/bitable/v1/apps/${appId}/tables/${tableId}/fields`,
          method: 'GET',
        });
        const imageFields = res.data.items.filter((field: any) => field.type === 'Image');
        setImageFields(imageFields);
      } catch (err) {
        setResult(`加载字段失败：${(err as Error).message}`);
        console.error('加载字段报错：', err);
      }
    };

    initFeishuSDK();
  }, []);

  // 3. 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(e.target.files);
    }
  };

  // 4. 处理批量上传
  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setResult('请选择至少一张图片！');
      return;
    }
    if (!tableContext) {
      setResult('未获取到表格上下文！');
      return;
    }
    const selectedFieldId = (document.getElementById('fieldSelect') as HTMLSelectElement)?.value;
    if (!selectedFieldId) {
      setResult('请选择目标图片字段！');
      return;
    }

    setProgress('开始上传图片...');
    setResult('');
    const mediaIds: string[] = [];

    try {
      // 批量上传图片到飞书媒体服务器
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setProgress(`正在上传第 ${i + 1}/${selectedFiles.length} 张图片...`);
        const uploadRes = await window.lark.api.request({
          url: '/open-apis/tenant/v1/media/upload',
          method: 'POST',
          headers: { 'Content-Type': 'multipart/form-data' },
          data: {
            file: file,
            file_type: 'image',
            parent_type: 'bitable',
            parent_node: tableContext.app_id,
          },
        });
        mediaIds.push(uploadRes.data.media_id);
      }

      // 写入多维表格
      if (tableContext.record_ids.length > 0) {
        await window.lark.api.request({
          url: `/open-apis/bitable/v1/apps/${tableContext.app_id}/tables/${tableContext.table_id}/records/batch_update`,
          method: 'POST',
          data: {
            records: tableContext.record_ids.map((recordId) => ({
              record_id: recordId,
              fields: {
                [selectedFieldId]: mediaIds.map((mediaId) => ({ file_token: mediaId })),
              },
            })),
          },
        });
        setProgress('');
        setResult(`成功上传 ${selectedFiles.length} 张图片，已写入指定字段！`);
      } else {
        setProgress('');
        setResult('未选中任何表格记录，请从记录行/表格工具栏启动插件！');
      }
    } catch (err) {
      setProgress('');
      setResult(`上传失败：${(err as Error).message}`);
      console.error('上传报错：', err);
    }
  };

  return (
    <div className="container" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h3>批量上传图片至多维表格</h3>
      {/* 选择图片 */}
      <div style={{ margin: '15px 0' }}>
        <label>选择图片：</label>
        <input type="file" multiple accept="image/*" onChange={handleFileChange} />
      </div>
      {/* 选择目标字段 */}
      <div style={{ margin: '15px 0' }}>
        <label>目标图片字段：</label>
        <select id="fieldSelect" style={{ padding: '4px' }}>
          {imageFields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.name}
            </option>
          ))}
        </select>
      </div>
      {/* 上传按钮 */}
      <button
        onClick={handleUpload}
        style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        开始上传
      </button>
      {/* 进度/结果提示 */}
      <div style={{ marginTop: '15px', color: '#666' }}>{progress}</div>
      <div style={{ marginTop: '10px', color: progress ? '#333' : result.includes('失败') ? '#dc3545' : '#28a745' }}>
        {result}
      </div>
    </div>
  );
};

export default App;
