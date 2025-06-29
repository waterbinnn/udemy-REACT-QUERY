import { queryKeys } from './constants';

export const generateUserKey = (userId: number, userToken: string) => {
  // userToken이 없어야 함. 사용자 ID에 대한 키를 동일하게 유지하기 위함
  return [queryKeys.user, userId];
};

export const generateAppointmentsKey = (userId: number, userToken: string) => {
  return [queryKeys.appointments, queryKeys.user, userId, userToken];
};
