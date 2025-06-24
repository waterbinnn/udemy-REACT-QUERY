import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosResponse } from 'axios';

import type { User } from '@shared/types';

import { useLoginData } from '@/auth/AuthContext';
import { axiosInstance, getJWTHeader } from '@/axiosInstance';
import { queryKeys } from '@/react-query/constants';
import { generateUserKey } from '@/react-query/key-factories';

// query function
async function getUser(userId: number, userToken: string) {
  const { data }: AxiosResponse<{ user: User }> = await axiosInstance.get(
    `/user/${userId}`,
    {
      headers: getJWTHeader(userToken),
    }
  );

  return data.user;
}

export function useUser() {
  const queryClient = useQueryClient();

  const { userId, userToken } = useLoginData();

  // call useQuery to update user data from server
  const { data: user } = useQuery({
    enabled: !!userId, //쿼리함수를 실행하고 싶지 않을때 쿼리 비활성화
    queryKey: generateUserKey(userId, userToken),
    queryFn: () => getUser(userId, userToken),
    staleTime: Infinity, //무한 . 가비지 컬렉션 시간이 만료되는 한 다시 가져오지 않음. + 이 데이터는 사용자가 스스로 업데이트할 경우에만 변경
  });

  // meant to be called from useAuth
  function updateUser(newUser: User): void {
    queryClient.setQueryData(
      generateUserKey(newUser.id, newUser.token), //키
      newUser //데이터
    );
  }

  // meant to be called from useAuth
  function clearUser() {
    // reset user to null in query cache
    queryClient.removeQueries({ queryKey: [queryKeys.user] });
    //reset appointments to null in query cache
    queryClient.removeQueries({
      queryKey: [queryKeys.appointments, queryKeys.user],
    });
  }

  return { user, updateUser, clearUser };
}
