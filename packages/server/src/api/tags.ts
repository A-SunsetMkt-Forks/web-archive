import { isNil, isNumberString } from '@web-archive/shared/utils'
import { Hono } from 'hono'
import { validator } from 'hono/validator'
import type { HonoTypeUserInformation } from '~/constants/binding'
import { deleteTagById, getTagById, insertTag, selectAllTags, updateTag } from '~/model/tag'
import result from '~/utils/result'

const app = new Hono<HonoTypeUserInformation>()

app.get('/all', async (c) => {
  const tags = await selectAllTags(c.env.DB)

  return c.json(result.success(tags))
})

app.post(
  '/create',
  validator('json', (value, c) => {
    if (isNil(value.name) || typeof value.name !== 'string') {
      return c.json(result.error(400, 'Name is required'))
    }
    // todo check color type?
    return {
      name: value.name as string,
      color: value.color,
    }
  }),
  async (c) => {
    const { name, color = '#ffffff' } = c.req.valid('json')

    if (await insertTag(c.env.DB, { name, color })) {
      return c.json(result.success(true))
    }

    return c.json(result.error(500, 'Failed to create tag'))
  },
)

app.post(
  '/update',
  validator('json', (value, c) => {
    if (isNil(value.id) || !isNumberString(value.id)) {
      return c.json(result.error(400, 'ID is required'))
    }
    if (isNil(value.name) && isNil(value.color)) {
      return c.json(result.error(400, 'At least one field is required'))
    }

    return {
      id: Number(value.id),
      name: value.name,
      color: value.color,
    }
  }),
  async (c) => {
    const { id, name, color } = c.req.valid('json')

    if (await updateTag(c.env.DB, { id, name, color })) {
      return c.json(result.success(true))
    }

    return c.json(result.error(500, 'Failed to update tag'))
  },
)

app.delete(
  '/delete',
  validator('query', (value, c) => {
    if (isNil(value.id) || !isNumberString(value.id)) {
      return c.json(result.error(400, 'ID is required'))
    }
    return {
      id: Number(value.id),
    }
  }),
  async (c) => {
    const { id } = c.req.valid('query')

    if (await deleteTagById(c.env.DB, id)) {
      return c.json(result.success(true))
    }

    return c.json(result.error(500, 'Failed to delete tag'))
  },
)

app.post(
  '/bind_page',
  validator('json', (value, c) => {
    if (isNil(value.id) || !isNumberString(value.id)) {
      return c.json(result.error(400, 'ID is required'))
    }
    if (isNil(value.pageIds) || !Array.isArray(value.pageIds)) {
      return c.json(result.error(400, 'Page ID is required'))
    }

    return {
      id: Number(value.id),
      pageIds: value.pageIds as Array<number>,
    }
  }),
  async (c) => {
    const { id, pageIds } = c.req.valid('json')

    // todo use kv to avoid concurrency issue?
    const tag = await getTagById(c.env.DB, id)
    tag.pageIds.push(...pageIds)
    tag.pageIds = Array.from(new Set(tag.pageIds))
    if (await updateTag(c.env.DB, { id, pageIds: tag.pageIds })) {
      return c.json(result.success(true))
    }

    return c.json(result.error(500, 'Failed to bind pages'))
  },
)

app.post(
  '/unbind_page',
  validator('json', (value, c) => {
    if (isNil(value.id) || !isNumberString(value.id)) {
      return c.json(result.error(400, 'ID is required'))
    }
    if (isNil(value.pageIds) || !Array.isArray(value.pageIds)) {
      return c.json(result.error(400, 'Page ID is required'))
    }

    return {
      id: Number(value.id),
      pageIds: value.pageIds as Array<number>,
    }
  }),
  async (c) => {
    const { id, pageIds } = c.req.valid('json')

    const tag = await getTagById(c.env.DB, id)
    tag.pageIds = tag.pageIds.filter(pageId => !pageIds.includes(pageId))
    if (await updateTag(c.env.DB, { id, pageIds: tag.pageIds })) {
      return c.json(result.success(true))
    }

    return c.json(result.error(500, 'Failed to unbind pages'))
  },
)

export default app