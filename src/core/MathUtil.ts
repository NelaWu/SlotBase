/**
 * 數學工具類
 * 用於處理浮點數運算等問題
 */
export class MathUtil {
    /**
     * 安全的乘法運算
     * 解決浮點數乘法精度問題 (例如: 0.1 * 0.2 = 0.020000000000000004)
     * @param a 被乘數
     * @param b 乘數
     * @param precision 精度 (預設 12)
     * @returns 運算結果
     */
    static multiply(a: number, b: number, precision: number = 12): number {
        return parseFloat((a * b).toPrecision(precision));
    }

    /**
     * 安全的除法運算
     * 解決浮點數除法精度問題 (例如: 0.3 / 0.1 = 2.9999999999999996)
     * @param a 被除數
     * @param b 除數
     * @param precision 精度 (預設 12)
     * @returns 運算結果
     */
    static divide(a: number, b: number, precision: number = 12): number {
        return parseFloat((a / b).toPrecision(precision));
    }
}
