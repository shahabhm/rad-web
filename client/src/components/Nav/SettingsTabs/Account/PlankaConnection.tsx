import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { RefreshCw, Unplug } from 'lucide-react';
import {
  useGetPlankaStatusQuery,
  useLinkPlankaAccountMutation,
  useUnlinkPlankaAccountMutation,
} from '~/data-provider';
import { Button, Spinner, Label } from '@librechat/client';
import { useLocalize } from '~/hooks';

interface PlankaLinkForm {
  emailOrUsername: string;
  password: string;
}

function PlankaConnection() {
  const localize = useLocalize();
  const [showLinkForm, setShowLinkForm] = useState(false);

  const { data: plankaStatus, isLoading: isLoadingStatus, refetch } = useGetPlankaStatusQuery();
  const linkMutation = useLinkPlankaAccountMutation();
  const unlinkMutation = useUnlinkPlankaAccountMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PlankaLinkForm>();

  const onLinkSubmit = (data: PlankaLinkForm) => {
    linkMutation.mutate(data, {
      onSuccess: () => {
        setShowLinkForm(false);
        reset();
      },
    });
  };

  const handleUnlink = () => {
    if (confirm(localize('com_planka_disconnect_confirm'))) {
      unlinkMutation.mutate();
    }
  };

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="border-b border-border-light pb-3 last-of-type:border-b-0 dark:border-border-dark">
      <div className="mb-2">
        <Label>{localize('com_planka_integration')}</Label>
      </div>

      {plankaStatus?.connected ? (
        <div className="space-y-3">
          <div className="rounded-md bg-surface-secondary p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium text-text-primary">{localize('com_planka_connected')}</div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-text-secondary">{localize('com_planka_active')}</span>
              </div>
            </div>
            
            {plankaStatus.userData && (
              <div className="space-y-2">
                {plankaStatus.userData.avatar?.url && (
                  <div className="flex items-center gap-3 border-b border-border-light pb-2 dark:border-border-dark">
                    <img
                      src={plankaStatus.userData.avatar.url}
                      alt={plankaStatus.userData.name || 'User avatar'}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {plankaStatus.userData.name || 'N/A'}
                      </div>
                      <div className="text-xs text-text-secondary">
                        @{plankaStatus.userData.username || 'N/A'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">{localize('com_planka_email')}</span>
                    <span className="text-text-primary">{plankaStatus.userData.email || 'N/A'}</span>
                  </div>
                  
                  {plankaStatus.userData.role && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">{localize('com_planka_role')}</span>
                      <span className="rounded bg-surface-tertiary px-1.5 py-0.5 text-text-primary">
                        {plankaStatus.userData.role}
                      </span>
                    </div>
                  )}

                  {plankaStatus.userData.organization && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">{localize('com_planka_organization')}</span>
                      <span className="text-text-primary">{plankaStatus.userData.organization}</span>
                    </div>
                  )}

                  {plankaStatus.userData.phone && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">{localize('com_planka_phone')}</span>
                      <span className="text-text-primary">{plankaStatus.userData.phone}</span>
                    </div>
                  )}

                  {plankaStatus.userData.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">{localize('com_planka_member_since')}</span>
                      <span className="text-text-primary">
                        {new Date(plankaStatus.userData.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              onClick={() => refetch()}
              disabled={isLoadingStatus}
              variant="outline"
              className="gap-2"
            >
              {isLoadingStatus ? (
                <Spinner className="size-4" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {localize('com_ui_refresh')}
            </Button>

            <Button
              type="button"
              onClick={handleUnlink}
              disabled={unlinkMutation.isLoading}
              variant="destructive"
              className="gap-2"
            >
              {unlinkMutation.isLoading ? (
                <Spinner className="size-4" />
              ) : (
                <Unplug className="size-4" />
              )}
              {localize('com_planka_disconnect')}
            </Button>
          </div>

          {unlinkMutation.isError && (
            <div className="text-xs text-red-600 dark:text-red-400">
              {localize('com_planka_error_disconnecting')} {unlinkMutation.error?.message || 'Unknown error'}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-text-secondary">
            {localize('com_planka_description')}
          </div>

          {!showLinkForm ? (
            <Button 
              type="button" 
              onClick={() => setShowLinkForm(true)} 
              variant="outline"
              className="w-full"
            >
              {localize('com_planka_connect_account')}
            </Button>
          ) : (
            <form onSubmit={handleSubmit(onLinkSubmit)} className="space-y-3">
              <div>
                <label
                  htmlFor="emailOrUsername"
                  className="mb-1 block text-sm font-medium text-text-primary"
                >
                  {localize('com_planka_email_or_username')}
                </label>
                <input
                  id="emailOrUsername"
                  type="text"
                  {...register('emailOrUsername', {
                    required: localize('com_planka_email_or_username_required'),
                  })}
                  className="w-full rounded-md border border-border-medium bg-transparent px-3 py-2 text-sm focus:border-border-heavy focus:outline-none"
                  placeholder={localize('com_planka_email_or_username_placeholder')}
                />
                {errors.emailOrUsername && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.emailOrUsername.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-text-primary">
                  {localize('com_planka_password')}
                </label>
                <input
                  id="password"
                  type="password"
                  {...register('password', {
                    required: localize('com_planka_password_required'),
                  })}
                  className="w-full rounded-md border border-border-medium bg-transparent px-3 py-2 text-sm focus:border-border-heavy focus:outline-none"
                  placeholder={localize('com_planka_password_placeholder')}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
                )}
              </div>

              {linkMutation.isError && (
                <div className="rounded-md bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {localize('com_planka_error_connecting')} {linkMutation.error?.message || 'Unknown error'}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={linkMutation.isLoading}
                  variant="default"
                  className="flex-1"
                >
                  {linkMutation.isLoading && <Spinner className="mr-2" />}
                  {localize('com_planka_connect')}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowLinkForm(false);
                    reset();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  {localize('com_planka_cancel')}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default PlankaConnection;
