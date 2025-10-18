// src/components/ApiForm.tsx

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { TextField, Button, Box, Typography, CircularProgress } from '@mui/material';
import {
  Evaluation,
  Oprf,
  OPRFClient
} from '@cloudflare/voprf-ts';
// フォームデータの型定義 🔑
// フォームの入力フィールド名とその値の型を定義します。
type FormData = {
  inputText: string;
};

function ApiForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>(); // useFormにFormData型を適用

  const [apiResult, setApiResult] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);

  // フォーム送信時の処理（型安全なSubmitHandlerを使用）
  const onSubmit: SubmitHandler<FormData> = async (data) => {
    // Ospf の処理
    const suite = Oprf.Suite.P384_SHA384;
    const client = new OPRFClient(suite);

    const input = new TextEncoder().encode(data.inputText);
    const batch = [input];
    const [finData, evalReq] = await client.blind(batch);


    // 実際のエンドポイントに置き換えてください
    const apiUrl = 'http://localhost:3000/upload-binary';

    setIsError(false);
    setApiResult(null);

    try {
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

      const [output] = await client.finalize(finData, evaluation);

      setApiResult(output?.toHex())

    } catch (error) {
      // ネットワークエラーやカスタムエラーの処理
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました。';
      setApiResult(`エラー: ${errorMessage}`);
      setIsError(true);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)} // handleSubmitにonSubmitを渡す
      sx={{ maxWidth: 500, margin: 'auto', padding: 4, boxShadow: 3, borderRadius: 2 }}
    >
      <Typography variant="h5" component="h1" gutterBottom>
        API連携フォーム (TS)
      </Typography>

      {/* テキスト入力フィールド */}
      <TextField
        fullWidth
        label="入力テキスト"
        variant="outlined"
        margin="normal"
        // register関数でフィールドを登録し、バリデーションルールを設定
        {...register("inputText", {
          required: "テキストは必須です",
          minLength: { value: 5, message: "5文字以上で入力してください" }
        })}
        // エラー表示
        error={!!errors.inputText}
        helperText={errors.inputText ? errors.inputText.message : ''}
      />

      {/* 送信ボタン */}
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={isSubmitting} // 送信中は無効化
        sx={{ mt: 2 }}
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
            borderRadius: 1
          }}
        >
          <Typography variant="body1" color={isError ? 'error.contrastText' : 'text.primary'}>
            **API応答:** {apiResult}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default ApiForm;