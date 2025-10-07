// src/ui/components/RadarChart.tsx

import React, { useRef, useEffect } from 'react';
import type { FiveElementVector } from '../../utils/algorithm';

interface RadarChartProps {
    data: FiveElementVector;
    size?: number; // 画布大小
}

// 定义五行在雷达图上的固定顺序
const RADAR_ELEMENT_ORDER: (keyof FiveElementVector)[] = [
    'gold', // 顶部
    'wood', 
    'water', 
    'fire', 
    'earth',
];

const FIVE_ELEMENT_NAMES: { [key in keyof FiveElementVector]: string } = {
    gold: '金',
    wood: '木',
    water: '水',
    fire: '火',
    earth: '土',
};

const FIVE_ELEMENT_COLORS: { [key in keyof FiveElementVector]: string } = {
    wood: '#28a745', // 木-绿色
    fire: '#dc3545', // 火-红色
    earth: '#ffc107', // 土-黄色
    gold: '#6c757d', // 金-灰色
    water: '#007bff', // 水-蓝色
};


export const RadarChart: React.FC<RadarChartProps> = ({ data, size = 180 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 3; // 雷达图的最大半径

        // 清除画布
        ctx.clearRect(0, 0, size, size);

        // 绘制雷达背景网格
        ctx.strokeStyle = '#e9ecef'; // 浅灰色网格线
        ctx.lineWidth = 1;

        // 从 RADAR_ELEMENT_ORDER 获取元素数量和角度
        const numPoints = RADAR_ELEMENT_ORDER.length;
        const angleIncrement = (Math.PI * 2) / numPoints;

        // 绘制同心圆作为参考（简化为2-3个圆）
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * (i / 3), 0, Math.PI * 2);
            ctx.stroke();
        }

        // 绘制径向轴线
        for (let i = 0; i < numPoints; i++) {
            const angle = i * angleIncrement - Math.PI / 2; // -PI/2 使得第一个点在顶部
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        // 绘制数据
        ctx.beginPath();
        ctx.strokeStyle = '#007bff'; // 数据线蓝色
        ctx.fillStyle = 'rgba(0, 123, 255, 0.2)'; // 填充区域透明蓝色
        ctx.lineWidth = 2;

        // 确保 maxVal 只取有效数字的最大值
        const energyValues = RADAR_ELEMENT_ORDER.map(key => data[key]).filter(v => typeof v === 'number');
        const maxVal = Math.max(...energyValues, 1); 
        // 我们将所有点的位置预先计算出来
        const points: { x: number, y: number }[] = [];

        RADAR_ELEMENT_ORDER.forEach((elementKey, index) => {
            const value = data[elementKey];
            
            // 如果 value 不是有效数字，我们用 0 替代，确保路径不中断
            const safeValue = (typeof value === 'number' && !isNaN(value)) ? value : 0;

            const normalizedValue = safeValue / maxVal; // 归一化到 0-1
            const pointRadius = radius * normalizedValue;

            const angle = index * angleIncrement - Math.PI / 2;
            const x = centerX + pointRadius * Math.cos(angle);
            const y = centerY + pointRadius * Math.sin(angle);
            
            points.push({ x, y });

            // 绘制元素名称标签 (保持不变)
            ctx.fillStyle = FIVE_ELEMENT_COLORS[elementKey];
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const labelDistance = radius + 15;
            const labelX = centerX + labelDistance * Math.cos(angle);
            const labelY = centerY + labelDistance * Math.sin(angle);
            ctx.fillText(FIVE_ELEMENT_NAMES[elementKey], labelX, labelY);
        });

        // ----------------------------------------------------
        // 循环连线
        // ----------------------------------------------------
        if (points.length > 0) {
            // 1. 移动到第一个点
            ctx.moveTo(points[0].x, points[0].y);
            
            // 2. 连接剩余的点
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }

            // 3. 闭合路径
            ctx.lineTo(points[0].x, points[0].y); 
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // ----------------------------------------------------
        // 再次循环：绘制数据点（保持在最上层）
        // ----------------------------------------------------
        points.forEach(({ x, y }) => {
            ctx.fillStyle = ctx.strokeStyle; // 数据点的颜色与连线相同
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

    }, [data, size]);

    return <canvas ref={canvasRef} width={size} height={size} style={{ display: 'block', margin: '0 auto' }} />;
};