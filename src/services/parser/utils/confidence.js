// Confidence levels enum
export const Confidence = {
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM', 
    LOW: 'LOW'
};

// Helper to convert numeric confidence to enum
export function getConfidenceLevel(score) {
    if (score >= 0.9) return Confidence.HIGH;
    if (score >= 0.8) return Confidence.MEDIUM;
    return Confidence.LOW;
}
