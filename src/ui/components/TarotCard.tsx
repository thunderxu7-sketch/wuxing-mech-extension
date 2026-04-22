import React, { useState } from 'react';
import type { Locale, LocaleMessages } from '../../locales/types';
import type { DailyTarotResult } from '../../utils/tarot';

const SUIT_LABELS: Record<string, Record<Locale, string>> = {
    wands: { zh: '权杖', en: 'Wands' },
    cups: { zh: '圣杯', en: 'Cups' },
    swords: { zh: '宝剑', en: 'Swords' },
    pentacles: { zh: '星币', en: 'Pentacles' },
};

interface TarotCardProps {
    result: DailyTarotResult | null;
    onDraw: () => void;
    hasDrawn: boolean;
    locale: Locale;
    m: LocaleMessages;
}

const TarotCard: React.FC<TarotCardProps> = ({ result, onDraw, hasDrawn, locale, m }) => {
    const [flipping, setFlipping] = useState(false);
    const [revealed, setRevealed] = useState(!!result);

    const handleDraw = () => {
        if (hasDrawn && result) {
            // Already drawn today, just show result
            setRevealed(true);
            return;
        }
        setFlipping(true);
        onDraw();
        // Flip animation duration
        setTimeout(() => {
            setRevealed(true);
            setFlipping(false);
        }, 600);
    };

    const resonanceLabel = result
        ? result.wuxingResonance === 'harmony' ? m.tarot.harmonyLabel
            : result.wuxingResonance === 'tension' ? m.tarot.tensionLabel
                : m.tarot.neutralLabel
        : '';

    const resonanceIcon = result
        ? result.wuxingResonance === 'harmony' ? '☯'
            : result.wuxingResonance === 'tension' ? '⚡'
                : '○'
        : '';

    const positionLabel = result
        ? result.position === 'upright' ? m.tarot.uprightLabel : m.tarot.reversedLabel
        : '';

    const suitLabel = result
        ? result.card.suit === 'major'
            ? m.tarot.majorArcana
            : `${m.tarot.minorArcana} · ${SUIT_LABELS[result.card.suit]?.[locale] ?? ''}`
        : '';

    return (
        <div className="tarot-section">
            <h4 className="section-title">{m.tarot.sectionTitle}</h4>

            <div className={`tarot-card-container ${flipping ? 'flipping' : ''}`}>
                {!revealed ? (
                    // Card back
                    <div className="tarot-card tarot-card-back" onClick={handleDraw}>
                        <div className="tarot-back-pattern">
                            <span className="tarot-back-symbol">☰</span>
                        </div>
                    </div>
                ) : result ? (
                    // Card face
                    <div className="tarot-card tarot-card-face">
                        <div className="tarot-card-image">
                            <img
                                src={`./tarot/${result.card.image}`}
                                alt={result.card.name[locale]}
                                className={result.position === 'reversed' ? 'reversed' : ''}
                            />
                        </div>
                        <div className="tarot-card-info">
                            <span className="tarot-suit">{suitLabel}</span>
                            <h5 className="tarot-name">{result.card.name[locale]}</h5>
                            <div className="tarot-badges">
                                <span className={`tarot-position-badge ${result.position}`}>
                                    {positionLabel}
                                </span>
                                <span className={`tarot-resonance-badge ${result.wuxingResonance}`}>
                                    {resonanceIcon} {resonanceLabel}
                                </span>
                            </div>
                            <p className="tarot-reading">
                                {result.enhancedReading[locale]}
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>

            {!revealed && (
                <button className="tarot-draw-btn" onClick={handleDraw}>
                    {hasDrawn ? m.tarot.alreadyDrawn : m.tarot.drawButton}
                </button>
            )}
        </div>
    );
};

export default TarotCard;
