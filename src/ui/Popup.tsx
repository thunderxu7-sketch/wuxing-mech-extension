import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as chromeStorage from '../api/chromeStorage';
import type { ShareConfig } from '../api/chromeStorage';
import type {
    UserSignatureInput,
    UserSignature,
    FortuneResult,
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
    setDailyCache,
    getShareConfig,
} from '../api/chromeStorage';
import {
    formatCalendarDateInput,
    hourToShichen,
    parseCalendarDateInput,
} from '../utils/time';
import { RadarChart } from './components/RadarChart';
import { generateShareImage } from './utils/generateShareImage';
import { buildShareCaption, copyTextToClipboard, getDisplayShareUrl } from './utils/shareContent';
import {
    getAnalyticsConfig,
    getAnalyticsOriginPattern,
    getAnalyticsPermissionStatus,
    getStats,
    retryQueuedAnalyticsEvents,
    requestAnalyticsEndpointPermission,
    setAnalyticsConfig,
    trackDAU,
    trackEvent,
    verifyAnalyticsCollector,
} from '../api/analytics';
import type { Locale, LocaleMessages } from '../locales/types';
import { getMessages } from '../locales';

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

const INITIAL_INPUT: UserSignatureInput = {
    year: 1990, month: 1, day: 1, hour: 12,
};

// ----------------------------------------------------
// 出生时间表单
// ----------------------------------------------------

