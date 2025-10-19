// src/components/InputForm.tsx
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { TextField, Button, Box, Typography, CircularProgress, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { type FormData } from './ApiFormContainer'; // 親から型をインポート

type InputFormProps = {
    onSubmit: SubmitHandler<FormData>; // 親から渡される送信ハンドラ
    maxInputs: number;
};

function InputForm({ onSubmit, maxInputs }: InputFormProps) {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting }
    } = useForm<FormData>({
        defaultValues: {
            inputs:new Array(3).fill({ text: '' }),
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "inputs",
    });

    return (
        <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)} // 親のonSubmitを実行
        >
            <Typography variant="h5" component="h1" gutterBottom>
                API連携フォーム (最大{maxInputs}テキスト) 📝
            </Typography>

            {/* 動的入力フィールドのリスト */}
            {fields.map((item, index) => (
                <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TextField
                        fullWidth
                        label={`入力テキスト ${index + 1}`}
                        variant="outlined"
                        margin="none"
                        {...register(`inputs.${index}.text` as const, {
                            required: "テキストは必須です",
                        })}
                        error={!!errors.inputs?.[index]?.text}
                        helperText={errors.inputs?.[index]?.text ? errors.inputs[index]?.text?.message : ''}
                    />
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

            {/* フィールド追加ボタン */}
            {fields.length < maxInputs && (
                <Button
                    startIcon={<AddIcon />}
                    onClick={() => append({ text: '' })}
                    variant="outlined"
                    color="secondary"
                    sx={{ mt: 1 }}
                >
                    入力テキストを追加 (残り: {maxInputs - fields.length})
                </Button>
            )}

            {/* 送信ボタン */}
            <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={isSubmitting || fields.length === 0}
                sx={{ mt: 3 }}
                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
                {isSubmitting ? '送信中...' : 'APIを叩く'}
            </Button>
        </Box>
    );
}

export default InputForm;