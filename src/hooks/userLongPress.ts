// src/hooks/useLongPress.ts

import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * 長押しイベントを検出するカスタムフック
 * @param callback 長押しが検出されたときに実行する関数
 * @param duration 長押しと判定する時間（ミリ秒）。デフォルトは3000ms（3秒）。
 * @returns Reactのイベントハンドラに渡すPropsのオブジェクト
 */
export const useLongPress = (
  pressed: () => void,
  released: () => void,
  duration: number = 3000
) => {
  // 押下状態を保持するState
  const [, setIsPressing] = useState(false);
  // タイマーIDを保持するRef
  const timeoutRef = useRef<number | null>(null);

  // 押下が開始されたときの処理
  const start = useCallback(() => {
    setIsPressing(true);
    // 指定時間後にコールバックを実行するタイマーを設定
    timeoutRef.current = setTimeout(() => {
      pressed();
      setIsPressing(false); // 長押し完了後、押下状態をリセット
    }, duration);
  }, [pressed, duration]);

  // 押下が終了したときの処理（長押し時間経過前でも呼ばれる）
  const clear = useCallback(() => {
    // タイマーが設定されていれば解除
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    setIsPressing(false);
    timeoutRef.current = null;
    released();
  }, [released]);

  // コンポーネントのアンマウント時、および押下状態がリセットされたときもタイマーをクリア
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ユーザーのデバイスタイプに応じて、マウスイベントまたはタッチイベントのPropsを返す
  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear, // 要素の外にカーソルが移動した場合もクリア
    onTouchStart: start,
    onTouchEnd: clear,
  };
};