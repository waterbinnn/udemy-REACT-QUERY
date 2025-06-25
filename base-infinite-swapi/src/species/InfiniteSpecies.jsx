import InfiniteScroll from 'react-infinite-scroller';
import { Species } from './Species';
import { useInfiniteQuery } from '@tanstack/react-query';

const baseUrl = 'https://swapi-node.vercel.app';
const initialUrl = baseUrl + '/api/species/';

const fetchUrl = async (url) => {
  const response = await fetch(url);
  return response.json();
};

export function InfiniteSpecies() {
  const { data, isLoading, isFetching, isError, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ['sw-species'],
      queryFn: ({ pageParam = initialUrl }) => fetchUrl(pageParam),
      getNextPageParam: (lastPage) => {
        return lastPage.next ? baseUrl + lastPage.next : undefined;
      },
    });

  console.log(data.pageParams);

  if (isLoading) {
    return <div>loading</div>;
  }

  if (isError) {
    return <div>error</div>;
  }

  return (
    <>
      {isFetching && <div className='loading'>loading</div>}
      <InfiniteScroll
        loadMore={() => {
          //중복 요청 방지
          if (!isFetching) {
            fetchNextPage();
          }
        }}
        hasMore={hasNextPage}
      >
        {data.pages.map((pageData) => {
          return pageData.results.map((species) => {
            const { fields } = species;
            return (
              <Species
                key={fields.name}
                name={fields.name}
                language={fields.language}
                averageLifespan={fields.average_lifespan}
              />
            );
          });
        })}
      </InfiniteScroll>
      <div>d</div>
    </>
  );
}
