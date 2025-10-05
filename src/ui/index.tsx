// src/ui/index.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Popup } from './Popup'; // 导入你的 Popup 组件
import './index.scss';

// 找到 popup.html 中的挂载点
const rootElement = document.getElementById('root');

if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <Popup />
        </React.StrictMode>,
    );
} else {
    console.error("Root element not found in popup.html");
}