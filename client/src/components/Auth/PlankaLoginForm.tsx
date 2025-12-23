import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { setTokenHeader } from 'librechat-data-provider';
import { Button, Spinner } from '@librechat/client';
import { usePlankaLoginMutation, useGetPlankaConfigQuery } from '~/data-provider/planka';
import { useAuthContext } from '~/hooks/AuthContext';
import { useLocalize } from '~/hooks';
import store from '~/store';

interface PlankaLoginFormData {
  emailOrUsername: string;
  password: string;
}

const PlankaLoginForm: React.FC = () => {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { setError } = useAuthContext();
  const setUser = useSetRecoilState(store.user);
  const setQueriesEnabled = useSetRecoilState(store.queriesEnabled);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: plankaConfig, isLoading: configLoading } = useGetPlankaConfigQuery();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlankaLoginFormData>();

  const plankaLoginMutation = usePlankaLoginMutation({
    onSuccess: (data) => {
      // Set token header for API requests
      setTokenHeader(data.token);
      
      // Update user state
      setUser(data.user);
      
      // Enable queries
      setQueriesEnabled(true);
      
      // Clear any errors
      setError(undefined);
      
      // Navigate to chat
      navigate('/c/new');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Planka login failed. Please try again.';
      setFormError(message);
    },
  });

  const onSubmit = (data: PlankaLoginFormData) => {
    setFormError(null);
    plankaLoginMutation.mutate(data);
  };

  if (configLoading) {
    return (
      <div className="flex justify-center p-4">
        <Spinner />
      </div>
    );
  }

  if (!plankaConfig?.enabled) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-light dark:border-border-dark" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-surface-primary px-2 text-text-secondary">
            Or continue with Planka
          </span>
        </div>
      </div>

      {formError && (
        <div className="mt-4 rounded-md border border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="planka-emailOrUsername"
            className="block text-sm font-medium text-text-primary"
          >
            Planka Email or Username
          </label>
          <input
            id="planka-emailOrUsername"
            type="text"
            autoComplete="username"
            className="mt-1 block w-full rounded-md border border-border-light bg-surface-primary px-3 py-2 text-text-primary placeholder-text-secondary shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 dark:border-border-dark"
            {...register('emailOrUsername', {
              required: 'Email or username is required',
            })}
          />
          {errors.emailOrUsername && (
            <span className="mt-1 text-sm text-red-500">{errors.emailOrUsername.message}</span>
          )}
        </div>

        <div>
          <label
            htmlFor="planka-password"
            className="block text-sm font-medium text-text-primary"
          >
            Planka Password
          </label>
          <input
            id="planka-password"
            type="password"
            autoComplete="current-password"
            className="mt-1 block w-full rounded-md border border-border-light bg-surface-primary px-3 py-2 text-text-primary placeholder-text-secondary shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 dark:border-border-dark"
            {...register('password', {
              required: 'Password is required',
            })}
          />
          {errors.password && (
            <span className="mt-1 text-sm text-red-500">{errors.password.message}</span>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || plankaLoginMutation.isLoading}
          className="w-full rounded-2xl border border-green-600 bg-green-600 px-5 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting || plankaLoginMutation.isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Spinner className="h-4 w-4" />
              <span>Logging in...</span>
            </div>
          ) : (
            'Login with Planka'
          )}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-text-secondary">
        This will create a Rastar Chat account if you don't have one
      </p>
    </div>
  );
};

export default PlankaLoginForm;
