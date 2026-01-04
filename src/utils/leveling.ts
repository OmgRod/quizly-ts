/**
 * Leveling Utilities
 * Formula: XP required for level L is 1000 * ((1.5^(L-1) - 1) / 0.5)
 */

const getLevelFromXP = (xp: number): number => {
  if (xp < 1000) return 1;
  // Inverse of the geometric sum formula
  return Math.floor(1 + Math.log(xp / 2000 + 1) / Math.log(1.5));
};

const getXPForLevel = (level: number): number => {
  if (level <= 1) return 0;
  return Math.floor(2000 * (Math.pow(1.5, level - 1) - 1));
};

export const getLevelProgress = (xp: number): { level: number, progress: number, currentXP: number, nextXP: number } => {
  const level = getLevelFromXP(xp);
  const currentThreshold = getXPForLevel(level);
  const nextThreshold = getXPForLevel(level + 1);
  const progress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return { 
    level, 
    progress: Math.min(100, Math.max(0, progress)), 
    currentXP: xp - currentThreshold, 
    nextXP: nextThreshold - currentThreshold 
  };
};

export const getRankFromAccuracy = (accuracy: number): string => {
  if (accuracy >= 90) return 'Master';
  if (accuracy >= 67) return 'Expert';
  if (accuracy >= 34) return 'Intermediate';
  return 'Novice';
};
