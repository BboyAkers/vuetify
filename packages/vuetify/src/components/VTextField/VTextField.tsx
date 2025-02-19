// Styles
import './VTextField.sass'

// Components
import { filterFieldProps, makeVFieldProps, VField } from '@/components/VField/VField'
import { makeVInputProps, VInput } from '@/components/VInput/VInput'
import { VCounter, type VCounterSlot } from '@/components/VCounter/VCounter'

// Directives
import Intersect from '@/directives/intersect'

// Composables
import { forwardRefs } from '@/composables/forwardRefs'
import { useFocus } from '@/composables/focus'
import { useProxiedModel } from '@/composables/proxiedModel'

// Utilities
import { cloneVNode, computed, nextTick, ref } from 'vue'
import { callEvent, filterInputAttrs, genericComponent, propsFactory, useRender } from '@/util'

// Types
import type { PropType } from 'vue'
import type { VFieldSlots } from '@/components/VField/VField'
import type { VInputSlots } from '@/components/VInput/VInput'

const activeTypes = ['color', 'file', 'time', 'date', 'datetime-local', 'week', 'month']

export const makeVTextFieldProps = propsFactory({
  autofocus: Boolean,
  counter: [Boolean, Number, String] as PropType<true | number | string>,
  counterValue: Function as PropType<(value: any) => number>,
  prefix: String,
  placeholder: String,
  persistentPlaceholder: Boolean,
  persistentCounter: Boolean,
  suffix: String,
  type: {
    type: String,
    default: 'text',
  },
  modelModifiers: Object as PropType<Record<string, boolean>>,

  ...makeVInputProps(),
  ...makeVFieldProps(),
}, 'v-text-field')

export type VTextFieldSlots = Omit<VInputSlots & VFieldSlots, 'default'> & {
  default: []
  counter: [VCounterSlot]
}

