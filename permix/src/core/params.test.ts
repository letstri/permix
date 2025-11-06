import type { PermixDefinition } from './create-permix'
import type { CheckContext, CheckFunctionObject, CheckFunctionParams } from './params'
import { describe, expect, it } from 'vitest'
import { createCheckContext } from './params'

// Define a simple Permix definition for testing
type TestDefinition = PermixDefinition<{
  post: {
    dataType: { id: string, title: string }
    action: 'create' | 'read' | 'update' | 'delete'
  }
  comment: {
    dataType: { id: string, content: string }
    action: 'create' | 'read' | 'update'
  }
}>

describe('params', () => {
  describe('checkFunctionParams', () => {
    it('should correctly type params', () => {
      // This is mainly a type test, but we can verify the structure
      const params: CheckFunctionParams<TestDefinition, 'post'> = [
        'post',
        'create',
        { id: '1', title: 'Test Post' },
      ]

      expect(params.length).toBeGreaterThanOrEqual(2)
      expect(params[0]).toBe('post')
      expect(params[1]).toBe('create')
      expect(params[2]).toEqual({ id: '1', title: 'Test Post' })
    })

    it('should accept array of actions', () => {
      const params: CheckFunctionParams<TestDefinition, 'post'> = [
        'post',
        ['create', 'read'],
        { id: '1', title: 'Test Post' },
      ]

      expect(params[0]).toBe('post')
      expect(Array.isArray(params[1])).toBe(true)
      expect(params[1]).toContain('create')
      expect(params[1]).toContain('read')
    })

    it('should accept "all" as action', () => {
      const params: CheckFunctionParams<TestDefinition, 'post'> = [
        'post',
        'all',
        { id: '1', title: 'Test Post' },
      ]

      expect(params[0]).toBe('post')
      expect(params[1]).toBe('all')
    })

    it('should work without data parameter', () => {
      const params: CheckFunctionParams<TestDefinition, 'post'> = [
        'post',
        'create',
      ]

      expect(params.length).toBe(2)
      expect(params[0]).toBe('post')
      expect(params[1]).toBe('create')
      expect(params[2]).toBeUndefined()
    })
  })

  describe('checkFunctionObject', () => {
    it('should correctly type object props', () => {
      const obj: CheckFunctionObject<TestDefinition, 'post'> = {
        entity: 'post',
        action: 'create',
        data: { id: '1', title: 'Test Post' },
      }

      expect(obj.entity).toBe('post')
      expect(obj.action).toBe('create')
      expect(obj.data).toEqual({ id: '1', title: 'Test Post' })
    })

    it('should accept array of actions', () => {
      const obj: CheckFunctionObject<TestDefinition, 'post'> = {
        entity: 'post',
        action: ['create', 'read'],
        data: { id: '1', title: 'Test Post' },
      }

      expect(obj.entity).toBe('post')
      expect(Array.isArray(obj.action)).toBe(true)
      expect(obj.action).toContain('create')
      expect(obj.action).toContain('read')
    })

    it('should accept "all" as action', () => {
      const obj: CheckFunctionObject<TestDefinition, 'post'> = {
        entity: 'post',
        action: 'all',
        data: { id: '1', title: 'Test Post' },
      }

      expect(obj.entity).toBe('post')
      expect(obj.action).toBe('all')
    })

    it('should accept "any" as action', () => {
      const obj: CheckFunctionObject<TestDefinition, 'post'> = {
        entity: 'post',
        action: 'any',
        data: { id: '1', title: 'Test Post' },
      }

      expect(obj.entity).toBe('post')
      expect(obj.action).toBe('any')
    })

    it('should work without data property', () => {
      const obj: CheckFunctionObject<TestDefinition, 'post'> = {
        entity: 'post',
        action: 'create',
      }

      expect(obj.entity).toBe('post')
      expect(obj.action).toBe('create')
      expect(obj.data).toBeUndefined()
    })
  })

  describe('checkContext', () => {
    it('should correctly type context properties', () => {
      const context: CheckContext<TestDefinition> = {
        entity: 'post',
        actions: ['create'],
      }

      expect(context.entity).toBe('post')
      expect(Array.isArray(context.actions)).toBe(true)
      expect(context.actions).toContain('create')
    })
  })

  describe('createCheckContext', () => {
    it('should create a context from params with single action', () => {
      const context = createCheckContext('post', 'create', { id: '1', title: 'Test Post' })

      expect(context.entity).toBe('post')
      expect(Array.isArray(context.actions)).toBe(true)
      expect(context.actions.length).toBe(1)
      expect(context.actions[0]).toBe('create')
    })

    it('should create a context from params with multiple actions', () => {
      const context = createCheckContext('post', ['create', 'read'], { id: '1', title: 'Test Post' })

      expect(context.entity).toBe('post')
      expect(Array.isArray(context.actions)).toBe(true)
      expect(context.actions.length).toBe(2)
      expect(context.actions).toContain('create')
      expect(context.actions).toContain('read')
    })

    it('should create a context from params with "all" action', () => {
      const context = createCheckContext('post', 'all', { id: '1', title: 'Test Post' })

      expect(context.entity).toBe('post')
      expect(Array.isArray(context.actions)).toBe(true)
      expect(context.actions.length).toBe(1)
      expect(context.actions[0]).toBe('all')
    })

    it('should create a context from params with "any" action', () => {
      const context = createCheckContext('post', 'any', { id: '1', title: 'Test Post' })

      expect(context.entity).toBe('post')
      expect(Array.isArray(context.actions)).toBe(true)
      expect(context.actions.length).toBe(1)
      expect(context.actions[0]).toBe('any')
    })

    it('should create a context without data parameter', () => {
      const context = createCheckContext('post', 'create')

      expect(context.entity).toBe('post')
      expect(Array.isArray(context.actions)).toBe(true)
      expect(context.actions.length).toBe(1)
      expect(context.actions[0]).toBe('create')
    })
  })
})
