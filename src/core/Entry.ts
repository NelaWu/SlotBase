/**
 * 遊戲入口類
 * 提供全局訪問遊戲詳情信息
 */
export class Entry {
  private static gameDetail: any = null;

  /**
   * 獲取遊戲詳情
   * @returns 遊戲詳情對象
   */
  public static get getDetail(): any {
    return this.gameDetail;
  }

  /**
   * 設置遊戲詳情
   * @param detail 遊戲詳情對象
   */
  public static setGameDetail(detail: any): void {
    this.gameDetail = detail;
  }

  /**
   * 清除遊戲詳情
   */
  public static clearGameDetail(): void {
    this.gameDetail = null;
  }
}
