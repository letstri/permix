<script setup lang="ts">
import { watch } from 'vue'
import { usePermissions } from './composables/permissions'
import { usePosts } from './composables/posts'
import { useUser } from './composables/user'
import { Check, setupPermix } from './lib/permix'

const user = useUser()
const { check, isReady } = usePermissions()
const posts = usePosts()

watch(user, (user) => {
  if (user) {
    setupPermix(user)
  }
})
</script>

<template>
  <div>
    Is Permix ready?
    {{ isReady ? 'Yes' : 'No' }}
    <hr>
    My user is
    {{ user?.id ?? '...' }}
    <hr>
    <div v-for="post in posts" :key="post.id">
      Can I edit the post where authorId is
      {{ post.authorId }}?
      {{ check('post', 'edit', post) ? 'Yes' : 'No' }}
    </div>
    <hr>
    <Check entity="post" action="edit">
      Can I edit a post inside the Check component?
      <template #otherwise>
        You don't have permission to edit a post
      </template>
    </Check>
  </div>
</template>
