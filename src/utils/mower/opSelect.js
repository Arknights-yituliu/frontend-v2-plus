import { NAvatar, NTag } from 'naive-ui'
import { h } from 'vue'
import OperatorAvatar from '/src/components/sprite/OperatorAvatar.vue'
import { operatorTable } from '@/utils/gameData.js'

const nameToCharId = {}
const charIdToName = {}
for (const key in operatorTable) {
  const normalized = normalizeCharId(key)
  const name = operatorTable[key].name
  nameToCharId[name] = normalized
  charIdToName[normalized] = name
}

function normalizeCharId(id) {
  if (id === 'char_1001_amiya2') {
    return 'char_002_amiya'
  }
  return id
}

const getInitial = (label) => (label ? label.slice(0, 1) : '')

const getDisplayName = (option) => {
  if (option?.label) return option.label
  if (option?.value && charIdToName[option.value]) return charIdToName[option.value]
  return option?.value ?? ''
}

const getCharId = (option) => {
  if (option?.label && nameToCharId[option.label]) return nameToCharId[option.label]
  if (option?.value && charIdToName[option.value]) return option.value
  return option?.value
}

const renderAvatar = (option, size = 40) => {
  const charId = getCharId(option)
  if (charId && charIdToName[charId]) {
    return h(OperatorAvatar, {
      charId,
      size,
      border: true
    })
  }
  const label = getDisplayName(option)
  return h(
    NAvatar,
    {
      round: true,
      size
    },
    () => getInitial(label)
  )
}

export const renderOperatorTag = ({ option, handleClose }) => {
  return h(
    NTag,
    {
      style: {
        padding: '0 6px 0 4px'
      },
      round: true,
      closable: true,
      onClose: (e) => {
        e.stopPropagation()
        handleClose()
      }
    },
    {
      default: () =>
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center'
            }
          },
          [
            h(
              'div',
              {
                style: {
                  marginRight: '4px',
                  display: 'flex'
                }
              },
              renderAvatar(option, 32)
            ),
            getDisplayName(option)
          ]
        )
    }
  )
}

export const renderOperatorLabel = (option) => {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }
    },
    [
      h(
        'div',
        {
          style: {
            display: 'flex'
          }
        },
        renderAvatar(option, 36)
      ),
      getDisplayName(option)
    ]
  )
}
