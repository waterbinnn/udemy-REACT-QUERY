import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "react-query";

import { PostDetail } from "./PostDetail";
const maxPostPage = 10;

async function fetchPosts(pageNum) {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/posts?_limit=10&_page=${pageNum}`
  );
  return response.json();
}

export function Posts() {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPost, setSelectedPost] = useState(null);

  const queryClient = useQueryClient();

  useEffect(()=>{
    if(currentPage < maxPostPage){
      const nextPage = currentPage +1;
      queryClient.prefetchQuery(['posts', nextPage], () => fetchPosts(nextPage));
    }
    },[currentPage, queryClient])

  // replace with useQuery
  //useQuery(쿼리의 이름,쿼리함수(이 쿼리에 대한 데이터를 가져오는 방법, 비동기여야함))
  const {data, isError,error, isLoading} = useQuery(["posts",currentPage], () => fetchPosts(currentPage), {
    staletime:2000,
    keepPreviousData:true,
  }
  ) ;

  if (isLoading) return <h3>Loading...</h3>
  if (isError) 
  return (
    <>
      <h3>Oops, something went wrong</h3>
     <p>{error.toString()}</p>
    </>
);

  return (
    <>
      <ul>
        {data.map((post) => (
          <li
            key={post.id}
            className="post-title"
            onClick={() => setSelectedPost(post)}
          >
            {post.title}
          </li>
        ))}
      </ul>
      <div className="pages">
        <button disabled={currentPage <= 1} 
        onClick={() => {
          setCurrentPage((previousValue) => previousValue-1)
        }}>
          Previous page
        </button>
        <span>Page {currentPage}</span>
        <button disabled={currentPage >= maxPostPage} onClick={() => {
          setCurrentPage((previousValue) => previousValue+1)
        }}>
          Next page
        </button>
      </div>
      <hr />
      {selectedPost && <PostDetail post={selectedPost} />}
    </>
  );
}
