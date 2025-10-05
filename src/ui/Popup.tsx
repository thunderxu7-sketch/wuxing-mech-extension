import React, { useState, useEffect, useCallback } from 'react';
// 导入运行时的函数 (它们是值)
import { 
    calculateUserSignature, 
    calculateDailyCosmos, 
    calculateFortune, 
} from '../utils/algorithm';

// 导入只用于类型检查的类型 (必须使用 import type)
import type { 
    UserSignatureInput, 
    UserSignature, 
    FortuneResult,
    FiveElementVector 
} from '../utils/algorithm'; 
import { 
    // 导入存储 API
    getStoredSignature, 
    setStoredSignature, 
    getDailyCache, 
    setDailyCache 
} from '../api/chromeStorage';

// 初始的用户输入对象
const INITIAL_INPUT: UserSignatureInput = {
    year: 1990,
    month: 1,
    day: 1,
    hour: 12,
};

// ----------------------------------------------------
// UI 组件
// ----------------------------------------------------

// 这是一个简化的输入表单组件
const BirthInputForm: React.FC<{ 
    onSubmit: (input: UserSignatureInput) => void;
    currentInput: UserSignatureInput;
}> = ({ onSubmit, currentInput }) => {
    const [input, setInput] = useState(currentInput);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
             setInput({ ...input, [e.target.name]: value });
        }
    };

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(input); }}>
            <label>生日 (年/月/日/时):</label>
            <div style={{ display: 'flex', gap: '5px' }}>
                <input name="year" type="number" value={input.year} onChange={handleChange} min="1900" max="2100" placeholder="年" required />
                <input name="month" type="number" value={input.month} onChange={handleChange} min="1" max="12" placeholder="月" required />
                <input name="day" type="number" value={input.day} onChange={handleChange} min="1" max="31" placeholder="日" required />
                <input name="hour" type="number" value={input.hour} onChange={handleChange} min="0" max="23" placeholder="时" required />
            </div>
            <button type="submit" style={{ marginTop: '10px' }}>保存并计算本命五行</button>
        </form>
    );
};

// 运势展示组件
const FortuneDisplay: React.FC<{ result: FortuneResult }> = ({ result }) => (
    <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px', marginTop: '15px' }}>
        <h3>✨ 今日运势评分: <span style={{ color: result.score >= 70 ? 'green' : (result.score >= 50 ? 'orange' : 'red') }}>{result.score}</span> / 100</h3>
        <p>
            🔥 今日失衡元素: **{
                { gold: '金', wood: '木', water: '水', fire: '火', earth: '土' }[result.imbalanceElement]
            }** (能量最强)
        </p>
        <p style={{ fontSize: '12px' }}>
            （能量差值可用于雷达图展示: {JSON.stringify(result.energyDifference)}）
        </p>
    </div>
);


// ----------------------------------------------------
// 核心逻辑组件
// ----------------------------------------------------

export const Popup: React.FC = () => {
    const [userSignature, setUserSignature] = useState<UserSignature | null>(null);
    const [fortuneResult, setFortuneResult] = useState<FortuneResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userInput, setUserInput] = useState<UserSignatureInput>(INITIAL_INPUT);

    // 核心计算和存储函数
    const calculateAndSetFortune = useCallback(async (signature: UserSignature) => {
        setIsLoading(true);
        const today = new Date();
        
        // 1. 尝试从缓存获取
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
        
        // 3. 存储新结果
        await setDailyCache(result);
        setFortuneResult(result);
        setIsLoading(false);
        console.log("Calculated and cached new fortune.");
    }, []);

    // 处理用户提交出生时间
    const handleInputSubmit = useCallback(async (input: UserSignatureInput) => {
        setIsLoading(true);
        setUserInput(input); // 更新状态中的输入数据
        
        // 1. 计算新的本命签名
        const signature = calculateUserSignature(input);
        
        // 2. 存储签名
        await setStoredSignature(signature);
        setUserSignature(signature);

        // 3. 用新的签名计算今日运势
        await calculateAndSetFortune(signature);
        setIsLoading(false);
        
    }, [calculateAndSetFortune]);

    // 页面初始化：加载存储的数据
    useEffect(() => {
        async function loadData() {
            // 1. 加载本命签名
            const storedSignature = await getStoredSignature();
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
        <div style={{ width: '300px', padding: '15px', fontFamily: 'sans-serif' }}>
            <h2>五行每日运势</h2>
            {isLoading && <p>正在加载/计算...</p>}
            
            {!userSignature && !isLoading && (
                <>
                    <p>请设置您的出生时间，以计算本命五行签名。</p>
                    <BirthInputForm 
                        onSubmit={handleInputSubmit}
                        currentInput={userInput} // 传入初始值
                    />
                </>
            )}

            {userSignature && !isLoading && (
                <>
                    <p>您的本命五行签名已确定: **{JSON.stringify(userSignature)}**</p>
                    {fortuneResult ? (
                        <FortuneDisplay result={fortuneResult} />
                    ) : (
                        <p>今日运势计算失败或正在等待计算。</p> // 理论上不会出现，但作为后备
                    )}
                    
                    <hr style={{ margin: '15px 0' }} />
                    <h4>重新设置出生时间:</h4>
                    <BirthInputForm 
                        onSubmit={handleInputSubmit}
                        currentInput={userInput} // 传入当前值
                    />
                </>
            )}
        </div>
    );
};