// src/ui/components/RadarChart.tsx

import React, { useRef, useEffect } from 'react';
import type { FiveElementVector } from '../../utils/algorithm';

interface RadarChartProps {
    data: FiveElementVector;
    size?: number; // 画布大小
}

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

        const numPoints = Object.keys(data).length;
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

        const maxVal = Math.max(...Object.values(data), 1); // 防止除以0，至少为1
        let firstPointX = 0, firstPointY = 0;

        Object.keys(data).forEach((key, index) => {
            const elementKey = key as keyof FiveElementVector;
            const value = data[elementKey];
            const normalizedValue = value / maxVal; // 归一化到 0-1
            const pointRadius = radius * normalizedValue;

            const angle = index * angleIncrement - Math.PI / 2;
            const x = centerX + pointRadius * Math.cos(angle);
            const y = centerY + pointRadius * Math.sin(angle);

            if (index === 0) {
                ctx.moveTo(x, y);
                firstPointX = x;
                firstPointY = y;
            } else {
                ctx.lineTo(x, y);
            }

            // 绘制元素名称标签
            ctx.fillStyle = FIVE_ELEMENT_COLORS[elementKey]; // 使用元素专属颜色
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 调整标签位置，使其不与线条重叠
            const labelDistance = radius + 15; // 标签距离中心更远
            const labelX = centerX + labelDistance * Math.cos(angle);
            const labelY = centerY + labelDistance * Math.sin(angle);
            ctx.fillText(FIVE_ELEMENT_NAMES[elementKey], labelX, labelY);
            
            // 可选：绘制数据点
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        if (numPoints > 0) {
            ctx.lineTo(firstPointX, firstPointY); // 闭合路径
        }
        ctx.closePath();
        ctx.fill(); // 填充区域
        ctx.stroke(); // 绘制边框

    }, [data, size]);

    return <canvas ref={canvasRef} width={size} height={size} style={{ display: 'block', margin: '0 auto' }} />;
};