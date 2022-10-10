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

# useQuery 의 select 옵션으로 데이터 필터링하기

Select 옵션을 사용해 작업하는 이유

- Memoization : React Query 는 불필요한 연산을 줄이는 최적화를 하는데 이것을 메모이제이션이라고 한다.
- 리액트 쿼리는 셀렉트 함수를 삼중 등호로 비교하며, 셀렉트 함수는 데이터와 함수 모두 변경되었을 경우에만 실행된다.
- 마지막으로 검색한 데이터와 동일한 데이터이고 셀렉트 함수에도 변동이 없으면 셀렉트 함수를 재실행하지 않는 것이 리액트 쿼리의 최적화

=> 셀렉트 함수에는 안정적인 함수가 필요하다 <br>
( 매번 바뀌는 익명함수, 삼중 등호로 비교하는 함수는 실패한다. )
<br>
useCallback : 익명함수를 안정적인 함수로 만들때 사용

# Re-fetching

기본적으로 리패칭을 위해 염두해야 할 사항은 서버가 만효 데이터를 업데이트 한다는 것. <br>
즉, 일정 시간이 지나면 서버가 만료된 데이터를 삭제함 <br>
이런 리페칭은 페이지를 벗어났다가 다시 돌아왔을 때 볼 수 있다.
<br>
**리페칭은 언제 일어나는지?**
stale 쿼리는 아래 조건 하에서 자동적으로 다시 가져오기가 된다.

- 새로운 쿼리 인스턴스가 많아질 때
- 쿼리 키가 처음 호출될 때
- 쿼리를 호출하는 반응 컴포넌트를 증가시킬 때
- 창을 재포커스할 때
- 만료된 데이터의 업데이트 여부를 확인할 수 있는 네트워크가 다시 연결된 경우
- 리패칭 간격이 지난 경우
  - 이 경우는 간격에 리페칭을 해서 서버를 pull해오고 사용자 조치가 없더라도 데이터가 업데이트 되는 경우

이것들은 옵션으로 제어할 수 있음 . <br>
일반적인 경우 전역(global)일수도, 호출 쿼리 사용(query-specific option)에 특정된 것일 수도 있다.

- refetchOnMount (boolean)
- refetchOnWindowFocus (boolean)
- refetchOnReconnect (boolean)
- refetchInterval (밀리초 단위 시간)

리페칭은 명령할 수도 있어서 useQuery를 쓰면 객체를 반환한다.
리패칭함수 - 불려오려는 데이터가 있을 때 호출할 수 있음

**Suppressing Re-Fetch(리페칭제한)**
<br>
<How?>

- stale 시간을 증가시키면 된다.
  창을 재포커스 하거나 넽워크에 재연결하는 트리거는 데이터가 실제로 만료된 경우에만 작용하기 때문
- refetchOnMount,refetchOnWindowFocus, refetchOnReconnect (불리런 옵션들) 중 하나 혹은 전체를 끄면 된다.(false로 만든다)
  <br>
  <br>
  _리페칭을 제한할 때는 신중해야 한다.<br>
  변동이 잦지 않은 데이터에 적용해야 하며, 미세한 변동에도 큰 변화를 불러오는 데이터에는 적용하지 말아야 한다._

