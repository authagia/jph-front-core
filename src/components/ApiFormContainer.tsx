// src/components/ApiFormContainer.tsx
import { useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { Oprf, OPRFClient, Evaluation } from '@cloudflare/voprf-ts';
import { type SubmitHandler } from 'react-hook-form';

// 外部コンポーネントをインポート
import InputForm from './InputForm';
import ResultDisplay from './ResultDisplay';
import { bytesToEmoji } from '../lib/emojiMap256';

// フォームデータの型定義をここで定義し、InputFormと共有します
export type FormInput = {
    text: string;
};

export type FormData = {
    inputs: FormInput[];
};

// 新しい型の定義
export type DisplayResultItem = {
    originalText: string;
    apiOutput: string;
};

const MAX_INPUTS = 10;

function ApiFormContainer() {
    // 画面切り替えの状態管理
    const [isResultView, setIsResultView] = useState<boolean>(false);

    // API結果とエラー状態の管理
    // const [apiResult, setApiResult] = useState<string[] | null>(null);
    const [isError, setIsError] = useState<boolean>(false);
    const [displayResults, setDisplayResults] = useState<DisplayResultItem[] | null>(null);


    // フォームリセットと入力画面に戻る処理
    const handleReset = useCallback(() => {
        setIsResultView(false); // 結果画面を非表示に
        // setApiResult(null);     // 結果をクリア
        setDisplayResults(null);
        setIsError(false);      // エラー状態をリセット
    }, []);

    const [userInputData, setUserInputData] = useState<FormData | null>(null);

    // フォーム送信時の処理（InputFormから渡される）
    const onSubmit: SubmitHandler<FormData> = async (data) => {
        const allInputs = data.inputs.map(item => item.text).filter(text => text.trim() !== '');

        if (allInputs.length === 0) {
            // setApiResult(['エラー: 有効な入力テキストがありません。']);
            setIsError(true);
            setIsResultView(true);
            return;
        }
        setUserInputData(data);

        const suite = Oprf.Suite.P384_SHA384;
        const client = new OPRFClient(suite);

        const batch = allInputs.map(text => new TextEncoder().encode(text));
        const [finData, evalReq] = await client.blind(batch);

        const apiUrl = 'http://localhost:3000/upload-binary';

        setIsError(false);
        // setApiResult(null);

        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/octet-stream" },
                body: evalReq.serialize() as BodyInit, // ちょっと汚いWA
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `API呼び出しに失敗しました。ステータス: ${response.status}`);
            }

            const uint8array = new Uint8Array(await response.arrayBuffer());
            const evaluation = Evaluation.deserialize(suite, uint8array);

            const outputs = await client.finalize(finData, evaluation);

            const combinedResult = outputs.map(output => {
                // 提案されたグリフ生成ロジック
                // return [...output].map(u => String.fromCodePoint(0x2600 + u)).reduce((acc, c) => acc + c, '');
                return bytesToEmoji(output.slice(0, 8));
            });


            // 🔑 最終表示用のデータ構造を生成
            const combinedDisplayResults: DisplayResultItem[] = allInputs.map((text, index) => ({
                originalText: text,
                apiOutput: combinedResult[index],
            }));

            // 新しいステートに保存
            setDisplayResults(combinedDisplayResults);
            // setApiResult(combinedResult);

        } catch (error) {
            // const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました。';
            // setApiResult([`エラー: ${errorMessage}`]);
            setIsError(true);
        } finally {
            // 処理完了後、結果画面に切り替え
            setIsResultView(true);
        }
    };

    return (
        <Box
            sx={{ maxWidth: 600, margin: 'auto', padding: 4, boxShadow: 3, borderRadius: 2 }}
        >
            {/* 画面切り替えのロジック */}
            {!isResultView || !userInputData ? (
                // 入力フォームの表示
                <InputForm
                    onSubmit={onSubmit}
                    maxInputs={MAX_INPUTS}
                />
            ) : (
                // 結果表示の表示
                <ResultDisplay
                    apiResult={displayResults}
                    isError={isError}
                    onReset={handleReset}
                />
            )}
        </Box>
    );
}

export default ApiFormContainer;