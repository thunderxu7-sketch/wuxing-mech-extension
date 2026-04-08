import React, { useState, useEffect, useCallback } from 'react';
import * as chromeStorage from '../api/chromeStorage';
import type {
    UserSignatureInput,
    UserSignature,
    FortuneResult,
    FiveElementVector,
    PhysicalAnchorRecommendation,
    TalismanRecommendation
} from '../utils/algorithm';
import {
    calculateUserSignature,
    calculateDailyCosmos,
    calculateFortune,
    getPhysicalAnchorRecommendation,
    getDailyTalisman
} from '../utils/algorithm';
import {
    setStoredSignature,
    getDailyCache,
    setDailyCache
} from '../api/chromeStorage';
import { RadarChart } from './components/RadarChart';
import { generateShareImage } from './utils/generateShareImage';

// --- 符图资源 ---
import zhaocaiImg from '../assets/images/zhaocai.jpg';
import haoyunImg from '../assets/images/haoyun.jpg';
import yinyuanImg from '../assets/images/yinyuan.jpg';
import shiyeImg from '../assets/images/shiye.jpg';
import pinganImg from '../assets/images/pingan.jpg';
import zhihuiImg from '../assets/images/zhihui.jpg';
import yongqiImg from '../assets/images/yongqi.jpg';
import fuguiImg from '../assets/images/fugui.jpg';

const TALISMAN_IMAGES: Record<string, string> = {
    zhaocai: zhaocaiImg,
    haoyun: haoyunImg,
    yinyuan: yinyuanImg,
    shiye: shiyeImg,
    pingan: pinganImg,
    zhihui: zhihuiImg,
    yongqi: yongqiImg,
    fugui: fuguiImg,
};

// --- 常量 ---

const INITIAL_INPUT: UserSignatureInput = {
    year: 1990, month: 1, day: 1, hour: 12,
};

const SHICHEN_OPTIONS = [
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
];

const FIVE_ELEMENT_NAMES: Record<keyof FiveElementVector, string> = {
    gold: '金', wood: '木', water: '水', fire: '火', earth: '土',
};

/** 将 0-23 小时映射到时辰选择器的偶数值 */
function hourToShichen(hour: number): number {
    if (hour === 23) return 0;
    return Math.floor(hour / 2) * 2;
}

// ----------------------------------------------------
// 出生时间表单
// ----------------------------------------------------

const BirthInputForm: React.FC<{
    onSubmit: (input: UserSignatureInput) => void;
    currentInput: UserSignatureInput;
    isLoading: boolean;
}> = ({ onSubmit, currentInput, isLoading }) => {
    const [input, setInput] = useState({
        year: currentInput.year.toString(),
        month: currentInput.month.toString(),
        day: currentInput.day.toString(),
        hour: hourToShichen(currentInput.hour),
    });

    useEffect(() => {
        setInput({
            year: currentInput.year.toString(),
            month: currentInput.month.toString(),
            day: currentInput.day.toString(),
            hour: hourToShichen(currentInput.hour),
        });
    }, [currentInput]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const year = parseInt(input.year, 10);
        const month = parseInt(input.month, 10);
        const day = parseInt(input.day, 10);
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
            alert('请输入完整的出生时间！');
            return;
        }
        onSubmit({ year, month, day, hour: input.hour });
    };

    return (
        <form onSubmit={handleSubmit} className="birth-form">
            <div className="input-grid-3col">
                <div className="input-field">
                    <label>年</label>
                    <input name="year" type="number" value={input.year} onChange={handleChange} min="1900" max="2100" required />
                </div>
                <div className="input-field">
                    <label>月</label>
                    <input name="month" type="number" value={input.month} onChange={handleChange} min="1" max="12" required />
                </div>
                <div className="input-field">
                    <label>日</label>
                    <input name="day" type="number" value={input.day} onChange={handleChange} min="1" max="31" required />
                </div>
            </div>
            <div className="shichen-field">
                <label>出生时辰</label>
                <select
                    value={input.hour}
                    onChange={(e) => setInput(prev => ({ ...prev, hour: parseInt(e.target.value, 10) }))}
                >
                    {SHICHEN_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <button type="submit" disabled={isLoading}>
                {isLoading ? '校准中...' : '获取专属灵符'}
            </button>
        </form>
    );
};

