import { useQuery } from '@tanstack/react-query';
import { fetchComments } from './api';
import './PostDetail.css';

/**
 */

export function PostDetail({ post, deleteMutation, updateMutation }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['comments', post.id], //각각의 id를 서로 다른 쿼리로 처리
    queryFn: () => fetchComments(post.id),
  });

  if (isLoading) {
    return <h3>Loading</h3>;
  }

  if (isError) {
    return (
      <>
        <h3>isError!</h3>
        <p>{error.message}</p>
      </>
    );
  }

  return (
    <>
      <h3 style={{ color: 'blue' }}>{post.title}</h3>

      <div>
        <button onClick={() => deleteMutation.mutate(post.id)}>Delete</button>
        {deleteMutation.isPending && (
          <p className='loading'>Deleting the post</p>
        )}
        {deleteMutation.isError && (
          <p className='error'>
            Error deleting the Post : {deleteMutation.error.toString()}
          </p>
        )}
        {deleteMutation.isSuccess && (
          <p className='success'>Post was deleted</p>
        )}
      </div>

      <div>
        <button onClick={() => updateMutation.mutate(post.id)}>
          Update title
        </button>
        {updateMutation.isPending && (
          <p className='loading'>Loading on update</p>
        )}
        {updateMutation.isError && <p className='error'>Error on updating</p>}
        {updateMutation.isSuccess && (
          <p className='success'>Success on updating</p>
        )}
      </div>

      <p>{post.body}</p>
      <h4>Comments</h4>
      {data.map((comment) => (
        <li key={comment.id}>
          {comment.email}: {comment.body}
        </li>
      ))}
    </>
  );
}
