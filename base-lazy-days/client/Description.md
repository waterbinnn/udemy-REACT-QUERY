# 1. 더 큰 앱에서의 react-query 설정, 커스텀훅, 집중화

## [Custom hook]

각 데이터 유형에 커스텀훅을 만들기
장점

- 다수의 컴포넌트에서 데이터를 엑세스 하는 경우 useQuery 호출을 재작성할 필요가 없다
- 데이터가 하나 이상의 컴포너트에 사용될 때 코드를 모듈식으로 관리할 수 있다.

useTreatments에서의 코드

```jsx
export function useTreatments(): Treatment[] {
  const fallback = [];
  const { data = fallback } = useQuery(queryKeys.treatments, getTreatments);

  return data;
}
```

data는 쿼리함수가 리졸브되기 전까지는 정의되지 않는다.<br>
(이 오류 로딩의 처리를 각각의 컴포넌트에서 해주는게 아니라
중앙에서 진행할 것)<br>
데이터에 대한 fallback값을 생성하여 확보한다. <br>
서버에서 시술 데이터를 받지 않고 캐시가 비어있는 경우 아무것도 표시하지 않도록 한다. <br>
`const fallback = [];` <br>
그리고 구조분해된 데이터에 대해 이걸 기본값으로 한다. <br>
`const { data = fallback } = useQuery(queryKeys.treatments, getTreatments);`

## [**queryClient**]

react-query > queryClient.ts 로 코드 분리

**집중화** <br>

- 로딩컴포넌트 <br>
  useIsFetching(리액트쿼리 내장 훅)이 불리언을 반환해서
  쿼리를 가져오고 있는지 알려줌

- 에러집중화 <br>
  onError 콜백으로 Toast 생성
  useQuery 호출에서 분해하는 isError과 error에 의존하지 않아도 된다.

# 2. Prefetch and Pagenation

## [Pre-fetching]

- 사용자가 현재 페이지 볼때 다음 페이지를 미리 가져온느 것
- 캐시 시간 안에 사용하지 않으면 가비지 컬렉션으로 이동됨
- prefetchQuery
  - queryClient의 메서드
  - queryClient 반환해야 하는데 이를 위해 useQuery client hook을 사용한다
  - 클라이언트 캐시에 추가된다
  - 일회성

home 컴포넌트에서 usePrefetchTreatements 훅을 호출해줄 것! => 데이터가 캐시에 미리 로드 => 캐시 시간이 다 되기 전에 사용자가 Treatment 페이지로 이동하는 한 캐시 된 데이터를 표시할 수 있기 때문에 사용자는 서버 호출을 할 때까지 기다릴 필요가 없다

프리패치할 훅을 useTreatment에 작성

```tsx
//useTreatment.ts
export function usePrefetchTreatments(): void {
  const queryClient = useQueryClient();
  queryClient.prefetchQuery(queryKeys.treatments, getTreatments);
}
```

- 캐시를 채우는 것이 목적이기 때문에 아무것도 반환하지 않아도 된다. (void 써줌)
- `const queryClient = new QueryClient();` 가져온 다음 prefetchQuery 실행
- prefetchQuery는 쿼리 키를 사용한다 (여기서 키는 캐시에서 어느 useQuery가 이 데이터를 찾아야 하는지 알려주기 때문에 매우 중요) 그리고 캐시에 있는 이 데이터가 이 useQuery 호출과 일치한다고 알려주는 것이다.
- 이렇게 훅을 작성해주고 Home컴포넌트서 훅을 사용

**Home.tsx** <br>
만들어준 usePrefetchTreatments 훅을 Home 컴포넌트의 최상위 레벨에서 실행한다. <br>

```tsx
export function Home(): ReactElement {
  usePrefetchTreatments();
  return (
   ...
  );
}
```

이렇게 해주면 Home 에만 들어가도 캐시에 Treatment가 들어와 있음!

## [useAppointment hook]

```tsx
//getAppointments 함수
async function getAppointments(
  year: string,
  month: string,
): Promise<AppointmentDateMap> {
  const { data } = await axiosInstance.get(`/appointments/${year}/${month}`);
  return data;
}

const [monthYear, setMonthYear] = useState(currentMonthYear);
```

