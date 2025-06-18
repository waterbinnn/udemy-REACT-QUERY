import { useState } from 'react';

import { fetchPosts, deletePost, updatePost } from './api';
import { PostDetail } from './PostDetail';
import { useQuery } from '@tanstack/react-query';
const maxPostPage = 10;

export function Posts() {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPost, setSelectedPost] = useState(null);

  const { data, error, isError, isLoading } = useQuery({
    queryKey: ['posts'], //쿼리 캐시 내의 데이터 정의
    queryFn: fetchPosts, //데이터를 가져오기 위해 실행할 함수 - 비동기 함수라 가져오는데에 시간이 걸림. 그동안 데이터가 없음.
    staleTime: 2000, // ms 데이터를 다시 가져와야 할 때를 알려줌
    // gcTime: 4000,
  });

  if (isLoading) {
    /*
    isFetching : 비동기 쿼리가 아직 해결되지 않았다는 것을 나타냄 
    isLoading : isFetching의 하위 집합으로, 로딩중임을 나타냄. 쿼리함수 미해결 + 캐시된 데이터 X 
    쿼리를 전에 실행한 적이 없어서 데이터를 가져오는 중임. 캐시된 데이터도 없어서 보여줄 수 없음 
    */
    return <h3>Loading...</h3>;
  }

  if (isError) {
    /**
     * fetchPosts 3번 시도후 에러 표시
     */
    return (
      <h3>
        isError! <br /> 에러 메세지도 알 수 있음 : {error.message}
      </h3>
    );
  }

  /**
   * stale : '오래된' , 유효기간이 만료되었다는 뜻. 다시 가져올 준비가 된 상태. 캐시는 남아있음. 데이터를 다시 검증해야한다는 뜻.
   * 데이터 prefetch는 stale 일때만 트리거 됨.
   * staleTile: 데이터의 최대 수명. 서버로부터 가장 최신 데이터 버전을 가져오기 전, 데이터를 얼마나 유지할건지 판단하는 시간.
   * gcTime : 가비지 콜렉션 time . 데이터를 캐시에 유지할 시간 (기본 5시간) 페이지에 표시된 후부터 계산
   *
   */

  return (
    <>
      <ul>
        {data.map((post) => (
          <li
            key={post.id}
            className='post-title'
            onClick={() => setSelectedPost(post)}
          >
            {post.title}
          </li>
        ))}
      </ul>
      <div className='pages'>
        <button disabled onClick={() => {}}>
          Previous page
        </button>
        <span>Page {currentPage + 1}</span>
        <button disabled onClick={() => {}}>
          Next page
        </button>
      </div>
      <hr />
      {selectedPost && <PostDetail post={selectedPost} />}
    </>
  );
}
