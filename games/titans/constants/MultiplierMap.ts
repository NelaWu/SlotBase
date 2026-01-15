/**
 * 倍數 ID 映射表
 * 定義 symbolId 到倍數值的對應關係
 */
export const MULTIPLIER_MAP: Record<number, number> = {
  51: 2,
  52: 3,
  53: 4,
  54: 6,
  55: 8,
  56: 10,
  57: 12,
  58: 15,
  59: 18,
  60: 25,
  61: 50,
  62: 55,
  63: 60,
  64: 65,
  65: 80,
  66: 100,
  67: 150,
  68: 200,
  69: 250,
  70: 500,
  151: 2,
  152: 3,
  153: 4,
  154: 6,
  155: 8,
  156: 10,
  157: 12,
  158: 15,
  159: 18,
  160: 25,
  161: 50,
  162: 55,
  163: 60,
  164: 65,
  165: 80,
  166: 100,
  167: 150,
  168: 200,
  169: 250,
  170: 500,
};

/**
 * 根據 symbolId 獲取對應的倍數值
 * @param symbolId 符號 ID
 * @returns 倍數值，如果不在映射表中則返回 null
 */
export function getMultiplierFromSymbolId(symbolId: number): number | null {
  return MULTIPLIER_MAP[symbolId] || null;
}
