// src/ui/Popup.tsx

import React, { useState, useEffect, useCallback } from 'react';
import * as chromeStorage from '../api/chromeStorage';
// 导入类型 (需要 type)
import type { 
    UserSignatureInput, 
    UserSignature, 
    FortuneResult,
    FiveElementVector,
    NftAnchorRecommendation,
    PhysicalAnchorRecommendation
} from '../utils/algorithm';

// 导入核心逻辑 (函数是值，不需要 type)
import { 
    calculateUserSignature, 
    calculateDailyCosmos, 
    calculateFortune, 
    getNftAnchorRecommendation,
    getPhysicalAnchorRecommendation
} from '../utils/algorithm';

import { 
    getStoredSignature, 
    setStoredSignature, 
    getDailyCache, 
    setDailyCache 
} from '../api/chromeStorage';

// 导入雷达图组件
import { RadarChart } from './components/RadarChart'; 

// 初始的用户输入对象
const INITIAL_INPUT: UserSignatureInput = {
    year: 1990,
    month: 1,
    day: 1,
    hour: 12,
};

// 内部状态处理字符串，方便用户输入
interface InputState {
    year: string | number;
    month: string | number;
    day: string | number;
    hour: string | number;
}

// ----------------------------------------------------
// UI 组件
// ----------------------------------------------------

const BirthInputForm: React.FC<{ 
    onSubmit: (input: UserSignatureInput) => void;
    currentInput: UserSignatureInput;
    isLoading: boolean; // 新增加载状态，禁用按钮
}> = ({ onSubmit, currentInput, isLoading }) => {
    // 初始化状态
    const [input, setInput] = useState<InputState>({
        year: currentInput.year.toString(),
        month: currentInput.month.toString(),
        day: currentInput.day.toString(),
        hour: currentInput.hour.toString(),
    });

    // 2. 【关键修复】使用 useEffect 监听并同步外部属性
    useEffect(() => {
        // 当 currentInput (来自异步存储) 发生变化时，更新内部状态
        setInput({
            year: currentInput.year.toString(),
            month: currentInput.month.toString(),
            day: currentInput.day.toString(),
            hour: currentInput.hour.toString(),
        });
    }, [currentInput]); // 依赖项为 currentInput

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
    
        // 允许空字符串，并更新状态
        setInput(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    // 提交逻辑需要更新：将字符串转回数字并验证
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // 提交前进行验证和转换
        const year = parseInt(input.year as string, 10);
        const month = parseInt(input.month as string, 10);
        const day = parseInt(input.day as string, 10);
        const hour = parseInt(input.hour as string, 10);
        
        // 简单的必填项检查 (虽然 input 上有 required，但这里更安全)
        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour)) {
            alert("请输入完整的公历出生时间！");
            return;
        }
        
        onSubmit({ year, month, day, hour }); // 提交正确的数字对象
    };

    return (
       <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                您的公历出生时间 (年/月/日/时):
            </label>
            <div className="input-grid"> 
            {/* 输入框的值现在直接绑定到 input[name]，不需要再解析为数字 */}
                <input name="year" type="number" value={input.year} onChange={handleChange} min="1900" max="2100" placeholder="年" required />
                <input name="month" type="number" value={input.month} onChange={handleChange} min="1" max="12" placeholder="月" required />
                <input name="day" type="number" value={input.day} onChange={handleChange} min="1" max="31" placeholder="日" required />
                <input name="hour" type="number" value={input.hour} onChange={handleChange} min="0" max="23" placeholder="时" required />
            </div>
            <button type="submit" disabled={isLoading}>
                {isLoading ? '计算中...' : '保存并校准本命五行'}
            </button>
        </form>
    );
};

const FIVE_ELEMENT_NAMES_MAP: { [key in keyof FiveElementVector]: string } = {
    gold: '金',
    wood: '木',
    water: '水',
    fire: '火',
    earth: '土',
};

