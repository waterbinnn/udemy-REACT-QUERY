import { useMutation, useQueryClient } from '@tanstack/react-query';
import jsonpatch from 'fast-json-patch';

import type { User } from '@shared/types';

import { axiosInstance, getJWTHeader } from '../../../axiosInstance';
import { useUser } from './useUser';

import { toast } from '@/components/app/toast';
import { queryKeys } from '@/react-query/constants';

export const MUTATION_KEY = 'patch-user';

// for when we need a server function
async function patchUserOnServer(
  newData: User | null,
  originalData: User | null
): Promise<User | null> {
  if (!newData || !originalData) return null;
  // create a patch for the difference between newData and originalData
  const patch = jsonpatch.compare(originalData, newData);

  //   // send patched data to the server
  const { data } = await axiosInstance.patch(
    `/user/${originalData.id}`,
    { patch },
    {
      headers: getJWTHeader(originalData.token),
    }
  );
  return data.user;
}

export function usePatchUser() {
  const { user, updateUser } = useUser();
  const queryClient = useQueryClient();

  const { mutate: patchUser } = useMutation({
    mutationKey: [MUTATION_KEY],
    mutationFn: (newData: User) => patchUserOnServer(newData, user),
    onSuccess: (userData: User | null) => {
      toast({ title: 'user updated!', status: 'success' });
    },
    onSettled: () => {
      //onSettled는 성공(onSuccess)과 오류(onError)가 결합된 것과 같음.
      //변형이 해결되면, 성공이든 오류든 상관없이 onSettled가 실행
      //변형이 진행 중인 상태를 유지하기 위해 이 프로미스를 반환해야 함
      //변형이 진행 중일 때 이 변형 데이터를 표시할 것이고
      //최종 단계를 실행하고 그 단계가 완료될 때까지 계속 표시할 것임
      return queryClient.invalidateQueries({ queryKey: [queryKeys.user] });
    },
  });

  return patchUser;
}
