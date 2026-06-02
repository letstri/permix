import { useEffect } from 'react'
import { usePermissions } from './hooks/use-permissions'
import { PostPermission } from './lib/permissions'
import { Check, permix, setupPermissions } from './lib/permix'

export default function App() {
  const { check } = usePermissions()

  useEffect(() => {
    setupPermissions()
  }, [])

  function createPost() {
    if (!permix.check(`post.${PostPermission.Create}`)) // You still can use the permix instance to check permissions
      return

    console.log('Creating a post')
  }

  return (
    <div>
      Can I create a post?
      {' '}
      {check(`post.${PostPermission.Create}`).toString()}
      <Check path={`post.${PostPermission.Create}`} otherwise={<div>I can't create a post</div>}>
        <div>I can create a post</div>
      </Check>
      <button type="button" onClick={createPost}>Create a post</button>
    </div>
  )
}