// ----------------------------------------------------
// 主组件
// ----------------------------------------------------

export const Popup: React.FC = () => {
    const [userSignature, setUserSignature] = useState<UserSignature | null>(null);
    const [userSignatureInput, setUserSignatureInput] = useState<UserSignatureInput | null>(null);
    const [fortuneResult, setFortuneResult] = useState<FortuneResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [talisman, setTalisman] = useState<TalismanRecommendation | null>(null);
    const [physicalRecommendation, setPhysicalRecommendation] = useState<PhysicalAnchorRecommendation | null>(null);
    const [detailExpanded, setDetailExpanded] = useState(false);
    const [showCeremony, setShowCeremony] = useState(false);

    /** 统一应用运势结果（修复缓存加载时推荐项为空的问题） */
    const applyFortuneResult = useCallback((result: FortuneResult) => {
        setFortuneResult(result);
        setTalisman(getDailyTalisman(result));
        setPhysicalRecommendation(getPhysicalAnchorRecommendation(result));
    }, []);

    /** 计算或从缓存加载今日运势 */
    const calculateAndSetFortune = useCallback(async (signature: UserSignature) => {
        const cachedResult = await getDailyCache();
        if (cachedResult) {
            applyFortuneResult(cachedResult.data);
            return;
        }

        const today = new Date();
        const V_Day = calculateDailyCosmos(today);
        const result = calculateFortune(signature, V_Day);
        await setDailyCache(result);
        applyFortuneResult(result);
    }, [applyFortuneResult]);

    // 初始加载
    useEffect(() => {
        async function loadData() {
            // 非扩展环境 (本地开发) 使用模拟数据
            if (typeof chrome === 'undefined' || !chrome.storage) {
                const mockSignature: UserSignature = { gold: 120, wood: 140, water: 80, fire: 150, earth: 100 };
                setUserSignature(mockSignature);
                await calculateAndSetFortune(mockSignature);
                setIsLoading(false);
                return;
            }

            const storedInput = await chromeStorage.getUserSignatureInput();
            if (storedInput) {
                setUserSignatureInput(storedInput);
                const signature = calculateUserSignature(storedInput);
                setUserSignature(signature);
                await calculateAndSetFortune(signature);
            }
            setIsLoading(false);
        }
        loadData();
    }, [calculateAndSetFortune]);

    /** 用户提交出生时间 */
    const handleInputSubmit = useCallback(async (input: UserSignatureInput) => {
        setShowCeremony(true);
        await chromeStorage.setUserSignatureInput(input);
        setUserSignatureInput(input);

        const signature = calculateUserSignature(input);
        await setStoredSignature(signature);
        setUserSignature(signature);

        // 仪式感延迟 + 计算
        await Promise.all([
            calculateAndSetFortune(signature),
            new Promise(r => setTimeout(r, 2000)),
        ]);
        setShowCeremony(false);
    }, [calculateAndSetFortune]);

    // --- 渲染 ---

    // 校准仪式动画
    if (showCeremony) {
        return (
            <div className="ceremony-screen">
                <div className="ceremony-ring">
                    {['金', '木', '水', '火', '土'].map((el, i) => (
                        <span key={el} className="ceremony-el" style={{ animationDelay: `${i * 0.15}s` }}>{el}</span>
                    ))}
                </div>
                <p className="ceremony-text">正在校准五行能量...</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="loading-screen">
                <p>加载中...</p>
            </div>
        );
    }

    // 首次使用 — 欢迎页
    if (!userSignature) {
        return (
            <div className="welcome-screen">
                <img src={haoyunImg} alt="好运符" className="welcome-talisman" />
                <h2>五行校准</h2>
                <p className="welcome-desc">输入出生时间，获取你的每日专属灵符</p>
                <BirthInputForm
                    onSubmit={handleInputSubmit}
                    currentInput={userSignatureInput || INITIAL_INPUT}
                    isLoading={isLoading}
                />
            </div>
        );
    }

    const scoreClass = fortuneResult
        ? (fortuneResult.score >= 70 ? 'score-good' : (fortuneResult.score >= 50 ? 'score-medium' : 'score-bad'))
        : '';

    // 主体验
    return (
        <div>
            <h2 className="app-title">五行校准</h2>

            {/* ====== 首屏：每日灵符 ====== */}
            {talisman && (
                <div className="talisman-hero">
                    <div className="talisman-image-wrap">
                        <img
                            src={TALISMAN_IMAGES[talisman.id]}
                            alt={talisman.name}
                            className="talisman-image"
                        />
                        {fortuneResult && (
                            <div className="talisman-score-badge">
                                <span className={scoreClass}>{fortuneResult.score}</span>
                                <span className="score-unit">分</span>
                            </div>
                        )}
                    </div>
                    <h3 className="talisman-name">{talisman.name}</h3>
                    <p className="talisman-blessing">{talisman.blessing}</p>
                    <p className="talisman-subtitle">{talisman.subtitle}</p>
                </div>
            )}

            {/* ====== 灵性指引 ====== */}
            {physicalRecommendation && (
                <div className="guidance-card">
                    <span className="guidance-label">今日灵性指引</span>
                    <p className="guidance-text">"{physicalRecommendation.tarotAdvice}"</p>
                </div>
            )}

            {/* ====== 折叠：详细分析 ====== */}
            {fortuneResult && (
                <div className="detail-section">
                    <button
                        className="detail-toggle"
                        onClick={() => setDetailExpanded(!detailExpanded)}
                    >
                        {detailExpanded ? '收起详细分析 ▲' : '查看详细五行分析 ▼'}
                    </button>

                    {detailExpanded && (
                        <div className="detail-content">
                            <div className="detail-card">
                                <h4>本命五行签名</h4>
                                <div className="signature-card">
                                    {Object.entries(userSignature).map(([element, value]) => (
                                        <div key={element} className="signature-item">
                                            <div className={`signature-item--label ${element}`}>
                                                {FIVE_ELEMENT_NAMES[element as keyof FiveElementVector]}
                                            </div>
                                            <div className="signature-item--value">{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="detail-card">
                                <h4>今日能量分布</h4>
                                <p className="text-secondary detail-meta">
                                    综合评分 <strong className={scoreClass}>{fortuneResult.score}</strong>/100
                                    &nbsp;&middot;&nbsp;
                                    最强元素：<strong>{FIVE_ELEMENT_NAMES[fortuneResult.imbalanceElement]}</strong>
                                </p>
                                <RadarChart data={fortuneResult.energyDifference} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ====== 推荐好物 ====== */}
            {physicalRecommendation && (
                <div className="products-section">
                    <h4 className="section-title">推荐好物</h4>
                    <div className="product-grid">
                        <a href={physicalRecommendation.crystal.buyLink} target="_blank" rel="noopener noreferrer" className="product-card">
                            <span className="product-icon">💎</span>
                            <span className="product-label">能量水晶</span>
                            <span className="product-name">{physicalRecommendation.crystal.name}</span>
                        </a>
                        <a href={physicalRecommendation.lifestyle.buyLink} target="_blank" rel="noopener noreferrer" className="product-card">
                            <span className="product-icon">🏠</span>
                            <span className="product-label">空间净化</span>
                            <span className="product-name">{physicalRecommendation.lifestyle.name}</span>
                        </a>
                    </div>
                </div>
            )}

            {/* ====== 保存分享 ====== */}
            {talisman && fortuneResult && physicalRecommendation && (
                <button
                    className="share-btn"
                    onClick={() => generateShareImage({
                        talisman,
                        score: fortuneResult.score,
                        tarotAdvice: physicalRecommendation.tarotAdvice,
                        talismanImageSrc: TALISMAN_IMAGES[talisman.id],
                    })}
                >
                    保存今日灵符卡片
                </button>
            )}

            {/* ====== 重新校准 (折叠) ====== */}
            <details className="recalibrate-section">
                <summary>重新校准本命五行</summary>
                <div className="recalibrate-body">
                    <BirthInputForm
                        onSubmit={handleInputSubmit}
                        currentInput={userSignatureInput || INITIAL_INPUT}
                        isLoading={isLoading}
                    />
                </div>
            </details>

            {/* ====== 底部声明 ====== */}
            <footer className="disclaimer">
                本工具仅供娱乐与参考。
            </footer>
        </div>
    );
};
