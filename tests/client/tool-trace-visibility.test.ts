// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({ isDark: false }),
}))

import MessageList from '@/components/hermes/chat/MessageList.vue'
import HistoryMessageList from '@/components/hermes/chat/HistoryMessageList.vue'
import { useChatStore, type Message, type Session } from '@/stores/hermes/chat'
import { useSettingsStore } from '@/stores/hermes/settings'

const MessageItemStub = defineComponent({
  name: 'MessageItem',
  props: {
    message: { type: Object, required: true },
    highlight: { type: Boolean, default: false },
  },
  template: '<div class="stub-message" :data-role="message.role" :data-id="message.id">{{ message.toolName || message.content }}</div>',
})

function makeSession(messages: Message[]): Session {
  return {
    id: 'session-1',
    title: 'Tool trace visibility',
    messages,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

const sampleMessages: Message[] = [
  { id: 'user-1', role: 'user', content: 'inspect repo', timestamp: 1 },
  { id: 'tool-named', role: 'tool', content: '', timestamp: 2, toolName: 'read_file', toolResult: 'ok', toolStatus: 'done' },
  { id: 'tool-internal', role: 'tool', content: '', timestamp: 3, toolResult: 'internal', toolStatus: 'done' },
  { id: 'assistant-1', role: 'assistant', content: 'done', timestamp: 4 },
]

describe('tool trace visibility setting', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function mountLiveList(showToolTrace?: boolean) {
    const chatStore = useChatStore()
    const settingsStore = useSettingsStore()
    chatStore.activeSessionId = 'session-1'
    chatStore.activeSession = makeSession(sampleMessages)
    chatStore.abortState = { aborting: true, synced: false }
    settingsStore.display = showToolTrace === undefined ? {} : { show_tool_trace: showToolTrace }

    return mount(MessageList, {
      global: {
        stubs: {
          MessageItem: MessageItemStub,
          Transition: false,
        },
      },
    })
  }

  it('hides transcript and live tool traces by default', () => {
    const wrapper = mountLiveList()

    expect(wrapper.findAll('.stub-message').map(node => node.attributes('data-id'))).toEqual([
      'user-1',
      'assistant-1',
    ])
    expect(wrapper.findAll('.tool-call-name').map(node => node.text())).not.toContain('read_file')
  })

  it('shows named transcript and live tool traces when enabled while keeping unnamed internal tools hidden', () => {
    const wrapper = mountLiveList(true)

    expect(wrapper.findAll('.stub-message').map(node => node.attributes('data-id'))).toEqual([
      'user-1',
      'tool-named',
      'assistant-1',
    ])
    expect(wrapper.findAll('.tool-call-name').map(node => node.text())).toContain('read_file')
  })

  it('applies the same default-hidden rule to history sessions', () => {
    const settingsStore = useSettingsStore()
    settingsStore.display = {}

    const wrapper = mount(HistoryMessageList, {
      props: { session: makeSession(sampleMessages) },
      global: {
        stubs: { MessageItem: MessageItemStub },
      },
    })

    expect(wrapper.findAll('.stub-message').map(node => node.attributes('data-id'))).toEqual([
      'user-1',
      'assistant-1',
    ])
  })

  it('shows named history tool traces when enabled', () => {
    const settingsStore = useSettingsStore()
    settingsStore.display = { show_tool_trace: true }

    const wrapper = mount(HistoryMessageList, {
      props: { session: makeSession(sampleMessages) },
      global: {
        stubs: { MessageItem: MessageItemStub },
      },
    })

    expect(wrapper.findAll('.stub-message').map(node => node.attributes('data-id'))).toEqual([
      'user-1',
      'tool-named',
      'assistant-1',
    ])
  })
})