// 运势展示组件
const FortuneDisplay: React.FC<{
    result: FortuneResult;
    userSignature: UserSignature;
    recommendation: NftAnchorRecommendation | null;
    physicalRecommendation: PhysicalAnchorRecommendation | null;
}> = ({ result, userSignature, recommendation, physicalRecommendation }) => {
    const scoreClassName = result.score >= 70 ? 'score-good' : (result.score >= 50 ? 'score-medium' : 'score-bad');
    return (
        <>
            {/* 本命五行签名和今日能量校准部分 */}
            <div className="info-card">
                <h3>本命五行签名</h3>
                <p style={{ marginTop: '-10px' }} className='text-secondary'>
                    根据您的出生时间，您的本命五行能量基准是：
                </p>
                
                {/* 使用新的 signature-card 布局 */}
                <div className="signature-card">
                    {Object.entries(userSignature).map(([element, value]) => (
                        <div key={element} className="signature-item">
                            {/* 应用元素专属颜色类 */}
                            <div className={`signature-item--label ${element}`}> 
                                {FIVE_ELEMENT_NAMES_MAP[element as keyof FiveElementVector]}
                            </div>
                            <div className="signature-item--value">{value}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="info-card fortune-result"> {/* 突出显示当日运势 */}
                <h3>✨ 今日能量校准结果</h3>
                
                {/* 运势分数和失衡元素 */}
                {/* 关键修改：使用 score-summary 类控制布局 */}
                <div className="score-summary">
                    <div>
                        <p style={{ margin: 0, fontSize: '0.9em', color: '#6c757d' }}>综合运势评分:</p>
                        <p style={{ fontSize: '28px', margin: '5px 0 0 0' }}> {/* 增大分数，更醒目 */}
                             <span className={scoreClassName}>{result.score}</span> / 100
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '0.9em', color: '#6c757d' }}>最强 (失衡) 元素:</p>
                        <p style={{ fontSize: '20px', margin: '5px 0 0 0' }}>
                            <span className="imbalance-element">
                                {FIVE_ELEMENT_NAMES_MAP[result.imbalanceElement]}
                            </span>
                        </p>
                    </div>
                </div>

                <p style={{ fontSize: '0.9em', textAlign: 'center' }} className='text-secondary'>
                    （分数越高，五行越平衡流畅）
                </p>
                
                <h4 style={{ textAlign: 'center', marginTop: '15px' }}>五行能量分布可视化</h4>
                <RadarChart data={result.energyDifference} />
            </div>

            <hr /> 
            
            {/* NFT 锚点推荐卡片 */}
            {recommendation && (
                <div className="info-card" style={{ padding: '15px 0' }}>
                    <h3>🧭 推荐 NFT 锚点</h3>
                    <p style={{ marginTop: '-5px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        主题: {recommendation.theme}
                    </p>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.9em' }}>
                        行动哲学: {recommendation.action}
                    </p>
                    <div style={{ padding: '10px', border: '1px dashed #ced4da', borderRadius: '6px' }}>
                        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>推荐赛道/关键词:</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {recommendation.keywords.map((keyword, index) => (
                                <span 
                                    key={index} 
                                    style={{ 
                                        backgroundColor: '#e9ecef', 
                                        color: '#343a40',
                                        padding: '4px 8px', 
                                        borderRadius: '12px', 
                                        fontSize: '0.8em' 
                                    }}
                                >
                                    {keyword}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <hr /> 
            
            {/* 新增实体产品锚点推荐卡片 */}
            {physicalRecommendation && (
                <div className="info-card" style={{ padding: '15px 0' }}>
                    <h3>🧘 实体锚点与生活建议</h3>
                    <p style={{ marginTop: '-5px', fontSize: '0.95em' }}>
                        主题颜色: <span style={{ fontWeight: 'bold' }}>{physicalRecommendation.themeColor}</span>
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        
                        {/* 水晶推荐 */}
                        <div className="recommendation-box" style={{ padding: '8px', border: '1px solid #e9ecef', borderRadius: '4px' }}>
                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>🔮 水晶推荐</p>
                            <a href={physicalRecommendation.crystal.buyLink} target="_blank" rel="noopener noreferrer" 
                                style={{ display: 'block', color: '#007bff', textDecoration: 'none', fontSize: '0.9em' }}>
                                购买: {physicalRecommendation.crystal.name}
                            </a>
                        </div>
                        
                        {/* 生活方式推荐 */}
                        <div className="recommendation-box" style={{ padding: '8px', border: '1px solid #e9ecef', borderRadius: '4px' }}>
                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>🏠 生活周边</p>
                            <a href={physicalRecommendation.lifestyle.buyLink} target="_blank" rel="noopener noreferrer" 
                                style={{ display: 'block', color: '#007bff', textDecoration: 'none', fontSize: '0.9em' }}>
                                购买: {physicalRecommendation.lifestyle.name}
                            </a>
                        </div>
                    </div>
                    
                    {/* 塔罗建议 */}
                    <div style={{ padding: '10px', borderTop: '1px solid #e9ecef', marginTop: '10px' }}>
                         <p style={{ margin: '0 0 0 0', fontWeight: 'bold', fontSize: '0.95em' }}>✨ 心灵指引 (塔罗)</p>
                         <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: '#6c757d' }}>
                             {physicalRecommendation.tarotAdvice}
                         </p>
                    </div>
                </div>
            )}
        </>
    );
};

// ----------------------------------------------------
// 核心逻辑组件
// ----------------------------------------------------

export const Popup: React.FC = () => {
    const [userSignature, setUserSignature] = useState<UserSignature | null>(null);
    const [userSignatureInput, setUserSignatureInput] = useState<UserSignatureInput | null>(null);
    const [fortuneResult, setFortuneResult] = useState<FortuneResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [anchorRecommendation, setAnchorRecommendation] = useState<NftAnchorRecommendation | null>(null);
    const [physicalRecommendation, setPhysicalRecommendation] = useState<PhysicalAnchorRecommendation | null>(null);

    // 核心计算和存储函数
    const calculateAndSetFortune = useCallback(async (signature: UserSignature) => {
        setIsLoading(true);
        const today = new Date();
        
        // 1. 尝试从缓存获取 (本地预览时 getDailyCache 会返回 null)
        const cachedResult = await getDailyCache();
        if (cachedResult) {
            setFortuneResult(cachedResult.data);
            setIsLoading(false);
            console.log("Loaded fortune from cache.");
            return;
        }

        // 2. 缓存过期或不存在，重新计算
        const V_Day = calculateDailyCosmos(today);
        const result = calculateFortune(signature, V_Day);

        // 3. 生成推荐结果
        const nftRecommendation = getNftAnchorRecommendation(result);
        const physicalRecommendation = getPhysicalAnchorRecommendation(result);
        
        // 4. 存储新结果 (本地预览时 setDailyCache 会跳过)
        await setDailyCache(result);
        setFortuneResult(result);
        setAnchorRecommendation(nftRecommendation);
        setPhysicalRecommendation(physicalRecommendation);
        setIsLoading(false);
        console.log("Calculated and cached new fortune.");
    }, []);

    // 数据加载 useEffect
    useEffect(() => {
        // 1. 加载用户输入和签名
        chromeStorage.getUserSignatureInput().then(input => {
            const loadedInput = input;
            // 不再需要显式指定 typedInput，直接使用 loadedInput 即可
            if (loadedInput) { 
                setUserSignatureInput(loadedInput);
                
                // 2. 立即计算本命签名
                // 这里的 loadedInput 已经被 TypeScript 安全地推断为 UserSignatureInput
                const signature = calculateUserSignature(loadedInput);
                setUserSignature(signature);
                
                // 3. 主动计算并设置今日运势 (新增)
                calculateAndSetFortune(signature); 
            }
            setIsLoading(false);
        });

    }, [calculateAndSetFortune]);

    // 处理用户提交出生时间
    const handleInputSubmit = useCallback(async (input: UserSignatureInput) => {
        setIsLoading(true);
        
        // 1. 保存用户输入 (新增)
        await chromeStorage.setUserSignatureInput(input); 
        setUserSignatureInput(input); // 更新状态

        // 2. 计算新的本命签名
        const signature = calculateUserSignature(input);
        
        // 3. 存储签名 (本地预览时 setStoredSignature 会跳过)
        await setStoredSignature(signature);
        setUserSignature(signature);

        // 4. 用新的签名计算今日运势
        await calculateAndSetFortune(signature);
        setIsLoading(false);
        
    }, [calculateAndSetFortune]);

    // 页面初始化：加载存储的数据
    useEffect(() => {
        async function loadData() {
            // --- 仅用于本地调试的模拟数据 START ---
            // 如果不在扩展环境 (即 chrome.storage 不存在)，则使用模拟签名
            if (typeof chrome === 'undefined' || !chrome.storage) {
                console.warn("[Popup] Running in non-extension environment. Using mock signature for display.");
                const mockSignature: UserSignature = { gold: 120, wood: 140, water: 80, fire: 150, earth: 100 }; // 示例签名
                setUserSignature(mockSignature);
                await calculateAndSetFortune(mockSignature); // 用模拟签名运行算法
                setIsLoading(false);
                return; // 跳过真正的 Chrome API 调用
            }
            // --- 仅用于本地调试的模拟数据 END ---

            // 1. 加载本命签名
            const storedSignature = await getStoredSignature(); // 此处 getStoredSignature 也会做环境检测
            if (storedSignature) {
                setUserSignature(storedSignature);
                // 2. 如果有签名，计算/加载今日运势
                await calculateAndSetFortune(storedSignature);
            } else {
                setIsLoading(false);
            }
        }
        loadData();
    }, [calculateAndSetFortune]); // 依赖项确保只在组件挂载时运行

    // ----------------- 渲染 -----------------

    return (
        <div> {/* 移除 width 和 padding，让 CSS 控制 */}
            <h2>五行校准</h2>
            {isLoading && <p style={{ textAlign: 'center', color: '#007bff' }}>正在加载/计算...</p>}
            
            {!userSignature && !isLoading && (
                <>
                    <p style={{ textAlign: 'center', color: '#6c757d', marginBottom: '20px' }}>
                        首次使用，请设置您的出生时间以进行本命五行校准。
                    </p>
                    <BirthInputForm 
                        onSubmit={handleInputSubmit}
                        currentInput={userSignatureInput || INITIAL_INPUT}
                        isLoading={isLoading}
                    />
                </>
            )}

            {userSignature && !isLoading && (
                <>
                    {fortuneResult ? (
                        <FortuneDisplay
                            result={fortuneResult}
                            userSignature={userSignature}
                            recommendation={anchorRecommendation}
                            physicalRecommendation={physicalRecommendation}
                        />
                    ) : (
                        <p style={{ textAlign: 'center', color: '#dc3545' }}>今日运势计算失败或正在等待计算。</p> // 理论上不会出现，但作为后备
                    )}
                    
                    <hr />
                    <h4 style={{ textAlign: 'center', color: '#6c757d', marginBottom: '15px' }}>重新校准本命五行:</h4>
                    
                    <BirthInputForm 
                        onSubmit={handleInputSubmit}
                        currentInput={userSignatureInput || INITIAL_INPUT}
                        isLoading={isLoading}
                    />
                </>
            )}
        </div>
    );
};