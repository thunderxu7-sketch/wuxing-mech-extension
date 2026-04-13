// src/utils/algorithm.ts
import solarLunar from 'solarlunar';
import type { Locale } from '../locales/types';
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

/**
 * @description NFT/投资锚点推荐结果的结构定义
 */
export interface NftAnchorRecommendation {
    /**
     * @description 主要推荐元素的名称（如：木、火）
     */
    primaryElement: keyof FiveElementVector;
    /**
     * @description 推荐的锚点主题或赛道
     */
    theme: string;
    /**
     * @description 推荐的行动建议（投资哲学）
     */
    action: string;
    /**
     * @description 推荐的 NFT 类型或赛道列表
     */
    keywords: string[];
}

export interface ProductItem {
    name: string;
    buyLink: string;
    icon: string;
    label: string;
}

export interface PhysicalAnchorRecommendation {
    themeColor: string;
    tarotAdvice: string;
    products: ProductItem[];
}

/**
 * @description 每日灵符推荐结果
 */
export interface TalismanRecommendation {
    id: string;
    name: string;
    blessing: string;
    subtitle: string;
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
 * [新版本] 使用 solarlunar 库将公历转为精确的四柱干支。
 * 这个版本精确处理了节气，解决了原简化版函数的误差问题。
 */
function getFourPillars(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();

    // 使用 solarlunar.solar2lunar 获取完整的日历数据
    const lunarData = solarLunar.solar2lunar(year, month, day);

    // 1. 获取年、月、日柱 (由库直接提供，非常精确)
    const yearStem = lunarData.gzYear[0];
    const yearBranch = lunarData.gzYear[1];

    const monthStem = lunarData.gzMonth[0];
    const monthBranch = lunarData.gzMonth[1];
    
    const dayStem = lunarData.gzDay[0];
    const dayBranch = lunarData.gzDay[1];

    // 2. 计算时柱 (时柱的计算依赖于日干，规则是固定的)
    // 这个计算规则和你之前自己实现的完全一样，我们可以继续使用
    const dayStemIndex = HEAVENLY_STEMS.indexOf(dayStem);
    if (dayStemIndex === -1) {
        // 增加一个错误处理，防止因找不到天干而出错
        throw new Error(`Invalid day stem calculated: ${dayStem}`);
    }
    const hourBranchIndex = Math.floor((hour + 1) / 2) % 12;
    // 时干公式：日干序数 * 2 + 时支序数
    // 例如：甲日(0)子时(0) -> 0*2+0=0 -> 甲子
    // 庚日(6)午时(6) -> 6*2+6=18 -> 18%10=8 -> 壬午
    const hourStemIndex = (dayStemIndex * 2 + hourBranchIndex) % 10;
    
    const hourStem = HEAVENLY_STEMS[hourStemIndex];
    const hourBranch = EARTHLY_BRANCHES[hourBranchIndex];
    
    return {
        yearPillar: { stem: yearStem, branch: yearBranch },
        monthPillar: { stem: monthStem, branch: monthBranch },
        dayPillar: { stem: dayStem, branch: dayBranch },
        hourPillar: { stem: hourStem, branch: hourBranch },
    };
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

    // 新增：步骤 3.5 确保所有能量值为整数，避免浮点数问题影响 maxVal 计算
    Object.keys(V_Final).forEach(key => {
        V_Final[key as keyof FiveElementVector] = Math.round(V_Final[key as keyof FiveElementVector]);
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

/**
 * @description 根据运势结果（失衡元素）生成 NFT/投资锚点推荐。
 * 策略：推荐的锚点应能 "泄" 或 "克制" 失衡元素，以达到能量平衡。
 * @param result 运势计算结果
 * @returns 包含推荐主题和行动建议的对象
 */
export function getNftAnchorRecommendation(result: FortuneResult): NftAnchorRecommendation {
    const imbalance = result.imbalanceElement;
    
    // 使用一个 switch 语句实现五行锚点推荐的核心逻辑
    switch (imbalance) {
        case 'gold':
            return {
                primaryElement: 'fire', // 火克金 (克制)
                theme: "流动性与消耗 (Fire & Water)",
                action: "金气过盛，宜选择消耗性资产或高流动性项目，将能量转化为流通性。",
                keywords: ["燃烧机制 NFT (Burn Mechanism)", "高流动性交易赛道", "游戏内消耗品", "稳定币质押 (Water)"],
            };
        case 'wood':
            return {
                primaryElement: 'gold', // 金克木 (克制)
                theme: "稀有性与抗通胀 (Gold & Fire)",
                action: "木气过盛，宜选择稀缺、坚固、具备长期价值存储特性的资产。",
                keywords: ["蓝筹 NFT 收藏品", "限量版艺术品", "高稀有度 PFP", "元宇宙房产 (Fire)"],
            };
        case 'water':
            return {
                primaryElement: 'earth', // 土克水 (克制)
                theme: "稳定与基础建设 (Earth & Wood)",
                action: "水气过盛，宜选择基础扎实、拥有明确应用场景和稳定增长预期的项目。",
                keywords: ["DeFi 基础设施协议", "数据存储 NFT", "域名服务 (ENS/SNS)", "创作者经济平台 (Wood)"],
            };
        case 'fire':
            return {
                primaryElement: 'water', // 水克火 (克制)
                theme: "理性与治理 (Water & Earth)",
                action: "火气过盛，宜选择冷静、理性、具有良好治理机制的项目，避免 FOMO 情绪。",
                keywords: ["DAO 治理代币", "身份/声誉系统 NFT", "高息稳定收益（如 Liquid Staking）(Water)", "链上保险 (Earth)"],
            };
        case 'earth':
            return {
                primaryElement: 'wood', // 木克土 (克制)
                theme: "成长与艺术 (Wood & Gold)",
                action: "土气过盛，宜选择具有成长性、叙事性或艺术价值的项目，激活僵化能量。",
                keywords: ["生成艺术 NFT (Generative Art)", "新兴 IP 授权", "游戏公会/社区 NFT (Wood)", "文化/收藏品赛道 (Gold)"],
            };
        default:
            return {
                primaryElement: 'earth',
                theme: "保持稳定",
                action: "五行平衡，保持观察，以稳健的土元素为主。",
                keywords: ["持有稳定币", "头部蓝筹 NFT", "长期质押"],
            };
    }
}

// --- 灵符多语言数据 ---

interface TalismanData { name: string; blessing: string; subtitle: string; }
type TalismanDataMap = Record<string, Record<Locale, TalismanData>>;

const TALISMAN_DATA: TalismanDataMap = {
    haoyun:  { zh: { name: '好运符', blessing: '万事顺心 好运自来', subtitle: '今日宜：随心而行' },
               en: { name: 'Good Luck Charm', blessing: 'Fortune favors you today', subtitle: 'Today: go with the flow' } },
    yongqi:  { zh: { name: '勇气符', blessing: '毅力可破万重关', subtitle: '今日宜：迎难而上' },
               en: { name: 'Courage Charm', blessing: 'Resilience conquers all', subtitle: 'Today: face challenges head-on' } },
    zhaocai: { zh: { name: '招财符', blessing: '财源滚滚 福运绵长', subtitle: '今日宜：聚财纳福' },
               en: { name: 'Wealth Charm', blessing: 'Abundance flows your way', subtitle: 'Today: attract prosperity' } },
    shiye:   { zh: { name: '事业符', blessing: '事业繁荣 前程似锦', subtitle: '今日宜：开拓进取' },
               en: { name: 'Career Charm', blessing: 'A bright path lies ahead', subtitle: 'Today: seize opportunities' } },
    zhihui:  { zh: { name: '智慧符', blessing: '智慧如光 映照万物', subtitle: '今日宜：静心思考' },
               en: { name: 'Wisdom Charm', blessing: 'Clarity illuminates all', subtitle: 'Today: reflect and learn' } },
    pingan:  { zh: { name: '平安符', blessing: '岁岁平安 顺心如意', subtitle: '今日宜：修身养性' },
               en: { name: 'Peace Charm', blessing: 'Serenity and safety surround you', subtitle: 'Today: nurture yourself' } },
    yinyuan: { zh: { name: '姻缘符', blessing: '千里姻缘 一线牵', subtitle: '今日宜：广结善缘' },
               en: { name: 'Love Charm', blessing: 'Bonds of destiny await', subtitle: 'Today: open your heart' } },
    fugui:   { zh: { name: '富贵符', blessing: '富贵双全 万事如意', subtitle: '今日宜：厚积薄发' },
               en: { name: 'Prosperity Charm', blessing: 'Wealth and honor in harmony', subtitle: 'Today: build your foundation' } },
};

/**
 * @description 根据运势结果匹配每日灵符，覆盖全部 8 张符图。
 */
export function getDailyTalisman(
    result: FortuneResult,
    locale: Locale = 'zh',
    now: Date = new Date(),
): TalismanRecommendation {
    let id: string;

    if (result.score >= 80) {
        id = 'haoyun';
    } else if (result.score < 35) {
        id = 'yongqi';
    } else {
        const dayOfMonth = now.getDate();
        switch (result.imbalanceElement) {
            case 'gold':  id = 'zhaocai'; break;
            case 'wood':  id = dayOfMonth % 2 === 0 ? 'shiye' : 'zhihui'; break;
            case 'water': id = 'pingan'; break;
            case 'fire':  id = 'yinyuan'; break;
            case 'earth': id = 'fugui'; break;
            default:      id = 'haoyun'; break;
        }
    }

    const data = TALISMAN_DATA[id][locale];
    return { id, ...data };
}

// TODO: zh 接入阿里妈妈淘宝客 API 后替换为带 PID 的推广链接
function generateAffiliateLink(keyword: string, locale: Locale): string {
    const query = encodeURIComponent(keyword);
    if (locale === 'en') {
        return `https://www.amazon.com/s?k=${query}&tag=wuxingdaily-20`;
    }
    return `https://s.taobao.com/search?q=${query}`;
}

// --- 商品池 + 塔罗多语言数据 ---

interface RawProduct { name: string; keyword: string; icon: string; label: string; affiliateUrl?: string; }

interface ElementMeta {
    themeColor: string;
    tarotAdvice: string;
    products: RawProduct[];
}

const ELEMENT_DATA: Record<string, Record<Locale, ElementMeta>> = {
    gold: {
        zh: {
            themeColor: '红 / 黑 (火克金，水泻金)',
            tarotAdvice: '审视你的『宝剑』牌组，寻找行动与克制之间的平衡。',
            products: [
                { name: '黑曜石手链', keyword: '黑曜石手链', icon: '💎', label: '能量水晶', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3Dkhl0EL78ikNw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUhDqz0N12Bmb0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLDcsC9G%2BQCBI6fjAYKIHmwM0Q9fK1X0Au0ItOGVs%2B65ktv3cN%2Fx87OGZEBHtTGfZkwHpF%2FzUhH7fJfnh3wcUCBd0CPrQx4uTttTCYOc400ws0GeHdPmI2q4wmLWBgEm80VKxcI130SjE62eTPdbXr0pviRzN6McS7IUTRFVyU79zGJe8N%2FwNpGw%3D%3D&union_lens=lensId%3APUB%401776084884%40212be337_0f1d_19d86e89bb3_7d13%40023f16uR4iNYJcoTtaVp9DoZ%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_2_177608488446910139353908%3Bscm%3A1007.30148.329090.pub_search-item_b44ceeb0-2a24-46bb-b975-8a4609b96d6f_' },
                { name: '红色香薰蜡烛', keyword: '红色香薰蜡烛', icon: '🕯️', label: '香薰' },
                { name: '红玛瑙手串', keyword: '红玛瑙手串 开运', icon: '📿', label: '开运饰品' },
                { name: '檀香线香', keyword: '檀香线香 天然', icon: '🪔', label: '空间净化' },
                { name: '石榴石吊坠', keyword: '石榴石吊坠', icon: '💍', label: '能量饰品' },
                { name: '红色丝绸眼罩', keyword: '真丝眼罩 红色', icon: '😴', label: '助眠' },
            ],
        },
        en: {
            themeColor: 'Red / Black (Fire controls Metal)',
            tarotAdvice: 'Examine your Swords cards — find the balance between action and restraint.',
            products: [
                { name: 'Black Obsidian Bracelet', keyword: 'Black Obsidian Bracelet', icon: '💎', label: 'Crystal' },
                { name: 'Red Aromatherapy Candle', keyword: 'Red Aromatherapy Candle', icon: '🕯️', label: 'Aromatherapy' },
                { name: 'Red Agate Bracelet', keyword: 'Red Agate Bracelet', icon: '📿', label: 'Jewelry' },
                { name: 'Sandalwood Incense', keyword: 'Sandalwood Incense Sticks', icon: '🪔', label: 'Purifier' },
                { name: 'Garnet Pendant', keyword: 'Garnet Pendant Necklace', icon: '💍', label: 'Jewelry' },
                { name: 'Silk Sleep Mask', keyword: 'Silk Eye Mask Red', icon: '😴', label: 'Sleep' },
            ],
        },
    },
    wood: {
        zh: {
            themeColor: '白 / 红 (金克木，火泻木)',
            tarotAdvice: '关注『权杖』牌组的能量，将生发之力转化为具体行动。',
            products: [
                { name: '白水晶簇摆件', keyword: '白水晶簇摆件', icon: '💎', label: '能量水晶', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3Ds1eEyW2JhjJw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHULo3%2FfOj61I%2F0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLaUqWGQsEs4emcwlv9D%2BndQtkyqhBb5%2B4HoaaUnJGJVM9B4xXEGTfTRsr5Fp%2FZmEfi4kZGuoAcmNmtIz17NKiZ0w1wO%2BIxWMMoZWXy1UcAG6RPKnGQOC7okLEkqTedE399KEV1g6mN9C6fA%2BHrN%2BXZpB4w3NmBKRkxgxdTc00KD8%3D&union_lens=lensId%3APUB%401776088720%40212bc550_0e2c_19d8723237d_1c31%40021Qbvsi9AqwHBMuNncO4qXU%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_6_177608872031810139353908%3Bscm%3A1007.30148.329090.pub_search-item_d02f6656-0ab0-4ad0-a7dc-da91dff36f95_' },
                { name: '艺术画册', keyword: '艺术画册 精装', icon: '📚', label: '文艺' },
                { name: '金属风铃', keyword: '金属风铃 日式', icon: '🔔', label: '家居' },
                { name: '银饰手链', keyword: '纯银手链 简约', icon: '💍', label: '饰品' },
                { name: '白茶礼盒', keyword: '白茶礼盒 福鼎', icon: '🍵', label: '茶道' },
                { name: '陶瓷香薰炉', keyword: '陶瓷香薰炉 复古', icon: '🏺', label: '香薰' },
            ],
        },
        en: {
            themeColor: 'White / Red (Metal controls Wood)',
            tarotAdvice: 'Focus on your Wands — channel growth energy into concrete action.',
            products: [
                { name: 'Clear Quartz Cluster', keyword: 'Clear Quartz Cluster', icon: '💎', label: 'Crystal' },
                { name: 'Fine Art Book', keyword: 'Coffee Table Art Book', icon: '📚', label: 'Art' },
                { name: 'Metal Wind Chime', keyword: 'Metal Wind Chime', icon: '🔔', label: 'Home' },
                { name: 'Silver Bracelet', keyword: 'Sterling Silver Bracelet', icon: '💍', label: 'Jewelry' },
                { name: 'White Tea Gift Set', keyword: 'White Tea Gift Set', icon: '🍵', label: 'Tea' },
                { name: 'Ceramic Incense Burner', keyword: 'Ceramic Incense Burner', icon: '🏺', label: 'Decor' },
            ],
        },
    },
    water: {
        zh: {
            themeColor: '黄 / 紫 (土克水，金生水)',
            tarotAdvice: '冥想与『五芒星』牌组，让财务和现实基础更加稳固。',
            products: [
                { name: '黄水晶摆件', keyword: '黄水晶摆件 招财', icon: '💎', label: '能量水晶' },
                { name: '星座周边礼物', keyword: '星座礼物 摩羯座 金牛座', icon: '♑', label: '星座' },
                { name: '虎眼石手链', keyword: '虎眼石手链', icon: '📿', label: '能量饰品', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DVo%2F9wqwxG8Nw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUBcKmkkyArxL0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLNeP%2FC0GK28OnCCH%2FMSFuGgtkyqhBb5%2B4HoaaUnJGJVMZKzyQwMx7KLFX0S0UkPDJ4KD%2Fp87vqdh1DcSooncqgvAZjMPuUUggKfZqRvUd%2BjbewPOkfKGa7kLEkqTedE399KEV1g6mN9Bh0O3Rc5H%2FprWCuPqUucK9WkceTTmbJx5NpORCvXz2yA%3D%3D&union_lens=lensId%3APUB%401776088755%40212bbff9_0d6c_19d8723aed3_8d24%40021WVN24QahyMYMFd7LrxSO4%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_3_177608875599110139353908%3Bscm%3A1007.30148.329090.pub_search-item_ce9bb3d9-43a8-4c4f-87b3-1789ee29d2f1_' },
                { name: '沉香手串', keyword: '沉香手串 天然', icon: '📿', label: '养生' },
                { name: '黄铜摆件', keyword: '黄铜摆件 招财', icon: '🪙', label: '风水' },
                { name: '普洱茶饼', keyword: '普洱茶饼 礼盒', icon: '🍵', label: '茶道' },
            ],
        },
        en: {
            themeColor: 'Yellow / Purple (Earth controls Water)',
            tarotAdvice: 'Meditate on your Pentacles — strengthen your material foundations.',
            products: [
                { name: 'Citrine Crystal', keyword: 'Citrine Crystal Decor', icon: '💎', label: 'Crystal' },
                { name: 'Zodiac Gifts', keyword: 'Zodiac Sign Gift Set', icon: '♑', label: 'Zodiac' },
                { name: 'Tiger Eye Bracelet', keyword: 'Tiger Eye Stone Bracelet', icon: '📿', label: 'Jewelry' },
                { name: 'Agarwood Bracelet', keyword: 'Agarwood Bead Bracelet', icon: '📿', label: 'Wellness' },
                { name: 'Brass Decor', keyword: 'Brass Feng Shui Decor', icon: '🪙', label: 'Feng Shui' },
                { name: 'Pu-erh Tea Cake', keyword: 'Pu erh Tea Gift', icon: '🍵', label: 'Tea' },
            ],
        },
    },
    fire: {
        zh: {
            themeColor: '蓝 / 绿 (水克火，木生火)',
            tarotAdvice: '多加解读『圣杯』牌组，关注内心感受与情感交流，而非外部冲突。',
            products: [
                { name: '青金石吊坠', keyword: '青金石吊坠', icon: '💎', label: '能量水晶', affiliateUrl: 'https://uland.taobao.com/coupon/edetail?e=mb%2BJ1ng3tSOlhHvvyUNXZfh8CuWt5YH5OVuOuRD5gLJMmdsrkidbOWgpcJRl3wFwcV%2FlEyhmp8CWU9RPXcxvepfLxegMTFJyxLVFgHS8vo%2FXGh%2Bz8cMOs82QGjc6Db7yQzZ58q191a2y%2BpqXENrZF9gBE4XW2EqXaXOtHj5%2BtxsvR%2F1BNLrRCcLRW2d0xlmJICz0STAcMtvEudKYq6n0fVt110l29%2FNdDfqEFBOhTcyCc3iszFwSkv7UZVdseYvYWldT%2FS2kBovdVPE4Rni4JvRXnoqz1jAuSZmS8eGtb0NsB2SFUmuBXSWmYvz4KVM8saMWz%2BfStXaaFfofOlW8jvpvTxnSf5WlYpCeA5BjP6eie%2FpBy9wBFg%3D%3D&traceId=2150438e17760889259415806e13dd&union_lens=lensId%3APUB%401776088901%4021673672_0e3d_19d8725e6f3_0632%40024JFbGsr9TBfHhYxNMqMnec%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_1_177608890142510139353908%3Bscm%3A1007.30148.329090.pub_search-item_3206e19a-444d-4057-be3e-31d578ed81d5_' },
                { name: '蓝色陶瓷茶具', keyword: '蓝色陶瓷茶具套装', icon: '🍵', label: '茶道' },
                { name: '海蓝宝手链', keyword: '海蓝宝手链', icon: '📿', label: '能量饰品' },
                { name: '薰衣草精油', keyword: '薰衣草精油 天然', icon: '💧', label: '舒缓' },
                { name: '冥想坐垫', keyword: '冥想坐垫 禅修', icon: '🧘', label: '冥想' },
                { name: '绿植盆栽', keyword: '水培绿植 桌面', icon: '🌿', label: '绿植' },
            ],
        },
        en: {
            themeColor: 'Blue / Green (Water controls Fire)',
            tarotAdvice: 'Read your Cups — focus on inner feelings and connection, not conflict.',
            products: [
                { name: 'Lapis Lazuli Pendant', keyword: 'Lapis Lazuli Pendant', icon: '💎', label: 'Crystal' },
                { name: 'Blue Ceramic Tea Set', keyword: 'Blue Ceramic Tea Set', icon: '🍵', label: 'Tea' },
                { name: 'Aquamarine Bracelet', keyword: 'Aquamarine Bracelet', icon: '📿', label: 'Jewelry' },
                { name: 'Lavender Essential Oil', keyword: 'Lavender Essential Oil', icon: '💧', label: 'Wellness' },
                { name: 'Meditation Cushion', keyword: 'Meditation Zafu Cushion', icon: '🧘', label: 'Meditation' },
                { name: 'Desktop Plant', keyword: 'Desktop Water Plant', icon: '🌿', label: 'Plant' },
            ],
        },
    },
    earth: {
        zh: {
            themeColor: '绿 / 白 (木克土，金泻土)',
            tarotAdvice: '通过『权杖』和『愚人』牌，鼓励自己打破现状，迎接改变。',
            products: [
                { name: '孔雀石手链', keyword: '孔雀石手链', icon: '💎', label: '能量水晶' },
                { name: '室内绿植盆栽', keyword: '室内盆栽 绿植 桌面', icon: '🌿', label: '绿植' },
                { name: '绿幽灵水晶', keyword: '绿幽灵水晶 手链', icon: '📿', label: '能量饰品', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DGqWb6EzwGjpw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUThs4KPa5anb0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLtVFM%2BuyufadUtRoEzcIPVwtkyqhBb5%2B4HoaaUnJGJVONvdEmtnfnqGtZO2BV4ZqCW5DAmeSsWCuyxWC04Bz2%2B0hdfEOIyP8K2ytokgZbWCDjgeUD4holsk%2FuprW1TdmBLeMqtJBmsqDZGL0GbiMMd%2BWTbdK%2BKJxRXcsjipofTJ29Gf2zmUiveQ%3D%3D&union_lens=lensId%3APUB%401776088957%402135c191_0e27_19d8726c3da_278f%40021eOk1LeOz3cvDdT7CN4fZQ%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_14_177608895799110139353908%3Bscm%3A1007.30148.329090.pub_search-item_3f69a897-d577-42c5-b709-11529fdb99a2_' },
                { name: '抹茶礼盒', keyword: '抹茶礼盒 日式', icon: '🍵', label: '茶道' },
                { name: '竹制香插', keyword: '竹制香插 线香座', icon: '🎋', label: '香道' },
                { name: '翡翠平安扣', keyword: '翡翠平安扣 吊坠', icon: '🧿', label: '平安' },
            ],
        },
        en: {
            themeColor: 'Green / White (Wood controls Earth)',
            tarotAdvice: 'Draw from the Wands and the Fool — break free and embrace change.',
            products: [
                { name: 'Malachite Bracelet', keyword: 'Malachite Bracelet', icon: '💎', label: 'Crystal' },
                { name: 'Indoor Bonsai Plant', keyword: 'Indoor Bonsai Tree', icon: '🌿', label: 'Plant' },
                { name: 'Green Phantom Quartz', keyword: 'Green Phantom Quartz Bracelet', icon: '📿', label: 'Crystal' },
                { name: 'Matcha Gift Set', keyword: 'Matcha Tea Gift Set', icon: '🍵', label: 'Tea' },
                { name: 'Bamboo Incense Holder', keyword: 'Bamboo Incense Holder', icon: '🎋', label: 'Decor' },
                { name: 'Jade Pendant', keyword: 'Jade Donut Pendant', icon: '🧿', label: 'Jewelry' },
            ],
        },
    },
    default: {
        zh: {
            themeColor: '黄 / 金',
            tarotAdvice: '当前能量平衡，保持警觉，抽一张大阿卡那牌作为指引。',
            products: [
                { name: '白水晶柱', keyword: '白水晶柱 天然', icon: '💎', label: '能量水晶' },
                { name: '护肤套装礼盒', keyword: '护肤套装 礼盒', icon: '🧴', label: '护肤' },
                { name: '紫水晶洞', keyword: '紫水晶洞 摆件', icon: '💎', label: '摆件', affiliateUrl: 'https://uland.taobao.com/coupon/edetail?e=zoMc%2BWQ8aJilhHvvyUNXZfh8CuWt5YH5OVuOuRD5gLJMmdsrkidbOWgpcJRl3wFwcV%2FlEyhmp8B0cib5ugqsds0PWlZ8FPmFLThWU2sJBD1hn3Pu9MzHfXaL0TuUDZn2WlyYOqyu80U%2BQqs%2BOqWgVLhtWWjRAlP0YwOD23XOnRG3iabtJWruNyNnbrD79T7fTofvsbfU3zwhIMdCebK0eo81Nvpq24IImMHpNfYdHdAXFKGQBYiUE%2FFFzUHogwwlvbHJ%2Fki%2BjXBsnl3aBE22Yc1hxAla%2BjOlUkI0Iq%2BeTZmH%2BWWEbFCBmH3kgStyl2tPkOomLOc2xKFCf93k%2B%2Fb8Cm4XEKR%2BT0n3tVj9fvtxMzRVbrKqp4Yn8g%3D%3D&traceId=2150438e17760891213328156e13dd&union_lens=lensId%3APUB%401776089059%40212bcd02_0e16_19d87285278_d73d%4002CpWjiTZqM12T6RO0FOUsB%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_10_177608906002410139353908%3Bscm%3A1007.30148.329090.pub_search-item_c00b1c96-9463-416d-bb8f-55d327e3c10a_' },
                { name: '手工皂礼盒', keyword: '手工皂 天然 礼盒', icon: '🧼', label: '洗护' },
                { name: '龙泉青瓷杯', keyword: '龙泉青瓷杯', icon: '🍵', label: '茶道' },
                { name: '天然蜂蜡蜡烛', keyword: '天然蜂蜡蜡烛', icon: '🕯️', label: '香薰' },
            ],
        },
        en: {
            themeColor: 'Yellow / Gold',
            tarotAdvice: 'Energy is balanced — stay alert and draw a Major Arcana for guidance.',
            products: [
                { name: 'Clear Quartz Point', keyword: 'Clear Quartz Point', icon: '💎', label: 'Crystal' },
                { name: 'Skincare Gift Set', keyword: 'Skincare Gift Set', icon: '🧴', label: 'Skincare' },
                { name: 'Amethyst Geode', keyword: 'Amethyst Geode', icon: '💎', label: 'Crystal' },
                { name: 'Handmade Soap Set', keyword: 'Natural Handmade Soap Set', icon: '🧼', label: 'Bath' },
                { name: 'Celadon Tea Cup', keyword: 'Celadon Tea Cup', icon: '🍵', label: 'Tea' },
                { name: 'Beeswax Candle', keyword: 'Natural Beeswax Candle', icon: '🕯️', label: 'Candle' },
            ],
        },
    },
};

/** 从数组中随机选取 count 个元素 */
function pickRandom<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, arr.length));
}

/**
 * @description 根据运势结果生成实体产品推荐（从商品池中随机选取）。
 * @param count 返回的商品数量，默认 3
 */
export function getPhysicalAnchorRecommendation(
    result: FortuneResult,
    locale: Locale = 'zh',
    count: number = 3,
): PhysicalAnchorRecommendation {
    const key = ELEMENT_DATA[result.imbalanceElement] ? result.imbalanceElement : 'default';
    const data = ELEMENT_DATA[key][locale];
    const selected = pickRandom(data.products, count);

    return {
        themeColor: data.themeColor,
        tarotAdvice: data.tarotAdvice,
        products: selected.map(p => ({
            name: p.name,
            buyLink: p.affiliateUrl || generateAffiliateLink(p.keyword, locale),
            icon: p.icon,
            label: p.label,
        })),
    };
}
