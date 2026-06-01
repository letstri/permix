<script lang="ts">
	import { Check, setupPermix } from '$lib/permix';
	import { usePermissions } from '$lib/permissions';
	import { usePosts } from '$lib/posts';
	import { useUser } from '$lib/user.svelte';

	const user = useUser();
	const permissions = usePermissions();
	const posts = usePosts();

	$effect(() => {
		const currentUser = user.current;
		if (currentUser) {
			setupPermix(currentUser);
		}
	});
</script>

<div>
	Is Permix ready?
	{permissions.isReady ? 'Yes' : 'No'}
	<hr />
	My user is
	{user.current?.id ?? '...'}
	<hr />
	{#each posts as post (post.id)}
		<div>
			<h2>Post {post.id}</h2>
			Can I edit the post where authorId is {post.authorId}?<br />
			{permissions.check('post.edit', post) ? 'Yes' : 'No'}<br />
			<Check path="post.edit" data={post}>
				I can edit a post inside the Check component
				{#snippet otherwise()}
					I don't have permission to edit a post inside the Check component
				{/snippet}
			</Check>
			<hr />
		</div>
	{/each}
</div>
