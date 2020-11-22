import Split from 'split.js'
import { View } from '../views/View';

export const SplitGroup = (view: View, options: Split.Options, entries: string[]) => `
  <div class="split-group ${options.direction ?? 'horizontal'}" data-id=${view.register(el => {
    Split([].slice.call(el.children), { snapOffset: 0, ...options })
  })}>
    ${entries.join('')}
  </div>
`
