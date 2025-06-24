import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { Treatment } from '@shared/types';

import { axiosInstance } from '@/axiosInstance';
import { queryKeys } from '@/react-query/constants';

// for when we need a query function for useQuery
async function getTreatments(): Promise<Treatment[]> {
  const { data } = await axiosInstance.get('/treatments');
  return data;
}

export function useTreatments(): Treatment[] {
  const fallback: Treatment[] = [];

  const { data = fallback } = useQuery({
    queryKey: [queryKeys.treatments],
    queryFn: getTreatments,
    //stale time이 경과되어도, 리패치 트리거 X
    //refetch를 실행하는 경우 : 캐시가 비어있을 때
    // staleTime: 600000, //10 min
    // gcTime: 900000, //15min - staleTime 보다 길어야 함
    // refetchOnMount: false,
    // refetchOnWindowFocus: false,
    // refetchOnReconnect: false,
    //
  });

  return data;
}

export function usePrefetchTreatments(): void {
  const queryClient = useQueryClient();
  queryClient.prefetchQuery({
    queryKey: [queryKeys.treatments],
    queryFn: getTreatments,
    // staleTime: 600000, //10 min
    // gcTime: 900000,
  });
}
