import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';

import { AppointmentDateMap } from '../types';
import { getAvailableAppointments } from '../utils';
import { getMonthYearDetails, getNewMonthYear, MonthYear } from './monthYear';

import { useLoginData } from '@/auth/AuthContext';
import { axiosInstance } from '@/axiosInstance';
import { queryKeys } from '@/react-query/constants';

//for useQuery and PrefetchQuery
const commonOptions = {
  staleTime: 0,
  gcTime: 30000, //5min
};

async function getAppointments(
  year: string,
  month: string
): Promise<AppointmentDateMap> {
  const { data } = await axiosInstance.get(`/appointments/${year}/${month}`);
  return data;
}

/*
 이 훅의 목적:
   1. 사용자가 선택한 현재 연/월(monthYear)을 추적
     1a. 상태를 업데이트할 수 있는 방법 제공
   2. 해당 monthYear에 대한 예약 데이터를 반환
     2a. AppointmentDateMap 형식으로 반환 (일자별 예약 배열 포함)
     2b. 인접한 monthYear의 예약도 미리 가져오기(prefetch)
   3. 필터 상태 추적 (전체 예약 / 가능한 예약만 보기)
     3a. 현재 monthYear에 해당하는 적절한 예약만 반환
     */
export function useAppointments() {
  const queryClient = useQueryClient();

  /** ****************** START 1: monthYear 상태 *********************** */
  // 현재 날짜에 해당하는 monthYear 정보를 가져옴 (초기 상태 설정용)
  const currentMonthYear = getMonthYearDetails(dayjs());

  // 사용자가 선택한 monthYear를 추적하는 상태
  // 이 값은 훅의 반환 객체에 포함됨
  const [monthYear, setMonthYear] = useState(currentMonthYear);

  // 사용자가 화면에서 월을 변경할 때 상태를 업데이트하는 함수
  // 이 함수도 훅의 반환 객체에 포함됨
  function updateMonthYear(monthIncrement: number): void {
    setMonthYear((prevData) => getNewMonthYear(prevData, monthIncrement));
  }

  /** ****************** START 2: 예약 필터링 ****************** */
  // 전체 예약을 볼지, 가능한 예약만 볼지를 위한 상태와 함수
  const [showAll, setShowAll] = useState(false);

  // getAvailableAppointments 함수를 사용하기 위해 필요함
  // 로그인한 사용자의 예약(흰색 표시)을 보여주기 위해 user 정보를 넘겨야 함
  const { userId } = useLoginData();

  const selectFn = useCallback(
    (data: AppointmentDateMap, showAll: boolean) => {
      if (showAll) return data;
      return getAvailableAppointments(data, userId);
    },
    [userId]
  );

  /** ****************** START 3: useQuery 사용 ***************************** */
  // 현재 monthYear에 해당하는 예약을 가져오기 위한 useQuery 호출

  // appointments는 AppointmentDateMap 형식임 (일자별로 예약 배열이 들어있는 객체)
  const fallback: AppointmentDateMap = {};

  const { data: appointments = fallback } = useQuery({
    queryKey: [queryKeys.appointments, monthYear.year, monthYear.month], // 쿼리 키로 고유한 배열 사용
    queryFn: () => getAppointments(monthYear.year, monthYear.month),
    select: (data) => selectFn(data, showAll),
    refetchOnWindowFocus: true,
    refetchInterval: 60000, //polling
    ...commonOptions,
  });

  // 다음 달의 예약 데이터 Prefetching
  useEffect(() => {
    const nextMonthYear = getNewMonthYear(monthYear, 1);
    queryClient.prefetchQuery({
      queryKey: [
        queryKeys.appointments,
        nextMonthYear.year,
        nextMonthYear.month,
      ],
      queryFn: () => getAppointments(nextMonthYear.year, nextMonthYear.month),
      ...commonOptions,
    });
  }, [monthYear, queryClient]);

  return {
    appointments,
    monthYear,
    updateMonthYear,
    showAll,
    setShowAll,
  };
}
