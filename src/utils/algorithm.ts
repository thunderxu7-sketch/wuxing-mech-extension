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

/**
 * @description 实体产品/生活方式锚点推荐的结构定义
 */
export interface PhysicalAnchorRecommendation {
    /**
     * @description 主要的颜色/元素主题
     */
    themeColor: string;
    /**
     * @description 水晶/宝石推荐
     */
    crystal: {
        name: string;
        // 这是一个占位符，实际中会是联盟链接或产品ID
        buyLink: string; 
    };
    /**
     * @description 塔罗牌/心灵指引建议
     */
    tarotAdvice: string;
    /**
     * @description 生活方式/周边产品推荐
     */
    lifestyle: {
        name: string;
        buyLink: string;
    };
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
export function getDailyTalisman(result: FortuneResult, locale: Locale = 'zh'): TalismanRecommendation {
    let id: string;

    if (result.score >= 80) {
        id = 'haoyun';
    } else if (result.score < 35) {
        id = 'yongqi';
    } else {
        const dayOfMonth = new Date().getDate();
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

// --- 商品多语言数据 ---

interface ProductSet {
    themeColor: string;
    crystal: { name: string; keyword: string };
    tarotAdvice: string;
    lifestyle: { name: string; keyword: string };
}

const PRODUCT_DATA: Record<string, Record<Locale, ProductSet>> = {
    gold: {
        zh: {
            themeColor: '红 / 黑 (火克金，水泻金)',
            crystal: { name: '黑曜石手链', keyword: '黑曜石手链' },
            tarotAdvice: '审视你的『宝剑』牌组，寻找行动与克制之间的平衡。',
            lifestyle: { name: '红色香薰蜡烛', keyword: '红色香薰蜡烛' },
        },
        en: {
            themeColor: 'Red / Black (Fire controls Metal)',
            crystal: { name: 'Black Obsidian Bracelet', keyword: 'Black Obsidian Bracelet' },
            tarotAdvice: 'Examine your Swords cards — find the balance between action and restraint.',
            lifestyle: { name: 'Red Aromatherapy Candle', keyword: 'Red Aromatherapy Candle' },
        },
    },
    wood: {
        zh: {
            themeColor: '白 / 红 (金克木，火泻木)',
            crystal: { name: '白水晶簇摆件', keyword: '白水晶簇摆件' },
            tarotAdvice: '关注『权杖』牌组的能量，将生发之力转化为具体行动。',
            lifestyle: { name: '艺术画册', keyword: '艺术画册 精装' },
        },
        en: {
            themeColor: 'White / Red (Metal controls Wood)',
            crystal: { name: 'Clear Quartz Cluster', keyword: 'Clear Quartz Cluster' },
            tarotAdvice: 'Focus on your Wands — channel growth energy into concrete action.',
            lifestyle: { name: 'Fine Art Book', keyword: 'Coffee Table Art Book' },
        },
    },
    water: {
        zh: {
            themeColor: '黄 / 紫 (土克水，金生水)',
            crystal: { name: '黄水晶摆件', keyword: '黄水晶摆件 招财' },
            tarotAdvice: '冥想与『五芒星』牌组，让财务和现实基础更加稳固。',
            lifestyle: { name: '星座周边礼物', keyword: '星座礼物 摩羯座 金牛座' },
        },
        en: {
            themeColor: 'Yellow / Purple (Earth controls Water)',
            crystal: { name: 'Citrine Crystal', keyword: 'Citrine Crystal Decor' },
            tarotAdvice: 'Meditate on your Pentacles — strengthen your material foundations.',
            lifestyle: { name: 'Zodiac Gifts', keyword: 'Capricorn Taurus Virgo Gifts' },
        },
    },
    fire: {
        zh: {
            themeColor: '蓝 / 绿 (水克火，木生火)',
            crystal: { name: '青金石吊坠', keyword: '青金石吊坠' },
            tarotAdvice: '多加解读『圣杯』牌组，关注内心感受与情感交流，而非外部冲突。',
            lifestyle: { name: '蓝色陶瓷茶具', keyword: '蓝色陶瓷茶具套装' },
        },
        en: {
            themeColor: 'Blue / Green (Water controls Fire)',
            crystal: { name: 'Lapis Lazuli Pendant', keyword: 'Lapis Lazuli Pendant' },
            tarotAdvice: 'Read your Cups — focus on inner feelings and connection, not conflict.',
            lifestyle: { name: 'Blue Ceramic Tea Set', keyword: 'Blue Ceramic Tea Set' },
        },
    },
    earth: {
        zh: {
            themeColor: '绿 / 白 (木克土，金泻土)',
            crystal: { name: '孔雀石手链', keyword: '孔雀石手链' },
            tarotAdvice: '通过『权杖』和『愚人』牌，鼓励自己打破现状，迎接改变。',
            lifestyle: { name: '室内绿植盆栽', keyword: '室内盆栽 绿植 桌面' },
        },
        en: {
            themeColor: 'Green / White (Wood controls Earth)',
            crystal: { name: 'Malachite Bracelet', keyword: 'Malachite Bracelet' },
            tarotAdvice: 'Draw from the Wands and the Fool — break free and embrace change.',
            lifestyle: { name: 'Indoor Bonsai Plant', keyword: 'Indoor Bonsai Tree' },
        },
    },
    default: {
        zh: {
            themeColor: '黄 / 金',
            crystal: { name: '白水晶柱', keyword: '白水晶柱 天然' },
            tarotAdvice: '当前能量平衡，保持警觉，抽一张大阿卡那牌作为指引。',
            lifestyle: { name: '护肤套装礼盒', keyword: '护肤套装 礼盒' },
        },
        en: {
            themeColor: 'Yellow / Gold',
            crystal: { name: 'Clear Quartz Point', keyword: 'Clear Quartz Point' },
            tarotAdvice: 'Energy is balanced — stay alert and draw a Major Arcana for guidance.',
            lifestyle: { name: 'Skincare Gift Set', keyword: 'Skincare Gift Set' },
        },
    },
};

/**
 * @description 根据运势结果（失衡元素）生成实体产品和生活方式推荐。
 */
export function getPhysicalAnchorRecommendation(result: FortuneResult, locale: Locale = 'zh'): PhysicalAnchorRecommendation {
    const key = PRODUCT_DATA[result.imbalanceElement] ? result.imbalanceElement : 'default';
    const data = PRODUCT_DATA[key][locale];

    return {
        themeColor: data.themeColor,
        crystal: {
            name: data.crystal.name,
            buyLink: generateAffiliateLink(data.crystal.keyword, locale),
        },
        tarotAdvice: data.tarotAdvice,
        lifestyle: {
            name: data.lifestyle.name,
            buyLink: generateAffiliateLink(data.lifestyle.keyword, locale),
        },
    };
}