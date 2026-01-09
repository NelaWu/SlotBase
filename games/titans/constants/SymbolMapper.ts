/**
 * 符號 ID 映射工具
 * 用於將服務器返回的符號 ID 轉換為客戶端使用的符號 ID
 */

/**
 * 服務器符號 ID 枚舉（根據實際服務器返回的值定義）
 */
export enum ServerSymbolID {
  HELMET = 1,        // 頭盔
  CHEST_ARMOR = 2,   // 胸甲
  SCYTHE = 3,        // 鐮刀
  SHIELD = 4,        // 盾牌
  SUN = 11,          // 陽光
  MOON = 12,         // 月亮
  PURPLE_DIAMOND = 13, // 紫色菱形
  BLUE_DIAMOND = 14,   // 藍色菱形
  GREEN_DIAMOND = 15,  // 綠色菱形
  SCATTER = 31,      // Scatter
  JP = 100,          // Jp
}

/**
 * 客戶端符號 ID 枚舉（根據客戶端資源命名定義）
 */
export enum ClientSymbolID {
  HELMET = 1,        // 頭盔 (symbol_01)
  CHEST_ARMOR = 2,   // 胸甲 (symbol_02)
  SCYTHE = 3,        // 鐮刀 (symbol_03)
  SHIELD = 4,        // 盾牌 (symbol_04)
  SUN = 5,           // 陽光 (symbol_05)
  MOON = 6,          // 月亮 (symbol_06)
  PURPLE_DIAMOND = 7,  // 紫色菱形 (symbol_07)
  BLUE_DIAMOND = 8,    // 藍色菱形 (symbol_08)
  GREEN_DIAMOND = 9,   // 綠色菱形 (symbol_09)
  SCATTER = 10,      // Scatter (symbol_10)
  JP = 11,           // Jp (symbol_11)
}

/**
 * 符號映射表
 * 將服務器符號 ID 映射到客戶端符號 ID
 * 
 * 格式：ServerSymbolID -> ClientSymbolID
 * 
 * 映射關係：
 * - 服務器 1 (頭盔) -> 客戶端 1
 * - 服務器 2 (胸甲) -> 客戶端 2
 * - 服務器 3 (鐮刀) -> 客戶端 3
 * - 服務器 4 (盾牌) -> 客戶端 4
 * - 服務器 11 (陽光) -> 客戶端 5
 * - 服務器 12 (月亮) -> 客戶端 6
 * - 服務器 13 (紫色菱形) -> 客戶端 7
 * - 服務器 14 (藍色菱形) -> 客戶端 8
 * - 服務器 15 (綠色菱形) -> 客戶端 9
 * - 服務器 31 (Scatter) -> 客戶端 10
 * - 服務器 100 (Jp) -> 客戶端 11
 */
const SYMBOL_MAP: Map<number, number> = new Map([
  // 基礎符號（1-4 一致）
  [1, 1],  // 頭盔
  [2, 2],  // 胸甲
  [3, 3],  // 鐮刀
  [4, 4],  // 盾牌
  
  // 特殊符號（需要映射）
  [11, 5],   // 陽光
  [12, 6],   // 月亮
  [13, 7],   // 紫色菱形
  [14, 8],   // 藍色菱形
  [15, 9],   // 綠色菱形
  [31, 10],  // Scatter
  [100, 11], // Jp
]);

/**
 * 符號映射器類
 */
export class SymbolMapper {
  /**
   * 將服務器符號 ID 轉換為客戶端符號 ID
   * @param serverSymbolId 服務器返回的符號 ID
   * @returns 客戶端使用的符號 ID，如果沒有映射則返回原值
   */
  static serverToClient(serverSymbolId: number): number {
    // 如果映射表為空，直接返回原值（假設服務器和客戶端 ID 一致）
    if (SYMBOL_MAP.size === 0) {
      return serverSymbolId;
    }
    
    // 查找映射
    const clientId = SYMBOL_MAP.get(serverSymbolId);
    
    // 如果找到映射，返回映射值；否則返回原值並記錄警告
    if (clientId !== undefined) {
      return clientId;
    } else {
      console.warn(`⚠️  未找到符號映射: 服務器 ID ${serverSymbolId}，使用原值`);
      return serverSymbolId;
    }
  }

  /**
   * 批量轉換服務器符號 ID 陣列
   * @param serverSymbolIds 服務器返回的符號 ID 陣列（二維陣列）
   * @returns 客戶端使用的符號 ID 陣列（二維陣列）
   */
  static serverToClientArray(serverSymbolIds: number[][]): number[][] {
    return serverSymbolIds.map(row => 
      row.map(symbolId => this.serverToClient(symbolId))
    );
  }

  /**
   * 將客戶端符號 ID 轉換為服務器符號 ID（反向映射）
   * @param clientSymbolId 客戶端使用的符號 ID
   * @returns 服務器使用的符號 ID
   */
  static clientToServer(clientSymbolId: number): number {
    // 創建反向映射
    const reverseMap = new Map<number, number>();
    SYMBOL_MAP.forEach((clientId, serverId) => {
      reverseMap.set(clientId, serverId);
    });
    
    const serverId = reverseMap.get(clientSymbolId);
    return serverId !== undefined ? serverId : clientSymbolId;
  }

  /**
   * 設置自定義映射表（用於動態配置）
   * @param map 映射表
   */
  static setCustomMap(map: Map<number, number>): void {
    SYMBOL_MAP.clear();
    map.forEach((clientId, serverId) => {
      SYMBOL_MAP.set(serverId, clientId);
    });
  }

  /**
   * 添加單個映射
   * @param serverId 服務器符號 ID
   * @param clientId 客戶端符號 ID
   */
  static addMapping(serverId: number, clientId: number): void {
    SYMBOL_MAP.set(serverId, clientId);
  }

  /**
   * 獲取當前映射表（用於調試）
   */
  static getMap(): Map<number, number> {
    return new Map(SYMBOL_MAP);
  }
}