const BirthInputForm: React.FC<{
    onSubmit: (input: UserSignatureInput) => void;
    currentInput: UserSignatureInput;
    isLoading: boolean;
    m: LocaleMessages;
}> = ({ onSubmit, currentInput, isLoading, m }) => {
    const [input, setInput] = useState({
        date: formatCalendarDateInput(currentInput),
        hour: hourToShichen(currentInput.hour),
    });

    useEffect(() => {
        setInput({
            date: formatCalendarDateInput(currentInput),
            hour: hourToShichen(currentInput.hour),
        });
    }, [currentInput]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!input.date) {
            alert(m.form.validationError);
            return;
        }

        const parsedDate = parseCalendarDateInput(input.date);

        if (!parsedDate) {
            alert(m.form.invalidDateError);
            return;
        }

        onSubmit({
            ...parsedDate,
            hour: input.hour,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="birth-form">
            <div className="input-field">
                <label htmlFor="birth-date">{m.form.dateLabel}</label>
                <input
                    id="birth-date"
                    type="date"
                    value={input.date}
                    onChange={(e) => setInput(prev => ({ ...prev, date: e.target.value }))}
                    min="1900-01-01"
                    max="2100-12-31"
                    required
                />
            </div>
            <div className="shichen-field">
                <label>{m.form.shichenLabel}</label>
                <select
                    value={input.hour}
                    onChange={(e) => setInput(prev => ({ ...prev, hour: parseInt(e.target.value, 10) }))}
                >
                    {m.form.shichenOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <button type="submit" disabled={isLoading}>
                {isLoading ? m.form.calculating : m.form.submit}
            </button>
        </form>
    );
};

// ----------------------------------------------------
// 主组件
// ----------------------------------------------------

export const Popup: React.FC = () => {
    const [locale, setLocaleState] = useState<Locale>('zh');
    const [m, setM] = useState<LocaleMessages>(getMessages('zh'));
    const [userSignature, setUserSignature] = useState<UserSignature | null>(null);
    const [userSignatureInput, setUserSignatureInput] = useState<UserSignatureInput | null>(null);
    const [fortuneResult, setFortuneResult] = useState<FortuneResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [talisman, setTalisman] = useState<TalismanRecommendation | null>(null);
    const [physicalRecommendation, setPhysicalRecommendation] = useState<PhysicalAnchorRecommendation | null>(null);
    const [detailExpanded, setDetailExpanded] = useState(false);
    const [showCeremony, setShowCeremony] = useState(false);
    const [shareConfig, setShareConfigState] = useState<ShareConfig | null>(null);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const [analyticsPermissionNeeded, setAnalyticsPermissionNeeded] = useState(false);
    const [analyticsPermissionGranted, setAnalyticsPermissionGranted] = useState(false);
    const [analyticsDraft, setAnalyticsDraft] = useState({
        enabled: false,
        site: 'wuxing-mech-extension',
        endpoint: '',
    });
    const [analyticsQueueCount, setAnalyticsQueueCount] = useState(0);
    const [analyticsFeedback, setAnalyticsFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
    const [analyticsBusy, setAnalyticsBusy] = useState(false);
    const hasTrackedOnboardingView = useRef(false);
    const copyFeedbackTimerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (copyFeedbackTimerRef.current !== null) {
                window.clearTimeout(copyFeedbackTimerRef.current);
            }
        };
    }, []);

    /** 切换语言 */
    const switchLocale = useCallback(async (newLocale: Locale) => {
        void trackEvent('locale_switch', { locale: newLocale });
        setLocaleState(newLocale);
        setM(getMessages(newLocale));
        await chromeStorage.setLocale(newLocale);

        // 重新生成语言相关的推荐内容
        if (fortuneResult) {
            setTalisman(getDailyTalisman(fortuneResult, newLocale));
            setPhysicalRecommendation(getPhysicalAnchorRecommendation(fortuneResult, newLocale));
        }
    }, [fortuneResult]);

    /** 刷新推荐商品（从池中重新随机） */
    const refreshProducts = useCallback(() => {
        if (fortuneResult) {
            void trackEvent('product_refresh', {
                locale,
                imbalance_element: fortuneResult.imbalanceElement,
            });
            setPhysicalRecommendation(getPhysicalAnchorRecommendation(fortuneResult, locale));
        }
    }, [fortuneResult, locale]);

    /** 统一应用运势结果 */
    const applyFortuneResult = useCallback((
        result: FortuneResult,
        loc: Locale,
        source: 'cache' | 'fresh',
    ) => {
        setFortuneResult(result);
        const nextTalisman = getDailyTalisman(result, loc);
        setTalisman(nextTalisman);
        setPhysicalRecommendation(getPhysicalAnchorRecommendation(result, loc));
        void trackEvent('fortune_generated', {
            locale: loc,
            score: result.score,
            imbalance_element: result.imbalanceElement,
            talisman_id: nextTalisman.id,
            source,
        });
    }, []);

    /** 计算或从缓存加载今日运势 */
    const calculateAndSetFortune = useCallback(async (signature: UserSignature, loc: Locale) => {
        const cachedResult = await getDailyCache(signature);
        if (cachedResult) {
            applyFortuneResult(cachedResult.data, loc, 'cache');
            return;
        }

        const today = new Date();
        const V_Day = calculateDailyCosmos(today);
        const result = calculateFortune(signature, V_Day);
        await setDailyCache(signature, result);
        applyFortuneResult(result, loc, 'fresh');
    }, [applyFortuneResult]);

    const refreshAnalyticsState = useCallback(async (syncDraft = false) => {
        const [config, permissionStatus, stats] = await Promise.all([
            getAnalyticsConfig(),
            getAnalyticsPermissionStatus(),
            getStats(),
        ]);

        if (syncDraft) {
            setAnalyticsDraft(config);
        }

        setAnalyticsPermissionNeeded(
            permissionStatus.enabled &&
            permissionStatus.configured &&
            !permissionStatus.granted,
        );
        setAnalyticsPermissionGranted(permissionStatus.enabled && permissionStatus.granted);
        setAnalyticsQueueCount(stats.pendingEvents);
    }, []);

    const persistAnalyticsConfig = useCallback(async () => {
        const trimmedEndpoint = analyticsDraft.endpoint.trim();

        if (trimmedEndpoint && !getAnalyticsOriginPattern(trimmedEndpoint)) {
            setAnalyticsFeedback({ tone: 'error', message: m.launch.invalidEndpointError });
            return null;
        }

        if (analyticsDraft.enabled && !trimmedEndpoint) {
            setAnalyticsFeedback({ tone: 'error', message: m.launch.invalidEndpointError });
            return null;
        }

        const savedConfig = await setAnalyticsConfig({
            ...analyticsDraft,
            endpoint: trimmedEndpoint,
        });

        setAnalyticsDraft(savedConfig);
        await refreshAnalyticsState();
        return savedConfig;
    }, [analyticsDraft, m.launch.invalidEndpointError, refreshAnalyticsState]);

    const handleSaveAnalyticsConfig = useCallback(async () => {
        setAnalyticsBusy(true);

        try {
            const savedConfig = await persistAnalyticsConfig();
            if (!savedConfig) {
                return;
            }

            setAnalyticsFeedback({ tone: 'success', message: m.launch.saveSuccess });
        } finally {
            setAnalyticsBusy(false);
        }
    }, [m.launch.saveSuccess, persistAnalyticsConfig]);

    const handleGrantAnalyticsPermission = useCallback(async () => {
        setAnalyticsBusy(true);

        try {
            const savedConfig = await persistAnalyticsConfig();
            if (!savedConfig) {
                return;
            }

            if (!savedConfig.endpoint) {
                setAnalyticsFeedback({ tone: 'error', message: m.launch.invalidEndpointError });
                return;
            }

            const granted = await requestAnalyticsEndpointPermission(savedConfig.endpoint);
            await refreshAnalyticsState();
            setAnalyticsFeedback({
                tone: granted ? 'success' : 'error',
                message: granted ? m.launch.analyticsPermissionGranted : m.launch.verifyPermissionError,
            });
        } finally {
            setAnalyticsBusy(false);
        }
    }, [
        m.launch.analyticsPermissionGranted,
        m.launch.invalidEndpointError,
        m.launch.verifyPermissionError,
        persistAnalyticsConfig,
        refreshAnalyticsState,
    ]);

    const handleVerifyAnalyticsCollector = useCallback(async () => {
        setAnalyticsBusy(true);

        try {
            const savedConfig = await persistAnalyticsConfig();
            if (!savedConfig) {
                return;
            }

            const result = await verifyAnalyticsCollector();
            await refreshAnalyticsState();

            if (result.status === 'delivered') {
                setAnalyticsFeedback({ tone: 'success', message: m.launch.verifySuccess });
                return;
            }

            if (result.status === 'missing_permission') {
                setAnalyticsFeedback({ tone: 'error', message: m.launch.verifyPermissionError });
                return;
            }

            if (result.status === 'disabled') {
                setAnalyticsFeedback({ tone: 'error', message: m.launch.verifyDisabledError });
                return;
            }

            if (result.status === 'missing_endpoint' || result.status === 'invalid_endpoint') {
                setAnalyticsFeedback({ tone: 'error', message: m.launch.verifyEndpointError });
                return;
            }

            setAnalyticsFeedback({ tone: 'error', message: m.launch.verifyNetworkError });
        } finally {
            setAnalyticsBusy(false);
        }
    }, [
        m.launch.verifyDisabledError,
        m.launch.verifyEndpointError,
        m.launch.verifyNetworkError,
        m.launch.verifyPermissionError,
        m.launch.verifySuccess,
        persistAnalyticsConfig,
        refreshAnalyticsState,
    ]);

    const handleRetryQueuedAnalytics = useCallback(async () => {
        setAnalyticsBusy(true);

        try {
            const savedConfig = await persistAnalyticsConfig();
            if (!savedConfig) {
                return;
            }

            const result = await retryQueuedAnalyticsEvents();
            await refreshAnalyticsState();

            if (result.status === 'flushed' || result.status === 'empty') {
                setAnalyticsFeedback({ tone: 'success', message: m.launch.retrySuccess });
                return;
            }

            if (result.status === 'missing_permission') {
                setAnalyticsFeedback({ tone: 'error', message: m.launch.verifyPermissionError });
                return;
            }

            if (result.status === 'disabled') {
                setAnalyticsFeedback({ tone: 'error', message: m.launch.verifyDisabledError });
                return;
            }

            if (result.status === 'missing_endpoint' || result.status === 'invalid_endpoint') {
                setAnalyticsFeedback({ tone: 'error', message: m.launch.verifyEndpointError });
                return;
            }

            setAnalyticsFeedback({
                tone: 'error',
                message: result.status === 'partial' ? m.launch.retryPartial : m.launch.verifyNetworkError,
            });
        } finally {
            setAnalyticsBusy(false);
        }
    }, [
        m.launch.retryPartial,
        m.launch.retrySuccess,
        m.launch.verifyDisabledError,
        m.launch.verifyEndpointError,
        m.launch.verifyNetworkError,
        m.launch.verifyPermissionError,
        persistAnalyticsConfig,
        refreshAnalyticsState,
    ]);

    // 初始加载
    useEffect(() => {
        async function loadData() {
            // 加载语言偏好
            const [savedLocale, savedShareConfig, savedAnalyticsConfig] = await Promise.all([
                chromeStorage.getLocale(),
                getShareConfig(),
                getAnalyticsConfig(),
            ]);
            setLocaleState(savedLocale);
            setM(getMessages(savedLocale));
            setShareConfigState(savedShareConfig);
            setAnalyticsDraft(savedAnalyticsConfig);
            await trackDAU({ locale: savedLocale });
            await refreshAnalyticsState();

            // 非扩展环境 (本地开发) 使用模拟数据
            if (typeof chrome === 'undefined' || !chrome.storage) {
                const mockSignature: UserSignature = { gold: 120, wood: 140, water: 80, fire: 150, earth: 100 };
                setUserSignature(mockSignature);
                await calculateAndSetFortune(mockSignature, savedLocale);
                setIsLoading(false);
                return;
            }

            const storedInput = await chromeStorage.getUserSignatureInput();
            if (storedInput) {
                setUserSignatureInput(storedInput);
                const signature = calculateUserSignature(storedInput);
                setUserSignature(signature);
                await calculateAndSetFortune(signature, savedLocale);
            }
            setIsLoading(false);
        }
        loadData();
    }, [calculateAndSetFortune, refreshAnalyticsState]);

    useEffect(() => {
        if (!isLoading && !userSignature && !hasTrackedOnboardingView.current) {
            hasTrackedOnboardingView.current = true;
            void trackEvent('onboarding_view', { locale });
        }
    }, [isLoading, locale, userSignature]);

    /** 用户提交出生时间 */
    const handleInputSubmit = useCallback(async (input: UserSignatureInput) => {
        setShowCeremony(true);
        void trackEvent('birth_submit', { locale });
        await chromeStorage.setUserSignatureInput(input);
        setUserSignatureInput(input);

        const signature = calculateUserSignature(input);
        await setStoredSignature(signature);
        setUserSignature(signature);

        await Promise.all([
            calculateAndSetFortune(signature, locale),
            new Promise(r => setTimeout(r, 2000)),
        ]);
        setShowCeremony(false);
    }, [calculateAndSetFortune, locale]);

    const handleCopyCaption = useCallback(async () => {
        if (!talisman || !fortuneResult || !shareConfig) {
            return;
        }

        const caption = buildShareCaption({
            locale,
            talismanName: talisman.name,
            subtitle: talisman.subtitle,
            score: fortuneResult.score,
            shareUrl: shareConfig.shareUrl,
            shortUrl: shareConfig.shortUrl,
        });

        try {
            await copyTextToClipboard(caption);
            await trackEvent('share_copy', {
                locale,
                score: fortuneResult.score,
                talisman_id: talisman.id,
                share_url: shareConfig.shortUrl,
            });
            setCopyFeedback(m.share.copySuccess);
        } catch {
            setCopyFeedback(m.share.copyError);
        }

        if (copyFeedbackTimerRef.current !== null) {
            window.clearTimeout(copyFeedbackTimerRef.current);
        }
        copyFeedbackTimerRef.current = window.setTimeout(() => {
            setCopyFeedback(null);
        }, 2200);
    }, [fortuneResult, locale, m.share.copyError, m.share.copySuccess, shareConfig, talisman]);

    // --- 渲染 ---

    // 语言切换按钮
    const LangToggle = (
        <button
            className="lang-toggle"
            onClick={() => switchLocale(locale === 'zh' ? 'en' : 'zh')}
        >
            {locale === 'zh' ? 'EN' : '中'}
        </button>
    );

    const analyticsOrigin = getAnalyticsOriginPattern(analyticsDraft.endpoint);
    const AnalyticsSettings = (
        <details className="launch-settings">
            <summary>{m.launch.settingsSummary}</summary>
            <div className="launch-settings-body">
                <div className="launch-card">
                    <h4>{m.launch.settingsTitle}</h4>
                    <p>{m.launch.settingsDesc}</p>

                    <label className="launch-toggle">
                        <input
                            type="checkbox"
                            checked={analyticsDraft.enabled}
                            onChange={(e) => setAnalyticsDraft(prev => ({ ...prev, enabled: e.target.checked }))}
                        />
                        <span>{m.launch.enabledLabel}</span>
                    </label>

                    <div className="launch-form">
                        <label className="launch-field">
                            <span>{m.launch.siteLabel}</span>
                            <input
                                type="text"
                                value={analyticsDraft.site}
                                onChange={(e) => setAnalyticsDraft(prev => ({ ...prev, site: e.target.value }))}
                                placeholder="wuxing-extension"
                            />
                        </label>
                        <label className="launch-field">
                            <span>{m.launch.endpointLabel}</span>
                            <input
                                type="url"
                                value={analyticsDraft.endpoint}
                                onChange={(e) => setAnalyticsDraft(prev => ({ ...prev, endpoint: e.target.value }))}
                                placeholder="https://collector.example.com/events"
                            />
                        </label>
                    </div>

                    <div className="launch-status-grid">
                        <div className="launch-status-item">
                            <span>{m.launch.originLabel}</span>
                            <strong>{analyticsOrigin || m.launch.statusNotConfigured}</strong>
                        </div>
                        <div className="launch-status-item">
                            <span>{m.launch.permissionLabel}</span>
                            <strong>{analyticsPermissionGranted ? m.launch.analyticsPermissionGranted : m.launch.permissionMissing}</strong>
                        </div>
                        <div className="launch-status-item">
                            <span>{m.launch.queueLabel}</span>
                            <strong>{analyticsQueueCount === 0 ? m.launch.queueEmpty : String(analyticsQueueCount)}</strong>
                        </div>
                    </div>

                    {analyticsFeedback && (
                        <p className={`launch-feedback launch-feedback--${analyticsFeedback.tone}`}>
                            {analyticsFeedback.message}
                        </p>
                    )}

                    <div className="launch-actions">
                        <button type="button" className="launch-btn" onClick={() => void handleSaveAnalyticsConfig()} disabled={analyticsBusy}>
                            {m.launch.saveBtn}
                        </button>
                        <button type="button" className="launch-btn" onClick={() => void handleGrantAnalyticsPermission()} disabled={analyticsBusy}>
                            {m.launch.analyticsPermissionBtn}
                        </button>
                        <button type="button" className="launch-btn" onClick={() => void handleVerifyAnalyticsCollector()} disabled={analyticsBusy}>
                            {m.launch.verifyBtn}
                        </button>
                        <button type="button" className="launch-btn" onClick={() => void handleRetryQueuedAnalytics()} disabled={analyticsBusy}>
                            {m.launch.retryQueueBtn}
                        </button>
                    </div>
                </div>
            </div>
        </details>
    );

    // 校准仪式动画
    if (showCeremony) {
        return (
            <div className="ceremony-screen">
                <div className="ceremony-ring">
                    {m.ceremony.elements.map((el, i) => (
                        <span key={el} className="ceremony-el" style={{ animationDelay: `${i * 0.15}s` }}>{el}</span>
                    ))}
                </div>
                <p className="ceremony-text">{m.ceremony.text}</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="loading-screen">
                <p>{m.app.loading}</p>
            </div>
        );
    }

    // 首次使用 — 欢迎页
    if (!userSignature) {
        return (
            <div className="welcome-screen">
                {LangToggle}
                <img src={haoyunImg} alt="Good Luck" className="welcome-talisman" />
                <h2>{m.app.title}</h2>
                <p className="welcome-desc">{m.welcome.desc}</p>
                <BirthInputForm
                    onSubmit={handleInputSubmit}
                    currentInput={userSignatureInput || INITIAL_INPUT}
                    isLoading={isLoading}
                    m={m}
                />
                {AnalyticsSettings}
            </div>
        );
    }

    const scoreClass = fortuneResult
        ? (fortuneResult.score >= 70 ? 'score-good' : (fortuneResult.score >= 50 ? 'score-medium' : 'score-bad'))
        : '';

    // 主体验
    return (
        <div>
            <div className="top-bar">
                <h2 className="app-title">{m.app.title}</h2>
                {LangToggle}
            </div>

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
                                <span className="score-unit">{m.talisman.scoreUnit}</span>
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
                    <span className="guidance-label">{m.talisman.guidanceLabel}</span>
                    <p className="guidance-text">"{physicalRecommendation.tarotAdvice}"</p>
                </div>
            )}

            {/* ====== 折叠：详细分析 ====== */}
            {fortuneResult && (
                <div className="detail-section">
                    <button
                        className="detail-toggle"
                        onClick={() => {
                            const nextExpanded = !detailExpanded;
                            setDetailExpanded(nextExpanded);
                            void trackEvent(nextExpanded ? 'detail_expand' : 'detail_collapse', {
                                locale,
                                score: fortuneResult.score,
                            });
                        }}
                    >
                        {detailExpanded ? m.talisman.detailCollapse : m.talisman.detailExpand}
                    </button>

                    {detailExpanded && (
                        <div className="detail-content">
                            <div className="detail-card">
                                <h4>{m.talisman.signatureTitle}</h4>
                                <div className="signature-card">
                                    {Object.entries(userSignature).map(([element, value]) => (
                                        <div key={element} className="signature-item">
                                            <div className={`signature-item--label ${element}`}>
                                                {m.elements[element] || element}
                                            </div>
                                            <div className="signature-item--value">{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="detail-card">
                                <h4>{m.talisman.energyTitle}</h4>
                                <p className="text-secondary detail-meta">
                                    {m.talisman.scoreLabel} <strong className={scoreClass}>{fortuneResult.score}</strong>/100
                                    &nbsp;&middot;&nbsp;
                                    {m.talisman.strongestLabel}: <strong>{m.elements[fortuneResult.imbalanceElement]}</strong>
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
                    <div className="products-header">
                        <h4 className="section-title">{m.products.title}</h4>
                        <button className="refresh-btn" onClick={refreshProducts}>{m.products.refresh}</button>
                    </div>
                    <div className="product-grid">
                        {physicalRecommendation.products.map((p, i) => (
                            <a
                                key={i}
                                href={p.buyLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="product-card"
                                onClick={() => void trackEvent('product_click', {
                                    locale,
                                    product_name: p.name,
                                    product_label: p.label,
                                    talisman_id: talisman?.id ?? null,
                                })}
                            >
                                <span className="product-icon">{p.icon}</span>
                                <span className="product-label">{p.label}</span>
                                <span className="product-name">{p.name}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {analyticsPermissionNeeded && (
                <div className="launch-card">
                    <h4>{m.launch.analyticsPermissionTitle}</h4>
                    <p>{m.launch.analyticsPermissionDesc}</p>
                    <button
                        type="button"
                        className="launch-btn"
                        onClick={() => void handleGrantAnalyticsPermission()}
                    >
                        {m.launch.analyticsPermissionBtn}
                    </button>
                </div>
            )}

            {!analyticsPermissionNeeded && analyticsPermissionGranted && (
                <div className="launch-card launch-card--ok">
                    <p>{m.launch.analyticsPermissionGranted}</p>
                </div>
            )}

            {AnalyticsSettings}

            {/* ====== 保存分享 ====== */}
            {talisman && fortuneResult && physicalRecommendation && shareConfig && (
                <div className="share-section">
                    <div className="share-link-card">
                        <span className="share-link-label">{m.share.linkLabel}</span>
                        <span className="share-link-value">
                            {getDisplayShareUrl(shareConfig.shortUrl, shareConfig.shareUrl)}
                        </span>
                    </div>
                    <div className="share-actions">
                        <button
                            className="share-btn"
                            onClick={async () => {
                                await generateShareImage({
                                    talisman,
                                    score: fortuneResult.score,
                                    tarotAdvice: physicalRecommendation.tarotAdvice,
                                    talismanImageSrc: TALISMAN_IMAGES[talisman.id],
                                    locale,
                                    shareUrl: shareConfig.shareUrl,
                                    shortUrl: shareConfig.shortUrl,
                                });
                                await trackEvent('share_save', {
                                    locale,
                                    score: fortuneResult.score,
                                    talisman_id: talisman.id,
                                    share_url: shareConfig.shortUrl,
                                });
                            }}
                        >
                            {m.share.saveBtn}
                        </button>
                        <button className="share-btn share-btn-secondary" onClick={() => void handleCopyCaption()}>
                            {m.share.copyBtn}
                        </button>
                    </div>
                    {copyFeedback && <p className="share-feedback">{copyFeedback}</p>}
                </div>
            )}

            {/* ====== 重新校准 (折叠) ====== */}
            <details className="recalibrate-section">
                <summary>{m.recalibrate}</summary>
                <div className="recalibrate-body">
                    <BirthInputForm
                        onSubmit={handleInputSubmit}
                        currentInput={userSignatureInput || INITIAL_INPUT}
                        isLoading={isLoading}
                        m={m}
                    />
                </div>
            </details>

            {/* ====== 底部声明 ====== */}
            <footer className="disclaimer">
                {m.app.disclaimer}
            </footer>
        </div>
    );
};
