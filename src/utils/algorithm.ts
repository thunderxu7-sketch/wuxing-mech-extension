// src/utils/algorithm.ts
// 在文件顶部，可以保留或添加这些类型定义
export interface UserSignatureInput {
    year: number;
    month: number; // 1-12
    day: number;
    hour: number; // 0-23
}

export interface FiveElementVector {
    gold: number;
    wood: number;
    water: number;
    fire: number;
    earth: number;
}
export type UserSignature = FiveElementVector;

/**
 * @description 运势计算结果的结构定义
 */
export interface FortuneResult {
    /**
     * @description 综合运势分数 (0-100)，分数越高代表五行越平衡、流畅。
     */
    score: number;
    /**
     * @description 当天能量最强、最可能导致不平衡的元素。
     */
    imbalanceElement: keyof FiveElementVector;
    /**
     * @description 经过生克制化后，最终的五行能量分布向量。可用于前端可视化（如雷达图）。
     */
    energyDifference: FiveElementVector;
}

// --- 辅助数据和函数 ---

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 干支五行映射表
const STEM_ELEMENTS: { [key: string]: keyof FiveElementVector } = {
    '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire', '戊': 'earth', '己': 'earth', '庚': 'gold', '辛': 'gold', '壬': 'water', '癸': 'water',
};

const BRANCH_ELEMENTS: { [key: string]: keyof FiveElementVector } = {
    '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood', '辰': 'earth', '巳': 'fire', '午': 'fire', '未': 'earth', '申': 'gold', '酉': 'gold', '戌': 'earth', '亥': 'water',
};

// 为每个干支设定一个基础能量值，天干权重高，地支权重低
const STEM_POWER = 60;
const BRANCH_POWER = 40;


/**
 * 一个简易的公历转四柱干支的工具函数
 * 注意：这是一个简化的实现，对于精确的节气计算可能存在微小误差，但对于项目演示和核心逻辑足够。
 */
function getFourPillars(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();

    // 1. 计算年柱 (基于立春)
    // 简化处理：以公历年来计算干支。精确算法应基于立春点。
    const yearStemIndex = (year - 4) % 10;
    const yearBranchIndex = (year - 4) % 12;
    const yearPillar = {
        stem: HEAVENLY_STEMS[yearStemIndex],
        branch: EARTHLY_BRANCHES[yearBranchIndex]
    };

    // 2. 计算月柱 (基于节气，较复杂，这里使用简化的表格法)
    // 月干公式：年干x2 + 月份 (例如，甲年(1)正月为丙(3)寅，(1*2+1)%10=3)
    const monthStemIndex = ((yearStemIndex + 1) * 2 + month) % 10;
    // 月支是固定的，寅为正月
    const monthBranchIndex = (month + 1) % 12; // 简化模型，寅从索引2开始
    const monthPillar = {
        stem: HEAVENLY_STEMS[monthStemIndex < 0 ? monthStemIndex + 10 : monthStemIndex],
        branch: EARTHLY_BRANCHES[monthBranchIndex]
    };
    
    // 3. 计算日柱 (基于一个基准点进行推算)
    const baseDate = new Date('1900-01-01');
    const targetDate = new Date(year, month - 1, day);
    const dayDiff = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // 1900-01-01 是 庚子日 (天干索引6，地支索引0)
    const dayStemIndex = (6 + dayDiff) % 10;
    const dayBranchIndex = (0 + dayDiff) % 12;
     const dayPillar = {
        stem: HEAVENLY_STEMS[dayStemIndex < 0 ? dayStemIndex + 10 : dayStemIndex],
        branch: EARTHLY_BRANCHES[dayBranchIndex < 0 ? dayBranchIndex + 12 : dayBranchIndex]
    };

    // 4. 计算时柱
    // 时支是固定的
    const hourBranchIndex = Math.floor((hour + 1) / 2) % 12;
    // 时干公式：日干x2 + 时支序数 (甲日(0)子时(0)为甲(0)子，(0*2+0)%10=0)
    const hourStemIndex = ((dayStemIndex) * 2 + hourBranchIndex) % 10;
    const hourPillar = {
        stem: HEAVENLY_STEMS[hourStemIndex < 0 ? hourStemIndex + 10 : hourStemIndex],
        branch: EARTHLY_BRANCHES[hourBranchIndex]
    };

    return { yearPillar, monthPillar, dayPillar, hourPillar };
}


// --- 核心函数实现 ---

/**
 * @description 基于用户的出生时间（四柱八字）计算其本命五行能量向量 V_User。
 * @param input 包含用户公历出生年、月、日、时的对象。
 * @returns 代表用户本命五行分布的向量。
 */