export const VTextField = genericComponent<VTextFieldSlots>()({
  name: 'VTextField',

  directives: { Intersect },

  inheritAttrs: false,

  props: makeVTextFieldProps(),

  emits: {
    'click:control': (e: MouseEvent) => true,
    'mousedown:control': (e: MouseEvent) => true,
    'update:focused': (focused: boolean) => true,
    'update:modelValue': (val: string) => true,
  },

  setup (props, { attrs, emit, slots }) {
    const model = useProxiedModel(props, 'modelValue')
    const { isFocused, focus, blur } = useFocus(props)
    const counterValue = computed(() => {
      return typeof props.counterValue === 'function'
        ? props.counterValue(model.value)
        : (model.value ?? '').toString().length
    })
    const max = computed(() => {
      if (attrs.maxlength) return attrs.maxlength as unknown as undefined

      if (
        !props.counter ||
        (typeof props.counter !== 'number' &&
        typeof props.counter !== 'string')
      ) return undefined

      return props.counter
    })

    const isPlainOrUnderlined = computed(() => ['plain', 'underlined'].includes(props.variant))

    function onIntersect (
      isIntersecting: boolean,
      entries: IntersectionObserverEntry[]
    ) {
      if (!props.autofocus || !isIntersecting) return

      (entries[0].target as HTMLInputElement)?.focus?.()
    }

    const vInputRef = ref<VInput>()
    const vFieldRef = ref<VField>()
    const inputRef = ref<HTMLInputElement>()
    const isActive = computed(() => (
      activeTypes.includes(props.type) ||
      props.persistentPlaceholder ||
      isFocused.value ||
      props.active
    ))
    function onFocus () {
      if (inputRef.value !== document.activeElement) {
        inputRef.value?.focus()
      }

      if (!isFocused.value) focus()
    }
    function onControlMousedown (e: MouseEvent) {
      emit('mousedown:control', e)

      if (e.target === inputRef.value) return

      onFocus()
      e.preventDefault()
    }
    function onControlClick (e: MouseEvent) {
      onFocus()

      emit('click:control', e)
    }
    function onClear (e: MouseEvent) {
      e.stopPropagation()

      onFocus()

      nextTick(() => {
        model.value = null

        callEvent(props['onClick:clear'], e)
      })
    }
    function onInput (e: Event) {
      const el = e.target as HTMLInputElement
      model.value = el.value
      if (
        props.modelModifiers?.trim &&
        ['text', 'search', 'password', 'tel', 'url'].includes(props.type)
      ) {
        const caretPosition = [el.selectionStart, el.selectionEnd]
        nextTick(() => {
          el.selectionStart = caretPosition[0]
          el.selectionEnd = caretPosition[1]
        })
      }
    }

    useRender(() => {
      const hasCounter = !!(slots.counter || props.counter || props.counterValue)
      const hasDetails = !!(hasCounter || slots.details)
      const [rootAttrs, inputAttrs] = filterInputAttrs(attrs)
      const [{ modelValue: _, ...inputProps }] = VInput.filterProps(props)
      const [fieldProps] = filterFieldProps(props)

      return (
        <VInput
          ref={ vInputRef }
          v-model={ model.value }
          class={[
            'v-text-field',
            {
              'v-text-field--prefixed': props.prefix,
              'v-text-field--suffixed': props.suffix,
              'v-text-field--plain-underlined': ['plain', 'underlined'].includes(props.variant),
            },
            props.class,
          ]}
          style={ props.style }
          { ...rootAttrs }
          { ...inputProps }
          centerAffix={ !isPlainOrUnderlined.value }
          focused={ isFocused.value }
        >
          {{
            ...slots,
            default: ({
              id,
              isDisabled,
              isDirty,
              isReadonly,
              isValid,
            }) => (
              <VField
                ref={ vFieldRef }
                onMousedown={ onControlMousedown }
                onClick={ onControlClick }
                onClick:clear={ onClear }
                onClick:prependInner={ props['onClick:prependInner'] }
                onClick:appendInner={ props['onClick:appendInner'] }
                role="textbox"
                { ...fieldProps }
                id={ id.value }
                active={ isActive.value || isDirty.value }
                dirty={ isDirty.value || props.dirty }
                disabled={ isDisabled.value }
                focused={ isFocused.value }
                error={ isValid.value === false }
              >
                {{
                  ...slots,
                  default: ({
                    props: { class: fieldClass, ...slotProps },
                  }) => {
                    const inputNode = (
                      <input
                        ref={ inputRef }
                        value={ model.value }
                        onInput={ onInput }
                        v-intersect={[{
                          handler: onIntersect,
                        }, null, ['once']]}
                        autofocus={ props.autofocus }
                        readonly={ isReadonly.value }
                        disabled={ isDisabled.value }
                        name={ props.name }
                        placeholder={ props.placeholder }
                        size={ 1 }
                        type={ props.type }
                        onFocus={ onFocus }
                        onBlur={ blur }
                        { ...slotProps }
                        { ...inputAttrs }
                      />
                    )

                    return (
                      <>
                        { props.prefix && (
                          <span class="v-text-field__prefix">
                            { props.prefix }
                          </span>
                        )}

                        { slots.default ? (
                          <div
                            class={ fieldClass }
                            data-no-activator=""
                          >
                            { slots.default() }
                            { inputNode }
                          </div>
                        ) : cloneVNode(inputNode, { class: fieldClass })}

                        { props.suffix && (
                          <span class="v-text-field__suffix">
                            { props.suffix }
                          </span>
                        )}
                      </>
                    )
                  },
                }}
              </VField>
            ),
            details: hasDetails ? slotProps => (
              <>
                { slots.details?.(slotProps) }

                { hasCounter && (
                  <>
                    <span />

                    <VCounter
                      active={ props.persistentCounter || isFocused.value }
                      value={ counterValue.value }
                      max={ max.value }
                      v-slots:default={ slots.counter }
                    />
                  </>
                )}
              </>
            ) : undefined,
          }}
        </VInput>
      )
    })

    return forwardRefs({}, vInputRef, vFieldRef, inputRef)
  },
})

export type VTextField = InstanceType<typeof VTextField>
