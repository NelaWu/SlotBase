// 狀態機核心類別
export interface IState {
  name: string;
  onEnter?: () => void;
  onExit?: () => void;
  onUpdate?: (deltaTime: number) => void;
}

export interface ITransition {
  from: string;
  to: string;
  condition?: () => boolean;
  action?: () => void;
}

export type StateChangeCallback = (fromState: string, toState: string) => void;

export class StateMachine {
  private states: Map<string, IState> = new Map();
  private transitions: ITransition[] = [];
  private currentState: string | null = null;
  private stateChangeCallbacks: StateChangeCallback[] = [];

  constructor() {}

  // 添加狀態
  addState(state: IState): void {
    this.states.set(state.name, state);
  }

  // 添加狀態轉換
  addTransition(transition: ITransition): void {
    this.transitions.push(transition);
  }

  // 設置初始狀態
  setInitialState(stateName: string): void {
    if (this.states.has(stateName)) {
      this.currentState = stateName;
      const state = this.states.get(stateName);
      state?.onEnter?.();
    } else {
      throw new Error(`狀態 "${stateName}" 不存在`);
    }
  }

  // 嘗試轉換到指定狀態
  transitionTo(targetState: string): boolean {
    if (!this.currentState) {
      throw new Error('尚未設置初始狀態');
    }

    // 查找可用的轉換
    const validTransition = this.transitions.find(
      transition => 
        transition.from === this.currentState && 
        transition.to === targetState &&
        (transition.condition ? transition.condition() : true)
    );

    if (validTransition) {
      const fromState = this.currentState;
      
      // 離開當前狀態
      const currentStateObj = this.states.get(this.currentState);
      currentStateObj?.onExit?.();

      // 執行轉換動作
      validTransition.action?.();

      // 進入新狀態
      this.currentState = targetState;
      const newStateObj = this.states.get(targetState);
      newStateObj?.onEnter?.();

      // 通知狀態變更
      this.stateChangeCallbacks.forEach(callback => 
        callback(fromState, targetState)
      );

      return true;
    }

    return false;
  }

  // 更新狀態機
  update(deltaTime: number): void {
    if (this.currentState) {
      const state = this.states.get(this.currentState);
      state?.onUpdate?.(deltaTime);
    }
  }

  // 獲取當前狀態
  getCurrentState(): string | null {
    return this.currentState;
  }

  // 添加狀態變更回調
  onStateChange(callback: StateChangeCallback): void {
    this.stateChangeCallbacks.push(callback);
  }

  // 移除狀態變更回調
  removeStateChangeCallback(callback: StateChangeCallback): void {
    const index = this.stateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.stateChangeCallbacks.splice(index, 1);
    }
  }

  // 檢查是否可以轉換到指定狀態
  canTransitionTo(targetState: string): boolean {
    if (!this.currentState) return false;
    
    return this.transitions.some(
      transition => 
        transition.from === this.currentState && 
        transition.to === targetState &&
        (transition.condition ? transition.condition() : true)
    );
  }
} 