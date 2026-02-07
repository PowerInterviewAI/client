/**
 * Action Lock Service
 * Manages blocking of long-running code suggestion actions (screenshot capture, suggestion generation)
 */

import { pushNotificationService } from './push-notification.service.js';

export enum ActionType {
  SCREENSHOT_CAPTURE = 'screenshot_capture',
  CODE_SUGGESTION = 'code_suggestion',
}

class ActionLockService {
  private currentAction: ActionType | null = null;

  /**
   * Try to acquire lock for an action
   * @returns true if lock acquired, false if blocked
   */
  tryAcquire(action: ActionType): boolean {
    if (this.currentAction !== null) {
      this.notifyBlocked(action, this.currentAction);
      return false;
    }
    this.currentAction = action;
    return true;
  }

  /**
   * Release the lock
   */
  release(action: ActionType): void {
    if (this.currentAction === action) {
      this.currentAction = null;
    }
  }

  /**
   * Check if any action is currently running
   */
  isLocked(): boolean {
    return this.currentAction !== null;
  }

  /**
   * Get the current running action
   */
  getCurrentAction(): ActionType | null {
    return this.currentAction;
  }

  /**
   * Notify user that action is blocked
   */
  private notifyBlocked(requestedAction: ActionType, runningAction: ActionType): void {
    const actionNames: Record<ActionType, string> = {
      [ActionType.SCREENSHOT_CAPTURE]: 'Screenshot capture',
      [ActionType.CODE_SUGGESTION]: 'Code suggestion generation',
    };

    const requested = actionNames[requestedAction];
    const running = actionNames[runningAction];

    console.log(`${requested} is blocked because ${running} is in progress.`);

    pushNotificationService.pushNotification({
      type: 'warning',
      message: `${running} is in progress. Try again a bit later.`,
    });
  }
}

export const actionLockService = new ActionLockService();