**쿼리 전역에 리페칭 설정 적용하기** <br>
: useQuery 와 prefetch 쿼리 적용이 기본 설정 옵션이 되고, <br>
각각의 쿼리 옵션으로 오버라이드 할 수 있다.
<br>
<br>
전역 옵션의 위치 : queryClient.ts

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: queryErrorHandler,
      staleTime: 600000, //10minute
      cacheTime: 900000, //15minute(doesnt make sense for staleTime to exceed cacheTime)
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  },
});
```

이 프로젝트에서는 appointments 를 제외한 나머지에 기본설정 사용 <br>
왜냐면 appointments가 서버에서 가장 변경이 잦고 시간에 민감한 데이터 <br>
<br>
로직을 보면<br>
새로운 사용자가 다른 브라우저에서 특정 마사지를 예약한다면 appointments에 변경이 생긴다<br>
내가 해줄 일은 어느 시간에 예약이 가능한지 사용자에게 실시간으로 데이터 전달

- 변이(mutation)을 만들어 데이터를 무효화시키면 리패칭을 하는 방식을 사용

전역에 기본설정 해주기

- `refetchOnMount`,`refetchOnWindowFocus`, `refetchOnReconnect` 전체를 `false`로 만들어 비활성화 시킨다.
  => 이 옵션은 반드시 권하지는 않는데, 그 이유는 이 옵션은 데이터를 무용지물로 만들기 쉽고
  사용자들은 원하는 정보를 얻지 못하기 때문. (여기서 이렇게 작성한 이유는 queryClient로 어떻게 전역 옵션을 설정할 수 있는지 보기 위해)

### 오버라이딩

appointments는 사용자 활동이 없을 때에도 서버에 변경이 이뤄줘야 하는 정보<br>

useAppointments.ts

```ts
//common options for both useQuery and Prefetching
const commonOptions = {
  staleTime: 0, //즉시만료
  cacheTime: 300000, //5minute
};

queryClient.prefetchQuery(
  [queryKeys.appointments, nextMonthYear.year, nextMonthYear.month],
  () => getAppointments(nextMonthYear.year, nextMonthYear.month),
  //프리패치에 commonOptions
  commonOptions,
);

