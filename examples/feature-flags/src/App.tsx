import { useEffect } from 'react'
import { usePermissions } from './hooks/use-permissions'
import { permix, setupFeatureFlags } from './lib/permix'

export default function App() {
  const { check } = usePermissions()

  useEffect(() => {
    setupFeatureFlags()
  }, [])

  if (!check('betaFeatures', 'newUI')) {
    return null
  }

  async function handleApiCall() {
    if (!permix.check('betaFeatures', 'experimentalAPI')) {
      return
    }

    // Call experimental API...

    console.log('Calling experimental API...')
  }

  return (
    <div>
      <h1>New UI</h1>
      <button type="button" onClick={handleApiCall}>Call experimental API</button>
    </div>
  )
}
