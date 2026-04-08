import assert from 'node:assert/strict';
import test from 'node:test';

import type { FiveElementVector, FortuneResult } from '../src/utils/algorithm';
import { calculateFortune, getDailyTalisman } from '../src/utils/algorithm';

const balancedVector: FiveElementVector = {
    gold: 100,
    wood: 100,
    water: 100,
    fire: 100,
    earth: 100,
};

const emptyVector: FiveElementVector = {
    gold: 0,
    wood: 0,
    water: 0,
    fire: 0,
    earth: 0,
};

function createResult(score: number, imbalanceElement: FortuneResult['imbalanceElement']): FortuneResult {
    return {
        score,
        imbalanceElement,
        energyDifference: {
            gold: 80,
            wood: 90,
            water: 100,
            fire: 70,
            earth: 60,
        },
    };
}

test('calculateFortune keeps balanced energy at full score', () => {
    const result = calculateFortune(balancedVector, emptyVector);

    assert.equal(result.score, 100);

    for (const value of Object.values(result.energyDifference)) {
        assert.equal(Number.isInteger(value), true);
        assert.equal(value, 95);
    }
});

test('getDailyTalisman prioritizes score bands before element mapping', () => {
    assert.equal(getDailyTalisman(createResult(85, 'fire'), 'zh').id, 'haoyun');
    assert.equal(getDailyTalisman(createResult(20, 'earth'), 'en').id, 'yongqi');
});

test('getDailyTalisman uses date-aware mapping for wood days', () => {
    const evenDay = new Date(2026, 3, 8, 12, 0, 0);
    const oddDay = new Date(2026, 3, 9, 12, 0, 0);

    assert.equal(getDailyTalisman(createResult(60, 'wood'), 'zh', evenDay).id, 'shiye');
    assert.equal(getDailyTalisman(createResult(60, 'wood'), 'zh', oddDay).id, 'zhihui');
    assert.equal(getDailyTalisman(createResult(60, 'earth'), 'en', evenDay).id, 'fugui');
});
