import { createPermix } from 'permix'
import { createComponents } from 'permix/react'
import { getUser } from './user'

// Define permix instance with feature flags
export const permix = createPermix<{
  darkMode: ['enabled']
  betaFeatures: ['newUI', 'experimentalAPI']
}>()

// Not necessary, but you can use components to check permissions
export const { Check } = createComponents(permix)

// Define the feature flags for each role
export const betaUserFeatures = permix.template({
  darkMode: {
    enabled: true,
  },
  betaFeatures: {
    newUI: true,
    experimentalAPI: true,
  },
})

export const regularUserFeatures = permix.template({
  darkMode: {
    enabled: true,
  },
  betaFeatures: {
    newUI: false,
    experimentalAPI: false,
  },
})

export async function setupFeatureFlags() {
  const user = await getUser()

  const featureConfig = user.isBetaUser
    ? betaUserFeatures()
    : regularUserFeatures()

  permix.setup(featureConfig)
}
