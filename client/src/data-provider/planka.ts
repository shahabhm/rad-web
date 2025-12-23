import { useMutation, useQuery } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { request } from 'librechat-data-provider';

/* Planka Types */
export interface PlankaLoginPayload {
  emailOrUsername: string;
  password: string;
}

export interface PlankaLoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    username: string;
    avatar?: string;
    role: string;
    provider: string;
    plankaConnected: boolean;
  };
}

export interface PlankaLinkResponse {
  message: string;
  plankaUser: {
    email: string;
    name: string;
    username: string;
  };
}

export interface PlankaStatusResponse {
  connected: boolean;
  userData?: {
    email: string;
    name: string;
    username: string;
  } | null;
}

export interface PlankaConfigResponse {
  enabled: boolean;
  baseUrl: string | null;
}

/* Planka API Calls */
const plankaLogin = async (payload: PlankaLoginPayload): Promise<PlankaLoginResponse> => {
  return request.post('/api/planka/login', payload);
};

const linkPlankaAccount = async (payload: PlankaLoginPayload): Promise<PlankaLinkResponse> => {
  return request.post('/api/planka/link', payload);
};

const unlinkPlankaAccount = async (): Promise<{ message: string }> => {
  return request.post('/api/planka/unlink', {});
};

const getPlankaStatus = async (): Promise<PlankaStatusResponse> => {
  return request.get('/api/planka/status');
};

const getPlankaConfig = async (): Promise<PlankaConfigResponse> => {
  return request.get('/api/planka/config');
};

/* Planka Hooks */

/**
 * Hook for Planka login
 * Creates LibreChat account and logs in with Planka credentials
 */
export const usePlankaLoginMutation = (options?: {
  onSuccess?: (data: PlankaLoginResponse) => void;
  onError?: (error: AxiosError) => void;
}): UseMutationResult<PlankaLoginResponse, AxiosError, PlankaLoginPayload> => {
  return useMutation({
    mutationFn: plankaLogin,
    ...options,
  });
};

/**
 * Hook for linking Planka account to existing LibreChat account
 */
export const useLinkPlankaAccountMutation = (options?: {
  onSuccess?: (data: PlankaLinkResponse) => void;
  onError?: (error: AxiosError) => void;
}): UseMutationResult<PlankaLinkResponse, AxiosError, PlankaLoginPayload> => {
  return useMutation({
    mutationFn: linkPlankaAccount,
    ...options,
  });
};

/**
 * Hook for unlinking Planka account
 */
export const useUnlinkPlankaAccountMutation = (options?: {
  onSuccess?: (data: { message: string }) => void;
  onError?: (error: AxiosError) => void;
}): UseMutationResult<{ message: string }, AxiosError, void> => {
  return useMutation({
    mutationFn: unlinkPlankaAccount,
    ...options,
  });
};

/**
 * Hook for getting Planka connection status
 */
export const useGetPlankaStatusQuery = (
  enabled = true,
): UseQueryResult<PlankaStatusResponse, AxiosError> => {
  return useQuery({
    queryKey: ['plankaStatus'],
    queryFn: getPlankaStatus,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for getting Planka configuration
 */
export const useGetPlankaConfigQuery = (): UseQueryResult<PlankaConfigResponse, AxiosError> => {
  return useQuery({
    queryKey: ['plankaConfig'],
    queryFn: getPlankaConfig,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