const { data: appointments = fallback } = useQuery(
  [queryKeys.appointments, monthYear.year, monthYear.month],
  () => getAppointments(monthYear.year, monthYear.month),
  {
    select: showAll ? undefined : selectFn,
    //useQuery에 commonOptions
    ...commonOptions,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // 1min
  },
);
```

- staleTime: 0 을 줘서 즉시만료가 되게끔
- cacheTime: 300000 -> 캐시타임 5분 설정
- 어떤 자극이 오든 리페칭이 되도록 true
- refetchOnMount,refetchOnWindowFocus, refetchOnReconnect 이 리패칭 요소들은 프리패칭에 적용이 되지 않지만 staleTime과 cacheTime 은 적용이 되기 때문에 분리해서 commonOptions으로 변수로 만들어줌
- commonOptions는 훅 안에서 사용해줄 필요가 없어서 함수 밖으로 빼줌

**폴링(polling)** : 주기적으로 데이터를 자동 리패칭 Auto Refetching

- `refetchInterval: 60000` => 폴링, 1분마다 데이터 리패칭

## React Query 와 인증

인증된 앱의 Auth 로 React Query 통합하기
<br>
setQueryData : 실제로 캐시에 데이터 설정 <br>
removeQueries : 캐시에서 쿼리를 삭제하기 위함<br>
<br>
이 앱이 사용할 인증은 JWT(JSON Web Token)<br>
JWT는 클라이언트가 사용자명과 비밀번호를 보내고 , 이 사용자명과 비밀번호가 데이터베이스에서 일치한다면 서버가 토큰을 보내는 방식으로 작동
<br>
<br>
React Query의 책임은 클라이언트의 서버 상태를 관리하는 것 <br>
useAuth 훅의 책임은 signIn, signUp, signOut 함수를 제공하는 것 . 그래서 서버에 있는 사용자를 인증할 수 있는 것이다.<br>
결론은 ,
<br>
React Query는 데이터 저장 useAuth로 지원(서버를 호출할 때 useAuth가 사용자 데이터를 수집), <br>
useUser이라는 훅이 필요!

### useUser hook

React Query로부터 사용자 데이터를 반환할 책임이 있다.
(쿼리캐시에 사용자 캐시를 저장한다는거 잊지말기)
useUser 훅은 객체를 반환하는데 객체 항목 중 하나가 이 사용자 데이터가 되는 것

- localStroage의 데이터를 로딩해서 초기설정을 할 것
  => 사용자가 페이지를 새로고침 할 때 데이터를 유지하는 방법
- 변이가 일어나면 서버의 사용자 데이터가 변경될 것
  => React useQuery 훅을 사용해서 사용자 데이터를 항상 최신으로 유지한다
- useQuery 인스턴스 쿼리 함수는 로그인 한 사용자의 ID와 함께 서버에 요청을 보낼것 .
- 그럼 서버가 그 사용자에 관한 데이터를 돌려보내준다.
- useUser의 역할은 앱의 특정 인스턴스까지 로그인한 사용자를 추적하는 것 .
  정보가 업데이트 되면 (접속을 했다거나 나갔다거나 혹은 사용자가 스스로 업데이트를 했다거나) setQueryData 로 직접 React Query 캐시를 업데이트 한다.
- 그리고 localStorage 도 업데이트 한다.
  localStorage 업데이트는 onSuccess 콜백에서 진행되며 useQuery까지 업데이트 한다.
- onSuccess 콜백은 setQueryData과 쿼리 함수가 실행된 이후에 실행된다.
- 어떤 방식으로든 쿼리 캐시는 업데이트가 되는데 setQueryData 를 통해 업데이트 되거나 쿼리 함수가 실행될 때 생긴 변이 뒤에 업데이트 될 수도 있다.
  =>어떤 방법이든 onSuccess 콜백은 로컬스토리지를 업데이트 한다.

### 사용자 데이터를 Auth Provuder에 저장할 수는 없나?

가능!
흔히들 옵션으로 되어있음.
<br>
단점 : 이미 복잡한 시스템에 복잡함을 더하고 불필요한 데이터가 생긴다

```ts
export function useUser(): UseUser {
  const queryClient = useQueryClient();
  const { data: user } = useQuery(queryKeys.user, () => getUser(user));
```

- data를 가져와 user로 이름 변경
- 쿼리함수에 user 전달
- 기존 user값을 이용해서 user 값을 업데이트 해줄건데 쿼리함수에서 받은 값(user)으로 사용
- 데이터가 필요한 user.id를 서버에 알려야 하므로 기존 user 값 필요
  user 이 처음부터 정의되지 않았다면 거짓(falsy)의 값이 나와 getUser에서 null이 반환되고 어떤 사용자 데이터도 가져오지 못함
- updateUer, clearUser 함수 필요

```ts
// meant to be called from useAuth
function updateUser(newUser: User): void {
  queryClient.setQueryData(queryKeys.user, newUser);
}

// meant to be called from useAuth
function clearUser() {
  queryClient.setQueryData(queryKeys.user, null);
  queryClient.removeQueries('user-appointments');
}
```

- useAuth훅으로 쿼리 캐시에 값을 설정해서 useQuery 함수를 실행할 때 사용한 값을 만들기
- React Query는 인증 제공자 역할을 한다 .
- React Query 캐시는 user 값을 필요로 하는 모든 컴포넌트에 user 값을 제공한다.
- 쿼리 캐시에 값을 설정하기 위해 `queryClient.setQueryData` 사용
  : 쿼리 키와 값을 가져와 쿼리 캐시에 해당 키에 대한 값을 설정할 수 있다

- `queryClient.setQueryData(queryKeys.user, newUser)`
  queryClient.setQueryData(설정하려는 쿼리 데이터에 대한 키, newUser로 전달된 데이터)
- 여기까지 하면 사용자가 성공적으로 인증되었을 경우 캐시에 사용자 정보를 업데이트

### 새로고침 했을 때도 로그인이 유지되게 해주기

애초에 로컬 스토리지를 사용자 데이터로 채워줘야 로컬스토리지에서 load하는 것이 가능!
<br>
그래서 useQuery의 onSuccess 콜백으로 로컬스토리지를 업데이트 해줘야 한다.
<br>
onSuccess 콜백은 useAuth 함수 작업시 사용하는 <br>
`queryClient.setQueryData` 실행 이후나 쿼리 함수가 반환된 후에 실행이 된다.
<br>

```ts
export function useUser(): UseUser {
  const queryClient = useQueryClient();
  const { data: user } = useQuery(queryKeys.user, () => getUser(user), {
    // 이 부분 추가
    initialData: getStoredUser,
    onSuccess: (received: User | null) => {
      if (!received) {
        clearStoredUser();
      } else {
        setStoredUser(received);
      }
    },
  });
```

- onSuccess는 쿼리함수나 setQueryData에서 데이터를 가져오는 함수
  setQueryData에서 실행될 때 전달된 데이터를 가져오고, <br>
  쿼리함수에서 실행될 때 반환된 데이터를 갸져온다.
  받아온 데이터는 received라는 이름으로 담아줬다.
- received는 쿼리함수나 updateUser에서 받으면 user 이 되고, <br>
  clearUser에서 가져오면 null 이 되기 때문에
  `onSuccess: (received: User | null) => {}` 로 작성
- `if (!received)` received가 거짓의 값을 받으면 `clearStoredUser()`
- true 면 해당 값으로 로컬 스토리지로 설정 `setStoredUser(received)`

**initialData**

- data 가 페이지를 새로고침 할 떄와 같이 useQuery가 초기화를 실행할 때, 이 데이터가 로컬 스토리지에 정의되어 있는지 확인해야 한다.
- initialData : 초기 데이터를 캐시에 추가하고 싶을 때 사용
- `initialData: getStoredUser`
- getStoredUser는 helper to get user from localstorage

### 의존적 쿼리 (Dependant Queries)

이 앱은 사용자 쿼리와 별개로 사용자 예약에 대한 쿼리가 있다. 예약에 대한 독립된 쿼리를 가진다.

```ts
export function useUserAppointments(): Appointment[] {
  const { user } = useUser();

  const fallback: Appointment[] = [];
  const { data: userAppointments = fallback } = useQuery(
    'user-appointments', //쿼리키 일단 하드코딩
    () => getUserAppointments(user),
    { enabled: !!user },
  );
```

- 쿼리함수를 처음 실행하기 전에는 데이터가 undefined일 거라서 fallback도 가지고 있어야 한다. (undefined가 아닌 Appointment[]가 반환되도록)
- `const { data: userAppointments = fallback }` 그리고 fallback을 기본값으로 가지고 있게 작성
- user가 참인지 거짓인지 판단할 enabled 옵션 추가
  user 가 참일 때 enabled
  user은 불리언 타입이 아닌 User 타입이기 때문에 `!user` 로 불리언 타입으로 만들어주고 !user의 반대를 원하니깐 `!!user` 해주면 됨

- 리액트 쿼리의 장점은 새로운 데이터가 있을 때 새 데이터를 위해 서버에 핑을 실행하기보다 캐시에서 데이터를 가져온다는 것이다. <br>
  데이터가 만료상태여도 서버에 새로 연결하지 않음 .<br>
  기존에 이미 실행되고 있다면<br>
  React Query가 서버로 중복되는 요청을 제거하기 때문에 여러 요청이 있어도 동시에 실행되지 않음 . 이미 진행중인 요청을 구독한다면 해당 요청에 포함됨

### [Remove userAppointments Query]

사용자 로그아웃 후 예약 데이터 제거
**queryClient.removeQueries** 특정 쿼리에 대한 데이터 제거
<br>
<br>
_user 데이터에 removeQueries 사용하지 않고 setQueryData에 null을 사용하는 이유_ :
<br>

- 사용자 데이터를 변경하여 onSucess 콜백을 발생시킬 때, onSucess 콜백이 로컬스토리지에 데이터를 유지하며 setQueryData가 onSuccess를 발생시키기 때문
  <br>
- 다시말해, onSuccess는 setQueryData 다음에 실행되고 removeQueries 다음에는 실행되지 않는다.
  <br>
  그래서
  <br>
  `setQueryData` 를 사용하는게 중요하다.

```ts
function clearUser() {
  queryClient.setQueryData(queryKeys.user, null); //로컬스토리지로 사용자를 지우고
  queryClient.removeQueries('user-appointments');
  //useUserAppointments 훅에 사용했던 쿼리키('user-appointments') 를 인수로 작성
}
```
