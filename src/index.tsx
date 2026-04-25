import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// 引入飞书SDK（关键：必须在入口引入，确保全局可用）
import 'https://sf3-cn.feishucdn.com/obj/ee-appcenter/static/js/sdk/lark.js';

// 确保DOM节点存在后挂载组件
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('未找到React根节点，请检查index.html中的#root元素');
}
