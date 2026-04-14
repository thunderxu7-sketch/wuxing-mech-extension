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
                { name: '红色香薰蜡烛', keyword: '红色香薰蜡烛', icon: '🕯️', label: '香薰', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DwRN05XPSbdZw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUm37jwFDNJzL0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVL6Q0ErpNeTN2A9xCtex%2BMwQtkyqhBb5%2B4obOjWVXEiKjgmTCGK0RZWpLswx8Bb2QLyvRsx%2BhDSSLFWGvgsiLJcWxlwY%2FK42QX%2FIIVhCUBooTw2KD4ZcrX4HB6Jd9pUfrR1KilmKsn0wzOwDMfXFgMfhIjP5Uhv22UnpImARLBtH9DjuuuPKgHIcYl7w3%2FA2kb&union_lens=lensId%3APUB%401776140263%40212be615_0d75_19d8a35a226_bb52%40024TLckd3GCaWy58pRtoCmLD%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_5_177614026404310139353908%3Bscm%3A1007.30148.329090.pub_search-item_ddd89a8d-d835-40fa-a32d-e26d54722a9c_' },
                { name: '红玛瑙手串', keyword: '红玛瑙手串 开运', icon: '📿', label: '开运饰品', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DRkg1r3Vp67dw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUm8WHkx8YuKn0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLZyTYq%2BYo9ZzcWoKQKwxWO80Q9fK1X0Au0ItOGVs%2B65ktv3cN%2Fx87OO5Nou96IbGYcqJGZOzxhvBvEC5x4GzkuxqFhF4fKpEK0PVaaYaZIeyu0u9nLfyH02VNR0f%2Fi%2FgxkZn3A9FxdX5D8yWyZqALdH5%2BHJLMvTwDhNUj9p6E9PrGJe8N%2FwNpGw%3D%3D&union_lens=lensId%3APUB%401776140384%402146a131_215f_19d8a377739_8d0b%40026P07OX3Lq721Ynvw4eqD0e%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614038413210139353908%3Bscm%3A1007.30148.329090.pub_search-item_ce45b6ba-09b3-4a98-81fc-814f04b56faf_' },
                { name: '檀香线香', keyword: '檀香线香 天然', icon: '🪔', label: '空间净化', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DdhB8YEd9DJRw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUiekZQqjP4gn0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98wlWOLb8r1jM1FVI6Hlqs2%2FghrMZuPHvYZHxfsbtDfsFqbDHSKOmdbkNEgPaMP5KV225VtnygD87wyMjF6yY5CHo%2BjLdNKDUlkAlSsYsU5%2BZ8VBYLjnqLdVk8O%2F8hUsuhi%2B%2BryzNDkLWJP7qa1tU3ZgS3jKrSQZrKgXnBCysAKjNZ9vJOuERWROcYMXU3NNCg%2F&union_lens=lensId%3APUB%401776140419%400b50ed61_0dc8_19d8a380086_bc56%40021nwVIuEdND3ZuF0LlVmGVj%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_2_177614041928610139353908%3Bscm%3A1007.30148.329090.pub_search-item_0a286be4-dba7-41a4-900e-3e633a8cda76_' },
                { name: '石榴石吊坠', keyword: '石榴石吊坠', icon: '💍', label: '能量饰品', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DgjMVcFvNWuFw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUwNYsaaGXncn0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLBzKMtzG3UkS7870HTbScDgtkyqhBb5%2B4HoaaUnJGJVMpaoEzcoKDZWvHTsrnoVIcOF29Ygcu%2F%2BAj2icmv5wZxzCwsQOaulYm3OSiMp9Lu9Ocl%2FweMqvJE0LEkqTedE399KEV1g6mN9B%2FDUYvutpf1aL8XQyGxzLBxgxdTc00KD8%3D&union_lens=lensId%3APUB%401776140470%400bab0734_0e91_19d8a38c87e_c26e%40024liSXsXvCsh8LeozdlwppY%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_2_177614047047310139353908%3Bscm%3A1007.30148.329090.pub_search-item_e53feaec-3c8e-46fb-a072-0789c178ba65_' },
                { name: '红色丝绸眼罩', keyword: '真丝眼罩 红色', icon: '😴', label: '助眠', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3D7Ucws2n06%2Fxw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHU3R0q%2BFfh76v0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLeZBepxAtdMFzJ5qTEzj1yQtkyqhBb5%2B4HoaaUnJGJVP0Sb66CtFmv0RCcioI9tvrVpfGKKr19kjk1zXkvByfvrb%2Bm17tYWoTqQrcxI3fa5o%2Ftxfss5BQlrTO8hVXH49zb%2FnUHMQd61%2Fowb4Utuxieg4ZR%2FZafd2sOYQwrhPE0iw%3D&union_lens=lensId%3APUB%401776140498%40212bc550_0e2c_19d8a39349e_8469%4002481y8vsjR831zMsC425n5T%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614049813710139353908%3Bscm%3A1007.30148.329090.pub_search-item_6cb252f2-2e1c-4b7a-9b50-1b30f91845a3_' },
            ],
        },
        en: {
            themeColor: 'Red / Black (Fire controls Metal)',
            tarotAdvice: 'Examine your Swords cards — find the balance between action and restraint.',
            products: [
                { name: 'Black Obsidian Bracelet', keyword: 'Black Obsidian Bracelet', icon: '💎', label: 'Crystal', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3Dkhl0EL78ikNw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUhDqz0N12Bmb0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLDcsC9G%2BQCBI6fjAYKIHmwM0Q9fK1X0Au0ItOGVs%2B65ktv3cN%2Fx87OGZEBHtTGfZkwHpF%2FzUhH7fJfnh3wcUCBd0CPrQx4uTttTCYOc400ws0GeHdPmI2q4wmLWBgEm80VKxcI130SjE62eTPdbXr0pviRzN6McS7IUTRFVyU79zGJe8N%2FwNpGw%3D%3D&union_lens=lensId%3APUB%401776084884%40212be337_0f1d_19d86e89bb3_7d13%40023f16uR4iNYJcoTtaVp9DoZ%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_2_177608488446910139353908%3Bscm%3A1007.30148.329090.pub_search-item_b44ceeb0-2a24-46bb-b975-8a4609b96d6f_' },
                { name: 'Red Aromatherapy Candle', keyword: 'Red Aromatherapy Candle', icon: '🕯️', label: 'Aromatherapy', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DwRN05XPSbdZw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUm37jwFDNJzL0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVL6Q0ErpNeTN2A9xCtex%2BMwQtkyqhBb5%2B4obOjWVXEiKjgmTCGK0RZWpLswx8Bb2QLyvRsx%2BhDSSLFWGvgsiLJcWxlwY%2FK42QX%2FIIVhCUBooTw2KD4ZcrX4HB6Jd9pUfrR1KilmKsn0wzOwDMfXFgMfhIjP5Uhv22UnpImARLBtH9DjuuuPKgHIcYl7w3%2FA2kb&union_lens=lensId%3APUB%401776140263%40212be615_0d75_19d8a35a226_bb52%40024TLckd3GCaWy58pRtoCmLD%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_5_177614026404310139353908%3Bscm%3A1007.30148.329090.pub_search-item_ddd89a8d-d835-40fa-a32d-e26d54722a9c_' },
                { name: 'Red Agate Bracelet', keyword: 'Red Agate Bracelet', icon: '📿', label: 'Jewelry', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DRkg1r3Vp67dw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUm8WHkx8YuKn0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLZyTYq%2BYo9ZzcWoKQKwxWO80Q9fK1X0Au0ItOGVs%2B65ktv3cN%2Fx87OO5Nou96IbGYcqJGZOzxhvBvEC5x4GzkuxqFhF4fKpEK0PVaaYaZIeyu0u9nLfyH02VNR0f%2Fi%2FgxkZn3A9FxdX5D8yWyZqALdH5%2BHJLMvTwDhNUj9p6E9PrGJe8N%2FwNpGw%3D%3D&union_lens=lensId%3APUB%401776140384%402146a131_215f_19d8a377739_8d0b%40026P07OX3Lq721Ynvw4eqD0e%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614038413210139353908%3Bscm%3A1007.30148.329090.pub_search-item_ce45b6ba-09b3-4a98-81fc-814f04b56faf_' },
                { name: 'Sandalwood Incense', keyword: 'Sandalwood Incense Sticks', icon: '🪔', label: 'Purifier', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DdhB8YEd9DJRw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUiekZQqjP4gn0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98wlWOLb8r1jM1FVI6Hlqs2%2FghrMZuPHvYZHxfsbtDfsFqbDHSKOmdbkNEgPaMP5KV225VtnygD87wyMjF6yY5CHo%2BjLdNKDUlkAlSsYsU5%2BZ8VBYLjnqLdVk8O%2F8hUsuhi%2B%2BryzNDkLWJP7qa1tU3ZgS3jKrSQZrKgXnBCysAKjNZ9vJOuERWROcYMXU3NNCg%2F&union_lens=lensId%3APUB%401776140419%400b50ed61_0dc8_19d8a380086_bc56%40021nwVIuEdND3ZuF0LlVmGVj%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_2_177614041928610139353908%3Bscm%3A1007.30148.329090.pub_search-item_0a286be4-dba7-41a4-900e-3e633a8cda76_' },
                { name: 'Garnet Pendant', keyword: 'Garnet Pendant Necklace', icon: '💍', label: 'Jewelry', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DgjMVcFvNWuFw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUwNYsaaGXncn0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLBzKMtzG3UkS7870HTbScDgtkyqhBb5%2B4HoaaUnJGJVMpaoEzcoKDZWvHTsrnoVIcOF29Ygcu%2F%2BAj2icmv5wZxzCwsQOaulYm3OSiMp9Lu9Ocl%2FweMqvJE0LEkqTedE399KEV1g6mN9B%2FDUYvutpf1aL8XQyGxzLBxgxdTc00KD8%3D&union_lens=lensId%3APUB%401776140470%400bab0734_0e91_19d8a38c87e_c26e%40024liSXsXvCsh8LeozdlwppY%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_2_177614047047310139353908%3Bscm%3A1007.30148.329090.pub_search-item_e53feaec-3c8e-46fb-a072-0789c178ba65_' },
                { name: 'Silk Sleep Mask', keyword: 'Silk Eye Mask Red', icon: '😴', label: 'Sleep', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3D7Ucws2n06%2Fxw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHU3R0q%2BFfh76v0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLeZBepxAtdMFzJ5qTEzj1yQtkyqhBb5%2B4HoaaUnJGJVP0Sb66CtFmv0RCcioI9tvrVpfGKKr19kjk1zXkvByfvrb%2Bm17tYWoTqQrcxI3fa5o%2Ftxfss5BQlrTO8hVXH49zb%2FnUHMQd61%2Fowb4Utuxieg4ZR%2FZafd2sOYQwrhPE0iw%3D&union_lens=lensId%3APUB%401776140498%40212bc550_0e2c_19d8a39349e_8469%4002481y8vsjR831zMsC425n5T%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614049813710139353908%3Bscm%3A1007.30148.329090.pub_search-item_6cb252f2-2e1c-4b7a-9b50-1b30f91845a3_' },
            ],
        },
    },
    wood: {
        zh: {
            themeColor: '白 / 红 (金克木，火泻木)',
            tarotAdvice: '关注『权杖』牌组的能量，将生发之力转化为具体行动。',
            products: [
                { name: '白水晶簇摆件', keyword: '白水晶簇摆件', icon: '💎', label: '能量水晶', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3Ds1eEyW2JhjJw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHULo3%2FfOj61I%2F0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLaUqWGQsEs4emcwlv9D%2BndQtkyqhBb5%2B4HoaaUnJGJVM9B4xXEGTfTRsr5Fp%2FZmEfi4kZGuoAcmNmtIz17NKiZ0w1wO%2BIxWMMoZWXy1UcAG6RPKnGQOC7okLEkqTedE399KEV1g6mN9C6fA%2BHrN%2BXZpB4w3NmBKRkxgxdTc00KD8%3D&union_lens=lensId%3APUB%401776088720%40212bc550_0e2c_19d8723237d_1c31%40021Qbvsi9AqwHBMuNncO4qXU%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_6_177608872031810139353908%3Bscm%3A1007.30148.329090.pub_search-item_d02f6656-0ab0-4ad0-a7dc-da91dff36f95_' },
                { name: '艺术画册', keyword: '艺术画册 精装', icon: '📚', label: '文艺', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DPRhtCG%2B%2BSApw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHU4WPE%2Bn96wwv0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLPVqz10TzFEBRjuGtQx7KxIwe6%2FtGg2%2FRjN4f8DSxNxs%2B1NdYRNI4dEvr%2B3qRDVy1%2BI2LrZVltblHAH86SHg6ngd%2BP8MhM8BO6Atz3nGxts4HP%2FXOMuda2I%2BDKwFLEd9Q5dUsQ8NYvbi3qhVp%2FhmjV8a6ZXxTGW41IYULNg46oBA%3D&union_lens=lensId%3APUB%401776140672%402166c290_20ea_19d8a3bde42_3791%400267t34pAD6pusTKPaZxYsTv%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614067267510139353908%3Bscm%3A1007.30148.329090.pub_search-item_f1307dcb-3f0f-4cb0-b40b-b0061c7f1bb3_' },
                { name: '金属风铃', keyword: '金属风铃 日式', icon: '🔔', label: '家居', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DX7aq%2FFyu42Bw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHU8jwb3zplijz0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLgSMjWPZJ7tz%2F8GICAuOwCIwe6%2FtGg2%2FRjN4f8DSxNxtMrp04zBOFjsssTELAROZGV3l2Iu8%2Bm0s1YAyXuVhdvFjSbDG3VSkZIS8ttlpIVw45S3zdURIrEE%2FuprW1TdmBLeMqtJBmsqAsHEAzMni0XRWCZ7xx8IDBcSpj5qSCmbA%3D&union_lens=lensId%3APUB%401776140766%400b51ab32_20c0_19d8a3d4e93_62eb%40026gZgTBvYIex9EspQhYOpqF%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614076696710139353908%3Bscm%3A1007.30148.329090.pub_search-item_8e54b165-3b73-442c-b7b2-09704496a484_' },
                { name: '银饰手链', keyword: '纯银手链 简约', icon: '💍', label: '饰品', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3D5CSarcGhCxZw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHU5Ast6vCRVbb0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVL9VngjiYJEKTUT4DroWkj9AtkyqhBb5%2B4HoaaUnJGJVO9i4b2TLA1QTQ0wId0iKdyHuYyvXLuPvdESORK1PlAU0hdfEOIyP8KsMysnrlzEB1kDmW95pnKsU%2FuprW1TdmBLeMqtJBmsqDo1bW%2Fw%2BCuij5Dq8YsjkNrcSpj5qSCmbA%3D&union_lens=lensId%3APUB%401776140825%402107659b_20cf_19d8a3e352a_88d6%400277a6idooiVFZqCuQYw26rm%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614082597510139353908%3Bscm%3A1007.30148.329090.pub_search-item_3bbf9ad8-f917-4c95-b6dd-97f60635052c_' },
                { name: '白茶礼盒', keyword: '白茶礼盒 福鼎', icon: '🍵', label: '茶道', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DPUoJJJcBIddw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHU0Reqlp%2B6qvT0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLU8sKzY0s5i%2FJeO70kx8kx4we6%2FtGg2%2FRjN4f8DSxNxvA3I6TBg4uL7bXMEvWDHlCTRoT1uL%2F0GGq0mTceeIhlxcKfiKDY4JHl1VvxGI%2FgKJwVji67yTPzU%2FuprW1TdmBLeMqtJBmsqC26TmGpkfDUjy6f8DwVpojcSpj5qSCmbA%3D&union_lens=lensId%3APUB%401776140852%402146989a_0d48_19d8a3e9bc6_3d99%40025g8HshL2vsMtXvyvruMsm0%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_2_177614085223510139353908%3Bscm%3A1007.30148.329090.pub_search-item_d13d94f8-a769-4d8f-8093-42ddf9d54992_' },
                { name: '陶瓷香薰炉', keyword: '陶瓷香薰炉 复古', icon: '🏺', label: '香薰', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DP5xWuFamdFBw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUI5iF%2FJFvbzf0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLetBrP2ibX0uHpyvhjAUQEIwe6%2FtGg2%2FR0g4t7YZScZYrcaRkM8Lj7G3YVYdYSx8fuggWNL%2FFOEbzzZV1DADrRo2o0b5SBwzVD0kUek5srm8HOLIC5HDqgoV1ZnOa5Y9scHol32lR%2BtHUqKWYqyfTDM7AMx9cWAx%2BsU4wsphhniikB7EwvZLmIXEqY%2Bakgpmw&union_lens=lensId%3APUB%401776140917%40212c520b_242c_19d8a3f9a0c_94c4%40025QrFWvSHeSt0e73a2GGST0%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614091733810139353908%3Bscm%3A1007.30148.329090.pub_search-item_dab29ce2-90cc-40f9-b23b-4bdcad965fb5_' },
            ],
        },
        en: {
            themeColor: 'White / Red (Metal controls Wood)',
            tarotAdvice: 'Focus on your Wands — channel growth energy into concrete action.',
            products: [
                { name: 'Clear Quartz Cluster', keyword: 'Clear Quartz Cluster', icon: '💎', label: 'Crystal', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3Ds1eEyW2JhjJw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHULo3%2FfOj61I%2F0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLaUqWGQsEs4emcwlv9D%2BndQtkyqhBb5%2B4HoaaUnJGJVM9B4xXEGTfTRsr5Fp%2FZmEfi4kZGuoAcmNmtIz17NKiZ0w1wO%2BIxWMMoZWXy1UcAG6RPKnGQOC7okLEkqTedE399KEV1g6mN9C6fA%2BHrN%2BXZpB4w3NmBKRkxgxdTc00KD8%3D&union_lens=lensId%3APUB%401776088720%40212bc550_0e2c_19d8723237d_1c31%40021Qbvsi9AqwHBMuNncO4qXU%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_6_177608872031810139353908%3Bscm%3A1007.30148.329090.pub_search-item_d02f6656-0ab0-4ad0-a7dc-da91dff36f95_' },
                { name: 'Fine Art Book', keyword: 'Coffee Table Art Book', icon: '📚', label: 'Art', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DPRhtCG%2B%2BSApw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHU4WPE%2Bn96wwv0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLPVqz10TzFEBRjuGtQx7KxIwe6%2FtGg2%2FRjN4f8DSxNxs%2B1NdYRNI4dEvr%2B3qRDVy1%2BI2LrZVltblHAH86SHg6ngd%2BP8MhM8BO6Atz3nGxts4HP%2FXOMuda2I%2BDKwFLEd9Q5dUsQ8NYvbi3qhVp%2FhmjV8a6ZXxTGW41IYULNg46oBA%3D&union_lens=lensId%3APUB%401776140672%402166c290_20ea_19d8a3bde42_3791%400267t34pAD6pusTKPaZxYsTv%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614067267510139353908%3Bscm%3A1007.30148.329090.pub_search-item_f1307dcb-3f0f-4cb0-b40b-b0061c7f1bb3_' },
                { name: 'Metal Wind Chime', keyword: 'Metal Wind Chime', icon: '🔔', label: 'Home', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DX7aq%2FFyu42Bw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHU8jwb3zplijz0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLgSMjWPZJ7tz%2F8GICAuOwCIwe6%2FtGg2%2FRjN4f8DSxNxtMrp04zBOFjsssTELAROZGV3l2Iu8%2Bm0s1YAyXuVhdvFjSbDG3VSkZIS8ttlpIVw45S3zdURIrEE%2FuprW1TdmBLeMqtJBmsqAsHEAzMni0XRWCZ7xx8IDBcSpj5qSCmbA%3D&union_lens=lensId%3APUB%401776140766%400b51ab32_20c0_19d8a3d4e93_62eb%40026gZgTBvYIex9EspQhYOpqF%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614076696710139353908%3Bscm%3A1007.30148.329090.pub_search-item_8e54b165-3b73-442c-b7b2-09704496a484_' },
                { name: 'Silver Bracelet', keyword: 'Sterling Silver Bracelet', icon: '💍', label: 'Jewelry', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3D5CSarcGhCxZw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHU5Ast6vCRVbb0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVL9VngjiYJEKTUT4DroWkj9AtkyqhBb5%2B4HoaaUnJGJVO9i4b2TLA1QTQ0wId0iKdyHuYyvXLuPvdESORK1PlAU0hdfEOIyP8KsMysnrlzEB1kDmW95pnKsU%2FuprW1TdmBLeMqtJBmsqDo1bW%2Fw%2BCuij5Dq8YsjkNrcSpj5qSCmbA%3D&union_lens=lensId%3APUB%401776140825%402107659b_20cf_19d8a3e352a_88d6%400277a6idooiVFZqCuQYw26rm%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614082597510139353908%3Bscm%3A1007.30148.329090.pub_search-item_3bbf9ad8-f917-4c95-b6dd-97f60635052c_' },
                { name: 'White Tea Gift Set', keyword: 'White Tea Gift Set', icon: '🍵', label: 'Tea', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DPUoJJJcBIddw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHU0Reqlp%2B6qvT0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLU8sKzY0s5i%2FJeO70kx8kx4we6%2FtGg2%2FRjN4f8DSxNxvA3I6TBg4uL7bXMEvWDHlCTRoT1uL%2F0GGq0mTceeIhlxcKfiKDY4JHl1VvxGI%2FgKJwVji67yTPzU%2FuprW1TdmBLeMqtJBmsqC26TmGpkfDUjy6f8DwVpojcSpj5qSCmbA%3D&union_lens=lensId%3APUB%401776140852%402146989a_0d48_19d8a3e9bc6_3d99%40025g8HshL2vsMtXvyvruMsm0%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_2_177614085223510139353908%3Bscm%3A1007.30148.329090.pub_search-item_d13d94f8-a769-4d8f-8093-42ddf9d54992_' },
                { name: 'Ceramic Incense Burner', keyword: 'Ceramic Incense Burner', icon: '🏺', label: 'Decor', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DP5xWuFamdFBw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUI5iF%2FJFvbzf0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLetBrP2ibX0uHpyvhjAUQEIwe6%2FtGg2%2FR0g4t7YZScZYrcaRkM8Lj7G3YVYdYSx8fuggWNL%2FFOEbzzZV1DADrRo2o0b5SBwzVD0kUek5srm8HOLIC5HDqgoV1ZnOa5Y9scHol32lR%2BtHUqKWYqyfTDM7AMx9cWAx%2BsU4wsphhniikB7EwvZLmIXEqY%2Bakgpmw&union_lens=lensId%3APUB%401776140917%40212c520b_242c_19d8a3f9a0c_94c4%40025QrFWvSHeSt0e73a2GGST0%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614091733810139353908%3Bscm%3A1007.30148.329090.pub_search-item_dab29ce2-90cc-40f9-b23b-4bdcad965fb5_' },
            ],
        },
    },
    water: {
        zh: {
            themeColor: '黄 / 紫 (土克水，金生水)',
            tarotAdvice: '冥想与『五芒星』牌组，让财务和现实基础更加稳固。',
            products: [
                { name: '黄水晶摆件', keyword: '黄水晶摆件 招财', icon: '💎', label: '能量水晶', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DdSqsHB4lj3lw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUTiiWs4bppE70JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98wlWOLb8r1jM1FVI6Hlqs2%2FghrMZuPHvYZHxfsbtDfsFpFgNgzmOJ4wxTpRVkF7x0iskmx5kiO8DrXn%2F66GKkZXQ82zn6HusAGbf2YPRAd8wFGH7BauBr0UEMgi1hPnPMLb%2FuhkgjJWXKsTnO4OSaXUaCpjGLtXU6FT%2B6mtbVN2YEt4yq0kGayoNkYvQZuIwx3oGeIQL4Fi9E1N%2FsL%2B8ShgtZXQod4ayHIcSpj5qSCmbA%3D&union_lens=lensId%3APUB%401776141098%40213298c5_0e99_19d8a425ed7_1bc7%40025ubZgHnEveA7ueMrGywa1u%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_2_177614109878510139353908%3Bscm%3A1007.30148.329090.pub_search-item_cb5171b0-9e36-41d5-9007-5a4fbcd688ac_' },
                { name: '星座周边礼物', keyword: '星座礼物 摩羯座 金牛座', icon: '♑', label: '星座', affiliateUrl: 'https://uland.taobao.com/coupon/edetail?e=ARCDmV68fk%2BlhHvvyUNXZfh8CuWt5YH5OVuOuRD5gLJMmdsrkidbOUV9IBA4kmjLcLrjAQ7w7zV9QSyQL9J451Ydf3J7zEBvPXfX%2B1BXC7bCTXNu1J7%2FdR9EgFfyshkY6xr1xWaBuZnLkU4k%2FaBIVS9H%2FUE0utEJwtFbZ3TGWYkgLPRJMBwy22q0Px35Y87CPnU7c2%2BfZOsN%2BoQUE6FNzIJzeKzMXBKS%2FtRlV2x5i9haV1P9LaQGi91U8ThGeLgm9FeeirPWMC48ivXaHkwUbNtEidsHLvb2JaZi%2FPgpUzx1Y7r0DeIGKlVh%2FI4ELVW5hIkz5M1CZ9W8nXT12U5%2BryUzVkkdwsIm&traceId=213e01d717761412045075288e0c04&union_lens=lensId%3APUB%401776141168%40212bf332_31d4_19d8a436eeb_c055%40022bNgarDdgfeVZy2uvPW3yK%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_3_177614116843710139353908%3Bscm%3A1007.30148.329090.pub_search-item_0f505745-c0fc-41c7-b127-bcb3897d3bce_' },
                { name: '虎眼石手链', keyword: '虎眼石手链', icon: '📿', label: '能量饰品', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DVo%2F9wqwxG8Nw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUBcKmkkyArxL0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLNeP%2FC0GK28OnCCH%2FMSFuGgtkyqhBb5%2B4HoaaUnJGJVMZKzyQwMx7KLFX0S0UkPDJ4KD%2Fp87vqdh1DcSooncqgvAZjMPuUUggKfZqRvUd%2BjbewPOkfKGa7kLEkqTedE399KEV1g6mN9Bh0O3Rc5H%2FprWCuPqUucK9WkceTTmbJx5NpORCvXz2yA%3D%3D&union_lens=lensId%3APUB%401776088755%40212bbff9_0d6c_19d8723aed3_8d24%40021WVN24QahyMYMFd7LrxSO4%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_3_177608875599110139353908%3Bscm%3A1007.30148.329090.pub_search-item_ce9bb3d9-43a8-4c4f-87b3-1789ee29d2f1_' },
                { name: '沉香手串', keyword: '沉香手串 天然', icon: '📿', label: '养生', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DKg2d787S2f9w4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUMY%2ByJsY8sp30JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLyBOD6xb0dQgJ3bH4VPbH5f1SarTXhIOTsgIpc1WFZiJNubylQlnZtwOA7aQj6TFF4GlTk%2FA0R7xxScQbkyiB3VkJPyYbMO1yCmBWtFDvvIuQyYvlt4YTLeEVD%2BYo9gn1cHol32lR%2BtHUqKWYqyfTDL6tMwNK56WvfsWdRBYyds4hhQs2DjqgEA%3D%3D&union_lens=lensId%3APUB%401776141226%40213cd400_2152_19d8a4450ad_85e9%40023Cx4IbMZhMJWh9hglDmoSa%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614122623610139353908%3Bscm%3A1007.30148.329090.pub_search-item_e8491229-4619-49ac-ad23-f8403d115814_' },
                { name: '黄铜摆件', keyword: '黄铜摆件 招财', icon: '🪙', label: '风水', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3Ds6bLsmcTkDBw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUTl8oxk4kTyf0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLthV%2F82DnIWEK6Ec9l3fCfs0Q9fK1X0AuhLjO8JFSuq56pd6thmMAss%2FH4svOXJkahUe7aA5Mzzx4egErhFBlgewEXzYHC9AnISED%2FpwADxwnF2RQbb78x0%2FuprW1TdmBLeMqtJBmsqDZGL0GbiMMd6BniEC%2BBYvRUNncIYxgkbgtYrMrYDbaJnEqY%2Bakgpmw&union_lens=lensId%3APUB%401776141252%40212bf5a3_23de_19d8a44b89a_c954%40025KiOfuUanV12Wj5EUWiKZC%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_3_177614125284310139353908%3Bscm%3A1007.30148.329090.pub_search-item_90c49e92-6cde-4e6f-8f97-dd976bfe00fe_' },
                { name: '普洱茶饼', keyword: '普洱茶饼 礼盒', icon: '🍵', label: '茶道', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3Dop2oiDyZpj5w4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUKqlqa0JLl6f0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98wlWOLb8r1jM1FVI6Hlqs2%2FghrMZuPHvYZHxfsbtDfsFp3yYBMh%2BLz%2FF3jjWJ%2BPK36jB7r%2B0aDb9GM3h%2FwNLE3G2oHN5bp66vHkrvvvuhcGKF%2BqYQXV1Uyamx7vcDNIuXVDdBcQtPCX2P%2FVSp3%2FmGg5TwiyPhpHPKOQsSSpN50Tf30oRXWDqY30ECPQVOg9Qgq7tkDfS%2FXFtvGDF1NzTQoPw%3D%3D&union_lens=lensId%3APUB%401776141308%40213111b6_2ef5_19d8a459253_1d87%40024KyqxVBILS9dwQY3FYl8HO%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_5_177614130857110139353908%3Bscm%3A1007.30148.329090.pub_search-item_fcf09439-4c8c-4ecb-aaf7-e1b211342aec_' },
            ],
        },
        en: {
            themeColor: 'Yellow / Purple (Earth controls Water)',
            tarotAdvice: 'Meditate on your Pentacles — strengthen your material foundations.',
            products: [
                { name: 'Citrine Crystal', keyword: 'Citrine Crystal Decor', icon: '💎', label: 'Crystal', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DdSqsHB4lj3lw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUTiiWs4bppE70JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98wlWOLb8r1jM1FVI6Hlqs2%2FghrMZuPHvYZHxfsbtDfsFpFgNgzmOJ4wxTpRVkF7x0iskmx5kiO8DrXn%2F66GKkZXQ82zn6HusAGbf2YPRAd8wFGH7BauBr0UEMgi1hPnPMLb%2FuhkgjJWXKsTnO4OSaXUaCpjGLtXU6FT%2B6mtbVN2YEt4yq0kGayoNkYvQZuIwx3oGeIQL4Fi9E1N%2FsL%2B8ShgtZXQod4ayHIcSpj5qSCmbA%3D&union_lens=lensId%3APUB%401776141098%40213298c5_0e99_19d8a425ed7_1bc7%40025ubZgHnEveA7ueMrGywa1u%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_2_177614109878510139353908%3Bscm%3A1007.30148.329090.pub_search-item_cb5171b0-9e36-41d5-9007-5a4fbcd688ac_' },
                { name: 'Zodiac Gifts', keyword: 'Zodiac Sign Gift Set', icon: '♑', label: 'Zodiac', affiliateUrl: 'https://uland.taobao.com/coupon/edetail?e=ARCDmV68fk%2BlhHvvyUNXZfh8CuWt5YH5OVuOuRD5gLJMmdsrkidbOUV9IBA4kmjLcLrjAQ7w7zV9QSyQL9J451Ydf3J7zEBvPXfX%2B1BXC7bCTXNu1J7%2FdR9EgFfyshkY6xr1xWaBuZnLkU4k%2FaBIVS9H%2FUE0utEJwtFbZ3TGWYkgLPRJMBwy22q0Px35Y87CPnU7c2%2BfZOsN%2BoQUE6FNzIJzeKzMXBKS%2FtRlV2x5i9haV1P9LaQGi91U8ThGeLgm9FeeirPWMC48ivXaHkwUbNtEidsHLvb2JaZi%2FPgpUzx1Y7r0DeIGKlVh%2FI4ELVW5hIkz5M1CZ9W8nXT12U5%2BryUzVkkdwsIm&traceId=213e01d717761412045075288e0c04&union_lens=lensId%3APUB%401776141168%40212bf332_31d4_19d8a436eeb_c055%40022bNgarDdgfeVZy2uvPW3yK%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_3_177614116843710139353908%3Bscm%3A1007.30148.329090.pub_search-item_0f505745-c0fc-41c7-b127-bcb3897d3bce_' },
                { name: 'Tiger Eye Bracelet', keyword: 'Tiger Eye Stone Bracelet', icon: '📿', label: 'Jewelry', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DVo%2F9wqwxG8Nw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUBcKmkkyArxL0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLNeP%2FC0GK28OnCCH%2FMSFuGgtkyqhBb5%2B4HoaaUnJGJVMZKzyQwMx7KLFX0S0UkPDJ4KD%2Fp87vqdh1DcSooncqgvAZjMPuUUggKfZqRvUd%2BjbewPOkfKGa7kLEkqTedE399KEV1g6mN9Bh0O3Rc5H%2FprWCuPqUucK9WkceTTmbJx5NpORCvXz2yA%3D%3D&union_lens=lensId%3APUB%401776088755%40212bbff9_0d6c_19d8723aed3_8d24%40021WVN24QahyMYMFd7LrxSO4%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_3_177608875599110139353908%3Bscm%3A1007.30148.329090.pub_search-item_ce9bb3d9-43a8-4c4f-87b3-1789ee29d2f1_' },
                { name: 'Agarwood Bracelet', keyword: 'Agarwood Bead Bracelet', icon: '📿', label: 'Wellness', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DKg2d787S2f9w4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUMY%2ByJsY8sp30JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLyBOD6xb0dQgJ3bH4VPbH5f1SarTXhIOTsgIpc1WFZiJNubylQlnZtwOA7aQj6TFF4GlTk%2FA0R7xxScQbkyiB3VkJPyYbMO1yCmBWtFDvvIuQyYvlt4YTLeEVD%2BYo9gn1cHol32lR%2BtHUqKWYqyfTDL6tMwNK56WvfsWdRBYyds4hhQs2DjqgEA%3D%3D&union_lens=lensId%3APUB%401776141226%40213cd400_2152_19d8a4450ad_85e9%40023Cx4IbMZhMJWh9hglDmoSa%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614122623610139353908%3Bscm%3A1007.30148.329090.pub_search-item_e8491229-4619-49ac-ad23-f8403d115814_' },
                { name: 'Brass Decor', keyword: 'Brass Feng Shui Decor', icon: '🪙', label: 'Feng Shui', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3Ds6bLsmcTkDBw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUTl8oxk4kTyf0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLthV%2F82DnIWEK6Ec9l3fCfs0Q9fK1X0AuhLjO8JFSuq56pd6thmMAss%2FH4svOXJkahUe7aA5Mzzx4egErhFBlgewEXzYHC9AnISED%2FpwADxwnF2RQbb78x0%2FuprW1TdmBLeMqtJBmsqDZGL0GbiMMd6BniEC%2BBYvRUNncIYxgkbgtYrMrYDbaJnEqY%2Bakgpmw&union_lens=lensId%3APUB%401776141252%40212bf5a3_23de_19d8a44b89a_c954%40025KiOfuUanV12Wj5EUWiKZC%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_3_177614125284310139353908%3Bscm%3A1007.30148.329090.pub_search-item_90c49e92-6cde-4e6f-8f97-dd976bfe00fe_' },
                { name: 'Pu-erh Tea Cake', keyword: 'Pu erh Tea Gift', icon: '🍵', label: 'Tea', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3Dop2oiDyZpj5w4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUKqlqa0JLl6f0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98wlWOLb8r1jM1FVI6Hlqs2%2FghrMZuPHvYZHxfsbtDfsFp3yYBMh%2BLz%2FF3jjWJ%2BPK36jB7r%2B0aDb9GM3h%2FwNLE3G2oHN5bp66vHkrvvvuhcGKF%2BqYQXV1Uyamx7vcDNIuXVDdBcQtPCX2P%2FVSp3%2FmGg5TwiyPhpHPKOQsSSpN50Tf30oRXWDqY30ECPQVOg9Qgq7tkDfS%2FXFtvGDF1NzTQoPw%3D%3D&union_lens=lensId%3APUB%401776141308%40213111b6_2ef5_19d8a459253_1d87%40024KyqxVBILS9dwQY3FYl8HO%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_5_177614130857110139353908%3Bscm%3A1007.30148.329090.pub_search-item_fcf09439-4c8c-4ecb-aaf7-e1b211342aec_' },
            ],
        },
    },
    fire: {
        zh: {
            themeColor: '蓝 / 绿 (水克火，木生火)',
            tarotAdvice: '多加解读『圣杯』牌组，关注内心感受与情感交流，而非外部冲突。',
            products: [
                { name: '青金石吊坠', keyword: '青金石吊坠', icon: '💎', label: '能量水晶', affiliateUrl: 'https://uland.taobao.com/coupon/edetail?e=TOzXfATvseylhHvvyUNXZfh8CuWt5YH5OVuOuRD5gLJMmdsrkidbOUV9IBA4kmjLjX6u4gQjg07%2B990%2B0ZiVPgDxwCibSFT0q1WeOttOaVHdjIeMPvYYgWYjoS%2FRclnBFwh3n1cZVdT0TcIixZTmmAcY88rbnPan2cFY6qAkBQtBJFJ%2BvjUN8m%2Frt%2BspMttjhjn4fLE73H9xUotHfuSr5zYSpnuMU%2Fc8pBG9lsg%2B0WT%2F4%2B6ITVwjHtkLn2gf99qktxl6Um37OPIfOAcNvzjA3lB4Gw2WBae6cH8LbDF%2B5nGUP1f83blmHh6hRiUSpFFbbhcQpH5PSfe1WP1%2B%2B3EzNFVusqqnhify&traceId=213e06d717761370995304627e0cc5&union_lens=lensId%3APUB%401776137081%40212c85de_0e0a_19d8a0512b5_b018%40027Vh2496eJZhCAWyCWk5tx3%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_7_177613708160410139353908%3Bscm%3A1007.30148.329090.pub_search-item_495bc03e-6ed1-4b2d-897d-be181c1bd73b_' },
                { name: '蓝色陶瓷茶具', keyword: '蓝色陶瓷茶具套装', icon: '🍵', label: '茶道', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3D7Ba1jFz%2BFABw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUPI1L5bVBB030JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLx%2FMd7ri6eXScoSgtBYRinwtkyqhBb5%2B4tXsyH%2FO6UgQtCX2YSKt8j0BS%2FOdh8SCdIfHIaPspENP1VHqA6VcFXbmOuEpKKeJ8ROXGjhqK27%2F3FX0mGR%2FnRTkb2y5FhJT0QsSSpN50Tf30oRXWDqY30GHQ7dFzkf%2BmnRdNoCC27M%2BiEloDhgpOJGRsSsXPAUZ0&union_lens=lensId%3APUB%401776141659%400b8f3016_23f3_19d8a4aeebe_d598%40027O5J9ovr899g1LBCFlB5pm%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_3_177614165989410139353908%3Bscm%3A1007.30148.329090.pub_search-item_fe9a045f-e142-49cf-8c60-0b1546087b1f_' },
                { name: '海蓝宝手链', keyword: '海蓝宝手链', icon: '📿', label: '能量饰品', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DTSjyH%2BfX%2Fypw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUp9dCwUE8oFX0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVL671XaqBVwHJG455dNfSZY4we6%2FtGg2%2FRjN4f8DSxNxvD00bcoqFfFdQJSQB0BCe21G8%2FGY4n8ldiWKoVFv9xSa1TDW0VBqkBLajC%2FxyX0Ex7%2FpbD9RloQkLEkqTedE399KEV1g6mN9CW2PnFXEAduihMhgNzfu6WxgxdTc00KD8%3D&union_lens=lensId%3APUB%401776141703%40216673e2_0e51_19d8a4b98c8_24eb%40028fvquXxkyX0JxUJeQYFzE%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_2_177614170344310139353908%3Bscm%3A1007.30148.329090.pub_search-item_1dac01f9-946c-441e-8202-b7bd563bb375_' },
                { name: '薰衣草精油', keyword: '薰衣草精油 天然', icon: '💧', label: '舒缓', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3Dgxhxsi4DUAhw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUNJRSu19kyQP0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLsUOwqzTHLBPreUhX2X%2BLG3htMb8KUGhi%2F05gtY%2B2i1gCZ9jfl7x7Glny2JeCZvR%2FoMIPYmEXTwKTLyVBV%2BDAzqM70AliNjwJcn7ARWQ6ocXvjhy6YrkR84yrqKBBMrypVqSTbQ2AsHk%3D&union_lens=lensId%3APUB%401776141733%40213fef3d_0e7b_19d8a4c0efc_3a7b%40025pdPwXCLG5bMmRl7pffcRJ%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_4_177614173371510139353908%3Bscm%3A1007.30148.329090.pub_search-item_5dd7a40a-7123-43e4-820b-2e5788b71a4a_' },
                { name: '冥想坐垫', keyword: '冥想坐垫 禅修', icon: '🧘', label: '冥想', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3D5ZwyNGSbZAlw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUSZPkucg%2FvEb0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVL5h%2FAFE%2BthCdpHuOum593ZQtkyqhBb5%2B4tXsyH%2FO6UgQtCX2YSKt8jzqwmpvh6vyCF4aQIBA5h8e%2FzAQIdFlwUjBlhzALYuglqGsybxN%2BuLGmVLaVC0SVJOm5IOgipYWnT%2B6mtbVN2YEt4yq0kGayoNkYvQZuIwx39ITxaE7ooIZPw5LRNNR23zmEMK4TxNIs&union_lens=lensId%3APUB%401776141763%4021050a22_2f19_19d8a4c8239_4caa%40026zOGEb33bCRPk336feCmfB%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_1_177614176320910139353908%3Bscm%3A1007.30148.329090.pub_search-item_a1e9c386-361c-43ba-abb4-cfbbb03c8440_' },
                { name: '绿植盆栽', keyword: '水培绿植 桌面', icon: '🌿', label: '绿植', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DLCvI6o3YZsNw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHU3OUKNwuXvsb0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLqSy8TEjfGNfQB31PCSfHzc0Q9fK1X0Au0ItOGVs%2B65ktv3cN%2Fx87OPaMb3w54c21%2F7kZyM%2FhFgFlKXrv4r1i4Y8aUTrVXAVPFMdUYAIZ9Kj7ZWSIsVPFk6M70AliNjwJcn7ARWQ6ocUJA%2BdPqoJCT0D%2BQFtGI91HRS1ySxTnVcA%3D&union_lens=lensId%3APUB%401776141790%40213d58eb_217f_19d8a4cec93_4f40%40026BSL14Ga6uqRS2vCZKnwm4%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_2_177614179042710139353908%3Bscm%3A1007.30148.329090.pub_search-item_e6e71464-7e5f-4059-8ad8-6d5a4a23bae1_' },
            ],
        },
        en: {
            themeColor: 'Blue / Green (Water controls Fire)',
            tarotAdvice: 'Read your Cups — focus on inner feelings and connection, not conflict.',
            products: [
                { name: 'Lapis Lazuli Pendant', keyword: 'Lapis Lazuli Pendant', icon: '💎', label: 'Crystal', affiliateUrl: 'https://uland.taobao.com/coupon/edetail?e=TOzXfATvseylhHvvyUNXZfh8CuWt5YH5OVuOuRD5gLJMmdsrkidbOUV9IBA4kmjLjX6u4gQjg07%2B990%2B0ZiVPgDxwCibSFT0q1WeOttOaVHdjIeMPvYYgWYjoS%2FRclnBFwh3n1cZVdT0TcIixZTmmAcY88rbnPan2cFY6qAkBQtBJFJ%2BvjUN8m%2Frt%2BspMttjhjn4fLE73H9xUotHfuSr5zYSpnuMU%2Fc8pBG9lsg%2B0WT%2F4%2B6ITVwjHtkLn2gf99qktxl6Um37OPIfOAcNvzjA3lB4Gw2WBae6cH8LbDF%2B5nGUP1f83blmHh6hRiUSpFFbbhcQpH5PSfe1WP1%2B%2B3EzNFVusqqnhify&traceId=213e06d717761370995304627e0cc5&union_lens=lensId%3APUB%401776137081%40212c85de_0e0a_19d8a0512b5_b018%40027Vh2496eJZhCAWyCWk5tx3%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_7_177613708160410139353908%3Bscm%3A1007.30148.329090.pub_search-item_495bc03e-6ed1-4b2d-897d-be181c1bd73b_' },
                { name: 'Blue Ceramic Tea Set', keyword: 'Blue Ceramic Tea Set', icon: '🍵', label: 'Tea', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3D7Ba1jFz%2BFABw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUPI1L5bVBB030JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLx%2FMd7ri6eXScoSgtBYRinwtkyqhBb5%2B4tXsyH%2FO6UgQtCX2YSKt8j0BS%2FOdh8SCdIfHIaPspENP1VHqA6VcFXbmOuEpKKeJ8ROXGjhqK27%2F3FX0mGR%2FnRTkb2y5FhJT0QsSSpN50Tf30oRXWDqY30GHQ7dFzkf%2BmnRdNoCC27M%2BiEloDhgpOJGRsSsXPAUZ0&union_lens=lensId%3APUB%401776141659%400b8f3016_23f3_19d8a4aeebe_d598%40027O5J9ovr899g1LBCFlB5pm%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_3_177614165989410139353908%3Bscm%3A1007.30148.329090.pub_search-item_fe9a045f-e142-49cf-8c60-0b1546087b1f_' },
                { name: 'Aquamarine Bracelet', keyword: 'Aquamarine Bracelet', icon: '📿', label: 'Jewelry', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DTSjyH%2BfX%2Fypw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUp9dCwUE8oFX0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVL671XaqBVwHJG455dNfSZY4we6%2FtGg2%2FRjN4f8DSxNxvD00bcoqFfFdQJSQB0BCe21G8%2FGY4n8ldiWKoVFv9xSa1TDW0VBqkBLajC%2FxyX0Ex7%2FpbD9RloQkLEkqTedE399KEV1g6mN9CW2PnFXEAduihMhgNzfu6WxgxdTc00KD8%3D&union_lens=lensId%3APUB%401776141703%40216673e2_0e51_19d8a4b98c8_24eb%40028fvquXxkyX0JxUJeQYFzE%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_2_177614170344310139353908%3Bscm%3A1007.30148.329090.pub_search-item_1dac01f9-946c-441e-8202-b7bd563bb375_' },
                { name: 'Lavender Essential Oil', keyword: 'Lavender Essential Oil', icon: '💧', label: 'Wellness', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3Dgxhxsi4DUAhw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUNJRSu19kyQP0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLsUOwqzTHLBPreUhX2X%2BLG3htMb8KUGhi%2F05gtY%2B2i1gCZ9jfl7x7Glny2JeCZvR%2FoMIPYmEXTwKTLyVBV%2BDAzqM70AliNjwJcn7ARWQ6ocXvjhy6YrkR84yrqKBBMrypVqSTbQ2AsHk%3D&union_lens=lensId%3APUB%401776141733%40213fef3d_0e7b_19d8a4c0efc_3a7b%40025pdPwXCLG5bMmRl7pffcRJ%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_4_177614173371510139353908%3Bscm%3A1007.30148.329090.pub_search-item_5dd7a40a-7123-43e4-820b-2e5788b71a4a_' },
                { name: 'Meditation Cushion', keyword: 'Meditation Zafu Cushion', icon: '🧘', label: 'Meditation', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3D5ZwyNGSbZAlw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUSZPkucg%2FvEb0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVL5h%2FAFE%2BthCdpHuOum593ZQtkyqhBb5%2B4tXsyH%2FO6UgQtCX2YSKt8jzqwmpvh6vyCF4aQIBA5h8e%2FzAQIdFlwUjBlhzALYuglqGsybxN%2BuLGmVLaVC0SVJOm5IOgipYWnT%2B6mtbVN2YEt4yq0kGayoNkYvQZuIwx39ITxaE7ooIZPw5LRNNR23zmEMK4TxNIs&union_lens=lensId%3APUB%401776141763%4021050a22_2f19_19d8a4c8239_4caa%40026zOGEb33bCRPk336feCmfB%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_1_177614176320910139353908%3Bscm%3A1007.30148.329090.pub_search-item_a1e9c386-361c-43ba-abb4-cfbbb03c8440_' },
                { name: 'Desktop Plant', keyword: 'Desktop Water Plant', icon: '🌿', label: 'Plant', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DLCvI6o3YZsNw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHU3OUKNwuXvsb0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLqSy8TEjfGNfQB31PCSfHzc0Q9fK1X0Au0ItOGVs%2B65ktv3cN%2Fx87OPaMb3w54c21%2F7kZyM%2FhFgFlKXrv4r1i4Y8aUTrVXAVPFMdUYAIZ9Kj7ZWSIsVPFk6M70AliNjwJcn7ARWQ6ocUJA%2BdPqoJCT0D%2BQFtGI91HRS1ySxTnVcA%3D&union_lens=lensId%3APUB%401776141790%40213d58eb_217f_19d8a4cec93_4f40%40026BSL14Ga6uqRS2vCZKnwm4%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_2_177614179042710139353908%3Bscm%3A1007.30148.329090.pub_search-item_e6e71464-7e5f-4059-8ad8-6d5a4a23bae1_' },
            ],
        },
    },
    earth: {
        zh: {
            themeColor: '绿 / 白 (木克土，金泻土)',
            tarotAdvice: '通过『权杖』和『愚人』牌，鼓励自己打破现状，迎接改变。',
            products: [
                { name: '孔雀石手链', keyword: '孔雀石手链', icon: '💎', label: '能量水晶', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DhTgytVwhdZ5w4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHU3rwG1DpS7670JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVL5oIurKDdcA1g8gsYlDryfIwe6%2FtGg2%2FRDSMWxuxDspZ%2F2%2BxTP9OMtskCPEFNa0rtDz3Idk3T6UpuZuGe15lmG9X2z5%2BwQOVBScwrNUjCmeXkOAUxTvjSAnB6Jd9pUfrRoSjB86Khob3HTmyVjyxWem6x8uYlxq4RnBf80C6qOF8%3D&union_lens=lensId%3APUB%401776141981%40212b1a71_0e20_19d8a4fd8d4_2d90%40021vzS8zv3JGnCs7DAfaUpzn%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614198198610139353908%3Bscm%3A1007.30148.329090.pub_search-item_731e3b3f-3169-49a8-8a29-e404224b2b6e_' },
                { name: '室内绿植盆栽', keyword: '室内盆栽 绿植 桌面', icon: '🌿', label: '绿植', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DuMaE%2FHVBZUpw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUxVFK0D5pLZj0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLvWGSbOiP1YonQRxmfo1iXc0Q9fK1X0AuhLjO8JFSuq4gvWLAwGN2jGWm7XJ%2BM%2Fb9Qd1d9XDlZAicZLIHqDc7ChgsElLkEyeeRtN%2BWIww09Aez%2BiskXTCbULEkqTedE399KEV1g6mN9Bh0O3Rc5H%2Fpn1rFI2aA%2BUQAe8bwLHDZCY6Ook38B1m5nEqY%2Bakgpmw&umpChannel=bybtqdyh&u_channel=bybtqdyh&maskChannel=bybtrs&union_lens=lensId%3APUB%401776142025%40212b93ae_0ec1_19d8a50835f_7a5a%40024RUP3pS83S62b9HhkSjOOj%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614202563010139353908%3Bscm%3A1007.30148.329090.pub_search-item_32f480c7-6cbf-429c-9892-8a4a339bc000_' },
                { name: '绿幽灵水晶', keyword: '绿幽灵水晶 手链', icon: '📿', label: '能量饰品', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DGqWb6EzwGjpw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUThs4KPa5anb0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLtVFM%2BuyufadUtRoEzcIPVwtkyqhBb5%2B4HoaaUnJGJVONvdEmtnfnqGtZO2BV4ZqCW5DAmeSsWCuyxWC04Bz2%2B0hdfEOIyP8K2ytokgZbWCDjgeUD4holsk%2FuprW1TdmBLeMqtJBmsqDZGL0GbiMMd%2BWTbdK%2BKJxRXcsjipofTJ29Gf2zmUiveQ%3D%3D&union_lens=lensId%3APUB%401776088957%402135c191_0e27_19d8726c3da_278f%40021eOk1LeOz3cvDdT7CN4fZQ%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_14_177608895799110139353908%3Bscm%3A1007.30148.329090.pub_search-item_3f69a897-d577-42c5-b709-11529fdb99a2_' },
                { name: '抹茶礼盒', keyword: '抹茶礼盒 日式', icon: '🍵', label: '茶道', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DWH6IB7%2BC0Hxw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUYq7FqyjQ2ZL0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLvgGw11dyUfwhPIV3RMz6ch0dYBejlBWJxdquJDSCS%2B8EHO%2FQVA%2BiyY%2Fb1hgHyr2DZaBfKm3B8rorB%2BT0pocrRdK1ijarRFR1kZn3A9FxdX4F%2B6qWNoTfGk3O4wtQ3K907CGeTwTLjxvtltteet0FFiGFCzYOOqAQ&union_lens=lensId%3APUB%401776142056%40213c93db_216f_19d8a50fa61_e7e8%40023szd1OZj4bb1zCl8RmVB5f%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_2_177614205610910139353908%3Bscm%3A1007.30148.329090.pub_search-item_60a02582-af02-40a9-b7f2-b68b9568b66f_' },
                { name: '竹制香插', keyword: '竹制香插 线香座', icon: '🎋', label: '香道', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DXEcKMrXa6upw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUuwbHP0E3Rff0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLMzw5jhqHbbz1aIAiTKVzU4we6%2FtGg2%2FRjN4f8DSxNxs5%2FP%2FbGMOUJmAnZzfqKQYNcg3%2B5V12reB%2FneTgzAWUOfMj%2BvKkGEypDiz0lTQed2tD3P8lY3KYvU%2FuprW1TdmBLeMqtJBmsqDZGL0GbiMMd%2FAtPZQoTf7cTBHAXWebzAAvfeUUl6%2F7pA%3D%3D&union_lens=lensId%3APUB%401776142086%402127ba20_0e34_19d8a517243_acfb%40026GdZUCYQxRdXuQz1RuSqMr%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_3_177614208678710139353908%3Bscm%3A1007.30148.329090.pub_search-item_29466f38-098c-46ad-b9e7-98326d2e7a23_' },
                { name: '翡翠平安扣', keyword: '翡翠平安扣 吊坠', icon: '🧿', label: '平安', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DsTHNx2fnFQxw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUGb6saD7EUFr0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLJoJWJwuAOegeA0cku%2BhYts0Q9fK1X0Aurxcuv1wXSXQA4nuf2Ehi5ORZM8ej5fKivq1P0Yq4BNOW711Lnm3yDlajoprZR727wvJ1x6odbA1xYp1kltHKA0eq8kaanl6ltM7yFVcfj3Nv%2BdQcxB3rX8YJSha3z5pM1pA6x3kzfM%2F1ZyFIaETW%2BrwFjHk9FwlqomfkDJRs%2BhU%3D&union_lens=lensId%3APUB%401776142138%400b5e1454_0f94_19d8a523bec_765d%40027Q3GNVEubBQfPaDDU1SsUl%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_15_177614213841910139353908%3Bscm%3A1007.30148.329090.pub_search-item_9b98ea3d-1072-4f77-9b5d-44a35b308290_' },
            ],
        },
        en: {
            themeColor: 'Green / White (Wood controls Earth)',
            tarotAdvice: 'Draw from the Wands and the Fool — break free and embrace change.',
            products: [
                { name: 'Malachite Bracelet', keyword: 'Malachite Bracelet', icon: '💎', label: 'Crystal', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DhTgytVwhdZ5w4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHU3rwG1DpS7670JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVL5oIurKDdcA1g8gsYlDryfIwe6%2FtGg2%2FRDSMWxuxDspZ%2F2%2BxTP9OMtskCPEFNa0rtDz3Idk3T6UpuZuGe15lmG9X2z5%2BwQOVBScwrNUjCmeXkOAUxTvjSAnB6Jd9pUfrRoSjB86Khob3HTmyVjyxWem6x8uYlxq4RnBf80C6qOF8%3D&union_lens=lensId%3APUB%401776141981%40212b1a71_0e20_19d8a4fd8d4_2d90%40021vzS8zv3JGnCs7DAfaUpzn%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614198198610139353908%3Bscm%3A1007.30148.329090.pub_search-item_731e3b3f-3169-49a8-8a29-e404224b2b6e_' },
                { name: 'Indoor Bonsai Plant', keyword: 'Indoor Bonsai Tree', icon: '🌿', label: 'Plant', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DuMaE%2FHVBZUpw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUxVFK0D5pLZj0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLvWGSbOiP1YonQRxmfo1iXc0Q9fK1X0AuhLjO8JFSuq4gvWLAwGN2jGWm7XJ%2BM%2Fb9Qd1d9XDlZAicZLIHqDc7ChgsElLkEyeeRtN%2BWIww09Aez%2BiskXTCbULEkqTedE399KEV1g6mN9Bh0O3Rc5H%2Fpn1rFI2aA%2BUQAe8bwLHDZCY6Ook38B1m5nEqY%2Bakgpmw&umpChannel=bybtqdyh&u_channel=bybtqdyh&maskChannel=bybtrs&union_lens=lensId%3APUB%401776142025%40212b93ae_0ec1_19d8a50835f_7a5a%40024RUP3pS83S62b9HhkSjOOj%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614202563010139353908%3Bscm%3A1007.30148.329090.pub_search-item_32f480c7-6cbf-429c-9892-8a4a339bc000_' },
                { name: 'Green Phantom Quartz', keyword: 'Green Phantom Quartz Bracelet', icon: '📿', label: 'Crystal', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DGqWb6EzwGjpw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUThs4KPa5anb0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLtVFM%2BuyufadUtRoEzcIPVwtkyqhBb5%2B4HoaaUnJGJVONvdEmtnfnqGtZO2BV4ZqCW5DAmeSsWCuyxWC04Bz2%2B0hdfEOIyP8K2ytokgZbWCDjgeUD4holsk%2FuprW1TdmBLeMqtJBmsqDZGL0GbiMMd%2BWTbdK%2BKJxRXcsjipofTJ29Gf2zmUiveQ%3D%3D&union_lens=lensId%3APUB%401776088957%402135c191_0e27_19d8726c3da_278f%40021eOk1LeOz3cvDdT7CN4fZQ%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_14_177608895799110139353908%3Bscm%3A1007.30148.329090.pub_search-item_3f69a897-d577-42c5-b709-11529fdb99a2_' },
                { name: 'Matcha Gift Set', keyword: 'Matcha Tea Gift Set', icon: '🍵', label: 'Tea', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DWH6IB7%2BC0Hxw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUYq7FqyjQ2ZL0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLvgGw11dyUfwhPIV3RMz6ch0dYBejlBWJxdquJDSCS%2B8EHO%2FQVA%2BiyY%2Fb1hgHyr2DZaBfKm3B8rorB%2BT0pocrRdK1ijarRFR1kZn3A9FxdX4F%2B6qWNoTfGk3O4wtQ3K907CGeTwTLjxvtltteet0FFiGFCzYOOqAQ&union_lens=lensId%3APUB%401776142056%40213c93db_216f_19d8a50fa61_e7e8%40023szd1OZj4bb1zCl8RmVB5f%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_2_177614205610910139353908%3Bscm%3A1007.30148.329090.pub_search-item_60a02582-af02-40a9-b7f2-b68b9568b66f_' },
                { name: 'Bamboo Incense Holder', keyword: 'Bamboo Incense Holder', icon: '🎋', label: 'Decor', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DXEcKMrXa6upw4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUuwbHP0E3Rff0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLMzw5jhqHbbz1aIAiTKVzU4we6%2FtGg2%2FRjN4f8DSxNxs5%2FP%2FbGMOUJmAnZzfqKQYNcg3%2B5V12reB%2FneTgzAWUOfMj%2BvKkGEypDiz0lTQed2tD3P8lY3KYvU%2FuprW1TdmBLeMqtJBmsqDZGL0GbiMMd%2FAtPZQoTf7cTBHAXWebzAAvfeUUl6%2F7pA%3D%3D&union_lens=lensId%3APUB%401776142086%402127ba20_0e34_19d8a517243_acfb%40026GdZUCYQxRdXuQz1RuSqMr%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_3_177614208678710139353908%3Bscm%3A1007.30148.329090.pub_search-item_29466f38-098c-46ad-b9e7-98326d2e7a23_' },
                { name: 'Jade Pendant', keyword: 'Jade Donut Pendant', icon: '🧿', label: 'Jewelry', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DsTHNx2fnFQxw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUGb6saD7EUFr0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLJoJWJwuAOegeA0cku%2BhYts0Q9fK1X0Aurxcuv1wXSXQA4nuf2Ehi5ORZM8ej5fKivq1P0Yq4BNOW711Lnm3yDlajoprZR727wvJ1x6odbA1xYp1kltHKA0eq8kaanl6ltM7yFVcfj3Nv%2BdQcxB3rX8YJSha3z5pM1pA6x3kzfM%2F1ZyFIaETW%2BrwFjHk9FwlqomfkDJRs%2BhU%3D&union_lens=lensId%3APUB%401776142138%400b5e1454_0f94_19d8a523bec_765d%40027Q3GNVEubBQfPaDDU1SsUl%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_15_177614213841910139353908%3Bscm%3A1007.30148.329090.pub_search-item_9b98ea3d-1072-4f77-9b5d-44a35b308290_' },
            ],
        },
    },
    default: {
        zh: {
            themeColor: '黄 / 金',
            tarotAdvice: '当前能量平衡，保持警觉，抽一张大阿卡那牌作为指引。',
            products: [
                { name: '白水晶柱', keyword: '白水晶柱 天然', icon: '💎', label: '能量水晶', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DzbCAipc3%2BKZw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUGUUmkVvoasz0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLmlTVPw3D4sOPUZQcXg5cXowe6%2FtGg2%2FRDSMWxuxDspZ3JF9SkjBqCwULBOUETJjovuR9Tp2cjZ4CwWmFQAoE6dffeFLhGEK4NaVCmvwm5fCMJi1gYBJvNFSsXCNd9EoxE59iYTGkDbXThu38KHQcJuMeootrswwpW5MF1TTNIBgYsurMXckMmA%3D%3D&union_lens=lensId%3APUB%401776142334%400b15405c_20a1_19d8a55386b_1bf6%40026eYScsj70zQGhmLV4mRqnI%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_2_177614233412310139353908%3Bscm%3A1007.30148.329090.pub_search-item_f298ee18-1b08-4e30-9af4-82ae15f6613b_' },
                { name: '护肤套装礼盒', keyword: '护肤套装 礼盒', icon: '🧴', label: '护肤', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DuSAusDOT98Jw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHU08zDECo908D0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLkdFhWj2SMEUdoHUEHBsTbc0Q9fK1X0Au0ItOGVs%2B65ktv3cN%2Fx87OGigXqjuRbdOsbEqZIl5OQn7BGSp5U9GdG8ut3S7jrg6BKKyvxcGJWPkgOXOIVL%2FmaM70AliNjwJcn7ARWQ6ocV0hb0k2TPv%2BG5KHOQOD12OaSvB1ZsK2qZYxOnWUD%2BrcMYl7w3%2FA2kb&union_lens=lensId%3APUB%401776142366%40213f27b3_0d5c_19d8a55b634_b9b0%4002ZjwMcFRmWvzOhOfvc073h%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_2_177614236635810139353908%3Bscm%3A1007.30148.329090.pub_search-item_9ab6d354-33eb-4490-8002-30476404fa4c_' },
                { name: '紫水晶洞', keyword: '紫水晶洞 摆件', icon: '💎', label: '摆件', affiliateUrl: 'https://uland.taobao.com/coupon/edetail?e=zoMc%2BWQ8aJilhHvvyUNXZfh8CuWt5YH5OVuOuRD5gLJMmdsrkidbOWgpcJRl3wFwcV%2FlEyhmp8B0cib5ugqsds0PWlZ8FPmFLThWU2sJBD1hn3Pu9MzHfXaL0TuUDZn2WlyYOqyu80U%2BQqs%2BOqWgVLhtWWjRAlP0YwOD23XOnRG3iabtJWruNyNnbrD79T7fTofvsbfU3zwhIMdCebK0eo81Nvpq24IImMHpNfYdHdAXFKGQBYiUE%2FFFzUHogwwlvbHJ%2Fki%2BjXBsnl3aBE22Yc1hxAla%2BjOlUkI0Iq%2BeTZmH%2BWWEbFCBmH3kgStyl2tPkOomLOc2xKFCf93k%2B%2Fb8Cm4XEKR%2BT0n3tVj9fvtxMzRVbrKqp4Yn8g%3D%3D&traceId=2150438e17760891213328156e13dd&union_lens=lensId%3APUB%401776089059%40212bcd02_0e16_19d87285278_d73d%4002CpWjiTZqM12T6RO0FOUsB%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_10_177608906002410139353908%3Bscm%3A1007.30148.329090.pub_search-item_c00b1c96-9463-416d-bb8f-55d327e3c10a_' },
                { name: '手工皂礼盒', keyword: '手工皂 天然 礼盒', icon: '🧼', label: '洗护', affiliateUrl: 'https://uland.taobao.com/coupon/edetail?e=gzZYzRP8e0mlhHvvyUNXZfh8CuWt5YH5OVuOuRD5gLJMmdsrkidbOUV9IBA4kmjLcLrjAQ7w7zV9QSyQL9J451Ydf3J7zEBvPXfX%2B1BXC7bCTXNu1J7%2FdR9EgFfyshkY6xr1xWaBuZnLkU4k%2FaBIVS9H%2FUE0utEJwtFbZ3TGWYkgLPRJMBwy22q0Px35Y87CPnU7c2%2BfZOsN%2BoQUE6FNzIJzeKzMXBKS%2FtRlV2x5i9haV1P9LaQGi91U8ThGeLgm9FeeirPWMC48ivXaHkwUbNtEidsHLvb2JaZi%2FPgpUzx1Y7r0DeIGKlVh%2FI4ELVW5hIkz5M1CZ9W8nXT12U5%2BryUzVkkdwsIm&traceId=215047ee17761424183461641e0c3a&union_lens=lensId%3APUB%401776142411%4021673654_0da0_19d8a566588_b665%40024QYvHmSGgt5S0evdyUigiB%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614241121510139353908%3Bscm%3A1007.30148.329090.pub_search-item_df48b501-db06-4870-8108-9968c355868d_' },
                { name: '龙泉青瓷杯', keyword: '龙泉青瓷杯', icon: '🍵', label: '茶道', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DDWq8abNEcSRw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUZn8WzC4niJ30JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLXXs6FdcVGMB0LThWk68Obs0Q9fK1X0AuhLjO8JFSuq4NDYY2ZIxBAX%2FDs%2BUJJCOtuB42bz3GynU%2F2ZJErihzv6lzSWo4OHq7C09pCgjAxTLAEMBBqf0xf7TO8hVXH49zb%2FnUHMQd61%2FGCUoWt8%2BaTOCTnndEcWujWUJ8qZpJac83h3%2BQTJ41j8YMXU3NNCg%2F&union_lens=lensId%3APUB%401776142435%40212cd85c_1082_19d8a56c5c2_9736%40021AuPqjNYIjbqLKTNrtXSME%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_3_177614243583710139353908%3Bscm%3A1007.30148.329090.pub_search-item_1dd082c1-85bd-42f9-b198-4ee5398bf552_' },
                { name: '天然蜂蜡蜡烛', keyword: '天然蜂蜡蜡烛', icon: '🕯️', label: '香薰', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3Dqh0fzLY9%2F75w4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUeleQZtNNDtv0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLyRztPH5yKc%2BpQ9xdsBJHs%2F1SarTXhIOTUdDn0Cj7EhPU%2F79xF4RHJPIBWFZ%2BAAfqHkk4wdFY2bSAzA8qgU7EajTAFo8uEy6ZR5upf6Dh8wyJLx2IRBapUI%2BDKwFLEd9Q5dUsQ8NYvbgfckBNEXugOZQYUQEjmclUIYULNg46oBA%3D&union_lens=lensId%3APUB%401776142477%40212b9379_0f83_19d8a576a2a_5bb3%40023B1mhxMi8haXutJifTJ0mu%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_11_177614247793310139353908%3Bscm%3A1007.30148.329090.pub_search-item_1c3d35db-a709-4421-9aa3-e9f3f47528d6_' },
            ],
        },
        en: {
            themeColor: 'Yellow / Gold',
            tarotAdvice: 'Energy is balanced — stay alert and draw a Major Arcana for guidance.',
            products: [
                { name: 'Clear Quartz Point', keyword: 'Clear Quartz Point', icon: '💎', label: 'Crystal', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DzbCAipc3%2BKZw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUGUUmkVvoasz0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLmlTVPw3D4sOPUZQcXg5cXowe6%2FtGg2%2FRDSMWxuxDspZ3JF9SkjBqCwULBOUETJjovuR9Tp2cjZ4CwWmFQAoE6dffeFLhGEK4NaVCmvwm5fCMJi1gYBJvNFSsXCNd9EoxE59iYTGkDbXThu38KHQcJuMeootrswwpW5MF1TTNIBgYsurMXckMmA%3D%3D&union_lens=lensId%3APUB%401776142334%400b15405c_20a1_19d8a55386b_1bf6%40026eYScsj70zQGhmLV4mRqnI%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_2_177614233412310139353908%3Bscm%3A1007.30148.329090.pub_search-item_f298ee18-1b08-4e30-9af4-82ae15f6613b_' },
                { name: 'Skincare Gift Set', keyword: 'Skincare Gift Set', icon: '🧴', label: 'Skincare', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DuSAusDOT98Jw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHU08zDECo908D0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLkdFhWj2SMEUdoHUEHBsTbc0Q9fK1X0Au0ItOGVs%2B65ktv3cN%2Fx87OGigXqjuRbdOsbEqZIl5OQn7BGSp5U9GdG8ut3S7jrg6BKKyvxcGJWPkgOXOIVL%2FmaM70AliNjwJcn7ARWQ6ocV0hb0k2TPv%2BG5KHOQOD12OaSvB1ZsK2qZYxOnWUD%2BrcMYl7w3%2FA2kb&union_lens=lensId%3APUB%401776142366%40213f27b3_0d5c_19d8a55b634_b9b0%4002ZjwMcFRmWvzOhOfvc073h%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_2_177614236635810139353908%3Bscm%3A1007.30148.329090.pub_search-item_9ab6d354-33eb-4490-8002-30476404fa4c_' },
                { name: 'Amethyst Geode', keyword: 'Amethyst Geode', icon: '💎', label: 'Crystal', affiliateUrl: 'https://uland.taobao.com/coupon/edetail?e=zoMc%2BWQ8aJilhHvvyUNXZfh8CuWt5YH5OVuOuRD5gLJMmdsrkidbOWgpcJRl3wFwcV%2FlEyhmp8B0cib5ugqsds0PWlZ8FPmFLThWU2sJBD1hn3Pu9MzHfXaL0TuUDZn2WlyYOqyu80U%2BQqs%2BOqWgVLhtWWjRAlP0YwOD23XOnRG3iabtJWruNyNnbrD79T7fTofvsbfU3zwhIMdCebK0eo81Nvpq24IImMHpNfYdHdAXFKGQBYiUE%2FFFzUHogwwlvbHJ%2Fki%2BjXBsnl3aBE22Yc1hxAla%2BjOlUkI0Iq%2BeTZmH%2BWWEbFCBmH3kgStyl2tPkOomLOc2xKFCf93k%2B%2Fb8Cm4XEKR%2BT0n3tVj9fvtxMzRVbrKqp4Yn8g%3D%3D&traceId=2150438e17760891213328156e13dd&union_lens=lensId%3APUB%401776089059%40212bcd02_0e16_19d87285278_d73d%4002CpWjiTZqM12T6RO0FOUsB%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3AselectionPlaza_site_4358_0_0_0_10_177608906002410139353908%3Bscm%3A1007.30148.329090.pub_search-item_c00b1c96-9463-416d-bb8f-55d327e3c10a_' },
                { name: 'Handmade Soap Set', keyword: 'Natural Handmade Soap Set', icon: '🧼', label: 'Bath', affiliateUrl: 'https://uland.taobao.com/coupon/edetail?e=gzZYzRP8e0mlhHvvyUNXZfh8CuWt5YH5OVuOuRD5gLJMmdsrkidbOUV9IBA4kmjLcLrjAQ7w7zV9QSyQL9J451Ydf3J7zEBvPXfX%2B1BXC7bCTXNu1J7%2FdR9EgFfyshkY6xr1xWaBuZnLkU4k%2FaBIVS9H%2FUE0utEJwtFbZ3TGWYkgLPRJMBwy22q0Px35Y87CPnU7c2%2BfZOsN%2BoQUE6FNzIJzeKzMXBKS%2FtRlV2x5i9haV1P9LaQGi91U8ThGeLgm9FeeirPWMC48ivXaHkwUbNtEidsHLvb2JaZi%2FPgpUzx1Y7r0DeIGKlVh%2FI4ELVW5hIkz5M1CZ9W8nXT12U5%2BryUzVkkdwsIm&traceId=215047ee17761424183461641e0c3a&union_lens=lensId%3APUB%401776142411%4021673654_0da0_19d8a566588_b665%40024QYvHmSGgt5S0evdyUigiB%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_1_177614241121510139353908%3Bscm%3A1007.30148.329090.pub_search-item_df48b501-db06-4870-8108-9968c355868d_' },
                { name: 'Celadon Tea Cup', keyword: 'Celadon Tea Cup', icon: '🍵', label: 'Tea', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3DDWq8abNEcSRw4vFB6t2Z2ueEDrYVVa64YUrQeSeIhnK53hKxp7mNFl906SyIHsHUZn8WzC4niJ30JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLXXs6FdcVGMB0LThWk68Obs0Q9fK1X0AuhLjO8JFSuq4NDYY2ZIxBAX%2FDs%2BUJJCOtuB42bz3GynU%2F2ZJErihzv6lzSWo4OHq7C09pCgjAxTLAEMBBqf0xf7TO8hVXH49zb%2FnUHMQd61%2FGCUoWt8%2BaTOCTnndEcWujWUJ8qZpJac83h3%2BQTJ41j8YMXU3NNCg%2F&union_lens=lensId%3APUB%401776142435%40212cd85c_1082_19d8a56c5c2_9736%40021AuPqjNYIjbqLKTNrtXSME%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_3_177614243583710139353908%3Bscm%3A1007.30148.329090.pub_search-item_1dd082c1-85bd-42f9-b198-4ee5398bf552_' },
                { name: 'Beeswax Candle', keyword: 'Natural Beeswax Candle', icon: '🕯️', label: 'Candle', affiliateUrl: 'https://s.click.taobao.com/t?e=m%3D2%26s%3Dqh0fzLY9%2F75w4vFB6t2Z2ueEDrYVVa64g3vZOarmkFi53hKxp7mNFl906SyIHsHUeleQZtNNDtv0JlhLk0Jl4ey2AZ63G4mrN35vXaadd1mQ68URGFfUUa8HCsYzB98w%2BJCbLummVt7WqunGLAygI3FzUC1tkZVLyRztPH5yKc%2BpQ9xdsBJHs%2F1SarTXhIOTUdDn0Cj7EhPU%2F79xF4RHJPIBWFZ%2BAAfqHkk4wdFY2bSAzA8qgU7EajTAFo8uEy6ZR5upf6Dh8wyJLx2IRBapUI%2BDKwFLEd9Q5dUsQ8NYvbgfckBNEXugOZQYUQEjmclUIYULNg46oBA%3D&union_lens=lensId%3APUB%401776142477%40212b9379_0f83_19d8a576a2a_5bb3%40023B1mhxMi8haXutJifTJ0mu%40eyJmbG9vcklkIjo4MDY3NCwiic3BtQiiI6Il9wb3J0YWxfdjJfcGFnZXNfcHJvbW9fZ29vZHNfaW5kZXhfaHRtIiiwiic3JjRmxvb3JJZCI6IjgwNjc0In0ie%3BtkScm%3Asearch_fuzzy_selectionPlaza_site_4358_0_0_0_11_177614247793310139353908%3Bscm%3A1007.30148.329090.pub_search-item_1c3d35db-a709-4421-9aa3-e9f3f47528d6_' },
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
