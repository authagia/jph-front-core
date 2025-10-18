// src/components/ApiForm.tsx

import React, { useState } from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form'; // useFieldArrayを追加
import { TextField, Button, Box, Typography, CircularProgress, IconButton } from '@mui/material'; // IconButtonを追加
import DeleteIcon from '@mui/icons-material/Delete'; // 削除アイコンを追加
import AddIcon from '@mui/icons-material/Add'; // 追加アイコンを追加
import {
  Evaluation,
  Oprf,
  OPRFClient
} from '@cloudflare/voprf-ts';
// import chunk from '../lib/chunk';

// フォームデータの型定義 🔑
// フォームの入力フィールド名とその値の型を定義します。
type FormInput = {
  text: string; // 個々の入力フィールドのデータ
};

type FormData = {
  inputs: FormInput[]; // フォームの配列データ
};

const MAX_INPUTS = 10; // 最大入力数

function ApiForm() {
  const {
    register,
    handleSubmit,
    control, // useFieldArrayを使うために必要
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    defaultValues: {
      inputs: [{ text: '' }], // 初期値として1つの入力フィールドを設定
    },
  });

  // useFieldArrayを使い、動的なフィールドリストを管理
  const { fields, append, remove } = useFieldArray({
    control,
    name: "inputs",
  });

  const [apiResult, setApiResult] = useState<string[] | null>(null);
  const [isError, setIsError] = useState<boolean>(false);

  // フォーム送信時の処理（型安全なSubmitHandlerを使用）
  const onSubmit: SubmitHandler<FormData> = async (data) => {
    // すべての入力テキストを抽出
    const allInputs = data.inputs.map(item => item.text).filter(text => text.trim() !== '');

    if (allInputs.length === 0) {
      setApiResult(['エラー: 有効な入力テキストがありません。']);
      setIsError(true);
      return;
    }

    // Ospf の処理
    const suite = Oprf.Suite.P384_SHA384;
    const client = new OPRFClient(suite);

    // すべての入力テキストをエンコードし、バッチとして処理
    const batch = allInputs.map(text => new TextEncoder().encode(text));
    const [finData, evalReq] = await client.blind(batch);

    // 実際のエンドポイントに置き換えてください
    const apiUrl = 'http://localhost:3000/upload-binary';

    setIsError(false);
    setApiResult(null);

    try {
      console.log(evalReq.serialize().byteLength);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: evalReq.serialize()
      });

      if (!response.ok) {
        // HTTPステータスが2xx以外の場合はエラーとして処理
        const errorData = await response.json();
        throw new Error(errorData.message || `API呼び出しに失敗しました。ステータス: ${response.status}`);
      }

      // 成功レスポンスのパースと型アサーション
      const uint8array = new Uint8Array(await response.arrayBuffer());
      const evaluation = Evaluation.deserialize(suite, uint8array);

      const outputs = await client.finalize(finData, evaluation); // 複数の出力を得る

      // すべての出力を処理
      const combinedResult = outputs.map(output => {
        const uint16array = new Uint16Array(output.buffer);
        // 出力ごとにグリフを生成し、結合
        return [...uint16array].map(u => String.fromCodePoint(0x2000 + u)).reduce((acc, c) => acc + c, '');
      }); // 複数の結果を区切り文字で結合

      setApiResult(combinedResult);

    } catch (error) {
      // ネットワークエラーやカスタムエラーの処理
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました。';
      setApiResult([`エラー: ${errorMessage}`]);
      setIsError(true);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)} // handleSubmitにonSubmitを渡す
      sx={{ maxWidth: 600, margin: 'auto', padding: 4, boxShadow: 3, borderRadius: 2 }}
    >
      <Typography variant="h5" component="h1" gutterBottom>
        API連携フォーム (最大{MAX_INPUTS}テキスト) 📝
      </Typography>

      {/* 動的入力フィールドのリスト */}
      {fields.map((item, index) => (
        <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TextField
            fullWidth
            label={`入力テキスト ${index + 1}`}
            variant="outlined"
            margin="none"
            // register関数でフィールドを登録。useFieldArrayではnameをinputs.${index}.textとする
            {...register(`inputs.${index}.text` as const, {
              required: "テキストは必須です",
              // minLength: { value: 5, message: "5文字以上で入力してください" }
            })}
            // エラー表示 (エラーオブジェクトのネスト構造に対応)
            error={!!errors.inputs?.[index]?.text}
            helperText={errors.inputs?.[index]?.text ? errors.inputs[index]?.text?.message : ''}
          />
          {/* 削除ボタン (フィールドが1つ以上ある場合のみ表示) */}
          {fields.length > 1 && (
            <IconButton
              onClick={() => remove(index)}
              color="error"
              aria-label="削除"
              sx={{ ml: 1 }}
            >
              <DeleteIcon />
            </IconButton>
          )}
        </Box>
      ))}

      {/* フィールド追加ボタン (最大数に達していない場合のみ表示) */}
      {fields.length < MAX_INPUTS && (
        <Button
          startIcon={<AddIcon />}
          onClick={() => append({ text: '' })}
          variant="outlined"
          color="secondary"
          sx={{ mt: 1 }}
        >
          入力テキストを追加 (残り: {MAX_INPUTS - fields.length})
        </Button>
      )}

      {/* フォームエラー全体の表示（必要に応じて） */}
      {/* {errors.inputs && <Typography color="error" sx={{ mt: 1 }}>{errors.inputs.message}</Typography>} */}

      {/* 送信ボタン */}
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={isSubmitting || fields.length === 0} // 送信中は無効化、フィールドがない場合も無効化
        sx={{ mt: 3 }}
        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
      >
        {isSubmitting ? '送信中...' : 'APIを叩く'}
      </Button>

      {/* APIの結果表示 */}
      {apiResult && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: isError ? 'error.light' : 'success.light', // エラーによって色を変更
            borderRadius: 1,
            overflowX: 'auto' // 結果が長い場合にスクロール可能にする
          }}
        >
          <Typography variant="h6" gutterBottom color={isError ? 'error.contrastText' : 'text.primary'}>
            **API応答:**
          </Typography>
          {/* apiResultが配列の場合、mapでリスト表示 */}
          {Array.isArray(apiResult) ? (
            <Box component="ul" sx={{ listStyle: 'none', paddingLeft: 0 }}>
              {apiResult.map((result, index) => (
                <Typography
                  component="li" // リストアイテムとしてレンダリング
                  key={index}
                  variant="body1"
                  color={isError ? 'error.contrastText' : 'text.primary'}
                  sx={{
                    mt: index > 0 ? 1 : 0, // 2番目以降のアイテムにマージンを追加
                    wordBreak: 'break-all',
                    // 各結果を強調表示
                    fontWeight: 'bold',
                    // 入力テキストの番号を追加
                    "&::before": {
                      content: `'${index + 1}. '`,
                      fontWeight: 'normal',
                      marginRight: 1,
                    }
                  }}
                >
                  {result}
                </Typography>
              ))}
            </Box>
          ) : (
            // apiResultがエラーメッセージなどの単一文字列の場合（この修正ではエラー処理のみ該当）
            <Typography variant="body1" color={isError ? 'error.contrastText' : 'text.primary'}>
              {apiResult}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

export default ApiForm;