```tsx
const fallback = {};

const { data: appointments = fallback } = useQuery(queryKeys.appointments, () =>
  getAppointments(monthYear.year, monthYear.month),
);
```

- useQuery를 실행하고 반환되는 데이터를 구조분해 한다
- 데이터의 이름은 appointments로 변경해서 반환값으로 가져올 수 있게 하고 기본값을 fallback 으로 설정
- 쿼리키는 queryKeys.appointments를 사용
- 쿼리 함수는 `getAppointments` 함수를 사용
- getAppointments는 year, month 를 인수로 받는데 monthYear인 상태에서 해당 인수를 가져오는 익명함수 적용

여기까지 작성해서 확인해보면<br>
데이터가 잘 불러와 지는듯 하지만 <br>
monthYear가 변경될 때 데이터가 변경되지 않는다는 문제가 있다.

_새 데이터가 로드되지 않는 이유는??_

- 모든 쿼리에 동일한 키를 사용하기 때문이다
  - 모든 쿼리가 지금 `queryKeys.appointments` 를 키로 사용한다.
- 이전 달 or 다음 다롤 이동하기 위해 화살표를 클릭하면 쿼리 데이터는 stale(만료) 상태이지만 Refetch(리패치)를 트리거할 대상이 없다.

_리페치를 트리거하려면?_ <br>

- 컴포넌트를 다시 마운트
- 창을 다시 포커스
- 리패치 함수를 수동으로 실행
- 자동 리페치 수행
  하는 방법이 있다.

React Query는 위와 같은 이유로 알려진 키에 대해서만 새 데이터를 가져온다. <br>
=> 해결책은 매월 새로운 키를 갖게 해주는 것 ! <br>

 <p style=color:yellow>키는 항상 의존성 배열로 취급해야한다!!!</p>
데이터가 변경될 경우 키도 변경되도록 해야 한다

```tsx
const fallback = {};

const { data: appointments = fallback } = useQuery(
  [queryKeys.appointments, monthYear.year, monthYear.month],
  () => getAppointments(monthYear.year, monthYear.month),
);
```

쿼리키에 year, month 에 의존하는 배열을 만들었다. <br>
`[queryKeys.appointments, monthYear.year, monthYear.month],` <br>
queryKeys.appointments 를 배열의 첫 번째 항목으로 유지해줬는데 이것은 데이터 무효화를 시작할 때 중요한 부분이다.
<br>
<br>
_데이터 무효화_

- 모든 배열에 공통점이 있어야 한다
  <br>
  의존성 배열로 만들어 주니까 새 데이터가 잘 로딩된다 !

## [pre-fetching calender]

프리패치는 QueryClient 메서드를 사용하고 React Query hook을 사용하여 QueryClient를 가져온다.

```tsx
//useAppointment.ts
const queryClient = useQueryClient();
useEffect(() => {
  const nextMonthYear = getNewMonthYear(monthYear, 1);
  queryClient.prefetchQuery(
    [queryKeys.appointments, nextMonthYear.year, nextMonthYear.month],
    () => getAppointments(nextMonthYear.year, nextMonthYear.month),
  );
}, [queryClient, monthYear]);
```

- useEffect 는 프리패치를 트리거하는 방법
- useQueryClient는 프리페치 메서드를 실행할 QueryClient 를 얻는 방법

- queryClient, monthYear 를 의존성 배열로 가진 useEffect 생성

- monthYear가 업데이트 될 때마다 <br>
  현재 monthYear 값과 한달이라는 증분을 기반으로 하는 <br>
  `const nextMonthYear = getNewMonthYear(monthYear, 1);`<br>
  nextMonthYear을 얻게되고 쿼리를 프리패칭 한다. <br>
  ` queryClient.prefetchQuery( [queryKeys.appointments, nextMonthYear.year, nextMonthYear.month], () => getAppointments(nextMonthYear.year, nextMonthYear.month), );`
- 쿼리키는 `[queryKeys.appointments, nextMonthYear.year, nextMonthYear.month]` 이 의존성 배열이 되고 appointments, year, month로 식별되게 된다.
- 쿼리 함수는 미래의 월과 연도가 포함된 getAppointMents
- 이 프리패치의 효과는 이 데이터로 캐시를 채워서 사용자가 다음달을 클릭할 때 표시되게 하는 것