export function calculateUserSignature(input: UserSignatureInput): FiveElementVector {
    const birthDate = new Date(input.year, input.month - 1, input.day, input.hour);
    
    // 1. 获取用户的四柱八字
    const pillars = getFourPillars(birthDate);
    const allPillars = [pillars.yearPillar, pillars.monthPillar, pillars.dayPillar, pillars.hourPillar];

    // 2. 初始化一个空的五行向量
    const signature: FiveElementVector = {
        gold: 0,
        wood: 0,
        water: 0,
        fire: 0,
        earth: 0,
    };

    // 3. 遍历八字，累加五行能量
    allPillars.forEach(pillar => {
        // 添加天干的能量
        const stemElement = STEM_ELEMENTS[pillar.stem];
        if (stemElement) {
            signature[stemElement] += STEM_POWER;
        }

        // 添加地支的能量
        const branchElement = BRANCH_ELEMENTS[pillar.branch];
        if (branchElement) {
            signature[branchElement] += BRANCH_POWER;
        }
    });
    
    console.log(`[WuxingMech] User's Four Pillars: ${pillars.yearPillar.stem}${pillars.yearPillar.branch}, ${pillars.monthPillar.stem}${pillars.monthPillar.branch}, ${pillars.dayPillar.stem}${pillars.dayPillar.branch}, ${pillars.hourPillar.stem}${pillars.hourPillar.branch}`);
    console.log(`[WuxingMech] Calculated User Signature:`, signature);

    // 4. 返回最终的签名向量
    return signature;
}

/**
 * @description 计算指定日期的宇宙五行能量 (V_Day)。
 * 这通常与当天的干支相关。
 * @param date The date to calculate for.
 * @returns The FiveElementVector for the given day.
 */
export function calculateDailyCosmos(date: Date): FiveElementVector {
    // 复用 getFourPillars 的能力来获取当天的日柱
    const pillars = getFourPillars(date);
    const dayPillar = pillars.dayPillar; // 这就是我们需要的当日干支

    const dailyEnergy: FiveElementVector = { gold: 0, wood: 0, water: 0, fire: 0, earth: 0 };

    // 从动态获取的天干计算能量
    const stemElement = STEM_ELEMENTS[dayPillar.stem];
    if (stemElement) {
        dailyEnergy[stemElement] += STEM_POWER;
    }

    // 从动态获取的地支计算能量
    const branchElement = BRANCH_ELEMENTS[dayPillar.branch];
    if (branchElement) {
        dailyEnergy[branchElement] += BRANCH_POWER;
    }
    
    console.log(`[WuxingMech] Daily Cosmos for ${date.toLocaleDateString()} (${dayPillar.stem}${dayPillar.branch}日):`, dailyEnergy);
    return dailyEnergy;
}

/**
 * @description 根据五行生克模型计算最终运势。
 * @param V_User 用户的本命五行向量。
 * @param V_Day 当日的时神五行向量。
 * @returns 包含分数、失衡元素和能量差的运势结果。
 */
export function calculateFortune(V_User: FiveElementVector, V_Day: FiveElementVector): FortuneResult {
    // 1. 合并基础能量
    const V_Total: FiveElementVector = {
        gold: V_User.gold + V_Day.gold,
        wood: V_User.wood + V_Day.wood,
        water: V_User.water + V_Day.water,
        fire: V_User.fire + V_Day.fire,
        earth: V_User.earth + V_Day.earth,
    };

    // 2. 定义生克系数
    const strengtheningFactor = 0.1; // 相生系数
    const controllingFactor = 0.15;  // 相克系数

    // 3. 计算生克交互后的最终能量
    const V_Final: FiveElementVector = { ...V_Total };

    // 木 -> 生火, 克土
    V_Final.fire += V_Total.wood * strengtheningFactor;
    V_Final.earth -= V_Total.wood * controllingFactor;

    // 火 -> 生土, 克金
    V_Final.earth += V_Total.fire * strengtheningFactor;
    V_Final.gold -= V_Total.fire * controllingFactor;

    // 土 -> 生金, 克水
    V_Final.gold += V_Total.earth * strengtheningFactor;
    V_Final.water -= V_Total.earth * controllingFactor;

    // 金 -> 生水, 克木
    V_Final.water += V_Total.gold * strengtheningFactor;
    V_Final.wood -= V_Total.gold * controllingFactor;

    // 水 -> 生木, 克火
    V_Final.wood += V_Total.water * strengtheningFactor;
    V_Final.fire -= V_Total.water * controllingFactor;

    // 确保能量值不为负
    Object.keys(V_Final).forEach(key => {
        if (V_Final[key as keyof FiveElementVector] < 0) {
            V_Final[key as keyof FiveElementVector] = 0;
        }
    });

    // 4. 计算不平衡度和分数
    const energies = Object.values(V_Final);
    const maxEnergy = Math.max(...energies);
    const minEnergy = Math.min(...energies);
    const averageEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;

    // 不平衡度：极差 / 平均值。值越大越不平衡。
    const imbalance = averageEnergy > 0 ? (maxEnergy - minEnergy) / averageEnergy : 0;

    // 分数：将不平衡度映射到 0-100 分。假设不平衡度超过 2.5 为0分。
    const score = Math.max(0, Math.round(100 * (1 - imbalance / 2.5)));

    // 5. 找到最强（失衡）的元素
    const imbalanceElement = Object.keys(V_Final).reduce((a, b) =>
        V_Final[a as keyof FiveElementVector] > V_Final[b as keyof FiveElementVector] ? a : b
    ) as keyof FiveElementVector;

    return {
        score,
        imbalanceElement,
        energyDifference: V_Final,
    };
}