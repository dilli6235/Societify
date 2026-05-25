import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { errorMessage } from '@/lib/apiClient';
import { toast } from '@/components/ui/toast';
import { useLogin } from './api';

interface FormValues {
  societySlug: string;
  email: string;
  password: string;
}

export function LoginPage() {
  const { register, handleSubmit, formState } = useForm<FormValues>();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync({
        societySlug: values.societySlug || undefined,
        email: values.email,
        password: values.password,
      });
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card w-full max-w-md p-8"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Societify</h1>
            <p className="text-sm text-slate-500">Community management console</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Society URL (slug)">
            <Input placeholder="greenwood-heights" {...register('societySlug')} />
          </Field>
          <Field label="Email" error={formState.errors.email?.message}>
            <Input
              type="email"
              placeholder="admin@greenwood.local"
              {...register('email', { required: 'Email is required' })}
            />
          </Field>
          <Field label="Password" error={formState.errors.password?.message}>
            <Input type="password" {...register('password', { required: 'Password is required' })} />
          </Field>
          <Button type="submit" loading={login.isPending} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Leave the slug empty to sign in as a platform super admin.
        </p>
      </motion.div>
    </div>
  );
}
