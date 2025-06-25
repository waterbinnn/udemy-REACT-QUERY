import InfiniteScroll from 'react-infinite-scroller';
import { Person } from './Person';
import { useInfiniteQuery } from '@tanstack/react-query';

const baseUrl = 'https://swapi-node.vercel.app';
const initialUrl = baseUrl + '/api/people/';

const fetchUrl = async (url) => {
  const response = await fetch(url);
  return response.json();
};

export function InfinitePeople() {
  // get data for InfiniteScroll via React Query
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetching } =
    useInfiniteQuery({
      queryKey: ['sw-people'],
      queryFn: ({ pageParam = initialUrl }) => fetchUrl(pageParam),
      getNextPageParam: (lastPage) => {
        //getNextPageParam - undefined 반환 여부에 따라 결정됨
        return lastPage.next ? baseUrl + lastPage.next : undefined;
      },
    });

  if (isLoading) {
    return <div className='loading'>loading</div>;
    //isFetching하면 조기반환이 되어서 스크롤이 위로 올라가버린다. 그래서 아래처럼 컴포넌트 내에 작성해주는게 좋음
  }

  if (isError) {
    return <div className='error'>error</div>;
  }

  return (
    <>
      {isFetching && <div className='loading'>loading</div>}
      <InfiniteScroll
        loadMore={() => {
          if (!isFetching) {
            fetchNextPage();
          }
        }}
        hasMore={hasNextPage}
      >
        {data.pages.map((pageData) => {
          return pageData.results.map((person) => {
            const { fields } = person;

            return (
              <Person
                key={fields.name}
                name={fields.name}
                hairColor={fields.hair_color}
                eyeColor={fields.eye_color}
              />
            );
          });
        })}
      </InfiniteScroll>
    </>
  );
}
