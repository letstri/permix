import { createEffect } from 'solid-js'
import { usePermissions } from './hooks/permissions'
import { usePosts } from './hooks/posts'
import { useUser } from './hooks/user'
import { Check, setupPermix } from './lib/permix'
import './App.css'

function App() {
  const user = useUser()
  const { check, isReady } = usePermissions()
  const posts = usePosts()

  createEffect(() => {
    const value = user()
    if (value) {
      setupPermix(value)
    }
  })

  return (
    <>
      Is Permix ready?
      {' '}
      {isReady() ? 'Yes' : 'No'}
      <hr />
      My user is
      {' '}
      {user()?.id ?? '...'}
      <hr />
      {posts().map(post => (
        <div>
          <h2>
            Post
            {' '}
            {post.id}
          </h2>
          Can I edit the post where authorId is
          {post.authorId}
          ?
          <br />
          {check('post.edit', post) ? 'Yes' : 'No'}
          <br />
          <Check
            path="post.edit"
            data={post}
            otherwise="I don't have permission to edit a post inside the Check component"
          >
            I can edit a post inside the Check component
          </Check>
          <hr />
        </div>
      ))}
    </>
  )
}

export default App
