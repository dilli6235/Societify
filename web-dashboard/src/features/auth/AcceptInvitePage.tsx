import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { post } from '@/lib/apiClient';
import { errorMessage } from '@/lib/apiClient';
import { toast } from '@/components/ui/toast';

/** Public page the invitee lands on from their activation link. */
export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { register, handleSubmit, formState } = useForm<{ password: string }>();
  const [done, setDone] = useState<{ societySlug: string; email: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = handleSubmit(async ({ password }) => {
    setLoading(true);
    try {
      const res = await post<{ societySlug: string; email: string }>('/users/accept-invite', { token, password });
      setDone(res);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card w-full max-w-md p-8">
        {done ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
            <h1 className="text-lg font-semibold text-slate-900">Account activated</h1>
            <p className="mt-1 text-sm text-slate-500">You can now sign in as {done.email}.</p>
            <Button className="mt-5 w-full" onClick={() => navigate('/login')}>Go to sign in</Button>
          </div>
        ) : !token ? (
          <p className="text-center text-sm text-slate-500">This invitation link is invalid.</p>
        ) : (
          <>
            <h1 className="mb-1 text-lg font-semibold text-slate-900">Set your password</h1>
            <p className="mb-5 text-sm text-slate-500">Choose a password to activate your account.</p>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="New password" error={formState.errors.password?.message}>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Use at least 8 characters' },
                  })}
                />
              </Field>
              <Button type="submit" loading={loading} className="w-full">Activate account</Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
