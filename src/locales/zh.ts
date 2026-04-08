import type { LocaleMessages } from './types';

export const zh: LocaleMessages = {
    app: {
        title: '五行校准',
        loading: '加载中...',
        disclaimer: '本工具仅供娱乐与参考。',
    },
    welcome: {
        desc: '输入出生时间，获取你的每日专属灵符',
    },
    form: {
        year: '年',
        month: '月',
        day: '日',
        shichenLabel: '出生时辰',
        submit: '获取专属灵符',
        calculating: '校准中...',
        validationError: '请输入完整的出生时间！',
        shichenOptions: [
            { label: '子时 (23:00-01:00)', value: 0 },
            { label: '丑时 (01:00-03:00)', value: 2 },
            { label: '寅时 (03:00-05:00)', value: 4 },
            { label: '卯时 (05:00-07:00)', value: 6 },
            { label: '辰时 (07:00-09:00)', value: 8 },
            { label: '巳时 (09:00-11:00)', value: 10 },
            { label: '午时 (11:00-13:00)', value: 12 },
            { label: '未时 (13:00-15:00)', value: 14 },
            { label: '申时 (15:00-17:00)', value: 16 },
            { label: '酉时 (17:00-19:00)', value: 18 },
            { label: '戌时 (19:00-21:00)', value: 20 },
            { label: '亥时 (21:00-23:00)', value: 22 },
        ],
    },
    ceremony: {
        text: '正在校准五行能量...',
        elements: ['金', '木', '水', '火', '土'],
    },
    elements: {
        gold: '金',
        wood: '木',
        water: '水',
        fire: '火',
        earth: '土',
    },
    talisman: {
        guidanceLabel: '今日灵性指引',
        detailExpand: '查看详细五行分析 ▼',
        detailCollapse: '收起详细分析 ▲',
        signatureTitle: '本命五行签名',
        signatureDesc: '根据您的出生时间计算的五行能量基准',
        energyTitle: '今日能量分布',
        scoreLabel: '综合评分',
        strongestLabel: '最强元素',
        scoreUnit: '分',
    },
    products: {
        title: '推荐好物',
        refresh: '换一批',
    },
    share: {
        saveBtn: '保存今日灵符卡片',
        brandLine: '五行校准 · 每日灵符',
    },
    recalibrate: '重新校准本命五行',
};
