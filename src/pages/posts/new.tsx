import { useForm } from 'react-hook-form'
import { CreatePostInput } from '../../schema/posts.schema'
import { trpc } from '../../utils/trpc'
import { useRouter } from 'next/router'

function CreatePostPage() {
  const { handleSubmit, register } = useForm<CreatePostInput>()
  const router = useRouter()
  const { mutate, error } = trpc.useMutation(['posts.create-post'], {
    onSuccess({ id }) {
      router.push(`/posts/${id}`)
    },
  })

  function onSubmit(values: CreatePostInput) {
    mutate(values)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {error && error?.message}

      <h1>Create Posts</h1>
      <input type={'text'} placeholder={'Post title'} {...register('title')} />
      <br />
      <br />
      <textarea placeholder="Your post body" {...register('body')} />
      <button>Create Post</button>
    </form>
  )
}

export default CreatePostPage
